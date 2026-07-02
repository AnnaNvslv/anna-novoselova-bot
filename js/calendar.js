// ═══ CALENDAR ═══
let _calWeekOffset2 = 0;
let _calSettings = null;

const PX_PER_MIN = 1.1;
const CAL_START_H = 9;
const CAL_END_H   = 19;

const SLOT_DURATIONS = { primary: 60, short: 15, express: 30 };
const SLOT_COLORS = {
  primary: { bg: '#d1fae5', border: '#6ee7b7', text: '#065f46' },
  short:   { bg: '#fef3c7', border: '#fcd34d', text: '#92400e' },
  express: { bg: '#fce7f3', border: '#f9a8d4', text: '#9d174d' },
  patient: { bg: '#dbeafe', border: '#93c5fd', text: '#1e3a8a' },
  ervin:   { bg: '#fde68a', border: '#fbbf24', text: '#92400e' },
};

function tmToMin(tm){ const [h,m]=tm.split(':').map(Number); return h*60+m; }
function minToTm(m){ return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); }
function minToPx(m){ return (m - CAL_START_H*60) * PX_PER_MIN; }

function generateSlotTimes(s){
  const start=s.cal_start||'09:00', end=s.cal_end||'18:00';
  const dur=+(s.cal_duration||60), brk=+(s.cal_break||15), step=dur+brk;
  const startMin=tmToMin(start), endMin=tmToMin(end);
  const times=[];
  for(let m=startMin;m+dur<=endMin;m+=step) times.push(minToTm(m));
  return times;
}

async function loadCalSettings(){
  const{data}=await db.from('settings').select('key,value').in('key',['cal_start','cal_end','cal_duration','cal_break','cal_work_days']);
  const s={};(data||[]).forEach(r=>s[r.key]=r.value);
  _calSettings=s; return s;
}

// Popup for narrow slots: show name + action buttons
function cg2SlotPopup(e, opts){
  e.stopPropagation();
  const existing=document.getElementById('cg2-popup');
  if(existing) existing.remove();

  const btns=opts.buttons.map(b=>
    `<button onclick="document.getElementById('cg2-popup').remove();${b.fn}" style="border:none;border-radius:5px;padding:5px 12px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;background:${b.bg||'var(--surface2)'};color:${b.color||'var(--text)'}">${b.label}</button>`
  ).join('');

  const popup=document.createElement('div');
  popup.id='cg2-popup';
  popup.style.cssText='position:fixed;z-index:9999;background:white;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.18);padding:10px 12px;min-width:160px;';
  popup.innerHTML=`
    <div style="font-size:11px;font-weight:700;margin-bottom:7px;color:var(--text)">${opts.title}</div>
    <div style="display:flex;flex-direction:column;gap:5px">${btns}</div>`;

  document.body.appendChild(popup);

  // Position near click, keep inside viewport
  const vw=window.innerWidth, vh=window.innerHeight;
  const pw=170, ph=90;
  let left=e.clientX+8, top=e.clientY-10;
  if(left+pw>vw) left=e.clientX-pw-8;
  if(top+ph>vh) top=vh-ph-8;
  popup.style.left=left+'px';
  popup.style.top=top+'px';

  // Close on outside click
  setTimeout(()=>document.addEventListener('click',function cl(){popup.remove();document.removeEventListener('click',cl);},{once:true}),0);
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
  const calDur=+(s.cal_duration||60);

  const slotMap={};
  (slots||[]).forEach(sl=>{ slotMap[`${sl.date}|${sl.start_time?.substr(0,5)}`]=sl; });
  const apptMap={};
  (appts||[]).forEach(a=>{ apptMap[`${a.date}|${a.time?.substr(0,5)}`]=a; });

  const gridH=(CAL_END_H-CAL_START_H)*60*PX_PER_MIN;
  const nowMin=now.getHours()*60+now.getMinutes();

  let hourLabels='';
  for(let h=CAL_START_H;h<=CAL_END_H;h++){
    hourLabels+=`<div class="cg2-hour-label" style="top:${minToPx(h*60)}px">${String(h).padStart(2,'0')}:00</div>`;
  }
  let hourLines='';
  for(let h=CAL_START_H;h<=CAL_END_H;h++){
    hourLines+=`<div class="cg2-hline" style="top:${minToPx(h*60)}px"></div>`;
  }

  function lastName(n){ const p=(n||'').trim().split(/\s+/); return p.length>1?p[1]:p[0]||'—'; }

  let dayCols='';
  weekDays.forEach(d=>{
    const dt=new Date(d+'T12:00:00');
    const isToday=d===todayStr;
    const isWork=workDays.includes(dt.getDay());
    const events=[], seenTimes=new Set();

    (slots||[]).filter(sl=>sl.date===d).forEach(sl=>{
      const tm=sl.start_time?.substr(0,5); if(!tm)return;
      seenTimes.add(tm);
      const appt=apptMap[`${d}|${tm}`];
      const slotType=sl.slot_type||'primary';
      events.push({ tm, slot:sl, appt:appt||null, dur:SLOT_DURATIONS[slotType]||calDur, slotType });
    });
    (appts||[]).filter(a=>a.date===d).forEach(a=>{
      const tm=a.time?.substr(0,5); if(!tm||seenTimes.has(tm))return;
      events.push({ tm, slot:null, appt:a, dur:calDur, slotType:'primary' });
    });

    let evHTML='';
    events.forEach(({tm,slot,appt,dur,slotType})=>{
      const top=minToPx(tmToMin(tm));
      const height=Math.max(dur*PX_PER_MIN-2, 14);
      // Tall: >= 28px — show inline buttons. Narrow: < 28px — click to popup
      const isTall=height>=28;

      if(appt){
        const c=SLOT_COLORS.patient;
        const fullName=appt.patients?.name||'—';
        const sub=apptTypeName(appt.type||'')||appt.appointment_number||'';
        const canDel=isAdmin()||isErvin();
        if(isTall){
          const delB=canDel?`<button class="cg2-del" onclick="event.stopPropagation();removeSlotDirect('${slot?.id||''}','${appt.patient_id}')" title="Удалить">✕</button>`:'';
          evHTML+=`<div class="cg2-event" style="top:${top}px;height:${height}px;background:${c.bg};border-left:3px solid ${c.border};color:${c.text}" onclick="openPatientCard('${appt.patient_id}')">
            ${delB}
            <div class="cg2-ev-row"><span class="cg2-ev-time">${tm}</span><span class="cg2-ev-name">${height<44?lastName(fullName):fullName}</span></div>
            ${height>=44?`<div class="cg2-ev-sub">${sub}</div>`:''}
          </div>`;
        } else {
          // Narrow: single colored stripe, click → popup
          const popupBtns=[{label:'Открыть карту',fn:`openPatientCard('${appt.patient_id}')`,bg:'#dbeafe',color:'#1e3a8a'}];
          if(canDel) popupBtns.push({label:'Удалить запись',fn:`removeSlotDirect('${slot?.id||''}','${appt.patient_id}')`,bg:'#fee2e2',color:'#b91c1c'});
          const popupJson=JSON.stringify({title:`${tm} · ${fullName}`,buttons:popupBtns}).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
          evHTML+=`<div class="cg2-event cg2-event-narrow" style="top:${top}px;height:${height}px;background:${c.bg};border-left:3px solid ${c.border};color:${c.text}" onclick="cg2SlotPopup(event,${popupJson})">
            <span class="cg2-ev-time-nano">${tm}</span><span class="cg2-ev-nano-name">${lastName(fullName)}</span>
          </div>`;
        }
      } else if(slot&&slot.booked_by==='ervin'){
        const c=SLOT_COLORS.ervin;
        const can=isErvin()||isAdmin();
        const note=slot.ervin_note?` — ${slot.ervin_note}`:'';
        if(isTall){
          evHTML+=`<div class="cg2-event" style="top:${top}px;height:${height}px;background:${c.bg};border-left:3px solid ${c.border};color:${c.text}">
            ${can?`<button class="cg2-del" onclick="event.stopPropagation();unbookErvin('${slot.id}')" title="Отменить">✕</button>`:''}
            <div class="cg2-ev-row"><span class="cg2-ev-time">${tm}</span><span class="cg2-ev-name">Ervin${note}</span></div>
          </div>`;
        } else {
          const popupBtns=can?[{label:'Отменить бронь',fn:`unbookErvin('${slot.id}')`,bg:'#fee2e2',color:'#b91c1c'}]:[];
          const popupJson=JSON.stringify({title:`${tm} · Ervin${note}`,buttons:popupBtns}).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
          evHTML+=`<div class="cg2-event cg2-event-narrow" style="top:${top}px;height:${height}px;background:${c.bg};border-left:3px solid ${c.border};color:${c.text}" onclick="cg2SlotPopup(event,${popupJson})">
            <span class="cg2-ev-time-nano">${tm}</span><span class="cg2-ev-nano-name">Ervin${note}</span>
          </div>`;
        }
      } else if(slot&&!slot.is_booked){
        const c=SLOT_COLORS[slotType]||SLOT_COLORS.primary;
        const delFn=`removeSlotDirect('${slot.id}',null)`;
        const addFn=isAdmin()?`openAddAppointmentAtSlot('${d}','${tm}','${slot.id}')`:isErvin()?`bookErvinAt('${d}','${tm}','${slot.id}')`:null;
        if(isTall){
          evHTML+=`<div class="cg2-event cg2-event-free" style="top:${top}px;height:${height}px;background:${c.bg};border-left:3px solid ${c.border};color:${c.text}">
            ${isAdmin()?`<button class="cg2-del" onclick="event.stopPropagation();${delFn}" title="Удалить">✕</button>`:''}
            ${addFn?`<button class="cg2-add-btn${isErvin()&&!isAdmin()?' cg2-add-btn-ervin':''}" onclick="event.stopPropagation();${addFn}" title="Записать">✚</button>`:''}
            <div class="cg2-ev-row"><span class="cg2-ev-time">${tm}</span><span class="cg2-ev-name">✓ Свободно</span></div>
          </div>`;
        } else {
          const popupBtns=[];
          if(addFn) popupBtns.push({label:isErvin()&&!isAdmin()?'Zauzimi':'✚ Записать пациента',fn:addFn,bg:c.bg,color:c.text});
          if(isAdmin()) popupBtns.push({label:'Удалить слот',fn:delFn,bg:'#fee2e2',color:'#b91c1c'});
          const popupJson=JSON.stringify({title:`${tm} · Свободно`,buttons:popupBtns}).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
          evHTML+=`<div class="cg2-event cg2-event-narrow cg2-event-free" style="top:${top}px;height:${height}px;background:${c.bg};border-left:3px solid ${c.border};color:${c.text}" onclick="cg2SlotPopup(event,${popupJson})">
            <span class="cg2-ev-time-nano">${tm}</span><span class="cg2-ev-nano-name">✓</span>
          </div>`;
        }
      }
    });

    const nowLine=(isToday&&nowMin>=CAL_START_H*60&&nowMin<CAL_END_H*60)
      ?`<div class="cg2-now" style="top:${minToPx(nowMin)}px"></div>`:'';
    const clickH=(isAdmin()||isErvin())?`onclick="cg2ClickAdd(event,'${d}',${CAL_START_H})"`:'';;
    dayCols+=`<div class="cg2-day${isToday?' cg2-day-today':''}${!isWork?' cg2-day-nonwork':''}" ${clickH} style="height:${gridH}px">
      ${hourLines}${nowLine}${evHTML}
    </div>`;
  });

  let headerCols='<div class="cg2-th-time"></div>';
  weekDays.forEach(d=>{
    const dt=new Date(d+'T12:00:00');
    const isToday=d===todayStr;
    const isWork=workDays.includes(dt.getDay());
    headerCols+=`<div class="cg2-th${isToday?' cg2-th-today':''}${!isWork?' cg2-th-nonwork':''}">
      <span class="cg2-th-dow">${DOW[dt.getDay()]}</span>
      <span class="cg2-th-date">${dt.getDate()}</span>
      ${isAdmin()?`<button class="cg2-openday-btn" onclick="openDaySlots('${d}')">+ слоты</button>`:''}
    </div>`;
  });

  document.querySelector('.content').innerHTML=`
  <style>
    .cg2-wrap{overflow-x:auto;}
    .cg2-header{display:grid;grid-template-columns:44px repeat(7,1fr);background:white;border-bottom:2px solid var(--border);border-radius:10px 10px 0 0;min-width:580px;}
    .cg2-th-time{padding:8px 0;}
    .cg2-th{text-align:center;padding:8px 4px 6px;border-left:1px solid var(--border);display:flex;flex-direction:column;align-items:center;gap:2px;}
    .cg2-th-today{background:var(--accent-l);}
    .cg2-th-nonwork{opacity:.5;}
    .cg2-th-dow{font-size:10px;font-weight:600;color:var(--text-m);text-transform:uppercase;letter-spacing:.05em;}
    .cg2-th-date{font-size:20px;font-weight:800;color:var(--text);line-height:1.1;}
    .cg2-th-today .cg2-th-date{color:var(--accent);}
    .cg2-openday-btn{border:none;border-radius:4px;cursor:pointer;font-family:inherit;background:var(--accent);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;margin-top:2px;transition:background .12s;}
    .cg2-openday-btn:hover{background:#155a9c;}
    .cg2-body{display:grid;grid-template-columns:44px repeat(7,1fr);background:#e2e8f0;gap:1px;border-radius:0 0 10px 10px;min-width:580px;overflow:hidden;}
    .cg2-time-col{background:white;position:relative;}
    .cg2-hour-label{position:absolute;right:4px;transform:translateY(-50%);font-size:9px;font-weight:700;color:var(--text-l);white-space:nowrap;pointer-events:none;}
    .cg2-day{background:white;position:relative;}
    .cg2-day-nonwork{background:#f8f8f8;}
    .cg2-day-today{background:#fffdf5;}
    .cg2-hline{position:absolute;left:0;right:0;border-top:1px solid #e2e8f0;pointer-events:none;}
    .cg2-now{position:absolute;left:0;right:0;height:2px;background:#ef4444;pointer-events:none;z-index:5;}
    .cg2-now::before{content:'';position:absolute;left:-4px;top:-4px;width:10px;height:10px;border-radius:50%;background:#ef4444;}

    /* All events */
    .cg2-event{position:absolute;left:2px;right:2px;border-radius:4px;padding:2px 4px 2px 5px;font-size:11px;overflow:hidden;cursor:pointer;z-index:3;box-sizing:border-box;transition:filter .1s;}
    .cg2-event:hover{filter:brightness(.93);}
    .cg2-event-free{cursor:default;}

    /* Tall event (>=28px) internals */
    .cg2-ev-row{display:flex;align-items:baseline;gap:4px;overflow:hidden;}
    .cg2-ev-time{font-size:9px;font-weight:800;opacity:.7;white-space:nowrap;flex-shrink:0;}
    .cg2-ev-name{font-size:11px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .cg2-ev-sub{font-size:9px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px;}
    /* action buttons for tall events */
    .cg2-del{position:absolute;top:2px;right:2px;border:none;border-radius:3px;background:rgba(220,38,38,.2);color:#b91c1c;font-size:10px;width:16px;height:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;z-index:4;transition:background .12s;}
    .cg2-del:hover{background:rgba(220,38,38,.5);}
    .cg2-add-btn{position:absolute;bottom:2px;right:2px;border:none;border-radius:3px;background:rgba(0,0,0,.16);color:inherit;font-size:11px;width:18px;height:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;z-index:4;transition:background .12s;}
    .cg2-add-btn:hover{background:rgba(0,0,0,.32);}
    .cg2-add-btn-ervin{background:rgba(217,119,6,.2);color:#92400e;}

    /* Narrow event (<28px) — single line, NO buttons inside */
    .cg2-event-narrow{
      display:flex;align-items:center;gap:3px;
      padding:0 4px;cursor:pointer;
    }
    .cg2-ev-time-nano{font-size:8.5px;font-weight:800;opacity:.8;white-space:nowrap;flex-shrink:0;line-height:1;}
    .cg2-ev-nano-name{font-size:9.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;line-height:1;}

    @media(max-width:700px){
      .cg2-header,.cg2-body{grid-template-columns:36px repeat(7,1fr);}
      .cg2-th-date{font-size:15px;}
    }
  </style>
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
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
  <div class="cg2-wrap">
    <div class="cg2-header">${headerCols}</div>
    <div class="cg2-body">
      <div class="cg2-time-col" style="height:${gridH}px">${hourLabels}</div>
      ${dayCols}
    </div>
  </div>
  <div style="display:flex;gap:14px;margin-top:10px;font-size:11px;color:var(--text-m);flex-wrap:wrap;align-items:center">
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#d1fae5;border-left:3px solid #6ee7b7;display:inline-block"></span>Приём 60 мин</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#fef3c7;border-left:3px solid #fcd34d;display:inline-block"></span>15 мин</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#fce7f3;border-left:3px solid #f9a8d4;display:inline-block"></span>Экспресс 30 мин</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#dbeafe;border-left:3px solid #93c5fd;display:inline-block"></span>${t('patient')}</span>
    <span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#fde68a;border-left:3px solid #fbbf24;display:inline-block"></span>${t('slot_ervin')}</span>
    <span style="opacity:.6">· узкий слот — нажмите для действий</span>
    ${isAdmin()?`· <a href="#" onclick="nav('settings')" style="color:var(--accent);font-size:11px">${t('schedule_settings')}</a>`:''}
  </div>`;
}

function cg2ClickAdd(e, date, calStartH){
  if(e.target.closest('.cg2-event')) return;
  const col=e.currentTarget;
  const rect=col.getBoundingClientRect();
  const clickY=e.clientY-rect.top;
  const clickMin=Math.round(clickY/PX_PER_MIN/15)*15+calStartH*60;
  const tm=minToTm(Math.max(calStartH*60,Math.min((CAL_END_H*60)-15,clickMin)));
  if(isAdmin()) openAddSlotOrAppt(date,tm);
  else if(isErvin()) bookErvinAt(date,tm,'');
}

function openAddSlotOrAppt(date,tm){
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">Добавить — ${fmt(date)} ${tm}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-group"><label>Дата</label><input type="date" id="cas-date" value="${date}"></div>
      <div class="form-group" style="margin-top:8px"><label>Время</label><input type="time" id="cas-time" value="${tm}"></div>
      <div class="form-group" style="margin-top:8px"><label>Тип</label>
        <select id="cas-type">
          <option value="primary">Основной приём (60 мин)</option>
          <option value="short">15 мин (контроль / помощь)</option>
          <option value="express">Экспресс-диагностика (30 мин)</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Отмена</button>
      <button class="btn btn-accent" onclick="_casSave()">Добавить слот</button>
    </div>
  </div>`);
}
async function _casSave(){
  const date=document.getElementById('cas-date').value;
  const time=document.getElementById('cas-time').value;
  const slotType=document.getElementById('cas-type')?.value||'primary';
  if(!date||!time)return;
  await db.from('available_slots').upsert({date,start_time:time,is_booked:false,booked_by:null,slot_type:slotType},{onConflict:'date,start_time'});
  toast(t('slot_added'));closeModal();renderSlots();
}

async function removeSlotDirect(slotId,patientId){
  if(patientId){
    if(!confirm('Удалить запись (слот останется свободным)?'))return;
    if(slotId) await db.from('available_slots').update({is_booked:false,booked_by:null}).eq('id',slotId);
    toast('Используй карту пациента для отмены записи','info');
    renderSlots();return;
  }
  if(!confirm('Удалить слот?'))return;
  await db.from('available_slots').delete().eq('id',slotId);
  renderSlots();
}

async function addSlotAt(date,time){ openAddSlotOrAppt(date,time); }

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
          <option value="express">Экспресс-диагностика (30 мин)</option>
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
          <option value="express">Экспресс-диагностика (30 мин)</option>
        </select>
      </div>
      <div class="form-group" style="margin-top:12px"><label>Время (каждый слот на новой строке)</label>
        <textarea id="ds-times" style="min-height:160px;font-family:monospace;font-size:14px">${times.join('\n')}</textarea>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Отмена</button><button class="btn btn-accent" onclick="saveDaySlots()">Otvori</button></div>
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

function openAddCustomSlot(){ openAddSlotOrAppt(today(),'09:00'); }
async function saveCustomSlot(){
  const date=document.getElementById('cas-date')?.value;
  const time=document.getElementById('cas-time')?.value;
  const slotType=document.getElementById('cas-type')?.value||'primary';
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
  const date=document.getElementById('erv-date').value,time=document.getElementById('erv-time').value;
  const note=document.getElementById('erv-note2').value.trim();
  if(!date||!time)return;
  await db.from('available_slots').upsert({date,start_time:time,is_booked:true,booked_by:'ervin',ervin_note:note},{onConflict:'date,start_time'});
  toast(t('booking_added'));closeModal();renderSlots();
}

async function delSlot(id){await removeSlot(id);}
function openRemoveSlotDialog(){}
