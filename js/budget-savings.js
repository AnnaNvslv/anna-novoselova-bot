// ═══ BUDGET SAVINGS ═══
async function loadSavings(month) {
  const { data } = await bdb.from('budget_savings').select('*').eq('month', month).order('created_at');
  return data || [];
}
function renderSavingsSection(savingsList, month) {
  const monthAdd = savingsList.filter(s => s.action === 'add').reduce((s, r) => s + (+r.amount_din || 0), 0);
  const monthWithdraw = savingsList.filter(s => s.action === 'withdraw').reduce((s, r) => s + (+r.amount_din || 0), 0);
  const hasSavings = savingsList.some(s => s.action === 'add');
  return `<div class="b-section savings-section ${!hasSavings?'savings-warn':''}"><div class="b-section-header"><h2 class="b-section-title">🏦 Накопления</h2><div class="savings-total-block"><div class="savings-total-label">Всего накоплено</div><div class="savings-total-value">${fmtDin(savingsTotal)}</div></div></div>${!hasSavings?'<div class="savings-no-contrib">⚠️ В этом месяце ещё не пополнялись накопления</div>':''}<div class="savings-month-stats"><div class="savings-stat savings-stat-add"><span>Пополнено за месяц</span><span>${fmtDin(monthAdd)}</span></div><div class="savings-stat savings-stat-withdraw"><span>Изъято за месяц</span><span>${fmtDin(monthWithdraw)}</span></div></div><div class="savings-actions"><button class="b-btn b-btn-accent" onclick="openSavingsForm('add','${month}')">+ Пополнить</button><button class="b-btn b-btn-ghost" onclick="openSavingsForm('withdraw','${month}')">− Изъять</button></div>${savingsList.length?`<div class="savings-history">${savingsList.map(s=>`<div class="savings-row ${s.action==='add'?'srow-add':'srow-withdraw'}"><span>${s.action==='add'?'▲':'▼'} ${fmtDin(s.amount_din)}</span>${s.currency!=='DIN'?`<span class="amt-sub">${fmtCur(s.amount,s.currency)}</span>`:''} ${s.note?`<span class="savings-note">· ${s.note}</span>`:''}<button class="b-btn b-btn-icon" onclick="deleteSaving('${s.id}','${month}','${s.action}',${s.amount_din})">🗑</button></div>`).join('')}</div>`:''}</div>`;
}
function openSavingsForm(action, month) {
  bOpenModal(`<div class="b-modal"><div class="b-modal-header"><span class="b-modal-title">${action==='add'?'+ Пополнить накопления':'− Изъять из накоплений'}</span><button class="b-btn b-btn-ghost" onclick="bCloseModal()">✕</button></div><div class="b-modal-body"><div class="b-info-box">Текущий остаток: <strong>${fmtDin(savingsTotal)}</strong></div><div class="b-form-row"><div class="b-form-group"><label>Сумма</label><input type="number" id="sav-amount" class="b-input" placeholder="0" min="0" autofocus></div><div class="b-form-group"><label>Валюта</label>${curSelect('sav-cur','DIN')}</div></div><div class="b-form-group"><label>Комментарий</label><input type="text" id="sav-note" class="b-input" placeholder="на что / откуда"></div></div><div class="b-modal-footer"><button class="b-btn b-btn-ghost" onclick="bCloseModal()">Отмена</button><button class="b-btn b-btn-accent" onclick="saveSaving('${action}','${month}')">Сохранить</button></div></div>`);
}
async function saveSaving(action, month) {
  const amount = parseFloat(document.getElementById('sav-amount').value) || 0;
  if (!amount) { bToast('Введите сумму', 'error'); return; }
  const currency = document.getElementById('sav-cur').value;
  const note = document.getElementById('sav-note').value.trim();
  const amount_din = toDin(amount, currency);
  await bdb.from('budget_savings').insert({ month, action, amount, currency, amount_din, note });
  if (action === 'add') { savingsTotal += amount_din; } else { savingsTotal = Math.max(0, savingsTotal - amount_din); }
  await saveSavingsTotal();
  bCloseModal(); bToast(action==='add'?'Накопления пополнены ✓':'Изъято из накоплений');
  await renderMonth(month);
}
async function deleteSaving(id, month, action, amountDin) {
  if (!bConfirm('Удалить запись?')) return;
  await bdb.from('budget_savings').delete().eq('id', id);
  if (action === 'add') { savingsTotal = Math.max(0, savingsTotal - amountDin); } else { savingsTotal += parseFloat(amountDin) || 0; }
  await saveSavingsTotal();
  bToast('Удалено'); await renderMonth(month);
}