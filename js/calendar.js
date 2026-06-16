// ═══ CALENDAR ═══
let _calWeekOffset2 = 0;
let _calSettings = null;

const SLOT_TYPE_COLORS = {
  primary: { bg: '#d1fae5', text: '#065f46', label: 'Приём' },
  short:   { bg: '#fef3c7', text: '#92400e', label: '15 мин' },
  express: { bg: '#fce7f3', text: '#9d174d', label: 'Экспресс' },
};
function slotTypeColor(type){ return SLOT_TYPE_COLORS[type] || SLOT_TYPE_COLORS.primary; }

function generateSlotTimes(s){
  const start=s.cal_start||'09:00', end=s.cal_end||'18:00';
  const dur=+(s.cal_duration||60), brk=+(s.cal_break||15), step=dur+brk;
  const [sh,sm]=start.split(':').map(Number);
  const endMin = +end.split(':')[0]*60 + +(+end.split(':')[1]||0);
  const startMin=sh*60+sm;
  const times=[];
  for(let m=startMin;m+dur<=endMin;m+=step)
    times.push(String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'));
  return times;
}

async function loadCalSettings(){
  const{data}=await db.from('settings').select('key,value').in('key',['cal_start','cal_end','cal_duration','cal_break','cal_work_days']);
  const s={};(data||[]).forEach(r=>s[r.key]=r.value);
  _calSettings=s; return s;
}

async function renderSlots(){
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>${t('schedule')}</h1></div><div class="content"><div class="spinner">Загрузка...</div></div>`;
  const now=new Date(), day=now.getDay(), monday=new Date(now);
  monday.setDate(now.getDate()-(day===0?6:day-1)+_calWeekOffset2*7);
  const weekDays=[];
  for(let i=0;i<7;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);weekDays.push(d.toISOString().split('T')[0]);}
  const todayStr=today();
  const monthLabel=`${(t('months')||MONTH_RU)[monday.getMonth()]} ${monday.getFullYear()}`;

  const [s,{data:slots},{data:appts}]=await Promise.all([
    loadCalSettings(),
    db.from('available_slots').select('*').in('date',weekDays).order('start_time'),
    db.from('appointments').select('date,time,type,patient_id,patients(name),appointment_number').in('date',weekDays).neq('status','отменён').is('deleted_at',null)
  ]);
  const workDays=s.cal_work_days?s.cal_work_days.split(',').map(Number):[1,2,3,4,5,6];

  // Build maps keyed by "date|HH:MM"
  const slotsByDay={};
  const apptMap={};
  weekDays.forEach(d=>{ slotsByDay[d]=[]; });
  (slots||[]).forEach(sl=>{
    const tm=sl.start_time?.substr(0,5);
    if(sl.date && slotsByDay[sl.date]) slotsByDay[sl.date].push({...sl, _tm:tm});
  });
  (appts||[]).forEach(a=>{ apptMap[`${a.date}|${a.time?.substr(0,5)}`]=a; });

  // Merge: for each day collect items = slots + appointments not covered by a slot
  function dayItems(d){
    const items=[];
    const slotTimes=new Set(slotsByDay[d].map(sl=>sl._tm));

    // Add all slots first
    slotsByDay[d].forEach(sl=>{
      const appt=apptMap[`${d}|${sl._tm}`];
      items.push({ tm:sl._tm, slot:sl, appt: appt||null });
    });

    // Add appointments that have no matching slot
    (appts||[]).filter(a=>a.date===d).forEach(a=>{
      const tm=a.time?.substr(0,5);
      if(!slotTimes.has(tm)) items.push({ tm, slot:null, appt:a });
    });

    items.sort((a,b)=>a.tm.localeCompare(b.tm));
    return items;
  }

  // Render a single row card
  const nowTimeStr=new Date().toTimeString().substr(0,5);
  function renderItem(d, {tm, slot, appt}){
    const isPast=d<todayStr||(d===todayStr&&tm<nowTimeStr);

    if(appt){
      const sc=slotTypeColor(slot?.slot_type||'primary');
      return`<div class="cv-card cv-card-patient" onclick="openPatientCard('${appt.patient_id}')">
        <div class="cv-time">${tm}</div>
        <div class="cv-body">
          <div class="cv-name">${appt.patients?.name||'—'}</div>
          <div class="cv-sub">${apptTypeName(appt.type||'')||appt.appointment_number||''}</div>
        </div>
      </div>`;
    }

    if(slot && slot.booked_by==='ervin'){
      const can=isErvin()||isAdmin();
      return`<div class="cv-card cv-card-ervin">
        <div class="cv-time">${tm}</div>
        <div class="cv-body">
          <div class="cv-name">Ervin${slot.ervin_note?' — '+slot.ervin_note:''}</div>
        </div>
        ${can?`<button class="cv-btn cv-btn-del" onclick="unbookErvin('${slot.id}')" title="Отменить">🗑</button>`:''}
      </div>`;
    }

    if(slot && !slot.is_booked){
      const sc=slotTypeColor(slot.slot_type||'primary');
      const typeLabel=sc.label;
      if(isAdmin()) return`<div class="cv-card cv-card-free" style="background:${sc.bg};color:${sc.text}">
        <div class="cv-time">${tm}</div>
        <div class="cv-body">
          <div class="cv-name">✓ Свободно</div>
          <div class="cv-sub">${typeLabel}</div>
        </div>
        <div class="cv-actions">
          <button class="cv-btn cv-btn-add" onclick="openAddAppointmentAtSlot('${d}','${tm}','${slot.id}')" title="Записать">✚ Записать</button>
          <button class="cv-btn cv-btn-del" onclick="removeSlotDirect('${slot.id}')" title="Удалить слот">🗑</button>
        </div>
      </div>`;
      if(isErvin()) return`<div class="cv-card cv-card-free" style="background:${sc.bg};color:${sc.text}">
        <div class="cv-time">${tm}</div>
        <div class="cv-body"><div class="cv-name">✓ Свободно</div></div>
        <div class="cv-actions">
          <button class="cv-btn cv-btn-add" onclick="bookErvinAt('${d}','${tm}','${slot.id}')">Zauzimi</button>
          <button class="cv-btn cv-btn-del" onclick="removeSlotDirect('${slot.id}')">🗑</button>
        </div>
      </div>`;
      return`<div class="cv-card cv-card-free" style="background:${sc.bg};color:${sc.text}">
        <div class="cv-time">${tm}</div>
        <div class="cv-body"><div class="cv-name">✓ Свободно</div></div>
      </div>`;
    }

    return''; // no slot, no appointment
  }

  // Build column HTML per day
  const cols=weekDays.map(d=>{
    const dt=new Date(d+'T12:00:00');
    const isToday=d===todayStr;
    const isWork=workDays.includes(dt.getDay());
    const items=dayItems(d);
    const isEmpty=items.length===0;

    const addBtn=isAdmin()?`<button class="cv-add-slot-btn" onclick="openDaySlots('${d}')" title="Открыть слоты на день">+ слот</button>`
                :isErvin()?`<button class="cv-add-slot-btn cv-add-slot-btn-ervin" onclick="openAddErvinBooking()" title="Занять слот">+ занять</button>`:'';

    return`<div class="cv-col${isToday?' cv-col-today':''}${!isWork?' cv-col-nonwork':''}">
      <div class="cv-col-head">
        <div class="cv-dow">${DOW[dt.getDay()]}</div>
        <div class="cv-date">${dt.getDate()}</div>
        ${addBtn}
      </div>
      <div class="cv-cards">
        ${items.map(it=>renderItem(d,it)).filter(Boolean).join('')}
        ${isEmpty?`<div class="cv-empty">—</div>`:''}
      </div>
    </div>`;
  }).join('');

  document.querySelector('.content').innerHTML=`
  <style>
    .cv-week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;min-width:700px;}
    .cv-col{display:flex;flex-direction:column;gap:0;}
    .cv-col-nonwork .cv-col-head{opacity:.45;}
    .cv-col-today .cv-col-head{background:var(--accent-l);}
    .cv-col-today .cv-date{color:var(--accent);}
    .cv-col-head{
      background:var(--surface2);border-radius:8px 8px 0 0;
      text-align:center;padding:7px 4px 5px;
      border-bottom:2px solid var(--border);
      display:flex;flex-direction:column;align-items:center;gap:2px;
    }
    .cv-dow{font-size:10px;font-weight:600;color:var(--text-m);text-transform:uppercase;letter-spacing:.04em;}
    .cv-date{font-size:22px;font-weight:800;color:var(--text);line-height:1.1;}
    .cv-add-slot-btn{
      border:none;border-radius:4px;cursor:pointer;font-family:inherit;
      background:var(--accent);color:#fff;font-size:10px;font-weight:700;
      padding:3px 8px;margin-top:2px;transition:background .12s;
    }
    .cv-add-slot-btn:hover{background:var(--accent-h,#155a9c);}
    .cv-add-slot-btn-ervin{background:#d97706;}
    .cv-add-slot-btn-ervin:hover{background:#b45309;}
    .cv-cards{
      background:white;border-radius:0 0 8px 8px;
      border:1px solid var(--border);border-top:none;
      display:flex;flex-direction:column;gap:4px;
      padding:6px 5px;min-height:60px;
    }
    .cv-empty{font-size:12px;color:var(--text-l);text-align:center;padding:12px 0;opacity:.5;}
    .cv-card{
      display:flex;align-items:center;gap:6px;
      border-radius:7px;padding:7px 8px;
      cursor:default;transition:filter .12s;
      min-height:44px;
    }
    .cv-card-patient{background:#dbeafe;color:#1e3a8a;cursor:pointer;}
    .cv-card-patient:hover{filter:brightness(.95);}
    .cv-card-ervin{background:#fde68a;color:#92400e;}
    .cv-card-free{cursor:default;}
    .cv-time{
      font-size:12px;font-weight:800;
      min-width:34px;letter-spacing:.02em;
      line-height:1;flex-shrink:0;
    }
    .cv-body{flex:1;min-width:0;}
    .cv-name{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;}
    .cv-sub{font-size:10px;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .cv-actions{display:flex;flex-direction:column;gap:3px;flex-shrink:0;}
    .cv-btn{
      border:none;border-radius:4px;font-family:inherit;
      font-size:10px;font-weight:700;
      padding:3px 7px;cursor:pointer;white-space:nowrap;
      transition:background .12s;
    }
    .cv-btn-add{background:rgba(0,0,0,.16);color:inherit;}
    .cv-btn-add:hover{background:rgba(0,0,0,.3);}
    .cv-btn-del{background:rgba(220,38,38,.15);color:#b91c1c;}
    .cv-btn-del:hover{background:rgba(220,38,38,.35);}
    @media(max-width:760px){
      .cv-week{grid-template-columns:repeat(3,1fr);}
    }
    @media(max-width:500px){
      .cv-week{grid-template-columns:repeat(2,1fr);}
    }
  </style>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
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
  <div style="overflow-x:auto">
    <div class="cv-week">${cols}</div>
  </div>
  <div style="display:flex;gap:14px;margin-top:12px;font-size:11px;color:var(--text-m);flex-wrap:wrap;align-items:center">
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#d1fae5;display:inline-block"></span>Приём (60 мин)</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#fef3c7;display:inline-block"></span>15 мин</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#fce7f3;display:inline-block"></span>Экспресс</span>
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
          <option value="express">Экспресс-диагностика (акция)</option>
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

async function removeSlot(id){
  await db.from('available_slots').delete().eq('id',id);
  if(typeof closeModal==='function')closeModal();
  renderSlots();
}

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
          <option value="express">Экспресс-диагностика (акция)</option>
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
          <option value="express">Экспресс-диагностика (акция)</option>
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
          <option value="express">Экспресс-диагностика (акция)</option>
        </select>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button><button class="btn btn-accent" onclick="saveCustomSlot()">Добавить</button></div>
  </div>`);
}
async function saveCustomSlot(){
  const date=document.getElementById('cs-date').value, time=document.getElementById('cs-time').value;
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
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button><button class="btn btn-accent" onclick="_saveErvinBooking()">Zauzimi</button></div>
  </div>`);
}
async function _saveErvinBooking(){
  const date=document.getElementById('erv-date').value, time=document.getElementById('erv-time').value;
  const note=document.getElementById('erv-note2').value.trim();
  if(!date||!time)return;
  await db.from('available_slots').upsert({date,start_time:time,is_booked:true,booked_by:'ervin',ervin_note:note},{onConflict:'date,start_time'});
  toast(t('booking_added'));closeModal();renderSlots();
}

async function delSlot(id){await removeSlot(id);}
function openRemoveSlotDialog(){}
