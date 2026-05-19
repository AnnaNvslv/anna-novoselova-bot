// ═══ AUTH ═══
async function doLogin() {
  const pin = document.getElementById('pin-input').value.trim();
  const errEl = document.getElementById('login-err');
  if (!pin) { errEl.textContent = 'Unesite PIN / Введите PIN'; return; }
  errEl.textContent = 'Povezivanje...';
  if (db) {
    try {
      const { data: rows, error } = await db.from('settings').select('key,value').in('key',['admin_pin','staff_pin','ervin_pin']);
      if (!error && rows) {
        const m = {}; rows.forEach(r => m[r.key] = r.value);
        if (pin === (m.admin_pin||'1234')) { role='admin'; localStorage.setItem('crm_role','admin'); showApp(); return; }
        if (pin === (m.staff_pin||'0000')) { role='staff'; localStorage.setItem('crm_role','staff'); showApp(); return; }
        if (pin === (m.ervin_pin||'2222')) { role='ervin'; localStorage.setItem('crm_role','ervin'); showApp(); return; }
        errEl.textContent = 'Pogrešan PIN'; return;
      }
    } catch(e) { console.error(e); }
  }
  if (pin==='1234') { role='admin'; localStorage.setItem('crm_role','admin'); showApp(); return; }
  if (pin==='0000') { role='staff'; localStorage.setItem('crm_role','staff'); showApp(); return; }
  if (pin==='2222') { role='ervin'; localStorage.setItem('crm_role','ervin'); showApp(); return; }
  errEl.textContent = 'Pogrešan PIN';
}
function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  const mn = document.getElementById('mobile-nav');
  if (mn && window.innerWidth <= 768) mn.style.display = 'flex';
  const saved=localStorage.getItem('crm_section');
  if(saved&&saved!=='trash'){curSection=saved;}
  document.getElementById('sb-role-label').textContent = t(`role_${role}`) || role;
  document.querySelectorAll('.sb-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('nav-'+curSection)?.classList.add('active');
  _refreshStaticUI();
  const ervinHide=['appointments','orders','analytics','settings','trash'];
  ervinHide.forEach(s=>{
    const el=document.getElementById('nav-'+s);
    if(el) el.style.display=isErvin()?'none':'';
  });
  document.querySelectorAll('.lang-btn').forEach(b=>{
    b.style.fontWeight=b.dataset.lang===_lang?'800':'400';
    b.style.color=b.dataset.lang===_lang?'white':'rgba(255,255,255,.5)';
  });
  if(typeof _mobActive==='function') _mobActive();
  render();
}
function logout() { role=null; localStorage.removeItem('crm_role'); location.reload(); }
window.onload = () => {
  // Убить лишние fixed-bottom элементы от старого mobile.js
  document.querySelectorAll('body > div').forEach(function(el) {
    if (el.id !== 'mobile-nav' && el.id !== 'mob-drawer-overlay' && el.id !== 'mob-drawer' &&
        el.id !== 'login-screen' && el.id !== 'app' && el.id !== 'overlay' &&
        el.id !== 'print-area' && el.id !== 'toast') {
      var s = window.getComputedStyle(el);
      if (s.position === 'fixed' && s.bottom === '0px') { el.remove(); }
    }
  });
  const s = localStorage.getItem('crm_role');
  if (s === 'ervin') { role = 'ervin'; showApp(); return; }
  if (s) { role=s; showApp(); } else document.getElementById('login-screen').style.display='flex';
};
