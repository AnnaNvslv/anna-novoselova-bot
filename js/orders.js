// ═══ ORDERS ═══

// ── полный список полей рецепта — ОБЪЯВЛЕН ПЕРВЫМ ──
var RX_SELECT_FIELDS = 'id,visit_number,created_at,appointment_number,' +
  'rx_far_enabled,rx_comp_enabled,rx_near_enabled,rx_cl_enabled,' +
  'rx_far_od_sph,rx_far_od_cyl,rx_far_od_ax,rx_far_od_pd,' +
  'rx_far_os_sph,rx_far_os_cyl,rx_far_os_ax,rx_far_os_pd,' +
  'rx_comp_od_sph,rx_comp_od_cyl,rx_comp_od_ax,rx_comp_od_pd,rx_comp_od_add,' +
  'rx_comp_os_sph,rx_comp_os_cyl,rx_comp_os_ax,' +
  'rx_near_od_sph,rx_near_od_cyl,rx_near_od_ax,rx_near_od_pd,rx_near_od_add,' +
  'rx_near_os_sph,rx_near_os_cyl,rx_near_os_ax,' +
  'rx_cl_od_sph,rx_cl_od_cyl,rx_cl_od_ax,rx_cl_od_bc,rx_cl_od_dia,rx_cl_od_type,' +
  'rx_cl_os_sph,rx_cl_os_cyl,rx_cl_os_ax';

// Нет данных по типу рецепта? Показываем всё равно — лучше лишнее чем потеря
function _hasRx(e, type) {
  // Показываем любое обследование — пусть выбирает врач
  return true;
}

// Строка диоптрий — полная, OD и OS с Cyl/Ax + PD/ADD/Degr
function _rxDioptStr(e, type) {
  if(!e) return '';
  const nz = (v) => (v && v !== '0.00' && v !== '0') ? v : null;
  const seg = (sph, cyl, ax) => {
    const s = nz(sph); const c = nz(cyl); const a = nz(ax);
    if(!s && !c) return null;
    let r = s||'—'; if(c) r += ' / '+c; if(a) r += ' ax'+a;
    return r;
  };
  let parts = [];
  if(type==='far') {
    const od = seg(e.rx_far_od_sph, e.rx_far_od_cyl, e.rx_far_od_ax);
    const os = seg(e.rx_far_os_sph, e.rx_far_os_cyl, e.rx_far_os_ax);
    if(od) parts.push('OD '+od); if(os) parts.push('OS '+os);
    if(nz(e.rx_far_od_pd))  parts.push('PD '+e.rx_far_od_pd);
    if(nz(e.rx_far_os_pd))  parts.push('ADD '+e.rx_far_os_pd);
  } else if(type==='comp') {
    const od = seg(e.rx_comp_od_sph, e.rx_comp_od_cyl, e.rx_comp_od_ax);
    const os = seg(e.rx_comp_os_sph, e.rx_comp_os_cyl, e.rx_comp_os_ax);
    if(od) parts.push('OD '+od); if(os) parts.push('OS '+os);
    if(nz(e.rx_comp_od_pd))  parts.push('PD '+e.rx_comp_od_pd);
    if(nz(e.rx_comp_od_add)) parts.push('ADD '+e.rx_comp_od_add);
  } else if(type==='near') {
    const od = seg(e.rx_near_od_sph, e.rx_near_od_cyl, e.rx_near_od_ax);
    const os = seg(e.rx_near_os_sph, e.rx_near_os_cyl, e.rx_near_os_ax);
    if(od) parts.push('OD '+od); if(os) parts.push('OS '+os);
    if(nz(e.rx_near_od_pd))  parts.push('PD '+e.rx_near_od_pd);
    if(nz(e.rx_near_od_add)) parts.push('Degr '+e.rx_near_od_add);
  } else if(type==='cl') {
    const od = seg(e.rx_cl_od_sph, e.rx_cl_od_cyl, e.rx_cl_od_ax);
    const os = seg(e.rx_cl_os_sph, e.rx_cl_os_cyl, e.rx_cl_os_ax);
    if(od) parts.push('OD '+od); if(os) parts.push('OS '+os);
    if(nz(e.rx_cl_od_bc))   parts.push('BC '+e.rx_cl_od_bc);
    if(nz(e.rx_cl_od_dia))  parts.push('DIA '+e.rx_cl_od_dia);
    if(e.rx_cl_od_type) parts.push(e.rx_cl_od_type);
  }
  return parts.length ? ' — '+parts.join(' | ') : '';
}

// Текст для option
function _rxOptLabel(e, type, d) {
  const labels = {far:'Даль', comp:'Компьютер', near:'Близь', cl:'КЛ'};
  const apptNum = e.appointment_number ? e.appointment_number : ('Визит №'+(e.visit_number||'?'));
  const base = apptNum + ' ('+d+') — '+labels[type];
  const diopt = _rxDioptStr(e, type);
  return diopt ? base+diopt : base;
}

window._examCache = {};

function _rxOpts(exams, selVal){
  const opts = ['<option value="">— без рецепта —</option>'];
  (exams||[]).forEach(e => {
    window._examCache[e.id] = e;
    const d = fmt(e.created_at?.split('T')[0]);
    // Показываем все 4 типа для каждого обследования
    // Врач сам выберет нужный
    ['far','comp','near','cl'].forEach(type => {
      const val = e.id+'|'+type;
      const sel = selVal === val ? 'selected' : '';
      opts.push('<option value="'+val+'" '+sel+'>'+_rxOptLabel(e, type, d)+'</option>');
    });
  });
  return opts.join('');
}

async function renderOrders() {
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>${t('orders')}</h1>${isAdmin()?`<div class="topbar-actions"><button class="btn btn-accent" onclick="openAddOrder()" title="Оформить новый заказ">+ ${t('orders')||'Porudžbina'}</button></div>`:''}</div><div class="content"><div class="spinner">Загрузка...</div></div>`;
  const{data:orders}=await db.from('orders').select('*, patients(name,telegram_chat_id)').is('deleted_at',null).order('order_date',{ascending:false}).order('created_at',{ascending:false});
  const filtered=orderFilter==='все'?orders||[]:(orders||[]).filter(o=>o.status===orderFilter);
  document.querySelector('.content').innerHTML=`
    <div class="section-header">
      <div class="filter-bar">${['все',...ORDER_STATUSES_ALL].map(f=>`<button class="filter-btn${orderFilter===f?' active':''}" onclick="orderFilter='${f}';renderOrders()">${f==='все'?t('all'):statusLabel(f)}</button>`).join('')}</div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>${t('date')||'Datum'}</th><th>${t('patient')||'Pacijent'}</th><th>№ заказа</th><th>${t('frame')||'Okvir'} / ${t('lenses')||'Sočiva'}</th><th style="color:var(--text-l)">${t('prescription')||'Recept'}</th><th>${t('total')||'Ukupno'}</th><th>${t('promised_date')||'Rok'}</th><th>${t('status')||'Status'}</th><th>💰</th><th></th></tr></thead>
      <tbody>${filtered.map(o=>`<tr style="cursor:pointer" onclick="openOrderCard('${o.id}')" onmouseenter="this.style.background='var(--surface2)'" onmouseleave="this.style.background=''">
        <td class="text-m" onclick="event.stopPropagation()">${fmt(o.order_date||o.created_at?.split('T')[0])}</td>
        <td onclick="event.stopPropagation()"><span class="table-name" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard('${o.patient_id}')">${o.patients?.name||'—'}</span></td>
        <td><span class="badge badge-gray" style="font-size:11px">${o.order_number||'—'}</span></td>
        <td>
          <div class="fw-6" style="font-size:13.5px">${o.frame_code||'—'}</div>
          <div class="text-sm text-m">${o.lens_name||'—'}</div>
        </td>
        <td style="color:var(--text-l);font-size:12px">${o.prescription_label||'—'}</td>
        <td class="money">${fmtMoney(orderTotal(o))}</td>
        <td class="text-m">${o.promised_date?fmt(o.promised_date):'—'}</td>
        <td onclick="event.stopPropagation()">
          <select style="font-size:12px;padding:4px 8px;border-radius:6px;border:1.5px solid var(--border);background:${o.status==='выдан'?'var(--green-l)':o.status==='готов'?'var(--warn-l)':o.status==='отменен'||o.status==='возврат'?'var(--red-l)':'var(--surface2)'};font-weight:600;cursor:pointer"
            onchange="updateOrderStatus('${o.id}',this.value)">
            ${ORDER_STATUSES_ALL.map(s=>`<option ${o.status===s?'selected':''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>${o.counts_for_salary?'<span class="salary-badge">💰</span>':''}</td>
        <td onclick="event.stopPropagation()"><div class="flex gap-8">
          ${o.status==='готов'&&o.patients?.telegram_chat_id?`<button class="btn btn-ghost btn-sm btn-icon" title="Оповестить о готовности" onclick="notifyOrderReady('${o.id}')">&#128232;</button>`:''}
          ${o.status==='готов'?`<button class="btn btn-accent btn-sm" title="Выдать заказ" onclick="issueOrder('${o.id}')">Vydati</button>`:''}
          ${o.status==='выдан'&&o.patients?.telegram_chat_id?`<button class="btn btn-ghost btn-sm btn-icon" title="Отправить опрос (2 нед.)" onclick="sendFollowUpSurvey('${o.id}')">🔁</button>`:''}
          ${isAdmin()?`<button class="btn btn-ghost btn-sm btn-icon" title="Редактировать" onclick="openEditOrder('${o.id}')">&#9999;&#65039;</button><button class="btn btn-danger btn-sm btn-icon" title="Удалить" onclick="delOrder('${o.id}')">🗑</button>`:''}
        </div></td>
      </tr>`).join('')||`<tr><td colspan="10"><div class="empty"><p>${t('no_orders')}</p></div></td></tr>`}
      </tbody></table></div></div>`;
}

// ═══ ORDER CARD VIEW ═══
async function openOrderCard(id){
  const{data:o}=await db.from('orders').select('*, patients(name,telegram_chat_id)').eq('id',id).single();
  if(!o)return;
  const bal=orderBalance(o);
  const displayDate=fmt(o.order_date||o.created_at?.split('T')[0]);
  openModal(`<div class="modal modal-lg">
    <div class="modal-header">
      <div>
        <span class="modal-title">Заказ · ${o.patients?.name||'—'}</span>
        <div class="text-sm text-m mt-4">${displayDate} · <span class="badge ${STATUS_BADGE[o.status]||'badge-gray'}">${o.status}</span>${o.counts_for_salary?' · <span class="salary-badge">💰 10%</span>':''}</div>
      </div>
      <div class="flex gap-8">
        ${o.status==='готов'&&o.patients?.telegram_chat_id?`<button class="btn btn-ghost btn-sm" title="Оповестить о готовности" onclick="notifyOrderReady('${o.id}')">📨 Оповестить</button>`:''}
        ${o.status==='готов'?`<button class="btn btn-accent btn-sm" onclick="issueOrder('${o.id}');closeModal()">Выдать</button>`:''}
        ${o.status==='выдан'&&o.patients?.telegram_chat_id?`<button class="btn btn-ghost btn-sm" title="Отправить опрос (через 2 нед.)" onclick="sendFollowUpSurvey('${o.id}')">🔁 Опрос</button>`:''}
        ${isAdmin()?`<button class="btn btn-ghost btn-sm" onclick="closeModal();openEditOrder('${o.id}')">✏️ Редактировать</button>`:''}
        <button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>
      </div>
    </div>
    <div class="modal-body">
      <div class="info-grid mb-12">
        <div class="info-item"><label>№ заказа (пакет)</label><p style="font-weight:700;font-size:15px">${o.order_number||'—'}</p></div>
        <div class="info-item"><label>Тип заказа</label><p>${o.type}</p></div>
        <div class="info-item"><label>${t("prescription")||"Recept"}</label><p style="color:var(--text-m)">${o.prescription_label||'—'}</p></div>
        <div class="info-item"><label>${t("promised_date")||"Rok izrade"}</label><p>${o.promised_date?fmt(o.promised_date):'—'}</p></div>
        <div class="info-item"><label>Дата оформления</label><p>${displayDate}</p></div>
      </div>
      <div class="divider"></div>
      <div class="form-grid mb-12">
        <div class="form-group"><label>${t("frame_code")||"Šifra okvira"}</label><input value="${o.frame_code||'—'}" readonly></div>
        <div class="form-group"><label>Цена оправы</label><input value="${fmtMoney(o.frame_price)}" readonly></div>
        <div class="form-group"><label>${t("lens_name")||"Naziv sočiva"}</label><input value="${o.lens_name||'—'}" readonly></div>
        <div class="form-group"><label>Цена линз (${o.lens_qty||2} шт. × ${fmtMoney(o.lens_price)})</label><input value="${fmtMoney(orderTotal_lenses(o))}" readonly></div>
        <div class="form-group"><label>Стоимость работы</label><input value="${o.work_price?fmtMoney(o.work_price):'—'}" readonly></div>
        <div class="form-group"><label>Предоплата</label><input value="${fmtMoney(o.prepayment)}" readonly></div>
      </div>
      <div style="background:${bal>0?'var(--warn-l)':'var(--green-l)'};border:1.5px solid ${bal>0?'var(--warn)':'var(--green)'};border-radius:10px;padding:14px 18px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><div class="text-sm text-m mb-4">${t("total")||"UKUPNO"}</div><div style="font-size:22px;font-weight:800;color:var(--primary)">${fmtMoney(orderTotal(o))}</div></div>
        <div style="text-align:right"><div class="text-sm text-m mb-4">ДОПЛАТА</div><div style="font-size:22px;font-weight:800;color:${bal>0?'var(--warn)':'var(--green)'}">${fmtMoney(bal)}</div></div>
      </div>
      ${o.notes?`<div class="form-group mt-12"><label>Napomena</label><input value="${o.notes}" readonly></div>`:''}
      ${o.issued_date?`<div class="text-sm text-m mt-8">Выдан: ${fmt(o.issued_date)}</div>`:''}
    </div>
  </div>`);
}

// ═══ helpers ═══
function orderTotal_lenses(o){
  const qty = o.lens_qty ?? 2;
  return (+o.lens_price||0) * qty;
}
const _origOrderTotal = orderTotal;
orderTotal = o => (+o.frame_price||0) + orderTotal_lenses(o) + (+o.work_price||0);

// ═══ ORDER FORM ═══
function openAddOrder(){openAddOrderFor(null);}
async function openAddOrderFor(patientId){
  const[{data:patients},examResult]=await Promise.all([
    db.from('patients').select('id,name').order('name'),
    patientId
      ? db.from('examinations').select(RX_SELECT_FIELDS)
          .eq('patient_id',patientId).order('created_at',{ascending:false})
      : Promise.resolve({data:[]})
  ]);
  const exams = examResult?.data || [];
  console.log('[orders] openAddOrderFor patient='+patientId+' exams='+exams.length);
  _drawOrderForm(null, patientId, patients||[], exams);
}
async function openEditOrder(id){
  const{data:o}=await db.from('orders').select('*').eq('id',id).single();
  const[{data:patients},examResult]=await Promise.all([
    db.from('patients').select('id,name').order('name'),
    o?.patient_id
      ? db.from('examinations').select(RX_SELECT_FIELDS)
          .eq('patient_id',o.patient_id).order('created_at',{ascending:false})
      : Promise.resolve({data:[]})
  ]);
  const exams = examResult?.data || [];
  console.log('[orders] openEditOrder patient='+o?.patient_id+' exams='+exams.length);
  _drawOrderForm(o, o?.patient_id, patients||[], exams);
}

function _drawOrderForm(o, prePatient, patients, exams){
  const isEdit=!!o;
  const orderDate = o?.order_date || o?.created_at?.split('T')[0] || today();
  const lensQty = o?.lens_qty ?? 2;
  const isCL = o?.type === 'МКЛ';

  let selVal = '';
  if(o?.examination_id && o?.prescription_label) {
    const labelMap = {'Daljina':'far','Računar':'comp','Blizina':'near','KS':'cl','Даль':'far','Компьютер':'comp','Близь':'near'};
    const rxType = labelMap[o.prescription_label] || '';
    if(rxType) selVal = o.examination_id + '|' + rxType;
  }

  const rxSelectHtml = _rxOpts(exams, selVal);
  console.log('[orders] exams for dropdown:', exams.length, 'selVal:', selVal);

  openModal(`<div class="modal modal-xl">
    <div class="modal-header"><span class="modal-title">${isEdit?(t('edit_order')||'Uredi porudžbinu'):(t('new_order')||'Nova porudžbina')}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">

        <div class="form-group full">
          <div class="flex items-center justify-between mb-4"><label>${t("patient")||"Pacijent"} *</label><button class="btn btn-ghost btn-xs" onclick="toggleQuickPatient()">+ ${t("new_patient")||"Novi pacijent"}</button></div>
          <select id="o-pid" onchange="onOrderPatientChange(this.value)">
            <option value="">— izaberite —</option>
            ${patients.map(p=>`<option value="${p.id}" ${(o?.patient_id||prePatient)===p.id?'selected':''}>${p.name}</option>`).join('')}
          </select>
          <div id="quick-patient-form" style="display:none;background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;padding:12px;margin-top:8px">
            <div style="font-size:12.5px;font-weight:700;color:var(--accent);margin-bottom:8px">Быстрое добавление пациента</div>
            <div class="form-grid">
              <div class="form-group full"><label>ФИО *</label><input id="qp-name" placeholder="Иванова Мария Петровна"></div>
              <div class="form-group"><label>Телефон</label><input id="qp-phone"></div>
              <div class="form-group"><label>Email</label><input id="qp-email"></div>
              <div class="form-group"><label>Telegram @username</label><input id="qp-tg" placeholder="@username"></div>
            </div>
            <div class="flex gap-8 mt-8">
              <button class="btn btn-accent btn-sm" onclick="saveQuickPatient()">Сохранить и выбрать</button>
              <button class="btn btn-ghost btn-sm" onclick="toggleQuickPatient()">${t("cancel")||"Otkaži"}</button>
            </div>
          </div>
        </div>

        <div class="form-group full">
          <div class="flex items-center justify-between mb-4"><label>${t("prescription")||"Recept"} ${exams.length?'('+exams.length+' обслед.)':''}</label><button class="btn btn-ghost btn-xs" onclick="toggleQuickRx()">+ Recept</button></div>
          <select id="o-rx" onchange="showRxPreview(this.value)">${rxSelectHtml}</select>
          <div id="o-rx-preview" style="margin-top:8px;font-size:12.5px;color:var(--text-m);background:var(--surface2);border-radius:6px;padding:8px 12px;display:none;line-height:1.8"></div>
          <div id="quick-rx-form" style="display:none;background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;padding:12px;margin-top:8px">
            <div style="font-size:12.5px;font-weight:700;color:var(--accent);margin-bottom:8px">Brzi unos recepta</div>
            <div class="form-grid">
              <div class="form-group"><label>Vrsta</label>
                <select id="qrx-type" onchange="updateQuickRxFields()">
                  <option value="far">Naočare za daljinu</option>
                  <option value="comp">Naočare za računar</option>
                  <option value="near">Naočare za blizinu</option>
                  <option value="cl">KS</option>
                </select>
              </div>
              <div class="form-group" style="align-self:flex-end">
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:500">
                  <input type="checkbox" id="qrx-own" style="width:auto"> Vlastiti recept
                </label>
              </div>
            </div>
            <div id="qrx-fields" style="margin-top:10px">
              <table class="rx-table" style="margin-bottom:8px">
                <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th></tr>
                <tr><td>OD</td><td><input id="qrx-od-sph" style="min-width:52px;text-align:center"></td><td><input id="qrx-od-cyl" style="min-width:52px;text-align:center"></td><td><input id="qrx-od-ax" style="min-width:52px;text-align:center"></td></tr>
                <tr><td>OS</td><td><input id="qrx-os-sph" style="min-width:52px;text-align:center"></td><td><input id="qrx-os-cyl" style="min-width:52px;text-align:center"></td><td><input id="qrx-os-ax" style="min-width:52px;text-align:center"></td></tr>
              </table>
              <div class="flex gap-8" id="qrx-shared-fields">
                <div class="form-group" style="max-width:80px"><label id="qrx-pd-label">PD</label><input id="qrx-pd" style="text-align:center"></div>
                <div class="form-group" style="max-width:80px" id="qrx-add-wrap"><label id="qrx-add-label">ADD</label><input id="qrx-add" style="text-align:center"></div>
                <div class="form-group" style="max-width:80px;display:none" id="qrx-dia-wrap"><label>DIA</label><input id="qrx-dia" style="text-align:center"></div>
              </div>
              <div class="form-group mt-8" id="qrx-cl-type-wrap" style="display:none"><label>Вид МКЛ</label><input id="qrx-cl-type" placeholder="однодневные, ежемесячные..."></div>
              <div class="form-group mt-8"><label>Napomena</label><input id="qrx-note"></div>
            </div>
            <div class="flex gap-8 mt-10">
              <button class="btn btn-accent btn-sm" onclick="saveQuickRx()">Sačuvaj recept</button>
              <button class="btn btn-ghost btn-sm" onclick="toggleQuickRx()">${t("cancel")||"Otkaži"}</button>
            </div>
          </div>
        </div>

        <div class="form-group"><label>№ заказа (с пакета)</label><input id="o-ordernum" value="${o?.order_number||''}" placeholder="напр. 12345"></div>
        <div class="form-group"><label>Дата оформления</label><input type="date" id="o-orderdate" value="${orderDate}"></div>

        <div class="form-group"><label>Vrsta porudžbine *</label>
          <select id="o-type" onchange="onOrderTypeChange(this.value)">
            <option value="Очки" ${!o||o?.type==='Очки'?'selected':''}>Naočare</option>
            <option value="МКЛ" ${o?.type==='МКЛ'?'selected':''}>KS (kontaktna sočiva)</option>
            <option value="Ремонт" ${o?.type==='Ремонт'?'selected':''}>Popravka</option>
            <option value="Другое" ${o?.type==='Другое'?'selected':''}>Ostalo</option>
          </select>
        </div>
        ${isEdit?`<div class="form-group"><label>Статус</label>
          <select id="o-status">${ORDER_STATUSES_ALL.map(s=>`<option ${o?.status===s?'selected':''}>${s}</option>`).join('')}</select>
        </div>`:'<div></div>'}

        <div class="form-group full" style="display:grid;grid-template-columns:1fr 1.6fr;gap:12px;align-items:flex-start">
          <div class="form-group"><label>${t("frame_code")||"Šifra okvira"}</label><input id="o-fcode" value="${o?.frame_code||''}"></div>
          <div class="form-group">
            <label>${t("frame")||"Okvir"} (din.)</label>
            <div style="display:grid;grid-template-columns:1fr 60px 1fr;gap:6px;align-items:flex-end">
              <div><label style="font-size:10.5px;color:var(--text-l)">Osnovna</label><input type="number" id="o-fprice" value="${o?.frame_price||''}" min="0" placeholder="0" onfocus="if(+this.value===0)this.value=''" onblur="if(this.value==='')this.value=0" oninput="recalcOrder()"></div>
              <div><label style="font-size:10.5px;color:var(--text-l)">Popust %</label><input type="number" id="o-fdisc" value="0" min="0" max="100" placeholder="0" onfocus="if(+this.value===0)this.value=''" onblur="if(this.value==='')this.value=0" oninput="recalcOrder()"></div>
              <div><label style="font-size:10.5px;color:var(--green);font-weight:700">Nakon popusta</label><input type="number" id="o-fprice-final" value="${o?.frame_price||0}" min="0" readonly style="background:var(--green-l);font-weight:700"></div>
            </div>
          </div>
        </div>

        <div class="form-group full" style="display:grid;grid-template-columns:1fr 1.6fr;gap:12px;align-items:flex-start">
          <div class="form-group"><label>${t("lens_name")||"Naziv sočiva"}</label><input id="o-lname" value="${o?.lens_name||''}"></div>
          <div class="form-group">
            <label id="o-lens-label">${isCL?'Стоимость МКЛ (1 уп.)':t("lenses")||"Sočiva / kom"} (din.)</label>
            <div style="display:grid;grid-template-columns:1fr 60px ${isCL?'':'80px '}1fr;gap:6px;align-items:flex-end">
              <div><label style="font-size:10.5px;color:var(--text-l)">Osnovna</label><input type="number" id="o-lprice" value="${o?.lens_price||''}" min="0" placeholder="0" onfocus="if(+this.value===0)this.value=''" onblur="if(this.value==='')this.value=0" oninput="recalcOrder()"></div>
              <div><label style="font-size:10.5px;color:var(--text-l)">Popust %</label><input type="number" id="o-ldisc" value="0" min="0" max="100" placeholder="0" onfocus="if(+this.value===0)this.value=''" onblur="if(this.value==='')this.value=0" oninput="recalcOrder()"></div>
              ${isCL?'':`<div id="o-lqty-wrap"><label style="font-size:10.5px;color:var(--text-l)">Кол-во шт.</label>
                <select id="o-lqty" onchange="recalcOrder()" style="padding:8px 4px">
                  <option value="2" ${lensQty!==1?'selected':''}>2 шт.</option>
                  <option value="1" ${lensQty===1?'selected':''}>1 шт.</option>
                </select>
              </div>`}
              <div><label style="font-size:10.5px;color:var(--green);font-weight:700" id="o-lens-result-label">${isCL?'Стоимость':'× кол-во'}</label><input type="number" id="o-lprice-final" value="${isCL?o?.lens_price||0:(o?.lens_price||0)*lensQty}" min="0" readonly style="background:var(--green-l);font-weight:700"></div>
            </div>
          </div>
        </div>

        <div class="form-group"><label>${t("work")||"Obrada"} (din.)</label><input type="number" id="o-wprice" value="${o?.work_price||''}" min="0" placeholder="0" onfocus="if(+this.value===0)this.value=''" onblur="if(this.value==='')this.value=''" oninput="recalcOrder()"></div>
        <div class="form-group"><label>${t("prepayment")||"Avans"} (din.)</label><input type="number" id="o-prepay" value="${o?.prepayment||''}" min="0" placeholder="0" onfocus="if(+this.value===0)this.value=''" onblur="if(this.value==='')this.value=0" oninput="recalcOrder()"></div>
        <div class="form-group"><label>${t("promised_date")||"Rok izrade"}</label><input type="date" id="o-pdate" value="${o?.promised_date||''}"></div>
        <div class="form-group" style="align-self:flex-end">
          <div style="background:var(--accent-l);border:2px solid var(--accent);border-radius:10px;padding:12px 16px">
            <div style="font-size:10px;color:var(--accent-h);font-weight:700;letter-spacing:.5px;margin-bottom:3px">${t("total")||"UKUPNO"}</div>
            <div id="o-total-display" style="font-size:22px;font-weight:800;color:var(--primary);letter-spacing:-1px">${fmtMoney((o?.frame_price||0)+(o?.lens_price||0)*lensQty+(o?.work_price||0))}</div>
            <div id="o-balance-display" style="font-size:11px;color:var(--accent-h);margin-top:3px;font-weight:600">${t('balance')||'Ostatak'}: ${fmtMoney(Math.max((o?.frame_price||0)+(o?.lens_price||0)*lensQty+(o?.work_price||0)-(o?.prepayment||0),0))}</div>
          </div>
        </div>
        <div class="form-group full"><label>Napomena</label><textarea id="o-notes">${o?.notes||''}</textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">${t("cancel")||"Otkaži"}</button>
      <button class="btn btn-accent" onclick="saveOrder('${o?.id||''}')">${t("save")||"Sačuvaj"}</button>
    </div>
  </div>`);

  if(selVal) setTimeout(()=>showRxPreview(selVal), 100);
}

function onOrderTypeChange(type){
  const isCL = type === 'МКЛ';
  const lensLabel = document.getElementById('o-lens-label');
  const lensResultLabel = document.getElementById('o-lens-result-label');
  const qtyWrap = document.getElementById('o-lqty-wrap');
  if(lensLabel) lensLabel.textContent = isCL ? 'Стоимость МКЛ (1 уп.) (din.)' : ((t('lenses')||'Sočiva / kom')+' (din.)');
  if(lensResultLabel) lensResultLabel.textContent = isCL ? 'Стоимость' : '× кол-во';
  if(qtyWrap) qtyWrap.style.display = isCL ? 'none' : '';
  recalcOrder();
}

// ═══ QUICK ADD in ORDER ═══
function toggleQuickPatient(){
  const f=document.getElementById('quick-patient-form');
  f.style.display=f.style.display==='none'?'block':'none';
  if(f.style.display==='block') document.getElementById('qp-name')?.focus();
}
function toggleQuickRx(){
  const f=document.getElementById('quick-rx-form');
  f.style.display=f.style.display==='none'?'block':'none';
}
function updateQuickRxFields(){
  const type=document.getElementById('qrx-type')?.value;
  const addWrap=document.getElementById('qrx-add-wrap');
  const diaWrap=document.getElementById('qrx-dia-wrap');
  const clWrap=document.getElementById('qrx-cl-type-wrap');
  const addLabel=document.getElementById('qrx-add-label');
  const pdLabel=document.getElementById('qrx-pd-label');
  if(type==='cl'){
    pdLabel.textContent='BC'; addLabel.textContent='DIA';
    diaWrap.style.display='none'; clWrap.style.display='block';
  } else if(type==='near'){
    pdLabel.textContent='PD'; addLabel.textContent='Degr';
    diaWrap.style.display='none'; clWrap.style.display='none';
  } else {
    pdLabel.textContent='PD'; addLabel.textContent='ADD';
    diaWrap.style.display='none'; clWrap.style.display='none';
  }
  addWrap.style.display='block';
}
async function saveQuickPatient(){
  const name=v('qp-name'); if(!name){alert('Введите ФИО');return;}
  const{data:np}=await db.from('patients').insert({name,phone:v('qp-phone'),email:v('qp-email'),telegram_username:v('qp-tg')}).select().single();
  if(!np){toast('Ошибка сохранения','error');return;}
  const sel=document.getElementById('o-pid');
  const opt=document.createElement('option');
  opt.value=np.id; opt.textContent=np.name; opt.selected=true;
  sel.appendChild(opt); sel.value=np.id;
  toggleQuickPatient();
  toast('Пациент '+np.name+' добавлен ✓');
  await onOrderPatientChange(np.id);
}
async function saveQuickRx(){
  const pid=v('o-pid'); if(!pid){alert('Сначала выберите пациента');return;}
  const type=document.getElementById('qrx-type')?.value||'far';
  const isOwn=document.getElementById('qrx-own')?.checked;
  const{count}=await db.from('examinations').select('id',{count:'exact',head:true}).eq('patient_id',pid);
  const visitNum=(count||0)+1;
  const note=(isOwn?'Vlastiti recept. ':'')+v('qrx-note');
  const rxData={patient_id:pid,visit_number:visitNum,recommendations:note||null,rx_far_enabled:type==='far',rx_comp_enabled:type==='comp',rx_near_enabled:type==='near',rx_cl_enabled:type==='cl'};
  if(type==='far'||type==='comp'){
    const pre=type==='far'?'rx_far':'rx_comp';
    rxData[pre+'_od_sph']=v('qrx-od-sph');rxData[pre+'_od_cyl']=v('qrx-od-cyl');rxData[pre+'_od_ax']=v('qrx-od-ax');
    rxData[pre+'_os_sph']=v('qrx-os-sph');rxData[pre+'_os_cyl']=v('qrx-os-cyl');rxData[pre+'_os_ax']=v('qrx-os-ax');
    rxData[pre+'_od_pd']=v('qrx-pd');
    if(type==='far') rxData.rx_far_os_pd=v('qrx-add'); else rxData.rx_comp_od_add=v('qrx-add');
  } else if(type==='near'){
    rxData.rx_near_od_sph=v('qrx-od-sph');rxData.rx_near_od_cyl=v('qrx-od-cyl');rxData.rx_near_od_ax=v('qrx-od-ax');
    rxData.rx_near_os_sph=v('qrx-os-sph');rxData.rx_near_os_cyl=v('qrx-os-cyl');rxData.rx_near_os_ax=v('qrx-os-ax');
    rxData.rx_near_od_pd=v('qrx-pd');rxData.rx_near_od_add=v('qrx-add');
  } else if(type==='cl'){
    rxData.rx_cl_od_sph=v('qrx-od-sph');rxData.rx_cl_od_cyl=v('qrx-od-cyl');rxData.rx_cl_od_ax=v('qrx-od-ax');
    rxData.rx_cl_os_sph=v('qrx-os-sph');rxData.rx_cl_os_cyl=v('qrx-os-cyl');rxData.rx_cl_os_ax=v('qrx-os-ax');
    rxData.rx_cl_od_bc=v('qrx-pd');rxData.rx_cl_od_dia=v('qrx-add');rxData.rx_cl_od_type=v('qrx-cl-type');
  }
  const{data:ne}=await db.from('examinations').insert(rxData).select().single();
  if(!ne){toast('Ошибка сохранения рецепта','error');return;}
  window._examCache[ne.id]=ne;
  const sel=document.getElementById('o-rx');
  ['far','comp','near','cl'].forEach(tp => {
    const opt=document.createElement('option');
    const val=ne.id+'|'+tp;
    opt.value=val;
    opt.textContent=_rxOptLabel(ne,tp,fmt(today()));
    if(tp===type){ opt.selected=true; }
    sel.appendChild(opt);
  });
  sel.value=ne.id+'|'+type;
  toggleQuickRx();
  toast('Рецепт сохранён ✓');
  await showRxPreview(ne.id+'|'+type);
}
async function onOrderPatientChange(pid){
  if(!pid){ document.getElementById('o-rx').innerHTML='<option value="">— без рецепта —</option>'; return; }
  const{data:exams}=await db.from('examinations').select(RX_SELECT_FIELDS)
    .eq('patient_id',pid).order('created_at',{ascending:false});
  console.log('[orders] onOrderPatientChange pid='+pid+' exams=', exams?.length, exams);
  (exams||[]).forEach(e=>{window._examCache[e.id]=e;});
  document.getElementById('o-rx').innerHTML=_rxOpts(exams||[]);
  document.getElementById('o-rx-preview').style.display='none';
}
async function showRxPreview(val){
  const prev=document.getElementById('o-rx-preview');
  if(!val){prev.style.display='none';return;}
  const[examId,type]=val.split('|');
  if(!examId||!type){prev.style.display='none';return;}
  let e=window._examCache?.[examId];
  if(!e){
    const{data:ed}=await db.from('examinations').select(RX_SELECT_FIELDS).eq('id',examId).single();
    e=ed;
    if(e) window._examCache[e.id]=e;
  }
  if(!e){prev.style.display='none';return;}

  const nz = v => (v && v !== '0.00' && v !== '0') ? v : null;
  const row = (eye, sph, cyl, ax) => {
    let s = `<b>${eye}:</b> ${nz(sph)||'—'}`;
    const c = nz(cyl); const a = nz(ax);
    if(c) s += ' / '+c; if(a) s += ' ax'+a;
    return s;
  };

  let html = '';
  if(type==='far') {
    html = row('OD', e.rx_far_od_sph, e.rx_far_od_cyl, e.rx_far_od_ax) + ' &nbsp;&nbsp; ' +
           row('OS', e.rx_far_os_sph, e.rx_far_os_cyl, e.rx_far_os_ax);
    if(nz(e.rx_far_od_pd))  html += ' &nbsp; <b>PD:</b> ' + e.rx_far_od_pd;
    if(nz(e.rx_far_os_pd))  html += ' &nbsp; <b>ADD:</b> ' + e.rx_far_os_pd;
  } else if(type==='comp') {
    html = row('OD', e.rx_comp_od_sph, e.rx_comp_od_cyl, e.rx_comp_od_ax) + ' &nbsp;&nbsp; ' +
           row('OS', e.rx_comp_os_sph, e.rx_comp_os_cyl, e.rx_comp_os_ax);
    if(nz(e.rx_comp_od_pd))  html += ' &nbsp; <b>PD:</b> '  + e.rx_comp_od_pd;
    if(nz(e.rx_comp_od_add)) html += ' &nbsp; <b>ADD:</b> ' + e.rx_comp_od_add;
  } else if(type==='near') {
    html = row('OD', e.rx_near_od_sph, e.rx_near_od_cyl, e.rx_near_od_ax) + ' &nbsp;&nbsp; ' +
           row('OS', e.rx_near_os_sph, e.rx_near_os_cyl, e.rx_near_os_ax);
    if(nz(e.rx_near_od_pd))  html += ' &nbsp; <b>PD:</b> '   + e.rx_near_od_pd;
    if(nz(e.rx_near_od_add)) html += ' &nbsp; <b>Degr:</b> ' + e.rx_near_od_add;
  } else if(type==='cl') {
    html = row('OD', e.rx_cl_od_sph, e.rx_cl_od_cyl, e.rx_cl_od_ax) + ' &nbsp;&nbsp; ' +
           row('OS', e.rx_cl_os_sph, e.rx_cl_os_cyl, e.rx_cl_os_ax);
    if(nz(e.rx_cl_od_bc))   html += ' &nbsp; <b>BC:</b> '  + e.rx_cl_od_bc;
    if(nz(e.rx_cl_od_dia))  html += ' &nbsp; <b>DIA:</b> ' + e.rx_cl_od_dia;
    if(e.rx_cl_od_type) html += ' &nbsp; ' + e.rx_cl_od_type;
  }
  prev.innerHTML = html || '(нет данных)';
  prev.style.display = 'block';
}
function recalcOrder(){
  const fBase=+document.getElementById('o-fprice')?.value||0;
  const fDisc=Math.min(Math.max(+document.getElementById('o-fdisc')?.value||0,0),100);
  const fFinal=Math.round(fBase*(1-fDisc/100));
  if(document.getElementById('o-fprice-final')) document.getElementById('o-fprice-final').value=fFinal;
  const lBase=+document.getElementById('o-lprice')?.value||0;
  const lDisc=Math.min(Math.max(+document.getElementById('o-ldisc')?.value||0,0),100);
  const lPer=Math.round(lBase*(1-lDisc/100));
  const orderType=document.getElementById('o-type')?.value||'Очки';
  const isCL=orderType==='МКЛ';
  const qty=isCL?1:+(document.getElementById('o-lqty')?.value||2);
  const lFinal=lPer*qty;
  if(document.getElementById('o-lprice-final')) document.getElementById('o-lprice-final').value=lFinal;
  const work=+document.getElementById('o-wprice')?.value||0;
  const prepay=+document.getElementById('o-prepay')?.value||0;
  const total=fFinal+lFinal+work;
  const balance=Math.max(total-prepay,0);
  if(document.getElementById('o-total-display')) document.getElementById('o-total-display').textContent=total.toLocaleString('ru-RU')+' дин.';
  if(document.getElementById('o-balance-display')) document.getElementById('o-balance-display').textContent=(t('balance')||'Ostatak')+': '+balance.toLocaleString('ru-RU')+' din.';
}
function applyDiscount(){}
function calcTotal(){}
async function saveOrder(id){
  const patient_id=v('o-pid');if(!patient_id){alert('Выберите пациента');return;}
  const rxSel=document.getElementById('o-rx')?.value||'';
  const[examId,rxType]=rxSel.split('|');
  const rxLabels={far:'Daljina',comp:'Računar',near:'Blizina',cl:'KS'};
  const fFinal=Math.max(+(document.getElementById('o-fprice-final')?.value||v('o-fprice'))||0,0);
  const lPriceFinal=Math.max(+(document.getElementById('o-lprice-final')?.value)||0,0);
  const orderType=v('o-type');
  const isCL=orderType==='МКЛ';
  const qty=isCL?1:+(document.getElementById('o-lqty')?.value||2);
  const lPerPiece=qty>0?Math.round(lPriceFinal/qty):lPriceFinal;
  const orderDate=v('o-orderdate')||today();
  const data={patient_id,type:orderType,prescription_label:rxType?rxLabels[rxType]:null,examination_id:examId||null,
    order_number:v('o-ordernum')||null,order_date:orderDate,
    frame_code:v('o-fcode'),frame_price:fFinal,
    lens_name:v('o-lname'),lens_price:lPerPiece,lens_qty:qty,
    work_price:v('o-wprice')?Math.max(+v('o-wprice'),0):null,
    prepayment:Math.max(+v('o-prepay')||0,0),
    promised_date:v('o-pdate')||null,notes:v('o-notes')};
  if(id){
    const st=v('o-status');
    await db.from('orders').update({...data,status:st}).eq('id',id);
    toast('Заказ обновлён');
  } else {
    await db.from('orders').insert({...data,status:'оформлен'});
    toast('Заказ оформлен');
  }
  await recalcSalary(patient_id);
  closeModal();render();
}
async function updateOrderStatus(id,status){
  const updates={status};
  if(status==='готов') updates.ready_date=today();
  if(status==='выдан') updates.issued_date=today();
  await db.from('orders').update(updates).eq('id',id);
  toast('Статус: '+status);
  render();
}
async function issueOrder(id){
  const{data:o}=await db.from('orders').select('*').eq('id',id).single();
  const bal=orderBalance(o);
  if(bal>0&&!confirm('Остаток '+fmtMoney(bal)+'. Выдать?'))return;
  await db.from('orders').update({status:'выдан',issued_date:today()}).eq('id',id);
  toast('Выдан ✓');render();
}
async function notifyOrderReady(id){
  const{data:o}=await db.from('orders').select('*, patients(name,telegram_chat_id)').eq('id',id).single();
  if(!o?.patients?.telegram_chat_id){toast('Нет Telegram у пациента','error');return;}
  const bal=orderBalance(o);
  const paymentText=bal>0?'Ostatak po vašoj porudžbini: '+fmtMoney(bal)+'.\nPlačanje karticom ili gotovinom.':'Заказ полностью оплачен.';
  const msg='Здравствуйте!\n\nОчки для '+o.patients.name+' готовы!\n\n'+paymentText+'\n\nВы можете забрать их в любое удобное для вас время.\n\nРежим работы оптики Ginter:\nпо будням — с 09:00 до 19:00\nсуббота — с 09:00 до 13:00\nвоскресенье — выходной.\n\nЕсли возникнут вопросы или дискомфорт при ношении — обращайтесь к Анне @AnnaNvslv. Всё можно решить 😊\n\nДоброго дня!';
  const ok=await tgSend(o.patients.telegram_chat_id,msg);
  toast(ok?'📨 Отправлено':'Ошибка отправки',ok?'success':'error');
}
async function sendFollowUpSurvey(orderId){
  const{data:o}=await db.from('orders').select('*, patients(name,telegram_chat_id)').eq('id',orderId).single();
  if(!o?.patients?.telegram_chat_id){toast('Нет Telegram у пациента','error');return;}
  const firstName=o.patients.name.split(' ')[0];
  const msg='Здравствуйте, '+firstName+'! 👋\n\nПрошло две недели с тех пор, как вы получили очки. Хочу узнать, как вам носится 🙂\n\nПожалуйста, ответьте на несколько вопросов — это займёт меньше минуты.\n\n1️⃣ <b>Как вам в новых очках?</b>\n😊 Отлично\n🤔 Привыкаю\n😕 Есть вопросы\n\n2️⃣ <b>Комфортна ли посадка?</b>\n👍 Да\n👎 Нет\n\n3️⃣ <b>Как качество зрения?</b>\n👁 Отлично\n❓ Что-то смущает\n\nНапишите прямо в ответ, Анна @AnnaNvslv свяжется лично.\n\nСпасибо! 🙏';
  const ok=await tgSend(o.patients.telegram_chat_id,msg);
  toast(ok?'📨 Опрос отправлен':'Ошибка',ok?'success':'error');
}
async function delOrder(id){
  if(!confirm(t('confirm_delete_order')))return;
  await db.from('orders').update({deleted_at:new Date().toISOString()}).eq('id',id);
  toast(t('moved_to_trash')||'U korpu');render();
}
