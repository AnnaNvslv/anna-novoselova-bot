// ── 💬 Повторная отправка оповещений клиенту через бота (заказы и записи) ──
// Меню выбора сообщения → подтверждение «точно отправить?» → отправка.
// Заказы: order-notify {mode:'resend'}; записи: telegram-bot?crm=1. Обе функции пускают только сотрудников.

const _NR_ORDER_KINDS = [
  {k:'summary',  col:'notify_summary_at',  ru:'Заказ оформлен (сводка)',   sr:'Porudžbina primljena (pregled)', ok:o => true},
  {k:'ready',    col:'notify_ready_at',    ru:'Заказ готов',                sr:'Porudžbina spremna',             ok:o => ['готов','выдан'].includes(o.status)},
  {k:'reminder', col:'notify_reminder_at', ru:'Напоминание забрать заказ',  sr:'Podsetnik za preuzimanje',       ok:o => o.status === 'готов'},
  {k:'issued',   col:'notify_issued_at',   ru:'Спасибо после выдачи',       sr:'Hvala posle izdavanja',          ok:o => o.status === 'выдан'},
];
const _NR_APPT_KINDS = [
  {k:'confirm', ru:'Подтверждение записи',                 sr:'Potvrda zakazivanja', ok:a => a.status !== 'отменён'},
  {k:'remind',  ru:'Напоминание о приёме (с кнопками ✅/🔄/❌)', sr:'Podsetnik za pregled (sa dugmadima)', ok:a => a.status === 'запланирован'},
];
function _nrSr() { return _lang === 'sr'; }
function _nrL(ru, sr) { return _nrSr() ? sr : ru; }
function _nrEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function _nrWhy(r) {
  return ({
    'no chat': _nrL('клиент не подключён к боту — напишите ему сами', 'klijent nije povezan sa botom — pišite mu sami'),
    'opted out': _nrL('клиент отказался от уведомлений', 'klijent se odjavio od obaveštenja'),
    'tg error': _nrL('Telegram не принял сообщение (клиент мог заблокировать бота)', 'Telegram nije prihvatio poruku (klijent je možda blokirao bota)'),
    'not glasses / CL': _nrL('только для заказов очков и МКЛ', 'samo za naočare i KS'),
  })[r] || r || '?';
}
function _nrMenu(title, sub, items, onPick) {
  const w = _lrOverlay(
    '<div style="font-weight:700;font-size:16px;margin-bottom:4px">💬 ' + _nrEsc(title) + '</div>' +
    '<div class="text-sm text-m" style="margin-bottom:12px">' + sub + '</div>' +
    '<div style="display:flex;flex-direction:column;gap:6px">' + items.map((it, i) =>
      '<button class="btn btn-ghost btn-sm" data-i="' + i + '" style="justify-content:space-between;text-align:left;gap:10px"' + (it.disabled ? ' disabled' : '') + '>' +
        '<span>' + _nrEsc(it.label) + '</span><span class="text-m" style="font-size:12px;white-space:nowrap">' + _nrEsc(it.note || '') + '</span></button>').join('') +
    '</div>' +
    '<div style="display:flex;margin-top:12px"><button class="btn btn-ghost btn-sm" data-close style="margin-left:auto">' + _nrL('Закрыть', 'Zatvori') + '</button></div>');
  w.addEventListener('click', e => {
    const b = e.target.closest('[data-i]'); if (!b || b.disabled) return;
    const it = items[+b.dataset.i];
    w.remove(); onPick(it);
  });
}

async function orderNotifyMenu(orderId) {
  const {data:o} = await db.from('orders').select('*, patients(id,name,phone,telegram_chat_id,notify_off)').eq('id', orderId).single();
  const p = o && o.patients; if (!o || !p) return;
  if (o.type !== 'Очки' && o.type !== 'МКЛ') return toast(_nrWhy('not glasses / CL'));
  const linked = p.telegram_chat_id && !p.notify_off;
  const sub = '<b>' + _nrEsc(p.name) + '</b>' + (o.order_number ? ' · №' + _nrEsc(o.order_number) : '') + ' · ' + _nrEsc(statusLabel(o.status)) +
    (linked ? '' : '<br><span style="color:var(--red)">⚠️ ' + _nrWhy(p.notify_off ? 'opted out' : 'no chat') + '</span>');
  const items = _NR_ORDER_KINDS.filter(x => x.ok(o)).map(x => ({
    kind: x.k, label: _nrL(x.ru, x.sr), disabled: !linked,
    note: o[x.col] ? _nrL('отпр. ', 'posl. ') + fmt(String(o[x.col]).slice(0,10)) : _nrL('не отправлялось', 'nije slato'),
  }));
  _nrMenu(_nrL('Оповещение по заказу', 'Obaveštenje o porudžbini'), sub, items, async it => {
    if (!confirm(_nrL('Точно отправить клиенту в Telegram сообщение «', 'Zaista poslati klijentu u Telegram poruku „') + it.label + _nrL('»?\n', '“?\n') + p.name)) return;
    const {data, error} = await db.functions.invoke('order-notify', {body:{mode:'resend', order_id:orderId, kind:it.kind}});
    const r = data && data.result;
    if (r === 'sent') { toast(_nrL('✅ Отправлено', '✅ Poslato')); if (_openPatientId) _renderPatientCard(_openPatientId); }
    else toast(_nrL('Не отправлено: ', 'Nije poslato: ') + _nrWhy(r || (error && error.message)), 'error');
  });
}

async function apptNotifyMenu(apptId) {
  const {data:a} = await db.from('appointments').select('*, patients(id,name,telegram_chat_id)').eq('id', apptId).single();
  const p = a && a.patients; if (!a || !p) return;
  const linked = a.patient_chat_id || p.telegram_chat_id;
  const sub = '<b>' + _nrEsc(p.name) + '</b> · ' + fmt(a.date) + ' ' + (a.time || '').substr(0,5) +
    (linked ? '' : '<br><span style="color:var(--red)">⚠️ ' + _nrWhy('no chat') + '</span>');
  const items = _NR_APPT_KINDS.filter(x => x.ok(a)).map(x => ({kind:x.k, label:_nrL(x.ru, x.sr), disabled:!linked}));
  if (!items.length) return toast(_nrL('Запись отменена', 'Pregled je otkazan'));
  _nrMenu(_nrL('Оповещение по записи', 'Obaveštenje o pregledu'), sub, items, async it => {
    if (!confirm(_nrL('Точно отправить клиенту в Telegram сообщение «', 'Zaista poslati klijentu u Telegram poruku „') + it.label + _nrL('»?\n', '“?\n') + p.name)) return;
    const {data, error} = await db.functions.invoke('telegram-bot?crm=1', {body:{appointment_id:apptId, kind:it.kind}});
    const r = data && data.result;
    if (r === 'sent') toast(_nrL('✅ Отправлено', '✅ Poslato'));
    else toast(_nrL('Не отправлено: ', 'Nije poslato: ') + _nrWhy(r || (error && error.message)), 'error');
  });
}
