// ═══ BUDGET ANALYTICS ═══
function renderSummaryBar(income, expenses, savings, month) {
  const totalIncome = income.reduce((s, i) => s + (+i.amount_din || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (+e.amount_din || 0), 0);
  const paidExpenses = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + (+e.amount_din || 0), 0);
  const reservedExpenses = expenses.filter(e => e.status === 'reserved').reduce((s, e) => s + (+e.amount_din || 0), 0);
  const monthSavings = savings.filter(s => s.action === 'add').reduce((s, r) => s + (+r.amount_din || 0), 0);
  const balance = totalIncome - totalExpenses;
  const free = totalIncome - paidExpenses - reservedExpenses - monthSavings;
  const overBudget = balance < 0;
  const balColor = overBudget ? '#ef4444' : free > 20000 ? '#10b981' : '#f59e0b';
  return `<div class="summary-bar"><div class="summary-card summary-income"><div class="summary-icon">💰</div><div class="summary-val">${fmtDin(totalIncome)}</div><div class="summary-lbl">Доход</div></div><div class="summary-arrow">−</div><div class="summary-card summary-expense"><div class="summary-icon">📤</div><div class="summary-val">${fmtDin(totalExpenses)}</div><div class="summary-lbl">Расходы план</div><div class="summary-sub">оплачено ${fmtDin(paidExpenses)}</div></div><div class="summary-arrow">=</div><div class="summary-card summary-balance ${overBudget?'balance-negative':''}" style="border-color:${balColor}40"><div class="summary-icon">${overBudget?'🔴':'🟢'}</div><div class="summary-val" style="color:${balColor}">${fmtDin(balance)}</div><div class="summary-lbl">${overBudget?'Перерасход!':'Остаток'}</div></div><div class="summary-card summary-savings ${monthSavings===0?'savings-missing':''}"><div class="summary-icon">🏦</div><div class="summary-val">${fmtDin(monthSavings)}</div><div class="summary-lbl">Пополнено</div><div class="summary-sub">всего ${fmtDin(savingsTotal)}</div></div><div class="summary-card summary-free"><div class="summary-icon">🛒</div><div class="summary-val" style="color:${free<0?'#ef4444':'#64748b'}">${fmtDin(Math.abs(free))}</div><div class="summary-lbl">${free<0?'Нехватает':'Свободно'}</div><div class="summary-sub">после отложенного</div></div></div>`;
}
function renderAnalyticsSection(expenses) {
  const grouped = {};
  expenses.forEach(e => { if (!grouped[e.category]) grouped[e.category] = 0; grouped[e.category] += +e.amount_din || 0; });
  const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const total = expenses.reduce((s, e) => s + (+e.amount_din || 0), 0);
  return `<div class="b-section"><div class="b-section-header"><h2 class="b-section-title">📊 Аналитика расходов</h2></div><div class="analytics-bars">${sorted.map(([cat,amt])=>{const pct=total>0?Math.round(amt/total*100):0;return`<div class="analytics-row"><div class="analytics-cat">${cat}</div><div class="analytics-bar-wrap"><div class="analytics-bar" style="width:${pct}%"></div></div><div class="analytics-amt">${fmtDin(amt)}</div><div class="analytics-pct">${pct}%</div></div>`;}).join('')}</div></div>`;
}