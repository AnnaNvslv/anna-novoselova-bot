// ═══ SLOTS (INTERACTIVE CALENDAR) ═══
const FIXED_SLOTS = ['09:15','10:30','11:45','13:00','14:15','15:30','16:45'];
let _calWeekOffset2 = 0;

async function renderSlots() {
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>Расписание</h1></div><div class="content"><div class="spinner">Загрузка...</div></div>`;
  const now=new Date();
  const day=now.getDay();
  const monday=new Date(now);
  monday.setDate(now.getDate()-(day===0?6:day-1)+_calWeekOffset2*7);
  const weekDays=[];
  for(let i=0;i<7;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);weekDays.push(d.toISOString().split('T')[0]);}
  const todayStr=today();
  const monthLabel=`${MONTH_RU[monday.getMonth()]} ${monday.getFullYear()}`;

  const [{data:slots},{data:appts}]=await Promise.all([
    db.from('available_slots').select('*').in('date',weekDays).order('start_time'),
    db.from('appointments').select('date,time,type,patient_id,patients(name),appointment_number').in('date',weekDays).neq('status','отменён')
  ]);

  // Build lookup maps
  const slotMap={};
  (slots||[]).forEach(s=>{const k=`${s.date}|${s.start_time?.substr(0,5)}`;slotMap[k]=s;});
  const apptMap={};
  (appts||[]).forEach(a=>{const k=`${a.date}|${a.time?.substr(0,5)}`;apptMap[k]=a;});

  // Collect all times to show: fixed slots + any ervin bookings not in fixed slots
  const ervinTimes=new Set();
  (slots||[]).filter(s=>s.booked_by==='ervin').forEach(s=>{
    const t=s.start_time?.substr(0,5);
    if(t&&!FIXED_SLOTS.includes(t)) ervinTimes.add(t);
  });
  const allTimes=[...FIXED_SLOTS,...[...ervinTimes].sort()];

  const renderSlotCell=(d,t)=>{
    const k=`${d}|${t}`;
    const appt=apptMap[k];
    const slot=slotMap[k];
    const isPast=d<todayStr||(d===todayStr&&t<new Date().toTimeString().substr(0,5));

    if(appt){
      return`<div class="cal-pill cal-pill-patient" onclick="openPatientCard('${appt.patient_id}')" title="Открыть карточку">
        <div class="cal-pill-name">${appt.patients?.name?.split(' ')[0]||'—'}</div>
        <div class="cal-pill-sub">${appt.appointment_number||''}</div>
      </div>`;
    }
    if(slot&&slot.booked_by==='ervin'){
      const canUnbook=isErvin()||isAdmin();
      return`<div class="cal-pill cal-pill-ervin" ${canUnbook?`onclick="unbookErvin('${slot.id}')" title="Снять бронь Ervin"`:'title="Занято Ervin"'}>
        <div class="cal-pill-name">Ervin</div>
        <div class="cal-pill-sub">${slot.ervin_note||''}</div>
      </div>`;
    }
    if(slot&&!slot.is_booked){
      if(isErvin()){
        return`<div class="cal-pill cal-pill-free" onclick="bookErvinAt('${d}','${t}','${slot.id}')" title="Забронировать для Ervin">
          <div class="cal-pill-name">Свободно</div>
          <div class="cal-pill-sub">нажми чтобы занять</div>
        </div>`;
      }
      if(isAdmin()){
        return`<div class="cal-pill cal-pill-free" onclick="removeSlot('${slot.id}')" title="Убрать слот">
          <div class="cal-pill-name">✓ Открыт</div>
          <div class="cal-pill-sub">убрать</div>
        </div>`;
      }
      return`<div class="cal-pill cal-pill-free"><div class="cal-pill-name">✓ Открыт</div></div>`;
    }
    if(isPast) return`<div class="cal-pill-empty cal-pill-past">—</div>`;
    if(isAdmin()){
      return`<div class="cal-pill-empty cal-pill-add" onclick="addSlotAt('${d}','${t}')" title="Добавить слот ${t}">+</div>`;
    }
    if(isErvin()){
      return`<div class="cal-pill-empty cal-pill-ervin-add" onclick="bookErvinAt('${d}','${t}',null)" title="Занять ${t} для Ervin">+</div>`;
    }
    return`<div class="cal-pill-empty">—</div>`;
  };

  document.querySelector('.content').innerHTML=`
    <style>
      .cal-grid{display:grid;grid-template-columns:64px repeat(7,1fr);gap:0;background:white;border-radius:12px;box-shadow:0 2px 16px rgba(0,0,0,.08);overflow:hidden}
      .cal-grid-head{padding:10px 6px;text-align:center;background:var(--surface2);border-bottom:2px solid var(--border);font-size:12px;font-weight:700;color:var(--text-m)}
      .cal-grid-head.today{background:var(--accent-l);color:var(--accent-h)}
      .cal-grid-head .cal-date{font-size:22px;font-weight:800;color:var(--text);line-height:1.1}
      .cal-grid-head.today .cal-date{color:var(--accent)}
      .cal-grid-time{padding:10px 8px 10px 4px;text-align:right;font-size:12px;font-weight:700;color:var(--text-l);background:var(--surface2);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:flex-end}
      .cal-grid-cell{padding:6px 5px;border-bottom:1px solid var(--border);border-left:1px solid var(--border);display:flex;align-items:center;justify-content:center;min-height:56px}
      .cal-pill{border-radius:8px;padding:5px 8px;font-size:11.5px;width:100%;cursor:pointer;transition:filter .15s}
      .cal-pill:hover{filter:brightness(.94)}
      .cal-pill-name{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cal-pill-sub{font-size:10px;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cal-pill-free{background:#d1fae5;color:#065f46}
      .cal-pill-patient{background:#dbeafe;color:#1e3a8a;cursor:pointer}
      .cal-pill-ervin{background:#fde68a;color:#92400e;cursor:pointer}
      .cal-pill-empty{font-size:12px;color:var(--text-l);text-align:center;width:100%;padding:4px 0}
      .cal-pill-add{color:var(--accent);font-size:20px;font-weight:700;cursor:pointer;border-radius:6px;padding:2px 8px;transition:background .15s}
      .cal-pill-add:hover{background:var(--accent-l)}
      .cal-pill-ervin-add{color:#d97706;font-size:20px;font-weight:700;cursor:pointer;border-radius:6px;padding:2px 8px;transition:background .15s}
      .cal-pill-ervin-add:hover{background:#fef3c7}
      .cal-pill-past{opacity:.3}
      .cal-head-actions{display:flex;flex-direction:column;gap:3px;margin-top:4px}
    </style>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px">
      <div class="flex gap-8 items-center">
        <button class="btn btn-ghost btn-sm" onclick="_calWeekOffset2--;renderSlots()">← Назад</button>
        <b style="font-size:15px;min-width:160px;text-align:center">${monthLabel}</b>
        <button class="btn btn-ghost btn-sm" onclick="_calWeekOffset2=0;renderSlots()">Сегодня</button>
        <button class="btn btn-ghost btn-sm" onclick="_calWeekOffset2++;renderSlots()">Вперёд →</button>
      </div>
      <div class="flex gap-8 items-center">
        ${isAdmin()?`<button class="btn btn-accent btn-sm" onclick="openWeekSlots('${weekDays[0]}','${weekDays[4]}')">📅 Открыть неделю</button>`:''}
        ${isErvin()?`<button class="btn btn-accent btn-sm" onclick="openAddErvinBooking()">+ Моя запись</button>`:''}
      </div>
    </div>
    <div class="cal-grid">
      <div class="cal-grid-head"></div>
      ${weekDays.map(d=>{const dt=new Date(d+'T12:00:00');const isToday=d===todayStr;return`<div class="cal-grid-head${isToday?' today':''}">
        <div style="font-size:11px">${DOW[dt.getDay()]}</div>
        <div class="cal-date">${dt.getDate()}</div>
        ${isAdmin()?`<div class="cal-head-actions"><button style="font-size:10px;padding:1px 6px;border:1px solid var(--border);border-radius:4px;background:white;cursor:pointer;color:var(--text-m)" onclick="openDaySlots('${d}')">+ День</button></div>`:''}
      </div>`;}).join('')}
      ${allTimes.map(t=>`
        <div class="cal-grid-time">${t}</div>
        ${weekDays.map(d=>`<div class="cal-grid-cell">${renderSlotCell(d,t)}</div>`).join('')}
      `).join('')}
    </div>
    <div style="display:flex;gap:16px;margin-top:14px;font-size:12px;color:var(--text-m);flex-wrap:wrap">
      <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:#d1fae5;display:inline-block"></span>Открытый слот</span>
      <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:#dbeafe;display:inline-block"></span>Занят пациентом</span>
      <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;border-radius:3px;background:#fde68a;display:inline-block"></span>Занят Ervin</span>
      ${isAdmin()?`<span style="display:flex;align-items:center;gap:5px"><span style="color:var(--accent);font-weight:700;font-size:16px">+</span>Добавить слот</span>`:''}
    </div>`;
}

async function addSlotAt(date,time){
  await db.from('available_slots').upsert({date,start_time:time,is_booked:false,booked_by:null},{onConflict:'date,start_time'});
  renderSlots();
}

async function openDaySlots(date){
  if(!confirm(`Открыть все слоты на ${fmt(date)}?`))return;
  const rows=FIXED_SLOTS.map(t=>({date,start_time:t,is_booked:false,booked_by:null}));
  await db.from('available_slots').upsert(rows,{onConflict:'date,start_time',ignoreDuplicates:true});
  renderSlots();
}

async function openWeekSlots(from,to){
  if(!confirm('Открыть все слоты на пн–пт этой недели?'))return;
  const rows=[];
  let d=new Date(from+'T12:00:00');
  const end=new Date(to+'T12:00:00');
  while(d<=end){
    const ds=d.toISOString().split('T')[0];
    FIXED_SLOTS.forEach(t=>rows.push({date:ds,start_time:t,is_booked:false,booked_by:null}));
    d.setDate(d.getDate()+1);
  }
  await db.from('available_slots').upsert(rows,{onConflict:'date,start_time',ignoreDuplicates:true});
  renderSlots();
}

async function removeSlot(id){
  await db.from('available_slots').delete().eq('id',id);
  renderSlots();
}

async function bookErvinAt(date,time,slotId){
  const note=prompt(`Запись Ervin на ${time} ${fmt(date)}\nПациент (необязательно):`);
  if(note===null)return;
  if(slotId){
    await db.from('available_slots').update({is_booked:true,booked_by:'ervin',ervin_note:note}).eq('id',slotId);
  } else {
    await db.from('available_slots').upsert({date,start_time:time,is_booked:true,booked_by:'ervin',ervin_note:note},{onConflict:'date,start_time'});
  }
  renderSlots();
}

async function unbookErvin(id){
  if(!confirm('Снять бронь Ervin?'))return;
  await db.from('available_slots').delete().eq('id',id);
  renderSlots();
}

async function openAddErvinBooking(){
  const date=prompt('Дата (ГГГГ-ММ-ДД):',today());
  if(!date)return;
  const time=prompt('Время (ЧЧ:ММ):','09:00');
  if(!time)return;
  const note=prompt('Пациент (необязательно):','');
  if(note===null)return;
  await db.from('available_slots').upsert({date,start_time:time,is_booked:true,booked_by:'ervin',ervin_note:note},{onConflict:'date,start_time'});
  renderSlots();
}

async function delSlot(id){await removeSlot(id);}
async function clearDaySlots(){
  const day=prompt('Введите дату для очистки (ГГГГ-ММ-ДД):');
  if(!day)return;
  await db.from('available_slots').delete().eq('date',day).eq('is_booked',false);
  toast('Слоты очищены');renderSlots();
}
// ═══ SLOTS ═══
async function addSlotAt(date,time){
  if(!confirm(`Добавить слот ${time} на ${fmt(date)}?`))return;
  await db.from('available_slots').upsert({date,start_time:time,is_booked:false},{onConflict:'date,start_time'});
  renderSlots();
}
async function delSlot(id){await db.from('available_slots').delete().eq('id',id);renderSlots();}
async function openAddSlots(){
  openModal(`<div class="modal">
    <div class="modal-header"><span class="modal-title">Добавить слоты</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group"><label>С даты</label><input type="date" id="sl-from" value="${today()}"></div>
        <div class="form-group"><label>По дату</label><input type="date" id="sl-to" value="${today()}"></div>
        <div class="form-group full"><label>Время (через запятую)</label><input id="sl-times" value="09:00,10:00,11:00,12:00,14:00,15:00,16:00"></div>
        <div class="form-group full"><label>Дни недели</label>
          <div class="flex gap-8" style="flex-wrap:wrap;margin-top:4px">
            ${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d,i)=>`<label style="display:flex;align-items:center;gap:4px;font-size:14px;cursor:pointer"><input type="checkbox" id="sl-d${i}" ${i<5?'checked':''} style="width:auto">${d}</label>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button><button class="btn btn-accent" onclick="bulkAddSlots()">Добавить</button></div>
  </div>`);
}
async function bulkAddSlots(){
  const from=new Date(v('sl-from')),to=new Date(v('sl-to'));
  const times=v('sl-times').split(',').map(t=>t.trim()).filter(Boolean);
  const days=[0,1,2,3,4,5,6].filter(i=>checked('sl-d'+i)).map(i=>i===6?0:i+1);
  const slots=[];
  for(let d=new Date(from);d<=to;d.setDate(d.getDate()+1)){
    if(days.includes(d.getDay())){
      const ds=d.toISOString().split('T')[0];
      times.forEach(t=>slots.push({date:ds,start_time:t,is_booked:false}));
    }
  }
  if(!slots.length){toast('Нет слотов','error');return;}
  await db.from('available_slots').upsert(slots,{onConflict:'date,start_time'});
  toast(`Добавлено ${slots.length} слотов`);closeModal();renderSlots();
}
