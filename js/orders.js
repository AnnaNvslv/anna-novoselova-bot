// ═══ ORDERS ═══
// Поле промокода + «Приём оплачен?» (js/promo-field.js) — подгружается отсюда, как promo.js из router.js
(function(){var s=document.createElement('script');s.src='js/promo-field.js?v=1';document.body.appendChild(s);})();

var RX_SELECT_FIELDS =
  'id,visit_number,created_at,exam_date,exam_date_prec,' +
  'rx_far_enabled,rx_comp_enabled,rx_near_enabled,rx_cl_enabled,' +
  'rx_far_od_sph,rx_far_od_cyl,rx_far_od_ax,rx_far_od_pd,' +
  'rx_far_os_sph,rx_far_os_cyl,rx_far_os_ax,rx_far_os_pd,' +
  'rx_comp_od_sph,rx_comp_od_cyl,rx_comp_od_ax,rx_comp_od_pd,rx_comp_od_add,' +
  'rx_comp_os_sph,rx_comp_os_cyl,rx_comp_os_ax,' +
  'rx_near_od_sph,rx_near_od_cyl,rx_near_od_ax,rx_near_od_pd,rx_near_od_add,' +
  'rx_near_os_sph,rx_near_os_cyl,rx_near_os_ax,' +
  'rx_cl_od_sph,rx_cl_od_cyl,rx_cl_od_ax,rx_cl_od_bc,rx_cl_od_dia,rx_cl_od_type,' +
  'rx_cl_os_sph,rx_cl_os_cyl,rx_cl_os_ax,' +
  'rx_far_od_prism,rx_far_os_prism,rx_comp_od_prism,rx_comp_os_prism,rx_near_od_prism,rx_near_os_prism,' +
  'rx_far_comment,rx_comp_comment,rx_near_comment,rx_cl_comment,' +
  'rx_far_purpose,rx_comp_purpose,rx_near_purpose,rx_extra';

var _ordersSort = 'date_new'; // date_new | date_old | total_desc | total_asc | promised
var _allOrders = [];
var _ordersSearchQuery = '';
var _ordersExamMap = {}; // examination_id -> examination row, для отображения диоптрий рецепта в списке заказов
var RX_LABEL_TO_TYPE = {'Daljina':'far','Računar':'comp','Blizina':'near','KS':'cl'};

// ═══ РЕЦЕПТЫ: назначение + несколько рецептов на очки в одной карте ═══
// Три основных блока карты (rx_far_*, rx_comp_*, rx_near_*) имеют выбираемое назначение
// (rx_*_purpose; пусто = по умолчанию блока). Дополнительные рецепты — examinations.rx_extra
// [{id:'x…', purpose, od_sph, od_cyl, od_ax, od_prism, os_*, pd, add, comment}].
// Ключ рецепта: 'far' | 'comp' | 'near' | 'cl' | id доп. рецепта ('x…') — так он хранится в заказе.
var RX_PURPOSES = [
  ['far',      'для дали',               'za daljinu',        'Даль',          'Daljina'],
  ['constant', 'для постоянного ношения','za stalno nošenje', 'Пост. ношение', 'Stalno nošenje'],
  ['comp',     'для компьютера',         'za računar',        'Компьютер',     'Računar'],
  ['near',     'для близи',              'za blizinu',        'Близь',         'Blizina'],
  ['office',   'офисные линзы',          'kancelarijska stakla','Офисные',      'Kancelarijska'],
  ['prog',     'прогрессивные линзы',    'progresivna stakla','Прогрессивные', 'Progresivna'],
  ['bifo',     'бифокальные линзы',      'bifokalna stakla',  'Бифокальные',   'Bifokalna'],
];
// Подпись поля прибавки: у офисных линз — дегрессия (Degr), у остальных — ADD
function rxAddLabel(p) { return p === 'office' ? 'Degr' : 'ADD'; }
function rxPurposeLabel(p, short, lang) {
  const r = RX_PURPOSES.find(x => x[0] === p); if (!r) return p || '';
  const sr = (lang || _lang) === 'sr';
  return short ? (sr ? r[4] : r[3]) : (sr ? r[2] : r[1]);
}
function rxPurposeOptions(sel) {
  return RX_PURPOSES.map(r => '<option value="'+r[0]+'"'+(r[0]===sel?' selected':'')+'>'+r[1]+'</option>').join('');
}
function rxExtraList(e) { return (e && Array.isArray(e.rx_extra)) ? e.rx_extra : []; }
// Единый вид рецепта по ключу
function rxGet(e, k) {
  if (!e) return null;
  if (k === 'cl') return {k, cl:true, purpose:'cl',
    od:{sph:e.rx_cl_od_sph,cyl:e.rx_cl_od_cyl,ax:e.rx_cl_od_ax}, os:{sph:e.rx_cl_os_sph,cyl:e.rx_cl_os_cyl,ax:e.rx_cl_os_ax},
    bc:e.rx_cl_od_bc, dia:e.rx_cl_od_dia, type:e.rx_cl_od_type, comment:e.rx_cl_comment};
  if (k === 'far' || k === 'comp' || k === 'near') {
    const P = 'rx_'+k;
    return {k, purpose: e[P+'_purpose'] || k,
      od:{sph:e[P+'_od_sph'],cyl:e[P+'_od_cyl'],ax:e[P+'_od_ax'],prism:e[P+'_od_prism']},
      os:{sph:e[P+'_os_sph'],cyl:e[P+'_os_cyl'],ax:e[P+'_os_ax'],prism:e[P+'_os_prism']},
      pd:e[P+'_od_pd'], add: k==='far' ? e.rx_far_os_pd : e[P+'_od_add'],   // для дали ADD хранится в rx_far_os_pd
      addL: rxAddLabel(e[P+'_purpose'] || k), comment:e[P+'_comment']};
  }
  const x = rxExtraList(e).find(r => r.id === k); if (!x) return null;
  return {k, extra:true, purpose:x.purpose||'far',
    od:{sph:x.od_sph,cyl:x.od_cyl,ax:x.od_ax,prism:x.od_prism}, os:{sph:x.os_sph,cyl:x.os_cyl,ax:x.os_ax,prism:x.os_prism},
    pd:x.pd, add:x.add, addL:rxAddLabel(x.purpose||'far'), comment:x.comment};
}
// Все ключи рецептов карты (по порядку: даль, комп., близь, доп. рецепты, МКЛ)
function rxAllKeys(e) { return ['far','comp','near'].concat(rxExtraList(e).map(x => x.id), ['cl']); }

function _nz(val) {
  return (val != null && val !== '' && val !== '0.00' && val !== '0') ? String(val) : null;
}

function _rxDioptStr(e, type) {
  const r = rxGet(e, type); if (!r) return '';
  const seg = (o) => {
    const s = _nz(o.sph); const c = _nz(o.cyl); const a = _nz(o.ax);
    if (!s && !c) return null;
    let x = s||'—'; if(c) x += ' / '+c; if(a) x += ' ax'+a;
    return x;
  };
  const parts = [];
  const od = seg(r.od), os = seg(r.os);
  if (od) parts.push('OD '+od); if (os) parts.push('OS '+os);
  if (!od && !os) return '';
  if (r.cl) {
    if(_nz(r.bc))  parts.push('BC '+r.bc);
    if(_nz(r.dia)) parts.push('DIA '+r.dia);
    if(r.type) parts.push(r.type);
  } else {
    if(_nz(r.pd))  parts.push('PD '+r.pd);
    if(_nz(r.add)) parts.push(r.addL+' '+r.add);
  }
  return parts.join(' | ');
}
// Короткое название рецепта: назначение (с учётом выбранного в карте)
function _rxKindLabel(k, e) {
  if (k === 'cl') return t('exam_cl_short');
  const r = e ? rxGet(e, k) : null;
  return rxPurposeLabel(r ? r.purpose : k, true);
}
// Название для orders.prescription_label (всегда по-сербски, как раньше)
function _rxLabelSr(e, k) {
  if (k === 'cl') return 'KS';
  const r = e ? rxGet(e, k) : null;
  return rxPurposeLabel(r ? r.purpose : k, true, 'sr');
}

function _rxOptLabel(e, type, d) {
  const base = t('visit')+(e.visit_number||'?')+' ('+d+') — '+_rxKindLabel(type, e);
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
    const d = fmtExamDate(e);
    rxAllKeys(e).forEach(type => {
      if (!_rxDioptStr(e, type)) return;
      const val = e.id+'|'+type;
      opts.push('<option value="'+val+'"'+(selVal===val?' selected':'')+'>'+_rxOptLabel(e, type, d)+'</option>');
    });
  });
  return opts.join('');
}

// ═══ КОМПЛЕКТЫ ЗАКАЗА: несколько рецептов / оправ / линз в одном заказе (как в ginter-crm) ═══
// Хранение: orders.items (jsonb) — [{exam_id, rx_type, frame_code, frame_base, frame_disc, frame_price,
//   lens_name, lens_base, lens_disc, lens_price (за шт. со скидкой), lens_qty}].
// Плоские поля заказа (frame_price, lens_price, lens_qty, frame_code, lens_name, examination_id,
// prescription_label) сохраняются как сводка по всем комплектам — аналитика, дашборд, бюджет
// и orderTotal() работают без изменений.
var RX_TYPE_LABEL = {far:'Daljina', comp:'Računar', near:'Blizina', cl:'KS'};
var _RX_LABEL_ANY = {'Daljina':'far','Računar':'comp','Blizina':'near','KS':'cl','Даль':'far','Компьютер':'comp','Близь':'near'};
var _ofSets = [];   // черновик комплектов в открытой форме
var _ofExams = [];  // осмотры пациента для выбора рецепта

function orderSets(o) {
  if (!o) return [];
  if (Array.isArray(o.items) && o.items.length) return o.items;
  const rxType = o.prescription_label ? (_RX_LABEL_ANY[o.prescription_label] || null) : null;
  return [{exam_id:o.examination_id||null, rx_type:rxType,
    frame_code:o.frame_code||'', frame_base:+o.frame_price||0, frame_disc:0, frame_price:+o.frame_price||0,
    lens_name:o.lens_name||'', lens_base:+o.lens_price||0, lens_disc:0, lens_price:+o.lens_price||0,
    lens_qty:(+o.lens_qty)||2}];
}
function orderExamIds(o) {
  const ids = orderSets(o).map(s => s.exam_id).filter(Boolean);
  if (o.examination_id) ids.push(o.examination_id);
  return ids;
}
function _setLensSum(s) { return Math.round((+s.lens_price||0) * (+s.lens_qty||0)); }

// Блоки комплектов для просмотра (карточка заказа, вкладка «Заказы» пациента)
function orderSetsViewHtml(o, exMap) {
  const isCL = o.type === 'МКЛ';
  const sets = orderSets(o);
  const multi = sets.length > 1;
  const line = (lbl, name, price) => '<div class="ord-line"><span class="ord-l">'+lbl+'</span><span class="ord-n">'+(name ? _escH(name) : (name === '' ? '' : '—'))+'</span><span class="ord-p">'+price+'</span></div>';
  return sets.map((s, i) => {
    const ex = s.exam_id ? ((exMap||{})[s.exam_id] || (window._examCache||{})[s.exam_id]) : null;
    const qty = +s.lens_qty || 0;
    const lensSum = _setLensSum(s);
    const disc = (v) => +v ? ' <span class="of-set-disc">−'+(+v)+'%</span>' : '';
    const rx = s.rx_type ? '<div class="ord-rx"><span class="ord-rx-l">'+(multi?(i+1)+'. ':'')+'RX · '+_rxKindLabel(s.rx_type, ex)+(ex && ex.visit_number ? ' · '+t('visit')+ex.visit_number : '')+'</span>'+
        (ex ? _rxDioptStr(ex, s.rx_type).split(' | ').map(x => '<span class="ord-rx-v">'+_escH(x)+'</span>').join('') : '')+'</div>'
      : (multi ? '<div class="ord-rx"><span class="ord-rx-l">'+(i+1)+'. '+t('prescription')+' —</span></div>' : '');
    return '<div class="'+(multi?'ord-set':'')+'">'+rx+
      '<div class="ord-lines">'+
        (!isCL ? line(t('frame'), s.frame_code, (+s.frame_price ? fmtMoney(s.frame_price) : '—')+disc(s.frame_disc)) : '')+
        line(isCL ? t('order_type_cl') : _ofLbl('Линзы','Stakla'), s.lens_name, +s.lens_price ? (qty>1 ? qty+' × '+fmtMoney(s.lens_price)+' = ' : '')+'<b>'+fmtMoney(lensSum)+'</b>'+disc(s.lens_disc) : '—')+
      '</div></div>';
  }).join('') + (o.work_price ? '<div class="ord-lines">'+line(t('work'), '', fmtMoney(o.work_price))+'</div>' : '');
}

function _ofLbl(ru, sr) { return _lang==='sr' ? sr : ru; }
function _newSet(rx) { return {rx:rx||'', frame_code:'', frame_base:'', frame_disc:'', lens_name:'', lens_base:'', lens_disc:'', lens_qty:2}; }
function _setFromStored(s) {
  return {rx: (s.exam_id && s.rx_type) ? s.exam_id+'|'+s.rx_type : '',
    frame_code:s.frame_code||'', frame_base: (s.frame_base!=null ? s.frame_base : s.frame_price) || '', frame_disc:+s.frame_disc||'',
    lens_name:s.lens_name||'', lens_base: (s.lens_base!=null ? s.lens_base : s.lens_price) || '', lens_disc:+s.lens_disc||'',
    lens_qty: s.lens_qty!=null ? +s.lens_qty : 2};
}
function _ofIsCL() { return (document.getElementById('o-type') && document.getElementById('o-type').value) === 'МКЛ'; }

function _ofSetsHtml() {
  const isCL = _ofIsCL();
  const multi = _ofSets.length > 1;
  const esc = x => _escH(x==null?'':String(x));
  const num = (id, val, field, i, extra) => '<input type="number" id="'+id+'" class="of-num" min="0" placeholder="0" value="'+esc(val)+'" oninput="ofSetInput('+i+',\''+field+'\',this.value)" '+(extra||'')+'>';
  return _ofSets.map((s, i) => {
    const last = i === _ofSets.length-1;
    return '<div class="of-set'+(multi?' of-set-multi':'')+'">'+
      '<div class="of-set-head">'+
        (multi ? '<span class="of-set-num">'+(i+1)+'</span>' : '')+
        '<select id="o-rx-'+i+'" onchange="ofSetInput('+i+',\'rx\',this.value);showRxPreview(this.value,'+i+')">'+_rxOpts(_ofExams, s.rx)+'</select>'+
        (multi ? '<button type="button" class="of-set-del" title="'+_ofLbl('Убрать','Ukloni')+'" onclick="removeOrderSet('+i+')">×</button>' : '')+
      '</div>'+
      '<div id="o-rx-preview-'+i+'" class="of-set-prev" style="display:none"></div>'+
      '<div class="of-row of-row-frame"'+(isCL?' style="display:none"':'')+'>'+
        '<div><label>'+t('frame')+' · '+_ofLbl('код','šifra')+'</label><input id="o-fcode-'+i+'" value="'+esc(s.frame_code)+'" oninput="ofSetInput('+i+',\'frame_code\',this.value)"></div>'+
        '<div><label>'+_ofLbl('цена','cena')+'</label>'+num('o-fprice-'+i, s.frame_base, 'frame_base', i)+'</div>'+
        '<div><label>'+_ofLbl('скидка %','pop. %')+'</label>'+num('o-fdisc-'+i, s.frame_disc, 'frame_disc', i, 'max="100"')+'</div>'+
        '<div><label class="of-res">= din.</label><input type="number" id="o-ffinal-'+i+'" class="of-num of-final" readonly tabindex="-1"></div>'+
      '</div>'+
      '<div class="of-row of-row-lens">'+
        '<div><label>'+(isCL ? t('order_type_cl') : _ofLbl('Линзы','Stakla'))+'</label><input id="o-lname-'+i+'" value="'+esc(s.lens_name)+'" oninput="ofSetInput('+i+',\'lens_name\',this.value)"></div>'+
        '<div><label>'+_ofLbl('цена/шт','cena/kom')+'</label>'+num('o-lprice-'+i, s.lens_base, 'lens_base', i, last?'data-enter-jump="save"':'')+'</div>'+
        '<div><label>'+_ofLbl('скидка %','pop. %')+'</label>'+num('o-ldisc-'+i, s.lens_disc, 'lens_disc', i, 'max="100"')+'</div>'+
        '<div'+(isCL?' style="visibility:hidden"':'')+'><label>'+_ofLbl('шт','kom')+'</label><select id="o-lqty-'+i+'" onchange="ofSetInput('+i+',\'lens_qty\',this.value)"><option value="2"'+(+s.lens_qty!==1?' selected':'')+'>2</option><option value="1"'+(+s.lens_qty===1?' selected':'')+'>1</option></select></div>'+
        '<div><label class="of-res">= din.</label><input type="number" id="o-lfinal-'+i+'" class="of-num of-final" readonly tabindex="-1"></div>'+
      '</div>'+
    '</div>';
  }).join('') +
  '<button type="button" class="btn btn-ghost btn-sm of-add-set" onclick="addOrderSet()">+ '+
    (isCL ? _ofLbl('Ещё рецепт / линзы','Još recept / sočiva') : _ofLbl('Ещё очки (другой рецепт, оправа, линзы)','Još naočara (drugi recept, okvir, stakla)'))+'</button>';
}
function renderOrderSets() {
  const box = document.getElementById('o-sets'); if (!box) return;
  box.innerHTML = _ofSetsHtml();
  _ofSets.forEach((s, i) => { if (s.rx) showRxPreview(s.rx, i); });
  recalcOrder();
}
function ofSetInput(i, field, val) {
  if (!_ofSets[i]) return;
  _ofSets[i][field] = val;
  _modalDirty = true;
  if (field !== 'rx' && field !== 'frame_code' && field !== 'lens_name') recalcOrder();
}
function addOrderSet() {
  _ofSets.push(_newSet(''));
  renderOrderSets();
  const sel = document.getElementById('o-rx-'+(_ofSets.length-1)); if (sel) sel.focus();
}
function removeOrderSet(i) {
  const s = _ofSets[i];
  const filled = s && (s.frame_code || +s.frame_base || s.lens_name || +s.lens_base);
  if (filled && !confirm(_ofLbl('Убрать этот комплект из заказа?','Ukloniti ovu stavku iz porudžbine?'))) return;
  _ofSets.splice(i, 1);
  if (!_ofSets.length) _ofSets.push(_newSet(''));
  renderOrderSets();
}
// Итоги комплекта по черновику: оправа и линзы со скидкой
function _ofCalcSet(s, isCL) {
  const pct = x => Math.min(Math.max(+x||0, 0), 100);
  const frame = isCL ? 0 : Math.round((+s.frame_base||0)*(1-pct(s.frame_disc)/100));
  const lensPer = Math.round((+s.lens_base||0)*(1-pct(s.lens_disc)/100));
  const qty = isCL ? 1 : (+s.lens_qty===1 ? 1 : 2);
  return {frame, lensPer, qty, lens: lensPer*qty};
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
      tgNick(o.patients&&o.patients.telegram_username).toLowerCase().includes(q.replace(/^@/,'')) ||
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
// Колонки «Оправа / линзы» и «Рецепт» в списке заказов — по строке на комплект
function _orderListItemsHtml(o) {
  return orderSets(o).map(st =>
    '<div class="fw-6" style="font-size:13.5px">'+_escH(st.frame_code||'—')+'</div><div class="text-sm text-m">'+_escH(st.lens_name||'—')+'</div>'
  ).join('<div style="height:4px"></div>');
}
function _orderListRxHtml(o) {
  const parts = orderSets(o).filter(st => st.rx_type).map(st => {
    const e = st.exam_id ? (_ordersExamMap[st.exam_id] || window._examCache[st.exam_id]) : null;
    const d = e ? _rxDioptStr(e, st.rx_type) : '';
    return '<div style="font-weight:600;color:var(--text-m)">'+_rxKindLabel(st.rx_type, e)+'</div>'+(d ? '<div style="margin-top:2px;color:var(--text)">'+d+'</div>' : '');
  });
  return parts.length ? parts.join('<div style="height:4px"></div>') : '—';
}

function _sortOrders(list) {
  return list.slice().sort((a, b) => {
    if (_ordersSort === 'date_new') return orderDateOf(b).localeCompare(orderDateOf(a)) || (b.created_at||'').localeCompare(a.created_at||'');
    if (_ordersSort === 'date_old') return orderDateOf(a).localeCompare(orderDateOf(b)) || (a.created_at||'').localeCompare(b.created_at||'');
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
    .select('*, patients(name,telegram_chat_id,telegram_username)')
    .is('deleted_at', null);
  _allOrders = orders || [];

  // Подтягиваем рецепты, на которые ссылаются заказы, чтобы показать диоптрии в списке
  const examIds = [...new Set([].concat(..._allOrders.map(orderExamIds)))];
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
        '<td class="text-m" onclick="event.stopPropagation()">'+fmtOrderDate(o)+'</td>'+
        '<td onclick="event.stopPropagation()"><span class="table-name" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard(\''+o.patient_id+'\')">'+(o.patients&&o.patients.name||'—')+'</span> '+tgTag(o.patients&&o.patients.telegram_username)+'</td>'+
        '<td><span class="badge badge-gray" style="font-size:11px">'+(o.order_number||'—')+'</span>'+(o.is_redo ? ' <span class="badge badge-warn" style="font-size:10px">&#8635;</span>' : '')+'</td>'+
        '<td>'+_orderListItemsHtml(o)+'</td>'+
        '<td style="color:var(--text-l);font-size:13px;max-width:220px">'+_orderListRxHtml(o)+'</td>'+
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
  const {data:o} = await db.from('orders').select('*, patients(name,telegram_chat_id,telegram_username)').eq('id',id).single();
  if (!o) return;
  const bal = orderBalance(o);
  const displayDate = fmtOrderDate(o);

  // Диоптрии рецепта, по которому оформлен заказ — подтягиваем отдельно,
  // т.к. карточку заказа можно открыть и не из списка «Заказы» (например, из карточки пациента).
  const needIds = [...new Set(orderExamIds(o))].filter(id => !window._examCache[id]);
  if (needIds.length) {
    const {data:exs} = await db.from('examinations').select(RX_SELECT_FIELDS).in('id', needIds);
    (exs||[]).forEach(e => { window._examCache[e.id] = e; });
  }
  openModal(
    '<div class="modal modal-lg">'+
      '<div class="modal-header">'+
        '<div style="flex:1;min-width:0">'+
          '<span class="modal-title">'+t('orders')+' · <span style="cursor:pointer;color:var(--primary)" onclick="openPatientCard(\''+o.patient_id+'\')">'+(o.patients&&o.patients.name||'—')+'</span></span> '+tgTag(o.patients&&o.patients.telegram_username)+
          '<div class="text-sm text-m mt-4">'+displayDate+' · <span class="badge '+(STATUS_BADGE[o.status]||'badge-gray')+'">'+statusLabel(o.status)+'</span>'+(o.is_redo ? ' · <span class="badge badge-warn">&#8635; Переделка</span>' : '')+(o.counts_for_salary ? ' · <span class="salary-badge">💰 10%</span>' : '')+'</div>'+
        '</div>'+
        '<div class="profile-actions">'+
          (o.status==='готов' ? '<button class="btn btn-accent btn-sm" onclick="issueOrder(\''+o.id+'\');closeModal()">'+ t('issue_btn')+'</button>' : '')+
          (o.status==='выдан' && o.patients && o.patients.telegram_chat_id ? '<button class="btn btn-ghost btn-sm" onclick="sendFollowUpSurvey(\''+o.id+'\')">🔁</button>' : '')+
          (isAdmin() ? '<button class="btn btn-ghost btn-sm" onclick="closeModal();openEditOrder(\''+o.id+'\')">✏️ '+t('pt_edit')+'</button>' : '')+
          ddMenu([
            {label:'👤 '+t('pt_open_patient'), fn:"openPatientCard('"+o.patient_id+"')"},
            {label:'🗑 '+t('delete'), fn:"closeModal();delOrder('"+o.id+"')", danger:true, hide:!isAdmin()},
          ])+
          '<button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>'+
        '</div>'+
      '</div>'+
      '<div class="modal-body">'+
        '<div class="info-grid mb-12">'+
          '<div class="info-item"><label>'+t('order_num_label')+'</label><p style="font-weight:700;font-size:15px">'+(o.order_number||'—')+'</p></div>'+
          '<div class="info-item"><label>'+t('order_type')+'</label><p>'+o.type+'</p></div>'+
          '<div class="info-item"><label>'+t('promised_date')+'</label><p>'+(o.promised_date ? fmt(o.promised_date) : '—')+'</p></div>'+
          '<div class="info-item"><label>'+t('order_date_label')+'</label><p>'+displayDate+'</p></div>'+
          (o.promo_code ? '<div class="info-item"><label>'+(_lang==='sr'?'Promo kod':'Промокод')+'</label><p><span class="badge badge-accent">'+_escH(o.promo_code)+'</span></p></div>' : '')+
        '</div>'+
        '<div class="divider"></div>'+
        '<div class="mb-12">'+orderSetsViewHtml(o, window._examCache)+'</div>'+
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
// rxVal — 'examId|far|comp|near|cl': заказ «по рецепту» из карточки пациента.
// Без rxVal для нового заказа сразу подставляется последний осмотр пациента (как в Ginter);
// выбор всегда виден в форме и его можно сменить.
async function openAddOrderFor(patientId, rxVal, _payChecked) {
  // Перед заказом: у пациента есть прошедший приём, который так и остался «запланирован»? → «Приём оплачен?»
  if (patientId && !_payChecked && typeof unclosedAppts === 'function') {
    const un = await unclosedAppts(patientId);
    if (un.length) { askApptPaid(un[0], skipped => openAddOrderFor(patientId, rxVal, skipped)); return; }
  }
  const [{data:patients}, examRes] = await Promise.all([
    db.from('patients').select('id,name,telegram_username').is('deleted_at',null).order('name'),
    patientId
      ? db.from('examinations').select(RX_SELECT_FIELDS).eq('patient_id',patientId).is('deleted_at',null).order('exam_date',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false})
      : Promise.resolve({data:[]})
  ]);
  const exams = examRes&&examRes.data||[];
  let pre = rxVal || '';   // 'examId|type' или несколько через ';'
  if (!pre && exams.length) {
    const k = ['far','comp','near','cl'].find(tp => _rxDioptStr(exams[0], tp));
    if (k) pre = exams[0].id+'|'+k;
  }
  _drawOrderForm(null, patientId, patients||[], exams, pre);
}
async function openEditOrder(id) {
  const {data:o} = await db.from('orders').select('*').eq('id',id).single();
  const [{data:patients}, examRes] = await Promise.all([
    db.from('patients').select('id,name,telegram_username').is('deleted_at',null).order('name'),
    o && o.patient_id
      ? db.from('examinations').select(RX_SELECT_FIELDS).eq('patient_id',o.patient_id).is('deleted_at',null).order('exam_date',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false})
      : Promise.resolve({data:[]})
  ]);
  _drawOrderForm(o, o&&o.patient_id, patients||[], examRes&&examRes.data||[]);
}

function _drawOrderForm(o, prePatient, patients, exams, preRx) {
  const isEdit = !!o;
  // Дата заказа (как в ginter-crm): у существующего — сохранённая; у нового —
  // дата обследования, если заказ по карте, внесённой сегодня (часто задним числом);
  // иначе дата первого посещения только что созданного пациента; иначе сегодня.
  let orderDate = today(), orderPrec = 'day';
  if (o) { orderDate = o.order_date || (o.order_date_prec==='unknown' ? '' : (o.created_at||'').split('T')[0]); orderPrec = o.order_date_prec || 'day'; }
  else {
    const preEx = preRx ? (exams||[]).find(e => e.id === preRx.split(';')[0].split('|')[0]) : null;
    const chain = _pendingChainDate && _pendingChainDate.pid === prePatient ? _pendingChainDate : null;
    if (preEx && (preEx.created_at||'').split('T')[0] === today() && preEx.exam_date) { orderDate = preEx.exam_date; orderPrec = preEx.exam_date_prec || 'day'; }
    else if (chain) { orderDate = chain.date; orderPrec = chain.prec; }
    _pendingChainDate = null;
  }
  // Заказ по рецепту МКЛ → сразу тип «Контактные линзы»
  const preCL = !o && preRx && preRx.split(';').every(x => x.split('|')[1] === 'cl');
  const curType = o ? (o.type || 'Очки') : (preCL ? 'МКЛ' : 'Очки');
  const isCL = curType === 'МКЛ';
  const isRedo = o && !!o.is_redo;

  // Комплекты: у заказа — сохранённые; у нового — по выбранным рецептам (или один пустой)
  _ofExams = exams || [];
  _ofSets = o ? orderSets(o).map(_setFromStored)
              : (preRx ? preRx.split(';').filter(Boolean).map(r => _newSet(r)) : []);
  if (!_ofSets.length) _ofSets = [_newSet('')];
  const rxCount = exams.length;
  const rxLabel = t('prescription') + (rxCount ?
    ' <span class="of-count">('+rxCount+')</span>' :
    ' <span class="of-count of-count-none">— '+t('exam_none')+'</span>');

  const typeBtns = [['Очки',t('order_type_glasses')],['МКЛ',t('order_type_cl')],['Ремонт',t('order_type_repair')],['Другое',t('no_data')]]
    .map(([val,lbl]) => '<button type="button" data-type="'+val+'"'+(curType===val?' class="active"':'')+' onclick="setOrderTypeBtn(\''+val+'\')">'+lbl+'</button>').join('');
  const extraOpen = !!(o && (o.notes || o.is_redo));
  const numIn = (id, val, attrs) => '<input type="number" id="'+id+'" value="'+(val==null?'':val)+'" min="0" placeholder="0" '+(attrs||'')+'>';

  openModal(
    '<div class="modal modal-xl of-modal">'+
      '<div class="modal-header of-head">'+
        '<span class="modal-title">'+(isEdit ? t('edit_order') : t('new_order'))+'</span>'+
        '<div class="of-type-toggle">'+typeBtns+'</div>'+
        '<input type="hidden" id="o-type" value="'+curType+'">'+
        '<button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>'+
      '</div>'+
      '<div class="modal-body of-body">'+

        // Пациент
        '<div class="of-field">'+
          '<div class="of-label-row"><label>'+t('patient')+' *</label><button class="btn btn-ghost btn-xs" onclick="toggleQuickPatient()">+ '+t('new_patient')+'</button></div>'+
          '<select id="o-pid" onchange="onOrderPatientChange(this.value)">'+
            '<option value="">— '+t('select_patient')+' —</option>'+
            patients.map(p => '<option value="'+p.id+'" '+((o&&o.patient_id===p.id||prePatient===p.id)?'selected':'')+'>'+_escH(nameWithNick(p.name,p.telegram_username))+'</option>').join('')+
          '</select>'+
          '<div id="quick-patient-form" class="of-sub" style="display:none">'+
            '<div class="of-sub-title">'+t('new_patient')+'</div>'+
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
          '<div id="o-unclosed"></div>'+
        '</div>'+

        // Дата + № заказа
        '<div class="of-grid2">'+
          '<div class="of-field"><label>'+t('order_date_label')+'</label>'+dpHtml('o-orderdate', orderDate, orderPrec)+'</div>'+
          '<div class="of-field"><label>'+t('order_num_label')+'</label><input id="o-ordernum" value="'+(o&&o.order_number||'')+'"></div>'+
        '</div>'+

        // Рецепт · оправа · линзы — комплектами (несколько очков в одном заказе)
        '<div class="of-section"><span>'+rxLabel+'</span><button class="btn btn-ghost btn-xs" onclick="toggleQuickRx()">+ '+t('prescription')+'</button></div>'+
        '<div id="quick-rx-form" class="of-sub" style="display:none">'+
          '<div class="of-sub-title">'+t('prescription')+'</div>'+
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

        '<div id="o-sets"></div>'+

        // Работа · срок · промокод  |  Итого
        '<div class="of-sum-row">'+
          '<div class="of-grid2">'+
            '<div class="of-field"><label>'+t('work')+' (din.)</label>'+numIn('o-wprice', o&&o.work_price||'', 'class="of-num" oninput="recalcOrder()"')+'</div>'+
            '<div class="of-field"><label>'+t('promised_date')+'</label><input type="date" id="o-pdate" value="'+(o&&o.promised_date||'')+'"></div>'+
            '<div class="of-field of-span2"><label>'+(_lang==='sr'?'Promo kod':'Промокод')+'</label>'+promoFieldHtml('o-promo', o&&o.promo_code||'', 'L')+'</div>'+
          '</div>'+
          '<div class="of-total">'+
            '<div class="of-total-row"><span>'+t('total')+'</span><span id="o-total-display">'+fmtMoney(0)+'</span></div>'+
            '<div class="of-total-paid">✓ '+(_lang==='sr'?'Plaćeno u celosti':'Оплачено полностью')+'</div>'+
          '</div>'+
        '</div>'+

        // Свёрнутое: переделка, статус и даты, комментарий
        '<button type="button" class="of-collapse" aria-expanded="'+extraOpen+'" onclick="toggleOrderExtra(this)">'+
          '<span>'+(_lang==='sr'?'Prepravka, status i datumi, komentar':'Переделка, статус и даты, комментарий')+'</span><span class="chev">▾</span>'+
        '</button>'+
        '<div id="o-extra"'+(extraOpen?'':' hidden')+'>'+
          '<label class="of-check"><input type="checkbox" id="o-is-redo"'+(isRedo?' checked':'')+'> &#8635; '+(_lang==='sr'?'Prepravka':'Переделка')+'</label>'+
          (isEdit ?
            '<div class="of-grid3">'+
              '<div class="of-field"><label>'+t('status')+'</label><select id="o-status">'+ORDER_STATUSES_ALL.map(s => '<option '+(o.status===s?'selected':'')+' value="'+s+'">'+statusLabel(s)+'</option>').join('')+'</select></div>'+
              '<div class="of-field"><label>'+t('ready_date_label')+'</label><input type="date" id="o-rdate" value="'+(o.ready_date||'')+'"></div>'+
              '<div class="of-field"><label>'+t('issued_label')+'</label><input type="date" id="o-idate" value="'+(o.issued_date||'')+'"></div>'+
            '</div>' :
            '<div class="of-field"><label>'+t('status')+'</label><select id="o-status-new">'+
              '<option value="в работе">'+statusLabel('в работе')+'</option>'+
              '<option value="выдан">'+(_lang==='sr'?'izdata odmah (samo zahvalnica klijentu)':'выдан сразу (клиенту — только благодарность)')+'</option>'+
            '</select></div>')+
          '<div class="of-field"><label>'+t('notes')+'</label><textarea id="o-notes" rows="2">'+_escH(o&&o.notes||'')+'</textarea></div>'+
        '</div>'+
      '</div>'+
      '<div class="modal-footer">'+
        '<button class="btn btn-ghost" onclick="closeModal()">'+t('cancel')+'</button>'+
        '<button class="btn btn-accent" onclick="saveOrder(\''+( o&&o.id||'')+'\')">'+ t('save')+'</button>'+
      '</div>'+
    '</div>'
  );
  renderOrderSets();
  setTimeout(() => promoFieldInit('o-promo'), 50);
  if (!isEdit && prePatient) orderUnclosedBanner(prePatient);
}

function setOrderTypeBtn(type) {
  const inp = document.getElementById('o-type'); if (!inp) return;
  inp.value = type;
  document.querySelectorAll('.of-type-toggle button').forEach(b => b.classList.toggle('active', b.dataset.type === type));
  _modalDirty = true;
  onOrderTypeChange(type);
}
function toggleOrderExtra(btn) {
  const box = document.getElementById('o-extra'); if (!box) return;
  box.hidden = !box.hidden;
  btn.setAttribute('aria-expanded', String(!box.hidden));
}

function onOrderTypeChange(type) {
  renderOrderSets();
  _qrxSyncType();
}

function toggleQuickPatient() {
  const f = document.getElementById('quick-patient-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  if (f.style.display === 'block') document.getElementById('qp-name') && document.getElementById('qp-name').focus();
}
function toggleQuickRx() {
  const f = document.getElementById('quick-rx-form');
  f.style.display = f.style.display === 'none' ? 'block' : 'none';
  _qrxSyncType();
}
// Заказ МКЛ → быстрый рецепт сразу «контактные линзы» (BC/DIA, без PD); очки → без пункта КЛ
function _qrxSyncType() {
  const sel = document.getElementById('qrx-type'); if (!sel) return;
  const cl = _ofIsCL();
  Array.from(sel.options).forEach(op => { op.hidden = cl ? op.value !== 'cl' : op.value === 'cl'; });
  if (cl) sel.value = 'cl'; else if (sel.value === 'cl') sel.value = 'far';
  updateQuickRxFields();
}
function updateQuickRxFields() {
  const type = document.getElementById('qrx-type') && document.getElementById('qrx-type').value;
  const addWrap = document.getElementById('qrx-add-wrap');
  const clWrap = document.getElementById('qrx-cl-type-wrap');
  const addLabel = document.getElementById('qrx-add-label');
  const pdLabel = document.getElementById('qrx-pd-label');
  if (type==='cl') { pdLabel.textContent='BC'; addLabel.textContent='DIA'; if(clWrap) clWrap.style.display='block'; }
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
  const od = dpGet('o-orderdate');
  const rxData = {patient_id:pid, visit_number:visitNum, recommendations:note||null,
    exam_date: od.ok ? od.date : today(), exam_date_prec: od.ok ? od.prec : 'day',
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
  _ofExams = [ne].concat(_ofExams);
  // Новый рецепт → в первый комплект без рецепта, иначе новым комплектом
  const val = ne.id+'|'+type;
  const free = _ofSets.find(st => !st.rx);
  if (free) free.rx = val; else _ofSets.push(_newSet(val));
  toggleQuickRx();
  toast(t('save_card'));
  renderOrderSets();
}
async function onOrderPatientChange(pid) {
  orderUnclosedBanner(pid);
  _ofSets.forEach(st => { st.rx = ''; });
  if (!pid) { _ofExams = []; renderOrderSets(); return; }
  const {data:exams} = await db.from('examinations').select(RX_SELECT_FIELDS).eq('patient_id',pid).is('deleted_at',null).order('exam_date',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false});
  (exams||[]).forEach(e => { window._examCache[e.id] = e; });
  _ofExams = exams || [];
  renderOrderSets();
}
async function showRxPreview(val, idx) {
  const prev = document.getElementById('o-rx-preview-'+(idx||0));
  if (!prev) return;
  if (!val) { prev.style.display = 'none'; return; }
  const [examId, type] = val.split('|');
  if (!examId || !type) { prev.style.display = 'none'; return; }
  let e = window._examCache && window._examCache[examId];
  if (!e) {
    const {data:ed} = await db.from('examinations').select(RX_SELECT_FIELDS).eq('id',examId).single();
    e = ed; if (e) window._examCache[e.id] = e;
  }
  if (!e) { prev.style.display = 'none'; return; }
  // Крупная таблица OD/OS (как во вкладке «Коррекция (RX)» карточки пациента)
  prev.innerHTML = _rxDioptStr(e, type) ? _rxTableHtml(e, type) : '('+t('no_data')+')';
  prev.style.display = 'block';
}
function recalcOrder() {
  const isCL = _ofIsCL();
  let total = 0;
  _ofSets.forEach((st, i) => {
    const c = _ofCalcSet(st, isCL);
    const ff = document.getElementById('o-ffinal-'+i); if (ff) ff.value = c.frame;
    const lf = document.getElementById('o-lfinal-'+i); if (lf) lf.value = c.lens;
    total += c.frame + c.lens;
  });
  total += Math.max(+(document.getElementById('o-wprice') && document.getElementById('o-wprice').value)||0, 0);
  const el = document.getElementById('o-total-display'); if (el) el.textContent = fmtMoney(total);
}
function applyDiscount() {}
function calcTotal() {}
async function saveOrder(id) {
  const patient_id = v('o-pid'); if (!patient_id) { alert(t('select_patient')); return; }
  const orderType = v('o-type');
  const isCL = orderType === 'МКЛ';
  // Комплекты → items; пустые (без рецепта, оправы и линз) не сохраняются
  const items = _ofSets.map(st => {
    const c = _ofCalcSet(st, isCL);
    const [exam_id, rx_type] = (st.rx||'').split('|');
    return {exam_id: exam_id||null, rx_type: rx_type||null,
      frame_code: isCL ? '' : (st.frame_code||'').trim(), frame_base: isCL ? 0 : Math.max(+st.frame_base||0,0), frame_disc: isCL ? 0 : Math.max(+st.frame_disc||0,0), frame_price: c.frame,
      lens_name: (st.lens_name||'').trim(), lens_base: Math.max(+st.lens_base||0,0), lens_disc: Math.max(+st.lens_disc||0,0), lens_price: c.lensPer, lens_qty: c.qty};
  }).filter(it => it.exam_id || it.frame_code || it.frame_base || it.lens_name || it.lens_base);
  // Сводка в плоские поля (аналитика, дашборд, бюджет, orderTotal)
  const fFinal = items.reduce((a, it) => a + it.frame_price, 0);
  const lensSum = items.reduce((a, it) => a + it.lens_price*it.lens_qty, 0);
  const qty = items.reduce((a, it) => a + it.lens_qty, 0) || (isCL ? 1 : 2);
  const lPerPiece = lensSum / qty;
  const firstRx = items.find(it => it.exam_id && it.rx_type);
  const joinU = arr => [...new Set(arr.filter(Boolean))].join(' + ') || null;
  const od = dpGet('o-orderdate');
  if (!od.ok) { alert(t('dp_year_err')); return; }
  const isRedo = !!(document.getElementById('o-is-redo') && document.getElementById('o-is-redo').checked);
  const data = {
    patient_id, type:orderType,
    items,
    prescription_label: firstRx ? _rxLabelSr(window._examCache[firstRx.exam_id], firstRx.rx_type) : null,
    examination_id: firstRx ? firstRx.exam_id : null,
    order_number: v('o-ordernum') || null,
    order_date: od.date, order_date_prec: od.prec,
    frame_code: joinU(items.map(it => it.frame_code)), frame_price: fFinal,
    lens_name: joinU(items.map(it => it.lens_name)), lens_price: lPerPiece, lens_qty: qty,
    work_price: v('o-wprice') ? Math.max(+v('o-wprice'),0) : null,
    // Предоплаты в форме нет: заказ всегда считается оплаченным полностью
    // та же формула, что orderTotal(): frame_price + lens_price*lens_qty + work_price
    prepayment: fFinal + lPerPiece*qty + (v('o-wprice') ? Math.max(+v('o-wprice'),0) : 0),
    promo_code: promoFieldVal('o-promo'),
    promised_date: v('o-pdate') || null,
    notes: v('o-notes'),
    is_redo: isRedo
  };
  try {
    if (id) {
      const st = v('o-status');
      // Даты «Готов»/«Выдан» правятся вручную; при смене статуса в форме и пустом поле — сегодня.
      let ready_date = v('o-rdate') || null, issued_date = v('o-idate') || null;
      if (st === 'готов' && !ready_date) ready_date = today();
      if (st === 'выдан' && !issued_date) issued_date = today();
      const {error} = await db.from('orders').update({...data, status:st, ready_date, issued_date}).eq('id',id);
      if (error) throw error;
      toast(t('order_updated'));
    } else {
      const {error} = await db.from('orders').insert({...data, status: v('o-status-new') || 'в работе', ...(v('o-status-new')==='выдан' ? {issued_date: today()} : {})});
      if (error) throw error;
      toast(t('order_created'));
    }
    if (od.date && od.prec === 'day') await recalcSalary(patient_id, od.date);
    if (curSection === 'patients' && _openPatientId === patient_id) _cardTab = 'orders';
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
  const {data:o} = await db.from('orders').select('*, patients(name,telegram_chat_id,telegram_username)').eq('id',id).single();
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
  const {data:o} = await db.from('orders').select('*, patients(name,telegram_chat_id,telegram_username)').eq('id',orderId).single();
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
