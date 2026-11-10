// Отправка сообщения в Telegram из CRM. Токен бота — только на сервере (BOT_TOKEN).
// Вызывать может только залогиненный сотрудник (есть в user_roles).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const admin = createClient(SUPABASE_URL, SERVICE_KEY)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405)

  const auth = req.headers.get('Authorization') || ''
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return json({ ok: false, error: 'unauthorized' }, 401)
  const { data: role } = await admin.from('user_roles').select('role').eq('user_id', user.id).maybeSingle()
  if (!role) return json({ ok: false, error: 'forbidden' }, 403)

  let body: { chat_id?: number | string; text?: string }
  try { body = await req.json() } catch { return json({ ok: false, error: 'bad json' }, 400) }
  const chat_id = body.chat_id
  const text = String(body.text || '')
  if (!chat_id || !text) return json({ ok: false, error: 'chat_id and text required' }, 400)

  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id, text: text.slice(0, 4096), parse_mode: 'HTML' }),
  }).then(r => r.json()).catch(() => ({ ok: false }))
  return json({ ok: !!r.ok, description: r.ok ? undefined : r.description })
})
