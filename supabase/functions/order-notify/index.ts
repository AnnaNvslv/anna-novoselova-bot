// Уведомления клиентам о заказах очков и контактных линз (CRM Optometrist) + утренняя сводка заказов Анне.
// Вызовы:
//   POST {order_id, event:'insert'|'status'}  — из триггера БД orders_notify (pg_net)
//   POST {mode:'cron'}                         — каждый час: напоминание «очки ждут» через 3 дня + сводка в 9:15
//   POST {mode:'digest'}                        — сводка заказов Анне сейчас (ручной запуск)
// Пишем только: заказы типа «Очки» и «МКЛ», созданные после settings.order_notify_since, пациенту с telegram_chat_id и без notify_off.
// Каждое сообщение отправляется один раз (notify_*_at в orders).
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CRM_URL = 'https://annanvslv.github.io/anna-novoselova-bot/crm-v3.html'
const MAPS = 'https://maps.app.goo.gl/LJerB2rskqhnhES48'
const GOOGLE_REVIEW = 'https://share.google/staovH2KzgprxiEAN'
const MED_SERBIA = 'https://t.me/vrachivserbii/54282'
const SPECIALISTS = 'https://t.me/specialistinovisada'
const ANNA = '<a href="https://t.me/AnnaNvslv">@AnnaNvslv</a>'
const HOURS = 'пн–пт 9:00–20:00\nсб 9:00–14:00\nвс — выходной'
const LONG_DAYS = 7

const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const money = (n: number) => Math.round(n).toLocaleString('ru-RU').replace(/\u00a0/g, ' ') + ' дин.'
const num = (x: unknown) => Number(x) || 0

async function tg(chat_id: number | string, text: string): Promise<boolean> {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
  const j = await r.json().catch(() => ({}))
  if (!j.ok) console.error('tg', j)
  return !!j.ok
}
async function setting(key: string): Promise<string | null> {
  const { data } = await db.from('settings').select('value').eq('key', key).maybeSingle()
  return data?.value ?? null
}
// «Фамилия Имя» → Имя
function firstName(p: Record<string, unknown>): string {
  if (p.first_name) return String(p.first_name)
  const parts = String(p.name || '').trim().split(/\s+/)
  return parts[1] || parts[0] || ''
}
function payLines(t: { prepay: number; balance: number }): string {
  return t.balance > 0
    ? `Предоплата: ${money(t.prepay)}\nК доплате: <b>${money(t.balance)}</b>`
    : 'Заказ оплачен полностью.'
}
function totals(o: Record<string, any>) {
  const items: any[] = Array.isArray(o.items) && o.items.length ? o.items : [{
    frame_price: num(o.frame_price), frame_base: 0, lens_name: o.lens_name, lens_price: num(o.lens_price),
    lens_base: 0, lens_qty: o.lens_qty != null ? num(o.lens_qty) : 2,
  }]
  let discount = 0
  for (const it of items) {
    if (num(it.frame_base) > num(it.frame_price)) discount += num(it.frame_base) - num(it.frame_price)
    if (num(it.lens_base) > num(it.lens_price)) discount += (num(it.lens_base) - num(it.lens_price)) * num(it.lens_qty)
  }
  const work = num(o.work_price)
  const total = items.reduce((a, it) => a + num(it.frame_price) + num(it.lens_price) * num(it.lens_qty), 0) + work
  const prepay = num(o.prepayment)
  return { items, discount, work, total, prepay, balance: Math.max(total - prepay, 0) }
}

const isCL = (o: any) => o.type === 'МКЛ'
// Один Telegram на несколько карточек (мама + дети): приветствие без имени, в тексте — для кого заказ
const hello = (p: any) => p._shared ? 'Здравствуйте!' : `Здравствуйте, ${esc(firstName(p))}!`
const forWhom = (p: any) => p._shared ? ` для ${esc(firstName(p))}` : ''
function msgSummary(o: any, p: any): string {
  const t = totals(o)
  if (isCL(o)) {
    const cl = t.items.map((it: any) => `👁 Контактные линзы${it.lens_name ? ' ' + esc(it.lens_name) : ''}: ${money(num(it.lens_price) * num(it.lens_qty))}`).join('\n')
    return `${hello(p)}

${p._shared ? `Оформлен заказ на контактные линзы${forWhom(p)}` : 'Вы оформили заказ на контактные линзы'} в оптике Ginter.

${cl}${t.work > 0 ? `\n🛠 Работа: ${money(t.work)}` : ''}${t.discount > 0 ? `\n🏷 Скидка: ${money(t.discount)}` : ''}

<b>Итого: ${money(t.total)}</b>
${payLines(t)}

Когда линзы придут, этот бот обязательно пришлёт вам уведомление.

Если появятся вопросы, пишите Анне: ${ANNA}`
  }
  const multi = t.items.length > 1
  const lines = t.items.map((it: any, i: number) => {
    const head = multi ? `\n<b>Очки ${i + 1}</b>\n` : ''
    return `${head}👓 Оправа: ${money(num(it.frame_price))}\n🔍 Линзы${it.lens_name ? ' ' + esc(it.lens_name) : ''}: ${money(num(it.lens_price) * num(it.lens_qty))}`
  }).join('\n')
  const pay = payLines(t)
  return `${hello(p)}

${p._shared ? `Оформлен заказ на очки${forWhom(p)}` : 'Вы оформили заказ на очки'} в оптике Ginter.

${lines}
🛠 Работа: ${money(t.work)}${t.discount > 0 ? `\n🏷 Скидка: ${money(t.discount)}` : ''}

<b>Итого: ${money(t.total)}</b>
${pay}

Когда очки будут готовы, этот бот обязательно пришлёт вам уведомление.

Если появятся вопросы, пишите Анне: ${ANNA}`
}
function msgReady(o: any, p: any): string {
  const t = totals(o)
  return `${hello(p)}

${p._shared
    ? (isCL(o) ? `Заказ на контактные линзы${forWhom(p)} пришёл 🎉 Забрать линзы можно в любое удобное время.` : `Очки${forWhom(p)} готовы 🎉 Забрать их можно в любое удобное время.`)
    : (isCL(o) ? 'Ваш заказ на контактные линзы пришёл 🎉 Забрать линзы можно в любое удобное время.' : 'Ваши очки готовы 🎉 Забрать их можно в любое удобное время.')}

🕘 Режим работы оптики Ginter:
${HOURS}

📍 Trg Republike 25, Novi Sad — ${MAPS}

${t.balance > 0 ? `К доплате: <b>${money(t.balance)}</b>, картой или наличными.` : 'Заказ оплачен полностью.'}

Если при получении вам нужна Анна, пожалуйста, заранее уточните её рабочее время: ${ANNA}
Если нет, приходите в любое время: заказ выдадут коллеги, Эрвин или Бояна.`
}
function msgReminder(o: any, p: any): string {
  return `${hello(p)} Напоминаем, что ${p._shared ? (isCL(o) ? `контактные линзы${forWhom(p)} пришли и ждут` : `очки${forWhom(p)} готовы и ждут`) : (isCL(o) ? 'ваши контактные линзы пришли и ждут' : 'ваши очки готовы и ждут')} вас в оптике Ginter. Режим работы: пн–пт 9–20, сб 9–14.
📍 ${MAPS}`
}
function msgIssued(o: any, p: any): string {
  if (isCL(o)) return `${hello(p)}

Благодарим вас за обращение в оптику Ginter и к Анне. Носите линзы с удовольствием! 👁

Соблюдайте срок замены линз и правила ухода за ними. Если появится дискомфорт, покраснение или вопросы по ношению, пишите Анне: ${ANNA}

Будем очень благодарны за отзыв:
⭐ Google: ${GOOGLE_REVIEW}
💬 Медицина Сербии: ${MED_SERBIA}
👩‍⚕️ Специалисты: ${SPECIALISTS} (отзывы там можно оставлять по субботам)`
  return `${hello(p)}

Благодарим вас за обращение в оптику Ginter и к Анне. Носите очки на здоровье! 👓

Напоминаем, что гарантия на изготовление очков (установку линз в оправу) составляет 30 дней. Если очки погнутся, сломаются или будут неудобно сидеть, не стесняйтесь, приходите: мы всё поправим.

Будем очень благодарны за отзыв:
⭐ Google: ${GOOGLE_REVIEW}
💬 Медицина Сербии: ${MED_SERBIA}
👩‍⚕️ Специалисты: ${SPECIALISTS} (отзывы там можно оставлять по субботам)`
}

const KIND: Record<string, { col: string; build: (o: any, p: any) => string }> = {
  summary: { col: 'notify_summary_at', build: msgSummary },
  ready: { col: 'notify_ready_at', build: msgReady },
  reminder: { col: 'notify_reminder_at', build: msgReminder },
  issued: { col: 'notify_issued_at', build: msgIssued },
}

// Отправить одно сообщение по заказу с проверками. Возвращает причину пропуска или 'sent'.
async function notify(orderId: string, kind: string): Promise<string> {
  const k = KIND[kind]; if (!k) return 'bad kind'
  const { data: o } = await db.from('orders').select('*, patients(id, name, first_name, telegram_chat_id, notify_off, deleted_at)').eq('id', orderId).single()
  if (!o || o.deleted_at) return 'no order'
  if (o.type !== 'Очки' && o.type !== 'МКЛ') return 'not glasses / CL'
  const since = await setting('order_notify_since')
  if (!since || new Date(o.created_at) < new Date(since)) return 'old order'
  if (o[k.col]) return 'already sent'
  const p = o.patients
  if (!p || p.deleted_at || !p.telegram_chat_id || p.notify_off) return 'no chat / opted out'
  const { count: sameChat } = await db.from('patients').select('id', { count: 'exact', head: true }).eq('telegram_chat_id', p.telegram_chat_id).is('deleted_at', null)
  p._shared = (sameChat || 0) > 1
  // защита от гонки: занимаем отметку до отправки
  const { data: claimed } = await db.from('orders').update({ [k.col]: new Date().toISOString() }).eq('id', orderId).is(k.col, null).select('id')
  if (!claimed?.length) return 'already sent'
  const ok = await tg(p.telegram_chat_id, k.build(o, p))
  if (!ok) { await db.from('orders').update({ [k.col]: null }).eq('id', orderId); return 'tg error' }
  return 'sent'
}

function belgradeNow() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Belgrade' })) }
const daysSince = (d: string | null) => d ? Math.floor((Date.now() - new Date(d + (d.length === 10 ? 'T12:00:00' : '')).getTime()) / 86400000) : 0

async function reminders(): Promise<number> {
  const since = await setting('order_notify_since')
  const { data } = await db.from('orders').select('id, ready_date, notify_ready_at, created_at')
    .eq('status', 'готов').in('type', ['Очки', 'МКЛ']).is('deleted_at', null).is('notify_reminder_at', null)
    .not('notify_ready_at', 'is', null).gte('created_at', since || '2100-01-01')
  let n = 0
  for (const o of data || []) {
    if ((Date.now() - new Date(o.notify_ready_at).getTime()) / 86400000 >= 3) {
      if (await notify(o.id, 'reminder') === 'sent') n++
    }
  }
  return n
}

async function digest(): Promise<string> {
  const chatId = await setting('my_chat_id'); if (!chatId) return 'no my_chat_id'
  const { data: rows } = await db.from('orders')
    .select('id, status, order_date, created_at, ready_date, notify_ready_at, notify_reminder_at, order_number, type, patients(id, name, phone, telegram_chat_id, notify_off)')
    .in('status', ['в работе', 'готов', 'переделка']).is('deleted_at', null).order('order_date')
  const work = (rows || []).filter((o: any) => o.status !== 'готов')
  const ready = (rows || []).filter((o: any) => o.status === 'готов')
  const line = (o: any, extra: string) => `• ${esc(o.patients?.name || '—')}${o.order_number ? ' · №' + esc(o.order_number) : ''} — ${extra}`
  const parts: string[] = [`📦 <b>Заказы на ${belgradeNow().toLocaleDateString('ru-RU')}</b>`]
  parts.push(`\n🔧 <b>В работе: ${work.length}</b>` + (work.length ? '\n' + work.map((o: any) => {
    const d = daysSince(o.order_date || o.created_at?.slice(0, 10))
    return line(o, `${d} дн.${d > LONG_DAYS ? ' ⚠️ дольше недели' : ''}`)
  }).join('\n') : ''))
  parts.push(`\n✅ <b>Готово, не выдано: ${ready.length}</b>` + (ready.length ? '\n' + ready.map((o: any) =>
    line(o, `ждёт ${daysSince(o.ready_date || o.notify_ready_at?.slice(0, 10))} дн.${o.notify_reminder_at ? ' · напоминание отправлено' : ''}`)).join('\n') : ''))
  const noBot = (rows || []).filter((o: any) => o.patients && (!o.patients.telegram_chat_id || o.patients.notify_off))
  if (noBot.length) parts.push(`\n⚠️ <b>Без связи с ботом</b> (написать лично):\n` + noBot.map((o: any) =>
    `• ${esc(o.patients.name)}${o.patients.phone ? ' · ' + esc(o.patients.phone) : ''}${o.patients.notify_off ? ' (отказался от уведомлений)' : ''}`).join('\n'))
  parts.push(`\n🗂 ${CRM_URL}`)
  if (!work.length && !ready.length) return 'nothing'
  return (await tg(chatId, parts.join('\n'))) ? 'digest sent' : 'tg error'
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  try {
    const b = await req.json().catch(() => ({}))
    if (b.mode === 'digest') return new Response(await digest())
    if (b.mode === 'cron') {
      const local = belgradeNow(); const h = local.getHours()
      const out: string[] = []
      if (h >= 10 && h <= 19) out.push('reminders ' + await reminders())
      if (h === 9 && local.getMinutes() < 45) out.push(await digest())
      return new Response(out.join('; ') || `skip h${h}`)
    }
    if (b.order_id) {
      const { data: o } = await db.from('orders').select('status').eq('id', b.order_id).single()
      const st = o?.status
      // событие устарело (статус уже сменили ещё раз) — не шлём
      if (b.status && b.status !== st) return new Response('stale event ' + b.status + ' → ' + st)
      let kind = ''
      if (b.event === 'insert') kind = st === 'выдан' ? 'issued' : st === 'готов' ? 'ready' : st === 'в работе' ? 'summary' : ''
      else if (st === 'готов') kind = 'ready'
      else if (st === 'выдан') kind = 'issued'
      if (!kind) return new Response('no message for status ' + st)
      // выдан сразу при создании: сводку не шлём, только благодарность
      return new Response(kind + ': ' + await notify(b.order_id, kind))
    }
    return new Response('bad request', { status: 400 })
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 500 })
  }
})
