// Сводка записей для Анны в Telegram.
// Cron дёргает функцию в 06,07,18,19 UTC; по часу Белграда решаем, что слать:
// 08:00 → записи на сегодня, 20:00 → записи на завтра (так переход летнее/зимнее время не ломает расписание).
// Ручной запуск: ?mode=today | ?mode=tomorrow
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const CRM_URL = 'https://annanvslv.github.io/anna-novoselova-bot/crm-v3.html'

const MONTHS_G = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
const DAYS = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function plural(n: number) {
  const a = n % 10, b = n % 100
  if (a === 1 && b !== 11) return 'запись'
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return 'записи'
  return 'записей'
}

function confIcon(c: string | null) {
  if (c === 'confirmed') return '✅'
  if (c === 'reschedule_requested') return '🔄'
  return '⏳'
}

serve(async (req) => {
  const url = new URL(req.url)
  const local = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }))
  let mode = url.searchParams.get('mode')
  if (!mode) {
    const h = local.getHours()
    if (h === 8) mode = 'today'
    else if (h === 20) mode = 'tomorrow'
    else return new Response(`skip (Belgrade hour ${h})`)
  }

  const day = new Date(local)
  if (mode === 'tomorrow') day.setDate(day.getDate() + 1)
  const dateStr = ymd(day)

  const { data: s } = await db.from('settings').select('value').eq('key', 'my_chat_id').maybeSingle()
  const chatId = s?.value
  if (!chatId) return new Response('my_chat_id not set', { status: 500 })

  const { data: appts, error } = await db
    .from('appointments')
    .select('time, type, status, confirmation_status, patient_id, patients(name, phone)')
    .eq('date', dateStr)
    .is('deleted_at', null)
    .neq('status', 'отменён')
    .or('confirmation_status.is.null,confirmation_status.neq.cancelled')
    .order('time')
  if (error) return new Response(error.message, { status: 500 })

  const title = `${mode === 'today' ? '☀️ Сегодня' : '🌙 Завтра'}, ${day.getDate()} ${MONTHS_G[day.getMonth()]}, ${DAYS[day.getDay()]}`
  let text: string
  if (!appts?.length) {
    text = `<b>${title}</b>\n\nЗаписей нет.`
  } else {
    const lines = appts.map((a) => {
      const p = a.patients as { name?: string; phone?: string } | null
      const time = (a.time || '').slice(0, 5)
      const name = esc(p?.name || 'Без имени')
      const phone = p?.phone ? ` · ${esc(p.phone)}` : ''
      return `${confIcon(a.confirmation_status)} <b>${time}</b> — <a href="${CRM_URL}#patient=${a.patient_id}">${name}</a>${phone}\n      ${esc(a.type || '')}`
    })
    text = `<b>${title}</b>\n${appts.length} ${plural(appts.length)}\n\n${lines.join('\n\n')}\n\n✅ подтвердил · ⏳ без ответа · 🔄 просит перенос`
  }

  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: Number(chatId), text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
  return new Response(`${mode} ${dateStr}: ${appts?.length || 0} → tg ${r.status}`)
})
