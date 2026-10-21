// ═══ АНКЕТА ВИЗИТА В КАРТЕ ОБСЛЕДОВАНИЯ ═══
// Подключается после exam.js. Анамнез в карте обследования подтягивается из анкеты
// именно этой онлайн-записи (appointments.intake, миграция 005), а не из карточки пациента —
// у повторного пациента в карточке могла остаться анкета первого визита.
// Если у записи нет intake (старые записи, приём без записи) — всё как раньше.
let _examIntake = null;
function _withIntake(p, intake) {
  return (p && intake && typeof intake === 'object' && Object.keys(intake).length) ? Object.assign({}, p, intake) : p;
}
async function _loadApptIntake(apptId) {
  if (!apptId) return null;
  try {
    const {data} = await db.from('appointments').select('*').eq('id', apptId).single();
    return (data && data.intake) || null;
  } catch (e) { return null; }
}
const _origOpenExamForm = openExamForm;
const _origOpenExamView = openExamView;
const _origDrawExam = _drawExam;
_drawExam = function(p, e, visitNum, apptId, apptType) {
  const r = _origDrawExam(_withIntake(p, _examIntake), e, visitNum, apptId, apptType);
  _examPromoStrip(_examIntake);
  return r;
};
// Промокод из онлайн-записи — жёлтая плашка под шапкой карты прегледа
async function _examPromoStrip(intake) {
  const code = typeof apptPromoCode === 'function' ? apptPromoCode({ intake }) : '';
  if (!code) return;
  const pc = await promoInfo(code);
  const head = document.querySelector('#modal-container .modal-header');
  if (!head || document.getElementById('exam-promo-strip')) return;
  const ap = intake && intake.promo_applied;
  const el = document.createElement('div');
  el.id = 'exam-promo-strip';
  el.style.cssText = 'background:#fef3c7;border-bottom:1.5px solid #fcd34d;padding:8px 16px;font-size:13.5px;color:#78350f;display:flex;gap:8px;align-items:center;flex-wrap:wrap';
  el.innerHTML = promoChip(code, true) + '<span>Пациент записался с промокодом · ' + String(promoTerms(pc)).replace(/[<>&]/g, '') + '</span>' +
    (ap && ap.base_price ? '<span style="font-weight:700">· приём ' + ap.base_price + ' → ' + Math.round(ap.base_price * (100 - ap.discount) / 100) + ' дин.</span>' : '');
  head.parentNode.insertBefore(el, head.nextSibling);
}
openExamForm = async function(apptId, patientId) {
  _examIntake = await _loadApptIntake(apptId);
  return _origOpenExamForm(apptId, patientId);
};
openExamView = async function(examId, pid, edit) {
  _examIntake = null;
  try {
    const {data:ex} = await db.from('examinations').select('appointment_id').eq('id', examId).single();
    _examIntake = await _loadApptIntake(ex && ex.appointment_id);
  } catch (err) {}
  return _origOpenExamView(examId, pid, edit); // edit — открыть сразу для исправления
};
