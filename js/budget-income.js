// ═══ BUDGET INCOME ═══
async function loadIncome(month) {
  const { data } = await bdb.from('budget_income').select('*').eq('month', month).order('created_at');
  return data || [];
}
async function fetchAnyaOpticaSalary(month) {
  try {
    const from = month + '-01';
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${month}-${String(lastDay).padStart(2,'0')}T23:59:59`;
    const { data: appts } = await bdb.from('appointments').select('consultation_price').eq('status', 'завершён').gte('date', from).lte('date', `${month}-${String(lastDay).padStart(2,'0')}`).is('deleted_at', null);
    const apptTotal = (appts || []).reduce((s, a) => s + (+a.consultation_price || 0), 0);
    const { data: orders } = await bdb.from('orders').select('frame_price,lens_price,work_price').eq('counts_for_salary', true).gte('created_at', from).lte('created_at', to);
    const ordersBonus = (orders || []).reduce((s, o) => s + ((+o.frame_price||0)+(+o.lens_price||0)*2+(+o.work_price||0))*0.1, 0);
    return Math.round(apptTotal + ordersBonus);
  } catch(e) { console.error(e); return 0; }
}
async function syncAnyaOpticaIncome(month) {
  const salary = await fetchAnyaOpticaSalary(month);
  if (!salary) return 0;
  const { data: existing } = await bdb.from('budget_income').select('id').eq('month', month).eq('source', 'anya_optica').maybeSingle();
  const row = { month, source: 'anya_optica', amount: salary, currency: 'DIN', amount_din: salary, note: 'Авто из CRM' };
  if (existing) { await bdb.from('budget_income').update(row).eq('id', existing.id); }
  else { await bdb.from('budget_income').insert(row); }
  return salary;
}
function renderIncomeSection(incomeList, month) {
  const sources = INCOME_SOURCES.map(src => ({ ...src, item: incomeList.find(i => i.source === src.id) }));
  const totalDin = incomeList.reduce((s, i) => s + (+i.amount_din || 0), 0);
  return `<div class="b-section"><div class="b-section-header"><h2 class="b-section-title">💰 Доходы</h2><div class="b-total-badge income-badge">${fmtDin(totalDin)}</div></div><div class="income-grid">${sources.map(src => renderIncomeCard(src, month)).join('')}</div></div>`;
}
function renderIncomeCard(src, month) {
  const { item } = src;
  const amtDin = item ? +item.amount_din || 0 : 0;
  const hasValue = amtDin > 0;
  return `<div class="income-card ${hasValue?'income-card--filled':''} ${src.auto?'income-card--auto':''}"><div class="income-card-icon">${src.icon}</div><div class="income-card-label">${src.label}</div>${src.auto?'<div class="income-auto-badge">из CRM</div>':''}<div class="income-card-amount ${hasValue?'':'income-card-amount--empty'}">${hasValue?fmtDin(amtDin):'—'}${item&&item.currency!=='DIN'?`<div class="income-orig">${fmtCur(item.amount,item.currency)}</div>`:''}</div>${item?.note?`<div class="income-note">${item.note}</div>`:''}<div class="income-card-actions"><button class="b-btn b-btn-sm" onclick="openIncomeForm('${src.id}','${month}','${item?.id||''}')">${hasValue?'✏️ Изменить':'+ Ввести'}</button>${src.auto?`<button class="b-btn b-btn-sm b-btn-ghost" onclick="syncIncomeFromCRM('${month}')">🔄</button>`:''}</div></div>`;
}
function openIncomeForm(sourceId, month, existingId) {
  const src = INCOME_SOURCES.find(s => s.id === sourceId);
  bOpenModal(`<div class="b-modal"><div class="b-modal-header"><span class="b-modal-title">${src?.icon} ${src?.label}</span><button class="b-btn b-btn-ghost" onclick="bCloseModal()">✕</button></div><div class="b-modal-body">${src?.auto?'<div class="b-info-box">💡 Данные тянутся из CRM автоматически. Можно скорректировать вручную.</div>':''}<div class="b-form-row"><div class="b-form-group"><label>Сумма</label><input type="number" id="inc-amount" class="b-input" placeholder="0" min="0"></div><div class="b-form-group"><label>Валюта</label>${curSelect('inc-cur','DIN')}</div></div><div class="b-form-group"><label>Комментарий</label><input type="text" id="inc-note" class="b-input" placeholder="необязательно"></div></div><div class="b-modal-footer"><button class="b-btn b-btn-ghost" onclick="bCloseModal()">Отмена</button>${existingId?`<button class="b-btn b-btn-danger" onclick="deleteIncome('${existingId}','${month}')">Удалить</button>`:''}<button class="b-btn b-btn-accent" onclick="saveIncome('${sourceId}','${month}','${existingId}')">Сохранить</button></div></div>`);
}
async function saveIncome(sourceId, month, existingId) {
  const amount = parseFloat(document.getElementById('inc-amount').value) || 0;
  const currency = document.getElementById('inc-cur').value;
  const note = document.getElementById('inc-note').value.trim();
  const amount_din = toDin(amount, currency);
  const row = { month, source: sourceId, amount, currency, amount_din, note };
  if (existingId) { await bdb.from('budget_income').update(row).eq('id', existingId); }
  else { await bdb.from('budget_income').insert(row); }
  bCloseModal(); bToast('Сохранено'); await renderMonth(month);
}
async function deleteIncome(id, month) {
  if (!bConfirm('Удалить запись о доходе?')) return;
  await bdb.from('budget_income').delete().eq('id', id);
  bCloseModal(); await renderMonth(month);
}
async function syncIncomeFromCRM(month) {
  bToast('Синхронизация с CRM...', 'info');
  const salary = await syncAnyaOpticaIncome(month);
  bToast(`Аня оптика: ${fmtDin(salary)}`);
  await renderMonth(month);
}