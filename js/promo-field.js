// ═══ ПОЛЕ ПРОМОКОДА (заказ + запись на приём) и НАПОМИНАНИЕ ОБ ОПЛАТЕ ПРИЁМА ═══
// Промокод: по клику — выпадающий список АКТИВНЫХ кодов из promo_codes (код · скидка · на что · канал).
// Сохраняется в orders.promo_code и appointments.intake.promo_code — оба уже учитываются в promo_stats().

var _pfCodes = null, _pfLoadedAt = 0;
var PF_OFFERS = { P: 'Проверка', L: 'Линзы', K: 'Чек-ап' };

function _pfEsc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function _pfNorm(s) { return String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20); }
function _pfLocalDate(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }

async function _pfLoad(force) {
  if (!force && _pfCodes && Date.now() - _pfLoadedAt < 60000) return _pfCodes;
  const { data, error } = await db.from('promo_codes').select('code,offer,discount,channel_label').eq('active', true).order('code');
  _pfCodes = error ? [] : (data || []);
  _pfLoadedAt = Date.now();
  return _pfCodes;
}

// prefer: 'L' — линзовые коды первыми (заказ), 'P' — коды на проверку первыми (запись)
function promoFieldHtml(id, value, prefer) {
  return '<div class="pf-wrap" data-prefer="' + (prefer || '') + '">' +
    '<input id="' + id + '" class="pf-input" autocomplete="off" placeholder="—" value="' + _pfEsc(value || '') + '"' +
    ' onfocus="_pfOpen(this)" onclick="_pfOpen(this)" oninput="this.value=this.value.toUpperCase();_pfOpen(this)"' +
    ' onblur="_pfClose(this)" onkeydown="_pfKey(event,this)">' +
    '<div class="pf-list" hidden></div>' +
    '<div class="pf-hint" id="' + id + '-hint"></div>' +
  '</div>';
}
function promoFieldVal(id) { const el = document.getElementById(id); return el ? (_pfNorm(el.value) || null) : null; }
async function promoFieldInit(id) { await _pfLoad(true); _pfHint(id); }

function _pfOfferLine(c) {
  return [PF_OFFERS[c.offer] || '', c.channel_label || ''].filter(Boolean).join(' · ');
}

async function _pfOpen(inp) {
  const codes = await _pfLoad();
  const wrap = inp.closest('.pf-wrap'); if (!wrap) return;
  const list = wrap.querySelector('.pf-list');
  const prefer = wrap.dataset.prefer;
  const q = _pfNorm(inp.value);
  let items = codes.filter(c => !q || c.code.includes(q));
  items = items.slice().sort((a, b) => ((b.offer === prefer) - (a.offer === prefer)) || a.code.localeCompare(b.code));
  let html = items.map(c =>
    '<div class="pf-item" onmousedown="event.preventDefault();_pfPick(\'' + inp.id + '\',\'' + _pfEsc(c.code) + '\')">' +
      '<span class="pf-code">' + _pfEsc(c.code) + '</span>' +
      '<span class="pf-disc">' + (+c.discount ? '−' + (+c.discount) + '%' : 'без скидки') + '</span>' +
      '<span class="pf-meta">' + _pfEsc(_pfOfferLine(c)) + '</span>' +
    '</div>').join('');
  if (!items.length) html = '<div class="pf-empty">' + (codes.length ? 'Нет совпадений среди активных' : 'Нет активных промокодов') + '</div>';
  if (inp.value) html = '<div class="pf-item pf-clear" onmousedown="event.preventDefault();_pfPick(\'' + inp.id + '\',\'\')">✕ Без промокода</div>' + html;
  list.innerHTML = html;
  const r = inp.getBoundingClientRect();
  wrap.classList.toggle('pf-up', window.innerHeight - r.bottom < 260 && r.top > 260);
  list.hidden = false;
  _pfHint(inp.id);
}
function _pfClose(inp) {
  setTimeout(() => { const w = inp.closest('.pf-wrap'); if (w) w.querySelector('.pf-list').hidden = true; }, 150);
  inp.value = _pfNorm(inp.value);
  _pfHint(inp.id);
}
function _pfKey(e, inp) {
  const list = inp.closest('.pf-wrap').querySelector('.pf-list');
  if (e.key === 'Escape') { list.hidden = true; e.stopPropagation(); }
  if (e.key === 'Enter' && !list.hidden) {
    const first = list.querySelector('.pf-item:not(.pf-clear)');
    if (first) { e.preventDefault(); first.dispatchEvent(new MouseEvent('mousedown')); }
  }
}
function _pfPick(id, code) {
  const inp = document.getElementById(id); if (!inp) return;
  inp.value = code;
  inp.closest('.pf-wrap').querySelector('.pf-list').hidden = true;
  _modalDirty = true;
  _pfHint(id);
}
function _pfHint(id) {
  const inp = document.getElementById(id), h = document.getElementById(id + '-hint');
  if (!inp || !h) return;
  const code = _pfNorm(inp.value);
  const c = code && (_pfCodes || []).find(x => x.code === code);
  if (!code) { h.textContent = ''; h.className = 'pf-hint'; }
  else if (c) { h.textContent = (PF_OFFERS[c.offer] || '') + (+c.discount ? ' −' + (+c.discount) + '%' : '') + (c.channel_label ? ' · ' + c.channel_label : ''); h.className = 'pf-hint ok'; }
  else { h.textContent = 'нет среди активных — сохранится как есть'; h.className = 'pf-hint warn'; }
}

// ═══ НЕЗАКРЫТЫЕ ПРИЁМЫ ═══
// Прошедшие приёмы, которые остались «запланирован» (забыла нажать «Завершить»).
async function unclosedAppts(patientId) {
  const todayL = _pfLocalDate();
  let q = db.from('appointments')
    .select('id,date,time,type,consultation_price,appointment_number,patient_id,patients(name,telegram_username)')
    .eq('status', 'запланирован').is('deleted_at', null).lte('date', todayL)
    .order('date', { ascending: false }).order('time', { ascending: false });
  if (patientId) q = q.eq('patient_id', patientId);
  const { data } = await q;
  const now = new Date();
  const hm = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  return (data || []).filter(a => a.date < todayL || (a.time || '').substr(0, 5) <= hm);
}
function _apdPrice(a) { return (+a.consultation_price > 0) ? +a.consultation_price : apptDefaultPrice(a.type); }

async function _apdComplete(id, price) {
  const { error } = await db.from('appointments').update({ status: 'завершён', consultation_price: +price || 0 }).eq('id', id);
  if (error) { toast('Ошибка: ' + error.message, 'error'); return false; }
  toast(t('appt_done')); return true;
}
async function _apdCancel(id) {
  const { error } = await db.from('appointments').update({ status: 'отменён' }).eq('id', id);
  if (error) { toast('Ошибка: ' + error.message, 'error'); return false; }
  await db.from('available_slots').update({ is_booked: false, appointment_id: null }).eq('appointment_id', id);
  toast(t('appt_cancelled')); return true;
}

// Попап «Приём оплачен?» перед новым заказом. next(skipped) — продолжить к форме заказа.
var _apdNext = null;
function askApptPaid(a, next) {
  _apdNext = next;
  openModal('<div class="modal" style="max-width:460px">' +
    '<div class="modal-header"><span class="modal-title">💰 Приём оплачен?</span><button class="btn btn-ghost btn-sm" onclick="_apdGo(true)">✕</button></div>' +
    '<div class="modal-body" style="min-height:0">' +
      '<div style="font-size:14px;color:var(--text-m);margin-bottom:14px;line-height:1.5"><b style="color:var(--text)">' + _pfEsc(a.patients && a.patients.name || '—') + '</b><br>' +
        fmt(a.date) + ' в ' + (a.time || '').substr(0, 5) + ' · ' + _pfEsc(apptTypeName(a.type || '')) + (a.appointment_number ? ' · ' + a.appointment_number : '') +
        '<br>Приём не завершён — всё ещё «запланирован».</div>' +
      '<div class="form-group"><label>Сумма оплаты (дин.)</label>' +
        '<input type="number" id="apd-price" value="' + _apdPrice(a) + '" style="font-size:20px;font-weight:700;text-align:center;padding:12px;border:2px solid var(--accent);border-radius:8px;width:100%"></div>' +
      '<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap">' +
        '<button class="btn btn-success" style="flex:1" onclick="_apdPay(\'' + a.id + '\')">✓ Да, оплачен — завершить</button>' +
        '<button class="btn btn-ghost" style="flex:1" onclick="_apdNoShow(\'' + a.id + '\')">🚫 Не пришёл — отменить</button>' +
      '</div>' +
      '<div style="text-align:center;margin-top:10px"><button class="btn btn-ghost btn-sm" style="border:none" onclick="_apdGo(true)">Пропустить, к заказу →</button></div>' +
    '</div></div>');
  setTimeout(() => { const el = document.getElementById('apd-price'); if (el) { el.focus(); el.select(); } }, 100);
}
function _apdGo(skipped) { const n = _apdNext; _apdNext = null; if (n) n(skipped); else closeModal(); }
async function _apdPay(id) { if (await _apdComplete(id, document.getElementById('apd-price')?.value)) _apdGo(false); }
async function _apdNoShow(id) { if (await _apdCancel(id)) _apdGo(false); }

// Плашка внутри формы заказа, когда пациента выбирают из списка.
async function orderUnclosedBanner(pid) {
  const box = document.getElementById('o-unclosed'); if (!box) return;
  box.innerHTML = '';
  if (!pid) return;
  const list = await unclosedAppts(pid);
  if (!list.length || v('o-pid') !== pid) return;
  const a = list[0];
  box.innerHTML = '<div class="unclosed-strip">' +
    '<span>💰 Приём ' + fmt(a.date) + ' в ' + (a.time || '').substr(0, 5) + ' не завершён. Оплачен?</span>' +
    '<span style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="btn btn-success btn-sm" onclick="_obPay(\'' + a.id + '\',' + _apdPrice(a) + ')">✓ Да, ' + fmtMoney(_apdPrice(a)) + '</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="_obNoShow(\'' + a.id + '\')">🚫 Не пришёл</button>' +
    '</span></div>';
}
async function _obPay(id, price) { if (await _apdComplete(id, price)) orderUnclosedBanner(v('o-pid')); }
async function _obNoShow(id) { if (await _apdCancel(id)) orderUnclosedBanner(v('o-pid')); }

// Плашка на дашборде: все незакрытые прошедшие приёмы.
async function renderUnclosedDashboard() {
  const content = document.querySelector('#content .content'); if (!content) return;
  const list = await unclosedAppts(null);
  const old = document.getElementById('dash-unclosed'); if (old) old.remove();
  if (!list.length) return;
  const el = document.createElement('div');
  el.id = 'dash-unclosed';
  el.className = 'card mb-12';
  el.style.cssText = 'border:1.5px solid var(--warn);background:var(--warn-l)';
  el.innerHTML = '<div class="card-header"><span class="card-title">💰 Незакрытые приёмы — оплачены?</span><span class="badge badge-warn">' + list.length + '</span></div>' +
    list.map(a => '<div class="history-item">' +
      '<div style="flex:1;min-width:0">' +
        '<div class="history-date">' + fmt(a.date) + ' · ' + (a.time || '').substr(0, 5) + ' · ' + _pfEsc(apptTypeName(a.type || '')) + '</div>' +
        '<div class="history-title" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard(\'' + a.patient_id + '\')">' + _pfEsc(a.patients && a.patients.name || '—') + '</div>' +
      '</div>' +
      '<div class="history-actions">' +
        '<button class="btn btn-success btn-sm" onclick="openCompleteApptPopup(\'' + a.id + '\',' + _apdPrice(a) + ')">✓ Завершить</button>' +
        '<button class="btn btn-ghost btn-sm" title="Не пришёл" onclick="_dashNoShow(\'' + a.id + '\')">🚫</button>' +
      '</div></div>').join('');
  content.insertBefore(el, content.firstChild);
}
async function _dashNoShow(id) { if (!confirm(t('confirm_cancel'))) return; if (await _apdCancel(id)) renderUnclosedDashboard(); }
