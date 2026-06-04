// ═══ ANALYTICS ═══

// State for period navigation
let _analyticsPeriod = 'month'; // 'month' | 'week'
let _analyticsOffset = 0;       // 0 = current, -1 = previous, etc.

function _getPeriodBounds() {
  const now = new Date(today());
  if (_analyticsPeriod === 'month') {
    const base = new Date(now.getFullYear(), now.getMonth() + _analyticsOffset, 1);
    const next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    return {
      start: base.toISOString().split('T')[0],
      end: next.toISOString().split('T')[0],
      label: _monthLabel(base)
    };
  } else {
    // Week: Mon–Sun
    const base = new Date(now);
    const day = base.getDay(); // 0=Sun
    const diffToMon = (day === 0 ? -6 : 1 - day);
    base.setDate(base.getDate() + diffToMon + _analyticsOffset * 7);
    const mon = new Date(base);
    const sun = new Date(base); sun.setDate(mon.getDate() + 6);
    const afterSun = new Date(sun); afterSun.setDate(sun.getDate() + 1);
    return {
      start: mon.toISOString().split('T')[0],
      end: afterSun.toISOString().split('T')[0],
      label: _weekLabel(mon, sun)
    };
  }
}

function _monthLabel(date) {
  const months = t('months');
  return months[date.getMonth()] + ' ' + date.getFullYear();
}

function _weekLabel(mon, sun) {
  const fmt2 = d => String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0');
  return fmt2(mon) + ' – ' + fmt2(sun) + '.' + sun.getFullYear();
}

// Вернуть дату заказа для фильтрации по периоду
function _orderDate(o) {
  return o.issued_date || o.order_date || (o.created_at ? o.created_at.split('T')[0] : '');
}

async function renderAnalytics() {
  if (!isAdmin()) {
    document.getElementById('content').innerHTML = `<div class="topbar"><h1>${t('analytics')}</h1></div><div class="content"><div class="empty"><p>${t('admin_only')}</p></div></div>`;
    return;
  }
  const loc = _lang === 'sr' ? 'sr-RS' : 'ru-RU';
  document.getElementById('content').innerHTML = `<div class="topbar"><h1>${t('analytics')}</h1></div><div class="content"><div class="spinner">${t('loading')}</div></div>`;

  const { start: periodStart, end: periodEnd, label: periodLabel } = _getPeriodBounds();

  const [{ data: allOrders }, { data: allPatients }, { data: periodAppts }] = await Promise.all([
    // Все активные заказы — фильтрация по дате на стороне JS
    db.from('orders').select('*').is('deleted_at', null),
    // Все активные пациенты — фильтрация по дате на стороне JS
    db.from('patients').select('id,created_at').is('deleted_at', null),
    // Только ЗАВЕРШЁННЫЕ приёмы с заполненной стоимостью за период
    db.from('appointments').select('consultation_price,status,date')
      .gte('date', periodStart).lt('date', periodEnd)
      .eq('status', 'завершён')
      .gt('consultation_price', 0)
      .is('deleted_at', null)
  ]);

  // Заказы за период (по дате заказа)
  const periodOrders = (allOrders || []).filter(o => {
    const d = _orderDate(o);
    return d >= periodStart && d < periodEnd;
  });

  // Пациенты, добавленные за период
  const periodPatients = (allPatients || []).filter(p => {
    const d = p.created_at ? p.created_at.split('T')[0] : '';
    return d >= periodStart && d < periodEnd;
  });

  // Выручка — выданные заказы за период
  const issuedPeriod = periodOrders.filter(o => o.status === 'выдан');
  const periodRev = issuedPeriod.reduce((s, o) => s + orderTotal(o), 0);

  // Средний чек — по выданным за период
  const avgCheck = issuedPeriod.length
    ? Math.round(issuedPeriod.reduce((s, o) => s + orderTotal(o), 0) / issuedPeriod.length)
    : 0;

  // Зарплата: завершённые приёмы (consultation_price > 0) + 10% от заказов counts_for_salary за период
  const salaryOrders = periodOrders.filter(o => o.counts_for_salary);
  const salaryFromOrders = salaryOrders.reduce((s, o) => s + orderTotal(o), 0) * 0.10;
  const salaryFromAppts = (periodAppts || []).reduce((s, a) => s + (+a.consultation_price || 0), 0);
  const totalSalary = Math.round(salaryFromOrders) + salaryFromAppts;

  const apptCount = (periodAppts || []).length;
  const isCurrentPeriod = _analyticsOffset === 0;

  document.querySelector('.content').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
      <div class="seg-control" style="display:flex;border:1.5px solid var(--border);border-radius:8px;overflow:hidden;">
        <button onclick="window._analyticsSetPeriod('month')" id="seg-month"
          style="padding:6px 16px;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:all .15s;
          background:${_analyticsPeriod==='month'?'var(--primary)':'transparent'};
          color:${_analyticsPeriod==='month'?'#fff':'var(--text-secondary)'};">
          ${t('period_month')}
        </button>
        <button onclick="window._analyticsSetPeriod('week')" id="seg-week"
          style="padding:6px 16px;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:all .15s;
          background:${_analyticsPeriod==='week'?'var(--primary)':'transparent'};
          color:${_analyticsPeriod==='week'?'#fff':'var(--text-secondary)'};">
          ${t('period_week')}
        </button>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <button onclick="window._analyticsNav(-1)" style="padding:5px 10px;font-size:16px;border:1.5px solid var(--border);border-radius:6px;background:transparent;cursor:pointer;color:var(--text)">&#8249;</button>
        <span style="font-size:14px;font-weight:600;min-width:140px;text-align:center;color:var(--text)">${periodLabel}</span>
        <button onclick="window._analyticsNav(1)" ${isCurrentPeriod?'disabled':''} style="padding:5px 10px;font-size:16px;border:1.5px solid var(--border);border-radius:6px;background:transparent;cursor:pointer;color:var(--text);opacity:${isCurrentPeriod?.3:1}">&#8250;</button>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card stat-green"><div class="stat-label">${t('revenue')}</div><div class="stat-value">${periodRev.toLocaleString(loc)}</div><div class="stat-sub">${t('currency_din')} (${t('issued_orders')})</div></div>
      <div class="stat-card stat-accent"><div class="stat-label">${t('avg_check')}</div><div class="stat-value">${avgCheck.toLocaleString(loc)}</div><div class="stat-sub">${t('currency_din')}</div></div>
      <div class="stat-card"><div class="stat-label">${t('total_patients')}</div><div class="stat-value">${periodPatients.length}</div><div class="stat-sub">${t('added_period')}</div></div>
      <div class="stat-card"><div class="stat-label">${t('total_orders')}</div><div class="stat-value">${periodOrders.length}</div><div class="stat-sub">${t('added_period')}</div></div>
      <div class="stat-card" style="background:var(--primary);color:#fff"><div class="stat-label" style="color:rgba(255,255,255,.6)">${t('my_salary')}</div><div class="stat-value" style="color:#fff">${totalSalary.toLocaleString(loc)}</div><div class="stat-sub" style="color:rgba(255,255,255,.5)">${t('currency_din')}</div></div>
    </div>
    <div class="two-col">
      <div class="card">
        <div class="card-header"><span class="card-title">💰 ${t('salary_calc')}</span></div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div class="flex justify-between"><span class="text-m">${t('appt_cost_salary').replace('%s', apptCount)}</span><span class="fw-6">${fmtMoney(salaryFromAppts)}</span></div>
          <div class="flex justify-between"><span class="text-m">${t('orders_over').replace('%s', salaryOrders.length)}</span><span class="fw-6">${fmtMoney(salaryOrders.reduce((s, o) => s + orderTotal(o), 0))}</span></div>
          <div class="flex justify-between"><span class="text-m">${t('ten_percent')}</span><span class="fw-6">${fmtMoney(Math.round(salaryFromOrders))}</span></div>
          <div class="divider"></div>
          <div class="flex justify-between fw-7"><span>${t('salary_total')}</span><span style="color:var(--green)">${fmtMoney(totalSalary)}</span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">${t('orders_by_status')}</span></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${ORDER_STATUSES_ALL.map(st => `<div class="flex justify-between"><span class="text-m">${statusLabel(st)}</span><span class="fw-6">${periodOrders.filter(o => o.status === st).length}</span></div>`).join('')}
        </div>
      </div>
    </div>`;
}

window._analyticsSetPeriod = function(p) {
  _analyticsPeriod = p;
  _analyticsOffset = 0;
  renderAnalytics();
};

window._analyticsNav = function(dir) {
  _analyticsOffset += dir;
  if (_analyticsOffset > 0) _analyticsOffset = 0;
  renderAnalytics();
};
