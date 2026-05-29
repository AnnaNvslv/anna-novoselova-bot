// ═══ BUDGET EXPENSES ═══
async function loadExpenses(month) {
  const { data } = await bdb.from('budget_expenses').select('*').eq('month', month).order('category').order('created_at');
  return data || [];
}
async function loadRecurring() {
  const { data } = await bdb.from('budget_recurring').select('*').eq('active', true).order('category');
  return data || [];
}
async function ensureRecurringForMonth(month) {
  const [recurring, existing] = await Promise.all([loadRecurring(), loadExpenses(month)]);
  if (existing.filter(e => e.is_recurring).length > 0) return;
  const [y, m] = month.split('-').map(Number);
  const monthNum = y * 12 + m;
  const toInsert = recurring.filter(r => r.every_months === 1 || monthNum % r.every_months === 0)
    .map(r => ({ month, category: r.category, subcategory: r.subcategory, amount: r.amount, currency: r.currency, amount_din: toDin(r.amount, r.currency), is_recurring: true, status: 'planned', note: r.note || '' }));
  if (toInsert.length) await bdb.from('budget_expenses').insert(toInsert);
}
function renderExpensesSection(expenses, month) {
  const grouped = {};
  expenses.forEach(e => { if (!grouped[e.category]) grouped[e.category] = []; grouped[e.category].push(e); });
  const totalDin = expenses.reduce((s, e) => s + (+e.amount_din || 0), 0);
  const paidDin = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + (+e.amount_din || 0), 0);
  const reservedDin = expenses.filter(e => e.status === 'reserved').reduce((s, e) => s + (+e.amount_din || 0), 0);
  return `<div class="b-section"><div class="b-section-header"><h2 class="b-section-title">📤 Расходы</h2><div class="expense-totals"><span class="b-total-badge expense-badge">${fmtDin(totalDin)}</span><span class="b-total-badge paid-badge" title="Оплачено">✓ ${fmtDin(paidDin)}</span><span class="b-total-badge reserved-badge" title="Отложено">◷ ${fmtDin(reservedDin)}</span></div><button class="b-btn b-btn-accent b-btn-sm" onclick="openAddExpense('${month}')">+ Расход</button></div><div class="expenses-list">${Object.keys(grouped).sort().map(cat => renderExpenseCategory(cat, grouped[cat], month)).join('')}</div></div>`;
}
function renderExpenseCategory(category, items, month) {
  const totalDin = items.reduce((s, e) => s + (+e.amount_din || 0), 0);
  const allPaid = items.every(e => e.status === 'paid');
  const allPlanned = items.every(e => e.status === 'planned');
  return `<div class="expense-category ${allPaid?'cat--paid':allPlanned?'cat--planned':'cat--partial'}"><div class="expense-cat-header"><div class="expense-cat-name"><span class="cat-dot ${allPaid?'dot-paid':allPlanned?'dot-planned':'dot-reserved'}"></span>${category}</div><div class="expense-cat-total">${fmtDin(totalDin)}</div></div>${items.map(e => renderExpenseRow(e, month)).join('')}</div>`;
}
function renderExpenseRow(e, month) {
  return `<div class="expense-row ${e.status==='paid'?'row-paid':e.status==='reserved'?'row-reserved':''}"><div class="expense-row-info">${e.is_recurring?'<span class="recurring-badge" title="Постоянный платёж">🔁</span>':''}<span class="expense-sub">${e.subcategory||''}</span>${e.note?`<span class="expense-note">· ${e.note}</span>`:''}</div><div class="expense-row-right"><div class="expense-amount">${amountCell(e.amount_din,e.amount,e.currency)}</div><select class="status-select" onchange="updateExpenseStatus('${e.id}','${month}',this.value)">${Object.entries(EXPENSE_STATUS).map(([k,v])=>`<option value="${k}" ${e.status===k?'selected':''}>${v.label}</option>`).join('')}</select><button class="b-btn b-btn-icon" onclick="openEditExpense('${e.id}','${month}')">✏️</button></div></div>`;
}
async function updateExpenseStatus(id, month, status) {
  await bdb.from('budget_expenses').update({ status }).eq('id', id);
  bToast(EXPENSE_STATUS[status]?.label || status);
  await renderMonth(month);
}
function openAddExpense(month) { _expenseForm(null, month); }
async function openEditExpense(id, month) {
  const { data: e } = await bdb.from('budget_expenses').select('*').eq('id', id).single();
  _expenseForm(e, month);
}
function _expenseForm(e, month) {
  bOpenModal(`<div class="b-modal"><div class="b-modal-header"><span class="b-modal-title">${e?'Редактировать расход':'Новый расход'}</span><button class="b-btn b-btn-ghost" onclick="bCloseModal()">✕</button></div><div class="b-modal-body"><div class="b-form-row"><div class="b-form-group"><label>Категория *</label><select id="exp-cat" class="b-input">${EXPENSE_CATEGORIES.map(c=>`<option ${e?.category===c?'selected':''}>${c}</option>`).join('')}</select></div><div class="b-form-group"><label>Подкатегория</label><input id="exp-sub" class="b-input" value="${e?.subcategory||''}" placeholder="уточнение"></div></div><div class="b-form-row"><div class="b-form-group"><label>Сумма *</label><input type="number" id="exp-amount" class="b-input" value="${e?.amount||''}" placeholder="0" min="0"></div><div class="b-form-group"><label>Валюта</label>${curSelect('exp-cur',e?.currency||'DIN')}</div></div><div class="b-form-row"><div class="b-form-group"><label>Статус</label><select id="exp-status" class="b-input">${Object.entries(EXPENSE_STATUS).map(([k,v])=>`<option value="${k}" ${(e?.status||'planned')===k?'selected':''}>${v.label}</option>`).join('')}</select></div><div class="b-form-group" style="align-self:flex-end"><label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input type="checkbox" id="exp-recurring" style="width:auto" ${e?.is_recurring?'checked':''}>Постоянный платёж</label></div></div><div class="b-form-group"><label>Комментарий</label><input type="text" id="exp-note" class="b-input" value="${e?.note||''}" placeholder="необязательно"></div></div><div class="b-modal-footer"><button class="b-btn b-btn-ghost" onclick="bCloseModal()">Отмена</button>${e?`<button class="b-btn b-btn-danger" onclick="deleteExpense('${e.id}','${month}')">Удалить</button>`:''}<button class="b-btn b-btn-accent" onclick="saveExpense('${e?.id||''}','${month}')">Сохранить</button></div></div>`);
}
async function saveExpense(id, month) {
  const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
  const currency = document.getElementById('exp-cur').value;
  const row = { month, category: document.getElementById('exp-cat').value, subcategory: document.getElementById('exp-sub').value.trim(), amount, currency, amount_din: toDin(amount, currency), status: document.getElementById('exp-status').value, is_recurring: document.getElementById('exp-recurring').checked, note: document.getElementById('exp-note').value.trim() };
  if (id) { await bdb.from('budget_expenses').update(row).eq('id', id); }
  else { await bdb.from('budget_expenses').insert(row); }
  bCloseModal(); bToast('Сохранено'); await renderMonth(month);
}
async function deleteExpense(id, month) {
  if (!bConfirm('Удалить расход?')) return;
  await bdb.from('budget_expenses').delete().eq('id', id);
  bCloseModal(); await renderMonth(month);
}