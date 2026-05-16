// ═══ SETTINGS ═══
async function renderSettings() {
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>Настройки</h1></div><div class="content"><div class="spinner">Загрузка...</div></div>`;
  const{data:rows}=await db.from('settings').select('key,value');
  const s={}; (rows||[]).forEach(r=>s[r.key]=r.value);
  document.querySelector('.content').innerHTML=`
    <div class="two-col">
      <div>
        <div class="card mb-12">
          <div class="card-header"><span class="card-title">🔧 Основное</span></div>
          <div class="form-grid">
            <div class="form-group"><label>Имя врача</label><input id="s-dname" value="${s.doctor_name||''}"></div>
            <div class="form-group"><label>Название клиники</label><input id="s-cname" value="${s.clinic_name||''}"></div>
          </div>
          <button class="btn btn-primary mt-12" onclick="saveSettings()">Сохранить</button>
        </div>
        ${isAdmin()?`<div class="card mb-12">
          <div class="card-header"><span class="card-title">🔐 PIN-коды</span></div>
          <div class="form-grid">
            <div class="form-group"><label>PIN администратора</label><input type="password" id="s-apin" value="${s.admin_pin||''}"></div>
            <div class="form-group"><label>PIN сотрудника</label><input type="password" id="s-spin" value="${s.staff_pin||''}"></div>
          </div>
          <button class="btn btn-primary mt-12" onclick="savePins()">Обновить PIN</button>
        </div>`:''}
        <div class="card">
          <div class="card-header"><span class="card-title">📤 Данные</span></div>
          <button class="btn btn-ghost btn-sm" onclick="exportAll()">⬇ Экспорт JSON</button>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">✈️ Telegram-бот</span></div>
        <div class="tg-info">
          <b>Как настроить:</b>
          <ol class="step-list" style="margin-top:8px">
            <li>Напишите <code>@BotFather</code> → <code>/newbot</code> → получите токен</li>
            <li>Вставьте токен ниже и сохраните</li>
            <li>Пациент пишет боту <code>/start</code></li>
            <li>Нажмите «Найти Chat ID» → скопируйте ID в карточку пациента</li>
          </ol>
        </div>
        <div class="form-group mt-12"><label>Токен бота</label><input id="s-token" value="${s.bot_token||''}" placeholder="123456789:AAH..."></div>
        <div class="form-group mt-8"><label>Имя бота (@username) — для страницы записи</label><input id="s-botname" value="${s.bot_username||''}" placeholder="@NazvanieVashegoBot"></div>
        <div class="form-group mt-8"><label>Мой Chat ID (для тестов)</label><input id="s-mychat" value="${s.my_chat_id||''}"></div>
        <div class="flex gap-8 mt-12">
          <button class="btn btn-primary" onclick="saveTg()">Сохранить</button>
          <button class="btn btn-ghost" onclick="testTg()">Тест</button>
          <button class="btn btn-ghost" onclick="openChatIdHelper()">Найти Chat ID</button>
        </div>
      </div>
    </div>`;
}
async function saveSettings(){await Promise.all([db.from('settings').upsert({key:'doctor_name',value:v('s-dname')}),db.from('settings').upsert({key:'clinic_name',value:v('s-cname')})]);toast('Сохранено');}
async function savePins(){await Promise.all([db.from('settings').upsert({key:'admin_pin',value:v('s-apin')}),db.from('settings').upsert({key:'staff_pin',value:v('s-spin')})]);toast('PIN обновлён');}
async function saveTg(){await Promise.all([db.from('settings').upsert({key:'bot_token',value:v('s-token')}),db.from('settings').upsert({key:'bot_username',value:v('s-botname')}),db.from('settings').upsert({key:'my_chat_id',value:v('s-mychat')})]);toast('Токен сохранён');}
async function testTg(){const{data:ch}=await db.from('settings').select('value').eq('key','my_chat_id').single();const ok=await tgSend(ch?.value,'✅ Тест CRM Гинтер Оптика');toast(ok?'📨 Отправлено!':'Ошибка — проверь токен',ok?'success':'error');}
async function openChatIdHelper(){
  openModal(`<div class="modal"><div class="modal-header"><span class="modal-title">Найти Telegram Chat ID</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="tg-info">Пациент должен написать вашему боту <code>/start</code>, затем нажмите кнопку ниже.</div>
      <button class="btn btn-accent mt-12" onclick="loadTgUpdates()">🔍 Загрузить контакты</button>
      <div id="tg-updates" class="mt-12"></div>
    </div></div>`);
}
async function loadTgUpdates(){
  document.getElementById('tg-updates').innerHTML='Загрузка...';
  const token=await getBotToken();if(!token){document.getElementById('tg-updates').innerHTML='<span style="color:var(--red)">Нет токена</span>';return;}
  const r=await fetch(`https://api.telegram.org/bot${token}/getUpdates`);const data=await r.json();
  if(!data.ok||!data.result?.length){document.getElementById('tg-updates').innerHTML='Нет сообщений — попросите пациента написать /start';return;}
  const seen=new Set();
  const rows=data.result.reverse().filter(m=>{const id=m.message?.from?.id;if(seen.has(id))return false;seen.add(id);return true;}).map(m=>{
    const f=m.message?.from||{};
    return`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface2);border-radius:8px;margin-bottom:6px">
      <div><b>${[f.first_name,f.last_name].filter(Boolean).join(' ')||'—'}</b>${f.username?` @${f.username}`:''}<br><code style="font-size:12px">${f.id}</code></div>
      <button class="btn btn-accent btn-sm" onclick="navigator.clipboard.writeText('${f.id}');toast('Скопировано!')">Копировать</button>
    </div>`;
  }).join('');
  document.getElementById('tg-updates').innerHTML=rows||'Нет данных';
}
