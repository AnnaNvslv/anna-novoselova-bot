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

serve(async () => {
  const now = new Date()

  // Все активные записи с chat_id, не отменённые
  const { data: appointments } = await db
    .from('appointments')
    .select('*, patients(name, telegram_chat_id)')
    .eq('status', 'запланирован')
    .neq('confirmation_status', 'cancelled')

  if (!appointments) return new Response('no appointments')

  for (const appt of appointments) {
    const chat_id = appt.patients?.telegram_chat_id
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

  return new Response('reminders sent')
})
