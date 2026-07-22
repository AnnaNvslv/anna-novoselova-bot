// === AUTH (Supabase Auth, email+пароль) ===
let _displayName = '';

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-err');
  if (!email || !password) { errEl.textContent = 'Введите email и пароль'; return; }
  errEl.textContent = 'Povezivanje...';
  if (!db) { errEl.textContent = 'Ошибка подключения к базе'; return; }
  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error || !data?.user) { errEl.textContent = 'Неверный email или пароль'; return; }
    await _loadRole(data.user.id);
    showApp();
  } catch (e) {
    console.error(e);
    errEl.textContent = 'Ошибка входа';
  }
}

async function _loadRole(userId) {
  try {
    const { data: r, error } = await db.from('user_roles').select('role,display_name').eq('user_id', userId).single();
    if (!error && r) { role = r.role; _displayName = r.display_name; return; }
  } catch (e) { console.error(e); }
  role = 'staff'; _displayName = '';
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  // mobile-nav управляется только CSS media query — не трогаем style.display
  const saved=localStorage.getItem('crm_section');
  if(saved&&saved!=='trash'){curSection=saved;}
  document.getElementById('sb-role-label').textContent = _displayName || t('role_'+role) || role;
  document.querySelectorAll('.sb-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('nav-'+curSection)?.classList.add('active');
  _refreshStaticUI();
  const ervinHide=['appointments','orders','analytics','settings','trash'];
  ervinHide.forEach(s=>{
    const el=document.getElementById('nav-'+s);
    if(el) el.style.display=isErvin()?'none':'';
    // скрыть и в мобильном навбаре
    const mob=document.getElementById('mob-nav-'+s);
    if(mob) mob.style.display=isErvin()?'none':'';
  });
  document.querySelectorAll('.lang-btn').forEach(b=>{
    b.style.fontWeight=b.dataset.lang===_lang?'800':'400';
    b.style.color=b.dataset.lang===_lang?'white':'rgba(255,255,255,.5)';
  });
  if(typeof _mobActive==='function') _mobActive();

  // === DEEPLINK: открыть профиль пациента по хэшу #patient=ID ===
  const hash = window.location.hash;
  if (hash && hash.startsWith('#patient=')) {
    const pid = hash.replace('#patient=', '');
    if (pid) {
      history.replaceState(null, '', window.location.pathname);
      render();
      setTimeout(() => openPatientCard(pid), 300);
      return;
    }
  }

  render();
}
function logout() {
  if (db) db.auth.signOut();
  role=null;
  localStorage.removeItem('crm_section');
  location.reload();
}
window.onload = async () => {
  if (!db) { document.getElementById('login-screen').style.display='flex'; return; }
  try {
    const { data } = await db.auth.getSession();
    if (data?.session?.user) {
      await _loadRole(data.session.user.id);
      showApp();
      return;
    }
  } catch (e) { console.error(e); }
  document.getElementById('login-screen').style.display='flex';
};
