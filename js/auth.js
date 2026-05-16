// ═══ AUTH ═══
async function doLogin() {
  const pin = document.getElementById('pin-input').value.trim();
  const errEl = document.getElementById('login-err');
  if (!pin) { errEl.textContent = 'Введите PIN'; return; }
  errEl.textContent = 'Подключение...';
  if (db) {
    try {
      const { data: rows, error } = await db.from('settings').select('key,value').in('key',['admin_pin','staff_pin','ervin_pin']);
      if (!error && rows) {
        const m = {}; rows.forEach(r => m[r.key] = r.value);
        if (pin === (m.admin_pin||'1234')) { role='admin'; localStorage.setItem('crm_role','admin'); showApp(); return; }
        if (pin === (m.staff_pin||'0000')) { role='staff'; localStorage.setItem('crm_role','staff'); showApp(); return; }
        if (pin === (m.ervin_pin||'2222')) { role='ervin'; localStorage.setItem('crm_role','ervin'); showApp(); return; }
        errEl.textContent = 'Неверный PIN'; return;
      }
    } catch(e) { console.error(e); }
  }
  if (pin==='1234') { role='admin'; localStorage.setItem('crm_role','admin'); showApp(); return; }
  if (pin==='0000') { role='staff'; localStorage.setItem('crm_role','staff'); showApp(); return; }
  if (pin==='2222') { role='ervin'; localStorage.setItem('crm_role','ervin'); showApp(); return; }
  errEl.textContent = 'Неверный PIN';
}
function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('sb-role-label').textContent = role==='admin' ? 'Администратор' : 'Сотрудник';
  render();
}
function logout() { role=null; localStorage.removeItem('crm_role'); location.reload(); }
window.onload = () => {
  const s = localStorage.getItem('crm_role');
  if (s === 'ervin') { role = 'ervin'; showApp(); return; }
  if (s) { role=s; showApp(); } else document.getElementById('login-screen').style.display='flex';
};
