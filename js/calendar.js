// ═══ CALENDAR ═══
let _calWeekOffset2 = 0;
let _calSettings = null;

const SLOT_TYPE_COLORS = {
  primary: { bg: '#d1fae5', text: '#065f46' },
  short:   { bg: '#fef3c7', text: '#92400e' },
};
function slotTypeColor(type){return SLOT_TYPE_COLORS[type]||SLOT_TYPE_COLORS.primary;}

// Сетка: 09:00–19:45, шаг 15 мин
const GRID_START = 9 * 60;
const GRID_END   = 20 * 60;
const GRID_STEP  = 15;

function gridTimes(){
  const times=[];
  for(let m=GRID_START;m<GRID_END;m+=GRID_STEP)
    times.push(String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'));
  return times;
}

function generateSlotTimes(s){
  const start=s.cal_start||'09:00',end=s.cal_end||'18:00';
  const dur=+(s.cal_duration||60),brk=+(s.cal_break||15),step=dur+brk;
  const [sh,sm]=start.split(':').map(Number),[eh]=end.split(':').map(Number);
  const startMin=sh*60+sm,endMin=eh*60+(+end.split(':')[1]||0);
  const times=[];
  for(let m=startMin;m+dur<=endMin;m+=step)
    times.push(String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'));
  return times;
}

async function loadCalSettings(){
  const{data}=await db.from('settings').select('key,value').in('key',['cal_start','cal_end','cal_duration','cal_break','cal_work_days']);
  const s={};(data||[]).forEach(r=>s[r.key]=r.value);
  _calSettings=s;return s;
}

async function renderSlots(){
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>${t('schedule')}</h1></div><div class="content"><div class="spinner">Загрузка...</div></div>`;
  const now=new Date(),day=now.getDay(),monday=new Date(now);
  monday.setDate(now.getDate()-(day===0?6:day-1)+_calWeekOffset2*7);
  const weekDays=[];
  for(let i=0;i<7;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);weekDays.push(d.toISOString().split('T')[0]);}
  const todayStr=today(),monthLabel=`${(t('months')||MONTH_RU)[monday.getMonth()]} ${monday.getFullYear()}`;

  const[s,{data:slots},{data:appts}]=await Promise.all([
    loadCalSettings(),
    db.from('available_slots').select('*').in('date',weekDays).order('start_time'),
    db.from('appointments').select('date,time,type,patient_id,patients(name),appointment_number').in('date',weekDays).neq('status','отменён').is('deleted_at',null)
  ]);
  const workDays=s.cal_work_days?s.cal_work_days.split(',').map(Number):[1,2,3,4,5,6];
  const slotMap={};
  (slots||[]).forEach(sl=>{slotMap[`${sl.date}|${sl.start_time?.substr(0,5)}`]=sl;});
  const apptMap={};
  (appts||[]).forEach(a=>{apptMap[`${a.date}|${a.time?.substr(0,5)}`]=a;});

  const ALL_TIMES=gridTimes();

  function buildDayCells(d){
    const cells=[];
    const skip=new Set();
    const isPastDay=d<todayStr;
    const nowTime=new Date().toTimeString().substr(0,5);
    ALL_TIMES.forEach((tm,idx)=>{
      if(skip.has(idx))return;
      const row=idx+2;
      const k=`${d}|${tm}`;
      const appt=apptMap[k], slot=slotMap[k];
      const isPast=isPastDay||(d===todayStr&&tm<nowTime);
      let span=1;
      if(appt){
        span=(slotMap[k]?.slot_type==='short')?1:4;
      } else if(slot&&!slot.is_booked){
        span=slot.slot_type==='short'?1:4;
      }
      span=Math.min(span,ALL_TIMES.length-idx);
      for(let i=1;i<span;i++)skip.add(idx+i);
      let html='';
      if(appt){
        html=`<div class="cal-pill cal-pill-patient" style="height:100%" onclick="openPatientCard('${appt.patient_id}')">
          <div class="cal-pill-name">${appt.patients?.name?.split(' ')[0]||'—'}</div>
          <div class="cal-pill-sub">${(apptTypeName(appt.type||'')||appt.type||appt.appointment_number||'').substr(0,18)}</div>
        </div>`;
      } else if(slot&&slot.booked_by==='ervin'){
        const can=isErvin()||isAdmin();
        html=`<div class="cal-pill cal-pill-ervin" style="height:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:2px">
          <div style="min-width:0"><div class="cal-pill-name">Ervin${slot.ervin_note?' — '+slot.ervin_note:''}</div></div>
          ${can?`<button class="cal-del-btn" onclick="event.stopPropagation();unbookErvin('${slot.id}')" title="Отменить">🗑</button>`:''}
        </div>`;
      } else if(slot&&!slot.is_booked){
        const sc=slotTypeColor(slot.slot_type||'primary');
        // t('slot_open') = 'Свободно' / 'Slobodan'
        const freeLabel=t('slot_open');
        const adminBtns=isAdmin()?`
          <div class="cal-pill-actions">
            <button class="cal-pregled-btn" onclick="event.stopPropagation();openAddAppointmentAtSlot('${d}','${tm}','${slot.id}')">✚ Pregled</button>
            <button class="cal-del-btn" onclick="event.stopPropagation();removeSlotDirect('${slot.id}')">🗑</button>
          </div>`:'';
        const ervinBtns=isErvin()&&!isAdmin()?`
          <div class="cal-pill-actions">
            <button class="cal-pregled-btn" onclick="event.stopPropagation();bookErvinAt('${d}','${tm}','${slot.id}')">Zauzimi</button>
            <button class="cal-del-btn" onclick="event.stopPropagation();removeSlotDirect('${slot.id}')">🗑</button>
          </div>`:'';
        html=`<div class="cal-pill" style="background:${sc.bg};color:${sc.text};height:100%;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box">
          <div class="cal-pill-name">✓ ${freeLabel}</div>
          ${adminBtns}${ervinBtns}
        </div>`;
      } else if(isPast){
        html=`<div class="cal-cell-empty cal-pill-past"></div>`;
      } else if(isAdmin()){
        // Пустая ячейка: подсветка при наведении, клик → добавить слот
        html=`<div class="cal-cell-hover" onclick="addSlotAt('${d}','${tm}')" title="Добавить слот"></div>`;
      } else if(isErvin()){
        html=`<div class="cal-cell-hover cal-cell-hover-ervin" onclick="bookErvinAt('${d}','${tm}','')" title="Занять"></div>`;
      } else {
        html=`<div class="cal-cell-empty"></div>`;
      }
      cells.push({row,span,html});
    });
    return cells;
  }

  // Высоты строк: :00 = 26px, :15/:30/:45 = 12px
  const hourRows=ALL_TIMES.map(tm=>tm.endsWith(':00')?'26px':'12px').join(' ');

  let gridHTML='';
  weekDays.forEach((d,ci)=>{
    const dt=new Date(d+'T12:00:00');
    const isToday=d===todayStr,isWork=workDays.includes(dt.getDay());
    gridHTML+=`<div class="cg-head${isToday?' cg-today':''}" style="grid-column:${ci+2};grid-row:1;${!isWork?'opacity:.45':''}">
      <div class="cg-dow">${DOW[dt.getDay()]}</div>
      <div class="cg-date">${dt.getDate()}</div>
    </div>`;
  });
  ALL_TIMES.forEach((tm,idx)=>{
    const row=idx+2,isHour=tm.endsWith(':00');
    gridHTML+=`<div class="cg-time${isHour?' cg-time-hour':''}" style="grid-column:1;grid-row:${row}">${isHour?tm:''}</div>`;
    weekDays.forEach((d,ci)=>{
      const isWork=workDays.includes(new Date(d+'T12:00:00').getDay());
      gridHTML+=`<div class="cg-bg${isHour?' cg-bg-hour':''}${!isWork?' cg-nonwork':''}" style="grid-column:${ci+2};grid-row:${row}"></div>`;
    });
  });
  weekDays.forEach((d,ci)=>{
    buildDayCells(d).forEach(({row,span,html})=>{
      gridHTML+=`<div class="cg-cell" style="grid-column:${ci+2};grid-row:${row}/span ${span}">${html}</div>`;
    });
  });

  document.querySelector('.content').innerHTML=`
  <style>
    .cg-wrap{overflow-x:auto;}
    .cg{
      display:grid;
      grid-template-columns:40px repeat(7,1fr);
      grid-template-rows:auto ${hourRows};
      background:#dde3ea;
      gap:1px;
      border-radius:10px;
      overflow:hidden;
      min-width:580px;
    }
    .cg-head{background:var(--surface2);text-align:center;padding:6px 4px 5px;}
    .cg-today{background:var(--accent-l);}
    .cg-dow{font-size:10px;font-weight:600;color:var(--text-m);line-height:1;}
    .cg-date{font-size:19px;font-weight:800;color:var(--text);line-height:1.2;}
    .cg-today .cg-date{color:var(--accent);}
    .cg-time{
      background:#f1f5f9;
      display:flex;align-items:flex-start;justify-content:flex-end;
      padding:1px 4px 0 0;
      font-size:8.5px;font-weight:600;color:transparent; /* подпись только у часовых */
    }
    .cg-time-hour{
      background:#e4eaf1;
      font-size:9.5px;font-weight:800;
      color:var(--text-m);
      padding-top:2px;
    }
    .cg-bg{background:#fff;}
    .cg-bg-hour{background:#f7f9fc;}
    .cg-nonwork{background:#f5f5f5!important;}
    /* Поверх фона */
    .cg-cell{z-index:2;pointer-events:none;padding:1px 2px;box-sizing:border-box;}
    .cg-cell>*{pointer-events:auto;}
    /* Пустая ячейка: подсветка при наведении */
    .cal-cell-hover{
      width:100%;height:100%;border-radius:4px;
      cursor:pointer;
      transition:background .12s;
    }
    .cal-cell-hover:hover{background:rgba(26,109,181,.12);}
    .cal-cell-hover-ervin:hover{background:rgba(217,119,6,.12);}
    .cal-cell-empty{width:100%;height:100%;}
    .cal-pill-past{opacity:.15;}
    /* Плашки */
    .cal-pill{
      border-radius:5px;padding:3px 5px;
      width:100%;box-sizing:border-box;overflow:hidden;
    }
    .cal-pill-name{font-size:10px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;}
    .cal-pill-sub{font-size:9px;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .cal-pill-patient{background:#dbeafe;color:#1e3a8a;cursor:pointer;}
    .cal-pill-patient:hover{filter:brightness(.95);}
    .cal-pill-ervin{background:#fde68a;color:#92400e;}
    /* Кнопки на плашке */
    .cal-pill-actions{
      display:flex;flex-direction:column;align-items:flex-end;
      gap:3px;margin-top:4px;
    }
    .cal-pregled-btn{
      border:none;border-radius:4px;
      background:rgba(0,0,0,.16);color:inherit;
      font-size:11px;font-weight:700;font-family:inherit;
      padding:3px 8px;cursor:pointer;line-height:1.4;
      white-space:nowrap;
      transition:background .12s;
    }
    .cal-pregled-btn:hover{background:rgba(0,0,0,.28);}
    .cal-del-btn{
      border:none;border-radius:4px;
      background:rgba(220,38,38,.18);color:#b91c1c;
      font-size:12px;padding:2px 7px;cursor:pointer;
      font-family:inherit;line-height:1.4;
      transition:background .12s;
    }
    .cal-del-btn:hover{background:rgba(220,38,38,.35);}
  </style>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
    <div class="flex gap-8 items-center">
      <button class="btn btn-ghost btn-sm" onclick="_calWeekOffset2--;renderSlots()">${t('back')}</button>
      <b style="font-size:15px;min-width:150px;text-align:center">${monthLabel}</b>
      <button class="btn btn-ghost btn-sm" onclick="_calWeekOffset2=0;renderSlots()">${t('today')}</button>
      <button class="btn btn-ghost btn-sm" onclick="_calWeekOffset2++;renderSlots()">${t('forward')}</button>
    </div>
    <div class="flex gap-8 items-center">
      ${isAdmin()?`<button class="btn btn-accent btn-sm" onclick="openWeekSlots('${weekDays[0]}','${weekDays[4]}')">📅 ${t('open_week')}</button>`:''}
      ${isErvin()?`<button class="btn btn-accent btn-sm" onclick="openAddErvinBooking()">+ ${t('my_slot')}</button>`:''}
    </div>
  </div>
  <div class="cg-wrap">
    <div class="cg">${gridHTML}</div>
  </div>
  <div style="display:flex;gap:14px;margin-top:10px;font-size:11px;color:var(--text-m);flex-wrap:wrap;align-items:center">
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#d1fae5;display:inline-block"></span>Основной приём</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#fef3c7;display:inline-block"></span>15 мин</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#dbeafe;display:inline-block"></span>${t('patient')}</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#fde68a;display:inline-block"></span>${t('slot_ervin')}</span>
    ${isAdmin()?`· <a href="#" onclick="nav('settings')" style="color:var(--accent);font-size:11px">${t('schedule_settings')}</a>`:''}
  </div>`;
}

async function removeSlotDirect(id){
  if(!confirm('Удалить слот?'))return;
  await db.from('available_slots').delete().eq('id',id);
  renderSlots();
}

async function addSlotAt(date,time){
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">Добавить слот — ${time} ${fmt(date)}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Тип слота</label>
        <select id="as-type">
          <option value="primary">Основной приём (60 мин)</option>
          <option value="short">15 мин (контроль / помощь)</option>
        </select>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button><button class="btn btn-accent" onclick="_saveSlotAt('${date}','${time}')">+ Слот</button></div>
  </div>`);
}
async function _saveSlotAt(date,time){
  const slotType=document.getElementById('as-type')?.value||'primary';
  await db.from('available_slots').upsert({date,start_time:time,is_booked:false,booked_by:null,slot_type:slotType},{onConflict:'date,start_time'});
  closeModal();renderSlots();
}

async function removeSlot(id){await db.from('available_slots').delete().eq('id',id);if(typeof closeModal==='function')closeModal();renderSlots();}

async function openWeekSlots(from,to){
  const s=_calSettings||await loadCalSettings();
  const times=generateSlotTimes(s);
  const workDays=s.cal_work_days?s.cal_work_days.split(',').map(Number):[1,2,3,4,5,6];
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">${t('open_slots_week')}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group"><label>С даты</label><input type="date" id="ws-from" value="${from}"></div>
        <div class="form-group"><label>По дату</label><input type="date" id="ws-to" value="${to}"></div>
      </div>
      <div class="form-group" style="margin-top:10px"><label>Тип слотов</label>
        <select id="ws-type">
          <option value="primary">Основной приём (60 мин)</option>
          <option value="short">15 мин (контроль / помощь)</option>
        </select>
      </div>
      <div class="form-group" style="margin-top:10px"><label>Рабочие дни</label>
        <div class="flex gap-8" style="flex-wrap:wrap;margin-top:6px">
          ${['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].map((d,i)=>`<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="ws-d${i}" ${workDays.includes(i)?'checked':''} style="width:auto">${d}</label>`).join('')}
        </div>
      </div>
      <div class="form-group" style="margin-top:10px"><label>Слоты (каждое время на новой строке)</label>
        <textarea id="ws-times" style="min-height:120px;font-family:monospace;font-size:14px">${times.join('\n')}</textarea>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">${t('cancel')}</button><button class="btn btn-accent" onclick="saveWeekSlots()">Otvori</button></div>
  </div>`);
}
async function saveWeekSlots(){
  const from=new Date(document.getElementById('ws-from').value+'T12:00:00');
  const to=new Date(document.getElementById('ws-to').value+'T12:00:00');
  const slotType=document.getElementById('ws-type')?.value||'primary';
  const days=[0,1,2,3,4,5,6].filter(i=>document.getElementById('ws-d'+i)?.checked);
  const times=document.getElementById('ws-times').value.split('\n').map(t=>t.trim()).filter(t=>/^\d{2}:\d{2}$/.test(t));
  const rows=[];
  for(let d=new Date(from);d<=to;d.setDate(d.getDate()+1)){
    if(days.includes(d.getDay())){
      const ds=d.toISOString().split('T')[0];
      times.forEach(t=>rows.push({date:ds,start_time:t,is_booked:false,booked_by:null,slot_type:slotType}));
    }
  }
  if(!rows.length){toast('Нет слотов','error');return;}
  await db.from('available_slots').upsert(rows,{onConflict:'date,start_time',ignoreDuplicates:true});
  toast(t('slots_opened').replace('%s',rows.length));closeModal();renderSlots();
}

async function openDaySlots(date){
  const s=_calSettings||await loadCalSettings();
  const times=generateSlotTimes(s);
  const targetDate=date||today();
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">${t('open_slots_day')}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Дата</label><input type="date" id="ds-date" value="${targetDate}"></div>
      <div class="form-group" style="margin-top:10px"><label>Тип слотов</label>
        <select id="ds-type">
          <option value="primary">Основной приём (60 мин)</option>
          <option value="short">15 мин (контроль / помощь)</option>
        </select>
      </div>
      <div class="form-group" style="margin-top:12px"><label>Время (каждый слот на новой строке)</label>
        <textarea id="ds-times" style="min-height:160px;font-family:monospace;font-size:14px">${times.join('\n')}</textarea>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">${t('cancel')}</button><button class="btn btn-accent" onclick="saveDaySlots()">Otvori</button></div>
  </div>`);
}
async function saveDaySlots(){
  const date=document.getElementById('ds-date').value;
  const slotType=document.getElementById('ds-type')?.value||'primary';
  const times=document.getElementById('ds-times').value.split('\n').map(t=>t.trim()).filter(t=>/^\d{2}:\d{2}$/.test(t));
  if(!date||!times.length){toast('Проверь дату и время','error');return;}
  const rows=times.map(t=>({date,start_time:t,is_booked:false,booked_by:null,slot_type:slotType}));
  await db.from('available_slots').upsert(rows,{onConflict:'date,start_time',ignoreDuplicates:true});
  toast(t('slots_opened').replace('%s',rows.length));closeModal();renderSlots();
}

function openAddCustomSlot(){
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">${t('add_slot')}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group"><label>Дата</label><input type="date" id="cs-date" value="${today()}"></div>
        <div class="form-group"><label>Время</label><input type="time" id="cs-time" value="09:00"></div>
      </div>
      <div class="form-group" style="margin-top:10px"><label>Тип слота</label>
        <select id="cs-type">
          <option value="primary">Основной приём (60 мин)</option>
          <option value="short">15 мин (контроль / помощь)</option>
        </select>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">${t('cancel')}</button><button class="btn btn-accent" onclick="saveCustomSlot()">Добавить</button></div>
  </div>`);
}
async function saveCustomSlot(){
  const date=document.getElementById('cs-date').value,time=document.getElementById('cs-time').value;
  const slotType=document.getElementById('cs-type')?.value||'primary';
  if(!date||!time)return;
  await db.from('available_slots').upsert({date,start_time:time,is_booked:false,booked_by:null,slot_type:slotType},{onConflict:'date,start_time'});
  toast(t('slot_added'));closeModal();renderSlots();
}

async function bookErvinAt(date,time,slotId){
  const sid=slotId||'';
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">${t('ervin_booking')} — ${time} ${fmt(date)}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body"><div class="form-group"><label>Пациент (необязательно)</label><input id="erv-note" placeholder="Имя пациента" autofocus></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">${t('cancel')}</button><button class="btn btn-accent" onclick="_confirmErvinBook('${date}','${time}','${sid}')" style="text-transform:none">Zauzimi</button></div>
  </div>`);
}
async function _confirmErvinBook(date,time,slotId){
  const note=document.getElementById('erv-note').value.trim();
  if(slotId){await db.from('available_slots').update({is_booked:true,booked_by:'ervin',ervin_note:note}).eq('id',slotId);}
  else{await db.from('available_slots').upsert({date,start_time:time,is_booked:true,booked_by:'ervin',ervin_note:note},{onConflict:'date,start_time'});}
  closeModal();renderSlots();
}
async function unbookErvin(id){if(!confirm(t('unbook_ervin')))return;await db.from('available_slots').delete().eq('id',id);renderSlots();}

async function openAddErvinBooking(){
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">${t('my_slot')}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group"><label>Дата</label><input type="date" id="erv-date" value="${today()}"></div>
        <div class="form-group"><label>Время</label><input type="time" id="erv-time" value="09:00"></div>
      </div>
      <div class="form-group" style="margin-top:12px"><label>Пациент (необязательно)</label><input id="erv-note2" placeholder="Имя пациента"></div>
    </div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">${t('cancel')}</button><button class="btn btn-accent" onclick="_saveErvinBooking()">Zauzimi</button></div>
  </div>`);
}
async function _saveErvinBooking(){
  const date=document.getElementById('erv-date').value,time=document.getElementById('erv-time').value;
  const note=document.getElementById('erv-note2').value.trim();
  if(!date||!time)return;
  await db.from('available_slots').upsert({date,start_time:time,is_booked:true,booked_by:'ervin',ervin_note:note},{onConflict:'date,start_time'});
  toast(t('booking_added'));closeModal();renderSlots();
}

async function delSlot(id){await removeSlot(id);}
function openRemoveSlotDialog(){}
