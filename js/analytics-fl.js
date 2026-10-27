// ═══ ANALYTICS: оправы и линзы по периодам ═══
// Блок внизу раздела «Аналитика»: выручка по месяцам/годам с разбивкой на оправы,
// очковые линзы, МКЛ и работу; средняя цена оправы и пары линз; сравнение с тем же
// периодом прошлого года; доли оправ и линз по ценовым диапазонам.
// Заказ = orderTotal(o). Удалённые (deleted_at) и возвраты (status='возврат') не считаются.
// Дата заказа — orderDateOf(o); заказ с неизвестной датой не попадает никуда.

let _flPeriod = 'month'; // 'month' | 'year'
let _flRows = null;

const _FL_FRAME_BUCKETS = [
  { label: 'до 3 000', max: 2999 }, { label: '3 000–5 999', max: 5999 }, { label: '6 000–8 999', max: 8999 },
  { label: '9 000–12 999', max: 12999 }, { label: '13 000+', max: Infinity },
];
const _FL_LENS_BUCKETS = [
  { label: 'до 1 000', max: 1000 }, { label: '1 001–1 600', max: 1600 }, { label: '1 601–3 000', max: 3000 },
  { label: '3 001–5 000', max: 5000 }, { label: '5 001–10 000', max: 10000 }, { label: '10 000+', max: Infinity },
];
const _FL_BLUES = ['#B5D4F4', '#85B7EB', '#378ADD', '#185FA5', '#0C447C', '#062b4f'];
const _FL_TEALS = ['#E1F5EE', '#9FE1CB', '#5DCAA5', '#1D9E75', '#0F6E56', '#085041'];
const _FL_SERIES = [
  { key: 'fp', color: '#d97706', label: 'fl_frames' },
  { key: 'ln', color: '#1B4F72', label: 'fl_lenses' },
  { key: 'cl', color: '#0891b2', label: 'fl_cl' },
  { key: 'w', color: '#94A3B8', label: 'fl_work' },
];

async function _flLoad() {
  const host = document.getElementById('an-fl');
  if (!host) return;
  host.innerHTML = `<div class="card"><div class="spinner">${t('loading')}</div></div>`;
  const { data, error } = await db.from('orders')
    .select('id,type,status,order_date,order_date_prec,created_at,frame_price,lens_price,lens_qty,work_price')
    .is('deleted_at', null);
  if (error) { host.innerHTML = `<div class="card"><div class="empty"><p>${t('fl_load_error')}</p></div></div>`; return; }
  _flRows = (data || []).filter(o => o.status !== 'возврат').map(o => {
    const d = orderDateOf(o);
    if (!d) return null;
    const isCL = o.type === 'МКЛ';
    const qty = o.lens_qty != null ? +o.lens_qty : 2;
    const lensSum = (+o.lens_price || 0) * qty;
    return {
      date: d, y: d.slice(0, 4), ym: o.order_date_prec === 'year' ? null : d.slice(0, 7),
      isCL, fp: +o.frame_price || 0, lp: isCL ? 0 : (+o.lens_price || 0), lq: isCL ? 0 : qty,
      ln: isCL ? 0 : lensSum, cl: isCL ? lensSum : 0, w: +o.work_price || 0, tot: orderTotal(o),
      clientFrame: !isCL && !(+o.frame_price) && o.type === 'Очки',
    };
  }).filter(Boolean);
  _flRender();
}

function _flSetPeriod(p) { _flPeriod = p; _flRender(); }

function _flAgg(list) {
  const a = { orders: list.length, cl_orders: 0, fp: 0, fn: 0, fc: 0, ln: 0, lq: 0, cl: 0, w: 0, tot: 0, paid: 0 };
  list.forEach(r => {
    if (r.isCL) a.cl_orders++;
    a.fp += r.fp; if (r.fp > 0) a.fn++; if (r.clientFrame) a.fc++;
    a.ln += r.ln; if (r.ln > 0) a.lq += r.lq;
    a.cl += r.cl; a.w += r.w; a.tot += r.tot; if (r.tot > 0) a.paid++;
  });
  a.check = a.paid ? Math.round(a.tot / a.paid) : null;
  a.frameAvg = a.fn ? Math.round(a.fp / a.fn) : null;
  a.lensPair = a.lq ? Math.round(a.ln * 2 / a.lq) : null;
  return a;
}

function _flLabel(key, short) {
  if (key.length !== 7) return key;
  const m = t('months')[+key.slice(5, 7) - 1];
  return short ? `${m.slice(0, 3)} ${key.slice(2, 4)}` : `${m} ${key.slice(0, 4)}`;
}

function _flKeys() {
  if (_flPeriod === 'year') return [...new Set(_flRows.map(r => r.y))].sort();
  const months = _flRows.filter(r => r.ym).map(r => r.ym).sort();
  if (!months.length) return [];
  const keys = [];
  const now = new Date();
  const last = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let [y, m] = months[0].split('-').map(Number);
  const startLimit = new Date(now.getFullYear(), now.getMonth() - 23, 1);
  if (new Date(y, m - 1, 1) < startLimit) { y = startLimit.getFullYear(); m = startLimit.getMonth() + 1; }
  for (;;) {
    const k = `${y}-${String(m).padStart(2, '0')}`;
    keys.push(k);
    if (k >= last) break;
    m++; if (m > 12) { m = 1; y++; }
  }
  return keys;
}

function _flDelta(cur, prev, money) {
  if (cur == null || !prev) return `<div class="stat-sub">${t('fl_no_compare')}</div>`;
  const d = (cur / prev - 1) * 100;
  const color = d >= 0 ? 'var(--green)' : 'var(--red)';
  const pct = (d > 0 ? '+' : '') + d.toFixed(1).replace('.', ',') + '%';
  return `<div class="stat-sub"><span style="color:${color};font-weight:700">${pct}</span> · ${t('fl_was')} ${money ? fmtMoney(prev) : prev}</div>`;
}

function _flRender() {
  const host = document.getElementById('an-fl');
  if (!host || !_flRows) return;
  const money = v => (v == null ? '—' : fmtMoney(v));

  const today = new Date();
  const cy = String(today.getFullYear()), py = String(today.getFullYear() - 1);
  const mmdd = today.toISOString().slice(5, 10);
  const dated = _flRows.filter(r => r.ym);
  const cur = _flAgg(dated.filter(r => r.y === cy && r.date.slice(5, 10) <= mmdd));
  const prev = _flAgg(dated.filter(r => r.y === py && r.date.slice(5, 10) <= mmdd));

  const keys = _flKeys();
  const keyOf = r => (_flPeriod === 'year' ? r.y : r.ym);
  const byKey = {};
  _flRows.forEach(r => { const k = keyOf(r); if (k) (byKey[k] ??= []).push(r); });
  const aggs = keys.map(k => ({ key: k, ..._flAgg(byKey[k] || []) }));

  const segKeys = _flPeriod === 'year' ? keys : keys.slice(-12);
  const frameSeg = _flSegRows(_flRows.filter(r => r.fp > 0), segKeys, keyOf, _FL_FRAME_BUCKETS, r => r.fp, () => 1);
  const lensSeg = _flSegRows(_flRows.filter(r => r.lp > 0 && r.lq > 0), segKeys, keyOf, _FL_LENS_BUCKETS, r => r.lp, r => r.lq);

  host.innerHTML = `
    <div class="card mb-12">
      <div class="card-header" style="flex-wrap:wrap;gap:10px">
        <span class="card-title">👓 ${t('fl_title')}</span>
        <div class="filter-bar">
          <button class="filter-btn${_flPeriod === 'month' ? ' active' : ''}" onclick="_flSetPeriod('month')">${t('fl_by_month')}</button>
          <button class="filter-btn${_flPeriod === 'year' ? ' active' : ''}" onclick="_flSetPeriod('year')">${t('fl_by_year')}</button>
        </div>
      </div>

      <div class="text-m text-sm" style="margin-bottom:10px">${t('fl_yoy_note').replace('%cy', cy).replace('%py', py).replace('%d', fmt(today.toISOString().slice(0, 10)))}</div>
      <div class="stats-grid" style="margin-bottom:18px">
        <div class="stat-card"><div class="stat-label">${t('fl_revenue')}</div><div class="stat-value">${money(cur.tot)}</div>${_flDelta(cur.tot, prev.tot, true)}</div>
        <div class="stat-card"><div class="stat-label">${t('fl_orders')}</div><div class="stat-value">${cur.orders}</div>${_flDelta(cur.orders, prev.orders, false)}</div>
        <div class="stat-card"><div class="stat-label">${t('fl_check')}</div><div class="stat-value">${money(cur.check)}</div>${_flDelta(cur.check, prev.check, true)}</div>
        <div class="stat-card"><div class="stat-label">${t('fl_frame_avg')}</div><div class="stat-value">${money(cur.frameAvg)}</div>${_flDelta(cur.frameAvg, prev.frameAvg, true)}</div>
        <div class="stat-card"><div class="stat-label">${t('fl_lens_pair')}</div><div class="stat-value">${money(cur.lensPair)}</div>${_flDelta(cur.lensPair, prev.lensPair, true)}</div>
      </div>

      <div class="fw-6" style="margin-bottom:8px">${t('fl_chart_title')}</div>
      ${_flChartHtml(aggs)}
      <div style="display:flex;flex-wrap:wrap;gap:14px;margin:8px 0 20px;font-size:12.5px;color:var(--text-m)">
        ${_FL_SERIES.map(s => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${s.color};margin-right:5px;vertical-align:-1px"></span>${t(s.label)}</span>`).join('')}
      </div>

      <div class="table-wrap"><table>
        <thead><tr>
          <th>${_flPeriod === 'year' ? t('fl_year') : t('fl_month')}</th><th>${t('fl_orders')}</th><th>${t('fl_of_them_cl')}</th>
          <th>${t('fl_revenue')}</th><th>${t('fl_check')}</th><th>${t('fl_frames_sold')}</th><th>${t('fl_client_frames')}</th>
          <th>${t('fl_frames_sum')}</th><th>${t('fl_frame_avg')}</th><th>${t('fl_lenses_sum')}</th><th>${t('fl_lens_pair')}</th>
          <th>${t('fl_cl_sum')}</th><th>${t('fl_work')}</th>
        </tr></thead>
        <tbody>${[...aggs].reverse().filter(a => a.orders).map(a => `<tr>
          <td class="fw-6">${_flLabel(a.key)}</td><td>${a.orders}</td><td>${a.cl_orders}</td>
          <td class="money">${money(a.tot)}</td><td>${money(a.check)}</td><td>${a.fn}</td><td>${a.fc}</td>
          <td>${money(a.fp)}</td><td>${money(a.frameAvg)}</td><td>${money(a.ln)}</td><td>${money(a.lensPair)}</td>
          <td>${money(a.cl)}</td><td>${money(a.w)}</td>
        </tr>`).join('') || `<tr><td colspan="13"><div class="empty"><p>${t('no_orders')}</p></div></td></tr>`}</tbody>
      </table></div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:24px;margin-top:22px">
        <div><div class="fw-6" style="margin-bottom:10px">${t('fl_frames_by_price')}</div>${_flSegHtml(frameSeg, _FL_FRAME_BUCKETS, _FL_BLUES)}</div>
        <div><div class="fw-6" style="margin-bottom:10px">${t('fl_lenses_by_price')}</div>${_flSegHtml(lensSeg, _FL_LENS_BUCKETS, _FL_TEALS)}</div>
      </div>
      <div class="text-m text-sm" style="margin-top:14px">${t('fl_footnote')}</div>
    </div>
  `;
}

// Столбчатая диаграмма без библиотек: столбик на период, сложенный из оправ/линз/МКЛ/работы.
function _flChartHtml(aggs) {
  const totals = aggs.map(a => _FL_SERIES.reduce((s, x) => s + a[x.key], 0));
  const max = Math.max(1, ...totals);
  const every = Math.max(1, Math.ceil(aggs.length / 12));
  return `
    <div style="display:flex;align-items:flex-end;gap:4px;height:200px;border-bottom:1px solid var(--border);padding-top:16px">
      ${aggs.map((a, i) => {
        const tip = `${_flLabel(a.key)}\n${t('fl_revenue')}: ${fmtMoney(a.tot)} · ${t('fl_orders')}: ${a.orders}\n` +
          _FL_SERIES.map(s => `${t(s.label)}: ${fmtMoney(Math.round(a[s.key]))}`).join('\n');
        return `<div title="${tip}" style="flex:1;max-width:36px;height:${totals[i] / max * 100}%;display:flex;flex-direction:column-reverse;border-radius:4px 4px 0 0;overflow:hidden;cursor:default">
          ${_FL_SERIES.map(s => a[s.key] > 0 ? `<div style="height:${a[s.key] / totals[i] * 100}%;background:${s.color}"></div>` : '').join('')}
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:4px;font-size:11.5px;color:var(--text-m);margin-top:4px">
      ${aggs.map((a, i) => `<div style="flex:1;max-width:36px;text-align:center;white-space:nowrap;overflow:visible">${i % every === 0 ? _flLabel(a.key, true) : ''}</div>`).join('')}
    </div>`;
}

function _flSegRows(items, keys, keyOf, buckets, priceOf, weightOf) {
  return keys.map(k => {
    const counts = buckets.map(() => 0);
    let total = 0;
    items.forEach(it => {
      if (keyOf(it) !== k) return;
      const w = weightOf(it);
      counts[buckets.findIndex(b => priceOf(it) <= b.max)] += w;
      total += w;
    });
    return { key: k, counts, total };
  }).filter(r => r.total > 0);
}

function _flSegHtml(rows, buckets, colors) {
  if (!rows.length) return `<div class="text-m text-sm">${t('fl_no_data')}</div>`;
  return rows.map(r => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:7px">
      <div style="width:96px;flex-shrink:0;font-size:12.5px;color:var(--text-m)">${_flLabel(r.key)}</div>
      <div style="flex:1;display:flex;height:22px;border-radius:6px;overflow:hidden;background:var(--surface2)">
        ${r.counts.map((c, i) => {
          if (!c) return '';
          const pct = c / r.total * 100;
          return `<div title="${buckets[i].label}: ${Math.round(pct)}% (${c})" style="width:${pct}%;background:${colors[i]};color:${i >= 2 ? '#fff' : '#18202E'};font-size:11px;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:nowrap">${pct >= 9 ? Math.round(pct) + '%' : ''}</div>`;
        }).join('')}
      </div>
      <div style="width:36px;flex-shrink:0;text-align:right;font-size:12px;color:var(--text-m)">${r.total}</div>
    </div>`).join('') +
    `<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;font-size:12px;color:var(--text-m)">${buckets.map((b, i) => `<span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${colors[i]};margin-right:4px;vertical-align:-1px"></span>${b.label}</span>`).join('')}</div>`;
}
