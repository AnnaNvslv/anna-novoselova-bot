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

// ── Напоминание о контроле после промежуточной коррекции ──
// Карты, где в рецептах отмечена «Промежуточная коррекция для адаптации» (clinical.interim = '1'),
// и наступила дата контроля. Пишем пациенту один раз (control_notified), только днём по Белграду,
// только если дата контроля была не раньше 14 дней назад (старые даты не трогаем),
// и если пациент ещё не записан и не приходил после этой карты.
async function sendControlReminders(now: Date): Promise<number> {
  const local = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }))
  const hour = local.getHours()
  if (hour < 10 || hour >= 19) return 0
  const todayStr = ymd(local)
  const fromD = new Date(local); fromD.setDate(fromD.getDate() - 14)

  const { data: exams } = await db
    .from('examinations')
    .select('id, patient_id, created_at, control_date, appointments(patient_chat_id), patients(name, telegram_chat_id, deleted_at)')
    .is('deleted_at', null)
    .eq('control_notified', false)
    .contains('clinical', { interim: '1' })
    .lte('control_date', todayStr)
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

    const name = (pt.name as string) || ''
    const firstName = name.split(' ')[1] || name
    const chat_id = (ex.appointments as Record<string, unknown> | null)?.patient_chat_id || pt.telegram_chat_id
    const crmLink = `${CRM_URL}#patient=${ex.patient_id}`

    if (chat_id) {
      const text =
`👋 ${firstName}, здравствуйте!

Подошло время контрольного визита после промежуточной коррекции у оптометриста Анны Новосёловой.

На контроле проверим, как идёт адаптация к очкам, и при необходимости поменяем диоптрии — следующий шаг к полной коррекции.

⏱ 30 минут · бесплатно
📍 Trg Republike 25, Нови-Сад

Выберите удобное время по кнопке ниже 👇`
      await sendMessage(Number(chat_id), text, {
        reply_markup: { inline_keyboard: [[{ text: '📅 Записаться на контроль', url: `${BOOKING_URL}?type=control` }]] },
      })
      sent++
      if (myChatId) await sendMessage(Number(myChatId), `🔔 Пациенту отправлено напоминание о контроле (промежуточная коррекция)\n\nПациент: ${name}\n🗂 Профиль: ${crmLink}`)
    } else if (myChatId) {
      await sendMessage(Number(myChatId), `🔔 Пациенту пора на контроль (промежуточная коррекция), но Telegram не привязан — свяжитесь вручную.\n\nПациент: ${name}\n🗂 Профиль: ${crmLink}`)
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
    .neq('confirmation_status', 'cancelled')

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
