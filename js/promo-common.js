// ═══ ПРОМОКОД ИЗ ЗАПИСИ (appointments.intake.promo_code) ═══
// Бейдж 🎁 КОД в списках приёмов + текст условий для карты прегледа и формы заказа.
const PROMO_OFFER_TEXT = { P: 'на преглед', L: 'на линзы', K: 'чек-ап', PL: 'на преглед и линзы' };
function apptPromoCode(a) {
  const i = a && a.intake;
  return (i && typeof i === 'object' && !Array.isArray(i) && i.promo_code) ? String(i.promo_code) : '';
}
function promoChip(code, big) {
  if (!code) return '';
  const c = String(code).replace(/[^A-Za-z0-9]/g, '');
  return '<span class="promo-chip" title="Промокод из записи" style="display:inline-flex;align-items:center;gap:3px;font-size:' + (big ? '13px' : '11px') +
    ';font-weight:700;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;padding:' + (big ? '3px 10px' : '1px 7px') +
    ';border-radius:10px;white-space:nowrap;vertical-align:middle">🎁 ' + c + '</span>';
}
function promoBadge(a) { return promoChip(apptPromoCode(a)); }
let _promoInfoCache = {};
async function promoInfo(code) {
  if (!code) return null;
  if (_promoInfoCache[code] && Date.now() - _promoInfoCache[code].at < 60000) return _promoInfoCache[code].pc;
  const { data } = await db.from('promo_codes').select('code,offer,discount,valid_from,valid_to,active,note').eq('code', code).limit(1);
  const pc = (data && data[0]) || null;
  _promoInfoCache[code] = { pc, at: Date.now() };
  return pc;
}
// Условия кода одной строкой; onDate — дата, на которую проверяем срок (по умолчанию сегодня)
function promoTerms(pc, onDate) {
  if (!pc) return '⚠️ нет в справочнике промокодов';
  const d = onDate || today();
  let s = (+pc.discount ? '−' + (+pc.discount) + '% ' : '') + (PROMO_OFFER_TEXT[pc.offer] || '');
  if (pc.offer === 'PL') s += ' (линзы — только при заказе в день прегледа)';
  if (!pc.active) s += ' · ⚠️ код выключен';
  else if (pc.valid_to && d > pc.valid_to) s += ' · ⚠️ срок истёк ' + fmt(pc.valid_to);
  else if (pc.valid_from && d < pc.valid_from) s += ' · ⚠️ ещё не действует';
  return s.trim();
}
