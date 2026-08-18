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
// В модалках нет тега <form> (модалки — просто div-ы), поэтому работаем
// по всем полям внутри #modal-container в DOM-порядке.
// Textarea и кнопки не трогаем — Enter в textarea должен давать перенос строки.
function initEnterNavigation() {
  const root = document.getElementById('modal-container');
  if (!root) return;
  root.querySelectorAll('input, select').forEach(el => {
    if (el.dataset.enterBound) return;
    el.dataset.enterBound = '1';
    el.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (el.dataset.enterJump === 'save') {
        const saveBtn = root.querySelector('.modal-footer .btn-accent');
        if (saveBtn) { saveBtn.focus(); return; }
      }
      const fields = Array.from(root.querySelectorAll('input, select, textarea'))
        .filter(f => f.type !== 'hidden' && !f.disabled && f.offsetParent !== null);
      const idx = fields.indexOf(el);
      const next = fields[idx + 1];
      if (next) {
        next.focus();
        if (typeof next.select === 'function') next.select();
      }
    });
  });
}
function closeModal() { _modalDirty=false; if(_autosaveTimer){clearInterval(_autosaveTimer);_autosaveTimer=null;} document.getElementById('overlay').classList.add('hidden'); }
function overlayClick(e) {
  if(e.target===document.getElementById('overlay')) {
    if(confirm(typeof t==='function'?t('close_unsaved'):'Закрыть?')) closeModal();
  }
}
