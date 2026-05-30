// ═══ SAVINGS v2 ═══
async function loadSavings(month){
  const{data}=await bdb.from('budget_savings').select('*').eq('month',month).order('created_at');
  return data||[];
}
function renderSavingsSection(savingsList,month){
  const monthAdd=savingsList.filter(s=>s.action==='add').reduce((s,r)=>s+(+r.amount_din||0),0);
  const monthWithdraw=savingsList.filter(s=>s.action==='withdraw').reduce((s,r)=>s+(+r.amount_din||0),0);
  const hasSavings=savingsList.some(s=>s.action==='add');
  return`<div class="b-section">
    <div class="b-section-header"><h2 class="b-section-title">🏦 Накопления</h2></div>
    ${!hasSavings?'<div class="savings-warn-banner">⚠️ В этом месяце ещё не пополнялись накопления</div>':''}
    <div class="sav-total-block">
      <div class="sav-total-label">Всего накоплено</div>
      <div class="sav-total-val">${fmtDin(savingsTotal)}</div>
    </div>
    <div class="sav-stats">
      <div class="sav-stat sav-add"><span>Пополнено за месяц</span><span>${fmtDin(monthAdd)}</span></div>
      <div class="sav-stat sav-withdraw"><span>Изъято за месяц</span><span>${fmtDin(monthWithdraw)}</span></div>
    </div>
    <div class="sav-actions">
      <button class="b-btn b-btn-accent" onclick="openSavingsForm('add','${month}')">+ Пополнить</button>
      <button class="b-btn b-btn-ghost" onclick="openSavingsForm('withdraw','${month}')">− Изъять</button>
    </div>
    ${savingsList.length?`<div class="sav-history">${savingsList.map(s=>`<div class="sav-row ${s.action==='add'?'srow-add':'srow-withdraw'}"><span>${s.action==='add'?'▲':'▼'} ${fmtDin(s.amount_din)}</span>${s.currency!=='DIN'?`<span style="font-size:11px;opacity:.7">${fmtCur(s.amount,s.currency)}</span>`:''} ${s.note?`<span class="sav-note">· ${s.note}</span>`:''}<button class="b-btn b-btn-icon" onclick="deleteSaving('${s.id}','${month}','${s.action}',${s.amount_din})">🗑</button></div>`).join('')}</div>`:''}
  </div>`;
}
function openSavingsForm(action,month){
  bOpenModal(`<div class="b-modal">
    <div class="b-modal-header"><span class="b-modal-title">${action==='add'?'+ Пополнить накопления':'− Изъять из накоплений'}</span><button class="b-btn b-btn-ghost" onclick="bCloseModal()">✕</button></div>
    <div class="b-modal-body">
      <div class="b-info-box">Текущий остаток: <strong>${fmtDin(savingsTotal)}</strong></div>
      <div class="b-form-row">
        <div class="b-form-group"><label>Сумма</label><input type="number" id="sav-amount" class="b-input" placeholder="0" min="0" autofocus></div>
        <div class="b-form-group"><label>Валюта</label>${curSelect('sav-cur','DIN')}</div>
      </div>
      <div class="b-form-group"><label>Комментарий</label><input type="text" id="sav-note" class="b-input" placeholder="на что / откуда"></div>
    </div>
    <div class="b-modal-footer">
      <button class="b-btn b-btn-ghost" onclick="bCloseModal()">Отмена</button>
      <button class="b-btn b-btn-accent" onclick="saveSaving('${action}','${month}')">Сохранить</button>
    </div>
  </div>`);
}
async function saveSaving(action,month){
  const amount=parseFloat(document.getElementById('sav-amount').value)||0;
  if(!amount){bToast('Введите сумму','error');return;}
  const currency=document.getElementById('sav-cur').value;
  const note=document.getElementById('sav-note').value.trim();
  const amount_din=toDin(amount,currency);
  await bdb.from('budget_savings').insert({month,action,amount,currency,amount_din,note});
  if(action==='add'){savingsTotal+=amount_din;}else{savingsTotal=Math.max(0,savingsTotal-amount_din);}
  await saveSavingsTotal();
  bCloseModal();bToast(action==='add'?'Накопления пополнены ✓':'Изъято из накоплений');
  await renderOverview(month);
}
async function deleteSaving(id,month,action,amountDin){
  if(!bConfirm('Удалить запись?'))return;
  await bdb.from('budget_savings').delete().eq('id',id);
  if(action==='add'){savingsTotal=Math.max(0,savingsTotal-amountDin);}else{savingsTotal+=parseFloat(amountDin)||0;}
  await saveSavingsTotal();
  bToast('Удалено');await renderOverview(month);
}
