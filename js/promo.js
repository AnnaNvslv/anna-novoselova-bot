// ═══ ПРОМОКОДЫ (только для владельца — защита на уровне базы: RLS + is_owner()) ═══
const PROMO_OFFERS = { P: 'Проверка', L: 'Линзы', K: 'Чек-ап' };
const PROMO_CHANNELS = [
  ['SP','Чат специалистов'],['NS1','TG-чат НС 1'],['NS2','TG-чат НС 2'],['NS3','TG-чат НС 3'],
  ['NS4','TG-чат НС 4'],['NS5','TG-чат НС 5'],['TG','Свой канал'],['BV','Bela Vrana'],
  ['BL1','Блогер 1'],['PR1','Партнёр 1'],['GM','Google Maps'],['IG','Instagram']
];
var _isOwner = null;
let _promoFrom = null, _promoTo = null;

async function checkPromoOwner() {
  try { const { data } = await db.rpc('is_owner'); _isOwner = data === true; }
  catch (e) { _isOwner = false; }
  ['nav-promo','mob-nav-promo'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = _isOwner ? '' : 'none'; });
  return _isOwner;
}

function _pEsc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function _pDate(d) { if (!d) return '—'; const [y,m,dd] = d.split('-'); return dd+'.'+m+'.'+y.slice(2); }
function _pMoney(n) { return Math.round(+n||0).toLocaleString('ru-RU') + ' RSD'; }
function _pPct(a, b) { return b ? Math.round(a*100/b) + '%' : '—'; }
function _pIso(d) { return d.toISOString().slice(0,10); }
function _pNorm(s) { return String(s||'').toUpperCase().replace(/[\s\-_]/g,''); }

function promoPreset(p) {
  const now = new Date(); let f = new Date(now), t = new Date(now);
  if (p === 'month') { f = new Date(now.getFullYear(), now.getMonth(), 1); }
  else if (p === '30') { f.setDate(f.getDate() - 30); }
  else if (p === '90') { f.setDate(f.getDate() - 90); }
  else if (p === 'all') { f = new Date(2020,0,1); t.setFullYear(t.getFullYear() + 1); }
  _promoFrom = _pIso(f); _promoTo = _pIso(t);
  renderPromo();
}

async function renderPromo() {
  const c = document.getElementById('content');
  if (_isOwner === null) await checkPromoOwner();
  if (!_isOwner) {
    c.innerHTML = '<div class="topbar"><h1>Промокоды</h1></div><div class="content"><div class="card" style="padding:20px;text-align:center;color:var(--text-m)">Нет доступа</div></div>';
    return;
  }
  if (!_promoFrom) { const n = new Date(); _promoFrom = _pIso(new Date(n.getFullYear(), n.getMonth(), 1)); const t = new Date(n); t.setMonth(t.getMonth()+3); _promoTo = _pIso(t); }
  c.innerHTML = '<div class="topbar"><h1>Промокоды</h1></div><div class="content"><div class="spinner">'+t('loading')+'</div></div>';

  const [st, src, reg] = await Promise.all([
    db.rpc('promo_stats', { p_from: _promoFrom, p_to: _promoTo }),
    db.rpc('source_stats', { p_from: _promoFrom, p_to: _promoTo }),
    db.from('promo_codes').select('*').order('created_at', { ascending: false })
  ]);
  if (st.error || src.error || reg.error) {
    c.innerHTML = '<div class="topbar"><h1>Промокоды</h1></div><div class="content"><div class="card" style="padding:20px;color:#dc2626">Ошибка: '+_pEsc((st.error||src.error||reg.error).message)+'</div></div>';
    return;
  }
  const stats = st.data || [], sources = src.data || [], codes = reg.data || [];
  const today = _pIso(new Date());

  const tot = stats.reduce((a,r) => ({ b:a.b+r.bookings, c:a.c+r.came, o:a.o+r.patients_ordered, rev:a.rev+(+r.revenue) }), {b:0,c:0,o:0,rev:0});
  const tile = (lbl, val, sub) => '<div class="card" style="padding:14px 16px;flex:1;min-width:130px"><div style="font-size:12px;color:var(--text-m)">'+lbl+'</div><div style="font-size:24px;font-weight:800">'+val+'</div>'+(sub?'<div style="font-size:12px;color:var(--text-m)">'+sub+'</div>':'')+'</div>';

  const statRows = stats.length ? stats.map(r => {
    const badge = !r.registered ? '<span style="font-size:11px;color:#d97706"> не в справочнике</span>' : '';
    return '<tr>'+
      '<td style="font-weight:700;white-space:nowrap">'+_pEsc(r.code)+badge+'</td>'+
      '<td>'+_pEsc(PROMO_OFFERS[r.offer]||'—')+(+r.discount?' −'+(+r.discount)+'%':'')+'</td>'+
      '<td>'+_pEsc(r.channel_label||r.channel||'—')+'</td>'+
      '<td style="text-align:right">'+r.bookings+'</td>'+
      '<td style="text-align:right">'+r.came+' <span style="color:var(--text-m);font-size:12px">'+_pPct(r.came,r.bookings)+'</span></td>'+
      '<td style="text-align:right">'+r.patients_ordered+' <span style="color:var(--text-m);font-size:12px">'+_pPct(r.patients_ordered,r.came)+'</span></td>'+
      '<td style="text-align:right;white-space:nowrap">'+_pMoney(r.revenue)+'</td>'+
      '<td style="text-align:right;white-space:nowrap">'+(r.lens_orders ? r.lens_orders+' / '+_pMoney(r.lens_revenue) : '—')+'</td>'+
    '</tr>';
  }).join('') : '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-m)">Нет данных за период</td></tr>';

  const srcRows = sources.length ? sources.map(r =>
    '<tr><td>'+_pEsc(r.source)+'</td><td style="text-align:right">'+r.bookings+'</td><td style="text-align:right">'+r.came+'</td></tr>'
  ).join('') : '<tr><td colspan="3" style="text-align:center;padding:16px;color:var(--text-m)">Нет данных</td></tr>';

  const regRows = codes.length ? codes.map(r => {
    const expired = r.valid_to && r.valid_to < today;
    const state = !r.active ? '<span style="color:var(--text-m)">выкл.</span>' : expired ? '<span style="color:#d97706">истёк</span>' : '<span style="color:#16a34a">активен</span>';
    return '<tr>'+
      '<td style="font-weight:700">'+_pEsc(r.code)+'</td>'+
      '<td>'+_pEsc(PROMO_OFFERS[r.offer])+(+r.discount?' −'+(+r.discount)+'%':'')+'</td>'+
      '<td>'+_pEsc(r.channel_label||r.channel)+'</td>'+
      '<td style="white-space:nowrap">'+_pDate(r.valid_from)+' – '+_pDate(r.valid_to)+'</td>'+
      '<td>'+state+'</td>'+
      '<td style="font-size:12.5px;color:var(--text-m)">'+_pEsc(r.note||'')+'</td>'+
      '<td style="white-space:nowrap"><button class="btn btn-ghost" style="padding:4px 10px;font-size:12px" onclick="togglePromo(\''+_pEsc(r.code)+'\','+(!r.active)+')">'+(r.active?'Выключить':'Включить')+'</button> '+
      '<button class="btn btn-ghost" style="padding:4px 10px;font-size:12px;color:#dc2626" onclick="deletePromo(\''+_pEsc(r.code)+'\')">✕</button></td>'+
    '</tr>';
  }).join('') : '<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--text-m)">Кодов пока нет</td></tr>';

  const chOpts = PROMO_CHANNELS.map(([k,v]) => '<option value="'+k+'" data-label="'+_pEsc(v)+'">'+k+' — '+_pEsc(v)+'</option>').join('');
  const th = s => '<th style="text-align:left;font-size:12px;color:var(--text-m);padding:8px 10px;white-space:nowrap">'+s+'</th>';
  const thr = s => '<th style="text-align:right;font-size:12px;color:var(--text-m);padding:8px 10px;white-space:nowrap">'+s+'</th>';

  c.innerHTML =
  '<div class="topbar"><h1>Промокоды</h1></div>'+
  '<div class="content">'+
    '<div class="card" style="padding:12px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">'+
      '<span style="font-size:13px;color:var(--text-m)">Период записей:</span>'+
      '<input type="date" id="pr-from" value="'+_promoFrom+'" style="width:auto"> – <input type="date" id="pr-to" value="'+_promoTo+'" style="width:auto">'+
      '<button class="btn btn-accent" style="padding:6px 12px" onclick="_promoFrom=document.getElementById(\'pr-from\').value;_promoTo=document.getElementById(\'pr-to\').value;renderPromo()">Показать</button>'+
      '<button class="btn btn-ghost" style="padding:6px 10px" onclick="promoPreset(\'month\')">Этот месяц</button>'+
      '<button class="btn btn-ghost" style="padding:6px 10px" onclick="promoPreset(\'30\')">30 дней</button>'+
      '<button class="btn btn-ghost" style="padding:6px 10px" onclick="promoPreset(\'90\')">90 дней</button>'+
      '<button class="btn btn-ghost" style="padding:6px 10px" onclick="promoPreset(\'all\')">Всё время</button>'+
    '</div>'+
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:12px 0">'+
      tile('Записей по кодам', tot.b)+tile('Пришли', tot.c, _pPct(tot.c,tot.b)+' от записей')+
      tile('Заказали очки', tot.o, _pPct(tot.o,tot.c)+' от пришедших')+tile('Сумма заказов', _pMoney(tot.rev))+
    '</div>'+
    '<div class="card" style="padding:0;overflow-x:auto;margin-bottom:14px">'+
      '<div style="padding:12px 16px;font-weight:700">Статистика по кодам</div>'+
      '<table style="width:100%;border-collapse:collapse"><thead><tr>'+th('Код')+th('Скидка')+th('Канал')+thr('Записались')+thr('Пришли')+thr('Заказали')+thr('Сумма заказов')+thr('Заказы с кодом на линзы')+'</tr></thead><tbody>'+statRows+'</tbody></table>'+
      '<div style="padding:8px 16px 12px;font-size:12px;color:var(--text-m)">«Заказали» — заказы пациента в дату приёма и позже. «Заказы с кодом на линзы» — где код указан в самом заказе.</div>'+
    '</div>'+
    '<div class="card" style="padding:0;overflow-x:auto;margin-bottom:14px">'+
      '<div style="padding:12px 16px;font-weight:700">Откуда узнали (все записи за период)</div>'+
      '<table style="width:100%;border-collapse:collapse"><thead><tr>'+th('Источник')+thr('Записались')+thr('Пришли')+'</tr></thead><tbody>'+srcRows+'</tbody></table>'+
    '</div>'+
    '<div class="card" style="padding:16px;margin-bottom:14px">'+
      '<div style="font-weight:700;margin-bottom:10px">Новый промокод</div>'+
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end">'+
        '<div class="form-group"><label>На что</label><select id="pr-offer" onchange="_promoPreview()"><option value="P">P — Проверка</option><option value="L">L — Линзы</option><option value="K">K — Чек-ап (без скидки)</option></select></div>'+
        '<div class="form-group"><label>Канал</label><select id="pr-ch" onchange="_promoPreview()">'+chOpts+'<option value="_">Другой…</option></select></div>'+
        '<div class="form-group" id="pr-chx-wrap" style="display:none"><label>Код канала</label><input id="pr-chx" placeholder="NS6" style="width:90px" oninput="_promoPreview()"></div>'+
        '<div class="form-group"><label>Название канала</label><input id="pr-chl" placeholder="напр. Мамы НС"></div>'+
        '<div class="form-group"><label>Скидка %</label><input id="pr-disc" type="number" min="0" max="50" value="20" style="width:80px" oninput="_promoPreview()"></div>'+
        '<div class="form-group"><label>С</label><input id="pr-vf" type="date" value="'+today+'"></div>'+
        '<div class="form-group"><label>По</label><input id="pr-vt" type="date"></div>'+
        '<div class="form-group" style="flex:1;min-width:160px"><label>Заметка</label><input id="pr-note" placeholder="что за акция"></div>'+
      '</div>'+
      '<div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">'+
        '<span>Код: <b id="pr-code-prev" style="font-size:18px"></b></span>'+
        '<input id="pr-code" placeholder="или свой код" style="width:150px">'+
        '<button class="btn btn-accent" onclick="savePromo()">Добавить</button>'+
      '</div>'+
    '</div>'+
    '<div class="card" style="padding:0;overflow-x:auto">'+
      '<div style="padding:12px 16px;font-weight:700">Справочник кодов</div>'+
      '<table style="width:100%;border-collapse:collapse"><thead><tr>'+th('Код')+th('Скидка')+th('Канал')+th('Срок')+th('Статус')+th('Заметка')+th('')+'</tr></thead><tbody>'+regRows+'</tbody></table>'+
    '</div>'+
  '</div>';
  _promoPreview();
}

function _promoGen() {
  const o = document.getElementById('pr-offer').value;
  let ch = document.getElementById('pr-ch').value;
  document.getElementById('pr-chx-wrap').style.display = ch === '_' ? '' : 'none';
  if (ch === '_') ch = _pNorm(document.getElementById('pr-chx').value);
  const d = +document.getElementById('pr-disc').value || 0;
  return { o, ch, d, code: o + ch + (o === 'K' || !d ? '' : d) };
}
function _promoPreview() {
  const g = _promoGen();
  const sel = document.getElementById('pr-ch');
  const lbl = document.getElementById('pr-chl');
  const opt = sel.options[sel.selectedIndex];
  if (lbl && !lbl.dataset.touched) lbl.value = opt && opt.dataset.label ? opt.dataset.label : '';
  if (lbl && !lbl._bound) { lbl._bound = true; lbl.addEventListener('input', () => lbl.dataset.touched = '1'); }
  document.getElementById('pr-code-prev').textContent = g.code;
}
async function savePromo() {
  const g = _promoGen();
  const custom = _pNorm(document.getElementById('pr-code').value);
  const code = custom || g.code;
  if (!g.ch) { alert('Укажите код канала'); return; }
  if (!/^[A-Z0-9]{2,20}$/.test(code)) { alert('Код: только латиница и цифры, 2–20 символов'); return; }
  const row = {
    code, offer: g.o, discount: g.o === 'K' ? 0 : g.d, channel: g.ch,
    channel_label: document.getElementById('pr-chl').value.trim() || null,
    valid_from: document.getElementById('pr-vf').value || null,
    valid_to: document.getElementById('pr-vt').value || null,
    note: document.getElementById('pr-note').value.trim() || null
  };
  const { error } = await db.from('promo_codes').insert(row);
  if (error) { alert(/duplicate|unique/i.test(error.message) ? 'Такой код уже есть' : 'Ошибка: ' + error.message); return; }
  toast('Код ' + code + ' добавлен');
  renderPromo();
}
async function togglePromo(code, active) {
  const { error } = await db.from('promo_codes').update({ active }).eq('code', code);
  if (error) { alert('Ошибка: ' + error.message); return; }
  renderPromo();
}
async function deletePromo(code) {
  if (!confirm('Удалить код ' + code + ' из справочника? Статистика по записям сохранится.')) return;
  const { error } = await db.from('promo_codes').delete().eq('code', code);
  if (error) { alert('Ошибка: ' + error.message); return; }
  renderPromo();
}

// Пункты меню (скрыты, пока база не подтвердит владельца)
(function(){
  const icon='<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  const st=document.getElementById('nav-settings');
  if(st&&!document.getElementById('nav-promo')){
    const d=document.createElement('div');d.className='sb-item';d.id='nav-promo';d.style.display='none';
    d.onclick=()=>nav('promo');d.innerHTML=icon+'<span class="sb-label">Промокоды</span>';
    st.parentNode.insertBefore(d,st);
  }
  const ms=document.getElementById('mob-nav-settings');
  if(ms&&!document.getElementById('mob-nav-promo')){
    const b=document.createElement('button');b.className='mob-nav-item';b.id='mob-nav-promo';b.style.display='none';
    b.onclick=()=>{nav('promo');if(typeof _mobActive==='function')_mobActive();};b.innerHTML=icon+'<span>Промо</span>';
    ms.parentNode.insertBefore(b,ms);
  }
  if(document.getElementById('app')?.style.display!=='none'){
    checkPromoOwner().then(ok=>{ if(ok&&curSection==='promo'){ document.getElementById('nav-promo')?.classList.add('active'); renderPromo(); } });
  }
})();
