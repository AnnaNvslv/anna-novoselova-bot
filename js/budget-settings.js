// ═══ BUDGET SETTINGS ═══
async function openBudgetSettings() {
  const { data: rows } = await bdb.from('budget_settings').select('key,value');
  const s = {}; (rows || []).forEach(r => s[r.key] = r.value);
  const { data: recurring } = await bdb.from('budget_recurring').select('*').order('category');
  bOpenModal(`<div class="b-modal b-modal-lg"><div class="b-modal-header"><span class="b-modal-title">⚙️ Настройки бюджета</span><button class="b-btn b-btn-ghost" onclick="bCloseModal()">✕</button></div><div class="b-modal-body"><h3 class="b-settings-title">Курсы валют (к динару)</h3><div class="b-form-row"><div class="b-form-group"><label>1 EUR = дин.</label><input type="number" id="rate-eur" class="b-input" value="${s.rate_eur_din||117}"></div><div class="b-form-group"><label>1 USD = дин.</label><input type="number" id="rate-usd" class="b-input" value="${s.rate_usd_din||108}"></div><div class="b-form-group"><label>1 RUB = дин.</label><input type="number" id="rate-rub" class="b-input" value="${s.rate_rub_din||1.25}" step="0.01"></div></div><button class="b-btn b-btn-accent b-btn-sm" onclick="saveRatesUI()">Сохранить курсы</button><div class="b-divider"></div><h3 class="b-settings-title">Постоянные платежи</h3><div class="recurring-list">${(recurring||[]).map(r=>`<div class="recurring-row"><div class="recurring-info"><span class="recurring-cat">${r.category}</span><span class="recurring-sub">${r.subcategory||''}</span></div><div class="recurring-amount">${fmtCur(r.amount,r.currency)}</div><div class="recurring-freq">${r.every_months===1?'ежемес.':`раз в ${r.every_months} мес.`}</div><button class="b-btn b-btn-icon" onclick="openEditRecurring('${r.id}')">✏️</button><button class="b-btn b-btn-icon" onclick="toggleRecurring('${r.id}',${!r.active})">${r.active?'🟢':'⚪'}</button></div>`).join('')}</div><button class="b-btn b-btn-ghost b-btn-sm" onclick="openAddRecurring()" style="margin-top:10px">+ Добавить постоянный платёж</button><div class="b-divider"></div><h3 class="b-settings-title">Накопления — ручная корректировка</h3><div class="b-form-row"><div class="b-form-group"><label>Текущий остаток накоплений (дин.)</label><input type="number" id="sav-manual" class="b-input" value="${Math.round(savingsTotal)}"></div></div><button class="b-btn b-btn-accent b-btn-sm" onclick="saveSavingsManual()">Обновить остаток</button></div><div class="b-modal-footer"><button class="b-btn b-btn-ghost" onclick="bCloseModal()">Закрыть</button></div></div>`);
}
async function saveRatesUI() {
  rates.eur = parseFloat(document.getElementById('rate-eur').value) || 117;
  rates.usd = parseFloat(document.getElementById('rate-usd').value) || 108;
  rates.rub = parseFloat(document.getElementById('rate-rub').value) || 1.25;
  await saveRates(); bToast('Курсы сохранены ✓');
}
async function saveSavingsManual() {
  savingsTotal = parseFloat(document.getElementById('sav-manual').value) || 0;
  await saveSavingsTotal(); bToast('Накопления обновлены ✓');
  await renderMonth(currentMonth);
}
function openAddRecurring() { _recurringForm(null); }
async function openEditRecurring(id) { const { data: r } = await bdb.from('budget_recurring').select('*').eq('id', id).single(); _recurringForm(r); }
function _recurringForm(r) {
  bOpenModal(`<div class="b-modal"><div class="b-modal-header"><span class="b-modal-title">${r?'Редактировать':'Новый'} постоянный платёж</span><button class="b-btn b-btn-ghost" onclick="bCloseModal();openBudgetSettings()">✕</button></div><div class="b-modal-body"><div class="b-form-row"><div class="b-form-group"><label>Категория</label><select id="rec-cat" class="b-input">${EXPENSE_CATEGORIES.map(c=>`<option ${r?.category===c?'selected':''}>${c}</option>`).join('')}</select></div><div class="b-form-group"><label>Подкатегория</label><input id="rec-sub" class="b-input" value="${r?.subcategory||''}"></div></div><div class="b-form-row"><div class="b-form-group"><label>Сумма</label><input type="number" id="rec-amount" class="b-input" value="${r?.amount||''}"></div><div class="b-form-group"><label>Валюта</label>${curSelect('rec-cur',r?.currency||'DIN')}</div><div class="b-form-group"><label>Раз в N месяцев</label><select id="rec-freq" class="b-input">${[1,2,3,4,6].map(n=>`<option value="${n}" ${r?.every_months===n?'selected':''}>${n===1?'каждый месяц':`раз в ${n} мес.`}</option>`).join('')}</select></div></div></div><div class="b-modal-footer"><button class="b-btn b-btn-ghost" onclick="bCloseModal();openBudgetSettings()">Отмена</button><button class="b-btn b-btn-accent" onclick="saveRecurring('${r?.id||''}')">Сохранить</button></div></div>`);
}
async function saveRecurring(id) {
  const row = { category: document.getElementById('rec-cat').value, subcategory: document.getElementById('rec-sub').value.trim(), amount: parseFloat(document.getElementById('rec-amount').value)||0, currency: document.getElementById('rec-cur').value, every_months: parseInt(document.getElementById('rec-freq').value)||1, active: true };
  if (id) { await bdb.from('budget_recurring').update(row).eq('id', id); } else { await bdb.from('budget_recurring').insert(row); }
  bToast('Сохранено'); openBudgetSettings();
}
async function toggleRecurring(id, active) { await bdb.from('budget_recurring').update({ active }).eq('id', id); openBudgetSettings(); }