// ═══ CALENDAR ═══
let _calWeekOffset2 = 0;
let _calSettings = null;

// Цвета слотов по slot_type
const SLOT_TYPE_COLORS = {
  primary: { bg: '#d1fae5', text: '#065f46', label: 'Основной приём' },
  short:   { bg: '#fef3c7', text: '#92400e', label: '15 мин (контроль/помощь)' },
};
function slotTypeColor(type){return SLOT_TYPE_COLORS[type]||SLOT_TYPE_COLORS.primary;}

// Фиксированная сетка: шаг 15 мин, 09:00–19:45
const GRID_START = 9 * 60;   // 09:00
const GRID_END   = 20 * 60;  // 20:00 exclusive
const GRID_STEP  = 15;       // 15 минут

function gridTimes() {
  const times = [];
  for (let m = GRID_START; m < GRID_END; m += GRID_STEP)
    times.push(String(Math.floor(m/60)).padStart(2,'0') + ':' + String(m%60).padStart(2,'0'));
  return times;
}

function generateSlotTimes(s) {
  const start = s.cal_start || '09:00';
  const end   = s.cal_end   || '18:00';
  const dur   = +(s.cal_duration || 60);
  const brk   = +(s.cal_break    || 15);
  const step  = dur + brk;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startMin = sh*60+sm, endMin = eh*60+em;
  const times = [];
  for (let m = startMin; m+dur <= endMin; m += step)
    times.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`);
  return times;
}

async function loadCalSettings() {
  const {data} = await db.from('settings').select('key,value').in('key',['cal_start','cal_end','cal_duration','cal_break','cal_work_days']);
  const s = {}; (data||[]).forEach(r => s[r.key]=r.value);
  _calSettings = s; return s;
}

async function renderSlots() {
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>${t('schedule')}</h1></div><div class="content"><div class="spinner">Загрузка...</div></div>`;
  const now=new Date(), day=now.getDay(), monday=new Date(now);
  monday.setDate(now.getDate()-(day===0?6:day-1)+_calWeekOffset2*7);
  const weekDays=[];
  for(let i=0;i<7;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);weekDays.push(d.toISOString().split('T')[0]);}
  const todayStr=today(), monthLabel=`${(t('months')||MONTH_RU)[monday.getMonth()]} ${monday.getFullYear()}`;

  const [s,{data:slots},{data:appts}]=await Promise.all([
    loadCalSettings(),
    db.from('available_slots').select('*').in('date',weekDays).order('start_time'),
    db.from('appointments').select('date,time,type,patient_id,patients(name),appointment_number').in('date',weekDays).neq('status','отменён').is('deleted_at',null)
  ]);
  const workDays=s.cal_work_days?s.cal_work_days.split(',').map(Number):[1,2,3,4,5,6];
  const slotMap={};(slots||[]).forEach(sl=>{slotMap[`${sl.date}|${sl.start_time?.substr(0,5)}`]=sl;});
  const apptMap={};(appts||[]).forEach(a=>{apptMap[`${a.date}|${a.time?.substr(0,5)}`]=a;});

  // Фиксированная сетка + внештатные слоты за пределами сетки
  const baseGrid = new Set(gridTimes());
  (slots||[]).forEach(sl=>{const tt=sl.start_time?.substr(0,5);if(tt&&!baseGrid.has(tt))baseGrid.add(tt);});
  const allTimes=[...baseGrid].sort();

  // Цвет строки: часовые (на :00) немного темнее
  const isHour = tm => tm.endsWith(':00');

  const renderCell=(d,tm)=>{
    const k=`${d}|${tm}`, appt=apptMap[k], slot=slotMap[k];
    const isPast=d<todayStr||(d===todayStr&&tm<new Date().toTimeString().substr(0,5));

    // Записанный пациент
    if(appt) return`<div class="cal-pill cal-pill-patient" onclick="openPatientCard('${appt.patient_id}')">
      <div class="cal-pill-name">${appt.patients?.name?.split(' ')[0]||'—'}</div>
      <div class="cal-pill-sub">${(apptTypeName(appt.type||'')||appt.type||appt.appointment_number||'').substr(0,14)}</div>
    </div>`;

    // Ervin
    if(slot&&slot.booked_by==='ervin'){
      const can=isErvin()||isAdmin();
      return`<div class="cal-pill cal-pill-ervin" style="display:flex;align-items:center;justify-content:space-between;gap:4px">
        <div style="min-width:0"><div class="cal-pill-name">Ervin${slot.ervin_note?' — '+slot.ervin_note:''}</div></div>
        ${can?`<button class="cal-act-btn cal-del-btn" onclick="event.stopPropagation();unbookErvin('${slot.id}')" title="Отменить">🗑</button>`:''}
      </div>`;}

    // Свободный слот — кнопки прямо на бабле
    if(slot&&!slot.is_booked){
      const sc=slotTypeColor(slot.slot_type||'primary');
      const typeLabel=slot.slot_type==='short'?'15 мин':'Приём';
      const adminBtns=isAdmin()?`
        <div style="display:flex;gap:3px;margin-top:4px">
          <button class="cal-act-btn cal-add-btn" onclick="event.stopPropagation();openAddAppointmentAtSlot('${d}','${tm}','${slot.id}')" title="+ Pregled">+ Pregled</button>
          <button class="cal-act-btn cal-del-btn" onclick="event.stopPropagation();removeSlotDirect('${slot.id}')" title="Удалить">🗑</button>
        </div>`:'';
      const ervinBtns=isErvin()&&!isAdmin()?`
        <div style="display:flex;gap:3px;margin-top:4px">
          <button class="cal-act-btn cal-add-btn" onclick="event.stopPropagation();bookErvinAt('${d}','${tm}','${slot.id}')" title="Zauzimi">Zauzimi</button>
          <button class="cal-act-btn cal-del-btn" onclick="event.stopPropagation();removeSlotDirect('${slot.id}')" title="Отменить">🗑</button>
        </div>`:'';
      return`<div class="cal-pill" style="background:${sc.bg};color:${sc.text}">
        <div class="cal-pill-name">✓ ${typeLabel}</div>
        ${adminBtns}${ervinBtns}
      </div>`;}

    // Пустая ячейка
    if(isPast) return`<div class="cal-cell-empty cal-pill-past">—</div>`;
    if(isAdmin()) return`<div class="cal-cell-empty cal-cell-add" onclick="addSlotAt('${d}','${tm}')" title="Добавить слот">+</div>`;
    if(isErvin()) return`<div class="cal-cell-empty cal-cell-add cal-cell-ervin-add" onclick="bookErvinAt('${d}','${tm}','')" title="Занять">+</div>`;
    return`<div class="cal-cell-empty">—</div>`;
  };

  document.querySelector('.content').innerHTML=`
  <style>
    .cal-wrap{overflow-x:auto;}
    .cal-grid{
      display:grid;
      grid-template-columns:52px repeat(7,minmax(90px,1fr));
      background:white;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,.08);overflow:hidden;
      min-width:740px;
    }
    .cal-grid-head{padding:10px 6px;text-align:center;background:var(--surface2);border-bottom:2px solid var(--border);font-size:12px;font-weight:700;color:var(--text-m)}
    .cal-grid-head.today{background:var(--accent-l);color:var(--accent-h)}
    .cal-date{font-size:22px;font-weight:800;color:var(--text);line-height:1.1}
    .cal-grid-head.today .cal-date{color:var(--accent)}
    .cal-grid-time{
      padding:0 4px 0 2px;text-align:right;font-size:10px;font-weight:600;
      color:var(--text-l);background:var(--surface2);
      border-bottom:1px solid var(--border);
      display:flex;align-items:center;justify-content:flex-end;
      min-height:32px;
    }
    .cal-grid-time.hour{color:var(--text-m);font-weight:700;background:#f1f5f9;}
    .cal-grid-cell{
      padding:2px 3px;
      border-bottom:1px solid var(--border);
      border-left:1px solid var(--border);
      display:flex;align-items:center;justify-content:center;
      min-height:32px;
    }
    .cal-grid-cell.hour{background:#f8fafc;}
    .cal-nonwork{background:#fafafa}
    .cal-nonwork.hour{background:#f3f3f3}
    .cal-pill{border-radius:7px;padding:4px 6px;font-size:11px;width:100%;box-sizing:border-box;}
    .cal-pill-name{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px}
    .cal-pill-sub{font-size:10px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .cal-pill-patient{background:#dbeafe;color:#1e3a8a;cursor:pointer;}
    .cal-pill-patient:hover{filter:brightness(.95)}
    .cal-pill-ervin{background:#fde68a;color:#92400e;}
    .cal-cell-empty{font-size:11px;color:var(--text-l);text-align:center;width:100%;padding:4px 0;}
    .cal-cell-add{color:var(--accent);font-size:18px;font-weight:700;cursor:pointer;border-radius:5px;transition:background .1s;}
    .cal-cell-add:hover{background:var(--accent-l);}
    .cal-cell-ervin-add{color:#d97706;}
    .cal-cell-ervin-add:hover{background:#fef3c7;}
    .cal-pill-past{opacity:.2}
    /* Кнопки на бабле */
    .cal-act-btn{border:none;border-radius:4px;font-size:10px;padding:2px 6px;cursor:pointer;font-family:inherit;font-weight:600;line-height:1.4;flex-shrink:0;}
    .cal-add-btn{background:rgba(0,0,0,.12);color:inherit;}
    .cal-add-btn:hover{background:rgba(0,0,0,.22);}
    .cal-del-btn{background:rgba(220,38,38,.15);color:#b91c1c;}
    .cal-del-btn:hover{background:rgba(220,38,38,.3);}
  </style>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
    <div class="flex gap-8 items-center">
      <button class="btn btn-ghost btn-sm" onclick="_calWeekOffset2--;renderSlots()">${t('back')}</button>
      <b style="font-size:15px;min-width:160px;text-align:center">${monthLabel}</b>
      <button class="btn btn-ghost btn-sm" onclick="_calWeekOffset2=0;renderSlots()">${t('today')}</button>
      <button class="btn btn-ghost btn-sm" onclick="_calWeekOffset2++;renderSlots()">${t('forward')}</button>
    </div>
    <div class="flex gap-8 items-center">
      ${isAdmin()?`<button class="btn btn-accent btn-sm" onclick="openWeekSlots('${weekDays[0]}','${weekDays[4]}')">📅 ${t('open_week')}</button>`:''}
      ${isErvin()?`<button class="btn btn-accent btn-sm" onclick="openAddErvinBooking()">+ ${t('my_slot')}</button>`:''}
    </div>
  </div>
  <div class="cal-wrap">
  <div class="cal-grid">
    <div class="cal-grid-head" style="font-size:10px;color:var(--text-l)"></div>
    ${weekDays.map(d=>{const dt=new Date(d+'T12:00:00');const isToday=d===todayStr;const isWork=workDays.includes(dt.getDay());
      return`<div class="cal-grid-head${isToday?' today':''}" style="${!isWork?'opacity:.45':''}">
        <div style="font-size:11px">${DOW[dt.getDay()]}</div>
        <div class="cal-date">${dt.getDate()}</div>
      </div>`;}).join('')}
    ${allTimes.map(tm=>{
      const hourClass=isHour(tm)?' hour':'';
      return`<div class="cal-grid-time${hourClass}">${tm}</div>
      ${weekDays.map(d=>{const dt=new Date(d+'T12:00:00');const isWork=workDays.includes(dt.getDay());
        return`<div class="cal-grid-cell${hourClass}${!isWork?' cal-nonwork':''}">${renderCell(d,tm)}</div>`;}).join('')}`;
    }).join('')}
  </div>
  </div>
  <div style="display:flex;gap:16px;margin-top:12px;font-size:12px;color:var(--text-m);flex-wrap:wrap;align-items:center">
    <span style="display:flex;align-items:center;gap:4px"><span style="width:11px;height:11px;border-radius:3px;background:#d1fae5;display:inline-block"></span>Основной приём (свободно)</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:11px;height:11px;border-radius:3px;background:#fef3c7;display:inline-block"></span>15 мин (контроль/помощь)</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:11px;height:11px;border-radius:3px;background:#dbeafe;display:inline-block"></span>${t('patient')}</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:11px;height:11px;border-radius:3px;background:#fde68a;display:inline-block"></span>${t('slot_ervin')}</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:11px;height:11px;border-radius:3px;background:var(--surface2);border:1px dashed var(--border);display:inline-block"></span>+ клик по ячейке → добавить слот</span>
    ${isAdmin()?`· <a href="#" onclick="nav('settings')" style="color:var(--accent);font-size:12px">${t('schedule_settings')}</a>`:''}
  </div>`;
}

// Удаление слота напрямую без модального диалога
async function removeSlotDirect(id){
  if(!confirm('Удалить слот?'))return;
  await db.from('available_slots').delete().eq('id',id);
  renderSlots();
}

// Добавление слота кликом по ячейке
async function addSlotAt(date,time){
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">Добавить слот — ${time} ${fmt(date)}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Тип слота</label>
        <select id="as-type">
          <option value="primary">Основной приём (60–120 мин)</option>
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

// Открытие слотов на неделю
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
          <option value="primary">Основной приём (60–120 мин)</option>
          <option value="short">15 мин (контроль / помощь)</option>
        </select>
      </div>
      <div class="form-group" style="margin-top:10px"><label>Рабочие дни</label>
        <div class="flex gap-8" style="flex-wrap:wrap;margin-top:6px">
          ${['Вс','Пн','Вт','Ср','Чт','Пт','Сб'].map((d,i)=>`<label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="ws-d${i}" ${workDays.includes(i)?'checked':''} style="width:auto">${d}</label>`).join('')}
        </div>
      </div>
      <div class="form-group" style="margin-top:10px"><label>Слоты (каждое время на новой строке)</label>
        <textarea id="ws-times" style="min-height:160px;font-family:monospace;font-size:14px">${times.join('\n')}</textarea>
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

// Открытие слотов на один день (fallback)
async function openDaySlots(date){
  const s=_calSettings||await loadCalSettings();
  const times=generateSlotTimes(s);
  const targetDate=date||today();
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">${t('open_slots_day')}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Дата</label><input type="date" id="ds-date" value="${targetDate}"></div>
      <div class="form-group" style="margin-top:10px"><label>Тип слотов</label>
        <select id="ds-type">
          <option value="primary">Основной приём (60–120 мин)</option>
          <option value="short">15 мин (контроль / помощь)</option>
        </select>
      </div>
      <div class="form-group" style="margin-top:12px"><label>Время (каждый слот на новой строке)</label>
        <textarea id="ds-times" style="min-height:200px;font-family:monospace;font-size:14px">${times.join('\n')}</textarea>
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

// Кастомный слот (fallback)
function openAddCustomSlot(){
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">${t('add_slot')}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group"><label>Дата</label><input type="date" id="cs-date" value="${today()}"></div>
        <div class="form-group"><label>Время</label><input type="time" id="cs-time" value="09:00"></div>
      </div>
      <div class="form-group" style="margin-top:10px"><label>Тип слота</label>
        <select id="cs-type">
          <option value="primary">Основной приём (60–120 мин)</option>
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
// openRemoveSlotDialog оставляем для обратной совместимости с другими местами
function openRemoveSlotDialog(){}
