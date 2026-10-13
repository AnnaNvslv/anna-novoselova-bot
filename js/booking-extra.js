/* ═══ BOOKING: доработки поверх booking.js / booking-kids.js ═══
   Подключается последним (defer). booking.js не меняется.
   1. «Контрольный визит»: 30 минут, бесплатно, бронирует 30-минутные слоты
      (slot_type 'express' — те же окна, что у экспресс-диагностики), чтобы не пересекаться с другими записями.
   2. Прямая ссылка на вид записи: booking.html?type=control — сразу открывает календарь
      «Контрольного визита» (ссылку присылает Telegram-бот в напоминании о контроле).
   3. Промокод из ссылки: booking.html?promo=LWEB15 — код подставляется в поле «Промокод»
      (кнопка на странице «Акции» сайта), в т.ч. после «Ещё одна запись».
*/
(function(){
  const control = (typeof TYPES_DATA !== 'undefined') && TYPES_DATA.find(t => t.id === 'control');
  if (control) {
    control.slotType = 'express';
    control.consult = 0;
    control.ru.dur = '30 минут';
    control.sr.dur = '30 minuta';
    control.ru.price = 'Бесплатно';
    control.sr.price = 'Besplatno';
    control.ru.sub = 'После подбора очков или промежуточной коррекции: проверим, как идёт адаптация и нужна ли замена диоптрий';
    control.sr.sub = 'Nakon izbora naočara ili privremene korekcije: proverićemo kako ide adaptacija i da li je potrebna promena dioptrije';
  }
  if (typeof REASONS !== 'undefined' && REASONS.control) {
    const item = { t: 'Контроль промежуточной коррекции (замена диоптрий)', s: 'Kontrola privremene korekcije (promena dioptrije)' };
    if (!REASONS.control.some(r => r.t === item.t)) REASONS.control.unshift(item);
  }

  // ── ?promo=<код> → подставить промокод ──
  let urlPromo = '';
  try { urlPromo = (new URLSearchParams(location.search).get('promo') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20); } catch (e) {}
  if (urlPromo) {
    const fillPromo = () => { const el = document.getElementById('f-promo'); if (el && !el.value) el.value = urlPromo; };
    document.addEventListener('DOMContentLoaded', () => {
      fillPromo();
      if (typeof resetBooking === 'function') {
        const _reset = resetBooking;
        window.resetBooking = function () { _reset.apply(this, arguments); fillPromo(); };
      }
    });
  }

  // ── ?type=<id> → сразу выбрать вид записи ──
  let wanted = null;
  try { wanted = new URLSearchParams(location.search).get('type'); } catch (e) {}
  if (!wanted || typeof TYPES_DATA === 'undefined' || !TYPES_DATA.some(t => t.id === wanted)) return;
  document.addEventListener('DOMContentLoaded', () => {
    const started = Date.now();
    (function waitSlots(){
      // Слоты грузятся асинхронно в booking.js — ждём до 6 секунд, затем открываем в любом случае
      const ready = (typeof allSlots !== 'undefined' && allSlots.length) || Date.now() - started > 6000;
      if (!ready) { setTimeout(waitSlots, 150); return; }
      if (typeof selectType === 'function' && document.querySelector('.type-card')) selectType(wanted);
    })();
  });
})();
