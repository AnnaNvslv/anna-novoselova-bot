// ═══ DASHBOARD ═══
async function renderDashboard() {
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>${t('nav_dashboard')}</h1><div class="topbar-actions"><button class="btn btn-ghost btn-sm" onclick="openAddAppointment()">+ Pregled</button>${isAdmin()?`<button class="btn btn-ghost btn-sm" onclick="openAddOrder()">+ Porudžbina</button>`:''}<button class="btn btn-accent btn-sm" onclick="openAddPatient()">+ ${t('patient')||'Pacijent'}</button></div></div><div class="content"><div class="spinner">${t('loading')}</div></div>`;
  const todayStr=today();
  const[{data:patients},{data:todayAppts},{data:readyOrders},{data:upcoming},{data:todayOrders},{data:todaySlots}]=await Promise.all([
    db.from('patients').select('id',{count:'exact'}).is('deleted_at',null),
    db.from('appointments').select('*, patients(name,telegram_chat_id)').eq('date',todayStr).neq('status','отменён').is('deleted_at',null).order('time'),
    db.from('orders').select('*, patients(name,telegram_chat_id)').eq('status','готов').is('deleted_at',null),
    db.from('appointments').select('*, patients(name)').gt('date',todayStr).eq('status','запланирован').is('deleted_at',null).order('date').order('time').limit(6),
    db.from('orders').select('id').eq('status','оформлен').gte('created_at',todayStr),
    db.from('available_slots').select('*').eq('date',todayStr).order('start_time'),
  ]);
  const nowMonth=todayStr.substr(0,7);
  const monthStart=nowMonth+'-01';
  const nextMonthDate=new Date(monthStart); nextMonthDate.setMonth(nextMonthDate.getMonth()+1);
  const monthEnd=nextMonthDate.toISOString().split('T')[0];
  const{data:monthRevOrders}=await db.from('orders').select('frame_price,lens_price,lens_qty,work_price,issued_date,created_at')
    .eq('status','выдан').gte('issued_date',monthStart).lt('issued_date',monthEnd);
  const monthRev=(monthRevOrders||[]).reduce((s,o)=>s+orderTotal(o),0);

  const apptByTime={};
  (todayAppts||[]).forEach(a=>{apptByTime[a.time?.substr(0,5)]=a;});
  const slotByTime={};
  (todaySlots||[]).forEach(s=>{slotByTime[s.start_time?.substr(0,5)]=s;});
  const allTimes=[...new Set([...Object.keys(slotByTime),...Object.keys(apptByTime)])].sort();

  const todayGridHtml = allTimes.length ? allTimes.map(tm=>{
    const appt=apptByTime[tm];
    const slot=slotByTime[tm];
    if(appt){
      return`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:#dbeafe;margin-bottom:6px;cursor:pointer" onclick="openPatientCard('${appt.patient_id}')">
        <div style="font-size:13px;font-weight:700;color:#1e3a8a;min-width:42px;flex-shrink:0">${tm}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:700;color:#1e3a8a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${appt.patients?.name?.split(' ')[0]||'—'}</div>
          <div style="font-size:11.5px;color:#3b5dbf;opacity:.8">${apptTypeName(appt.type||'').split('(')[0]?.trim()||''}</div>
        </div>
        <span style="font-size:11px;background:#1e3a8a;color:#fff;padding:2px 8px;border-radius:10px;flex-shrink:0">${statusLabel(appt.status)}</span>
      </div>`;
    }
    if(slot&&!slot.is_booked){
      return`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:#d1fae5;margin-bottom:6px">
        <div style="font-size:13px;font-weight:700;color:#065f46;min-width:42px;flex-shrink:0">${tm}</div>
        <div style="font-size:13px;color:#065f46">Slobodan termin</div>
      </div>`;
    }
    if(slot&&slot.booked_by==='ervin'){
      return`<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:#fde68a;margin-bottom:6px">
        <div style="font-size:13px;font-weight:700;color:#92400e;min-width:42px;flex-shrink:0">${tm}</div>
        <div style="font-size:13px;color:#92400e">Ervin${slot.ervin_note?' — '+slot.ervin_note:''}</div>
      </div>`;
    }
    return'';
  }).join('') : `<div style="text-align:center;color:var(--text-m);padding:20px;font-size:14px">${t('no_appts')||'Nema pregleda ni termina'}</div>`;

  document.getElementById('content').innerHTML=`
<div class="topbar"><h1>${t('nav_dashboard')}</h1><div class="topbar-actions"><button class="btn btn-ghost btn-sm" onclick="openAddAppointment()">+ Pregled</button>${isAdmin()?`<button class="btn btn-ghost btn-sm" onclick="openAddOrder()">+ Porudžbina</button>`:''}<button class="btn btn-accent btn-sm" onclick="openAddPatient()">+ ${t('patient')||'Pacijent'}</button></div></div>
<div class="content">
  <div class="stats-grid">
    <div class="stat-card stat-primary"><div class="stat-label">${t('appts_today')}</div><div class="stat-value">${(todayAppts||[]).length}</div><div class="stat-sub">${t('planned')}</div></div>
    <div class="stat-card stat-accent"><div class="stat-label">${t('orders_today')}</div><div class="stat-value">${(todayOrders||[]).length}</div><div class="stat-sub">${t('order_status_new')||'kreirana'}</div></div>
    <div class="stat-card"><div class="stat-label">${t('ready_for_issue')}</div><div class="stat-value" style="color:var(--warn)">${(readyOrders||[]).length}</div><div class="stat-sub">${t('waiting')}</div></div>
    <div class="stat-card stat-green"><div class="stat-label">${t('revenue_month')}</div><div class="stat-value">${monthRev.toLocaleString('ru-RU')}</div><div class="stat-sub">din.</div></div>
    <div class="stat-card"><div class="stat-label">${t('total_patients')}</div><div class="stat-value">${(patients||[]).length}</div><div class="stat-sub">${t('in_base')}</div></div>
  </div>
  <div class="two-col">
    <div class="card">
      <div class="card-header">
        <span class="card-title">📅 ${t('today_section')} — ${fmtDateLong(todayStr)}</span>
        <button class="btn btn-ghost btn-sm" onclick="nav('appointments')">${t('all_appts')}</button>
      </div>
      ${todayGridHtml}
    </div>
    <div>
      ${(readyOrders||[]).length?`<div class="card mb-12">
        <div class="card-header"><span class="card-title">✅ ${t('ready_for_issue')}</span><span class="badge badge-warn">${(readyOrders||[]).length}</span></div>
        ${(readyOrders||[]).map(o=>`<div class="history-item">
          <div style="flex:1;min-width:0">
            <div class="history-date">${o.type}${o.promised_date?' · '+fmt(o.promised_date):''}</div>
            <div class="history-title" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard('${o.patient_id}')">${o.patients?.name||'—'}</div>
            ${orderBalance(o)>0?`<div class="text-sm" style="color:var(--warn)">${t('balance')||'Ostatak'}: ${fmtMoney(orderBalance(o))}</div>`:''}
          </div>
          <div class="history-actions">
            ${o.patients?.telegram_chat_id?`<button class="btn btn-ghost btn-sm" onclick="notifyOrderReady('${o.id}')">📨</button>`:''}
            <button class="btn btn-accent btn-sm" onclick="issueOrder('${o.id}')">${t('issue')||'Preuzmi'}</button>
          </div>
        </div>`).join('')}
      </div>`:''}
      <div class="card">
        <div class="card-header"><span class="card-title">🔜 ${t('upcoming')}</span></div>
        ${(upcoming||[]).length?(upcoming||[]).map(a=>`<div class="history-item">
          <div class="history-dot" style="background:var(--warn-l);border-color:var(--warn)"></div>
          <div style="flex:1;min-width:0">
            <div class="history-date">${fmt(a.date)} · ${a.time?.substr(0,5)}</div>
            <div class="history-title" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard('${a.patient_id}')">${a.patients?.name||'—'}</div>
            <div class="text-sm text-m">${apptTypeName(a.type||'')}</div>
          </div>
        </div>`).join(''):`<div class="text-sm text-m" style="padding:10px 0">${t('no_planned')}</div>`}
      </div>
    </div>
  </div>
</div>`;
}
