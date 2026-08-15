// ═══ PATIENTS ═══
let _allPatients = [];
let _lastAddedPatientId = null;
let _patientMeta = {};
let _patientSort = 'name_az'; // name_az | name_za | date_new | date_old | dob

// Разбивает старое единое поле name ("Фамилия Имя") на части — нужно только
// как запасной вариант для карточек, у которых ещё не сохранены first_name/last_name.
function _splitName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return { last: parts[0] || '', first: parts.slice(1).join(' ') || '' };
}

async function renderPatients() {
  document.getElementById('content').innerHTML = '<div class="topbar"><h1>'+t('patients')+'</h1><div class="topbar-actions"><div class="search-wrap"><input type="text" id="psearch" placeholder="'+t('search')+'" oninput="filterPatientsUI(this.value)"></div><button class="btn btn-accent" onclick="openAddPatient()">'+t('add_patient_short')+'</button></div></div><div class="content"><div class="spinner">'+t('loading')+'</div></div>';
  const [{data:patients},{data:appts},{data:orders},{data:exams}] = await Promise.all([
    db.from('patients').select('*').is('deleted_at',null),
    db.from('appointments').select('patient_id,date,status').is('deleted_at',null),
    db.from('orders').select('patient_id,status').is('deleted_at',null),
    db.from('examinations').select('patient_id,control_date')
  ]);
  _allPatients = patients || [];
  _patientMeta = _buildPatientMeta(appts||[], orders||[], exams||[]);
  _sortAndRenderPatients(_allPatients);
}

function _sortPatients(list) {
  return list.slice().sort((a, b) => {
    if (_patientSort === 'name_az') return a.name.localeCompare(b.name, 'sr');
    if (_patientSort === 'name_za') return b.name.localeCompare(a.name, 'sr');
    if (_patientSort === 'date_new') return (b.created_at||'').localeCompare(a.created_at||'');
    if (_patientSort === 'date_old') return (a.created_at||'').localeCompare(b.created_at||'');
    if (_patientSort === 'dob') return (a.dob||'9999').localeCompare(b.dob||'9999');
    return 0;
  });
}

function _sortAndRenderPatients(list) {
  renderPatientsTable(_sortPatients(list));
}

function _buildPatientMeta(appts, orders, exams) {
  const meta = {};
  const td = today();
  appts.forEach(a => {
    if (!meta[a.patient_id]) meta[a.patient_id] = {};
    if (a.status === 'запланирован') {
      if (!meta[a.patient_id].planned || a.date < meta[a.patient_id].planned)
        meta[a.patient_id].planned = a.date;
    }
  });
  orders.forEach(o => {
    if (!meta[o.patient_id]) meta[o.patient_id] = {};
    const s = o.status;
    if (s === 'готов') meta[o.patient_id].orderReady = true;
    else if (s === 'в работе' && !meta[o.patient_id].orderReady) meta[o.patient_id].orderWorking = true;
    else if (s === 'оформлен' && !meta[o.patient_id].orderReady && !meta[o.patient_id].orderWorking) meta[o.patient_id].orderNew = true;
  });
  exams.forEach(e => {
    if (!e.control_date) return;
    if (!meta[e.patient_id]) meta[e.patient_id] = {};
    if (e.control_date <= td) meta[e.patient_id].controlDue = true;
  });
  return meta;
}

function _patientBadge(pid) {
  const m = _patientMeta[pid];
  if (!m) return '';
  if (m.orderReady)   return '<span class="pt-badge pt-green">'+statusLabel('готов')+'</span>';
  if (m.controlDue)   return '<span class="pt-badge pt-red">'+t('exam_control')+'</span>';
  if (m.planned)      return '<span class="pt-badge pt-blue">'+fmt(m.planned)+'</span>';
  if (m.orderWorking) return '<span class="pt-badge pt-yellow">'+statusLabel('в работе')+'</span>';
  if (m.orderNew)     return '<span class="pt-badge pt-gray">'+statusLabel('оформлен')+'</span>';
  return '';
}

function _sortBarHtml() {
  const opts = [
    ['name_az', t('sort_name_az')],
    ['name_za', t('sort_name_za')],
    ['date_new', t('sort_date_new')],
    ['date_old', t('sort_date_old')],
    ['dob',     t('sort_dob')]
  ];
  return '<div class="filter-bar" style="margin-top:8px">'+
    opts.map(([k,lbl]) =>
      '<button class="filter-btn'+(k===_patientSort?' active':'')+
      '" onclick="_patientSort=\''+k+'\';_sortAndRenderPatients(_allPatients)">'+lbl+'</button>'
    ).join('')+'</div>';
}

function renderPatientsTable(patients) {
  const c = document.querySelector('.content'); if (!c) return;
  c.innerHTML = '<div class="section-header">'+_sortBarHtml()+'</div>'+
    '<div class="card"><div class="table-wrap"><table>'+
    '<thead><tr>'+
      '<th style="width:54px">ID</th>'+
      '<th>'+t('patient')+'</th>'+
      '<th>'+t('phone')+'</th>'+
      '<th>Telegram</th>'+
      '<th>'+t('dob')+'</th>'+
      '<th></th>'+
    '</tr></thead>'+
    '<tbody>'+
    (patients.length ? patients.map(p =>
      '<tr id="prow-'+p.id+'" style="'+(p.id===_lastAddedPatientId?'background:#d1fae5;transition:background 2s':'')+'">'+
        '<td><span class="badge badge-gray" style="font-size:11px;letter-spacing:0.5px">'+( p.patient_code||'—')+'</span></td>'+
        '<td><div class="flex items-center gap-8"><div class="patient-avatar" style="width:36px;height:36px;font-size:14px">'+initials(p.name)+'</div>'+
          '<div>'+
            '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'+
              '<span class="table-name" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard(\''+p.id+'\')">'+ p.name+'</span>'+
              _patientBadge(p.id)+
            '</div>'+
            (p.email ? '<div class="table-sub">'+p.email+'</div>' : '')+
          '</div></div></td>'+
        '<td class="text-m">'+(p.phone||'—')+'</td>'+
        '<td>'+(p.telegram_chat_id ? '<span class="badge badge-green">✓ TG</span>' : p.telegram_username ? '@'+p.telegram_username : '—')+'</td>'+
        '<td class="text-m">'+(p.dob ? fmt(p.dob) : '—')+'</td>'+
        '<td><div class="flex gap-8">'+
          '<button class="btn btn-ghost btn-xs" onclick="openAddAppointmentFor(\''+p.id+'\')">'+ t('add_appt_short')+'</button>'+
          (isAdmin() ? '<button class="btn btn-ghost btn-xs" onclick="openAddOrderFor(\''+p.id+'\')">'+ t('add_order_short')+'</button>' : '')+
          '<button class="btn btn-accent btn-sm" onclick="openPatientCard(\''+p.id+'\')">'+ t('card')+'</button>'+
          (isAdmin() ? '<button class="btn btn-ghost btn-sm" onclick="openEditPatient(\''+p.id+'\')">✏️</button><button class="btn btn-danger btn-sm" onclick="delPatient(\''+p.id+'\')">🗑</button>' : '')+
        '</div></td>'+
      '</tr>'
    ).join('') : '<tr><td colspan="6"><div class="empty"><p>'+t('no_patients')+'</p></div></td></tr>')+
    '</tbody></table></div></div>';
  if (_lastAddedPatientId) {
    setTimeout(() => { const r = document.getElementById('prow-'+_lastAddedPatientId); if (r) r.style.background = ''; }, 3000);
  }
}

function filterPatientsUI(q) {
  const f = q ? _allPatients.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) ||
    (p.phone && p.phone.includes(q)) ||
    (p.patient_code && p.patient_code.includes(q))
  ) : _allPatients;
  _sortAndRenderPatients(f);
}

// ═══ АНКЕТА ОНЛАЙН-ЗАПИСИ (данные, которые пациент указал при бронировании на booking.html) ═══
function _bookingSurveyHtml(p) {
  const rows = [];
  const arr = v => Array.isArray(v) && v.length ? v.join(', ') : '';
  if (arr(p.visit_reason))      rows.push(['Причина обращения', arr(p.visit_reason)]);
  if (arr(p.complaints))        rows.push(['Жалобы', arr(p.complaints)]);
  if (arr(p.correction_types))  rows.push(['Коррекция зрения', arr(p.correction_types)]);
  if (p.approx_diopters)        rows.push(['Диоптрии (со слов)', p.approx_diopters]);
  if (arr(p.eye_diseases))      rows.push(['Глазные заболевания', arr(p.eye_diseases)]);
  if (arr(p.general_diseases))  rows.push(['Общие заболевания', arr(p.general_diseases)]);
  if (arr(p.visual_loads))      rows.push(['Зрительные нагрузки', arr(p.visual_loads)]);
  if (p.pre_notes)              rows.push(['Примечание пациента', p.pre_notes]);
  if (p.promo_code)             rows.push(['Промокод', p.promo_code]);
  if (!rows.length) return '';
  return '<div class="mb-12" style="background:var(--surface2,#f1f5f9);border-radius:8px;padding:10px 12px">'+
    '<div style="font-size:11px;font-weight:700;color:var(--text-m,#64748b);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">📝 Из анкеты онлайн-записи</div>'+
    rows.map(([label,val]) =>
      '<div style="font-size:12.5px;margin-bottom:3px"><span style="color:var(--text-m,#64748b)">'+label+':</span> '+val+'</div>'
    ).join('')+
  '</div>';
}

// ═══ PATIENT CARD ═══
async function openPatientCard(pid) {
  _cardTab = 'appts';
  openModal('<div class="modal modal-full"><div class="modal-header"><span class="modal-title">'+t('loading')+'</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div><div class="modal-body"><div class="spinner">'+t('loading')+'</div></div></div>');
  await _renderPatientCard(pid);
}
let _openPatientId = null;
async function _renderPatientCard(pid) {
  _openPatientId = pid;
  const [{data:p},{data:appts},{data:orders},{data:exams}] = await Promise.all([
    db.from('patients').select('*').eq('id',pid).single(),
    db.from('appointments').select('*').eq('patient_id',pid).is('deleted_at',null).order('date',{ascending:false}),
    db.from('orders').select('*').eq('patient_id',pid).is('deleted_at',null).order('created_at',{ascending:false}),
    db.from('examinations').select('*').eq('patient_id',pid).order('created_at',{ascending:false})
  ]);
  if (!p) { closeModal(); return; }
  const age = calcAge(p.dob);
  const ageStr = age ? (age + ' ' + t('years')) : '';
  document.getElementById('modal-container').innerHTML =
    '<div class="modal modal-full">'+
      '<div class="modal-header">'+
        '<div class="flex items-center gap-12">'+
          '<div class="patient-avatar" style="width:46px;height:46px;font-size:18px;flex-shrink:0">'+initials(p.name)+'</div>'+
          '<div style="min-width:0">'+
            '<div style="font-size:18px;font-weight:800;display:flex;align-items:center;gap:6px;flex-wrap:wrap;line-height:1.3">'+
              '<span style="word-break:break-word">'+p.name+'</span>'+
              (p.patient_code ? '<span class="badge badge-gray" style="font-size:12px;font-weight:600;flex-shrink:0">'+p.patient_code+'</span>' : '')+
              _patientBadge(pid)+
            '</div>'+
            '<div style="font-size:12px;color:var(--text-m);margin-top:2px">'+(ageStr ? ageStr+' · ' : '')+( p.phone||'')+(p.telegram_chat_id ? ' · ✈️ TG' : '')+'</div>'+
          '</div>'+
        '</div>'+
        '<div class="profile-actions">'+
          (!isErvin() ? '<button class="btn btn-accent btn-sm" onclick="openAddAppointmentFor(\''+pid+'\')">'+'+ '+t('appointments')+'</button>' : '')+
          (isAdmin() ? '<button class="btn btn-accent btn-sm" onclick="openAddOrderFor(\''+pid+'\')">'+'+ '+t('orders')+'</button>' : '')+
          (isAdmin() ? '<button class="btn btn-ghost btn-sm" onclick="closeModal();openEditPatient(\''+pid+'\')">✏️</button><button class="btn btn-danger btn-sm" onclick="delPatientFromCard(\''+pid+'\')" title="'+t('delete')+'">🗑</button>' : '')+
          (!isErvin() ? '<button class="btn btn-ghost btn-sm" onclick="savePatientPDF(\''+pid+'\')">💾 PDF</button>' : '')+
          '<button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>'+
        '</div>'+
      '</div>'+
      '<div class="modal-body">'+
        '<div class="info-grid mb-12">'+
          '<div class="info-item"><label>ID</label><p>'+(p.patient_code||'—')+'</p></div>'+
          '<div class="info-item"><label>'+t('phone')+'</label><p>'+(p.phone||'—')+'</p></div>'+
          '<div class="info-item"><label>Email</label><p>'+(p.email||'—')+'</p></div>'+
          '<div class="info-item"><label>Telegram</label><p>'+(p.telegram_chat_id ? 'ID: '+p.telegram_chat_id : p.telegram_username ? '@'+p.telegram_username : '—')+'</p></div>'+
          '<div class="info-item"><label>'+t('dob')+'</label><p>'+(p.dob ? fmt(p.dob)+(age ? ' ('+age+' '+t('years')+')' : '') : '—')+'</p></div>'+
          '<div class="info-item"><label>'+t('source')+'</label><p>'+(p.source||'—')+'</p></div>'+
          '<div class="info-item"><label>'+t('in_base')+'</label><p>'+fmt((p.created_at||'').split('T')[0])+'</p></div>'+
        '</div>'+
        (p.notes ? '<div class="mb-12 text-m text-sm">'+p.notes+'</div>' : '')+
        _bookingSurveyHtml(p)+
        '<div class="divider"></div>'+
        '<div class="tab-bar">'+
          '<div class="tab'+(_cardTab==='appts'?' active':'')+'" onclick="_cardTab=\'appts\';_renderPatientCard(\''+pid+'\')">'+ t('appointments')+' ('+(appts||[]).length+')</div>'+
          '<div class="tab'+(_cardTab==='exams'?' active':'')+'" onclick="_cardTab=\'exams\';_renderPatientCard(\''+pid+'\')">'+ t('exam_card_short')+' ('+(exams||[]).length+')</div>'+
          '<div class="tab'+(_cardTab==='orders'?' active':'')+'" onclick="_cardTab=\'orders\';_renderPatientCard(\''+pid+'\')">'+ t('orders')+' ('+(orders||[]).length+')</div>'+
        '</div>'+
        (_cardTab==='appts' ? _apptTab(appts||[], pid) : '')+
        (_cardTab==='exams' ? _examTabHtml(exams||[], pid) : '')+
        (_cardTab==='orders' ? _orderTab(orders||[], pid) : '')+
      '</div>'+
    '</div>';
}

function _apptTab(appts, pid) {
  if (!appts.length) return '<div class="empty"><p>'+t('no_appts')+'</p></div>';
  return appts.map(a =>
    '<div class="history-item">'+
      '<div class="history-dot"></div>'+
      '<div style="flex:1;min-width:0">'+
        '<div class="history-date">'+ fmt(a.date)+' в '+(a.time||'').substr(0,5)+
          ' · <span class="badge '+(STATUS_BADGE[a.status]||'badge-gray')+'" style="font-size:11px">'+statusLabel(a.status)+'</span></div>'+
        '<div class="history-title" style="word-break:break-word">'+
          (a.appointment_number ? '<span class="badge badge-accent" style="font-size:10px;margin-right:4px">'+a.appointment_number+'</span>' : '')+
          (a.type || t('appointments'))+
        '</div>'+
        (a.consultation_price ? '<div class="text-sm text-m">'+t('cost')+': '+fmtMoney(a.consultation_price)+'</div>' : '')+
      '</div>'+
      '<div class="history-actions">'+
        (!isErvin() ? '<button class="btn btn-primary btn-sm" onclick="openExamForm(\''+a.id+'\',\''+pid+'\')">📋 '+t('exam_card_short')+'</button>' : '')+
        '<button class="btn btn-ghost btn-sm" onclick="openEditAppt(\''+a.id+'\')">✏️</button>'+
        (a.status==='запланирован' && !isErvin() ?
          '<button class="btn btn-success btn-sm" onclick="openCompleteApptPopup(\''+a.id+'\','+( a.consultation_price||3000)+')">✓</button>'+
          '<button class="btn btn-ghost btn-sm" onclick="cancelAppt(\''+a.id+'\')">🚫</button>'+
          '<button class="btn btn-danger btn-sm" onclick="deleteAppt(\''+a.id+'\')">🗑</button>' : '')+
        (a.status==='отменён' ? '<span class="badge badge-gray">'+t('status_cancelled')+'</span>' : '')+
      '</div>'+
    '</div>'
  ).join('');
}

function _examTabHtml(exams, pid) {
  if (!exams.length) return '<div class="empty"><p>'+t('exam_none')+'</p></div>';
  return exams.map(e =>
    '<div class="history-item">'+
      '<div class="history-dot" style="background:var(--primary-l);border-color:var(--primary)"></div>'+
      '<div style="flex:1;min-width:0">'+
        '<div class="history-date">'+t('visit')+(e.visit_number||'—')+' · '+fmt((e.created_at||'').split('T')[0])+'</div>'+
        '<div class="history-title">'+t('exam_card')+'</div>'+
        '<div class="text-sm text-m">'+
          ([e.rx_far_od_sph ? t('exam_far_short') : '', e.rx_comp_od_sph ? t('exam_comp_short') : '',
            e.rx_near_od_sph ? t('exam_near_short') : '', e.rx_cl_od_sph ? t('exam_cl_short') : '']
            .filter(Boolean).join(' · ') || t('exam_no_data'))+
        '</div>'+
        (e.control_date ? '<div class="text-sm" style="color:var(--warn)">'+t('exam_control')+': '+fmt(e.control_date)+'</div>' : '')+
      '</div>'+
      '<div class="history-actions">'+
        '<button class="btn btn-ghost btn-sm" onclick="openExamView(\''+e.id+'\',\''+pid+'\')">'+ t('exam_open_btn')+'</button>'+
        '<button class="btn btn-primary btn-sm" onclick="printExam(\''+e.id+'\')">🖨️</button>'+
      '</div>'+
    '</div>'
  ).join('');
}

function _orderTab(orders, pid) {
  if (!orders.length) return '<div class="empty"><p>'+t('no_orders')+'</p></div>';
  return orders.map(o => {
    const bal = orderBalance(o);
    return '<div class="history-item">'+
      '<div class="history-dot" style="background:var(--accent-l);border-color:var(--accent)"></div>'+
      '<div style="flex:1;min-width:0">'+
        '<div class="history-date">'+fmt((o.created_at||'').split('T')[0])+
          ' · <span class="badge '+(STATUS_BADGE[o.status]||'badge-gray')+'" style="font-size:11px">'+statusLabel(o.status)+'</span>'+
          (o.counts_for_salary ? ' <span class="salary-badge">💰</span>' : '')+
        '</div>'+
        '<div class="history-title" style="word-break:break-word">'+o.type+
          (o.prescription_label ? ' — '+o.prescription_label : '')+
          (o.order_number ? ' <span class="badge badge-gray" style="font-size:10px">№'+o.order_number+'</span>' : '')+
        '</div>'+
        '<div class="text-sm text-m">'+([o.frame_code, o.lens_name].filter(Boolean).join(' / ') || '—')+'</div>'+
        '<div class="text-sm mt-4">'+t('total')+': <b>'+fmtMoney(orderTotal(o))+'</b>'+
          ' · '+t('prepayment')+': '+fmtMoney(o.prepayment)+
          ' · '+t('balance')+': <span class="'+(bal>0?'money-debt':'money-paid')+'">'+fmtMoney(bal)+'</span>'+
        '</div>'+
      '</div>'+
      '<div class="history-actions">'+
        (o.status==='в работе' && !isErvin() ? '<button class="btn btn-ghost btn-sm" onclick="updateOrderStatus(\''+o.id+'\',\'готов\')">'+t('mark_ready_btn')+'</button>' : '')+
        (o.status==='готов' && !isErvin() ? '<button class="btn btn-ghost btn-sm" onclick="notifyOrderReady(\''+o.id+'\')">📨</button><button class="btn btn-accent btn-sm" onclick="issueOrder(\''+o.id+'\')">'+ t('issue_btn')+'</button>' : '')+
        (o.status==='выдан' && !isErvin() ? '<button class="btn btn-ghost btn-sm" onclick="sendFollowUpSurvey(\''+o.id+'\')">🔁</button>' : '')+
        '<button class="btn btn-ghost btn-sm" onclick="openOrderCard(\''+o.id+'\')">'+ t('card')+'</button>'+
      '</div>'+
    '</div>';
  }).join('');
}

// ═══ PATIENT FORM ═══
function openAddPatient() { _patientForm(null); }
async function openEditPatient(id) { const {data:p} = await db.from('patients').select('*').eq('id',id).single(); _patientForm(p); }
function _patientForm(p) {
  // first_name/last_name — отдельные столбцы (см. миграцию patients_name_split.sql).
  // Для карточек, сохранённых до миграции, — запасной разбор старого name.
  const splitFallback = p && !p.last_name && !p.first_name ? _splitName(p.name) : {last:'', first:''};
  const lastVal = (p && p.last_name) || splitFallback.last || '';
  const firstVal = (p && p.first_name) || splitFallback.first || '';
  openModal(
    '<div class="modal modal-lg">'+
      '<div class="modal-header"><span class="modal-title">'+(p ? t('edit_patient') : t('new_patient'))+'</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>'+
      '<div class="modal-body">'+
        '<div class="form-grid">'+
          (p && p.patient_code ? '<div class="form-group"><label>ID</label><input value="'+p.patient_code+'" disabled style="background:var(--surface2);color:var(--text-m)"></div>' : '')+
          '<div class="form-group"><label>'+t('last_name')+' *</label><input id="p-lastname" value="'+lastVal+'"></div>'+
          '<div class="form-group"><label>'+t('first_name')+' *</label><input id="p-firstname" value="'+firstVal+'"></div>'+
          '<div class="form-group"><label>'+t('phone')+'</label><input id="p-phone" value="'+(p&&p.phone||'')+'"></div>'+
          '<div class="form-group"><label>Email</label><input id="p-email" value="'+(p&&p.email||'')+'"></div>'+
          '<div class="form-group">'+
            '<label>'+t('dob')+'</label>'+
            '<input type="date" id="p-dob" value="'+(p&&p.dob||'')+'" max="'+today()+'" oninput="showAgeHint(this.value)">'+
            '<div id="age-hint" class="age-hint">'+(p&&p.dob ? calcAge(p.dob)+' '+t('years') : '')+'</div>'+
          '</div>'+
          '<div class="form-group"><label>Telegram @username</label><input id="p-tguser" value="'+(p&&p.telegram_username||'')+'"></div>'+
          '<div class="form-group"><label>Telegram Chat ID</label><input type="number" id="p-tgid" value="'+(p&&p.telegram_chat_id||'')+'" placeholder="123456789"></div>'+
          '<div class="form-group full"><label>'+t('source')+'</label>'+
            '<select id="p-source"><option value="">—</option>'+SOURCES.map(s => '<option '+(p&&p.source===s?'selected':'')+'>'+s+'</option>').join('')+'</select>'+
          '</div>'+
          '<div class="form-group full"><label>'+t('notes')+'</label><textarea id="p-notes">'+(p&&p.notes||'')+'</textarea></div>'+
        '</div>'+
      '</div>'+
      '<div class="modal-footer">'+
        '<button class="btn btn-ghost" onclick="closeModal()">'+t('cancel')+'</button>'+
        '<button class="btn btn-accent" onclick="savePatient(\''+( p&&p.id||'')+'\')">'+t('save')+'</button>'+
      '</div>'+
    '</div>'
  );
}
function showAgeHint(dob) {
  const a = calcAge(dob);
  document.getElementById('age-hint').textContent = a ? a+' '+t('years') : '';
}
async function savePatient(id) {
  const lastName = v('p-lastname'), firstName = v('p-firstname');
  if (!lastName && !firstName) { alert(t('enter_name')); return; }
  const name = [lastName, firstName].filter(Boolean).join(' ');
  const tgIdRaw = v('p-tgid');
  const telegram_chat_id = tgIdRaw ? +tgIdRaw : null;
  const data = {name, last_name:lastName||null, first_name:firstName||null, phone:v('p-phone'), email:v('p-email'), dob:v('p-dob')||null,
    telegram_username:v('p-tguser'), telegram_chat_id, source:v('p-source'), notes:v('p-notes')};
  try {
    let np;
    try {
      if (id) {
        const {error} = await db.from('patients').update(data).eq('id',id);
        if (error) throw error;
      } else {
        const res = await db.from('patients').insert(data).select().single();
        if (res.error) throw res.error;
        np = res.data;
      }
    } catch (err) {
      // На случай если миграция patients_name_split.sql ещё не запущена в Supabase —
      // столбцов last_name/first_name пока нет. Сохраняем без них (имя всё равно в поле name).
      if (err.message && err.message.includes('last_name') || err.message && err.message.includes('first_name')) {
        delete data.last_name; delete data.first_name;
        if (id) {
          const {error} = await db.from('patients').update(data).eq('id',id);
          if (error) throw error;
        } else {
          const res = await db.from('patients').insert(data).select().single();
          if (res.error) throw res.error;
          np = res.data;
        }
      } else {
        throw err;
      }
    }
    if (id) {
      toast(t('updated')); _lastAddedPatientId = null;
      closeModal(); openPatientCard(id);
    } else {
      _lastAddedPatientId = np && np.id;
      toast(t('added'));
      closeModal();
      if (np && np.id) openPatientCard(np.id); else render();
    }
  } catch(err) {
    console.error('savePatient error:', err);
    alert('❌ ' + t('save_error') + ': ' + (err.message||''));
  }
}
async function delPatient(id) {
  if (!confirm(t('confirm_delete_patient'))) return;
  await db.from('patients').update({deleted_at: new Date().toISOString()}).eq('id',id);
  toast(t('moved_to_trash')); render();
}
async function delPatientFromCard(pid) {
  if (!confirm(t('confirm_delete_patient'))) return;
  await db.from('patients').update({deleted_at: new Date().toISOString()}).eq('id',pid);
  toast(t('moved_to_trash')); closeModal(); render();
}
