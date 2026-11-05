// ═══ СВОДКА ПАЦИЕНТА + ВКЛАДКА «АКТИВНОСТЬ» + ПЛАШКИ В РАСПОРЕДЕ ═══
// Единые плашки по всему CRM, порядок: промокод → долг → контроль.
(function(){
  const css = '.pt-sum{margin:14px 0 6px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface)}'+
    '.pt-sum>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;font-size:15px;font-weight:700}'+
    '.pt-sum>summary::-webkit-details-marker{display:none}'+
    '.pt-sum>summary .pt-sum-arr{margin-left:auto;color:var(--text-l);transition:transform .15s}'+
    '.pt-sum[open]>summary .pt-sum-arr{transform:rotate(180deg)}'+
    '.pt-sum-body{padding:0 14px 14px}'+
    '.pt-sum-body .pt-stats{margin:10px 0 0}'+
    '.pt-imp{background:#fffbeb;border:1px solid #fde68a;border-radius:var(--r-sm);padding:10px 14px;font-size:14.5px;color:#78350f;display:grid;gap:5px}'+
    '.pt-imp b{font-weight:700}'+
    '.chip{display:inline-flex;align-items:center;gap:3px;font-size:11.5px;font-weight:700;padding:1px 8px;border-radius:10px;white-space:nowrap;vertical-align:middle;border:1px solid transparent}'+
    '.chip-promo{background:#fef3c7;color:#92400e;border-color:#fcd34d}'+
    '.chip-debt{background:#fee2e2;color:#b91c1c;border-color:#fca5a5}'+
    '.chip-ctrl{background:#dbeafe;color:#1e3a8a;border-color:#93c5fd}'+
    '.chip-ok{background:#dcfce7;color:#166534;border-color:#86efac}'+
    '.chip-gray{background:var(--surface2);color:var(--text-m);border-color:var(--border)}'+
    '.cg2-chips{display:flex;gap:3px;flex-wrap:wrap;margin-top:2px}.cg2-chips .chip{font-size:10.5px;padding:0 6px}'+
    '.pt-act{display:grid;grid-template-columns:96px 24px 1fr;row-gap:9px;column-gap:6px;font-size:14.5px;align-items:baseline}'+
    '.pt-act .d{color:var(--text-m);font-size:13.5px}';
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();

const _sr = () => (typeof _lang !== 'undefined' && _lang === 'sr');
const _L = (ru, sr) => _sr() ? sr : ru;
function _chip(cls, txt, title) { return '<span class="chip '+cls+'"'+(title?' title="'+_escH(title)+'"':'')+'>'+txt+'</span>'; }
function _normCode(c) { return String(c||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase(); }

// Справочник промокодов для набора кодов одним запросом
async function ptPromoMap(appts, orders) {
  const codes = [...new Set([...(appts||[]).map(apptPromoCode), ...(orders||[]).map(o => o.promo_code)].filter(Boolean).map(String))];
  if (!codes.length) return {};
  const {data} = await db.from('promo_codes').select('code,offer,discount,exam_discount,valid_from,valid_to,active').in('code', codes);
  const m = {}; (data||[]).forEach(pc => { m[_normCode(pc.code)] = pc; }); return m;
}

// Скидка заказа = (база − итог) по оправам и линзам комплектов
function orderDiscountSum(o) {
  const items = Array.isArray(o.items) ? o.items : [];
  return items.reduce((s, it) => {
    const qty = +it.lens_qty || 0;
    const f = (+it.frame_base||0) > 0 ? Math.max((+it.frame_base) - (+it.frame_price||0), 0) : 0;
    const l = (+it.lens_base||0) > 0 ? Math.max(((+it.lens_base) - (+it.lens_price||0)) * qty, 0) : 0;
    return s + f + l;
  }, 0);
}

// Промокоды пациента: из записей + из заказов, со статусом применения
function ptPromoStatus(A, O, promoMap) {
  const td = today(), res = {};
  const orderCodes = new Set(O.filter(o => !_ORDER_VOID.includes(o.status)).map(o => _normCode(o.promo_code)).filter(Boolean));
  A.filter(a => a.status !== 'отменён').forEach(a => {
    const code = _normCode(apptPromoCode(a)); if (!code || res[code]) return;
    const pc = promoMap[code] || null;
    const offer = pc ? pc.offer : '';
    const needsLens = offer === 'L' || offer === 'PL';
    const expired = pc && ((pc.valid_to && pc.valid_to < td) || pc.active === false);
    const applied = needsLens ? orderCodes.has(code) : (a.status === 'завершён' || orderCodes.has(code));
    res[code] = {code, pc, applied, expired, from:'appt', date:a.date};
  });
  O.forEach(o => { const code = _normCode(o.promo_code); if (code && !res[code]) res[code] = {code, pc:promoMap[code]||null, applied:true, from:'order', date:orderDateOf(o)}; });
  return Object.values(res);
}

// Свёрнутая сводка в карточке пациента
function ptSummaryHtml(p, A, O, E, promoMap, s) {
  const td = today();
  const promos = ptPromoStatus(A, O, promoMap);
  const unapplied = promos.filter(x => !x.applied && !x.expired);
  const active = O.filter(o => _ORDER_ACTIVE.includes(o.status));
  const debtOrders = active.filter(o => orderBalance(o) > 0);
  const ready = O.filter(o => o.status === 'готов');
  const ctrlOver = !s.planned && s.nextCtrl && s.nextCtrl <= td;
  const disc = O.filter(o => !_ORDER_VOID.includes(o.status)).reduce((a, o) => a + orderDiscountSum(o), 0);

  // Плашки в свёрнутом заголовке
  const chips = [];
  unapplied.forEach(x => chips.push(_chip('chip-promo', '🎁 '+_escH(x.code))));
  if (s.debt > 0) chips.push(_chip('chip-debt', _L('долг ','dug ')+fmtMoney(s.debt)));
  if (ready.length) chips.push(_chip('chip-ok', _L('готов к выдаче','spremno')));
  if (s.planned) chips.push(_chip('chip-ctrl', _L('запись ','termin ')+fmt(s.planned.date)));
  else if (ctrlOver) chips.push(_chip('chip-debt', _L('контроль просрочен','kontrola kasni')));

  // «Важно сейчас»
  const imp = [];
  unapplied.forEach(x => imp.push('🎁 '+_L('Промокод','Promo kod')+' <b>'+_escH(x.code)+'</b>'+(x.pc ? ' — '+_escH(promoOfferLabel(x.pc)) : '')+' · '+_L('ещё не применён','još nije iskorišćen')));
  debtOrders.forEach(o => imp.push('💰 '+_L('Доплата по заказу','Doplata za porudžbinu')+(o.order_number?' №'+_escH(o.order_number):'')+': <b>'+fmtMoney(orderBalance(o))+'</b>'));
  ready.forEach(o => imp.push('📦 '+_L('Заказ готов','Porudžbina spremna')+(o.order_number?' №'+_escH(o.order_number):'')+(o.ready_date?' '+_L('с','od')+' '+fmt(o.ready_date):'')));
  if (s.planned) imp.push('📅 '+_L('Записан(а)','Zakazan(a)')+': '+fmt(s.planned.date)+' '+(s.planned.time||'').substr(0,5));
  else if (ctrlOver) imp.push('📅 '+_L('Контроль просрочен','Kontrola kasni')+': '+fmt(s.nextCtrl));
  if (p.notify_off) imp.push('🔕 '+_L('Отказался от уведомлений о заказах','Odjavio se od obaveštenja'));

  const allCodes = promos.map(x => _escH(x.code)+(x.expired && !x.applied ? ' ('+_L('истёк','istekao')+')' : '')).join(', ');
  const tg = p.telegram_chat_id
    ? '<b style="color:var(--green)">'+_L('подключён','povezan')+'</b><small>'+(p.notify_off ? _L('уведомления выкл.','obaveštenja isklj.') : _L('уведомления вкл.','obaveštenja uklj.'))+'</small>'
    : '<b style="color:var(--text-m)">'+_L('не подключён','nije povezan')+'</b><small>'+(p.telegram_username ? _escH('@'+tgNick(p.telegram_username)) : _L('нет ника','nema nika'))+'</small>';

  let open = false; try { open = localStorage.getItem('pt_sum_open') === '1'; } catch(e) {}
  return '<details class="pt-sum"'+(open?' open':'')+' ontoggle="try{localStorage.setItem(\'pt_sum_open\',this.open?\'1\':\'0\')}catch(e){}">'+
    '<summary>'+_L('Сводка','Pregled')+' '+(chips.length ? chips.join(' ') : _chip('chip-gray', _L('всё спокойно','sve u redu')))+'<span class="pt-sum-arr">▾</span></summary>'+
    '<div class="pt-sum-body">'+
      (imp.length ? '<div class="pt-imp"><b>'+_L('Важно сейчас','Važno sada')+'</b>'+imp.map(x => '<div>'+x+'</div>').join('')+'</div>' : '')+
      '<div class="pt-stats">'+
        '<div class="pt-stat"><label>'+t('pt_last_visit')+'</label><b>'+(s.lastVisit ? fmt(s.lastVisit) : '—')+'</b><small>'+t('pt_visits')+': '+s.visits+'</small></div>'+
        '<div class="pt-stat"><label>'+t('pt_paid')+'</label><b>'+fmtMoney(s.paid)+'</b><small>'+t('pt_orders_count')+': '+O.filter(o=>!_ORDER_VOID.includes(o.status)).length+'</small></div>'+
        '<div class="pt-stat"><label>'+_L('Скидки','Popusti')+'</label><b>'+(disc ? '−'+fmtMoney(disc) : '—')+'</b><small>'+(allCodes ? _L('коды','kodovi')+': '+allCodes : _L('без промокодов','bez promo kodova'))+'</small></div>'+
        '<div class="pt-stat"><label>Telegram</label>'+tg+'</div>'+
      '</div>'+
    '</div>'+
  '</details>';
}

// Вкладка «Активность» — всё по датам одной лентой
function ptActivityHtml(p, A, O, E) {
  const ev = [];
  const add = (d, ic, txt) => { if (d) ev.push({d:String(d).substr(0,10), ic, txt}); };
  add(p.created_at, '👤', _L('Добавлен(а) в базу','Dodat(a) u bazu')+(p.source ? ' · '+_escH(p.source) : ''));
  A.forEach(a => {
    const code = apptPromoCode(a);
    add(a.date, a.status==='отменён' ? '🚫' : '📅',
      _escH(apptTypeName(a.type||'') || t('appointments'))+' · '+statusLabel(a.status)+
      (a.consultation_price && a.status==='завершён' ? ' · '+fmtMoney(a.consultation_price) : '')+
      (code ? ' '+_chip('chip-promo','🎁 '+_escH(code)) : ''));
  });
  E.forEach(e => { const d = e.exam_date_prec === 'unknown' ? '' : examDate(e); add(d, '📋', _L('Обследование','Pregled vida')+(e.visit_number ? ' №'+e.visit_number : '')); });
  O.forEach(o => {
    const n = o.order_number ? ' №'+_escH(o.order_number) : '';
    const disc = orderDiscountSum(o);
    add(orderDateOf(o), '🧾', _L('Заказ','Porudžbina')+n+' · '+_escH(o.type||'')+' · '+fmtMoney(orderTotal(o))+
      (disc ? ' · '+_L('скидка','popust')+' −'+fmtMoney(disc) : '')+(o.promo_code ? ' '+_chip('chip-promo','🎁 '+_escH(o.promo_code)) : '')+
      (_ORDER_VOID.includes(o.status) ? ' · '+_escH(o.status) : ''));
    if (o.ready_date) add(o.ready_date, '📦', _L('Заказ готов','Porudžbina spremna')+n);
    if (o.issued_date) add(o.issued_date, '✅', _L('Заказ выдан','Porudžbina izdata')+n);
    [['notify_summary_at', _L('Бот: сводка заказа','Bot: pregled porudžbine')],
     ['notify_ready_at', _L('Бот: «заказ готов»','Bot: „spremno“')],
     ['notify_reminder_at', _L('Бот: напоминание забрать','Bot: podsetnik')],
     ['notify_issued_at', _L('Бот: спасибо после выдачи','Bot: hvala posle izdavanja')]
    ].forEach(([k, l]) => { if (o[k]) add(o[k], '💬', l+n); });
  });
  if (!ev.length) return '<div class="empty"><p>—</p></div>';
  ev.sort((a, b) => b.d.localeCompare(a.d));
  return '<div class="pt-act">'+ev.map(x => '<span class="d">'+fmt(x.d)+'</span><span>'+x.ic+'</span><span>'+x.txt+'</span>').join('')+'</div>';
}

// ── Распоред: долги пациентов недели одним запросом ──
async function calDebtMap(patientIds) {
  const ids = [...new Set((patientIds||[]).filter(Boolean))];
  if (!ids.length) return {};
  const {data} = await db.from('orders').select('patient_id,frame_price,lens_price,lens_qty,work_price,prepayment,status')
    .in('patient_id', ids).in('status', ['в работе','готов','переделка']).is('deleted_at', null);
  const m = {}; (data||[]).forEach(o => { const b = orderBalance(o); if (b > 0) m[o.patient_id] = (m[o.patient_id]||0) + b; });
  return m;
}
function calChipsHtml(appt, debtMap) {
  const code = apptPromoCode(appt), debt = (debtMap||{})[appt.patient_id] || 0;
  const c = [];
  if (code) c.push(_chip('chip-promo', '🎁 '+_escH(code)));
  if (debt > 0) c.push(_chip('chip-debt', _L('долг','dug'), fmtMoney(debt)));
  return c.length ? '<div class="cg2-chips">'+c.join('')+'</div>' : '';
}
function calChipsText(appt, debtMap) {
  const code = apptPromoCode(appt), debt = (debtMap||{})[appt.patient_id] || 0;
  return [code ? '🎁 '+code : '', debt > 0 ? _L('долг ','dug ')+fmtMoney(debt) : ''].filter(Boolean).join(' · ');
}
