// ═══ DASHBOARD ═══
async function renderDashboard() {
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>Главная</h1><div class="topbar-actions"><button class="btn btn-ghost btn-sm" onclick="openAddAppointment()">+ Приём</button>${isAdmin()?`<button class="btn btn-ghost btn-sm" onclick="openAddOrder()">+ Заказ</button>`:''}<button class="btn btn-accent btn-sm" onclick="openAddPatient()">+ Пациент</button></div></div><div class="content"><div class="spinner">Загрузка...</div></div>`;
  const todayStr=today();
  const[{data:patients},{data:todayAppts},{data:readyOrders},{data:upcoming},{data:todayOrders}]=await Promise.all([
    db.from('patients').select('id',{count:'exact'}),
    db.from('appointments').select('*, patients(name,telegram_chat_id)').eq('date',todayStr).neq('status','отменён').order('time'),
    db.from('orders').select('*, patients(name,telegram_chat_id)').eq('status','готов'),
    db.from('appointments').select('*, patients(name)').gt('date',todayStr).eq('status','запланирован').order('date').order('time').limit(5),
    db.from('orders').select('id').eq('status','оформлен').gte('created_at',todayStr),
  ]);
  const nowMonth=todayStr.substr(0,7);
  const{data:monthRevOrders}=await db.from('orders').select('frame_price,lens_price,work_price').eq('status','выдан').gte('created_at',nowMonth+'-01');
  const monthRev=(monthRevOrders||[]).reduce((s,o)=>s+orderTotal(o),0);
  document.getElementById('content').innerHTML=`
<div class="topbar"><h1>Главная</h1><div class="topbar-actions"><button class="btn btn-ghost btn-sm" onclick="openAddAppointment()">+ Приём</button>${isAdmin()?`<button class="btn btn-ghost btn-sm" onclick="openAddOrder()">+ Заказ</button>`:''}<button class="btn btn-accent btn-sm" onclick="openAddPatient()">+ Пациент</button></div></div>
<div class="content">
  <div class="stats-grid">
    <div class="stat-card stat-primary"><div class="stat-label">Приёмов сегодня</div><div class="stat-value">${(todayAppts||[]).length}</div><div class="stat-sub">запланировано</div></div>
    <div class="stat-card stat-accent"><div class="stat-label">Заказов сегодня</div><div class="stat-value">${(todayOrders||[]).length}</div><div class="stat-sub">оформлено</div></div>
    <div class="stat-card"><div class="stat-label">Готовы к выдаче</div><div class="stat-value" style="color:var(--warn)">${(readyOrders||[]).length}</div><div class="stat-sub">ждут пациента</div></div>
    <div class="stat-card stat-green"><div class="stat-label">Выручка / месяц</div><div class="stat-value">${monthRev.toLocaleString('ru-RU')}</div><div class="stat-sub">дин.</div></div>
    <div class="stat-card"><div class="stat-label">Всего пациентов</div><div class="stat-value">${(patients||[]).length}</div><div class="stat-sub">в базе</div></div>
  </div>
  <div class="two-col">
    <div class="card">
      <div class="card-header"><span class="card-title">📅 Сегодня</span><button class="btn btn-ghost btn-sm" onclick="nav('appointments')">Все приёмы</button></div>
      ${(todayAppts||[]).length?(todayAppts||[]).map(a=>`<div class="history-item">
        <div class="history-dot"></div>
        <div style="flex:1">
          <div class="history-date">${a.time?.substr(0,5)} · ${a.type||'Приём'}</div>
          <div class="history-title" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard('${a.patient_id}')">${a.patients?.name||'—'}</div>
        </div>
        <div class="flex gap-8">
          ${a.status==='запланирован'?`<button class="btn btn-primary btn-sm" onclick="openExamForm('${a.id}','${a.patient_id}')">📋 Карта</button><button class="btn btn-success btn-sm" onclick="completeAppt('${a.id}')">✓</button>`:'<span class="badge badge-green">Завершён</span>'}
        </div>
      </div>`).join(''):`<div class="empty"><p>Приёмов нет</p></div>`}
    </div>
    <div>
      ${(readyOrders||[]).length?`<div class="card mb-12">
        <div class="card-header"><span class="card-title">✅ Готовы к выдаче</span><span class="badge badge-warn">${(readyOrders||[]).length}</span></div>
        ${(readyOrders||[]).map(o=>`<div class="history-item">
          <div style="flex:1">
            <div class="history-date">${o.type} · обещано ${fmt(o.promised_date)}</div>
            <div class="history-title" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard('${o.patient_id}')">${o.patients?.name||'—'}</div>
            ${orderBalance(o)>0?`<div class="text-sm" style="color:var(--warn)">Остаток: ${fmtMoney(orderBalance(o))}</div>`:''}
          </div>
          <div class="flex gap-8">
            ${o.patients?.telegram_chat_id?`<button class="btn btn-ghost btn-sm" onclick="notifyOrderReady('${o.id}')">📨</button>`:''}
            <button class="btn btn-accent btn-sm" onclick="issueOrder('${o.id}')">Выдать</button>
          </div>
        </div>`).join('')}
      </div>`:''}
      <div class="card">
        <div class="card-header"><span class="card-title">🔜 Ближайшие приёмы</span></div>
        ${(upcoming||[]).length?(upcoming||[]).map(a=>`<div class="history-item">
          <div class="history-dot" style="background:var(--warn-l);border-color:var(--warn)"></div>
          <div><div class="history-date">${fmt(a.date)} в ${a.time?.substr(0,5)}</div><div class="history-title">${a.patients?.name||'—'}</div><div class="text-sm text-m">${a.type||'Приём'}</div></div>
        </div>`).join(''):`<div class="text-sm text-m" style="padding:10px 0">Нет запланированных</div>`}
      </div>
    </div>
  </div>
</div>`;
}
