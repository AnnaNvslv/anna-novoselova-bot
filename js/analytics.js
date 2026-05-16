// ═══ ANALYTICS ═══
async function renderAnalytics() {
  if(!isAdmin()){document.getElementById('content').innerHTML=`<div class="topbar"><h1>Аналитика</h1></div><div class="content"><div class="empty"><p>Только для администратора</p></div></div>`;return;}
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>Аналитика</h1></div><div class="content"><div class="spinner">Загрузка...</div></div>`;
  const nowMonth=today().substr(0,7);
  const[{data:allOrders},{data:patients},{data:monthAppts}]=await Promise.all([
    db.from('orders').select('*'),
    db.from('patients').select('id'),
    db.from('appointments').select('consultation_price,status').gte('created_at',nowMonth+'-01').lte('created_at',nowMonth+'-31T23:59:59')
  ]);
  const orders=allOrders||[];
  const issued=orders.filter(o=>o.status==='выдан');
  const salaryOrders=orders.filter(o=>o.counts_for_salary&&(o.created_at||'').substr(0,7)===nowMonth);
  const salaryFromOrders=salaryOrders.reduce((s,o)=>s+orderTotal(o),0)*0.10;
  const salaryFromAppts=(monthAppts||[]).reduce((s,a)=>s+(+a.consultation_price||0),0);
  const totalSalary=Math.round(salaryFromOrders)+salaryFromAppts;
  const monthRev=issued.filter(o=>(o.created_at||'').substr(0,7)===nowMonth).reduce((s,o)=>s+orderTotal(o),0);
  const avgCheck=issued.length?Math.round(issued.reduce((s,o)=>s+orderTotal(o),0)/issued.length):0;
  document.querySelector('.content').innerHTML=`
    <div class="stats-grid">
      <div class="stat-card stat-green"><div class="stat-label">Выручка / месяц</div><div class="stat-value">${monthRev.toLocaleString('ru-RU')}</div><div class="stat-sub">дин. (выданные заказы)</div></div>
      <div class="stat-card stat-accent"><div class="stat-label">Средний чек</div><div class="stat-value">${avgCheck.toLocaleString('ru-RU')}</div><div class="stat-sub">дин.</div></div>
      <div class="stat-card"><div class="stat-label">Всего пациентов</div><div class="stat-value">${(patients||[]).length}</div><div class="stat-sub"></div></div>
      <div class="stat-card"><div class="stat-label">Всего заказов</div><div class="stat-value">${orders.length}</div><div class="stat-sub"></div></div>
      <div class="stat-card" style="background:var(--primary);color:#fff"><div class="stat-label" style="color:rgba(255,255,255,.6)">Моя зарплата / месяц</div><div class="stat-value" style="color:#fff">${totalSalary.toLocaleString('ru-RU')}</div><div class="stat-sub" style="color:rgba(255,255,255,.5)">дин.</div></div>
    </div>
    <div class="two-col">
      <div class="card">
        <div class="card-header"><span class="card-title">💰 Расчёт зарплаты (текущий месяц)</span></div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="flex justify-between"><span class="text-m">Стоимость приёмов (3000 дин. × ${(monthAppts||[]).length}):</span><span class="fw-6">${fmtMoney(salaryFromAppts)}</span></div>
          <div class="flex justify-between"><span class="text-m">Заказы пациентов ≥10 000 дин. (×${salaryOrders.length}):</span><span class="fw-6">${fmtMoney(salaryOrders.reduce((s,o)=>s+orderTotal(o),0))}</span></div>
          <div class="flex justify-between"><span class="text-m">10% от суммы заказов:</span><span class="fw-6">${fmtMoney(Math.round(salaryFromOrders))}</span></div>
          <div class="divider"></div>
          <div class="flex justify-between fw-7"><span>Итого к зарплате:</span><span style="color:var(--green)">${fmtMoney(totalSalary)}</span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Заказы по статусам</span></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${ORDER_STATUSES_ALL.map(st=>`<div class="flex justify-between"><span class="text-m">${st}</span><span class="fw-6">${orders.filter(o=>o.status===st).length}</span></div>`).join('')}
        </div>
      </div>
    </div>`;
}
