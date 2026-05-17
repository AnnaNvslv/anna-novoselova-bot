// ═══ CALENDAR ═══
let _calWeekOffset2 = 0;
let _calSettings = null;

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
  const defaultTimes=generateSlotTimes(s);
  const workDays=s.cal_work_days?s.cal_work_days.split(',').map(Number):[1,2,3,4,5,6];
  const slotMap={};(slots||[]).forEach(sl=>{slotMap[`${sl.date}|${sl.start_time?.substr(0,5)}`]=sl;});
  const apptMap={};(appts||[]).forEach(a=>{apptMap[`${a.date}|${a.time?.substr(0,5)}`]=a;});
  const extraTimes=new Set();
  (slots||[]).forEach(sl=>{const t=sl.start_time?.substr(0,5);if(t&&!defaultTimes.includes(t))extraTimes.add(t);});
  const allTimes=[...new Set([...defaultTimes,...extraTimes])].sort();

  const renderCell=(d,tm)=>{
    const k=`${d}|${tm}`, appt=apptMap[k], slot=slotMap[k];
    const isPast=d<todayStr||(d===todayStr&&tm<new Date().toTimeString().substr(0,5));
    if(appt) return`<div class="cal-pill cal-pill-patient" onclick="openPatientCard('${appt.patient_id}')">
      <div class="cal-pill-name">${appt.patients?.name?.split(' ')[0]||'—'}</div>
      <div class="cal-pill-sub" style="font-size:10px;opacity:.8">${(apptTypeName(appt.type||'')||appt.type||''||appt.appointment_number||'').substr(0,12)+((apptTypeName(appt.type||'')||appt.appointment_number||''||"").length>12?"…":"")}</div></div>`;
    if(slot&&slot.booked_by==='ervin'){
      const can=isErvin()||isAdmin();
      const ervinAttrs = can ? `onclick="unbookErvin('${slot.id}')"` : '';
      return`<div class="cal-pill cal-pill-ervin" style="display:flex;align-items:center;justify-content:space-between;gap:4px" ${ervinAttrs}>
        <div><div class="cal-pill-name">Ervin${slot.ervin_note?' — '+slot.ervin_note:''}</div></div>
        ${can?`<span style="font-size:11px;padding:2px 7px;background:rgba(0,0,0,.18);border-radius:4px;flex-shrink:0">Otkaži</span>`:''}
      </div>`;}
    if(slot&&!slot.is_booked){
      if(isErvin()) return`<div class="cal-pill cal-pill-free" onclick="bookErvinAt('${d}','${tm}','${slot.id||''}')"><div class="cal-pill-name">${t('slot_open')}</div><div class="cal-pill-sub">Zauzimi</div></div>`;
      if(isAdmin()) return`<div class="cal-pill cal-pill-free" onclick="removeSlot('${slot.id}')"><div class="cal-pill-name">✓ ${t('slot_open')}</div><div class="cal-pill-sub">${t('slot_remove')}</div></div>`;
      return`<div class="cal-pill cal-pill-free"><div class="cal-pill-name">✓ ${t('slot_open')}</div></div>`;}
    if(isPast) return`<div class="cal-pill-empty cal-pill-past">—</div>`;
    if(isAdmin()) return`<div class="cal-pill-empty cal-pill-add" onclick="addSlotAt('${d}','${tm}')">+</div>`;
    if(isErvin()) return`<div class="cal-pill-empty cal-pill-ervin-add" onclick="bookErvinAt('${d}','${tm}','')">+</div>`;
    return`<div class="cal-pill-empty">—</div>`;
  };

  document.querySelector('.content').innerHTML=`
  <style>
    .cal-grid{display:grid;grid-template-columns:60px repeat(7,1fr);background:white;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,.08);overflow:hidden}
    .cal-grid-head{padding:10px 6px;text-align:center;background:var(--surface2);border-bottom:2px solid var(--border);font-size:12px;font-weight:700;color:var(--text-m)}
    .cal-grid-head.today{background:var(--accent-l);color:var(--accent-h)}
    .cal-date{font-size:22px;font-weight:800;color:var(--text);line-height:1.1}
    .cal-grid-head.today .cal-date{color:var(--accent)}
    .cal-grid-time{padding:8px 6px 8px 2px;text-align:right;font-size:11px;font-weight:700;color:var(--text-l);background:var(--surface2);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:flex-end}
    .cal-grid-cell{padding:5px 4px;border-bottom:1px solid var(--border);border-left:1px solid var(--border);display:flex;align-items:center;justify-content:center;min-height:52px}
    .cal-nonwork{background:#fafafa}
    .cal-pill{border-radius:8px;padding:5px 7px;font-size:11px;width:100%;cursor:pointer;transition:filter .15s}
    .cal-pill:hover{filter:brightness(.93)}
    .cal-pill-name{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .cal-pill-sub{font-size:10px;opacity:.7}
    .cal-pill-free{background:#d1fae5;color:#065f46}
    .cal-pill-patient{background:#dbeafe;color:#1e3a8a;cursor:pointer}
    .cal-pill-ervin{background:#fde68a;color:#92400e;cursor:pointer}
    .cal-pill-empty{font-size:12px;color:var(--text-l);text-align:center;width:100%}
    .cal-pill-add{color:var(--accent);font-size:22px;font-weight:700;cursor:pointer;border-radius:6px;padding:0 8px}
    .cal-pill-add:hover{background:var(--accent-l)}
    .cal-pill-ervin-add{color:#d97706;font-size:22px;font-weight:700;cursor:pointer;border-radius:6px;padding:0 8px}
    .cal-pill-ervin-add:hover{background:#fef3c7}
    .cal-pill-past{opacity:.25}
  </style>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
    <div class="flex gap-8 items-center">
      <button class="btn btn-ghost btn-sm" onclick="_calWeekOffset2--;renderSlots()">${t('back')}</button>
      <b style="font-size:15px;min-width:160px;text-align:center">${monthLabel}</b>
      <button class="btn btn-ghost btn-sm" onclick="_calWeekOffset2=0;renderSlots()">${t('today')}</button>
      <button class="btn btn-ghost btn-sm" onclick="_calWeekOffset2++;renderSlots()">${t('forward')}</button>
    </div>
    <div class="flex gap-8 items-center">
      ${isAdmin()?`<button class="btn btn-ghost btn-sm" onclick="openAddCustomSlot()">${t('custom_slot')}</button>
        <button class="btn btn-accent btn-sm" onclick="openDaySlots(null)">${`📅 ${t('open_day')}`}</button>
        <button class="btn btn-accent btn-sm" onclick="openWeekSlots('${weekDays[0]}','${weekDays[4]}')">${`📅 ${t('open_week')}`}</button>`:''}
      ${isErvin()?`<button class="btn btn-accent btn-sm" onclick="openAddErvinBooking()">${`+ ${t('my_slot')}`}</button>`:''}
    </div>
  </div>
  <div class="cal-grid">
    <div class="cal-grid-head" style="font-size:10px;color:var(--text-l)">${s.cal_duration||60}м +${s.cal_break||15}м</div>
    ${weekDays.map(d=>{const dt=new Date(d+'T12:00:00');const isToday=d===todayStr;const isWork=workDays.includes(dt.getDay());
      return`<div class="cal-grid-head${isToday?' today':''}" style="${!isWork?'opacity:.45':''}">
        <div style="font-size:11px">${DOW[dt.getDay()]}</div>
        <div class="cal-date">${dt.getDate()}</div>
        ${isAdmin()?`<button style="font-size:10px;padding:1px 5px;border:1px solid var(--border);border-radius:4px;background:white;cursor:pointer;color:var(--text-m);margin-top:3px" onclick="openDaySlots('${d}')">${t('open_day')}</button>`:''}
      </div>`;}).join('')}
    ${allTimes.map(tm=>`
      <div class="cal-grid-time">${tm}</div>
      ${weekDays.map(d=>{const dt=new Date(d+'T12:00:00');const isWork=workDays.includes(dt.getDay());
        return`<div class="cal-grid-cell${!isWork?' cal-nonwork':''}">${renderCell(d,tm)}</div>`;}).join('')}
    `).join('')}
  </div>
  <div style="display:flex;gap:16px;margin-top:12px;font-size:12px;color:var(--text-m);flex-wrap:wrap">
    <span style="display:flex;align-items:center;gap:4px"><span style="width:11px;height:11px;border-radius:3px;background:#d1fae5;display:inline-block"></span>${t("slot_open")}</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:11px;height:11px;border-radius:3px;background:#dbeafe;display:inline-block"></span>${t("patient")}</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:11px;height:11px;border-radius:3px;background:#fde68a;display:inline-block"></span>${t("slot_ervin")}</span>
    ${isAdmin()?`· <a href="#" onclick="nav('settings')" style="color:var(--accent);font-size:12px">${t('schedule_settings')}</a>`:''}
  </div>`;
}

async function addSlotAt(date,time){
  await db.from('available_slots').upsert({date,start_time:time,is_booked:false,booked_by:null},{onConflict:'date,start_time'});
  renderSlots();
}

async function openDaySlots(date){
  const s=_calSettings||await loadCalSettings();
  const times=generateSlotTimes(s);
  const targetDate=date||today();
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">${t('open_slots_day')}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Дата</label><input type="date" id="ds-date" value="${targetDate}"></div>
      <div class="form-group" style="margin-top:12px"><label>Время (каждый слот на новой строке — можно редактировать)</label>
        <textarea id="ds-times" style="min-height:200px;font-family:monospace;font-size:14px">${times.join('\n')}</textarea>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">${t('cancel')}</button><button class="btn btn-accent" onclick="saveDaySlots()">Otvori</button></div>
  </div>`);
}

async function saveDaySlots(){
  const date=document.getElementById('ds-date').value;
  const times=document.getElementById('ds-times').value.split('\n').map(t=>t.trim()).filter(t=>/^\d{2}:\d{2}$/.test(t));
  if(!date||!times.length){toast('Проверь дату и время','error');return;}
  const rows=times.map(t=>({date,start_time:t,is_booked:false,booked_by:null}));
  await db.from('available_slots').upsert(rows,{onConflict:'date,start_time',ignoreDuplicates:true});
  toast(t('slots_opened').replace('%s',rows.length));closeModal();renderSlots();
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
  const days=[0,1,2,3,4,5,6].filter(i=>document.getElementById('ws-d'+i)?.checked);
  const times=document.getElementById('ws-times').value.split('\n').map(t=>t.trim()).filter(t=>/^\d{2}:\d{2}$/.test(t));
  const rows=[];
  for(let d=new Date(from);d<=to;d.setDate(d.getDate()+1)){
    if(days.includes(d.getDay())){
      const ds=d.toISOString().split('T')[0];
      times.forEach(t=>rows.push({date:ds,start_time:t,is_booked:false,booked_by:null}));
    }
  }
  if(!rows.length){toast('Нет слотов','error');return;}
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
    </div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">${t('cancel')}</button><button class="btn btn-accent" onclick="saveCustomSlot()">Добавить</button></div>
  </div>`);
}

async function saveCustomSlot(){
  const date=document.getElementById('cs-date').value, time=document.getElementById('cs-time').value;
  if(!date||!time)return;
  await db.from('available_slots').upsert({date,start_time:time,is_booked:false,booked_by:null},{onConflict:'date,start_time'});
  toast(t('slot_added'));closeModal();renderSlots();
}

async function removeSlot(id){await db.from('available_slots').delete().eq('id',id);renderSlots();}

async function bookErvinAt(date,time,slotId){
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">${t('ervin_booking')} — ${time} ${fmt(date)}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body"><div class="form-group"><label>Пациент (необязательно)</label><input id="erv-note" placeholder="Имя пациента" autofocus></div></div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">${t('cancel')}</button><button class="btn btn-accent" onclick="_confirmErvinBook('${date}','${time}','${slotId||''}') " style="text-transform:none">Zauzimi</button></div>
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
  const date=document.getElementById('erv-date').value, time=document.getElementById('erv-time').value;
  const note=document.getElementById('erv-note2').value.trim();
  if(!date||!time)return;
  await db.from('available_slots').upsert({date,start_time:time,is_booked:true,booked_by:'ervin',ervin_note:note},{onConflict:'date,start_time'});
  toast(t('booking_added'));closeModal();renderSlots();
}

async function delSlot(id){await removeSlot(id);}
