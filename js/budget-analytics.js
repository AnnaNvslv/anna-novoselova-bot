// ═══ ANALYTICS v2 ═══
function renderSummaryBar(income,expenses,savings,month){
  const totalIncome=income.reduce((s,i)=>s+(+i.amount_din||0),0);
  const totalExpenses=expenses.reduce((s,e)=>s+(+e.amount_din||0),0);
  const paidExpenses=expenses.filter(e=>e.status==='paid').reduce((s,e)=>s+(+e.amount_din||0),0);
  const reservedExpenses=expenses.filter(e=>e.status==='reserved').reduce((s,e)=>s+(+e.amount_din||0),0);
  const monthSavings=savings.filter(s=>s.action==='add').reduce((s,r)=>s+(+r.amount_din||0),0);
  const balance=totalIncome-totalExpenses;
  const free=totalIncome-paidExpenses-reservedExpenses-monthSavings;
  const overBudget=balance<0;const noSavings=monthSavings===0;
  const balColor=overBudget?'var(--red)':free>20000?'var(--green)':'var(--warn)';
  return`<div class="summary-bar">
    <div class="summary-card s-income"><div class="s-icon">💰</div><div class="s-val" style="color:var(--green)">${fmtDin(totalIncome)}</div><div class="s-lbl">Доход</div></div>
    <div class="s-arrow">−</div>
    <div class="summary-card s-expense"><div class="s-icon">📤</div><div class="s-val" style="color:var(--red)">${fmtDin(totalExpenses)}</div><div class="s-lbl">Расходы план</div><div class="s-sub">оплачено ${fmtDin(paidExpenses)}</div></div>
    <div class="s-arrow">=</div>
    <div class="summary-card s-balance${overBudget?' neg':''}"><div class="s-icon">${overBudget?'🔴':'🟢'}</div><div class="s-val" style="color:${balColor}">${fmtDin(balance)}</div><div class="s-lbl">${overBudget?'Перерасход!':'Остаток'}</div></div>
    <div class="summary-card s-savings${noSavings?' warn':''}"><div class="s-icon">🏦</div><div class="s-val" style="color:var(--accent2)">${fmtDin(monthSavings)}</div><div class="s-lbl">Пополнено в копилку</div><div class="s-sub">всего ${fmtDin(savingsTotal)}</div></div>
    <div class="summary-card s-free"><div class="s-icon">🛒</div><div class="s-val" style="color:${free<0?'var(--red)':'var(--text-m)'}">${fmtDin(Math.abs(free))}</div><div class="s-lbl">${free<0?'Нехватает':'Свободно'}</div><div class="s-sub">после отложенного</div></div>
  </div>`;
}
async function renderAnalytics(month){
  document.getElementById('main-content').innerHTML='<div class="b-spinner">Загрузка аналитики...</div>';
  const prev=prevMonth(month);
  const[expCur,expPrev,incCur,incPrev]=await Promise.all([loadExpenses(month),loadExpenses(prev),loadIncome(month),loadIncome(prev)]);
  function groupByCat(exp){const g={};exp.forEach(e=>{g[e.category]=(g[e.category]||0)+(+e.amount_din||0);});return g;}
  const curGroup=groupByCat(expCur),prevGroup=groupByCat(expPrev);
  const allCats=[...new Set([...Object.keys(curGroup),...Object.keys(prevGroup)])].sort();
  const maxVal=Math.max(...Object.values({...curGroup,...prevGroup}),1);
  const totalCur=expCur.reduce((s,e)=>s+(+e.amount_din||0),0);
  const totalPrev=expPrev.reduce((s,e)=>s+(+e.amount_din||0),0);
  const totalIncCur=incCur.reduce((s,i)=>s+(+i.amount_din||0),0);
  const totalIncPrev=incPrev.reduce((s,i)=>s+(+i.amount_din||0),0);
  function diffBadge(cur,prev){
    if(!prev)return'';
    const d=cur-prev;const pct=Math.round(Math.abs(d)/prev*100);
    if(d>0)return`<span class="a-diff diff-up">▲${pct}%</span>`;
    if(d<0)return`<span class="a-diff diff-down">▼${pct}%</span>`;
    return`<span class="a-diff" style="color:var(--text-l)">→</span>`;
  }
  document.getElementById('main-content').innerHTML=`
  <div class="b-section">
    <div class="b-section-header">
      <h2 class="b-section-title">📈 Сравнение с прошлым месяцем</h2>
      <span class="b-badge badge-accent">${monthLabel(month)}</span>
      <span style="color:var(--text-l);font-size:13px">vs</span>
      <span class="b-badge" style="background:rgba(160,200,184,.15);color:var(--mint)">${monthLabel(prev)}</span>
    </div>
    <div class="analytics-compare">
      <div class="analytics-period">
        <div class="analytics-period-title">💰 Доходы</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:16px;font-weight:800;color:var(--green)">${fmtDin(totalIncCur)}</span>${diffBadge(totalIncCur,totalIncPrev)}</div>
        <div style="font-size:12px;color:var(--text-m)">прошлый: ${fmtDin(totalIncPrev)}</div>
      </div>
      <div class="analytics-period">
        <div class="analytics-period-title">📤 Расходы</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span style="font-size:16px;font-weight:800;color:var(--red)">${fmtDin(totalCur)}</span>${diffBadge(totalCur,totalPrev)}</div>
        <div style="font-size:12px;color:var(--text-m)">прошлый: ${fmtDin(totalPrev)}</div>
      </div>
    </div>
  </div>
  <div class="b-section">
    <div class="b-section-header"><h2 class="b-section-title">📊 Расходы по категориям</h2></div>
    <div style="display:flex;gap:16px;margin-bottom:12px;font-size:12px;font-weight:700">
      <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:8px;border-radius:3px;background:linear-gradient(90deg,var(--accent),var(--lavender));display:inline-block"></span>${monthLabel(month)}</span>
      <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:8px;border-radius:3px;background:linear-gradient(90deg,var(--mint),#a0c8d4);display:inline-block"></span>${monthLabel(prev)}</span>
    </div>
    <div class="a-bars">
      ${allCats.map(cat=>{
        const cur=curGroup[cat]||0,prv=prevGroup[cat]||0;
        const curPct=Math.round(cur/maxVal*100),prvPct=Math.round(prv/maxVal*100);
        return`<div>
          <div class="a-row" style="margin-bottom:3px"><div class="a-cat">${cat}</div><div class="a-bar-wrap"><div class="a-bar a-bar-cur" style="width:${curPct}%"></div></div><div class="a-amt">${fmtDin(cur)}</div>${diffBadge(cur,prv)}</div>
          ${prv?`<div class="a-row"><div class="a-cat" style="color:var(--text-l);font-size:11px">↳ прошлый</div><div class="a-bar-wrap"><div class="a-bar a-bar-prev" style="width:${prvPct}%"></div></div><div class="a-amt" style="color:var(--text-m);font-size:11px">${fmtDin(prv)}</div><div class="a-diff"></div></div>`:''}
        </div>`;
      }).join('')}
    </div>
  </div>
  <div class="b-section">
    <div class="b-section-header"><h2 class="b-section-title">🥧 Структура расходов ${monthLabel(month)}</h2></div>
    <div class="a-bars">
      ${Object.entries(curGroup).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>{
        const pct=totalCur>0?Math.round(amt/totalCur*100):0;
        return`<div class="a-row"><div class="a-cat">${cat}</div><div class="a-bar-wrap"><div class="a-bar a-bar-cur" style="width:${pct}%"></div></div><div class="a-amt">${fmtDin(amt)}</div><div class="a-diff" style="color:var(--text-m)">${pct}%</div></div>`;
      }).join('')}
    </div>
  </div>`;
}
