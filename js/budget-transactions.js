// ═══ TRANSACTIONS v2 ═══
let _txFilter='all';
async function renderTransactions(month){
  document.getElementById('main-content').innerHTML='<div class="b-spinner">Загрузка транзакций...</div>';
  const[income,expenses,savings]=await Promise.all([loadIncome(month),loadExpenses(month),loadSavings(month)]);
  const items=[];
  income.forEach(i=>{const src=INCOME_SOURCES.find(s=>s.id===i.source);items.push({type:'income',label:src?.label||i.source,sub:i.note||'',amount_din:+i.amount_din||0,amount:i.amount,currency:i.currency,id:i.id,source:i.source});});
  expenses.forEach(e=>{items.push({type:'expense',label:e.category,sub:[e.subcategory,e.note].filter(Boolean).join(' · '),amount_din:+e.amount_din||0,amount:e.amount,currency:e.currency,status:e.status,is_recurring:e.is_recurring,id:e.id});});
  savings.forEach(s=>{items.push({type:'saving',label:s.action==='add'?'Пополнение накоплений':'Изъятие из накоплений',sub:s.note||'',amount_din:+s.amount_din||0,amount:s.amount,currency:s.currency,action:s.action,id:s.id});});
  const filtered=_txFilter==='all'?items:items.filter(i=>i.type===_txFilter);
  const totalIncome=items.filter(i=>i.type==='income').reduce((s,i)=>s+i.amount_din,0);
  const totalExpense=items.filter(i=>i.type==='expense').reduce((s,i)=>s+i.amount_din,0);
  const totalSaving=items.filter(i=>i.type==='saving'&&i.action==='add').reduce((s,i)=>s+i.amount_din,0);
  document.getElementById('main-content').innerHTML=`
  <div class="b-section">
    <div class="b-section-header">
      <h2 class="b-section-title">📋 Все транзакции — ${monthLabel(month)}</h2>
      <button class="b-btn b-btn-accent b-btn-sm" onclick="openAddExpense('${month}')">+ Расход</button>
    </div>
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <div style="background:var(--green-l);border:1.5px solid rgba(109,171,138,.3);border-radius:10px;padding:10px 16px;text-align:center;min-width:130px"><div style="font-size:11px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.5px">Доходы</div><div style="font-size:18px;font-weight:900;color:var(--green)">${fmtDin(totalIncome)}</div></div>
      <div style="background:var(--red-l);border:1.5px solid rgba(217,112,112,.3);border-radius:10px;padding:10px 16px;text-align:center;min-width:130px"><div style="font-size:11px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.5px">Расходы</div><div style="font-size:18px;font-weight:900;color:var(--red)">${fmtDin(totalExpense)}</div></div>
      <div style="background:rgba(184,160,212,.12);border:1.5px solid rgba(184,160,212,.3);border-radius:10px;padding:10px 16px;text-align:center;min-width:130px"><div style="font-size:11px;font-weight:700;color:var(--lavender);text-transform:uppercase;letter-spacing:.5px">Накопления</div><div style="font-size:18px;font-weight:900;color:var(--lavender)">${fmtDin(totalSaving)}</div></div>
    </div>
    <div class="tx-filter">
      <button class="filter-btn${_txFilter==='all'?' active':''}" onclick="_txFilter='all';renderTransactions('${month}')">Все (${items.length})</button>
      <button class="filter-btn${_txFilter==='income'?' active':''}" onclick="_txFilter='income';renderTransactions('${month}')">💰 Доходы</button>
      <button class="filter-btn${_txFilter==='expense'?' active':''}" onclick="_txFilter='expense';renderTransactions('${month}')">📤 Расходы</button>
      <button class="filter-btn${_txFilter==='saving'?' active':''}" onclick="_txFilter='saving';renderTransactions('${month}')">🏦 Накопления</button>
    </div>
    <div class="tx-list">${filtered.length?filtered.map(i=>renderTxRow(i,month)).join(''):`<div style="text-align:center;padding:32px;color:var(--text-l);font-weight:600">Нет транзакций</div>`}</div>
  </div>`;
}
function renderTxRow(item,month){
  const dotClass=item.type==='income'?'tx-dot-income':item.type==='saving'?'tx-dot-saving':'tx-dot-expense';
  const amtClass=item.type==='income'?'tx-inc':item.type==='saving'?'tx-sav':'tx-exp';
  const sign=item.type==='income'?'+':item.type==='saving'&&item.action==='withdraw'?'−':item.type==='saving'?'+':'−';
  let actionBtn='';
  if(item.type==='expense')actionBtn=`<button class="b-btn b-btn-icon" onclick="openEditExpense('${item.id}','${month}')">✏️</button>`;
  else if(item.type==='income')actionBtn=`<button class="b-btn b-btn-icon" onclick="openIncomeForm('${item.source}','${month}','${item.id}')">✏️</button>`;
  else if(item.type==='saving')actionBtn=`<button class="b-btn b-btn-icon" onclick="deleteSaving('${item.id}','${month}','${item.action}',${item.amount_din})">🗑</button>`;
  const statusPill=item.status?`<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${item.status==='paid'?'var(--green-l)':item.status==='reserved'?'var(--warn-l)':'rgba(200,200,200,.2)'};color:${item.status==='paid'?'var(--green)':item.status==='reserved'?'var(--warn)':'var(--text-l)'};font-weight:700">${EXPENSE_STATUS[item.status]?.label||''}</span>`:'';
  const recurBadge=item.is_recurring?'<span style="font-size:11px;opacity:.5">🔁</span>':'';
  return`<div class="tx-row"><div class="tx-dot ${dotClass}"></div><div class="tx-info"><div class="tx-title">${item.label} ${recurBadge}</div><div class="tx-sub">${item.sub} ${statusPill}</div></div><div class="tx-amount ${amtClass}">${sign}${fmtDin(item.amount_din)}</div>${item.currency!=='DIN'?`<div style="font-size:11px;color:var(--text-l)">${fmtCur(item.amount,item.currency)}</div>`:''} ${actionBtn}</div>`;
}
