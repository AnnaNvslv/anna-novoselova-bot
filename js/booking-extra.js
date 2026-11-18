/* ═══ BOOKING: доработки поверх booking.js / booking-kids.js ═══
   Подключается последним (defer). booking.js не меняется.
   1. «Контрольный визит»: 30 минут, бесплатно, бронирует 30-минутные слоты
      (slot_type 'express' — те же окна, что у экспресс-диагностики), чтобы не пересекаться с другими записями.
   2. Прямая ссылка на вид записи: booking.html?type=control — сразу открывает календарь
      «Контрольного визита» (ссылку присылает Telegram-бот в напоминании о контроле).
   3. Промокод из ссылки: booking.html?promo=LWEB15 — код подставляется в поле «Промокод»
      (кнопка на странице «Акции» сайта), в т.ч. после «Ещё одна запись».
*/
(function(){
  const control = (typeof TYPES_DATA !== 'undefined') && TYPES_DATA.find(t => t.id === 'control');
  if (control) {
    control.slotType = 'express';
    control.consult = 0;
    control.ru.dur = '30 минут';
    control.sr.dur = '30 minuta';
    control.ru.price = 'Бесплатно';
    control.sr.price = 'Besplatno';
    control.ru.sub = 'После подбора очков или промежуточной коррекции: проверим, как идёт адаптация и нужна ли замена диоптрий';
    control.sr.sub = 'Nakon izbora naočara ili privremene korekcije: proverićemo kako ide adaptacija i da li je potrebna promena dioptrije';
  }
  if (typeof REASONS !== 'undefined' && REASONS.control) {
    const item = { t: 'Контроль промежуточной коррекции (замена диоптрий)', s: 'Kontrola privremene korekcije (promena dioptrije)' };
    if (!REASONS.control.some(r => r.t === item.t)) REASONS.control.unshift(item);
  }

  // ── ?promo=<код> → подставить промокод ──
  let urlPromo = '';
  try { urlPromo = (new URLSearchParams(location.search).get('promo') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20); } catch (e) {}
  if (urlPromo) {
    const fillPromo = () => { const el = document.getElementById('f-promo'); if (el && !el.value) el.value = urlPromo; };
    document.addEventListener('DOMContentLoaded', () => {
      fillPromo();
      if (typeof resetBooking === 'function') {
        const _reset = resetBooking;
        window.resetBooking = function () { _reset.apply(this, arguments); fillPromo(); };
      }
    });
  }

  // ── ?type=<id> → сразу выбрать вид записи ──
  let wanted = null;
  try { wanted = new URLSearchParams(location.search).get('type'); } catch (e) {}
  if (!wanted || typeof TYPES_DATA === 'undefined' || !TYPES_DATA.some(t => t.id === wanted)) return;
  document.addEventListener('DOMContentLoaded', () => {
    const started = Date.now();
    (function waitSlots(){
      // Слоты грузятся асинхронно в booking.js — ждём до 6 секунд, затем открываем в любом случае
      const ready = (typeof allSlots !== 'undefined' && allSlots.length) || Date.now() - started > 6000;
      if (!ready) { setTimeout(waitSlots, 150); return; }
      if (typeof selectType === 'function' && document.querySelector('.type-card')) selectType(wanted);
    })();
  });
})();

/* ═══ UX-доработки 2026-11-18 ═══
   1. Первый экран: полный приём, помощь в оптике, экспресс. Контроль и повторный — под «Другие виды приёма».
      Подбор КЛ убран полностью.
   2. Счётчик шагов: 1–4 (4-й — подтверждение в Telegram).
   3. Календарь: сразу открывается месяц ближайшего свободного слота, подсказка «ближайшее время»,
      кнопка «Нет удобного времени — напишите Анне».
   4. Незаполненные поля: красная рамка + текст ошибки, держится до исправления.
*/
(function(){
  // ── DOM + CSS (без правки booking.html/booking.css) ──
  (function(){
    const st=document.createElement('style');
    st.textContent=`.step-sub{font-size:13px;color:var(--tm);margin:-6px 0 12px}
.more-types{margin-top:4px}
.more-toggle{width:100%;background:#fff;border:1.5px dashed var(--b);border-radius:var(--r);padding:13px 16px;font-family:inherit;font-size:14px;font-weight:600;color:var(--a);cursor:pointer;display:flex;justify-content:space-between;align-items:center;text-align:left;gap:8px}
.more-toggle .chev{transition:transform .15s}.more-toggle.open .chev{transform:rotate(180deg)}
.more-body{margin-top:10px}
.nearest{background:var(--gl);border:1.5px solid #a7e8d0;border-radius:12px;padding:11px 14px;font-size:14px;color:var(--g);margin-bottom:12px;line-height:1.5}
.nearest button{background:none;border:none;padding:0;font:inherit;font-weight:700;color:var(--g);text-decoration:underline;cursor:pointer}
.nearest.none{background:#fffbeb;border-color:#fcd34d;color:#92400e}
.no-time{display:block;text-align:center;font-size:13.5px;font-weight:600;color:var(--a);text-decoration:none;padding:10px 0 2px;border-top:1px solid var(--b)}
.err-msg{color:#c62828;font-size:12.5px;font-weight:600;margin-top:6px}
.field-error{outline:2px solid #e33 !important;outline-offset:3px;border-radius:10px}`;
    document.head.appendChild(st);
    const sub=(id)=>{const d=document.createElement('div');d.className='step-sub';d.id=id;return d;};
    const bc=document.getElementById('back-from-cal'); if(bc){bc.after(sub('step2-sub'));const nb=document.createElement('div');nb.id='nearest-box';document.getElementById('type-sel-sum').after(nb);}
    const grid=document.getElementById('cal-grid'); if(grid) grid.insertAdjacentHTML('afterend','<a class="no-time" href="https://t.me/AnnaNvslv" target="_blank" rel="noopener" onclick="noTimeClick()">💬 <span id="no-time-text"></span></a>');
    const bf=document.getElementById('back-from-form'); if(bf) bf.after(sub('step3-sub'));
    const pc=document.getElementById('pg-confirm'); if(pc){const d=sub('step4-sub');d.style.textAlign='center';pc.prepend(d);}
  })();

  // ── 1. Виды приёма ──
  const clIdx = TYPES_DATA.findIndex(t => t.id === 'cl');
  if (clIdx > -1) TYPES_DATA.splice(clIdx, 1);
  const MAIN = ['primary', 'help', 'express'];
  const MORE = ['control', 'repeat'];
  const order = MAIN.concat(MORE);
  TYPES_DATA.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  Object.assign(BK.ru, {
    step1sub: 'Шаг 1 из 4', step2sub: 'Шаг 2 из 4 — выберите дату и время', step3sub: 'Шаг 3 из 4 — анкета',
    step4sub: 'Шаг 4 из 4 — подтверждение в Telegram',
    moreTypes: 'Другие виды приёма (контрольный, повторный)',
    nearest: 'Ближайшее свободное время:', noSlots: 'Свободных окон на ближайшие недели нет.',
    noTime: 'Нет удобного времени? Напишите Анне — подберём',
    errFill: 'Заполните это поле', errPick: 'Выберите хотя бы один вариант', errContact: 'Укажите телефон или ник в Telegram'
  });
  Object.assign(BK.sr, {
    step1sub: 'Korak 1 od 4', step2sub: 'Korak 2 od 4 — izaberite datum i vreme', step3sub: 'Korak 3 od 4 — anketa',
    step4sub: 'Korak 4 od 4 — potvrda na Telegramu',
    moreTypes: 'Ostale vrste pregleda (kontrolni, ponovni)',
    nearest: 'Najbliži slobodan termin:', noSlots: 'Nema slobodnih termina u narednim nedeljama.',
    noTime: 'Nema odgovarajućeg termina? Pišite Ani — naći ćemo',
    errFill: 'Popunite ovo polje', errPick: 'Izaberite bar jednu opciju', errContact: 'Navedite telefon ili Telegram korisničko ime'
  });

  let moreOpen = false;
  function cardHtml(t){
    const loc = t[_lang] || t.ru;
    return '<div class="type-card" onclick="selectType(\'' + t.id + '\')"><div class="type-icon">' + t.icon + '</div><div style="flex:1"><div class="type-name">' + loc.name + '</div><div class="type-sub">' + loc.sub + '</div><div class="type-meta"><span class="type-dur">⏱ ' + loc.dur + '</span><span class="type-price">' + loc.price + '</span></div>' + typeExtraHtml(t) + '</div></div>';
  }
  window.renderTypes = function(){
    const box = document.getElementById('type-list'); if (!box) return;
    const main = TYPES_DATA.filter(t => MAIN.includes(t.id)).map(cardHtml).join('');
    const more = TYPES_DATA.filter(t => MORE.includes(t.id)).map(cardHtml).join('');
    box.innerHTML = main + (more ? '<div class="more-types"><button type="button" class="more-toggle' + (moreOpen ? ' open' : '') + '" onclick="toggleMoreTypes(this)">' + T('moreTypes') + ' <span class="chev">▾</span></button><div class="more-body" style="display:' + (moreOpen ? 'block' : 'none') + '">' + more + '</div></div>' : '');
  };
  window.toggleMoreTypes = function(btn){
    moreOpen = !moreOpen;
    btn.classList.toggle('open', moreOpen);
    btn.nextElementSibling.style.display = moreOpen ? 'block' : 'none';
  };

  // ── 2. Счётчик шагов ──
  function stepLabels(){
    const s = (id, k) => { const e = document.getElementById(id); if (e) e.textContent = T(k); };
    s('step1-sub', 'step1sub'); s('step2-sub', 'step2sub'); s('step3-sub', 'step3sub'); s('step4-sub', 'step4sub');
    const nt = document.getElementById('no-time-text'); if (nt) nt.textContent = T('noTime');
  }
  const _applyLang = applyLang;
  window.applyLang = function(){ _applyLang.apply(this, arguments); stepLabels(); renderNearest(); };

  // ── 3. Календарь: ближайший слот ──
  function firstSlot(){
    const list = getSlotsForType().slice().sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
    return list[0] || null;
  }
  function renderNearest(){
    const box = document.getElementById('nearest-box'); if (!box || !selectedType) return;
    const f = firstSlot();
    if (!f) { box.innerHTML = '<div class="nearest none">' + T('noSlots') + '</div>'; return; }
    const dt = new Date(f.date + 'T12:00:00');
    const label = dt.getDate() + ' ' + T('monthsG')[dt.getMonth()] + ', ' + T('daysFull')[dt.getDay()] + ', ' + f.start_time.substr(0, 5);
    box.innerHTML = '<div class="nearest">' + T('nearest') + ' <button type="button" onclick="pickNearest()">' + label + '</button></div>';
  }
  window.pickNearest = function(){
    const f = firstSlot(); if (!f) return;
    const dt = new Date(f.date + 'T12:00:00');
    calYear = dt.getFullYear(); calMonth = dt.getMonth();
    selectDate(f.date);
  };
  function jumpToFirst(){
    const f = firstSlot(); if (!f) return;
    const dt = new Date(f.date + 'T12:00:00');
    const now = new Date();
    const hasThisMonth = getSlotsForType().some(s => { const d = new Date(s.date + 'T12:00:00'); return d.getFullYear() === calYear && d.getMonth() === calMonth && s.date >= now.toISOString().split('T')[0]; });
    if (!hasThisMonth) { calYear = dt.getFullYear(); calMonth = dt.getMonth(); renderCalendar(); }
  }
  const _selectType = selectType;
  window.selectType = function(id){
    _selectType.apply(this, arguments);
    const t0 = Date.now();
    (function wait(){
      if (!allSlots.length && Date.now() - t0 < 6000) { setTimeout(wait, 200); return; }
      jumpToFirst(); renderNearest();
    })();
  };
  window.noTimeClick = function(){ try { blog('no_time_contact'); } catch (e) {} };

  // ── 4. Незаполненные поля: рамка + подпись до исправления ──
  const MSG = { '#f-tg': 'errContact', '#f-phone': 'errContact', '#ch-reason': 'errPick', '#ch-complaints': 'errPick', '#ch-correction': 'errPick', '#ch-eye': 'errPick', '#ch-general': 'errPick', '#ch-loads': 'errPick' };
  function clearErr(el){
    el.classList.remove('field-error');
    const m = el.parentNode && el.parentNode.querySelector(':scope > .err-msg[data-for="' + (el.id || 'x') + '"]');
    if (m) m.remove();
  }
  window.showFieldError = function(sel){
    const el = document.querySelector(sel); if (!el) return;
    el.classList.add('field-error');
    if (!sel.startsWith('#age-disc')) {
      const key = MSG[sel] || 'errFill';
      if (!el.id) el.id = 'fe-' + Math.random().toString(36).slice(2, 8);
      if (!el.parentNode.querySelector(':scope > .err-msg[data-for="' + el.id + '"]')) {
        el.insertAdjacentHTML('afterend', '<div class="err-msg" data-for="' + el.id + '">' + T(key) + '</div>');
      }
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { blog('form_error', { error_text: sel }); } catch (e) {}
  };
  function onFix(e){
    const t = e.target;
    const box = t.closest('.chips') || t.closest('.dob-row') || t;
    if (box.classList && box.classList.contains('field-error')) clearErr(box);
    if (t.id === 'f-tg' || t.id === 'f-phone') ['f-tg', 'f-phone'].forEach(id => { const x = document.getElementById(id); if (x) clearErr(x); });
  }
  document.addEventListener('input', onFix, true);
  document.addEventListener('change', onFix, true);
  document.addEventListener('click', e => { if (e.target.classList && e.target.classList.contains('chip')) onFix(e); }, true);
})();

/* ═══ 2026-11-18: запись только на будущее время, не позже чем за 10 минут до начала (время Белграда) ═══ */
(function(){
  const LEAD_MIN = 10;
  function nowBelgrade(){
    try{
      const p = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Belgrade',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
      const g = t => p.find(x => x.type === t).value;
      return new Date(g('year')+'-'+g('month')+'-'+g('day')+'T'+g('hour')+':'+g('minute')+':00');
    }catch(e){ return new Date(); }
  }
  function slotOk(date, time){
    return new Date(date + 'T' + String(time).substr(0,5) + ':00') - nowBelgrade() >= LEAD_MIN * 60000;
  }
  window.slotOk = slotOk;
  const _get = getSlotsForType;
  window.getSlotsForType = function(){ return _get.apply(this, arguments).filter(s => slotOk(s.date, s.start_time)); };
  Object.assign(BK.ru, { errLate: 'Это время уже недоступно — запись возможна не позже чем за 10 минут до начала. Выберите другое время.' });
  Object.assign(BK.sr, { errLate: 'Ovaj termin više nije dostupan — zakazivanje je moguće najkasnije 10 minuta pre početka. Izaberite drugo vreme.' });
  const _submit = submitBooking;
  window.submitBooking = async function(){
    if (selectedSlot && !slotOk(selectedSlot.date, selectedSlot.time)) {
      alert(T('errLate'));
      selectedSlot = null; selectedDateStr = null;
      document.getElementById('times-section').style.display = 'none';
      document.getElementById('btn-to-form').disabled = true;
      renderCalendar(); goPage('cal');
      return;
    }
    return _submit.apply(this, arguments);
  };
})();
