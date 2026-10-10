// ═══ HELPERS ═══
const fmt = d => { if(!d)return'—'; const[y,m,dd]=d.split('-'); return`${dd}.${m}.${y}`; };
const fmtMoney = n => (+n||0).toLocaleString('ru-RU')+' дин.';
const initials = n => (n||'?').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
const today = () => new Date().toISOString().split('T')[0];
const addMonths = (d,m) => { const dt=new Date(d); dt.setMonth(dt.getMonth()+m); return dt.toISOString().split('T')[0]; };
// orderTotal учитывает lens_qty (по умолчанию 2)
const orderTotal = o => (+o.frame_price||0) + (+o.lens_price||0)*(+(o.lens_qty)||2) + (+o.work_price||0);
const orderBalance = o => orderTotal(o)-(+o.prepayment||0);
const isAdmin = () => role==='admin';
const isErvin = () => role==='ervin';
const canEdit = () => role==='admin' || role==='ervin';
const MONTHS_GEN_RU = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const DAYS_FULL = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
const fmtDateLong = d => { if(!d)return'—'; const dt=new Date(d+'T12:00:00'); const mg=typeof t==='function'?t('months_gen'):MONTHS_GEN_RU; const df=typeof t==='function'?t('days_full'):DAYS_FULL; return`${dt.getDate()} ${mg[dt.getMonth()]}, ${df[dt.getDay()]}`; };
const apptDurText = type => { const t=APPT_TYPES.find(a=>a.name===type); const m=t?.duration||60; return m>=60?`${m/60} час`:`${m} минут`; };
const markOrderReady = id => updateOrderStatus(id,'готов'); // alias
const minToTime = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const timeToMin = s => { if(!s)return 0; const[h,m]=(s.substr(0,5)).split(':').map(Number); return h*60+(m||0); };
const calcAge = dob => { if(!dob)return null; const b=new Date(dob),n=new Date(); let a=n.getFullYear()-b.getFullYear(); if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))a--; return a; };
const v = id => (document.getElementById(id)?.value||'').trim();
const checked = id => document.getElementById(id)?.checked;
const DOW_RU = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const DOW = new Proxy({}, {get:(_,i)=>(typeof t==='function'?t('dow'):DOW_RU)[i]});
const MONTH_RU = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
const MONTH_LABELS = new Proxy({}, {get:(_,i)=>(typeof t==='function'?t('months'):MONTH_RU)[i]});
// ═══ ДАТА С ТОЧНОСТЬЮ: точная дата / только год / неизвестна (как в ginter-crm) ═══
// В БД: колонка даты + колонка *_prec ('day' | 'year' | 'unknown').
// 'year' → дата хранится как YYYY-01-01; 'unknown' → дата null.
// В форме: dpHtml(id, date, prec) — поле даты + переключатель; dpGet(id) → {date, prec, ok}.
// Кнопки переключателя не входят в Enter-цепочку (tabindex=-1).
function fmtP(date, prec) {
  if (prec === 'unknown') return t('dp_unknown_label');
  if (prec === 'year') return date ? date.slice(0,4) + t('dp_year_suffix') : t('dp_unknown_label');
  return fmt(date);
}
function dpHtml(id, date, prec, extra) {
  prec = prec || 'day';
  const btn = (p, l, tt) => '<button type="button" tabindex="-1" data-prec="'+p+'" title="'+t(tt)+'"'+(p===prec?' class="active"':'')+
    ' onmousedown="event.preventDefault()" onclick="dpSet(\''+id+'\',\''+p+'\',true)">'+t(l)+'</button>';
  return '<div class="date-prec" data-dp="'+id+'">'+
    '<input type="date" id="'+id+'" data-prec="'+prec+'" value="'+(prec==='day' ? (date||'') : '')+'"'+(prec!=='day'?' style="display:none"':'')+(extra||'')+'>'+
    '<input type="number" id="'+id+'-year" class="date-year" min="1950" max="2100" placeholder="'+t('dp_year_ph')+'" value="'+(prec==='year'&&date?date.slice(0,4):'')+'"'+(prec!=='year'?' style="display:none"':'')+'>'+
    '<span class="date-none" id="'+id+'-none"'+(prec!=='unknown'?' style="display:none"':'')+'>'+t('dp_none')+'</span>'+
    '<span class="date-prec-toggle">'+btn('day','dp_day','dp_day_t')+btn('year','dp_year','dp_year_t')+btn('unknown','dp_unknown','dp_unknown_t')+'</span>'+
  '</div>';
}
function dpSet(id, prec, focus) {
  const el = document.getElementById(id); if (!el) return;
  const year = document.getElementById(id+'-year');
  if (prec === 'year' && !year.value && el.value) year.value = el.value.slice(0,4);
  if (prec === 'day' && !el.value && year.value) el.value = year.value+'-01-01';
  el.dataset.prec = prec;
  el.style.display = prec === 'day' ? '' : 'none';
  year.style.display = prec === 'year' ? '' : 'none';
  document.getElementById(id+'-none').style.display = prec === 'unknown' ? '' : 'none';
  el.parentNode.querySelectorAll('.date-prec-toggle button').forEach(b => b.classList.toggle('active', b.dataset.prec === prec));
  if (typeof _modalDirty !== 'undefined') _modalDirty = true;
  if (focus) { const f = prec === 'day' ? el : prec === 'year' ? year : null; if (f) { f.focus(); if (f.select) f.select(); } }
}
// Записать значение в уже отрисованное поле (date — строка ISO или null).
function dpPut(id, date, prec) {
  const el = document.getElementById(id); if (!el) return;
  prec = prec || 'day';
  el.value = prec === 'day' ? (date||'') : '';
  document.getElementById(id+'-year').value = prec === 'year' && date ? date.slice(0,4) : '';
  dpSet(id, prec);
}
function dpGet(id, fallbackToday) {
  const el = document.getElementById(id);
  const prec = el?.dataset.prec || 'day';
  if (prec === 'unknown') return {date:null, prec, ok:true};
  if (prec === 'year') {
    const y = parseInt(document.getElementById(id+'-year').value, 10);
    if (!(y >= 1950 && y <= 2100)) return {date:null, prec, ok:false};
    return {date: y+'-01-01', prec, ok:true};
  }
  return {date: (el && el.value) || (fallbackToday===false ? null : today()), prec:'day', ok:true};
}
// Дата обследования: exam_date, для старых записей — дата внесения.
const examDate = e => (e && (e.exam_date || (e.created_at||'').split('T')[0])) || '';
const fmtExamDate = e => fmtP(examDate(e), (e && e.exam_date_prec) || 'day');
// Дата первого посещения пациента: first_visit_date, иначе дата внесения в базу.
const patientFirstVisit = p => (p && (p.first_visit_date || (p.created_at||'').split('T')[0])) || '';
const fmtFirstVisit = p => fmtP(patientFirstVisit(p), (p && p.first_visit_date_prec) || 'day');
// Дата заказа: order_date, иначе дата внесения.
const orderDateOf = o => (o && (o.order_date || (o.order_date_prec==='unknown' ? '' : (o.created_at||'').split('T')[0]))) || '';
const fmtOrderDate = o => fmtP(orderDateOf(o), o && o.order_date_prec);
// Дата, переходящая по цепочке «новый пациент → карта → заказ» (как pendingQuickAddDate в ginter-crm).
let _pendingChainDate = null; // {pid, date, prec}

// ═══ TOAST ═══
function toast(msg, type='success') {
  const t=document.getElementById('toast');
  const d=document.createElement('div');
  const colors={success:'#047857',error:'#B91C1C',info:'var(--accent)'};
  d.className='toast-msg';
  d.style.background=colors[type]||colors.success;
  d.style.color='#fff';
  d.textContent=msg;
  t.appendChild(d);
  setTimeout(()=>d.remove(),3200);
}
// ═══ MODAL ═══
function openModal(html) {
  document.getElementById('modal-container').innerHTML = html;
  document.getElementById('overlay').classList.remove('hidden');
  _modalDirty = false;
  setTimeout(()=>{
    document.querySelectorAll('#modal-container input,#modal-container select,#modal-container textarea').forEach(el=>{
      el.addEventListener('input',()=>_modalDirty=true);
      el.addEventListener('change',()=>_modalDirty=true);
    });
    initEnterNavigation();
  },200);
}
// ═══ ENTER → следующее поле ═══
// Один делегированный обработчик на документ — работает для ЛЮБОГО содержимого
// #modal-container, включая блоки, перерисованные через innerHTML после открытия
// (карта обследования, «Используемая коррекция», форма заказа и т.п.).
// • Enter в input/select → следующее видимое поле; с последнего поля → кнопка «Сохранить».
// • data-enter-jump="save" на поле → сразу на кнопку «Сохранить».
// • Textarea: Enter = перенос строки, Ctrl/Cmd+Enter → следующее поле.
// • Ctrl/Cmd+S в модалке → кнопка [data-hotkey-save] (или основная кнопка подвала).
// • Esc → закрыть модалку (с подтверждением, если есть несохранённые изменения).
function _modalFields(root){
  return Array.from(root.querySelectorAll('input, select, textarea'))
    .filter(f => f.type !== 'hidden' && f.type !== 'file' && !f.disabled && !f.readOnly && f.offsetParent !== null && f.tabIndex !== -1);
}
function _modalSaveBtn(root){
  return root.querySelector('[data-hotkey-save]') || root.querySelector('.modal-footer .btn-accent') || root.querySelector('.modal-footer .btn-primary');
}
let _enterNavInstalled = false;
function initEnterNavigation() {
  if (_enterNavInstalled) return;
  _enterNavInstalled = true;
  document.addEventListener('keydown', e => {
    const root = document.getElementById('modal-container');
    const overlay = document.getElementById('overlay');
    const modalOpen = root && overlay && !overlay.classList.contains('hidden');
    if (!modalOpen) return;
    const el = e.target;
    // Esc — закрыть
    if (e.key === 'Escape') {
      if (el && el.tagName === 'SELECT') return;
      e.preventDefault();
      if (!_modalDirty || confirm(typeof t==='function'?t('close_unsaved'):'Закрыть без сохранения?')) closeModal();
      return;
    }
    // Ctrl/Cmd+S — сохранить
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы')) {
      const btn = _modalSaveBtn(root);
      if (btn) { e.preventDefault(); btn.click(); }
      return;
    }
    if (e.key !== 'Enter' || !root.contains(el)) return;
    const tag = el.tagName;
    if (tag === 'TEXTAREA' && !(e.ctrlKey || e.metaKey)) return;
    if (tag !== 'INPUT' && tag !== 'SELECT' && tag !== 'TEXTAREA') return;
    if (tag === 'INPUT' && (el.type === 'button' || el.type === 'submit')) return;
    e.preventDefault();
    if (el.dataset.enterJump === 'save') {
      const saveBtn = root.querySelector('.modal-footer .btn-accent');
      if (saveBtn) { saveBtn.focus(); return; }
    }
    const fields = _modalFields(root);
    const next = fields[fields.indexOf(el) + 1];
    if (next) {
      next.focus();
      if (typeof next.select === 'function' && next.tagName === 'INPUT' && next.type !== 'checkbox' && next.type !== 'radio' && next.type !== 'date') next.select();
    } else {
      // Последнее поле вкладки → следующая вкладка (карта обследования), иначе — «Сохранить»
      const nextTab = root.querySelector('.tab-bar .tab.active')?.nextElementSibling;
      if (nextTab && nextTab.classList.contains('tab') && el.closest('.tab-content')) {
        nextTab.click();
        setTimeout(() => {
          const pane = root.querySelector('.tab-content.active');
          const first = pane && _modalFields(pane)[0];
          if (first) { first.focus(); if (first.tagName==='INPUT' && typeof first.select==='function') first.select(); }
        }, 30);
        return;
      }
      const btn = _modalSaveBtn(root);
      if (btn) btn.focus();
    }
  });
}
initEnterNavigation();
function closeModal() { _modalDirty=false; if(_autosaveTimer){clearInterval(_autosaveTimer);_autosaveTimer=null;} document.getElementById('overlay').classList.add('hidden'); }
function overlayClick(e) {
  if(e.target===document.getElementById('overlay')) {
    if(confirm(typeof t==='function'?t('close_unsaved'):'Закрыть?')) closeModal();
  }
}

// ═══ TELEGRAM-НИК рядом с именем пациента ═══
// tgNick('@anna_x') → 'anna_x'; tgTag(username) → кликабельный @ник (t.me) или '' если ника нет.
// {link:false} — без ссылки (для строк списка, где клик открывает карточку).
function tgNick(u) {
  return String(u || '').trim().replace(/^https?:\/\/t\.me\//i, '').replace(/^@+/, '').replace(/[^A-Za-z0-9_]/g, '');
}
function tgTag(u, opts) {
  const n = tgNick(u); if (!n) return '';
  if (opts && opts.link === false) return '<span class="tg-nick">@' + n + '</span>';
  return '<a class="tg-nick" href="https://t.me/' + n + '" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Telegram">@' + n + '</a>';
}
// Имя + ник одной строкой для <option> и заголовков без HTML
function nameWithNick(name, u) { const n = tgNick(u); return (name || '—') + (n ? '  · @' + n : ''); }

// ═══ ВЫПАДАЮЩЕЕ МЕНЮ «⋯» (Изменить / Удалить / …) ═══
// ddMenu([{label, fn, danger, hide}], btnLabel) → кнопка; меню открывается поверх всего
// (position:fixed), поэтому не обрезается прокручиваемыми панелями и таблицами.
function ddMenu(items, btnLabel, btnClass) {
  const list = (items || []).filter(i => i && !i.hide);
  if (!list.length) return '';
  const html = list.map(i =>
    '<button type="button" class="dd-item' + (i.danger ? ' dd-danger' : '') + '" onclick="ddClose();' + String(i.fn).replace(/"/g, '&quot;') + '">' + i.label + '</button>'
  ).join('');
  return '<span class="dd"><button type="button" class="btn ' + (btnClass || 'btn-ghost btn-sm') + ' dd-toggle" onclick="ddToggle(event,this)" aria-label="Меню">' + (btnLabel || '⋯') + '</button><span class="dd-menu">' + html + '</span></span>';
}
function ddClose() {
  document.querySelectorAll('.dd-menu.open').forEach(m => { m.classList.remove('open'); m.style.cssText = ''; });
}
function ddToggle(e, btn) {
  e.stopPropagation();
  const menu = btn.nextElementSibling;
  const wasOpen = menu.classList.contains('open');
  ddClose();
  if (wasOpen) return;
  menu.classList.add('open');
  const r = btn.getBoundingClientRect();
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  let left = r.right - mw; if (left < 8) left = 8;
  let top = r.bottom + 4; if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
  menu.style.left = left + 'px'; menu.style.top = top + 'px';
}
document.addEventListener('click', ddClose);
window.addEventListener('resize', ddClose);
document.addEventListener('scroll', ddClose, true);
