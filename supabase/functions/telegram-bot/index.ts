import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`

const MONTHS_G = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
const DAYS_FULL = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']

const CRM_URL = 'https://annanvslv.github.io/anna-novoselova-bot/crm-v3.html'

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

async function handleStart(chat_id: number, username: string | undefined, payload: string) {
  if (!payload.startsWith('appt_')) {
    await sendMessage(chat_id, 'Привет! Я бот оптики Ginter. Запишитесь через форму на сайте.')
    return
  }

  const apptId = payload.replace('appt_', '')

  const { data: appt, error } = await db
    .from('appointments')
    .select('*, patients(*)')
    .eq('id', apptId)
    .single()

  if (error || !appt) {
    await sendMessage(chat_id, 'Запись не найдена. Напишите @AnnaNvslv')
    return
  }

  // Сохраняем chat_id и username в patients
  await db.from('patients').update({
    telegram_chat_id: chat_id,
    telegram_username: username ? `@${username}` : appt.patients.telegram_username,
  }).eq('id', appt.patient_id)

  await db.from('appointments').update({ patient_chat_id: chat_id }).eq('id', apptId)

  const patient = appt.patients
  const firstName = (patient.name || '').split(' ')[1] || patient.name || ''
  const dateLabel = formatDate(appt.date)
  const time = (appt.time || '').substr(0, 5)

  const text =
`Здравствуйте, ${firstName}!

Вы записаны в Оптику Ginter на ${appt.type} к оптометристу Анне Новосёловой.

🗓 ${dateLabel}
🕒 ${time}

📍Адрес: Trg Republike, 25 (Рибља пијаца, там, где проходит Ночной Базар)
https://maps.app.goo.gl/LJerB2rskqhnhES48

Продолжительность приёма — 1 час
Номер записи: ${appt.appointment_number}

➡️ Стоимость приёма: ${appt.consultation_price} динар.
Оплата — только наличными (Очки можно оплатить картой)

📎 Важно: На приём принесите, пожалуйста, все рецепты, обследования и очки с диоптриями (даже старые и сломанные).

За 30 минут до приёма прекратите активную зрительную нагрузку. Если носите КЛ — снимите за 20 минут до.

❤️‍🩹 Если планы изменятся — сообщите, пожалуйста, заранее Анне: @AnnaNvslv

Подпишитесь, пожалуйста, на канал: https://t.me/+brXxLUcHb-M1MmQ6

До встречи!
Анна ✨`

  await sendMessage(chat_id, text)

  // Уведомить Анну — теперь со ссылками
  await notifyAnnaNewBooking(appt, patient, username)
}

async function notifyAnnaNewBooking(appt: Record<string, unknown>, patient: Record<string, unknown>, tgUsername: string | undefined) {
  const { data: r } = await db.from('settings').select('key,value').eq('key', 'my_chat_id')
  const myChatId = r?.[0]?.value
  if (!myChatId) return

  const dateLabel = formatDate(appt.date as string)
  const time = ((appt.time as string) || '').substr(0, 5)
  const patientName = (patient.name as string) || ''
  const patientTg = tgUsername ? `@${tgUsername}` : ((patient.telegram_username as string) || '—')
  const patientId = patient.id as string

  const tgLink = tgUsername ? `\n👤 Telegram пациента: @${tgUsername}` : ''
  const crmLink = `\n🗂 Профиль в CRM: ${CRM_URL}#patient=${patientId}`

  const msg = `📋 Пациент подтвердил запись через бота!

Пациент: ${patientName}${tgLink}
📅 ${dateLabel} в ${time}
Вид: ${appt.type}
Номер: ${appt.appointment_number}${crmLink}`

  await sendMessage(Number(myChatId), msg)
}

async function handleCallback(callback_query: Record<string, unknown>) {
  const chat_id = (callback_query.from as Record<string,unknown>).id as number
  const data = callback_query.data as string
  const message_id = (callback_query.message as Record<string,unknown>).message_id as number

  await fetch(`${TG}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callback_query.id }),
  })

  const parts = data.split('_')
  const act = parts[0]
  const id = parts.slice(1).join('_')

  const { data: appt } = await db
    .from('appointments')
    .select('*, patients(*)')
    .eq('id', id)
    .single()

  if (act === 'confirm') {
    await db.from('appointments').update({ confirmation_status: 'confirmed' }).eq('id', id)
    await fetch(`${TG}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, message_id, reply_markup: { inline_keyboard: [] } }),
    })
    await sendMessage(chat_id, '✅ Отлично! Ждём вас на приёме. До встречи! ✨')
    await notifyAnnaCallback(appt, '✅ Пациент подтвердил запись')

  } else if (act === 'reschedule') {
    await db.from('appointments').update({ confirmation_status: 'reschedule_requested' }).eq('id', id)
    await fetch(`${TG}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, message_id, reply_markup: { inline_keyboard: [] } }),
    })
    await sendMessage(chat_id, '🔄 Хорошо! Напишите, пожалуйста, @AnnaNvslv — она подберёт удобное время.')
    await notifyAnnaCallback(appt, '🔄 Пациент хочет перезаписаться')

  } else if (act === 'cancel') {
    await db.from('appointments').update({ confirmation_status: 'cancelled', status: 'отменён' }).eq('id', id)
    await fetch(`${TG}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id, message_id, reply_markup: { inline_keyboard: [] } }),
    })
    await sendMessage(
      chat_id,
      '❌ Запись отменена.\n\nЕсли хотите перенести или оставить сообщение Анне — напишите @AnnaNvslv.'
    )
    await notifyAnnaCallback(appt, '❌ Пациент отменил запись')
  }
}

async function notifyAnnaCallback(appt: Record<string, unknown> | null, statusLine: string) {
  const { data: r } = await db.from('settings').select('key,value').eq('key', 'my_chat_id')
  const myChatId = r?.[0]?.value
  if (!myChatId || !appt) return

  const patient = appt.patients as Record<string, unknown>
  const patientName = (patient?.name as string) || ''
  const patientTg = (patient?.telegram_username as string) || ''
  const patientId = (patient?.id as string) || ''
  const dateLabel = formatDate(appt.date as string)
  const time = ((appt.time as string) || '').substr(0, 5)

  const tgLine = patientTg ? `\n👤 Telegram: ${patientTg}` : ''
  const crmLine = `\n🗂 Профиль: ${CRM_URL}#patient=${patientId}`

  const msg = `${statusLine}\n\nПациент: ${patientName}${tgLine}\n📅 ${dateLabel} в ${time}\nНомер: ${appt.appointment_number}${crmLine}`

  await sendMessage(Number(myChatId), msg)
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  try {
    const body = await req.json()
    if (body.message) {
      const msg = body.message
      const chat_id = msg.chat.id
      const username = msg.from?.username
      const text: string = msg.text || ''
      if (text.startsWith('/start')) {
        const payload = text.split(' ')[1] || ''
        await handleStart(chat_id, username, payload)
      }
    } else if (body.callback_query) {
      await handleCallback(body.callback_query)
    }
  } catch (e) {
    console.error(e)
  }
  return new Response('ok')
})
