import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`

const MONTHS_G = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
const DAYS_FULL = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} ${MONTHS_G[d.getMonth()]}, ${DAYS_FULL[d.getDay()]}`
}

async function sendMessage(chat_id: number, text: string, extra: Record<string, unknown> = {}) {
  await fetch(`${TG}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text, parse_mode: 'HTML', ...extra }),
  })
}

const BOOKING_URL = 'https://annanvslv.github.io/anna-novoselova-bot/booking.html'
const CRM_URL = 'https://annanvslv.github.io/anna-novoselova-bot/crm-v3.html'

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dmy(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

// ── Напоминание о контрольном визите ──
// Любая карта обследования с датой контроля: за 3 дня до даты контроля спрашиваем Анну в Telegram
// «Пригласить?» (Да/Нет); пациенту пишет telegram-bot только после «Да», нет ответа — ничего не уходит
// (или сразу, если дата уже наступила, но не позже 14 дней после неё — старые даты не трогаем).
// Один раз на карту (control_notified), только днём по Белграду. Не пишем, если пациент уже
// записан на будущее или после этой карты был новый осмотр.
// Виды: промежуточная коррекция (clinical.interim) и короткий контроль (до ~3 мес. после осмотра)
// → бесплатный «Контрольный визит» по ссылке ?type=control; плановый (полгода–год) → обычная запись.
const CONTROL_LEAD_DAYS = 3
const SHORT_CONTROL_MAX_DAYS = 100

async function sendControlReminders(now: Date): Promise<number> {
  const local = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }))
  const hour = local.getHours()
  if (hour < 10 || hour >= 19) return 0
  const todayStr = ymd(local)
  const fromD = new Date(local); fromD.setDate(fromD.getDate() - 14)
  const toD = new Date(local); toD.setDate(toD.getDate() + CONTROL_LEAD_DAYS)

  const { data: exams } = await db
    .from('examinations')
    .select('id, patient_id, created_at, control_date, clinical, appointments(patient_chat_id), patients(name, telegram_chat_id, deleted_at)')
    .is('deleted_at', null)
    .eq('control_notified', false)
    .not('control_date', 'is', null)
    .lte('control_date', ymd(toD))
    .gte('control_date', ymd(fromD))
  if (!exams?.length) return 0

  const { data: r } = await db.from('settings').select('key,value').eq('key', 'my_chat_id')
  const myChatId = r?.[0]?.value
  let sent = 0

  for (const ex of exams) {
    const pt = ex.patients as Record<string, unknown> | null
    const markDone = () => db.from('examinations').update({ control_notified: true }).eq('id', ex.id)
    if (!pt || pt.deleted_at) { await markDone(); continue }

    // Уже записан на будущее или уже был новый осмотр — напоминать не нужно
    const { count: planned } = await db.from('appointments').select('id', { count: 'exact', head: true })
      .eq('patient_id', ex.patient_id).eq('status', 'запланирован').gte('date', todayStr).is('deleted_at', null)
    const { count: newer } = await db.from('examinations').select('id', { count: 'exact', head: true })
      .eq('patient_id', ex.patient_id).gt('created_at', ex.created_at).is('deleted_at', null)
    if ((planned || 0) > 0 || (newer || 0) > 0) { await markDone(); continue }

    const interim = (ex.clinical as Record<string, unknown> | null)?.interim === '1'
    const gapDays = (new Date(ex.control_date + 'T12:00:00').getTime() - new Date(ex.created_at).getTime()) / 86400000
    const kind = interim ? 'interim' : (gapDays <= SHORT_CONTROL_MAX_DAYS ? 'short' : 'planned')
    const kindLabel = kind === 'interim' ? 'контроль после промежуточной коррекции'
      : kind === 'short' ? 'контрольный визит' : 'плановая проверка зрения'

    const name = (pt.name as string) || ''
    const chat_id = (ex.appointments as Record<string, unknown> | null)?.patient_chat_id || pt.telegram_chat_id
    const crmLink = `${CRM_URL}#patient=${ex.patient_id}`
    const due = ex.control_date <= todayStr ? 'уже подошёл' : `подходит ${dmy(ex.control_date)}`

    if (chat_id && myChatId) {
      // Пациенту сразу не пишем — сначала спрашиваем Анну. Отправка пациенту — только по кнопке «Да»
      // (обработчик ctlyes_/ctlno_ в telegram-bot). Нет ответа — ничего не уходит.
      await sendMessage(Number(myChatId),
`🔔 У пациента ${due === 'уже подошёл' ? 'подошло' : 'подходит'} время: ${kindLabel} (дата ${dmy(ex.control_date)})

Пациент: ${name}
🗂 Профиль: ${crmLink}

Пригласить его?`,
        { reply_markup: { inline_keyboard: [[
          { text: '✅ Да', callback_data: `ctlyes_${ex.id}` },
          { text: '❌ Нет', callback_data: `ctlno_${ex.id}` },
        ]] } })
      sent++
    } else if (myChatId) {
      await sendMessage(Number(myChatId), `🔔 Пациенту пора: ${kindLabel} (дата ${dmy(ex.control_date)}), но Telegram не привязан — свяжитесь вручную.\n\nПациент: ${name}\n🗂 Профиль: ${crmLink}`)
    }
    await markDone()
  }
  return sent
}

serve(async () => {
  const now = new Date()

  let controlSent = 0
  try { controlSent = await sendControlReminders(now) } catch (e) { console.error('control reminders', e) }

  // Все активные записи с chat_id, не отменённые
  const { data: appointments } = await db
    .from('appointments')
    .select('*, patients(name, telegram_chat_id)')
    .eq('status', 'запланирован')
    // neq сам по себе отбрасывает записи с пустым confirmation_status (NULL), а это все новые записи
    .or('confirmation_status.is.null,confirmation_status.neq.cancelled')
    .is('deleted_at', null)

  if (!appointments) return new Response(`no appointments; control reminders: ${controlSent}`)

  for (const appt of appointments) {
    // Сначала — чат, из которого подтвердили именно эту запись (повторные записи
    // одного пациента могут быть сделаны с другого аккаунта), затем — чат из карточки.
    const chat_id = appt.patient_chat_id || appt.patients?.telegram_chat_id
    if (!chat_id) continue

    // Собираем datetime записи (Serbia = UTC+2, используем date+time напрямую)
    const apptDatetime = new Date(`${appt.date}T${appt.time || '09:00'}+02:00`)
    const diffMs = apptDatetime.getTime() - now.getTime()
    const diffH = diffMs / (1000 * 60 * 60)

    // ── Напоминание за 24 часа ──
    if (diffH > 23 && diffH <= 25 && !appt.reminder_24h_sent) {
      const dateLabel = formatDate(appt.date)
      const time = (appt.time || '').substr(0, 5)
      const firstName = (appt.patients.name || '').split(' ')[1] || appt.patients.name || ''

      const text =
`👋 ${firstName}, добрый день!

Напоминаем, что завтра у вас запись к оптометристу Анне Новосёловой:

🗓 ${dateLabel}
🕒 ${time}
📍 Trg Republike 25, Нови-Сад
Номер записи: ${appt.appointment_number}

Всё по плану?`

      await sendMessage(chat_id, text, {
        reply_markup: {
          inline_keyboard: [
            [{ text: '✅ Да, подтверждаю', callback_data: `confirm_${appt.id}` }],
            [{ text: '🔄 Не смогу, хочу перезаписаться', callback_data: `reschedule_${appt.id}` }],
            [{ text: '❌ Нет, отменить запись', callback_data: `cancel_${appt.id}` }],
          ],
        },
      })

      await db.from('appointments').update({ reminder_24h_sent: true }).eq('id', appt.id)
    }

    // ── Напоминание за 1 час ──
    if (diffH > 0.75 && diffH <= 1.25 && !appt.reminder_1h_sent) {
      const time = (appt.time || '').substr(0, 5)
      const firstName = (appt.patients.name || '').split(' ')[1] || appt.patients.name || ''

      await sendMessage(
        chat_id,
        `⏰ ${firstName}, напоминаем: через час ваш приём у Анны Новосёловой!\n\n🕒 ${time} · Trg Republike 25\n\nДо встречи! ✨`
      )

      await db.from('appointments').update({ reminder_1h_sent: true }).eq('id', appt.id)
    }
  }

  return new Response(`reminders sent; control reminders: ${controlSent}`)
})
