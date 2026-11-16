// Общий рендер историй 1080×1920 (satori → SVG → resvg PNG).
// Одинаково работает в Node (тест) и в Deno (Supabase Edge Function): ресурсы подаёт вызывающий код.

export const W = 1080, H = 1920
// Положение кнопки — фиксированное, чтобы наложить кликабельную ссылку (StoryArea) точно на неё
export const CTA = { x: 80, y: 1500, w: 920, h: 150 }
export const ctaArea = (url) => ({
  position: {
    x_percentage: (CTA.x + CTA.w / 2) / W * 100,
    y_percentage: (CTA.y + CTA.h / 2) / H * 100,
    width_percentage: CTA.w / W * 100,
    height_percentage: CTA.h / H * 100,
    rotation_angle: 0,
    corner_radius_percentage: 8,
  },
  type: { type: 'link', url },
})

const C = { ink: '#1B2A3A', sub: '#3A4A5B', mute: '#5B6B7C', blue: '#1A6DB5', line: '#D6E4F3', tint: '#F0F6FF', white: '#FFFFFF' }

const h = (type, style, children) => ({ type, props: { style: { display: 'flex', ...style }, children } })
const txt = (s, style) => ({ type: 'div', props: { style: { display: 'block', ...style }, children: s } })

function header(d) {
  const av = d.avatar
    ? { type: 'img', props: { src: d.avatar, width: 132, height: 132, style: { width: 132, height: 132, borderRadius: 66, objectFit: 'cover' } } }
    : h('div', { width: 132, height: 132, borderRadius: 66, background: d.bg === 'tint' ? C.white : C.line, color: C.blue, alignItems: 'center', justifyContent: 'center', fontSize: 48, fontFamily: 'Manrope, ManropeCyr, ManropeExt', fontWeight: 700 }, 'АН')
  return h('div', { alignItems: 'center', gap: 34 }, [
    av,
    h('div', { flexDirection: 'column' }, [
      txt(d.brandName || 'Анна Новосёлова', { fontFamily: 'Manrope, ManropeCyr, ManropeExt', fontWeight: 700, fontSize: 46, color: C.ink }),
      txt(d.brandSub || 'оптометрист · Optika Ginter', { fontSize: 38, color: C.blue, marginTop: 6 }),
    ]),
  ])
}

function title(s, mt = 100, fs = 92) {
  return txt(s, { fontFamily: 'Manrope, ManropeCyr, ManropeExt', fontWeight: 700, fontSize: fs, lineHeight: 1.15, color: C.ink, marginTop: mt })
}
const para = (s, style = {}) => txt(s, { fontSize: 50, lineHeight: 1.5, color: C.sub, ...style })

function rows(list) {
  return h('div', { flexDirection: 'column', marginTop: 50, borderBottom: `3px solid ${C.line}` },
    list.map(([a, b, muted]) => h('div', { justifyContent: 'space-between', borderTop: `3px solid ${C.line}`, padding: '38px 0', fontSize: 56, color: C.ink }, [
      txt(a), txt(b, { fontWeight: muted ? 400 : 500, color: muted ? '#8A97A5' : C.ink }),
    ])))
}

function cta(label, sub, address) {
  return [
    h('div', { position: 'absolute', left: CTA.x, top: CTA.y, width: CTA.w, height: CTA.h, background: C.blue, borderRadius: 36, alignItems: 'center', justifyContent: 'center', color: C.white, fontSize: 50, fontWeight: 500 }, label),
    h('div', { position: 'absolute', left: CTA.x, top: CTA.y + CTA.h + 30, width: CTA.w, flexDirection: 'column', alignItems: 'center' }, [
      txt(sub, { fontSize: 38, color: C.mute }),
      txt(address, { fontSize: 38, color: C.mute, marginTop: 10 }),
    ]),
  ]
}

const BOOK = 'Записаться · zapis.optometrist.rs'
const ADDR = 'Trg Republike 25, Novi Sad'

export function buildStory(kind, d) {
  const body = []
  if (kind === 'schedule') {
    body.push(title(d.title), para(d.period, { marginTop: 16, color: C.mute }), rows(d.rows))
    if (d.text) body.push(para(d.text, { marginTop: 56 }))
    body.push(...cta(BOOK, 'или по ссылке в профиле', ADDR))
  } else if (kind === 'slots') {
    body.push(title(d.title), para(d.dateLabel, { marginTop: 16, color: C.mute }))
    for (const g of d.groups) {
      if (!g.times.length) continue
      body.push(h('div', { flexDirection: 'column', marginTop: 56 }, [
        txt(g.label, { fontSize: 44, color: C.mute }),
        h('div', { flexWrap: 'wrap', gap: 22, marginTop: 20 }, g.times.map(t =>
          h('div', { background: C.white, color: C.blue, fontSize: 56, fontWeight: 500, padding: '18px 40px', borderRadius: 26 }, t))),
      ]))
    }
    if (d.text) body.push(para(d.text, { marginTop: 56 }))
    body.push(...cta(BOOK, 'или по ссылке в профиле', ADDR))
  } else if (kind === 'frame') {
    body.push(title(d.title, 60, 76))
    body.push(h('div', { marginTop: 36, width: 920, height: 440, borderRadius: 36, background: C.tint, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
      d.photo ? { type: 'img', props: { src: d.photo, width: 920, height: 440, style: { width: 920, height: 440, objectFit: 'cover' } } } : txt('фото', { fontSize: 40, color: C.blue })))
    body.push(txt(d.name, { fontFamily: 'Manrope, ManropeCyr, ManropeExt', fontWeight: 700, fontSize: 60, color: C.ink, marginTop: 36 }))
    if (d.meta) body.push(para(d.meta, { fontSize: 42, color: C.mute, marginTop: 6 }))
    body.push(h('div', { alignItems: 'baseline', gap: 26, marginTop: 22 }, [
      txt(d.price, { fontFamily: 'Manrope, ManropeCyr, ManropeExt', fontWeight: 700, fontSize: 72, color: d.oldPrice ? '#B3261E' : C.ink }),
      ...(d.oldPrice ? [txt(d.oldPrice, { fontSize: 46, color: C.mute, textDecoration: 'line-through' })] : []),
    ]))
    if (d.text) body.push(para(d.text, { fontSize: 44, marginTop: 18 }))
    body.push(...cta('Забронировать · optikaginter.rs', 'или по ссылке в профиле', 'Optika Ginter · ' + ADDR))
  } else if (kind === 'nosat') {
    body.push(title(d.title), para(d.text, { marginTop: 40 }), rows(d.rows))
    if (d.text2) body.push(para(d.text2, { fontSize: 46, marginTop: 50 }))
    body.push(...cta(BOOK, 'или по ссылке в профиле', ADDR))
  }
  return h('div', {
    width: W, height: H, flexDirection: 'column', position: 'relative', padding: '170px 80px',
    background: d.bg === 'tint' ? C.tint : C.white, fontFamily: 'Inter, InterCyr, InterExt', color: C.ink,
  }, [h('div', { flexDirection: 'column', width: W - 160 }, [header(d), ...body.filter(b => b.props.style.position !== 'absolute')]),
      ...body.filter(b => b.props.style.position === 'absolute')])
}

// Эмодзи → код Twemoji (без FE0F)
export const emojiCode = (s) => [...s].map(c => c.codePointAt(0).toString(16)).filter(c => c !== 'fe0f').join('-')

export async function renderPng(tree, { satori, Resvg, fonts, emojiSvg }) {
  const svg = await satori(tree, {
    width: W, height: H, fonts,
    loadAdditionalAsset: async (code, segment) => {
      if (code === 'emoji') {
        const s = await emojiSvg(emojiCode(segment))
        return s ? 'data:image/svg+xml;base64,' + btoa(s) : ''
      }
      return []
    },
  })
  const png = new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng()
  return png
}
