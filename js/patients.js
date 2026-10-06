// ═══ PATIENTS ═══
// Раздел «Пациенты» — как в Ginter CRM: слева список по алфавиту, справа карточка.
// На мобильном — сначала список, по тапу карточка с кнопкой «← Пациенты».
let _allPatients = [];
let _lastAddedPatientId = null;
let _patientMeta = {};
let _patientSort = 'name_az'; // name_az | name_za | date_new | date_old | dob | visit_new
let _patientQuery = '';
let _ptShowDetail = false;   // мобильный: показывать карточку вместо списка

// Разбивает старое единое поле name ("Фамилия Имя") на части — нужно только
// как запасной вариант для карточек, у которых ещё не сохранены first_name/last_name.
function _splitName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return { last: parts[0] || '', first: parts.slice(1).join(' ') || '' };
}

async function renderPatients() {
  const prevList = document.getElementById('pt-list');
  const prevScroll = prevList ? prevList.scrollTop : 0;
  document.getElementById('content').innerHTML =
    '<div class="topbar"><h1>'+t('patients')+'</h1><div class="topbar-actions">'+
      '<button id="dupes-btn" class="btn btn-ghost" style="display:none" onclick="openDupesModal()"></button>'+
      (!isErvin() ? '<button class="btn btn-accent" onclick="openAddPatient()">'+t('add_patient_short')+'</button>' : '')+
    '</div></div>'+
    '<div class="content pt-content">'+
      '<div class="pt-layout'+(_ptShowDetail && _openPatientId ? ' show-detail' : '')+'" id="pt-layout">'+
        '<aside class="pt-list-pane">'+
          '<div class="pt-list-tools">'+
            '<div class="search-wrap pt-search"><input type="search" id="psearch" placeholder="'+t('pt_search_ph')+'" value="'+_escH(_patientQuery)+'" oninput="filterPatientsUI(this.value)" autocomplete="off"></div>'+
            '<select id="pt-sort" class="pt-sort" onchange="_patientSort=this.value;filterPatientsUI(_patientQuery)">'+
              [['name_az',t('sort_name_az')],['name_za',t('sort_name_za')],['visit_new',t('sort_visit_new')],['date_new',t('sort_date_new')],['date_old',t('sort_date_old')],['dob',t('sort_dob')]]
                .map(([k,l]) => '<option value="'+k+'"'+(k===_patientSort?' selected':'')+'>'+l+'</option>').join('')+
            '</select>'+
          '</div>'+
          '<div class="pt-count" id="pt-count"></div>'+
          '<div class="pt-list" id="pt-list"><div class="spinner">'+t('loading')+'</div></div>'+
        '</aside>'+
        '<section class="pt-detail" id="pt-detail">'+_ptEmptyDetail()+'</section>'+
      '</div>'+
    '</div>';
  const [{data:patients},{data:appts},{data:orders},{data:exams}] = await Promise.all([
    db.from('patients').select('*').is('deleted_at',null),
    db.from('appointments').select('patient_id,date,status').is('deleted_at',null),
    db.from('orders').select('patient_id,status').is('deleted_at',null),
    db.from('examinations').select('patient_id,control_date,created_at').is('deleted_at',null)
  ]);
  _allPatients = patients || [];
  _patientMeta = _buildPatientMeta(appts||[], orders||[], exams||[]);
  filterPatientsUI(_patientQuery);
  const lst = document.getElementById('pt-list'); if (lst && prevScroll) lst.scrollTop = prevScroll;
  _updateDupesBtn();
  if (_openPatientId && _allPatients.some(p => p.id === _openPatientId)) {
    await _renderPatientCard(_openPatientId);
  } else if (_openPatientId) {
    _openPatientId = null; _ptShowDetail = false;
  }
  if (_lastAddedPatientId) {
    const r = document.getElementById('pt-item-'+_lastAddedPatientId);
    if (r) { r.scrollIntoView({block:'center'}); r.classList.add('pt-flash'); setTimeout(() => r.classList.remove('pt-flash'), 2500); }
    _lastAddedPatientId = null;
  }
}

function _ptEmptyDetail() {
  return '<div class="pt-empty"><div class="pt-empty-ico">👁</div><p>'+t('pt_select_hint')+'</p></div>';
}

function _sortPatients(list) {
  const lv = p => (_patientMeta[p.id] && _patientMeta[p.id].lastVisit) || '';
  return list.slice().sort((a, b) => {
    if (_patientSort === 'name_az') return (a.name||'').localeCompare(b.name||'', 'sr');
    if (_patientSort === 'name_za') return (b.name||'').localeCompare(a.name||'', 'sr');
    if (_patientSort === 'visit_new') return lv(b).localeCompare(lv(a)) || (a.name||'').localeCompare(b.name||'', 'sr');
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
  const m = id => (meta[id] = meta[id] || {});
  appts.forEach(a => {
    const x = m(a.patient_id);
    if (a.status === 'запланирован' && a.date >= td) {
      if (!x.planned || a.date < x.planned) x.planned = a.date;
    }
    if (a.status === 'завершён' || (a.status !== 'отменён' && a.date && a.date <= td)) {
      if (!x.lastVisit || a.date > x.lastVisit) x.lastVisit = a.date;
    }
  });
  orders.forEach(o => {
    const x = m(o.patient_id);
    const s = o.status;
    if (s === 'готов') x.orderReady = true;
    else if (s === 'в работе' && !x.orderReady) x.orderWorking = true;
    else if (s === 'оформлен' && !x.orderReady && !x.orderWorking) x.orderNew = true;
  });
  exams.forEach(e => {
    const x = m(e.patient_id);
    const d = (e.created_at || '').split('T')[0];
    if (d && (!x.lastVisit || d > x.lastVisit)) x.lastVisit = d;
    if (e.control_date && e.control_date <= td) x.controlDue = true;
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

// Список пациентов (левая панель). Имя функции сохранено — её вызывают другие места.
function renderPatientsTable(patients) {
  const box = document.getElementById('pt-list'); if (!box) return;
  const cnt = document.getElementById('pt-count');
  if (cnt) cnt.textContent = patients.length + ' ' + t('pt_count_suffix') + (_patientQuery ? ' · ' + t('pt_found') : '');
  if (!patients.length) {
    box.innerHTML = '<div class="empty"><p>'+(_patientQuery ? t('pt_not_found') : t('no_patients'))+'</p></div>';
    return;
  }
  const byName = _patientSort === 'name_az' || _patientSort === 'name_za';
  let lastLetter = null, html = '';
  patients.forEach(p => {
    if (byName) {
      const L = ((p.name||'').trim()[0] || '#').toUpperCase();
      if (L !== lastLetter) { html += '<div class="pt-letter">'+_escH(L)+'</div>'; lastLetter = L; }
    }
    const meta = _patientMeta[p.id] || {};
    const sub = [p.phone, p.patient_code].filter(Boolean).map(_escH).join(' · ');
    html +=
      '<div class="pt-item'+(p.id===_openPatientId?' active':'')+'" id="pt-item-'+p.id+'" onclick="openPatientCard(\''+p.id+'\')">'+
        '<div class="patient-avatar pt-av">'+_escH(initials(p.name))+'</div>'+
        '<div class="pt-item-main">'+
          '<div class="pt-item-name">'+_escH(p.name)+(p.telegram_username ? ' '+tgTag(p.telegram_username,{link:false}) : '')+(p.telegram_chat_id ? ' <span class="tg-on" title="Telegram подключён">✈</span>' : '')+'</div>'+
          '<div class="pt-item-meta">'+(sub || '<span class="text-l">'+t('pt_no_phone')+'</span>')+'</div>'+
          (_patientBadge(p.id) ? '<div class="pt-item-badges">'+_patientBadge(p.id)+'</div>' : '')+
        '</div>'+
        '<div class="pt-item-visit">'+(meta.lastVisit ? '<span>'+t('pt_last_visit_short')+'</span>'+fmt(meta.lastVisit) : '')+'</div>'+
      '</div>';
  });
  box.innerHTML = html;
}

// Поиск по любым словам в любом порядке: ФИО, телефон (без учёта пробелов и +381/0),
// ID, email, Telegram-ник и заметки. «петрова 064» и «064 петрова» найдут одного пациента.
function _ptHaystack(p) {
  const digits = (p.phone || '').replace(/\D/g, '');
  return [p.name, p.phone, digits, digits.replace(/^381/, '0'), p.patient_code, p.email,
    p.telegram_username, tgNick(p.telegram_username), p.notes].filter(Boolean).join(' ').toLowerCase();
}
function filterPatientsUI(q) {
  _patientQuery = q || '';
  const tokens = _patientQuery.trim().toLowerCase().split(/\s+/).filter(Boolean).map(tk => tk.replace(/^@/, ''));
  const f = tokens.length
    ? _allPatients.filter(p => {
        const h = _ptHaystack(p);
        return tokens.every(tk => h.includes(tk) || (/^[\d\s+()\/-]{3,}$/.test(tk) && h.includes(tk.replace(/\D/g, ''))));
      })
    : _allPatients;
  _sortAndRenderPatients(f);
}

// ═══ АНКЕТА ОНЛАЙН-ЗАПИСИ (данные, которые пациент указал при бронировании на booking.html) ═══
function _bookingSurveyHtml(p, title) {
  const rows = [];
  const arr = v => Array.isArray(v) && v.length ? v.join(', ') : '';
  if (arr(p.visit_reason))      rows.push(['Причина обращения', arr(p.visit_reason)]);
  if (arr(p.complaints))        rows.push(['Жалобы', arr(p.complaints)]);
  if (arr(p.correction_types))  rows.push(['Коррекция зрения', arr(p.correction_types)]);
  if (p.approx_diopters)        rows.push(['Диоптрии (со слов)', p.approx_diopters]);
  if (arr(p.eye_diseases))      rows.push(['Глазные заболевания', arr(p.eye_diseases)]);
  if (p.eye_diseases_other)     rows.push(['Глазные заболевания (другое)', p.eye_diseases_other]);
  if (arr(p.eye_surgeries))     rows.push(['Операции на глазах', arr(p.eye_surgeries)]);
  if (p.eye_surgery_year)       rows.push(['Год операции', p.eye_surgery_year]);
  if (arr(p.general_diseases))  rows.push(['Общие заболевания', arr(p.general_diseases)]);
  if (arr(p.visual_loads))      rows.push(['Зрительные нагрузки', arr(p.visual_loads)]);
  if (p.pre_notes)              rows.push(['Примечание пациента', p.pre_notes]);
  if (p.promo_code)             rows.push(['Промокод', p.promo_code]);
  const kq = p.kids_questionnaire;
  if (kq && typeof kq === 'object') {
    const kqLabels = {
      first: 'Первый раз проверка/первые очки',
      prescribed: 'Врач что-то выписал, нужна доуточнение',
      using: 'Уже носит очки, нужна коррекция',
      rx: 'Диоптрии устоялись',
      exam: 'Был у врача недавно',
      disease: 'Жалобы на резкое ухудшение зрения',
      special: 'Особые обстоятельства'
    };
    const yn = v => v === true ? 'да' : v === false ? 'нет' : (v || '');
    const kqParts = [];
    Object.keys(kqLabels).forEach(k => {
      if (kq[k] !== undefined && kq[k] !== null && kq[k] !== '') kqParts.push(kqLabels[k] + ': ' + yn(kq[k]));
    });
    const resultLabel = kq.result === 'accept' ? '✅ Можно записать (с предупреждением)' : kq.result === 'decline' ? '⚠️ Направлена к офтальмологу' : (kq.result || '');
    if (resultLabel) kqParts.unshift('Итог анкеты: ' + resultLabel);
    if (kqParts.length) rows.push(['Анкета для подростка (12–17)', kqParts.join('; ')]);
  }
  if (!rows.length) return '';
  return '<div class="mb-12" style="background:var(--surface2,#f1f5f9);border-radius:8px;padding:10px 12px">'+
    (title === false ? '' : '<div style="font-size:11px;font-weight:700;color:var(--text-m,#64748b);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">📝 '+(title || t('intake_title'))+'</div>')+
    rows.map(([label,val]) =>
      '<div style="font-size:12.5px;margin-bottom:3px"><span style="color:var(--text-m,#64748b)">'+label+':</span> '+val+'</div>'
    ).join('')+
  '</div>';
}

function _hasIntake(a) { return !!(a && a.intake && typeof a.intake === 'object' && Object.keys(a.intake).length); }
// В карточке — анкета последней онлайн-записи; для старых карточек (до миграции 005) — анкета из самой карточки.
function _cardSurveyHtml(p, appts) {
  const a = appts.find(_hasIntake);   // appts отсортированы по дате, новые сверху
  if (a) return _bookingSurveyHtml(a.intake, t('intake_title')+' · '+fmt(a.date));
  return _bookingSurveyHtml(p);
}

// ═══ ОБЪЕДИНЕНИЕ ДУБЛЕЙ ═══
// Сравнение ФИО без учёта регистра, пробелов и порядка слов — как norm_patient_name() в SQL.
function _normName(n) { return (n||'').toLowerCase().trim().split(/\s+/).filter(Boolean).sort().join(' '); }
function _escH(v) { return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

// Группы возможных дублей: одинаковое ФИО и одинаковая дата рождения (или дата не указана).
// Разные даты рождения = разные люди. Внутри группы первым идёт самая старая карточка.
function _findDupeGroups(list) {
  const byName = {};
  list.forEach(p => { const k = _normName(p.name); if (k) (byName[k] = byName[k] || []).push(p); });
  const groups = [];
  Object.values(byName).forEach(g => {
    if (g.length < 2) return;
    const byDob = {}, noDob = [];
    g.forEach(p => p.dob ? (byDob[p.dob] = byDob[p.dob] || []).push(p) : noDob.push(p));
    const keys = Object.keys(byDob);
    if (!keys.length) { groups.push(noDob); return; }
    if (keys.length === 1) { const gg = byDob[keys[0]].concat(noDob); if (gg.length > 1) groups.push(gg); return; }
    keys.forEach(k => { if (byDob[k].length > 1) groups.push(byDob[k]); });
  });
  groups.forEach(g => g.sort((a,b) => (a.created_at||'').localeCompare(b.created_at||'')));
  return groups.sort((a,b) => a[0].name.localeCompare(b[0].name, 'sr'));
}

function _updateDupesBtn() {
  const b = document.getElementById('dupes-btn'); if (!b) return;
  const n = isAdmin() ? _findDupeGroups(_allPatients).length : 0;
  b.style.display = n ? '' : 'none';
  b.textContent = '👥 '+t('dupes_btn')+' ('+n+')';
}

function _mergeRowHtml(x, actionHtml) {
  const sub = [x.patient_code, x.dob ? fmt(x.dob) : '', x.phone, x.telegram_username, x.created_at ? t('in_base')+': '+fmt(x.created_at.split('T')[0]) : '']
    .filter(Boolean).map(_escH).join(' · ');
  return '<div class="history-item" style="align-items:center">'+
    '<div style="flex:1;min-width:0"><div class="history-title" style="word-break:break-word">'+_escH(x.name)+'</div>'+
    '<div class="text-sm text-m">'+sub+'</div></div>'+
    '<div class="history-actions">'+actionHtml+'</div></div>';
}

let _mergeKeepId = null, _mergeAll = [];
async function openMergePatient(pid) {
  _mergeKeepId = pid;
  const {data} = await db.from('patients').select('id,name,dob,phone,telegram_username,patient_code,created_at').is('deleted_at',null);
  _mergeAll = data || [];
  const me = _mergeAll.find(x => x.id === pid); if (!me) return;
  const key = _normName(me.name);
  const myWords = key.split(' ');
  const sugg = _mergeAll.filter(x => x.id !== pid && (
    _normName(x.name) === key ||
    (me.dob && x.dob === me.dob && _normName(x.name).split(' ').some(w => myWords.includes(w)))
  ));
  openModal('<div class="modal modal-lg">'+
    '<div class="modal-header"><span class="modal-title">🔗 '+t('merge_title')+'</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body">'+
      '<div class="mb-12" style="background:var(--surface2,#f1f5f9);border-radius:8px;padding:10px 12px">'+
        '<div class="fw-6">'+_escH(me.name)+(me.dob ? ' · '+fmt(me.dob) : '')+(me.patient_code ? ' · '+_escH(me.patient_code) : '')+'</div>'+
        '<div class="text-sm text-m" style="margin-top:4px">'+t('merge_hint')+'</div>'+
      '</div>'+
      (sugg.length ? '<div class="fw-6 mb-8">'+t('merge_suggested')+'</div>'+sugg.map(x => _mergeRowHtml(x, _mergeBtn(pid, x.id, 'card'))).join('')+'<div class="divider"></div>' : '')+
      '<div class="fw-6 mb-8">'+t('merge_all')+'</div>'+
      '<input type="text" id="merge-q" placeholder="'+t('search')+'" oninput="_renderMergeSearch(this.value)" style="margin-bottom:8px">'+
      '<div id="merge-results"></div>'+
    '</div></div>');
  setTimeout(() => { const q = document.getElementById('merge-q'); if (q) q.focus(); }, 250);
}
function _mergeBtn(keepId, dropId, after) {
  return '<button class="btn btn-accent btn-sm" onclick="confirmMergePatients(\''+keepId+'\',\''+dropId+'\',\''+after+'\')">🔗 '+t('merge_btn')+'</button>';
}
function _renderMergeSearch(q) {
  const box = document.getElementById('merge-results'); if (!box) return;
  q = (q||'').trim().toLowerCase();
  if (q.length < 2) { box.innerHTML = ''; return; }
  const res = _mergeAll.filter(x => x.id !== _mergeKeepId && (
    (x.name||'').toLowerCase().includes(q) || (x.phone||'').includes(q) || (x.patient_code||'').includes(q) ||
    (x.telegram_username||'').toLowerCase().includes(q)
  )).slice(0, 30);
  box.innerHTML = res.length ? res.map(x => _mergeRowHtml(x, _mergeBtn(_mergeKeepId, x.id, 'card'))).join('') : '<div class="empty"><p>—</p></div>';
}

async function confirmMergePatients(keepId, dropId, after) {
  const pool = _mergeAll.length ? _mergeAll : _allPatients;
  const nm = id => ((pool.find(x => x.id === id) || _allPatients.find(x => x.id === id) || {}).name || '?');
  if (!confirm(t('merge_confirm').replace('{drop}', nm(dropId)).replace('{keep}', nm(keepId)))) return;
  const {data, error} = await db.rpc('merge_patients', {keep_id: keepId, drop_id: dropId});
  if (error) {
    const missing = error.code === 'PGRST202' || /merge_patients/.test(error.message||'');
    toast(missing ? t('merge_need_sql') : (t('error')+': '+(error.message||'')), 'error');
    return;
  }
  const d = data || {};
  toast(t('merge_done')+' ('+t('appointments')+': '+(d.appointments||0)+', '+t('exam_card_short')+': '+(d.examinations||0)+', '+t('orders')+': '+(d.orders||0)+')');
  _mergeAll = [];
  if (after === 'dupes') {
    if (document.getElementById('psearch')) await renderPatients();
    else { const {data:pp} = await db.from('patients').select('*').is('deleted_at',null); _allPatients = pp || []; }
    openDupesModal();
  } else {
    closeModal();
    _openPatientId = keepId;
    if (curSection === 'patients') await renderPatients(); else await openPatientCard(keepId);
  }
}

function openDupesModal() {
  const groups = _findDupeGroups(_allPatients);
  openModal('<div class="modal modal-lg">'+
    '<div class="modal-header"><span class="modal-title">👥 '+t('dupes_title')+' ('+groups.length+')</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body">'+
      (groups.length ? '<div class="text-sm text-m mb-12">'+t('dupes_hint')+'</div>'+
        groups.map(g =>
          '<div class="card mb-12" style="padding:10px 12px">'+
            g.map((x, i) => _mergeRowHtml(x,
              '<button class="btn btn-ghost btn-sm" onclick="openPatientCard(\''+x.id+'\')">'+t('card')+'</button>'+
              (i === 0 ? '<span class="badge badge-green">'+t('dupes_keep')+'</span>' : _mergeBtn(g[0].id, x.id, 'dupes'))
            )).join('')+
          '</div>'
        ).join('')
      : '<div class="empty"><p>'+t('dupes_none')+'</p></div>')+
    '</div></div>');
}

// ═══ PATIENT CARD (правая панель) ═══
// openPatientCard(pid) — глобальная точка входа: из дашборда, приёмов, заказов, календаря,
// аналитики и из бота. Если открыт другой раздел — переходит в «Пациенты» и открывает пациента.
let _openPatientId = null;
async function openPatientCard(pid) {
  if (!pid) return;
  _openPatientId = pid;
  _ptShowDetail = true;
  _cardTab = 'rx';
  const ov = document.getElementById('overlay');
  if (ov && !ov.classList.contains('hidden')) closeModal();
  if (curSection !== 'patients' || !document.getElementById('pt-detail')) {
    nav('patients');
    if (typeof _mobActive === 'function') _mobActive();
    return; // renderPatients() сам откроет _openPatientId
  }
  document.querySelectorAll('.pt-item.active').forEach(el => el.classList.remove('active'));
  document.getElementById('pt-item-'+pid)?.classList.add('active');
  document.getElementById('pt-layout')?.classList.add('show-detail');
  await _renderPatientCard(pid);
  if (window.innerWidth <= 768) window.scrollTo(0, 0);
}
function showPatientList() {
  _ptShowDetail = false;
  document.getElementById('pt-layout')?.classList.remove('show-detail');
}
function closePatientCard() {
  _openPatientId = null; _ptShowDetail = false;
  document.querySelectorAll('.pt-item.active').forEach(el => el.classList.remove('active'));
  const d = document.getElementById('pt-detail'); if (d) d.innerHTML = _ptEmptyDetail();
  document.getElementById('pt-layout')?.classList.remove('show-detail');
}
function _switchCardTab(tab) {
  _cardTab = tab;
  if (_openPatientId) _renderPatientCard(_openPatientId);
}

const _ORDER_ACTIVE = ['оформлен','в работе','готов','переделка'];
const _ORDER_VOID = ['отменен','возврат'];

async function _renderPatientCard(pid) {
  const box = document.getElementById('pt-detail');
  // Карточка открыта не в разделе «Пациенты» (например, действие из списка приёмов) —
  // просто обновляем текущий раздел.
  if (!box) { render(); return; }
  _openPatientId = pid;
  const keepScroll = box.dataset.pid === pid ? box.scrollTop : 0;
  if (box.dataset.pid !== pid) box.innerHTML = '<div class="spinner">'+t('loading')+'</div>';
  const [{data:p},{data:appts},{data:orders},{data:exams}] = await Promise.all([
    db.from('patients').select('*').eq('id',pid).single(),
    db.from('appointments').select('*').eq('patient_id',pid).is('deleted_at',null).order('date',{ascending:false}).order('time',{ascending:false}),
    db.from('orders').select('*').eq('patient_id',pid).is('deleted_at',null).order('created_at',{ascending:false}),
    db.from('examinations').select('*').eq('patient_id',pid).is('deleted_at',null).order('created_at',{ascending:false})
  ]);
  if (_openPatientId !== pid) return; // пока грузили, открыли другого пациента
  if (!p || p.deleted_at) { closePatientCard(); return; }
  const A = appts || [], O = orders || [], E = exams || [];
  (E).forEach(e => { if (window._examCache) window._examCache[e.id] = e; });
  // Заказы сортируем по дате оформления (её часто вносят задним числом)
  O.sort((a,b) => (b.order_date||(b.created_at||'').split('T')[0]).localeCompare(a.order_date||(a.created_at||'').split('T')[0]));
  const age = calcAge(p.dob);
  const td = today();

  // ── Сводка ──
  const done = A.filter(a => a.status === 'завершён');
  const visitDates = new Set(done.map(a => a.date));
  E.forEach(e => { const d = (e.created_at||'').split('T')[0]; if (d) visitDates.add(d); });
  const lastVisit = [...visitDates].sort().pop() || '';
  const consult = done.reduce((s,a) => s + (+a.consultation_price||0), 0);
  const paidOrders = O.reduce((s,o) => _ORDER_VOID.includes(o.status) ? s : s + (o.status === 'выдан' ? orderTotal(o) : (+o.prepayment||0)), 0);
  const debt = O.reduce((s,o) => _ORDER_ACTIVE.includes(o.status) ? s + Math.max(orderBalance(o),0) : s, 0);
  const nextCtrl = E.map(e => e.control_date).filter(Boolean).sort().reverse()[0] || '';
  const planned = A.filter(a => a.status === 'запланирован' && a.date >= td).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time))[0];

  const headMenu = ddMenu([
    {label:'✏️ '+t('pt_edit_patient'), fn:"openEditPatient('"+pid+"')", hide:!isAdmin()},
    {label:'🔗 '+t('merge_btn'), fn:"openMergePatient('"+pid+"')", hide:!isAdmin()},
    {label:'💾 PDF', fn:"savePatientPDF('"+pid+"')", hide:isErvin()},
    {label:'🗑 '+t('pt_delete_patient'), fn:"delPatientFromCard('"+pid+"')", danger:true, hide:!isAdmin()},
  ], '⋯', 'btn-ghost btn-sm');

  const tabs = [
    ['rx', t('pt_tab_rx'), E.length],
    ['orders', t('orders'), O.length],
    ['appts', t('appointments'), A.length],
    ['info', t('pt_tab_info'), null],
  ];
  if (!['rx','orders','appts','info'].includes(_cardTab)) _cardTab = 'rx';

  box.dataset.pid = pid;
  box.innerHTML =
    '<div class="pt-card-head">'+
      '<button class="btn btn-ghost btn-sm pt-back" onclick="showPatientList()">← '+t('patients')+'</button>'+
      '<div class="pt-card-id">'+
        '<div class="patient-avatar">'+_escH(initials(p.name))+'</div>'+
        '<div style="min-width:0">'+
          '<div class="pt-card-name">'+_escH(p.name)+
            (p.patient_code ? ' <span class="badge badge-gray">'+_escH(p.patient_code)+'</span>' : '')+
            ' '+_patientBadge(pid)+
          '</div>'+
          '<div class="pt-card-sub">'+
            [age ? age+' '+t('years') : '',
             p.phone ? '<a href="tel:'+_escH(p.phone.replace(/\s/g,''))+'" class="pt-link">'+_escH(p.phone)+'</a>' : '',
             p.telegram_username ? tgTag(p.telegram_username) : '',
             p.telegram_chat_id ? '<span class="tg-on">✈ TG</span>' : ''
            ].filter(Boolean).join(' <span class="pt-dot">·</span> ')+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="pt-card-actions">'+
        (!isErvin() ? '<button class="btn btn-ghost btn-sm" onclick="openAddAppointmentFor(\''+pid+'\')">+ '+t('pt_appt')+'</button>' : '')+
        (!isErvin() ? '<button class="btn btn-ghost btn-sm" onclick="openExamForm(\'\',\''+pid+'\')">+ '+t('pt_exam')+'</button>' : '')+
        (isAdmin() ? '<button class="btn btn-accent btn-sm" onclick="openAddOrderFor(\''+pid+'\')">+ '+t('pt_order')+'</button>' : '')+
        headMenu+
      '</div>'+
    '</div>'+
    '<div class="pt-stats">'+
      '<div class="pt-stat"><label>'+t('pt_last_visit')+'</label><b>'+(lastVisit ? fmt(lastVisit) : '—')+'</b>'+
        (planned ? '<small class="pt-stat-blue">'+t('pt_next')+': '+fmt(planned.date)+' '+(planned.time||'').substr(0,5)+'</small>' :
         nextCtrl ? '<small class="'+(nextCtrl<=td?'pt-stat-red':'')+'">'+t('exam_control')+': '+fmt(nextCtrl)+'</small>' : '')+
      '</div>'+
      '<div class="pt-stat"><label>'+t('pt_visits')+'</label><b>'+visitDates.size+'</b><small>'+t('pt_orders_count')+': '+O.filter(o=>!_ORDER_VOID.includes(o.status)).length+'</small></div>'+
      '<div class="pt-stat"><label>'+t('pt_paid')+'</label><b>'+fmtMoney(consult+paidOrders)+'</b>'+(consult ? '<small>'+t('pt_incl_consult')+': '+fmtMoney(consult)+'</small>' : '')+'</div>'+
      '<div class="pt-stat'+(debt>0?' pt-stat-debt':'')+'"><label>'+t('balance')+'</label><b>'+fmtMoney(debt)+'</b>'+(debt>0 ? '<small>'+t('pt_to_pay')+'</small>' : '<small>'+t('pt_no_debt')+'</small>')+'</div>'+
    '</div>'+
    (p.notes ? '<div class="pt-notes">📝 '+_escH(p.notes)+'</div>' : '')+
    '<div class="tab-bar pt-tabs">'+
      tabs.map(([k,l,n]) => '<div class="tab'+(_cardTab===k?' active':'')+'" onclick="_switchCardTab(\''+k+'\')">'+l+(n!==null ? ' <span class="tab-count">'+n+'</span>' : '')+'</div>').join('')+
    '</div>'+
    '<div class="pt-tab-body">'+
      (_cardTab==='rx' ? _examTabHtml(E, pid) : '')+
      (_cardTab==='orders' ? _orderTab(O, pid, E) : '')+
      (_cardTab==='appts' ? _apptTab(A, pid, E) : '')+
      (_cardTab==='info' ? _infoTabHtml(p, A) : '')+
    '</div>';
  if (keepScroll) box.scrollTop = keepScroll;
}

// ── Вкладка «Приёмы» ──
function _apptTab(appts, pid, exams) {
  const add = !isErvin() ? '<div class="pt-tab-tools"><button class="btn btn-ghost btn-sm" onclick="openAddAppointmentFor(\''+pid+'\')">+ '+t('pt_appt')+'</button></div>' : '';
  if (!appts.length) return add+'<div class="empty"><p>'+t('no_appts')+'</p></div>';
  const examByAppt = {};
  (exams||[]).forEach(e => { if (e.appointment_id && !examByAppt[e.appointment_id]) examByAppt[e.appointment_id] = e; });
  return add+appts.map(a => {
    const ex = examByAppt[a.id];
    const menu = ddMenu([
      {label:'✏️ '+t('pt_edit'), fn:"openEditAppt('"+a.id+"')", hide:a.status==='отменён'},
      {label:'↩ '+t('pt_revert_planned'), fn:"revertApptToPlanned('"+a.id+"')", hide:a.status!=='завершён'||isErvin()},
      {label:'🚫 '+t('pt_cancel_appt'), fn:"cancelAppt('"+a.id+"')", hide:a.status!=='запланирован'||isErvin()},
      {label:'🗑 '+t('delete'), fn:"deleteAppt('"+a.id+"')", danger:true, hide:isErvin()},
    ]);
    return '<div class="history-item pt-row">'+
      '<div class="history-dot"></div>'+
      '<div style="flex:1;min-width:0">'+
        '<div class="history-date">'+fmt(a.date)+' · '+(a.time||'').substr(0,5)+
          ' · <span class="badge '+(STATUS_BADGE[a.status]||'badge-gray')+'">'+statusLabel(a.status)+'</span></div>'+
        '<div class="history-title" style="word-break:break-word">'+
          (a.appointment_number ? '<span class="badge badge-accent" style="margin-right:6px">'+_escH(a.appointment_number)+'</span>' : '')+
          _escH(apptTypeName(a.type||'') || t('appointments'))+
        '</div>'+
        (a.consultation_price ? '<div class="text-sm text-m">'+t('cost')+': '+fmtMoney(a.consultation_price)+'</div>' : '')+
        (a.notes ? '<div class="text-sm text-m">'+_escH(a.notes)+'</div>' : '')+
        (_hasIntake(a) ? '<details style="margin-top:4px"><summary style="cursor:pointer;font-size:14px;color:var(--primary)">📝 '+t('intake_show')+'</summary><div style="margin-top:6px">'+_bookingSurveyHtml(a.intake, false)+'</div></details>' : '')+
      '</div>'+
      '<div class="history-actions">'+
        (!isErvin() && a.status!=='отменён' ? '<button class="btn btn-primary btn-sm" onclick="'+(ex ? 'openExamView(\''+ex.id+'\',\''+pid+'\')' : 'openExamForm(\''+a.id+'\',\''+pid+'\')')+'">📋 '+(ex ? t('pt_open_exam') : t('exam_card_short'))+'</button>' : '')+
        (a.status==='запланирован' && !isErvin() ? '<button class="btn btn-success btn-sm" onclick="openCompleteApptPopup(\''+a.id+'\','+(a.consultation_price||3000)+')">✓ '+t('pt_complete')+'</button>' : '')+
        menu+
      '</div>'+
    '</div>';
  }).join('');
}

// ── Вкладка «Коррекция (RX)»: данные коррекции каждого осмотра таблицами OD/OS ──
const _RX_KINDS = ['far','comp','near','cl'];
function _rxKindLabel(k) {
  return {far:t('exam_far_short'), comp:t('exam_comp_short'), near:t('exam_near_short'), cl:t('exam_cl_short')}[k] || k;
}
function _rxKindsOf(e) { return _RX_KINDS.filter(k => _rxDioptStr(e, k)); }
function _rxv(x) { return _nz(x) ? _escH(x) : '—'; }
function _rxTableHtml(e, k) {
  if (k === 'cl') {
    return '<table class="rx-view"><thead><tr><th class="rx-view-kind">'+_rxKindLabel(k)+'</th><th>Sph</th><th>Cyl</th><th>Ax</th><th>BC</th><th>DIA</th></tr></thead><tbody>'+
      '<tr><td class="rx-eye">OD</td><td>'+_rxv(e.rx_cl_od_sph)+'</td><td>'+_rxv(e.rx_cl_od_cyl)+'</td><td>'+_rxv(e.rx_cl_od_ax)+'</td><td rowspan="2">'+_rxv(e.rx_cl_od_bc)+'</td><td rowspan="2">'+_rxv(e.rx_cl_od_dia)+'</td></tr>'+
      '<tr><td class="rx-eye">OS</td><td>'+_rxv(e.rx_cl_os_sph)+'</td><td>'+_rxv(e.rx_cl_os_cyl)+'</td><td>'+_rxv(e.rx_cl_os_ax)+'</td></tr>'+
      '</tbody></table>'+
      (e.rx_cl_od_type ? '<div class="rx-view-note">'+t('pt_cl_brand')+': <b>'+_escH(e.rx_cl_od_type)+'</b></div>' : '')+
      (e.rx_cl_comment ? '<div class="rx-view-note">'+_escH(e.rx_cl_comment)+'</div>' : '');
  }
  const P = 'rx_'+k;
  const add = k==='far' ? e.rx_far_os_pd : e[P+'_od_add'];   // для дали ADD хранится в rx_far_os_pd
  const addL = k==='near' ? 'Degr' : 'Add';
  const hasPrism = _nz(e[P+'_od_prism']) || _nz(e[P+'_os_prism']);
  return '<table class="rx-view"><thead><tr><th class="rx-view-kind">'+_rxKindLabel(k)+'</th><th>Sph</th><th>Cyl</th><th>Ax</th>'+(hasPrism?'<th>Prism</th>':'')+'<th>'+addL+'</th><th>PD</th></tr></thead><tbody>'+
    '<tr><td class="rx-eye">OD</td><td>'+_rxv(e[P+'_od_sph'])+'</td><td>'+_rxv(e[P+'_od_cyl'])+'</td><td>'+_rxv(e[P+'_od_ax'])+'</td>'+(hasPrism?'<td>'+_rxv(e[P+'_od_prism'])+'</td>':'')+'<td rowspan="2">'+_rxv(add)+'</td><td rowspan="2">'+_rxv(e[P+'_od_pd'])+'</td></tr>'+
    '<tr><td class="rx-eye">OS</td><td>'+_rxv(e[P+'_os_sph'])+'</td><td>'+_rxv(e[P+'_os_cyl'])+'</td><td>'+_rxv(e[P+'_os_ax'])+'</td>'+(hasPrism?'<td>'+_rxv(e[P+'_os_prism'])+'</td>':'')+'</tr>'+
    '</tbody></table>'+
    (e[P+'_comment'] ? '<div class="rx-view-note">'+_escH(e[P+'_comment'])+'</div>' : '');
}
function _rxOrderBtn(e, pid, kinds) {
  if (!isAdmin() || !kinds.length) return '';
  if (kinds.length === 1) return '<button class="btn btn-accent btn-sm" onclick="openAddOrderFor(\''+pid+'\',\''+e.id+'|'+kinds[0]+'\')">→ '+t('pt_order')+'</button>';
  return ddMenu(kinds.map(k => ({label:'→ '+t('pt_order')+': '+_rxKindLabel(k), fn:"openAddOrderFor('"+pid+"','"+e.id+"|"+k+"')"})), '→ '+t('pt_order')+' ▾', 'btn-accent btn-sm');
}
function _examTabHtml(exams, pid) {
  const addBtn = !isErvin() ? '<div class="pt-tab-tools"><button class="btn btn-ghost btn-sm" onclick="openExamForm(\'\',\''+pid+'\')">+ '+t('pt_exam')+'</button></div>' : '';
  if (!exams.length) return addBtn+'<div class="empty"><p>'+t('exam_none')+'</p></div>';
  const td = today();
  return addBtn+exams.map((e, i) => {
    const d = (e.created_at||'').split('T')[0];
    const kinds = _rxKindsOf(e);
    const locked = d && d < td;
    const menu = ddMenu([
      {label:'👁 '+t('pt_view'), fn:"openExamView('"+e.id+"','"+pid+"')"},
      {label:'✏️ '+t('pt_edit'), fn:"openExamView('"+e.id+"','"+pid+"',true)", hide:isErvin()},
      {label:'🖨️ '+t('pt_print'), fn:"printExam('"+e.id+"')"},
      {label:'🗑 '+t('delete'), fn:"deleteExam('"+e.id+"')", danger:true, hide:!isAdmin()},
    ]);
    return '<details class="rx-visit"'+(i===0?' open':'')+'>'+
      '<summary>'+
        '<div class="rx-visit-title">'+
          '<span class="rx-visit-chev">▸</span>'+
          '<b>'+t('visit')+(e.visit_number||'—')+'</b> · '+fmt(d)+
          (locked ? ' <span class="rx-lock" title="'+t('exam_locked_hint')+'">🔒</span>' : '')+
          ' '+kinds.map(k => '<span class="chip">'+_rxKindLabel(k)+'</span>').join(' ')+
          (e.express_pregled ? ' <span class="badge badge-green">⚡ '+t('pt_express')+'</span>' : '')+
          (e.clinical && e.clinical.interim ? ' <span class="badge badge-warn">↗ '+t('pt_interim')+'</span>' : '')+
        '</div>'+
        '<div class="rx-visit-actions" onclick="event.preventDefault();event.stopPropagation()">'+
          '<button class="btn btn-ghost btn-sm" onclick="openExamView(\''+e.id+'\',\''+pid+'\')">📋 '+t('pt_open_exam')+'</button>'+
          _rxOrderBtn(e, pid, kinds)+
          menu+
        '</div>'+
      '</summary>'+
      '<div class="rx-visit-body">'+
        ((e.exam_od_with||e.exam_os_with) ? '<div class="rx-visus">Visus s/k: <b>OD '+_escH(e.exam_od_with||'—')+'</b> · <b>OS '+_escH(e.exam_os_with||'—')+'</b>'+(e.exam_ou?' · <b>OU '+_escH(e.exam_ou)+'</b>':'')+'</div>' : '')+
        (kinds.length ? '<div class="rx-view-grid">'+kinds.map(k => '<div>'+_rxTableHtml(e, k)+'</div>').join('')+'</div>' : '<div class="text-m">'+t('exam_no_data')+'</div>')+
        (e.control_date ? '<div class="rx-view-foot'+(e.control_date<=td?' rx-due':'')+'">⏰ '+t('exam_control')+': <b>'+fmt(e.control_date)+'</b></div>' : '')+
      '</div>'+
    '</details>';
  }).join('');
}
async function deleteExam(id) {
  if (!confirm(t('pt_confirm_delete_exam'))) return;
  const {error} = await db.from('examinations').update({deleted_at: new Date().toISOString()}).eq('id', id);
  if (error) { toast(t('error')+': '+error.message, 'error'); return; }
  toast(t('moved_to_trash'));
  if (_openPatientId) _renderPatientCard(_openPatientId); else render();
}

// ── Вкладка «Заказы»: карточки как в Ginter (оправа / линзы строками, RX, итог крупно) ──
function _orderTab(orders, pid, exams) {
  const add = isAdmin() ? '<div class="pt-tab-tools"><button class="btn btn-accent btn-sm" onclick="openAddOrderFor(\''+pid+'\')">+ '+t('pt_order')+'</button></div>' : '';
  if (!orders.length) return add+'<div class="empty"><p>'+t('no_orders')+'</p></div>';
  const exMap = {}; (exams||[]).forEach(e => { exMap[e.id] = e; });
  return add+orders.map(o => {
    const bal = orderBalance(o);
    const d = o.order_date || (o.created_at||'').split('T')[0];
    const rxType = o.prescription_label ? (RX_LABEL_TO_TYPE[o.prescription_label] || {'Даль':'far','Компьютер':'comp','Близь':'near'}[o.prescription_label]) : '';
    const ex = o.examination_id ? (exMap[o.examination_id] || (window._examCache||{})[o.examination_id]) : null;
    const isCL = o.type === 'МКЛ';
    const qty = isCL ? 1 : (+o.lens_qty || 2);
    const menu = ddMenu([
      {label:'👁 '+t('pt_view'), fn:"openOrderCard('"+o.id+"')"},
      {label:'✏️ '+t('pt_edit'), fn:"openEditOrder('"+o.id+"')", hide:!isAdmin()},
      {label:'📨 '+t('notify'), fn:"notifyOrderReady('"+o.id+"')", hide:o.status!=='готов'||isErvin()},
      {label:'🔁 '+t('pt_followup'), fn:"sendFollowUpSurvey('"+o.id+"')", hide:o.status!=='выдан'||isErvin()},
      {label:'🗑 '+t('delete'), fn:"delOrder('"+o.id+"')", danger:true, hide:!isAdmin()},
    ]);
    const line = (lbl, name, price) => '<div class="ord-line"><span class="ord-l">'+lbl+'</span><span class="ord-n">'+(name ? _escH(name) : (name === '' ? '' : '—'))+'</span><span class="ord-p">'+price+'</span></div>';
    return '<div class="ord-card ord-'+(o.status==='выдан'?'done':_ORDER_VOID.includes(o.status)?'void':'open')+'">'+
      '<div class="ord-head">'+
        '<div style="min-width:0">'+
          '<div class="ord-title">'+_escH(o.type||'—')+
            (o.order_number ? ' <span class="badge badge-gray">№'+_escH(o.order_number)+'</span>' : '')+
            ' <span class="badge '+(STATUS_BADGE[o.status]||'badge-gray')+'">'+statusLabel(o.status)+'</span>'+
            (o.is_redo ? ' <span class="badge badge-warn">↻</span>' : '')+
            (o.counts_for_salary ? ' <span class="salary-badge">💰</span>' : '')+
          '</div>'+
          '<div class="ord-sub">'+fmt(d)+(o.promised_date ? ' · '+t('promised_date')+': '+fmt(o.promised_date) : '')+(o.issued_date ? ' · '+t('issued_label')+': '+fmt(o.issued_date) : '')+'</div>'+
        '</div>'+
        '<div class="ord-actions">'+
          (o.status==='оформлен' && !isErvin() ? '<button class="btn btn-ghost btn-sm" onclick="updateOrderStatus(\''+o.id+'\',\'в работе\')">'+t('pt_to_work')+'</button>' : '')+
          (o.status==='в работе' && !isErvin() ? '<button class="btn btn-ghost btn-sm" onclick="updateOrderStatus(\''+o.id+'\',\'готов\')">'+t('mark_ready_btn')+'</button>' : '')+
          (o.status==='готов' && !isErvin() ? '<button class="btn btn-accent btn-sm" onclick="issueOrder(\''+o.id+'\')">'+t('issue_btn')+'</button>' : '')+
          menu+
        '</div>'+
      '</div>'+
      '<div class="ord-lines">'+
        (!isCL ? line(t('frame'), o.frame_code, o.frame_price ? fmtMoney(o.frame_price) : '—') : '')+
        line(isCL ? t('order_type_cl') : t('lenses'), o.lens_name, o.lens_price ? (qty>1 ? qty+' × '+fmtMoney(o.lens_price)+' = ' : '')+'<b>'+fmtMoney((+o.lens_price||0)*qty)+'</b>' : '—')+
        (o.work_price ? line(t('work'), '', fmtMoney(o.work_price)) : '')+
      '</div>'+
      (rxType ? '<div class="ord-rx"><span class="ord-rx-l">RX · '+_rxKindLabel(rxType)+(ex && ex.visit_number ? ' · '+t('visit')+ex.visit_number : '')+'</span>'+
        (ex ? _rxDioptStr(ex, rxType).split(' | ').map(s => '<span class="ord-rx-v">'+_escH(s)+'</span>').join('') : '')+'</div>' : '')+
      '<div class="ord-sum">'+
        '<div><label>'+t('total')+'</label><b class="ord-total">'+fmtMoney(orderTotal(o))+'</b></div>'+
        '<div><label>'+t('prepayment')+'</label><b>'+fmtMoney(o.prepayment)+'</b></div>'+
        '<div><label>'+t('balance')+'</label><b class="'+(bal>0 && _ORDER_ACTIVE.includes(o.status)?'money-debt':'money-paid')+'">'+fmtMoney(bal)+'</b></div>'+
      '</div>'+
      (o.notes ? '<div class="ord-notes">'+_escH(o.notes)+'</div>' : '')+
    '</div>';
  }).join('');
}

// ── Вкладка «Инфо» ──
function _infoTabHtml(p, appts) {
  const age = calcAge(p.dob);
  return (isAdmin() ? '<div class="pt-tab-tools"><button class="btn btn-ghost btn-sm" onclick="openEditPatient(\''+p.id+'\')">✏️ '+t('pt_edit_patient')+'</button></div>' : '')+
    '<div class="info-grid mb-12">'+
      '<div class="info-item"><label>ID</label><p>'+_escH(p.patient_code||'—')+'</p></div>'+
      '<div class="info-item"><label>'+t('phone')+'</label><p>'+(p.phone ? '<a class="pt-link" href="tel:'+_escH(p.phone.replace(/\s/g,''))+'">'+_escH(p.phone)+'</a>' : '—')+'</p></div>'+
      '<div class="info-item"><label>Email</label><p>'+(p.email ? '<a class="pt-link" href="mailto:'+_escH(p.email)+'">'+_escH(p.email)+'</a>' : '—')+'</p></div>'+
      '<div class="info-item"><label>Telegram</label><p>'+(tgTag(p.telegram_username) || '—')+(p.telegram_chat_id ? ' <span class="tg-on">✈ ID '+_escH(p.telegram_chat_id)+'</span>' : '')+'</p></div>'+
      '<div class="info-item"><label>'+t('dob')+'</label><p>'+(p.dob ? fmt(p.dob)+(age ? ' ('+age+' '+t('years')+')' : '') : '—')+'</p></div>'+
      '<div class="info-item"><label>'+t('source')+'</label><p>'+_escH(p.source||'—')+'</p></div>'+
      '<div class="info-item"><label>'+t('in_base')+'</label><p>'+fmt((p.created_at||'').split('T')[0])+'</p></div>'+
    '</div>'+
    (p.notes ? '<div class="mb-12"><label>'+t('notes')+'</label><div class="pt-notes" style="margin-top:6px">'+_escH(p.notes)+'</div></div>' : '')+
    _cardSurveyHtml(p, appts||[]);
}

// ═══ PATIENT FORM ═══
function openAddPatient(fromAppt) { if (!fromAppt) window._apptResume = null; _patientForm(null); }
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
      closeModal();
      _openPatientId = id;
      if (curSection === 'patients') render(); else openPatientCard(id);
    } else {
      toast(t('added'));
      // Пациента добавляли из формы записи на приём («+ Новый пациент») — возвращаемся
      // в форму записи с уже выбранным новым пациентом, дата/время/слот сохраняются.
      if (window._apptResume && np && np.id) {
        const st = window._apptResume; window._apptResume = null;
        closeModal();
        _apptForm(null, np.id, st.date, st.time, st.slotId);
        return;
      }
      // Новый пациент сразу открывается справа, строка в списке подсвечивается.
      _lastAddedPatientId = np && np.id;
      closeModal();
      if (np && np.id) {
        _openPatientId = np.id; _ptShowDetail = true; _cardTab = 'rx';
        if (curSection === 'patients') render(); else openPatientCard(np.id);
      } else render();
    }
  } catch(err) {
    console.error('savePatient error:', err);
    alert('❌ ' + t('save_error') + ': ' + (err.message||''));
  }
}
async function delPatient(id) {
  if (!confirm(t('confirm_delete_patient'))) return;
  const {error} = await db.from('patients').update({deleted_at: new Date().toISOString()}).eq('id',id);
  if (error) { toast(t('error')+': '+error.message, 'error'); return; }
  if (_openPatientId === id) { _openPatientId = null; _ptShowDetail = false; }
  toast(t('moved_to_trash')); render();
}
async function delPatientFromCard(pid) { await delPatient(pid); }
