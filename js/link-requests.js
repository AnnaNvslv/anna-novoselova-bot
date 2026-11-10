// ═══ ПРИВЯЗКА КЛИЕНТОВ К БОТУ + УВЕДОМЛЕНИЕ БЕЗ БОТА (Viber / WhatsApp) ═══
// 1) «Ждут привязки»: клиент написал боту имя или поделился номером, которого нет в CRM → bot_link_requests.
//    Окно показывается при входе в CRM (пока есть необработанные), в сводке заказов и по кнопке.
// 2) Заказ оформлен / «Готов», а у клиента нет Telegram-привязки → окно-подсказка: QR-карточка, Viber, WhatsApp.
const BOT_ORDER_LINK = 'https://t.me/optometrist_novoselova_bot?start=order';
const _lrSr = () => _lang === 'sr';
const _lrEsc = v => (typeof _escH === 'function' ? _escH(v) : String(v ?? ''));
const _lrDigits = s => String(s || '').replace(/\D/g, '');

async function linkRequestsMaybe() {
  try {
    if (!isAdmin()) return;
    const {count} = await db.from('bot_link_requests').select('id', {count:'exact', head:true}).is('resolved_at', null);
    if (!count) return;
    const key = 'crm_lr_shown';
    if (sessionStorage.getItem(key) === String(count)) return;
    sessionStorage.setItem(key, String(count));
    openLinkRequests();
  } catch (e) { console.error('linkRequests', e); }
}

async function openLinkRequests() {
  const sr = _lrSr();
  const {data, error} = await db.from('bot_link_requests').select('*').is('resolved_at', null).order('created_at');
  if (error) { toast(t('error')+': '+error.message, 'error'); return; }
  const rows = data || [];
  const body = rows.length ? rows.map(r => {
    const who = [r.tg_name, r.username ? '@'+r.username : ''].filter(Boolean).join(' · ') || '—';
    const when = new Date(r.created_at).toLocaleString(sr ? 'sr-Latn' : 'ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
    const q = r.phone ? _lrDigits(r.phone).slice(-8) : (r.message || r.tg_name || '');
    return '<div class="lr-item" style="padding:12px 0;border-bottom:1px solid var(--border)">'+
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div>'+
        '<div style="font-weight:700">'+_lrEsc(who)+'</div>'+
        (r.message ? '<div class="text-sm">'+(sr?'Napisao: ':'Написал: ')+'«'+_lrEsc(r.message)+'»</div>' : '')+
        (r.phone ? '<div class="text-sm">'+(sr?'Telefon (nije u CRM): ':'Телефон (нет в CRM): ')+_lrEsc(r.phone)+'</div>' : '')+
        '<div class="text-sm text-m">'+when+'</div>'+
      '</div><button class="btn btn-ghost btn-sm" onclick="_lrDismiss(\''+r.id+'\')">'+(sr?'Odbaci':'Отклонить')+'</button></div>'+
      '<input class="lr-q" style="margin-top:8px;width:100%" placeholder="'+(sr?'Pretraga pacijenta: ime ili telefon':'Поиск пациента: имя или телефон')+'" value="'+_lrEsc(q)+'" oninput="_lrSearch(\''+r.id+'\',this.value)">'+
      '<div id="lr-res-'+r.id+'" style="margin-top:6px"></div>'+
    '</div>';
  }).join('') : '<div class="text-m">'+(sr?'Nema zahteva.':'Нет запросов.')+'</div>';
  openModal('<div class="modal modal-lg"><div class="modal-header"><span class="modal-title">🔗 '+(sr?'Čekaju povezivanje sa botom':'Ждут привязки к боту')+': '+rows.length+'</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body"><div class="text-sm text-m" style="margin-bottom:6px">'+(sr
      ? 'Ovi klijenti su pisali botu, ali ih bot nije našao u CRM. Pronađite pacijenta i kliknite „Poveži" — klijent će dobijati obaveštenja o porudžbinama.'
      : 'Эти клиенты написали боту, но бот не нашёл их в CRM. Найдите пациента и нажмите «Привязать» — клиент начнёт получать уведомления о заказах.')+'</div>'+body+'</div>'+
    '<div class="modal-footer"><button class="btn btn-accent" onclick="closeModal()">OK</button></div></div>');
  rows.forEach(r => { const inp = document.querySelector('#lr-res-'+r.id); if (inp) _lrSearch(r.id, inp.previousElementSibling.value); });
}

let _lrTimers = {};
function _lrSearch(reqId, q) {
  clearTimeout(_lrTimers[reqId]);
  _lrTimers[reqId] = setTimeout(async () => {
    const box = document.getElementById('lr-res-'+reqId); if (!box) return;
    q = String(q || '').trim();
    if (q.length < 2) { box.innerHTML = ''; return; }
    const digits = _lrDigits(q);
    let res = [];
    if (digits.length >= 6) {
      const {data} = await db.from('patients').select('id,name,phone,telegram_chat_id').is('deleted_at', null).ilike('phone', '%'+digits.slice(-2)+'%').limit(1000);
      const key = digits.slice(-8);
      res = (data || []).filter(p => _lrDigits(p.phone).includes(key)).slice(0, 8);
    } else {
      const words = q.replace(/[,.@]/g, ' ').split(/\s+/).filter(w => w.length >= 2).slice(0, 3);
      if (!words.length) { box.innerHTML = ''; return; }
      let qb = db.from('patients').select('id,name,phone,telegram_chat_id').is('deleted_at', null);
      words.forEach(w => { qb = qb.ilike('name', '%'+w+'%'); });
      const {data} = await qb.limit(8);
      res = data || [];
      if (!res.length && words.length > 1) {
        const {data:d2} = await db.from('patients').select('id,name,phone,telegram_chat_id').is('deleted_at', null).ilike('name', '%'+words[0]+'%').limit(8);
        res = d2 || [];
      }
    }
    const sr = _lrSr();
    box.innerHTML = res.length ? res.map(p =>
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 0">'+
        '<div><b>'+_lrEsc(p.name)+'</b>'+(p.phone?' <span class="text-sm text-m">'+_lrEsc(p.phone)+'</span>':'')+(p.telegram_chat_id?' <span class="badge badge-gray">'+(sr?'već povezan':'уже привязан')+'</span>':'')+'</div>'+
        '<button class="btn btn-accent btn-sm" onclick="_lrLink(\''+reqId+'\',\''+p.id+'\')">'+(sr?'Poveži':'Привязать')+'</button></div>').join('')
      : '<div class="text-sm text-m">'+(sr?'Nije pronađeno':'Не найдено')+'</div>';
  }, 300);
}

async function _lrLink(reqId, patientId) {
  const sr = _lrSr();
  const {data:r} = await db.from('bot_link_requests').select('*').eq('id', reqId).single();
  if (!r) return;
  const upd = {telegram_chat_id: r.chat_id, notify_off: false};
  if (r.username) upd.telegram_username = '@' + r.username;
  const {error} = await db.from('patients').update(upd).eq('id', patientId);
  if (error) { toast(t('error')+': '+error.message, 'error'); return; }
  await db.from('bot_link_requests').update({resolved_at: new Date().toISOString(), patient_id: patientId}).eq('id', reqId);
  await tgSend(r.chat_id, '✅ Готово! Теперь сюда будут приходить уведомления о ваших заказах на очки.\n\nЕсли не хотите получать уведомления, отправьте /stop');
  // Открытые заказы: отправить то, что клиент пропустил (сводку для «в работе», «готово» для «готов»)
  const {data:orders} = await db.from('orders').select('id,status').eq('patient_id', patientId).in('status', ['в работе','готов']).in('type', ['Очки','МКЛ']).is('deleted_at', null);
  for (const o of orders || []) {
    try { await db.functions.invoke('order-notify', {body: {order_id: o.id, event: 'insert'}}); } catch (e) { console.error(e); }
  }
  toast(sr ? 'Povezano ✓' : 'Привязано ✓');
  _lrAfter();
}

async function _lrDismiss(reqId) {
  if (!confirm(_lrSr() ? 'Odbaciti zahtev?' : 'Отклонить запрос? Клиент не будет привязан.')) return;
  await db.from('bot_link_requests').update({resolved_at: new Date().toISOString()}).eq('id', reqId);
  _lrAfter();
}

// После привязки/отклонения: если запросов не осталось — просто закрыть окно, без пустого «Нет запросов»
async function _lrAfter() {
  const {count} = await db.from('bot_link_requests').select('id', {count:'exact', head:true}).is('resolved_at', null);
  sessionStorage.setItem('crm_lr_shown', String(count || 0));
  if (count) { openLinkRequests(); return; }
  closeModal();
}

// ── Клиент без бота: подсказка после оформления заказа и при «Готов» ──
function _lrIntlPhone(phone) {
  let d = _lrDigits(phone);
  if (!d) return '';
  if (String(phone).trim().startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '381' + d.slice(1);   // сербский номер без кода страны
  return d;
}
function _lrReadyText(o, p) {
  const parts = String(p.name || '').trim().split(/\s+/);
  const first = p.first_name || parts[1] || parts[0] || '';
  const cl = o.type === 'МКЛ';
  const bal = orderBalance(o);
  return 'Здравствуйте, ' + first + '!\n\n' +
    (cl ? 'Ваш заказ на контактные линзы пришёл 🎉 Забрать линзы можно в любое удобное время.' : 'Ваши очки готовы 🎉 Забрать их можно в любое удобное время.') + '\n\n' +
    'Режим работы оптики Ginter:\nпн–пт 9:00–20:00\nсб 9:00–14:00\nвс — выходной\n\n' +
    'Trg Republike 25, Novi Sad — https://maps.app.goo.gl/LJerB2rskqhnhES48\n\n' +
    (bal > 0 ? 'К доплате: ' + fmtMoney(bal) + ', картой или наличными.' : 'Заказ оплачен полностью.') + '\n\n' +
    'Чтобы в следующий раз получать уведомления в Telegram: ' + BOT_ORDER_LINK;
}
function _lrOverlay(html) {
  const w = document.createElement('div');
  w.className = 'pay-confirm';
  w.innerHTML = '<div class="pay-confirm-box" style="max-width:420px;text-align:left">' + html + '</div>';
  w.addEventListener('click', e => { if (e.target === w || e.target.closest('[data-close]')) w.remove(); });
  document.body.appendChild(w);
  return w;
}
// kind: 'new' — заказ только что оформлен, 'ready' — заказ готов
async function orderNoBotCheck(orderId, kind) {
  try {
    const {data:o} = await db.from('orders').select('*, patients(id,name,first_name,phone,telegram_chat_id,notify_off)').eq('id', orderId).single();
    const p = o && o.patients;
    if (!o || !p || p.telegram_chat_id || p.notify_off) return;
    if (o.type !== 'Очки' && o.type !== 'МКЛ') return;
    const sr = _lrSr();
    const qrNote = sr
      ? 'Zamolite klijenta da skenira QR kod na kartici „Google" na kasi i pritisne „Podeli broj" — tada će bot sam javiti kad je porudžbina spremna.'
      : 'Попросите клиента отсканировать QR-код на карточке «Google» на кассе и нажать «Поделиться номером» — тогда бот сам сообщит, когда заказ будет готов.';
    if (kind === 'new') {
      _lrOverlay('<div style="font-weight:700;font-size:16px;margin-bottom:8px">⚠️ '+(sr?'Klijent nije povezan sa botom':'Клиент не подключён к боту')+'</div>'+
        '<div style="margin-bottom:6px"><b>'+_lrEsc(p.name)+'</b></div><div class="text-sm" style="margin-bottom:14px">'+qrNote+'</div>'+
        '<div style="text-align:right"><button class="btn btn-accent" data-close>OK</button></div>');
      return;
    }
    _lrManual(o, p, _lrReadyText(o, p), sr?'nije povezan sa botom — bot mu neće pisati.':'не подключён к боту — бот ему не напишет.');
  } catch (e) { console.error('orderNoBotCheck', e); }
}
// Окно «написать клиенту самому»: текст + Viber / WhatsApp / Скопировать
function _lrManual(o, p, text, why) {
    const sr = _lrSr();
    const ph = _lrIntlPhone(p.phone);
    const w = _lrOverlay('<div style="font-weight:700;font-size:16px;margin-bottom:8px">📣 '+(sr?'Obavestite klijenta lično':'Уведомите клиента сами')+'</div>'+
      '<div class="text-sm" style="margin-bottom:10px"><b>'+_lrEsc(p.name)+'</b> '+why+(p.phone?'':' '+(sr?'Telefon nije unet.':'Телефон в карточке не указан.'))+'</div>'+
      '<textarea class="lr-text" style="width:100%;min-height:150px;font-size:13px">'+_lrEsc(text)+'</textarea>'+
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">'+
        (ph ? '<button class="btn btn-accent btn-sm" data-act="viber">Viber</button><button class="btn btn-accent btn-sm" data-act="wa">WhatsApp</button>' : '')+
        '<button class="btn btn-ghost btn-sm" data-act="copy">'+(sr?'Kopiraj tekst':'Скопировать текст')+'</button>'+
        '<button class="btn btn-ghost btn-sm" data-close style="margin-left:auto">'+(sr?'Preskoči':'Пропустить')+'</button></div>'+
      '<div class="text-sm text-m" style="margin-top:8px">'+(sr?'Viber: tekst se kopira — nalepite ga u čet.':'Viber: текст копируется — вставьте его в чат.')+'</div>');
    w.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const txt = w.querySelector('.lr-text').value;
      try { await navigator.clipboard.writeText(txt); } catch (_) {}
      if (b.dataset.act === 'viber') location.href = 'viber://chat?number=%2B' + ph;
      else if (b.dataset.act === 'wa') window.open('https://wa.me/' + ph + '?text=' + encodeURIComponent(txt), '_blank');
      else toast(sr ? 'Kopirano' : 'Скопировано');
    });
}

// ── 🔔 Напомнить клиенту забрать заказ (кнопка у заказа «готов»; работает и для старых заказов) ──
function _lrRemindText(o, p) {
  const parts = String(p.name || '').trim().split(/\s+/);
  const first = p.first_name || parts[1] || parts[0] || '';
  const bal = orderBalance(o);
  return 'Здравствуйте, ' + first + '! Напоминаем, что ' +
    (o.type === 'МКЛ' ? 'ваши контактные линзы пришли и ждут' : 'ваши очки готовы и ждут') +
    ' вас в оптике Ginter, Trg Republike 25. Режим работы: пн–пт 9–20, сб 9–14.' +
    (bal > 0 ? '\nК доплате: ' + fmtMoney(bal) + ', картой или наличными.' : '') +
    '\nhttps://maps.app.goo.gl/LJerB2rskqhnhES48';
}
// Кнопка 🔔 ставится рядом с каждой кнопкой «Выдать» (список заказов, карточка заказа, карточка пациента) —
// «Выдать» показывается только у заказов «готов», поэтому orders.js / patients.js не трогаем.
(function () {
  const add = () => document.querySelectorAll('button[onclick^="issueOrder("]').forEach(b => {
    if (b.nextElementSibling && b.nextElementSibling.dataset.remind) return;
    const m = b.getAttribute('onclick').match(/issueOrder\('([^']+)'\)/); if (!m) return;
    const r = document.createElement('button');
    r.className = 'btn btn-ghost btn-sm'; r.dataset.remind = '1'; r.textContent = '🔔';
    r.title = _lrSr() ? 'Podseti klijenta da preuzme' : 'Напомнить забрать заказ';
    r.addEventListener('click', e => { e.stopPropagation(); orderRemind(m[1]); });
    b.after(r);
  });
  let t = 0;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(add, 50); }).observe(document.body, {childList: true, subtree: true});
})();
async function orderRemind(orderId) {
  const sr = _lrSr();
  try {
    const {data:o} = await db.from('orders').select('*, patients(id,name,first_name,phone,telegram_chat_id,notify_off)').eq('id', orderId).single();
    const p = o && o.patients;
    if (!o || !p) return;
    if (o.status !== 'готов') return toast(sr ? 'Porudžbina nije spremna' : 'Заказ не в статусе «готов»');
    if (o.type !== 'Очки' && o.type !== 'МКЛ') return toast(sr ? 'Samo za naočare i KS' : 'Только для очков и МКЛ');
    if (p.notify_off) return _lrManual(o, p, _lrRemindText(o, p), sr?'se odjavio od obaveštenja bota.':'отказался от уведомлений бота.');
    if (!p.telegram_chat_id) return _lrManual(o, p, _lrRemindText(o, p), sr?'nije povezan sa botom — bot mu neće pisati.':'не подключён к боту — бот ему не напишет.');
    const last = o.notify_reminder_at ? fmt(String(o.notify_reminder_at).slice(0,10)) : '';
    const q = (sr ? 'Poslati podsetnik u Telegram klijentu ' : 'Отправить клиенту в Telegram напоминание забрать заказ?\n') + p.name +
      (last ? (sr ? '\nPoslednji podsetnik: ' : '\nПоследнее напоминание: ') + last : '');
    if (!confirm(q)) return;
    const {data, error} = await db.functions.invoke('order-notify', {body:{mode:'remind', order_id:orderId}});
    const r = data && data.result;
    if (r === 'sent') toast(sr ? '✅ Podsetnik poslat' : '✅ Напоминание отправлено');
    else if (r === 'no chat' || r === 'opted out') _lrManual(o, p, _lrRemindText(o, p), sr?'nije povezan sa botom.':'не подключён к боту.');
    else toast((sr ? 'Nije poslato: ' : 'Не отправлено: ') + (r || (error && error.message) || '?'));
  } catch (e) { console.error('orderRemind', e); toast(sr ? 'Greška' : 'Ошибка'); }
}
