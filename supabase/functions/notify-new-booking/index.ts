import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const MONTHS_G = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
const DAYS_FULL = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']

// Эта функция вызывается анонимно из booking.js (пациент в браузере, без авторизации).
// bot_token и my_chat_id никогда не покидают клиенту — читаются только здесь, на сервере, service_role ключом.
const OFFERS: Record<string,string> = { P: 'на проверку', L: 'на линзы', K: 'чек-ап', PL: 'на проверку и линзы (линзы — при заказе в день приёма)' }
const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]!))

// Промокод берём из самой записи в базе (не из запроса браузера)
async function promoLine(num: string, date: string): Promise<string> {
  try {
    const { data: a } = await db.from('appointments').select('intake')
      .eq('appointment_number', num).eq('date', date)
      .order('created_at', { ascending: false }).limit(1)
    const code = a?.[0]?.intake?.promo_code
    if (!code) return ''
    const { data: p } = await db.from('promo_codes')
      .select('offer,discount,valid_from,valid_to,active').eq('code', code).limit(1)
    const pc = p?.[0]
    if (!pc) return `\n\n🏷 Промокод: <b>${esc(code)}</b>\n⚠️ нет в справочнике — проверьте`
    const today = new Date().toISOString().slice(0, 10)
    const disc = Number(pc.discount) ? ` −${Number(pc.discount)}%` : ''
    let line = `\n\n🏷 Промокод: <b>${esc(code)}</b>${disc} ${OFFERS[pc.offer] || ''}`
    if (!pc.active) line += '\n⚠️ код выключен'
    else if (pc.valid_to && today > pc.valid_to) line += `\n⚠️ срок истёк ${pc.valid_to.split('-').reverse().join('.')}`
    else if (pc.valid_from && today < pc.valid_from) line += '\n⚠️ код ещё не начал действовать'
    return line
  } catch (e) {
    console.error('promoLine', e)
    return ''
  }
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })
  try {
    const { name, date, time, num, typeName } = await req.json()
    if (!name || !date || !time || !num) return new Response('bad request', { status: 400 })

    const { data: r } = await db.from('settings').select('key,value').eq('key', 'my_chat_id')
    const myChatId = r?.[0]?.value
    if (!myChatId) return new Response('ok', { status: 200 })

    const dt = new Date(date + 'T12:00:00')
    let msg = `📋 Новая запись онлайн!\n\nПациент: ${name}\nВид: ${typeName || ''}\n📅 ${dt.getDate()} ${MONTHS_G[dt.getMonth()]}, ${DAYS_FULL[dt.getDay()]}\n⏰ ${time}\nНомер: ${num}`
    msg += await promoLine(num, date)

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: myChatId, text: msg, parse_mode: 'HTML' }),
    })

    return new Response('ok')
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 500 })
  }
})
