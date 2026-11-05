// ═══ УТРЕННЯЯ СВОДКА ЗАКАЗОВ (окно при первом открытии CRM за день) ═══
// Те же данные, что Telegram-сводка в 9:15 (Edge Function order-notify): в работе / готово, не выдано / без связи с ботом.
// Кнопки «Готов» / «Выдан» меняют статус — клиенту при этом пишет бот (кроме заказов до 05.11.2026).
const _OD_LONG = 7;
function _odDays(d) { if (!d) return 0; return Math.max(0, Math.floor((Date.now() - new Date(String(d).slice(0,10)+'T12:00:00').getTime())/86400000)); }
async function orderDigestMaybe() {
  try {
    if (!isAdmin()) return;
    const key = 'crm_order_digest_' + today();
    if (localStorage.getItem(key)) return;
    const shown = await openOrderDigest(true);
    if (shown) localStorage.setItem(key, '1');
  } catch (e) { console.error('orderDigest', e); }
}
async function openOrderDigest(auto) {
  const {data, error} = await db.from('orders')
    .select('id, status, type, order_date, created_at, ready_date, order_number, notify_ready_at, notify_reminder_at, patients(id, name, phone, telegram_chat_id, notify_off)')
    .in('status', ['в работе','готов','переделка']).is('deleted_at', null).order('order_date');
  if (error) { console.error(error); return false; }
  const rows = data || [];
  if (auto && !rows.length) return false;
  const sr = _lang === 'sr';
  const work = rows.filter(o => o.status !== 'готов'), ready = rows.filter(o => o.status === 'готов');
  const noBot = rows.filter(o => o.patients && (!o.patients.telegram_chat_id || o.patients.notify_off));
  const name = o => '<span style="cursor:pointer;color:var(--primary);font-weight:600" onclick="closeModal();openPatientCard(\''+o.patients?.id+'\')">'+_escH(o.patients?.name||'—')+'</span>'+(o.order_number?' <span class="badge badge-gray">№'+_escH(o.order_number)+'</span>':'')+(o.type&&o.type!=='Очки'?' <span class="text-sm text-m">'+_escH(o.type)+'</span>':'');
  const btn = (o, st, label, cls) => '<button class="btn '+cls+' btn-sm" onclick="_odSet(\''+o.id+'\',\''+st+'\')">'+label+'</button>';
  const row = (o, info, actions, warn) => '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)'+(warn?';background:#fff7ed':'')+'"><div style="min-width:0">'+name(o)+'<div class="text-sm text-m">'+info+'</div></div><div style="display:flex;gap:6px;flex-shrink:0">'+actions+'</div></div>';
  const sec = (title, list) => '<div style="margin-top:16px"><div style="font-weight:700;margin-bottom:4px">'+title+'</div>'+(list||'<div class="text-sm text-m">—</div>')+'</div>';
  const workHtml = work.map(o => { const d = _odDays(o.order_date || o.created_at); const long = d > _OD_LONG;
    return row(o, (sr?'u izradi ':'в работе ')+d+(sr?' d.':' дн.')+(long?(sr?' · ⚠️ duže od nedelje':' · ⚠️ дольше недели'):'')+(o.status==='переделка'?' · '+statusLabel('переделка'):''),
      btn(o,'готов',sr?'Spremno':'Готов','btn-ghost')+btn(o,'выдан',sr?'Izdato':'Выдан','btn-accent'), long); }).join('');
  const readyHtml = ready.map(o => { const d = _odDays(o.ready_date || o.notify_ready_at);
    return row(o, (sr?'čeka ':'ждёт ')+d+(sr?' d.':' дн.')+(o.notify_reminder_at?(sr?' · podsetnik poslat':' · напоминание отправлено'):''), btn(o,'выдан',sr?'Izdato':'Выдан','btn-accent'), d >= 3); }).join('');
  const noBotHtml = noBot.map(o => '<div style="padding:6px 0;border-bottom:1px solid var(--border)">'+name(o)+(o.patients.phone?' · <a href="tel:'+_escH(o.patients.phone)+'">'+_escH(o.patients.phone)+'</a>':'')+(o.patients.notify_off?' <span class="text-sm text-m">('+(sr?'odjavio se':'отказался от уведомлений')+')</span>':'')+'</div>').join('');
  openModal(
    '<div class="modal modal-lg"><div class="modal-header"><span class="modal-title">📦 '+(sr?'Porudžbine — pregled':'Заказы — сводка')+'</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body" id="od-body">'+
      sec('🔧 '+(sr?'U izradi':'В работе')+': '+work.length, workHtml)+
      sec('✅ '+(sr?'Spremno, nije izdato':'Готово, не выдано')+': '+ready.length, readyHtml)+
      (noBot.length ? sec('⚠️ '+(sr?'Bez veze sa botom — javite se lično':'Без связи с ботом — написать лично')+': '+noBot.length, noBotHtml) : '')+
    '</div><div class="modal-footer"><button class="btn btn-accent" onclick="closeModal()">OK</button></div></div>');
  return true;
}
async function _odSet(id, status) {
  if (status === 'выдан') await issueOrder(id); else await updateOrderStatus(id, status);
  openOrderDigest(false);
}
