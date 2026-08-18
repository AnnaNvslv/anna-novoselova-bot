// ═══ ORDERS ═══

var RX_SELECT_FIELDS =
  'id,visit_number,created_at,' +
  'rx_far_enabled,rx_comp_enabled,rx_near_enabled,rx_cl_enabled,' +
  'rx_far_od_sph,rx_far_od_cyl,rx_far_od_ax,rx_far_od_pd,' +
  'rx_far_os_sph,rx_far_os_cyl,rx_far_os_ax,rx_far_os_pd,' +
  'rx_comp_od_sph,rx_comp_od_cyl,rx_comp_od_ax,rx_comp_od_pd,rx_comp_od_add,' +
  'rx_comp_os_sph,rx_comp_os_cyl,rx_comp_os_ax,' +
  'rx_near_od_sph,rx_near_od_cyl,rx_near_od_ax,rx_near_od_pd,rx_near_od_add,' +
  'rx_near_os_sph,rx_near_os_cyl,rx_near_os_ax,' +
  'rx_cl_od_sph,rx_cl_od_cyl,rx_cl_od_ax,rx_cl_od_bc,rx_cl_od_dia,rx_cl_od_type,' +
  'rx_cl_os_sph,rx_cl_os_cyl,rx_cl_os_ax';

var _ordersSort = 'date_new'; // date_new | date_old | total_desc | total_asc | promised
var _allOrders = [];
var _ordersSearchQuery = '';
var _ordersExamMap = {}; // examination_id -> examination row, для отображения диоптрий рецепта в списке заказов
var RX_LABEL_TO_TYPE = {'Daljina':'far','Računar':'comp','Blizina':'near','KS':'cl'};

function _nz(val) {
  return (val != null && val !== '' && val !== '0.00' && val !== '0') ? String(val) : null;
}

function _rxDioptStr(e, type) {
  if (!e) return '';
  const seg = (sph, cyl, ax) => {
    const s = _nz(sph); const c = _nz(cyl); const a = _nz(ax);
    if (!s && !c) return null;
    let r = s||'—'; if(c) r += ' / '+c; if(a) r += ' ax'+a;
    return r;
  };
  let parts = [];
  if (type==='far') {
    const od = seg(e.rx_far_od_sph,e.rx_far_od_cyl,e.rx_far_od_ax);
    const os = seg(e.rx_far_os_sph,e.rx_far_os_cyl,e.rx_far_os_ax);
    if(od) parts.push('OD '+od); if(os) parts.push('OS '+os);
    if(_nz(e.rx_far_od_pd)) parts.push('PD '+e.rx_far_od_pd);
  } else if (type==='comp') {
    const od = seg(e.rx_comp_od_sph,e.rx_comp_od_cyl,e.rx_comp_od_ax);
    const os = seg(e.rx_comp_os_sph,e.rx_comp_os_cyl,e.rx_comp_os_ax);
    if(od) parts.push('OD '+od); if(os) parts.push('OS '+os);
    if(_nz(e.rx_comp_od_pd))  parts.push('PD '+e.rx_comp_od_pd);
    if(_nz(e.rx_comp_od_add)) parts.push('ADD '+e.rx_comp_od_add);
  } else if (type==='near') {
    const od = seg(e.rx_near_od_sph,e.rx_near_od_cyl,e.rx_near_od_ax);
    const os = seg(e.rx_near_os_sph,e.rx_near_os_cyl,e.rx_near_os_ax);
    if(od) parts.push('OD '+od); if(os) parts.push('OS '+os);
    if(_nz(e.rx_near_od_pd))  parts.push('PD '+e.rx_near_od_pd);
    if(_nz(e.rx_near_od_add)) parts.push('Degr '+e.rx_near_od_add);
  } else if (type==='cl') {
    const od = seg(e.rx_cl_od_sph,e.rx_cl_od_cyl,e.rx_cl_od_ax);
    const os = seg(e.rx_cl_os_sph,e.rx_cl_os_cyl,e.rx_cl_os_ax);
    if(od) parts.push('OD '+od); if(os) parts.push('OS '+os);
    if(_nz(e.rx_cl_od_bc))  parts.push('BC '+e.rx_cl_od_bc);
    if(_nz(e.rx_cl_od_dia)) parts.push('DIA '+e.rx_cl_od_dia);
    if(e.rx_cl_od_type) parts.push(e.rx_cl_od_type);
  }
  return parts.join(' | ');
}

function _rxOptLabel(e, type, d) {
  const labels = {far:t('exam_far_short'), comp:t('exam_comp_short'), near:t('exam_near_short'), cl:t('exam_cl_short')};
  const base = t('visit')+(e.visit_number||'?')+' ('+d+') — '+(labels[type]||type);
  const diopt = _rxDioptStr(e, type);
  return diopt ? base+' | '+diopt : base;
}

window._examCache = {};

function _rxOpts(exams, selVal) {
  if (!exams || !exams.length) {
    return '<option value="">— '+t('exam_none')+' —</option>';
  }
  const opts = ['<option value="">— '+t('no_data')+' —</option>'];
  exams.forEach(e => {
    window._examCache[e.id] = e;
    const d = fmt(e.created_at ? e.created_at.split('T')[0] : '');
    ['far','comp','near','cl'].forEach(type => {
      if (!_rxDioptStr(e, type)) return;
      const val = e.id+'|'+type;
      opts.push('<option value="'+val+'"'+(selVal===val?' selected':'')+'>'+_rxOptLabel(e, type, d)+'</option>');
    });
  });
  return opts.join('');
}

function _ordersSortBarHtml() {
  const opts = [
    ['date_new',   t('sort_date_new')],
    ['date_old',   t('sort_date_old')],
    ['total_desc', t('sort_total_desc')],
    ['total_asc',  t('sort_total_asc')],
    ['promised',   t('sort_promised')]
  ];
  return opts.map(([k,lbl]) =>
    '<button class="filter-btn'+(_ordersSort===k?' active':'')+
    '" onclick="_ordersSort=\''+k+'\';_renderOrdersTable(_filteredOrders())">'+ lbl+'</button>'
  ).join('');
}

function _filteredOrders() {
  let list = orderFilter==='все' ? _allOrders : _allOrders.filter(o => o.status===orderFilter);
  const q = (_ordersSearchQuery||'').trim().toLowerCase();
  if (q) {
    list = list.filter(o =>
      ((o.patients&&o.patients.name)||'').toLowerCase().includes(q) ||
      (o.order_number||'').toLowerCase().includes(q) ||
      (o.frame_code||'').toLowerCase().includes(q) ||
      (o.lens_name||'').toLowerCase().includes(q)
    );
  }
  return list;
}
function filterOrdersUI(q) { _ordersSearchQuery = q; _renderOrdersTable(_filteredOrders()); }

// Строка с диоптриями рецепта, по которому оформлен заказ — вычисляется из
// examination_id заказа и справочника меток prescription_label → тип рецепта.
function _orderRxDiopters(o) {
  if (!o.examination_id || !o.prescription_label) return '';
  const type = RX_LABEL_TO_TYPE[o.prescription_label];
  const e = _ordersExamMap[o.examination_id];
  if (!type || !e) return '';
  return _rxDioptStr(e, type);
}

function _sortOrders(list) {
  return list.slice().sort((a, b) => {
    if (_ordersSort === 'date_new') return (b.order_date||b.created_at||'').localeCompare(a.order_date||a.created_at||'');
    if (_ordersSort === 'date_old') return (a.order_date||a.created_at||'').localeCompare(b.order_date||b.created_at||'');
    if (_ordersSort === 'total_desc') return orderTotal(b) - orderTotal(a);
    if (_ordersSort === 'total_asc')  return orderTotal(a) - orderTotal(b);
    if (_ordersSort === 'promised') {
      const pa = a.promised_date || '9999';
      const pb = b.promised_date || '9999';
      return pa.localeCompare(pb);
    }
    return 0;
  });
}

async function renderOrders() {
  document.getElementById('content').innerHTML =
    '<div class="topbar"><h1>'+t('orders')+'</h1>'+
    '<div class="topbar-actions"><div class="search-wrap"><input type="text" id="osearch" placeholder="'+t('search')+'" oninput="filterOrdersUI(this.value)"></div>'+
    (isAdmin() ? '<button class="btn btn-accent" onclick="openAddOrder()">+ '+t('new_order')+'</button>' : '')+
    '</div></div><div class="content"><div class="spinner">'+t('loading')+'</div></div>';
  const {data:orders} = await db.from('orders')
    .select('*, patients(name,telegram_chat_id)')
    .is('deleted_at', null);
  _allOrders = orders || [];

  // Подтягиваем рецепты, на которые ссылаются заказы, чтобы показать диоптрии в списке
  const examIds = [...new Set(_allOrders.map(o => o.examination_id).filter(Boolean))];
  _ordersExamMap = {};
  if (examIds.length) {
    const {data: exs} = await db.from('examinations').select(RX_SELECT_FIELDS).in('id', examIds);
    (exs||[]).forEach(e => { _ordersExamMap[e.id] = e; window._examCache[e.id] = e; });
  }

  _renderOrdersTable(_filteredOrders());
}

function _renderOrdersTable(list) {
  const sorted = _sortOrders(list);
  document.querySelector('.content').innerHTML =
    '<div class="section-header">'+
      '<div class="filter-bar">'+
        ['все',...ORDER_STATUSES_ALL].map(f =>
          '<button class="filter-btn'+(orderFilter===f?' active':'')+
          '" onclick="orderFilter=\''+f+'\';_renderOrdersTable(_filteredOrders())">'+
          (f==='все' ? t('all') : statusLabel(f))+'</button>'
        ).join('')+
      '</div>'+
      '<div class="filter-bar" style="margin-top:6px">'+_ordersSortBarHtml()+'</div>'+
    '</div>'+
    '<div class="card"><div class="table-wrap"><table>'+
    '<thead><tr>'+
      '<th>'+t('date')+'</th>'+
      '<th>'+t('patient')+'</th>'+
      '<th>'+t('order_number')+'</th>'+
      '<th>'+t('frame')+' / '+t('lenses')+'</th>'+
      '<th style="color:var(--text-l)">'+t('prescription')+'</th>'+
      '<th>'+t('total')+'</th>'+
      '<th>'+t('promised_date')+'</th>'+
      '<th>'+t('status')+'</th>'+
      '<th>💰</th>'+
      '<th></th>'+
    '</tr></thead>'+
    '<tbody>'+
    (sorted.length ? sorted.map(o =>
      '<tr style="cursor:pointer" onclick="openOrderCard(\''+o.id+'\')" onmouseenter="this.style.background=\'var(--surface2)\'" onmouseleave="this.style.background=\'\'">'+
        '<td class="text-m" onclick="event.stopPropagation()">'+fmt(o.order_date||( o.created_at||'').split('T')[0])+'</td>'+
        '<td onclick="event.stopPropagation()"><span class="table-name" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard(\''+o.patient_id+'\')">'+(o.patients&&o.patients.name||'—')+'</span></td>'+
        '<td><span class="badge badge-gray" style="font-size:11px">'+(o.order_number||'—')+'</span>'+(o.is_redo ? ' <span class="badge badge-warn" style="font-size:10px">&#8635;</span>' : '')+'</td>'+
        '<td><div class="fw-6" style="font-size:13.5px">'+(o.frame_code||'—')+'</div><div class="text-sm text-m">'+(o.lens_name||'—')+'</div></td>'+
        '<td style="color:var(--text-l);font-size:13px;max-width:220px">'+
          (o.prescription_label ? '<div style="font-weight:600;color:var(--text-m)">'+o.prescription_label+'</div>' : '—')+
          (_orderRxDiopters(o) ? '<div style="margin-top:2px;color:var(--text)">'+_orderRxDiopters(o)+'</div>' : '')+
        '</td>'+
        '<td class="money">'+fmtMoney(orderTotal(o))+'</td>'+
        '<td class="text-m">'+(o.promised_date ? fmt(o.promised_date) : '—')+'</td>'+
        '<td onclick="event.stopPropagation()">'+
          '<select style="font-size:12px;padding:4px 8px;border-radius:6px;border:1.5px solid var(--border);'+
            'background:'+(o.status==='выдан'?'var(--green-l)':o.status==='готов'?'var(--warn-l)':o.status==='отменен'||o.status==='возврат'?'var(--red-l)':'var(--surface2)')+';font-weight:600;cursor:pointer"'+
            ' onchange="updateOrderStatus(\''+o.id+'\',this.value)">'+
            ORDER_STATUSES_ALL.map(s => '<option '+(o.status===s?'selected':'')+' value="'+s+'">'+statusLabel(s)+'</option>').join('')+
          '</select>'+
        '</td>'+
        '<td>'+(o.counts_for_salary ? '<span class="salary-badge">💰</span>' : '')+'</td>'+
        '<td onclick="event.stopPropagation()"><div class="appt-actions" style="margin-top:0">'+
          (o.status==='готов' && o.patients && o.patients.telegram_chat_id ? '<button class="btn btn-ghost btn-sm" onclick="notifyOrderReady(\''+o.id+'\')">📨</button>' : '')+
          (o.status==='готов' ? '<button class="btn btn-accent btn-sm" onclick="issueOrder(\''+o.id+'\')">'+ t('issue_btn')+'</button>' : '')+
          (o.status==='выдан' && o.patients && o.patients.telegram_chat_id ? '<button class="btn btn-ghost btn-sm" onclick="sendFollowUpSurvey(\''+o.id+'\')">🔁</button>' : '')+
          (isAdmin() ? '<button class="btn btn-ghost btn-sm" onclick="openEditOrder(\''+o.id+'\')">✏️</button><button class="btn btn-danger btn-sm" onclick="delOrder(\''+o.id+'\')">🗑</button>' : '')+
        '</div></td>'+
      '</tr>'
    ).join('') : '<tr><td colspan="10"><div class="empty"><p>'+t('no_orders')+'</p></div></td></tr>')+
    '</tbody></table></div></div>';
}

// ═══ ORDER CARD VIEW ═══
async function openOrderCard(id) {
  const {data:o} = await db.from('orders').select('*, patients(name,telegram_chat_id)').eq('id',id).single();
  if (!o) return;
  const bal = orderBalance(o);
  const displayDate = fmt(o.order_date || (o.created_at||'').split('T')[0]);

  // Диоптрии рецепта, по которому оформлен заказ — подтягиваем отдельно,
  // т.к. карточку заказа можно открыть и не из списка «Заказы» (например, из карточки пациента).
  let rxDiopters = '';
  if (o.examination_id && o.prescription_label) {
    let e = window._examCache && window._examCache[o.examination_id];
    if (!e) {
      const {data:ed} = await db.from('examinations').select(RX_SELECT_FIELDS).eq('id',o.examination_id).single();
      e = ed; if (e) window._examCache[e.id] = e;
    }
    const rxType = RX_LABEL_TO_TYPE[o.prescription_label];
    if (e && rxType) rxDiopters = _rxDioptStr(e, rxType);
  }
  openModal(
    '<div class="modal modal-lg">'+
      '<div class="modal-header">'+
        '<div style="flex:1;min-width:0">'+
          '<span class="modal-title">'+t('orders')+' · '+(o.patients&&o.patients.name||'—')+'</span>'+
          '<div class="text-sm text-m mt-4">'+displayDate+' · <span class="badge '+(STATUS_BADGE[o.status]||'badge-gray')+'">'+statusLabel(o.status)+'</span>'+(o.is_redo ? ' · <span class="badge badge-warn">&#8635; Переделка</span>' : '')+(o.counts_for_salary ? ' · <span class="salary-badge">💰 10%</span>' : '')+'</div>'+
        '</div>'+
        '<div class="profile-actions">'+
          (o.status==='готов' && o.patients && o.patients.telegram_chat_id ? '<button class="btn btn-ghost btn-sm" onclick="notifyOrderReady(\''+o.id+'\')">📨</button>' : '')+
          (o.status==='готов' ? '<button class="btn btn-accent btn-sm" onclick="issueOrder(\''+o.id+'\');closeModal()">'+ t('issue_btn')+'</button>' : '')+
          (o.status==='выдан' && o.patients && o.patients.telegram_chat_id ? '<button class="btn btn-ghost btn-sm" onclick="sendFollowUpSurvey(\''+o.id+'\')">🔁</button>' : '')+
          (isAdmin() ? '<button class="btn btn-ghost btn-sm" onclick="closeModal();openEditOrder(\''+o.id+'\')">✏️</button>' : '')+
          '<button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>'+
        '</div>'+
      '</div>'+
      '<div class="modal-body">'+
        '<div class="info-grid mb-12">'+
          '<div class="info-item"><label>'+t('order_num_label')+'</label><p style="font-weight:700;font-size:15px">'+(o.order_number||'—')+'</p></div>'+
          '<div class="info-item"><label>'+t('order_type')+'</label><p>'+o.type+'</p></div>'+
          '<div class="info-item"><label>'+t('prescription')+'</label><p style="color:var(--text-m)">'+(o.prescription_label||'—')+(rxDiopters?' <span style="color:var(--text);font-weight:600">— '+rxDiopters+'</span>':'')+'</p></div>'+
          '<div class="info-item"><label>'+t('promised_date')+'</label><p>'+(o.promised_date ? fmt(o.promised_date) : '—')+'</p></div>'+
          '<div class="info-item"><label>'+t('order_date_label')+'</label><p>'+displayDate+'</p></div>'+
        '</div>'+
        '<div class="divider"></div>'+
        '<div class="form-grid mb-12">'+
          '<div class="form-group"><label>'+t('frame_code')+'</label><input value="'+(o.frame_code||'—')+'" readonly></div>'+
          '<div class="form-group"><label>'+t('frame_price_label')+'</label><input value="'+fmtMoney(o.frame_price)+'" readonly></div>'+
          '<div class="form-group"><label>'+t('lens_name')+'</label><input value="'+(o.lens_name||'—')+'" readonly></div>'+
          '<div class="form-group"><label>'+t('lens_price_label')+' ('+( o.lens_qty||2)+' × '+fmtMoney(o.lens_price)+')</label><input value="'+fmtMoney(orderTotal_lenses(o))+'" readonly></div>'+
          '<div class="form-group"><label>'+t('work_price_label')+'</label><input value="'+(o.work_price ? fmtMoney(o.work_price) : '—')+'" readonly></div>'+
          '<div class="form-group"><label>'+t('prepayment_label')+'</label><input value="'+fmtMoney(o.prepayment)+'" readonly></div>'+
        '</div>'+
        '<div style="background:'+(bal>0?'var(--warn-l)':'var(--green-l)')+';border:1.5px solid '+(bal>0?'var(--warn)':'var(--green)')+';border-radius:10px;padding:14px 18px;display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
          '<div><div class="text-sm text-m mb-4">'+t('total')+'</div><div style="font-size:22px;font-weight:800;color:var(--primary)">'+fmtMoney(orderTotal(o))+'</div></div>'+
          '<div style="text-align:right"><div class="text-sm text-m mb-4">'+t('extra_payment')+'</div><div style="font-size:22px;font-weight:800;color:'+(bal>0?'var(--warn)':'var(--green)')+'">'+fmtMoney(bal)+'</div></div>'+
        '</div>'+
        (o.notes ? '<div class="form-group mt-12"><label>'+t('notes')+'</label><input value="'+o.notes+'" readonly></div>' : '')+
        (o.issued_date ? '<div class="text-sm text-m mt-8">'+t('issued_label')+': '+fmt(o.issued_date)+'</div>' : '')+
      '</div>'+
    '</div>'
  );
}

function orderTotal_lenses(o) {
  const qty = o.lens_qty != null ? o.lens_qty : 2;
  return (+o.lens_price||0) * qty;
}

// ═══ ORDER FORM ═══
function openAddOrder() { openAddOrderFor(null); }
async function openAddOrderFor(patientId) {
  const [{data:patients}, examRes] = await Promise.all([
    db.from('patients').select('id,name').order('name'),
    patientId
      ? db.from('examinations').select(RX_SELECT_FIELDS).eq('patient_id',patientId).order('created_at',{ascending:false})
      : Promise.resolve({data:[]})
  ]);
  _drawOrderForm(null, patientId, patients||[], examRes&&examRes.data||[]);
}
async function openEditOrder(id) {
  const {data:o} = await db.from('orders').select('*').eq('id',id).single();
  const [{data:patients}, examRes] = await Promise.all([
    db.from('patients').select('id,name').order('name'),
    o && o.patient_id
      ? db.from('examinations').select(RX_SELECT_FIELDS).eq('patient_id',o.patient_id).order('created_at',{ascending:false})
      : Promise.resolve({data:[]})
  ]);
  _drawOrderForm(o, o&&o.patient_id, patients||[], examRes&&examRes.data||[]);
}

function _drawOrderForm(o, prePatient, patients, exams) {
  const isEdit = !!o;
  const orderDate = (o && (o.order_date || (o.created_at||'').split('T')[0])) || today();
  const lensQty = (o && o.lens_qty != null) ? o.lens_qty : 2;
  const isCL = o && o.type === 'МКЛ';
  const isRedo = o && !!o.is_redo;

  let selVal = '';
  if (o && o.examination_id && o.prescription_label) {
    const labelMap = {'Daljina':'far','Računar':'comp','Blizina':'near','KS':'cl','Даль':'far','Компьютер':'comp','Близь':'near'};
    const rxType = labelMap[o.prescription_label] || '';
    if (rxType) selVal = o.examination_id + '|' + rxType;
  }

  const rxHtml = _rxOpts(exams, selVal);
  const rxCount = exams.length;
  const rxLabel = t('prescription') + (rxCount ?
    ' <span style="color:var(--accent);font-size:11px;font-weight:600">('+rxCount+')</span>' :
    ' <span style="color:var(--text-l);font-size:11px">— '+t('exam_none')+'</span>');

  openModal(
    '<div class="modal modal-xl">'+
      '<div class="modal-header"><span class="modal-title">'+(isEdit ? t('edit_order') : t('new_order'))+'</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>'+
      '<div class="modal-body">'+
        '<div class="form-grid">'+

          '<div class="form-group full">'+
            '<div class="flex items-center justify-between mb-4"><label>'+t('patient')+' *</label><button class="btn btn-ghost btn-xs" onclick="toggleQuickPatient()">+ '+t('new_patient')+'</button></div>'+
            '<select id="o-pid" onchange="onOrderPatientChange(this.value)">'+
              '<option value="">— '+t('select_patient')+' —</option>'+
              patients.map(p => '<option value="'+p.id+'" '+((o&&o.patient_id===p.id||prePatient===p.id)?'selected':'')+'>'+p.name+'</option>').join('')+
            '</select>'+
            '<div id="quick-patient-form" style="display:none;background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;padding:12px;margin-top:8px">'+
              '<div style="font-size:12.5px;font-weight:700;color:var(--accent);margin-bottom:8px">'+t('new_patient')+'</div>'+
              '<div class="form-grid">'+
                '<div class="form-group full"><label>'+t('full_name')+' *</label><input id="qp-name"></div>'+
                '<div class="form-group"><label>'+t('phone')+'</label><input id="qp-phone"></div>'+
                '<div class="form-group"><label>Email</label><input id="qp-email"></div>'+
                '<div class="form-group"><label>Telegram @username</label><input id="qp-tg"></div>'+
              '</div>'+
              '<div class="flex gap-8 mt-8">'+
                '<button class="btn btn-accent btn-sm" onclick="saveQuickPatient()">'+t('save')+'</button>'+
                '<button class="btn btn-ghost btn-sm" onclick="toggleQuickPatient()">'+t('cancel')+'</button>'+
              '</div>'+
            '</div>'+
          '</div>'+

          '<div class="form-group full">'+
            '<div class="flex items-center justify-between mb-4"><label>'+rxLabel+'</label><button class="btn btn-ghost btn-xs" onclick="toggleQuickRx()">+ '+t('prescription')+'</button></div>'+
            '<select id="o-rx" onchange="showRxPreview(this.value)">'+rxHtml+'</select>'+
            '<div id="o-rx-preview" style="margin-top:8px;font-size:12.5px;color:var(--text-m);background:var(--surface2);border-radius:6px;padding:8px 12px;display:none;line-height:1.8"></div>'+
            '<div id="quick-rx-form" style="display:none;background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;padding:12px;margin-top:8px">'+
              '<div style="font-size:12.5px;font-weight:700;color:var(--accent);margin-bottom:8px">'+t('prescription')+'</div>'+
              '<div class="form-grid">'+
                '<div class="form-group"><label>'+t('appt_type')+'</label>'+
                  '<select id="qrx-type" onchange="updateQuickRxFields()">'+
                    '<option value="far">'+t('rx_far')+'</option>'+
                    '<option value="comp">'+t('rx_comp')+'</option>'+
                    '<option value="near">'+t('rx_near')+'</option>'+
                    '<option value="cl">'+t('rx_cl')+'</option>'+
                  '</select>'+
                '</div>'+
                '<div class="form-group" style="align-self:flex-end">'+
                  '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-weight:500">'+
                    '<input type="checkbox" id="qrx-own" style="width:auto"> '+t('prescription')+' ('+t('exam_open_btn')+')'+
                  '</label>'+
                '</div>'+
              '</div>'+
              '<div id="qrx-fields" style="margin-top:10px">'+
                '<table class="rx-table" style="margin-bottom:8px">'+
                  '<tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th></tr>'+
                  '<tr><td>OD</td><td><input id="qrx-od-sph" style="min-width:52px;text-align:center"></td><td><input id="qrx-od-cyl" style="min-width:52px;text-align:center"></td><td><input id="qrx-od-ax" style="min-width:52px;text-align:center"></td></tr>'+
                  '<tr><td>OS</td><td><input id="qrx-os-sph" style="min-width:52px;text-align:center"></td><td><input id="qrx-os-cyl" style="min-width:52px;text-align:center"></td><td><input id="qrx-os-ax" style="min-width:52px;text-align:center"></td></tr>'+
                '</table>'+
                '<div class="flex gap-8" id="qrx-shared-fields">'+
                  '<div class="form-group" style="max-width:80px"><label id="qrx-pd-label">PD</label><input id="qrx-pd" style="text-align:center"></div>'+
                  '<div class="form-group" style="max-width:80px" id="qrx-add-wrap"><label id="qrx-add-label">ADD</label><input id="qrx-add" style="text-align:center"></div>'+
                '</div>'+
                '<div class="form-group mt-8" id="qrx-cl-type-wrap" style="display:none"><label>'+t('rx_cl')+'</label><input id="qrx-cl-type"></div>'+
                '<div class="form-group mt-8"><label>'+t('notes')+'</label><input id="qrx-note"></div>'+
              '</div>'+
              '<div class="flex gap-8 mt-10">'+
                '<button class="btn btn-accent btn-sm" onclick="saveQuickRx()">'+t('save')+'</button>'+
                '<button class="btn btn-ghost btn-sm" onclick="toggleQuickRx()">'+t('cancel')+'</button>'+
              '</div>'+
            '</div>'+
          '</div>'+

          '<div class="form-group"><label>'+t('order_num_label')+'</label><input id="o-ordernum" value="'+(o&&o.order_number||'')+'"></div>'+
          '<div class="form-group"><label>'+t('order_date_label')+'</label><input type="date" id="o-orderdate" value="'+orderDate+'"></div>'+

          '<div class="form-group"><label>'+t('order_type')+' *</label>'+
            '<select id="o-type" onchange="onOrderTypeChange(this.value)">'+
              '<option value="Очки" '+(!o||o.type==='Очки'?'selected':'')+'>'+t('order_type_glasses')+'</option>'+
              '<option value="МКЛ" '+(o&&o.type==='МКЛ'?'selected':'')+'>'+t('order_type_cl')+'</option>'+
              '<option value="Ремонт" '+(o&&o.type==='Ремонт'?'selected':'')+'>'+t('order_type_repair')+'</option>'+
              '<option value="Другое" '+(o&&o.type==='Другое'?'selected':'')+'>'+t('no_data')+'</option>'+
            '</select>'+
          '</div>'+

          '<div class="form-group" style="align-self:flex-end">'+
            '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13.5px;font-weight:600;padding:10px 0">'+
              '<input type="checkbox" id="o-is-redo" style="width:auto;width:16px;height:16px;cursor:pointer"'+(isRedo?' checked':'')+'>'+
              ' &#8635; Переделка'+
            '</label>'+
          '</div>'+

          (isEdit ?
            '<div class="form-group"><label>'+t('status')+'</label>'+
              '<select id="o-status">'+ORDER_STATUSES_ALL.map(s => '<option '+(o&&o.status===s?'selected':'')+' value="'+s+'">'+statusLabel(s)+'</option>').join('')+'</select>'+
            '</div>' :
            '<div></div>')+

          '<div class="form-group full" style="display:grid;grid-template-columns:1fr 1.6fr;gap:12px;align-items:flex-start">'+
            '<div class="form-group"><label>'+t('frame_code')+'</label><input id="o-fcode" value="'+(o&&o.frame_code||'')+'"></div>'+
            '<div class="form-group">'+
              '<label>'+t('frame')+' (din.)</label>'+
              '<div style="display:grid;grid-template-columns:1fr 60px 1fr;gap:6px;align-items:flex-end">'+
                '<div><label style="font-size:10.5px;color:var(--text-l)">'+t('no_data').replace('Nema','Osnovna').replace('Нет','Базовая')+'</label><input type="number" id="o-fprice" value="'+(o&&o.frame_price||'')+'" min="0" placeholder="0" onfocus="if(+this.value===0)this.value=\'\'" onblur="if(this.value===\'\')this.value=0" oninput="recalcOrder()"></div>'+
                '<div><label style="font-size:10.5px;color:var(--text-l)">% </label><input type="number" id="o-fdisc" value="0" min="0" max="100" placeholder="0" oninput="recalcOrder()"></div>'+
                '<div><label style="font-size:10.5px;color:var(--green);font-weight:700">= din.</label><input type="number" id="o-fprice-final" value="'+(o&&o.frame_price||0)+'" min="0" readonly style="background:var(--green-l);font-weight:700"></div>'+
              '</div>'+
            '</div>'+
          '</div>'+

          '<div class="form-group full" style="display:grid;grid-template-columns:1fr 1.6fr;gap:12px;align-items:flex-start">'+
            '<div class="form-group"><label>'+t('lens_name')+'</label><input id="o-lname" value="'+(o&&o.lens_name||'')+'"></div>'+
            '<div class="form-group">'+
              '<label id="o-lens-label">'+t('lenses')+' (din.)</label>'+
              '<div style="display:grid;grid-template-columns:1fr 60px '+(isCL?'':'80px ')+'1fr;gap:6px;align-items:flex-end">'+
                '<div><label style="font-size:10.5px;color:var(--text-l)">Base</label><input type="number" id="o-lprice" data-enter-jump="save" value="'+(o&&o.lens_price||'')+'" min="0" placeholder="0" onfocus="if(+this.value===0)this.value=\'\'" onblur="if(this.value===\'\')this.value=0" oninput="recalcOrder()"></div>'+
                '<div><label style="font-size:10.5px;color:var(--text-l)">% </label><input type="number" id="o-ldisc" value="0" min="0" max="100" placeholder="0" oninput="recalcOrder()"></div>'+
                (isCL ? '' : '<div id="o-lqty-wrap"><label style="font-size:10.5px;color:var(--text-l)">kom</label><select id="o-lqty" onchange="recalcOrder()" style="padding:8px 4px"><option value="2" '+(lensQty!==1?'selected':'')+'>2</option><option value="1" '+(lensQty===1?'selected':'')+'>1</option></select></div>')+
                '<div><label style="font-size:10.5px;color:var(--green);font-weight:700" id="o-lens-result-label">= din.</label><input type="number" id="o-lprice-final" value="'+(isCL?(o&&o.lens_price||0):((o&&o.lens_price||0)*lensQty))+'" min="0" readonly style="background:var(--green-l);font-weight:700"></div>'+
              '</div>'+
            '</div>'+
          '</div>'+

          '<div class="form-group"><label>'+t('work')+' (din.)</label><input type="number" id="o-wprice" value="'+(o&&o.work_price||'')+'" min="0" placeholder="0" oninput="recalcOrder()"></div>'+
          '<div class="form-group"><label>'+t('prepayment')+' (din.)</label><input type="number" id="o-prepay" value="'+(o&&o.prepayment||'')+'" min="0" placeholder="0" oninput="recalcOrder()"></div>'+
          '<div class="form-group"><label>'+t('promised_date')+'</label><input type="date" id="o-pdate" value="'+(o&&o.promised_date||'')+'"></div>'+
          '<div class="form-group" style="align-self:flex-end">'+
            '<div style="background:var(--accent-l);border:2px solid var(--accent);border-radius:10px;padding:12px 16px">'+
              '<div style="font-size:10px;color:var(--accent-h);font-weight:700;letter-spacing:.5px;margin-bottom:3px">'+t('total')+'</div>'+
              '<div id="o-total-display" style="font-size:22px;font-weight:800;color:var(--primary);letter-spacing:-1px">'+ fmtMoney((o&&o.frame_price||0)+(o&&o.lens_price||0)*lensQty+(o&&o.work_price||0))+'</div>'+
              '<div id="o-balance-display" style="font-size:11px;color:var(--accent-h);margin-top:3px;font-weight:600">'+t('balance')+': '+fmtMoney(Math.max((o&&o.frame_price||0)+(o&&o.lens_price||0)*lensQty+(o&&o.work_price||0)-(o&&o.prepayment||0),0))+'</div>'+
            '</div>'+
          '</div>'+
          '<div class="form-group full"><label>'+t('notes')+'</label><textarea id="o-notes">'+(o&&o.notes||'')+'</textarea></div>'+
        '</div>'+
      '</div>'+
      '<div class="modal-footer">'+
        '<button class="btn btn-ghost" onclick="closeModal()">'+t('cancel')+'</button>'+
        '<button class="btn btn-accent" onclick="saveOrder(\''+( o&&o.id||'')+'\')">'+ t('save')+'</button>'+
      '</div>'+
    '</div>'
  );
  if (selVal) setTimeout(() => showRxPreview(selVal), 100);
}

function onOrderTypeChange(type) {
  const isCL = type === 'МКЛ';
  const lensLabel = document.getElementById('o-lens-label');
  const qtyWrap = document.getElementById('o-lqty-wrap');
  if (lensLabel) lensLabel.textContent = (isCL ? t('order_type_cl') : t('lenses')) + ' (din.)';
  if (qtyWrap) qtyWrap.style.display = isCL ? 'none' : '';
  recalcOrder();
}

function toggleQuickPatient() {
  const f = document.getElementById('quick-patient-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  if (f.style.display === 'block') document.getElementById('qp-name') && document.getElementById('qp-name').focus();
}
function toggleQuickRx() {
  const f = document.getElementById('quick-rx-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
}
function updateQuickRxFields() {
  const type = document.getElementById('qrx-type') && document.getElementById('qrx-type').value;
  const addWrap = document.getElementById('qrx-add-wrap');
  const clWrap = document.getElementById('qrx-cl-type-wrap');
  const addLabel = document.getElementById('qrx-add-label');
  const pdLabel = document.getElementById('qrx-pd-label');
  if (type==='cl') { pdLabel.textContent='BC'; addLabel.textContent='DIA'; if(clWrap) clWrap.style.display='block'; }
  else if (type==='near') { pdLabel.textContent='PD'; addLabel.textContent='Degr'; if(clWrap) clWrap.style.display='none'; }
  else { pdLabel.textContent='PD'; addLabel.textContent='ADD'; if(clWrap) clWrap.style.display='none'; }
  if (addWrap) addWrap.style.display = 'block';
}
async function saveQuickPatient() {
  const name = v('qp-name'); if (!name) { alert(t('enter_name')); return; }
  const {data:np} = await db.from('patients').insert({name, phone:v('qp-phone'), email:v('qp-email'), telegram_username:v('qp-tg')}).select().single();
  if (!np) { toast(t('error'), 'error'); return; }
  const sel = document.getElementById('o-pid');
  const opt = document.createElement('option');
  opt.value = np.id; opt.textContent = np.name; opt.selected = true;
  sel.appendChild(opt); sel.value = np.id;
  toggleQuickPatient();
  toast(np.name + ' — ' + t('added'));
  await onOrderPatientChange(np.id);
}
async function saveQuickRx() {
  const pid = v('o-pid'); if (!pid) { alert(t('select_patient')); return; }
  const type = (document.getElementById('qrx-type') && document.getElementById('qrx-type').value) || 'far';
  const isOwn = document.getElementById('qrx-own') && document.getElementById('qrx-own').checked;
  const {count} = await db.from('examinations').select('id',{count:'exact',head:true}).eq('patient_id',pid);
  const visitNum = (count||0)+1;
  const note = (isOwn ? t('prescription')+'. ' : '') + v('qrx-note');
  const rxData = {patient_id:pid, visit_number:visitNum, recommendations:note||null,
    rx_far_enabled:type==='far', rx_comp_enabled:type==='comp', rx_near_enabled:type==='near', rx_cl_enabled:type==='cl'};
  if (type==='far'||type==='comp') {
    const pre = type==='far' ? 'rx_far' : 'rx_comp';
    rxData[pre+'_od_sph']=v('qrx-od-sph'); rxData[pre+'_od_cyl']=v('qrx-od-cyl'); rxData[pre+'_od_ax']=v('qrx-od-ax');
    rxData[pre+'_os_sph']=v('qrx-os-sph'); rxData[pre+'_os_cyl']=v('qrx-os-cyl'); rxData[pre+'_os_ax']=v('qrx-os-ax');
    rxData[pre+'_od_pd']=v('qrx-pd');
    if (type==='far') rxData.rx_far_os_pd=v('qrx-add'); else rxData.rx_comp_od_add=v('qrx-add');
  } else if (type==='near') {
    rxData.rx_near_od_sph=v('qrx-od-sph'); rxData.rx_near_od_cyl=v('qrx-od-cyl'); rxData.rx_near_od_ax=v('qrx-od-ax');
    rxData.rx_near_os_sph=v('qrx-os-sph'); rxData.rx_near_os_cyl=v('qrx-os-cyl'); rxData.rx_near_os_ax=v('qrx-os-ax');
    rxData.rx_near_od_pd=v('qrx-pd'); rxData.rx_near_od_add=v('qrx-add');
  } else if (type==='cl') {
    rxData.rx_cl_od_sph=v('qrx-od-sph'); rxData.rx_cl_od_cyl=v('qrx-od-cyl'); rxData.rx_cl_od_ax=v('qrx-od-ax');
    rxData.rx_cl_os_sph=v('qrx-os-sph'); rxData.rx_cl_os_cyl=v('qrx-os-cyl'); rxData.rx_cl_os_ax=v('qrx-os-ax');
    rxData.rx_cl_od_bc=v('qrx-pd'); rxData.rx_cl_od_dia=v('qrx-add'); rxData.rx_cl_od_type=v('qrx-cl-type');
  }
  const {data:ne, error:ne_err} = await db.from('examinations').insert(rxData).select().single();
  if (!ne) { toast(t('save_error')+': '+(ne_err&&ne_err.message||''), 'error'); return; }
  window._examCache[ne.id] = ne;
  const sel = document.getElementById('o-rx');
  const d = fmt(today());
  ['far','comp','near','cl'].forEach(tp => {
    if (!_rxDioptStr(ne, tp)) return;
    const opt = document.createElement('option');
    const val = ne.id+'|'+tp;
    opt.value = val; opt.textContent = _rxOptLabel(ne, tp, d);
    if (tp === type) opt.selected = true;
    sel.appendChild(opt);
  });
  sel.value = ne.id+'|'+type;
  toggleQuickRx();
  toast(t('save_card'));
  await showRxPreview(ne.id+'|'+type);
}
async function onOrderPatientChange(pid) {
  const sel = document.getElementById('o-rx');
  const prev = document.getElementById('o-rx-preview');
  if (!pid) { sel.innerHTML = '<option value="">—</option>'; if (prev) prev.style.display='none'; return; }
  const {data:exams} = await db.from('examinations').select(RX_SELECT_FIELDS).eq('patient_id',pid).order('created_at',{ascending:false});
  (exams||[]).forEach(e => { window._examCache[e.id] = e; });
  sel.innerHTML = _rxOpts(exams||[]);
  if (prev) prev.style.display = 'none';
}
async function showRxPreview(val) {
  const prev = document.getElementById('o-rx-preview');
  if (!val) { prev.style.display = 'none'; return; }
  const [examId, type] = val.split('|');
  if (!examId || !type) { prev.style.display = 'none'; return; }
  let e = window._examCache && window._examCache[examId];
  if (!e) {
    const {data:ed} = await db.from('examinations').select(RX_SELECT_FIELDS).eq('id',examId).single();
    e = ed; if (e) window._examCache[e.id] = e;
  }
  if (!e) { prev.style.display = 'none'; return; }
  const row = (eye, sph, cyl, ax) => {
    let s = '<b>'+eye+':</b> '+(_nz(sph)||'—');
    const c = _nz(cyl); const a = _nz(ax);
    if (c) s += ' / '+c; if (a) s += ' ax'+a;
    return s;
  };
  let html = '';
  if (type==='far')  html = row('OD',e.rx_far_od_sph,e.rx_far_od_cyl,e.rx_far_od_ax)+'&nbsp;&nbsp;'+row('OS',e.rx_far_os_sph,e.rx_far_os_cyl,e.rx_far_os_ax)+(_nz(e.rx_far_od_pd)?' &nbsp;<b>PD:</b> '+e.rx_far_od_pd:'')+(_nz(e.rx_far_os_pd)?' &nbsp;<b>ADD:</b> '+e.rx_far_os_pd:'');
  else if (type==='comp') html = row('OD',e.rx_comp_od_sph,e.rx_comp_od_cyl,e.rx_comp_od_ax)+'&nbsp;&nbsp;'+row('OS',e.rx_comp_os_sph,e.rx_comp_os_cyl,e.rx_comp_os_ax)+(_nz(e.rx_comp_od_pd)?' &nbsp;<b>PD:</b> '+e.rx_comp_od_pd:'')+(_nz(e.rx_comp_od_add)?' &nbsp;<b>ADD:</b> '+e.rx_comp_od_add:'');
  else if (type==='near') html = row('OD',e.rx_near_od_sph,e.rx_near_od_cyl,e.rx_near_od_ax)+'&nbsp;&nbsp;'+row('OS',e.rx_near_os_sph,e.rx_near_os_cyl,e.rx_near_os_ax)+(_nz(e.rx_near_od_pd)?' &nbsp;<b>PD:</b> '+e.rx_near_od_pd:'')+(_nz(e.rx_near_od_add)?' &nbsp;<b>Degr:</b> '+e.rx_near_od_add:'');
  else if (type==='cl')  html = row('OD',e.rx_cl_od_sph,e.rx_cl_od_cyl,e.rx_cl_od_ax)+'&nbsp;&nbsp;'+row('OS',e.rx_cl_os_sph,e.rx_cl_os_cyl,e.rx_cl_os_ax)+(_nz(e.rx_cl_od_bc)?' &nbsp;<b>BC:</b> '+e.rx_cl_od_bc:'')+(_nz(e.rx_cl_od_dia)?' &nbsp;<b>DIA:</b> '+e.rx_cl_od_dia:'')+(e.rx_cl_od_type?' &nbsp;'+e.rx_cl_od_type:'');
  prev.innerHTML = html || '('+t('no_data')+')';
  prev.style.display = 'block';
}
function recalcOrder() {
  const fBase = +document.getElementById('o-fprice')?.value||0;
  const fDisc = Math.min(Math.max(+document.getElementById('o-fdisc')?.value||0,0),100);
  const fFinal = Math.round(fBase*(1-fDisc/100));
  if (document.getElementById('o-fprice-final')) document.getElementById('o-fprice-final').value = fFinal;
  const lBase = +document.getElementById('o-lprice')?.value||0;
  const lDisc = Math.min(Math.max(+document.getElementById('o-ldisc')?.value||0,0),100);
  const lPer = Math.round(lBase*(1-lDisc/100));
  const orderType = document.getElementById('o-type')?.value||'Очки';
  const isCL = orderType === 'МКЛ';
  const qty = isCL ? 1 : +(document.getElementById('o-lqty')?.value||2);
  const lFinal = lPer*qty;
  if (document.getElementById('o-lprice-final')) document.getElementById('o-lprice-final').value = lFinal;
  const work = +document.getElementById('o-wprice')?.value||0;
  const prepay = +document.getElementById('o-prepay')?.value||0;
  const total = fFinal+lFinal+work;
  const balance = Math.max(total-prepay,0);
  if (document.getElementById('o-total-display')) document.getElementById('o-total-display').textContent = fmtMoney(total);
  if (document.getElementById('o-balance-display')) document.getElementById('o-balance-display').textContent = t('balance')+': '+fmtMoney(balance);
}
function applyDiscount() {}
function calcTotal() {}
async function saveOrder(id) {
  const patient_id = v('o-pid'); if (!patient_id) { alert(t('select_patient')); return; }
  const rxSel = (document.getElementById('o-rx') && document.getElementById('o-rx').value) || '';
  const [examId, rxType] = rxSel.split('|');
  const rxLabels = {far:'Daljina', comp:'Računar', near:'Blizina', cl:'KS'};
  const fFinal = Math.max(+(document.getElementById('o-fprice-final')?.value||v('o-fprice'))||0, 0);
  const lPriceFinal = Math.max(+(document.getElementById('o-lprice-final')?.value)||0, 0);
  const orderType = v('o-type');
  const isCL = orderType === 'МКЛ';
  const qty = isCL ? 1 : +(document.getElementById('o-lqty')?.value||2);
  const lPerPiece = qty > 0 ? Math.round(lPriceFinal/qty) : lPriceFinal;
  const orderDate = v('o-orderdate') || today();
  const isRedo = !!(document.getElementById('o-is-redo') && document.getElementById('o-is-redo').checked);
  const data = {
    patient_id, type:orderType,
    prescription_label: rxType ? rxLabels[rxType] : null,
    examination_id: examId || null,
    order_number: v('o-ordernum') || null,
    order_date: orderDate,
    frame_code: v('o-fcode'), frame_price: fFinal,
    lens_name: v('o-lname'), lens_price: lPerPiece, lens_qty: qty,
    work_price: v('o-wprice') ? Math.max(+v('o-wprice'),0) : null,
    prepayment: Math.max(+v('o-prepay')||0, 0),
    promised_date: v('o-pdate') || null,
    notes: v('o-notes'),
    is_redo: isRedo
  };
  try {
    if (id) {
      const st = v('o-status');
      const {error} = await db.from('orders').update({...data, status:st}).eq('id',id);
      if (error) throw error;
      toast(t('order_updated'));
    } else {
      const {error} = await db.from('orders').insert({...data, status:'оформлен'});
      if (error) throw error;
      toast(t('order_created'));
    }
    await recalcSalary(patient_id);
    closeModal(); render();
  } catch(err) {
    console.error('saveOrder error:', err);
    alert('❌ ' + t('save_error') + ': ' + (err.message||''));
  }
}
async function updateOrderStatus(id, status) {
  const updates = {status};
  if (status==='готов') updates.ready_date = today();
  if (status==='выдан') updates.issued_date = today();
  const {error} = await db.from('orders').update(updates).eq('id',id);
  if (error) { toast(t('error')+': '+error.message, 'error'); return; }
  toast(t('status_updated')+': '+statusLabel(status));
  render();
}
async function issueOrder(id) {
  const {data:o} = await db.from('orders').select('*').eq('id',id).single();
  const bal = orderBalance(o);
  if (bal > 0 && !confirm(t('issue_confirm').replace('%s', fmtMoney(bal)))) return;
  const {error} = await db.from('orders').update({status:'выдан', issued_date:today()}).eq('id',id);
  if (error) { toast(t('error')+': '+error.message, 'error'); return; }
  toast(t('issue_btn')+' ✓'); render();
}
async function notifyOrderReady(id) {
  const {data:o} = await db.from('orders').select('*, patients(name,telegram_chat_id)').eq('id',id).single();
  if (!o || !o.patients || !o.patients.telegram_chat_id) { toast(t('error'), 'error'); return; }
  const bal = orderBalance(o);
  const paymentText = bal > 0
    ? 'Ostatak po vašoj porudžbini: '+fmtMoney(bal)+'.\nPlačanje karticom ili gotovinom.'
    : 'Porudžbina je u potpunosti plaćena.';
  const msg = 'Zdravo!\n\nNaocare za '+o.patients.name+' su spremne!\n\n'+paymentText+'\n\nMožete ih preuzeti u bilo koje vreme koje vam odgovara.\n\nRadno vreme optike Ginter:\nradnim danima — 09:00–19:00\nsubota — 09:00–13:00\nnedelja — neradan dan.\n\nAko imate pitanja — obratite se Ani @AnnaNvslv 😊\n\nLep dan!';
  const ok = await tgSend(o.patients.telegram_chat_id, msg);
  toast(ok ? '📨 '+t('tg_sent') : t('tg_error'), ok ? 'success' : 'error');
}
async function sendFollowUpSurvey(orderId) {
  const {data:o} = await db.from('orders').select('*, patients(name,telegram_chat_id)').eq('id',orderId).single();
  if (!o || !o.patients || !o.patients.telegram_chat_id) { toast(t('error'), 'error'); return; }
  const firstName = o.patients.name.split(' ')[0];
  const msg = 'Zdravo, '+firstName+'! 👋\n\nProšle su dve nedelje od kada ste preuzeli naocare. Zanimalo me kako se snalazite 🙂\n\n1️⃣ Kako ste sa novim naocarima?\n😊 Odlično\n🤔 Navikavam se\n😕 Imam pitanja\n\n2️⃣ Da li vam okvir odgovara?\n👍 Da\n👎 Ne\n\nNapišite direktno u odgovor na ovu poruku — Ana @AnnaNvslv će vam se javiti lično.\n\nHvala! 🙏';
  const ok = await tgSend(o.patients.telegram_chat_id, msg);
  toast(ok ? '📨 '+t('tg_sent') : t('tg_error'), ok ? 'success' : 'error');
}
async function delOrder(id) {
  if (!confirm(t('confirm_delete_order'))) return;
  const {error} = await db.from('orders').update({deleted_at: new Date().toISOString()}).eq('id',id);
  if (error) { toast(t('error')+': '+error.message, 'error'); return; }
  toast(t('moved_to_trash')); render();
}
