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
  return _origDrawExam(_withIntake(p, _examIntake), e, visitNum, apptId, apptType);
};
openExamForm = async function(apptId, patientId) {
  _examIntake = await _loadApptIntake(apptId);
  return _origOpenExamForm(apptId, patientId);
};
openExamView = async function(examId, pid) {
  _examIntake = null;
  try {
    const {data:ex} = await db.from('examinations').select('appointment_id').eq('id', examId).single();
    _examIntake = await _loadApptIntake(ex && ex.appointment_id);
  } catch (err) {}
  return _origOpenExamView(examId, pid);
};
