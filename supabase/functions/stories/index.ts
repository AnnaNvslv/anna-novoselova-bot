// stories — черновики историй и «О себе» для Telegram для бизнеса, публикация после одобрения Анны.
// Вызовы (только с service role ключом):
//   {action:'daily', force?:string[], date?:'YYYY-MM-DD'}  — cron 9:05 пн–сб (или вручную для теста)
//   {action:'cb', data:'st_<op>_<draftId>[_<arg>]'}       — кнопки под черновиком (из telegram-bot)
//   {action:'reply', text}                                — ответ Анны на «Изменить текст» / «По коду»
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import satori from 'npm:satori@0.63.2'
import { initWasm, Resvg } from 'npm:@resvg/resvg-wasm@2.6.2'
import { buildStory, renderPng, ctaArea } from './render.js'

const BOT_TOKEN = Deno.env.get('BOT_TOKEN')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const db = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY)
const TG = `https://api.telegram.org/bot${BOT_TOKEN}`

// Каталог оправ (Ginter CRM): публичное чтение опубликованных оправ
const CAT_URL = 'https://flxewreibnkyfoccfjtg.supabase.co'
const CAT_KEY = 'sb_publishable_GtVx_U91nCREZ-fq4yfLLw_NLsvQYGQ'
const BOOK_URL = 'https://zapis.optometrist.rs'
const FRAME_URL = (id: string) => `https://optikaginter.rs/ru/okviri/#${id}`

const TZ = 'Europe/Belgrade'
const MONTHS_G = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря']
const DAYS = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота']
const KIND_NAME: Record<string, string> = { bio: '«О себе»', schedule: 'Расписание недели', slots: 'Свободные окна', frame: 'Оправа недели', nosat: 'Неделя без субботы' }
// active_period (сек) и оставлять ли в профиле после истечения
const STORY_OPTS: Record<string, { period: number; page: boolean }> = {
  schedule: { period: 172800, page: true },
  slots: { period: 43200, page: false },
  frame: { period: 86400, page: true },
  nosat: { period: 172800, page: false },
}
const SLOT_GROUPS = [
  { type: 'primary', label: '👁 Полная проверка зрения · 60 мин' },
  { type: 'express', label: '⚡ Экспресс-диагностика · 15 мин' },
  { type: 'short', label: '🛍 Помощь в оптике · 15 мин' },
]
const GENDER: Record<string, string> = { zenski: 'женская', muski: 'мужская', uniseks: 'унисекс' }
// Материал и цвет в каталоге — по-сербски; переводим по словам (как на русской версии сайта)
const RU: Record<string, string> = {
  metal: 'металл', acetat: 'ацетат', titan: 'титан', plastika: 'пластик', kombinovani: 'комбинированный', tr90: 'TR90',
  crna: 'чёрный', bela: 'белый', braon: 'коричневый', havana: 'гавана', zlatna: 'золотой', srebrna: 'серебристый', siva: 'серый',
  plava: 'синий', zelena: 'зелёный', crvena: 'красный', bordo: 'бордовый', roze: 'розовый', 'ljubičasta': 'фиолетовый', 'bež': 'бежевый',
  providna: 'прозрачный', pudra: 'пудровый', krem: 'кремовый', 'žuta': 'жёлтый', 'narandžasta': 'оранжевый', tirkizna: 'бирюзовый',
  teget: 'тёмно-синий', bakarna: 'медный', rozegold: 'розовое золото', kristalna: 'кристальный', mat: 'матовый', sjajna: 'глянцевый',
  tamno: 'тёмно', svetlo: 'светло',
}
const ru = (v: string) => String(v || '').split(/(\s+|\/|,|-)/).map(w => RU[w.toLowerCase()] ?? w).join('')

// ── дата/время по Белграду ──
function localNow() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false })
    .formatToParts(new Date()).map(x => [x.type, x.value]))
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 }
}
const dObj = (iso: string) => new Date(iso + 'T12:00:00Z')
const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (s: string, n: number) => { const d = dObj(s); d.setUTCDate(d.getUTCDate() + n); return iso(d) }
const weekday = (s: string) => dObj(s).getUTCDay()
const monday = (s: string) => addDays(s, -((weekday(s) + 6) % 7))
const dayLabel = (s: string) => `${DAYS[weekday(s)]}, ${dObj(s).getUTCDate()} ${MONTHS_G[dObj(s).getUTCMonth()]}`
function periodLabel(mon: string) {
  const sun = addDays(mon, 6), a = dObj(mon), b = dObj(sun)
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS_G[b.getUTCMonth()]}`
    : `${a.getUTCDate()} ${MONTHS_G[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS_G[b.getUTCMonth()]}`
}
const short = (r: string) => r.replace(/:00/g, '')

async function setting(key: string): Promise<string | null> {
  const { data } = await db.from('settings').select('value').eq('key', key).maybeSingle()
  return data?.value ?? null
}
async function setSetting(key: string, value: string) { await db.from('settings').upsert({ key, value }) }

async function weekShift(dateIso: string) {
  const cfg = JSON.parse((await setting('work_schedule')) || '{}')
  const weeks = cfg.weeks || []
  const diff = Math.round((dObj(monday(dateIso)).getTime() - dObj(monday(cfg.anchor)).getTime()) / (7 * 86400000))
  return weeks[((diff % weeks.length) + weeks.length) % weeks.length] as { wd: string; sat: string | null }
}

// ── Telegram ──
async function tg(method: string, body: Record<string, unknown>) {
  const r = await fetch(`${TG}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return await r.json()
}
async function tgForm(method: string, fields: Record<string, unknown>, files: Record<string, Uint8Array>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) fd.append(k, typeof v === 'string' ? v : JSON.stringify(v))
  for (const [k, v] of Object.entries(files)) fd.append(k, new Blob([v as BlobPart], { type: 'image/png' }), k + '.png')
  const r = await fetch(`${TG}/${method}`, { method: 'POST', body: fd })
  return await r.json()
}

// ── рендер ──
let _ready: Promise<void> | null = null
const ASSET = 'https://cdn.jsdelivr.net/npm'
let FONTS: unknown[] = []
function ensureRender() {
  if (!_ready) _ready = (async () => {
    await initWasm(fetch(`${ASSET}/@resvg/resvg-wasm@2.6.2/index_bg.wasm`))
    const list: [string, string, number][] = [
      ['Manrope', 'manrope/files/manrope-latin-700-normal.woff', 700], ['ManropeCyr', 'manrope/files/manrope-cyrillic-700-normal.woff', 700],
      ['Inter', 'inter/files/inter-latin-400-normal.woff', 400], ['InterCyr', 'inter/files/inter-cyrillic-400-normal.woff', 400],
      ['Inter', 'inter/files/inter-latin-500-normal.woff', 500], ['InterCyr', 'inter/files/inter-cyrillic-500-normal.woff', 500],
      ['ManropeExt', 'manrope/files/manrope-latin-ext-700-normal.woff', 700],
      ['InterExt', 'inter/files/inter-latin-ext-400-normal.woff', 400], ['InterExt', 'inter/files/inter-latin-ext-500-normal.woff', 500],
    ]
    FONTS = await Promise.all(list.map(async ([name, p, weight]) => ({
      name, weight, style: 'normal', data: await (await fetch(`${ASSET}/@fontsource/${p.split('/')[0]}@5.3.0/${p.split('/').slice(1).join('/')}`)).arrayBuffer(),
    })))
  })()
  return _ready
}
const emojiSvg = async (code: string) => {
  const r = await fetch(`${ASSET}/@twemoji/svg@15.0.0/${code}.svg`)
  return r.ok ? await r.text() : ''
}
function b64(buf: ArrayBuffer) {
  const u = new Uint8Array(buf); let s = ''
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000))
  return btoa(s)
}
async function dataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url); if (!r.ok) return null
    const ct = r.headers.get('content-type') || 'image/jpeg'
    return `data:${ct.includes('png') ? 'image/png' : 'image/jpeg'};base64,${b64(await r.arrayBuffer())}`
  } catch { return null }
}
let _avatar: string | null | undefined
async function avatar() {
  if (_avatar !== undefined) return _avatar
  _avatar = null
  const me = await setting('my_chat_id')
  if (!me) return null
  const ph = await tg('getUserProfilePhotos', { user_id: Number(me), limit: 1 })
  const sizes = ph?.result?.photos?.[0]
  if (sizes?.length) {
    const f = await tg('getFile', { file_id: sizes[Math.min(1, sizes.length - 1)].file_id })
    if (f?.result?.file_path) _avatar = await dataUrl(`https://api.telegram.org/file/bot${BOT_TOKEN}/${f.result.file_path}`)
  }
  return _avatar
}
async function render(kind: string, d: Record<string, any>) {
  await ensureRender()
  const view: Record<string, any> = { ...d, avatar: await avatar() }
  if (kind === 'slots') view.groups = (d.groups || []).map((g: any) => ({ label: g.label, times: g.times.filter((t: any) => t.on).map((t: any) => t.t) }))
  if (kind === 'frame') view.photo = d.frame?.photo ? await dataUrl(d.frame.photo) : null
  return await renderPng(buildStory(kind, view), { satori, Resvg, fonts: FONTS, emojiSvg })
}

// ── каталог оправ ──
async function frameList() {
  const r = await fetch(`${CAT_URL}/rest/v1/frames?select=id,code,brand,model,gender,material,color,price,sale_price,photos,is_featured,created_at&order=is_featured.desc,created_at.desc`,
    { headers: { apikey: CAT_KEY, Authorization: `Bearer ${CAT_KEY}` } })
  const rows = r.ok ? await r.json() : []
  return (rows as any[]).filter(f => f.photos?.length)
}
const money = (n: number) => `${Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ')} дин.`
function frameData(f: any) {
  const meta = [GENDER[f.gender], f.material && ru(f.material), f.color && ru(f.color)].filter(Boolean).join(' · ')
  const sale = f.sale_price && Number(f.sale_price) < Number(f.price)
  return {
    id: f.id, code: f.code, photo: f.photos[0], name: [f.brand, f.model].filter(Boolean).join(' '), meta,
    price: money(sale ? f.sale_price : f.price), oldPrice: sale ? money(f.price) : null,
  }
}

// ── сборка черновиков ──
async function buildDraft(kind: string, date: string): Promise<Record<string, any> | null> {
  const mon = monday(date)
  const sh = await weekShift(date)
  if (kind === 'bio') {
    const base = (await setting('bio_base')) || ''
    return { text: `${base} · Эта неделя: пн–пт ${short(sh.wd)}${sh.sat ? `, сб ${short(sh.sat)}` : ''}`.slice(0, 140) }
  }
  if (kind === 'schedule') {
    const rows: (string | boolean)[][] = [['пн–пт', sh.wd]]
    rows.push(sh.sat ? ['суббота', sh.sat] : ['суббота', 'отдыхаю', true])
    rows.push(['воскресенье', 'отдыхаю', true])
    return { title: 'Привет! На этой неделе я в оптике', period: periodLabel(mon), rows, text: 'Заходите проверить зрение или просто посоветоваться про очки 🙂' }
  }
  if (kind === 'slots') {
    const { data } = await db.from('available_slots').select('start_time, slot_type').eq('date', date).eq('is_booked', false).order('start_time')
    if (!data?.length) return null
    const groups = SLOT_GROUPS.map(g => ({
      ...g, times: data.filter((s: any) => (s.slot_type || 'short') === g.type).map((s: any) => ({ t: String(s.start_time).slice(0, 5), on: true })),
    })).filter(g => g.times.length)
    return { bg: 'tint', title: 'Сегодня есть свободное время ✨', dateLabel: dayLabel(date), groups, text: 'Пишите или записывайтесь, жду вас!' }
  }
  if (kind === 'frame') {
    const list = await frameList()
    if (!list.length) return null
    const idx = (Number(await setting('frame_idx')) || 0) % list.length
    await setSetting('frame_idx', String(idx + 1))
    return { title: 'Моя находка недели 👓', frame: frameData(list[idx]), idx, text: 'Приходите примерить, забронирую для вас' }
  }
  if (kind === 'nosat') {
    if (sh.sat) return null
    const end = sh.wd.split('–')[1] || ''
    return { title: 'В эту субботу меня не будет 🙈', text: `Если откладывали проверку зрения — успейте до пятницы, ${end}`, rows: [['пн–пт', sh.wd]], text2: 'А со следующей недели снова работаю и по субботам' }
  }
  return null
}

function kindsFor(date: string, slotDays: number[]) {
  const wd = weekday(date), k: string[] = []
  if (wd === 1) k.push('bio', 'schedule')
  if (slotDays.includes(wd)) k.push('slots')
  if (wd === 3) k.push('frame')
  if (wd === 4) k.push('nosat')
  return k
}

// ── сообщение-черновик Анне ──
function caption(dr: any) {
  const head = `📝 Черновик: ${KIND_NAME[dr.kind]}`
  if (dr.status === 'published') return `${head}\n✅ Опубликовано`
  if (dr.status === 'skipped') return `${head}\n⏭ Пропущено`
  if (dr.status === 'failed') return `${head}\n⚠️ Не удалось опубликовать: ${dr.error || ''}`
  if (dr.kind === 'bio') return `${head}\n\n${dr.data.text}\n\n(${dr.data.text.length}/140 символов)`
  let tail = ''
  if (dr.kind === 'slots') tail = '\nНажми на время, чтобы убрать его из истории или вернуть.'
  if (dr.kind === 'frame') tail = `\nОправа: ${dr.data.frame?.name} (шифр ${dr.data.frame?.code || '—'})\n◀ ▶ — другая оправа, 🔎 — выбрать по шифру.`
  return `${head}${tail}\n\nПубликовать?`
}
function keyboard(dr: any) {
  if (dr.status !== 'pending') return { inline_keyboard: [] }
  const id = dr.id, rows: any[] = []
  if (dr.kind === 'slots') {
    dr.data.groups.forEach((g: any, gi: number) => {
      const btns = g.times.map((t: any, ti: number) => ({ text: (t.on ? '✅ ' : '✖️ ') + t.t, callback_data: `st_tg_${id}_${gi}.${ti}` }))
      for (let i = 0; i < btns.length; i += 4) rows.push(btns.slice(i, i + 4))
    })
  }
  if (dr.kind === 'frame') rows.push([{ text: '◀', callback_data: `st_fp_${id}` }, { text: '▶', callback_data: `st_fn_${id}` }, { text: '🔎 По шифру', callback_data: `st_fc_${id}` }])
  rows.push([
    { text: dr.kind === 'bio' ? '✅ Сохранить' : '✅ Опубликовать', callback_data: `st_pub_${id}` },
    { text: '✏️ Изменить', callback_data: `st_edit_${id}` },
    { text: '⏭ Пропустить', callback_data: `st_skip_${id}` },
  ])
  return { inline_keyboard: rows }
}

async function sendDraft(dr: any) {
  const me = Number(await setting('my_chat_id'))
  let res
  if (dr.kind === 'bio') res = await tg('sendMessage', { chat_id: me, text: caption(dr), reply_markup: keyboard(dr) })
  else res = await tgForm('sendPhoto', { chat_id: String(me), caption: caption(dr), reply_markup: keyboard(dr) }, { photo: await render(dr.kind, dr.data) })
  if (res?.ok) await db.from('story_drafts').update({ tg_message_id: res.result.message_id }).eq('id', dr.id)
  else console.error('sendDraft', JSON.stringify(res))
}

async function refreshDraft(dr: any, rerender = true) {
  const me = Number(await setting('my_chat_id'))
  if (!dr.tg_message_id) return
  if (dr.kind === 'bio') {
    await tg('editMessageText', { chat_id: me, message_id: dr.tg_message_id, text: caption(dr), reply_markup: keyboard(dr) })
  } else if (rerender) {
    await tgForm('editMessageMedia', {
      chat_id: String(me), message_id: String(dr.tg_message_id),
      media: { type: 'photo', media: 'attach://photo', caption: caption(dr) }, reply_markup: keyboard(dr),
    }, { photo: await render(dr.kind, dr.data) })
  } else {
    await tg('editMessageCaption', { chat_id: me, message_id: dr.tg_message_id, caption: caption(dr), reply_markup: keyboard(dr) })
  }
}

async function saveData(dr: any) {
  await db.from('story_drafts').update({ data: dr.data, updated_at: new Date().toISOString() }).eq('id', dr.id)
}

// ── публикация ──
async function publish(dr: any) {
  const bc = await setting('business_connection_id')
  if (!bc) return 'бот не подключён к Telegram для бизнеса'
  if (dr.kind === 'bio') {
    const r = await tg('setBusinessAccountBio', { business_connection_id: bc, bio: dr.data.text })
    return r.ok ? null : r.description
  }
  if (dr.kind === 'slots' && dr.for_date !== localNow().date) return 'черновик устарел — окна были на другой день'
  if (dr.kind === 'slots' && !dr.data.groups.some((g: any) => g.times.some((t: any) => t.on))) return 'не выбрано ни одного окна'
  const png = await render(dr.kind, dr.data)
  const o = STORY_OPTS[dr.kind]
  const url = dr.kind === 'frame' ? FRAME_URL(dr.data.frame.id) : BOOK_URL
  const fields: Record<string, unknown> = {
    business_connection_id: bc, content: { type: 'photo', photo: 'attach://story' },
    active_period: String(o.period), post_to_chat_page: String(o.page), areas: [ctaArea(url)],
  }
  let r = await tgForm('postStory', fields, { story: png })
  if (!r.ok && /area|link|premium/i.test(r.description || '')) {
    delete fields.areas
    r = await tgForm('postStory', fields, { story: png })
    if (r.ok) await tg('sendMessage', { chat_id: Number(await setting('my_chat_id')), text: `ℹ️ История опубликована, но Telegram не принял кликабельную ссылку на кнопке (${r.description || 'ограничение аккаунта'}). Ссылка остаётся в профиле.` })
  }
  if (r.ok) await db.from('story_drafts').update({ story_id: r.result?.id ?? null }).eq('id', dr.id)
  return r.ok ? null : r.description
}

// ── обработчики ──
async function daily(body: any) {
  const now = localNow()
  const date = body.date || now.date
  if (!body.force && (now.hour !== 9 || weekday(date) === 0)) return 'not now'
  const slotDays: number[] = JSON.parse((await setting('story_slot_days')) || '[2,4]')
  const kinds: string[] = body.force?.length ? body.force : kindsFor(date, slotDays)
  const out: string[] = []
  for (const kind of kinds) {
    const { data: exists } = await db.from('story_drafts').select('id').eq('kind', kind).eq('for_date', date).maybeSingle()
    if (exists && !body.force) { out.push(`${kind}: exists`); continue }
    if (exists) await db.from('story_drafts').delete().eq('id', exists.id)
    const data = await buildDraft(kind, date)
    if (!data) { out.push(`${kind}: nothing`); continue }
    const { data: dr } = await db.from('story_drafts').insert({ kind, for_date: date, data }).select().single()
    if (dr) { await sendDraft(dr); out.push(`${kind}: sent`) }
  }
  return out.join(', ')
}

async function onCallback(data: string) {
  const [, op, id, arg] = data.split('_')
  const { data: dr } = await db.from('story_drafts').select('*').eq('id', id).maybeSingle()
  if (!dr || dr.status !== 'pending') return
  const me = Number(await setting('my_chat_id'))
  if (op === 'tg' && dr.kind === 'slots') {
    const [gi, ti] = (arg || '').split('.').map(Number)
    const t = dr.data.groups?.[gi]?.times?.[ti]
    if (!t) return
    t.on = !t.on
    await saveData(dr); await refreshDraft(dr)
  } else if ((op === 'fp' || op === 'fn') && dr.kind === 'frame') {
    const list = await frameList()
    if (!list.length) return
    const cur = list.findIndex(f => f.id === dr.data.frame?.id)
    const next = ((cur < 0 ? 0 : cur) + (op === 'fn' ? 1 : -1) + list.length) % list.length
    dr.data.frame = frameData(list[next]); dr.data.idx = next
    await saveData(dr); await refreshDraft(dr)
  } else if (op === 'fc' && dr.kind === 'frame') {
    await setSetting('story_await', JSON.stringify({ id, mode: 'code' }))
    await tg('sendMessage', { chat_id: me, text: '🔎 Пришли шифр оправы или бренд и модель — найду в каталоге.\nОтмена: /cancel' })
  } else if (op === 'edit') {
    await setSetting('story_await', JSON.stringify({ id, mode: 'text' }))
    const cur = dr.kind === 'bio' ? dr.data.text : [dr.data.title, dr.data.text, dr.data.text2].filter(Boolean).join('\n')
    await tg('sendMessage', {
      chat_id: me,
      text: (dr.kind === 'bio' ? '✏️ Пришли новый текст «О себе» (до 140 символов).' : '✏️ Пришли новый текст: первая строка — заголовок, дальше — текст под ним.') +
        '\n\nСейчас:\n' + cur + '\n\nОтмена: /cancel',
    })
  } else if (op === 'skip') {
    dr.status = 'skipped'
    await db.from('story_drafts').update({ status: 'skipped', updated_at: new Date().toISOString() }).eq('id', id)
    await refreshDraft(dr, false)
  } else if (op === 'pub') {
    const err = await publish(dr)
    dr.status = err ? 'failed' : 'published'; dr.error = err
    await db.from('story_drafts').update({ status: dr.status, error: err, updated_at: new Date().toISOString() }).eq('id', id)
    if (err) {
      // оставляем черновик активным, чтобы можно было поправить и опубликовать снова
      await tg('sendMessage', { chat_id: me, text: `⚠️ Не удалось: ${err}` })
      dr.status = 'pending'
      await db.from('story_drafts').update({ status: 'pending' }).eq('id', id)
      return
    }
    await refreshDraft(dr, false)
    if (dr.kind === 'schedule') await tg('sendMessage', { chat_id: me, text: '📌 Чтобы история с расписанием была первой в профиле: открой свой профиль → истории → нажми на эту историю → «Закрепить».' })
  }
}

async function onReply(text: string) {
  const aw = JSON.parse((await setting('story_await')) || 'null')
  if (!aw) return 'no-await'
  const me = Number(await setting('my_chat_id'))
  await setSetting('story_await', '')
  if (text.trim() === '/cancel') { await tg('sendMessage', { chat_id: me, text: 'Ок, ничего не меняю.' }); return 'cancel' }
  const { data: dr } = await db.from('story_drafts').select('*').eq('id', aw.id).maybeSingle()
  if (!dr || dr.status !== 'pending') return 'gone'
  if (aw.mode === 'code') {
    const q = text.trim().toLowerCase()
    const list = await frameList()
    const hit = list.find(f => String(f.code || '').toLowerCase() === q) ||
      list.find(f => `${f.brand} ${f.model}`.toLowerCase().includes(q)) ||
      list.find(f => String(f.code || '').toLowerCase().includes(q))
    if (!hit) {
      await setSetting('story_await', JSON.stringify(aw))
      await tg('sendMessage', { chat_id: me, text: 'Не нашла такую оправу среди опубликованных в каталоге. Пришли другой шифр или /cancel' })
      return 'not-found'
    }
    dr.data.frame = frameData(hit)
  } else if (dr.kind === 'bio') {
    const t = text.trim()
    if (t.length > 140) {
      await setSetting('story_await', JSON.stringify(aw))
      await tg('sendMessage', { chat_id: me, text: `Получилось ${t.length} символов, а можно максимум 140. Сократи, пожалуйста, или /cancel` })
      return 'too-long'
    }
    dr.data.text = t
  } else {
    const lines = text.split('\n').map(s => s.trim())
    dr.data.title = lines[0]
    dr.data.text = lines.slice(1).filter(Boolean).join('\n')
    delete dr.data.text2
  }
  await saveData(dr)
  // присылаем обновлённый черновик заново — внизу чата, чтобы его было видно
  if (dr.tg_message_id) await tg('deleteMessage', { chat_id: me, message_id: dr.tg_message_id })
  await sendDraft(dr)
  return 'ok'
}

serve(async (req) => {
  // Подпись JWT проверяет сама платформа (функция деплоится с проверкой JWT); здесь пускаем только service_role
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  let role = ''
  try { role = JSON.parse(atob(tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role } catch { /* */ }
  if (tok !== SERVICE_KEY && role !== 'service_role') return new Response('forbidden', { status: 403 })
  try {
    const body = await req.json().catch(() => ({}))
    let out = ''
    if (body.action === 'daily') out = await daily(body)
    else if (body.action === 'cb') await onCallback(String(body.data || ''))
    else if (body.action === 'reply') out = await onReply(String(body.text || ''))
    return new Response(out || 'ok')
  } catch (e) {
    console.error(e)
    return new Response('error: ' + (e as Error).message, { status: 500 })
  }
})
