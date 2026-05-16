// ═══ HELPERS ═══
const fmt = d => { if(!d)return'—'; const[y,m,dd]=d.split('-'); return`${dd}.${m}.${y}`; };
const fmtMoney = n => (+n||0).toLocaleString('ru-RU')+' дин.';
const initials = n => (n||'?').split(' ').slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
const today = () => new Date().toISOString().split('T')[0];
const addMonths = (d,m) => { const dt=new Date(d); dt.setMonth(dt.getMonth()+m); return dt.toISOString().split('T')[0]; };
const orderTotal = o => (+o.frame_price||0)+(+o.lens_price||0)*2+(+o.work_price||0);
const orderBalance = o => orderTotal(o)-(+o.prepayment||0);
const isAdmin = () => role==='admin';
const isErvin = () => role==='ervin';
const canEdit = () => role==='admin' || role==='ervin';
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const DAYS_FULL = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
const fmtDateLong = d => { if(!d)return'—'; const dt=new Date(d+'T12:00:00'); return`${dt.getDate()} ${MONTHS_GEN[dt.getMonth()]}, ${DAYS_FULL[dt.getDay()]}`; };
const apptDurText = type => { const t=APPT_TYPES.find(a=>a.name===type); const m=t?.duration||60; return m>=60?`${m/60} час`:`${m} минут`; };
const markOrderReady = id => updateOrderStatus(id,'готов'); // alias
const minToTime = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
const calcAge = dob => { if(!dob)return null; const b=new Date(dob),n=new Date(); let a=n.getFullYear()-b.getFullYear(); if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))a--; return a; };
const v = id => (document.getElementById(id)?.value||'').trim();
const checked = id => document.getElementById(id)?.checked;
const DOW = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const MONTH_RU = ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
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
  },200);
}
function closeModal() { _modalDirty=false; if(_autosaveTimer){clearInterval(_autosaveTimer);_autosaveTimer=null;} document.getElementById('overlay').classList.add('hidden'); }
function overlayClick(e) {
  if(e.target===document.getElementById('overlay')) {
    if(confirm('Закрыть окно?')) closeModal();
  }
}
