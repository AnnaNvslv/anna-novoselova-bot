// ═══ ANALYTICS ═══

// ── State ──
let _anPeriod = 'month'; // 'month' | 'range'
let _anMonth = today().substr(0,7);
let _anFrom = today().substr(0,8) + '01';
let _anTo = today();
let _anOrderTypeFilter = 'all'; // all | glasses | cl
let _anReportData = null; // {from,to,orders,appts}
let _anPercent = 10;
let _anThresholdOn = false;
let _anThresholdVal = 10000;
let _anSettingsLoaded = false;

function _anOrderDate(o){ return o.order_date || (o.created_at ? o.created_at.split('T')[0] : ''); }
function _anIsCL(o){ return o.type === 'МКЛ'; }
function _anHadVisit(o){ return !!o.examination_id; }

function _anRange(){
  if (_anPeriod === 'month'){
    const [y,m] = _anMonth.split('-').map(Number);
    const start = `${_anMonth}-01`;
    const end = new Date(y, m, 0).toISOString().split('T')[0]; // last day of month
    return {from:start, to:end};
  }
  return {from:_anFrom, to:_anTo};
}

function _anMonthLabel(){
  const [y,m] = _anMonth.split('-').map(Number);
  return (t('months')[m-1]) + ' ' + y;
}

async function _anLoadSettings(){
  if (_anSettingsLoaded) return;
  const {data:rows} = await db.from('settings').select('key,value').in('key',['salary_percent','salary_threshold_on','salary_threshold_val']);
  (rows||[]).forEach(r=>{
    if (r.key==='salary_percent') _anPercent = +r.value || 10;
    if (r.key==='salary_threshold_on') _anThresholdOn = r.value === 'true';
    if (r.key==='salary_threshold_val') _anThresholdVal = +r.value || 10000;
  });
  _anSettingsLoaded = true;
}

async function renderAnalytics(){
  if (!isAdmin()){
    document.getElementById('content').innerHTML = `<div class="topbar"><h1>${t('analytics')}</h1></div><div class="content"><div class="empty"><p>${t('admin_only')}</p></div></div>`;
    return;
  }
  document.getElementById('content').innerHTML = `<div class="topbar"><h1>${t('analytics')}</h1></div><div class="content"><div class="spinner">${t('loading')}</div></div>`;
  await _anLoadSettings();

  const [{count:totalPatients}, {count:totalOrders}, {count:totalAppts}] = await Promise.all([
    db.from('patients').select('id',{count:'exact',head:true}).is('deleted_at',null),
    db.from('orders').select('id',{count:'exact',head:true}).is('deleted_at',null),
    db.from('appointments').select('id',{count:'exact',head:true}).is('deleted_at',null).eq('status','завершён')
  ]);

  document.querySelector('.content').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">${t('total_patients')}</div><div class="stat-value">${totalPatients||0}</div><div class="stat-sub">за всё время</div></div>
      <div class="stat-card"><div class="stat-label">${t('total_orders')}</div><div class="stat-value">${totalOrders||0}</div><div class="stat-sub">за всё время</div></div>
      <div class="stat-card"><div class="stat-label">Прегледов завершено</div><div class="stat-value">${totalAppts||0}</div><div class="stat-sub">за всё время</div></div>
    </div>

    <div class="card mb-12">
      <div class="card-header"><span class="card-title">📊 Параметры отчёта</span></div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <div class="filter-bar">
          <button class="filter-btn${_anPeriod==='month'?' active':''}" onclick="_anSetPeriod('month')">Месяц</button>
          <button class="filter-btn${_anPeriod==='range'?' active':''}" onclick="_anSetPeriod('range')">Период (даты)</button>
        </div>
      </div>
      ${_anPeriod==='month' ? `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
          <button class="btn btn-ghost btn-sm" onclick="_anShiftMonth(-1)">‹</button>
          <input type="month" id="an-month" value="${_anMonth}" onchange="_anMonth=this.value;renderAnalytics()" style="max-width:160px">
          <button class="btn btn-ghost btn-sm" onclick="_anShiftMonth(1)">›</button>
          <span class="text-m">${_anMonthLabel()}</span>
        </div>
      ` : `
        <div class="form-grid" style="margin-bottom:12px">
          <div class="form-group"><label>Дата от</label><input type="date" id="an-from" value="${_anFrom}" onchange="_anFrom=this.value"></div>
          <div class="form-group"><label>Дата до</label><input type="date" id="an-to" value="${_anTo}" onchange="_anTo=this.value"></div>
        </div>
      `}
      <button class="btn btn-accent" onclick="_anGenerateReport()">📊 Сформировать отчёт</button>
    </div>

    <div id="an-report-area">
      ${_anReportData ? '' : `<div class="card"><div class="empty"><p>Выберите период и нажмите «Сформировать отчёт»</p></div></div>`}
    </div>
  `;
  if (_anReportData) _anRenderReport();
}

function _anSetPeriod(p){ _anPeriod = p; renderAnalytics(); }
function _anShiftMonth(dir){
  const [y,m] = _anMonth.split('-').map(Number);
  const d = new Date(y, m-1+dir, 1);
  _anMonth = d.toISOString().substr(0,7);
  renderAnalytics();
}

async function _anGenerateReport(){
  if (_anPeriod === 'range'){
    _anFrom = v('an-from') || _anFrom;
    _anTo = v('an-to') || _anTo;
  }
  const {from, to} = _anRange();
  document.getElementById('an-report-area').innerHTML = `<div class="card"><div class="spinner">${t('loading')}</div></div>`;

  const [{data:allOrders}, {data:appts}] = await Promise.all([
    db.from('orders').select('*, patients(name)').is('deleted_at', null),
    db.from('appointments').select('*, patients(name)').is('deleted_at', null).eq('status','завершён')
      .gte('date', from).lte('date', to).order('date')
  ]);

  const orders = (allOrders||[]).filter(o => {
    const d = _anOrderDate(o);
    return d >= from && d <= to;
  }).sort((a,b)=> _anOrderDate(b).localeCompare(_anOrderDate(a)));

  _anReportData = {from, to, orders, appts: appts||[]};
  _anRenderReport();
}

function _anFilteredOrders(){
  const list = _anReportData.orders;
  if (_anOrderTypeFilter==='glasses') return list.filter(o=>!_anIsCL(o));
  if (_anOrderTypeFilter==='cl') return list.filter(o=>_anIsCL(o));
  return list;
}

function _anRenderReport(){
  const {from, to, orders, appts} = _anReportData;
  const loc = _lang==='sr' ? 'sr-RS' : 'ru-RU';
  const list = _anFilteredOrders();

  const glassesOrders = orders.filter(o=>!_anIsCL(o));
  const clOrders = orders.filter(o=>_anIsCL(o));
  const sumGlasses = glassesOrders.reduce((s,o)=>s+orderTotal(o),0);
  const sumCL = clOrders.reduce((s,o)=>s+orderTotal(o),0);

  const apptsPaid = appts.filter(a=>(+a.consultation_price||0)>0);
  const apptsFree = appts.filter(a=>!(+a.consultation_price||0));
  const sumAppts = appts.reduce((s,a)=>s+(+a.consultation_price||0),0);

  document.getElementById('an-report-area').innerHTML = `
    <div class="card mb-12">
      <div class="card-header">
        <span class="card-title">🛍️ Заказы (${fmt(from)} — ${fmt(to)})</span>
        <button class="btn btn-ghost btn-sm" onclick="_anPrintReport()">🖨️ Печать отчёта</button>
      </div>
      <div class="filter-bar mb-12">
        <button class="filter-btn${_anOrderTypeFilter==='all'?' active':''}" onclick="_anOrderTypeFilter='all';_anRenderReport()">Все (${orders.length})</button>
        <button class="filter-btn${_anOrderTypeFilter==='glasses'?' active':''}" onclick="_anOrderTypeFilter='glasses';_anRenderReport()">Только очки (${glassesOrders.length})</button>
        <button class="filter-btn${_anOrderTypeFilter==='cl'?' active':''}" onclick="_anOrderTypeFilter='cl';_anRenderReport()">Только линзы (${clOrders.length})</button>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>${t('date')}</th><th>№ заказа</th><th>${t('patient')}</th><th>Тип</th>
          <th>Код / цена оправы</th><th>Линзы / цена</th><th>Работа</th>
          <th>${t('total')}</th><th>${t('status')}</th><th>Преглед</th>
        </tr></thead>
        <tbody>${list.length ? list.map(o=>`
          <tr>
            <td class="text-m">${fmt(_anOrderDate(o))}</td>
            <td><span class="badge badge-gray" style="font-size:11px">${o.order_number||'—'}</span></td>
            <td><span class="table-name" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard('${o.patient_id}')">${o.patients?.name||'—'}</span></td>
            <td class="text-m">${o.type||'—'}</td>
            <td><div class="fw-6" style="font-size:13px">${o.frame_code||'—'}</div><div class="text-sm text-m">${o.frame_price?fmtMoney(o.frame_price):'—'}</div></td>
            <td><div class="fw-6" style="font-size:13px">${o.lens_name||'—'}</div><div class="text-sm text-m">${o.lens_price?fmtMoney(o.lens_price)+' × '+(o.lens_qty||(_anIsCL(o)?1:2)):'—'}</div></td>
            <td class="text-m">${o.work_price?fmtMoney(o.work_price):'—'}</td>
            <td class="money">${fmtMoney(orderTotal(o))}</td>
            <td><span class="badge ${STATUS_BADGE[o.status]||'badge-gray'}">${statusLabel(o.status)}</span></td>
            <td style="text-align:center">${_anHadVisit(o)?'✅':''}</td>
          </tr>
        `).join('') : `<tr><td colspan="10"><div class="empty"><p>${t('no_orders')}</p></div></td></tr>`}
        </tbody>
      </table></div>
      <div class="divider"></div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div class="flex justify-between"><span class="text-m">Сумма по очкам / прочим заказам (${glassesOrders.length}):</span><span class="fw-6">${fmtMoney(sumGlasses)}</span></div>
        <div class="flex justify-between"><span class="text-m">Сумма по контактным линзам (${clOrders.length}) — не влияет на зарплату:</span><span class="fw-6">${fmtMoney(sumCL)}</span></div>
      </div>
    </div>

    <div class="card mb-12">
      <div class="card-header"><span class="card-title">👁️ Прегледы (${fmt(from)} — ${fmt(to)})</span></div>
      <div class="table-wrap"><table>
        <thead><tr><th>${t('date')}</th><th>${t('patient')}</th><th>${t('appt_type')}</th><th>${t('cost')}</th><th>Оплата</th></tr></thead>
        <tbody>${appts.length ? appts.map(a=>`
          <tr>
            <td class="text-m">${fmt(a.date)}</td>
            <td><span class="table-name" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard('${a.patient_id}')">${a.patients?.name||'—'}</span></td>
            <td class="text-m">${apptTypeName(a.type)||'—'}</td>
            <td class="money">${fmtMoney(a.consultation_price)}</td>
            <td>${(+a.consultation_price||0)>0?'<span class="badge badge-green">Платный</span>':'<span class="badge badge-gray">Бесплатный</span>'}</td>
          </tr>
        `).join('') : `<tr><td colspan="5"><div class="empty"><p>${t('no_appts_table')}</p></div></td></tr>`}
        </tbody>
      </table></div>
      <div class="divider"></div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div class="flex justify-between"><span class="text-m">Всего завершённых прегледов:</span><span class="fw-6">${appts.length}</span></div>
        <div class="flex justify-between"><span class="text-m">Платных / бесплатных:</span><span class="fw-6">${apptsPaid.length} / ${apptsFree.length}</span></div>
        <div class="flex justify-between fw-7"><span>Сумма за прегледы:</span><span style="color:var(--green)">${fmtMoney(sumAppts)}</span></div>
      </div>
    </div>

    <div class="card" id="an-salary-card">
      ${_anSalaryHtml()}
    </div>
  `;
}

function _anSalaryHtml(){
  const {orders, appts} = _anReportData;
  const glassesOrders = orders.filter(o=>!_anIsCL(o));
  const eligible = _anThresholdOn ? glassesOrders.filter(o=>orderTotal(o) > _anThresholdVal) : glassesOrders;
  const sumEligible = eligible.reduce((s,o)=>s+orderTotal(o),0);
  const salaryFromOrders = Math.round(sumEligible * _anPercent / 100);
  const salaryFromAppts = appts.reduce((s,a)=>s+(+a.consultation_price||0),0);
  const totalSalary = salaryFromOrders + salaryFromAppts;

  return `
    <div class="card-header"><span class="card-title">💰 Расчёт зарплаты</span></div>
    <div class="form-grid mb-12">
      <div class="form-group"><label>Процент с заказов (%)</label><input type="number" id="an-percent" value="${_anPercent}" min="0" max="100" step="0.5"></div>
      <div class="form-group" style="align-self:flex-end">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:500">
          <input type="checkbox" id="an-thr-on" style="width:auto" ${_anThresholdOn?'checked':''} onchange="document.getElementById('an-thr-val').disabled=!this.checked">
          Учитывать только заказы дороже:
        </label>
      </div>
      <div class="form-group"><label>Порог (дин.)</label><input type="number" id="an-thr-val" value="${_anThresholdVal}" min="0" ${_anThresholdOn?'':'disabled'}></div>
    </div>
    <button class="btn btn-primary mb-12" onclick="_anRecalcSalary()">🔄 Пересчитать</button>
    <div class="divider"></div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px">
      <div class="flex justify-between"><span class="text-m">База для % (${eligible.length} заказ(ов) ${_anThresholdOn?'дороже '+fmtMoney(_anThresholdVal):''}):</span><span class="fw-6">${fmtMoney(sumEligible)}</span></div>
      <div class="flex justify-between"><span class="text-m">${_anPercent}% от суммы заказов:</span><span class="fw-6">${fmtMoney(salaryFromOrders)}</span></div>
      <div class="flex justify-between"><span class="text-m">Стоимость прегледов (100%, ${appts.length} шт.):</span><span class="fw-6">${fmtMoney(salaryFromAppts)}</span></div>
      <div class="divider"></div>
      <div class="flex justify-between fw-7"><span>Итого к зарплате:</span><span style="color:var(--green)">${fmtMoney(totalSalary)}</span></div>
    </div>
  `;
}

async function _anRecalcSalary(){
  _anPercent = +v('an-percent') || 0;
  _anThresholdOn = !!checked('an-thr-on');
  _anThresholdVal = +v('an-thr-val') || 0;
  await Promise.all([
    db.from('settings').upsert({key:'salary_percent', value:String(_anPercent)}),
    db.from('settings').upsert({key:'salary_threshold_on', value:String(_anThresholdOn)}),
    db.from('settings').upsert({key:'salary_threshold_val', value:String(_anThresholdVal)}),
  ]);
  document.getElementById('an-salary-card').innerHTML = _anSalaryHtml();
  toast('Зарплата пересчитана ✓');
}

// ═══ PRINT REPORT ═══
function _anPrintReport(){
  if (!_anReportData) { toast('Сначала сформируйте отчёт','error'); return; }
  const {from, to, orders, appts} = _anReportData;

  const glassesOrders = orders.filter(o=>!_anIsCL(o));
  const clOrders = orders.filter(o=>_anIsCL(o));
  const sumGlasses = glassesOrders.reduce((s,o)=>s+orderTotal(o),0);
  const sumCL = clOrders.reduce((s,o)=>s+orderTotal(o),0);

  const eligible = _anThresholdOn ? glassesOrders.filter(o=>orderTotal(o) > _anThresholdVal) : glassesOrders;
  const sumEligible = eligible.reduce((s,o)=>s+orderTotal(o),0);
  const salaryFromOrders = Math.round(sumEligible * _anPercent / 100);
  const salaryFromAppts = appts.reduce((s,a)=>s+(+a.consultation_price||0),0);
  const totalSalary = salaryFromOrders + salaryFromAppts;

  const apptsPaid = appts.filter(a=>(+a.consultation_price||0)>0);
  const sumAppts = appts.reduce((s,a)=>s+(+a.consultation_price||0),0);

  const ordersRows = orders.length ? orders.map(o=>`
    <tr>
      <td>${fmt(_anOrderDate(o))}</td>
      <td>${o.order_number||'—'}</td>
      <td>${o.patients?.name||'—'}</td>
      <td>${o.type||'—'}</td>
      <td>${o.frame_code||'—'} / ${o.frame_price?fmtMoney(o.frame_price):'—'}</td>
      <td>${o.lens_name||'—'} / ${o.lens_price?fmtMoney(o.lens_price):'—'}</td>
      <td>${o.work_price?fmtMoney(o.work_price):'—'}</td>
      <td><b>${fmtMoney(orderTotal(o))}</b></td>
      <td>${statusLabel(o.status)}</td>
      <td>${_anHadVisit(o)?'✓':''}</td>
    </tr>`).join('') : '<tr><td colspan="10" style="text-align:center;color:#999">Нет заказов</td></tr>';

  const apptsRows = appts.length ? appts.map(a=>`
    <tr>
      <td>${fmt(a.date)}</td>
      <td>${a.patients?.name||'—'}</td>
      <td>${apptTypeName(a.type)||'—'}</td>
      <td>${fmtMoney(a.consultation_price)}</td>
      <td>${(+a.consultation_price||0)>0?'Платный':'Бесплатный'}</td>
    </tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:#999">Нет прегледов</td></tr>';

  const html = `<div class="print-card">
    <div class="pc-bar"></div>
    <div class="pc-header">
      <div>
        <div class="pc-doctor">Ana Novoselova</div>
        <div class="pc-doctor-sub">Optometrista · Novi Sad, Srbija · Optika Ginter</div>
      </div>
      <div class="pc-meta">
        <div class="pc-meta-num">Отчёт по аналитике</div>
        <div>${fmt(from)} — ${fmt(to)}</div>
      </div>
    </div>
    <div class="pc-title">Отчёт за период ${fmt(from)} — ${fmt(to)}</div>

    <div class="pc-sec">
      <div class="pc-sec-label">Заказы (${orders.length})</div>
      <table class="pc-table" style="font-size:7.5pt">
        <tr><th>Дата</th><th>№ заказа</th><th>Пациент</th><th>Тип</th><th>Оправа</th><th>Линзы</th><th>Работа</th><th>Итого</th><th>Статус</th><th>Преглед</th></tr>
        ${ordersRows}
      </table>
      <div style="margin-top:6pt;font-size:8.5pt">
        <div><b>Сумма по очкам / прочим заказам</b> (${glassesOrders.length}): ${fmtMoney(sumGlasses)}</div>
        <div><b>Сумма по контактным линзам</b> (${clOrders.length}, не в зарплате): ${fmtMoney(sumCL)}</div>
      </div>
    </div>

    <div class="pc-sec">
      <div class="pc-sec-label">Прегледы (${appts.length})</div>
      <table class="pc-table" style="font-size:8pt">
        <tr><th>Дата</th><th>Пациент</th><th>Тип</th><th>Цена</th><th>Оплата</th></tr>
        ${apptsRows}
      </table>
      <div style="margin-top:6pt;font-size:8.5pt">
        <div>Всего: ${appts.length}, платных: ${apptsPaid.length}. Сумма: ${fmtMoney(sumAppts)}</div>
      </div>
    </div>

    <div class="pc-sec">
      <div class="pc-sec-label">Расчёт зарплаты</div>
      <div style="font-size:9pt;line-height:1.8">
        <div>База для % (${eligible.length} заказ(ов)${_anThresholdOn?' дороже '+fmtMoney(_anThresholdVal):''}): ${fmtMoney(sumEligible)}</div>
        <div>${_anPercent}% от суммы заказов: ${fmtMoney(salaryFromOrders)}</div>
        <div>Стоимость прегледов (100%): ${fmtMoney(salaryFromAppts)}</div>
        <div style="font-weight:800;font-size:11pt;color:#1B4F72;margin-top:4pt">Итого к зарплате: ${fmtMoney(totalSalary)}</div>
      </div>
    </div>

    <div class="pc-footer">
      <div class="pc-note">Сформировано автоматически в CRM Optike Ginter. Конфиденциально.</div>
    </div>
  </div>`;

  _openPrintWindow('Отчёт ' + fmt(from) + ' — ' + fmt(to), html);
}
