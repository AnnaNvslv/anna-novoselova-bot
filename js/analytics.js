// ═══ ANALYTICS ═══
async function renderAnalytics() {
  if(!isAdmin()){document.getElementById('content').innerHTML=`<div class="topbar"><h1>${t('analytics')}</h1></div><div class="content"><div class="empty"><p>${t('admin_only')}</p></div></div>`;return;}
  const loc=_lang==='sr'?'sr-RS':'ru-RU';
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>${t('analytics')}</h1></div><div class="content"><div class="spinner">${t('loading')}</div></div>`;
  const nowMonth=today().substr(0,7);
  const monthStart=nowMonth+'-01';
  // Следующий месяц для границы
  const nextMonthDate=new Date(monthStart); nextMonthDate.setMonth(nextMonthDate.getMonth()+1);
  const monthEnd=nextMonthDate.toISOString().split('T')[0];

  const[{data:allOrders},{data:patients},{data:monthAppts}]=await Promise.all([
    // Заказы без удалённых
    db.from('orders').select('*').is('deleted_at',null),
    db.from('patients').select('id').is('deleted_at',null),
    // Зарплата по приёмам: фильтр по ДАТЕ приёма (date), а не created_at
    db.from('appointments').select('consultation_price,status,date')
      .gte('date',monthStart).lt('date',monthEnd).neq('status','отменён').is('deleted_at',null)
  ]);
  const orders=allOrders||[];
  const issued=orders.filter(o=>o.status==='выдан');
  // Выручка за месяц — по issued_date (дата выдачи), а не created_at
  const monthRev=issued.filter(o=>{
    const d=o.issued_date||o.created_at?.split('T')[0]||'';
    return d>=monthStart && d<monthEnd;
  }).reduce((s,o)=>s+orderTotal(o),0);
  const salaryOrders=orders.filter(o=>o.counts_for_salary&&(()=>{
    const d=o.issued_date||o.order_date||o.created_at?.split('T')[0]||'';
    return d>=monthStart && d<monthEnd;
  })());
  const salaryFromOrders=salaryOrders.reduce((s,o)=>s+orderTotal(o),0)*0.10;
  const salaryFromAppts=(monthAppts||[]).reduce((s,a)=>s+(+a.consultation_price||0),0);
  const totalSalary=Math.round(salaryFromOrders)+salaryFromAppts;
  const avgCheck=issued.length?Math.round(issued.reduce((s,o)=>s+orderTotal(o),0)/issued.length):0;
  const apptCount=(monthAppts||[]).length;
  document.querySelector('.content').innerHTML=`
    <div class="stats-grid">
      <div class="stat-card stat-green"><div class="stat-label">${t('revenue')}</div><div class="stat-value">${monthRev.toLocaleString(loc)}</div><div class="stat-sub">${t('currency_din')} (${t('issued_orders')})</div></div>
      <div class="stat-card stat-accent"><div class="stat-label">${t('avg_check')}</div><div class="stat-value">${avgCheck.toLocaleString(loc)}</div><div class="stat-sub">${t('currency_din')}</div></div>
      <div class="stat-card"><div class="stat-label">${t('total_patients')}</div><div class="stat-value">${(patients||[]).length}</div><div class="stat-sub"></div></div>
      <div class="stat-card"><div class="stat-label">${t('total_orders')}</div><div class="stat-value">${orders.length}</div><div class="stat-sub"></div></div>
      <div class="stat-card" style="background:var(--primary);color:#fff"><div class="stat-label" style="color:rgba(255,255,255,.6)">${t('my_salary')}</div><div class="stat-value" style="color:#fff">${totalSalary.toLocaleString(loc)}</div><div class="stat-sub" style="color:rgba(255,255,255,.5)">${t('currency_din')}</div></div>
    </div>
    <div class="two-col">
      <div class="card">
        <div class="card-header"><span class="card-title">💰 ${t('salary_calc')}</span></div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="flex justify-between"><span class="text-m">${t('appt_cost_salary').replace('%s',apptCount)}</span><span class="fw-6">${fmtMoney(salaryFromAppts)}</span></div>
          <div class="flex justify-between"><span class="text-m">${t('orders_over').replace('%s',salaryOrders.length)}</span><span class="fw-6">${fmtMoney(salaryOrders.reduce((s,o)=>s+orderTotal(o),0))}</span></div>
          <div class="flex justify-between"><span class="text-m">${t('ten_percent')}</span><span class="fw-6">${fmtMoney(Math.round(salaryFromOrders))}</span></div>
          <div class="divider"></div>
          <div class="flex justify-between fw-7"><span>${t('salary_total')}</span><span style="color:var(--green)">${fmtMoney(totalSalary)}</span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">${t('orders_by_status')}</span></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${ORDER_STATUSES_ALL.map(st=>`<div class="flex justify-between"><span class="text-m">${statusLabel(st)}</span><span class="fw-6">${orders.filter(o=>o.status===st).length}</span></div>`).join('')}
        </div>
      </div>
    </div>`;
}
