// ═══ EXAMINATION FORM ═══
let _autosaveTimer = null;
let _currentExamId = null;
let _currentApptType = '';
async function openExamForm(apptId,patientId){
  // apptId может быть пустым — например, когда карта обследования создаётся
  // прямо из карточки пациента, без записи на приём (см. кнопку "+ Карта").
  // В этом случае просто не ищем ни существующую карту по приёму, ни сам приём.
  _examTab='anamn';_examData={corrections:[]};_currentExamId=null;_currentApptType='';
  if(_autosaveTimer) clearInterval(_autosaveTimer);
  openModal(`<div class="modal modal-xl"><div class="modal-header"><span class="modal-title">Загрузка...</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div><div class="modal-body"><div class="spinner"></div></div></div>`);
  const[{data:p},{data:exams},examCountRes,{data:appt}]=await Promise.all([
    db.from('patients').select('*').eq('id',patientId).single(),
    apptId ? db.from('examinations').select('*').eq('appointment_id',apptId).is('deleted_at',null).order('created_at',{ascending:false}).limit(1) : Promise.resolve({data:[]}),
    db.from('examinations').select('id',{count:'exact',head:true}).eq('patient_id',patientId),
    apptId ? db.from('appointments').select('type,date').eq('id',apptId).single() : Promise.resolve({data:null})
  ]);
  const ex = exams?.[0] || null;
  // Дата обследования для новой карты: дата записи на приём → дата первого посещения
  // только что созданного пациента → сегодня. Всегда можно поменять вручную.
  const chain = _pendingChainDate && _pendingChainDate.pid === patientId ? _pendingChainDate : null;
  _examDefaultDate = appt?.date ? {date:appt.date, prec:'day'} : chain ? {date:chain.date, prec:chain.prec} : {date:today(), prec:'day'};
  const e=ex||{};const visitNum=e.visit_number||(examCountRes?.count||0)+1;
  _currentExamId = e.id || null;
  _currentApptType = appt?.type || '';
  if(e.current_corrections?.length)_examData.corrections=e.current_corrections;
  await _loadPrevExams(patientId, e);
  _drawExam(p,e,visitNum,apptId,_currentApptType);
  _examApplyLock(e,false);
  _autosaveTimer = setInterval(()=>{
    if(_modalDirty && document.getElementById('e-complaints')){
      saveExam(_currentExamId||'',apptId,patientId,visitNum).then(()=>{
        if(document.getElementById('e-complaints')) toast(t('autosave'),'info');
      });
    }
  },120000);
}
let _examDefaultDate = null;
// edit=true — открыть сразу для исправления (пункт «Изменить» в карточке пациента).
async function openExamView(examId,pid,edit){
  _examTab='anamn';
  _currentExamId=examId;
  const{data:e}=await db.from('examinations').select('*').eq('id',examId).single();
  const{data:p}=await db.from('patients').select('*').eq('id',pid).single();
  let apptType='';
  if(e?.appointment_id){
    const{data:appt}=await db.from('appointments').select('type').eq('id',e.appointment_id).single();
    apptType=appt?.type||'';
  }
  _currentApptType=apptType;
  _examData.corrections=e?.current_corrections||[];
  await _loadPrevExams(pid, e);
  openModal(`<div class="modal modal-xl"><div class="modal-header"><span></span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div><div class="modal-body"><div class="spinner"></div></div></div>`);
  _drawExam(p,e,e?.visit_number||1,e?.appointment_id||'',apptType);
  _examApplyLock(e,!!edit);
}

// ═══ БЛОКИРОВКА ПРОШЕДШЕГО ПРЕГЛЕДА ═══
// Карта осмотра, созданная не сегодня, открывается только для просмотра: все поля
// заблокированы, сохранение скрыто. Кнопка «✏️ Изменить» снимает блокировку.
// Печать и отправка на e-mail в режиме просмотра работают без пересохранения.
function _examIsLocked(){ return !!document.querySelector('#modal-container .modal.exam-locked'); }
function _examApplyLock(e, forceEdit){
  const d=(e?.created_at||'').split('T')[0];
  const locked = !forceEdit && !!(e && e.id && d && d < today());
  _examSetLocked(locked, d);
}
function _examSetLocked(locked, dateStr){
  const modal=document.querySelector('#modal-container .modal'); if(!modal) return;
  modal.classList.toggle('exam-locked', locked);
  modal.querySelectorAll('input, select, textarea, .modal-body button, .modal-header .date-prec-toggle button').forEach(el=>{
    if(el.closest('[data-nolock]')) return;
    if(locked){ if(!el.disabled){ el.disabled=true; el.dataset.lk='1'; } }
    else if(el.dataset.lk){ el.disabled=false; delete el.dataset.lk; }
  });
  const ban=document.getElementById('exam-lock-banner');
  if(ban && dateStr) ban.querySelector('.exam-lock-date').textContent=fmt(dateStr);
  if(!locked){ _modalDirty=false; }
}
function examUnlock(){
  _examSetLocked(false);
  toast(t('exam_unlocked'),'info');
  const first=document.querySelector('#modal-container .tab-content.active input:not([type=checkbox]), #modal-container .tab-content.active textarea');
  if(first) first.focus();
}
// ── RX ПОЛЯ ──
// Раньше Sph/Cyl/Ax/PD/ADD/BC/DIA были выпадающими списками. По просьбе Анны
// заменены на обычные текстовые поля — быстрее вводить с клавиатуры, меньше кликов.
// Имена функций (_rs/_rsNoBtn) и id полей оставлены прежними, чтобы не трогать
// остальной код (saveExam, печать, order-форму), который на них ссылается.
// Плейсхолдеров-примеров нет нигде в карте (просьба Анны 2026-10-08): в режиме
// просмотра они выглядели как внесённые данные.
const SN = 'padding:8px 4px;border:1.5px solid var(--border);border-radius:8px;font-size:15px;width:100%;min-width:60px;text-align:center;background:#fff;color:var(--text)';

function _rs(id, type, val) {
  return `<input id="${id}" value="${val||''}" data-rx="${type}" style="${SN}" oninput="_modalDirty=true" autocomplete="off">`;
}
// Раньше отличалась от _rs отсутствием кнопки "+" у select — теперь оба поля одинаковые (обычный input).
function _rsNoBtn(id, type, val) {
  return _rs(id, type, val);
}
function _ri(id,val,narrow){return`<input id="${id}" value="${val||''}" oninput="_modalDirty=true" style="min-width:${narrow?'36px':'44px'};max-width:${narrow?'60px':'none'}">`;
}
function _riText(id,val){return`<input id="${id}" value="${val||''}" oninput="_modalDirty=true" style="width:100%">`;
}
function _comment(id,val,label){
  label = label || 'Комментарий (необязательно)';
  return`<div class="form-group full" style="margin-top:8px">
    <label style="font-size:11px;color:var(--text-muted,#64748b)">${label}</label>
    <input id="${id}" value="${val||''}" oninput="_modalDirty=true" style="width:100%;font-size:12.5px">
  </div>`;
}

// ── ШАБЛОН ЗАКЛЮЧЕНИЯ ──
// Простая разметка, которую print.js превращает в оформленный документ:
//   "## Заголовок"   — подзаголовок раздела
//   "• текст"        — пункт списка;  "HYLO-…" внутри пункта выделяется жирным
//   "1) текст"       — шаг (подряд идущие шаги печатаются схемой-лесенкой)
//   "🇷🇸 текст"       — подсказка по-сербски (рамка)
//   "⚠️ текст"       — предупреждение (рамка)
// Блоки можно добавлять кнопками над полем, лишнее — просто стереть.
const REC_BLOCKS = {
  control: {label:'Наблюдение', text:`## Наблюдение
• Контроль остроты зрения через 12 месяцев (или через 6 / 3 мес. — по назначению).
• Плановый осмотр офтальмолога — 1 раз в год.`},
  hygiene: {label:'Гигиена зрения', text:`## Гигиена зрения при работе с экраном
• Правило 20-20-20: каждые 20 минут — 20 секунд смотреть вдаль (от 6 метров).
• Моргать чаще и полностью: за экраном мы моргаем намного реже, глаза пересыхают.
• Экран — на расстоянии вытянутой руки, верхний край чуть ниже уровня глаз.
• Хорошее общее освещение, без бликов на экране; не работать в темноте.
• Вечером — тёплые тона экрана (ночной режим).
• Влажность воздуха в помещении 40–60%.
• Каждые 2 часа — короткая разминка для шеи и плеч.`},
  drops: {label:'Капли', text:`## Увлажняющие капли
По 1 капле в каждый глаз 3–4 раза в день, при сухости — чаще. Все капли ниже без консервантов.
• Лёгкая усталость и раздражение к вечеру → HYLO FRESH
• Сухость, жжение, «песок» в глазах, долгая работа за экраном → HYLO-COMOD (можно капать прямо поверх контактных линз)
• Сильная постоянная сухость, после операций на глазах → HYLO-GEL (лучше без линз или на ночь)
• Сухость вместе с аллергией, зудом → HYLO-DUAL
С контактными линзами (кроме HYLO-COMOD) — капать не раньше чем через 30 минут после надевания.
🇷🇸 В аптеке: «Dobar dan, trebaju mi kapi za oči HYLO-COMOD.» Если нет: «Imate li neke veštačke suze bez konzervansa, sa hijaluronskom kiselinom?»`},
  urgent: {label:'Когда к врачу', text:`## Когда срочно к врачу
⚠️ При резком ухудшении зрения, покраснении, боли или воспалении глаз — обратитесь к врачу-офтальмологу.`},
  adapt: {label:'Адаптация к очкам', text:`## Адаптация к новым очкам
В первые дни нормально: лёгкое головокружение, «наклон» пола, искажение формы предметов, усталость глаз.
Надевайте очки утром, сразу после пробуждения.
Если носить весь день сразу тяжело — привыкайте по схеме ниже. Вся схема проходится за один день, шаги идут друг за другом (это не «по шагу в день»):
1) Наденьте очки на 15 минут, потом снимите и отдохните 5 минут
2) Снова наденьте на 20 минут, отдохните 5 минут
3) Наденьте на 25 минут, отдохните 5 минут
4) Наденьте на 35 минут, отдохните 5 минут
5) Дальше носите очки, не снимая, до вечера
• Вся схема занимает около двух часов. Если на каком-то шаге стало тяжело — снимите очки, а на следующее утро начните схему с этого шага.
• Старые очки не надевайте — это затягивает привыкание.
• Обычно адаптация занимает до 2 недель. Если дискомфорт сохраняется дольше — напишите @AnnaNvslv, назначим бесплатный контрольный визит.`},
  interim: {label:'Промежуточная коррекция', text:`## Промежуточная коррекция
• Эти очки — промежуточный этап: переходим к полной коррекции постепенно, чтобы привыкание было комфортным.
• Рекомендуем бюджетные линзы — через 6–8 недель диоптрии будут изменены.
• Контрольный визит через 6–8 недель (бесплатно, 30 минут): проверим адаптацию и подберём следующий шаг. Telegram-бот напомнит и пришлёт ссылку на запись.`},
};
const DEFAULT_RECS = ['control','hygiene','drops','urgent','adapt'].map(k=>REC_BLOCKS[k].text).join('\n\n');
// Вставить блок в заключение (если его там ещё нет)
function addRecBlock(key){
  const ta=document.getElementById('e-recs'); if(!ta) return;
  const b=REC_BLOCKS[key]; if(!b) return;
  const head=b.text.split('\n')[0];
  if(ta.value.includes(head)){ toast('Этот блок уже есть в заключении','info'); return; }
  ta.value=(ta.value.trim()? ta.value.trim()+'\n\n' : '')+b.text;
  _modalDirty=true;
}
function removeRecBlock(key){
  const ta=document.getElementById('e-recs'); if(!ta) return;
  const b=REC_BLOCKS[key]; if(!b) return;
  if(ta.value.includes(b.text)){ ta.value=ta.value.replace('\n\n'+b.text,'').replace(b.text,'').trim(); _modalDirty=true; }
}

// ── Дополнительные коррекции на очки (examinations.rx_extra) ──
function _rxExtraHtml(x){
  const id=x.id, p='rxx-'+id, v=f=>_escH(x[f]==null?'':String(x[f]));
  return `<div class="rx-section rx-extra" data-xid="${id}">
    <div class="rx-section-title">Параметры для изготовления очков <select id="${p}-purpose" class="rx-purpose" onchange="_modalDirty=true;_rxAddLbl(this)">${rxPurposeOptions(x.purpose||'constant')}</select>
      <button type="button" class="rx-extra-del" title="Удалить эту коррекцию" onclick="rxExtraRemove('${id}')">×</button></div>
    <div class="ex-tools"><button class="btn btn-ghost btn-sm" type="button" tabindex="-1" onclick="rxExtraCopyFar('${id}')">← Скопировать из первой коррекции</button></div>
    <table class="rx-table">
      <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th><th>Prism</th></tr>
      <tr><td>OD</td><td>${_rs(p+'-od-sph','sph',v('od_sph'))}</td><td>${_rs(p+'-od-cyl','cyl',v('od_cyl'))}</td><td>${_rs(p+'-od-ax','ax',v('od_ax'))}</td><td>${_rs(p+'-od-prism','prism',v('od_prism'))}</td></tr>
      <tr><td>OS</td><td>${_rs(p+'-os-sph','sph',v('os_sph'))}</td><td>${_rs(p+'-os-cyl','cyl',v('os_cyl'))}</td><td>${_rs(p+'-os-ax','ax',v('os_ax'))}</td><td>${_rs(p+'-os-prism','prism',v('os_prism'))}</td></tr>
    </table>
    <div class="rx-shared-row">
      <div class="form-group" style="max-width:80px"><label>PD</label>${_rs(p+'-pd','pd',v('pd'))}</div>
      <div class="form-group" style="max-width:80px"><label data-addlbl>${rxAddLabel(x.purpose||'constant')}</label>${_rs(p+'-add','add',v('add'))}</div>
    </div>
    ${_comment(p+'-comment',v('comment'),'Комментарий к коррекции')}
    ${_privNote('',v('note'),'Мои заметки — как подбирала',p+'-note')}
  </div>`;
}
function _rxAddLbl(sel){
  const l = sel.closest('.rx-section') && sel.closest('.rx-section').querySelector('label[data-addlbl]');
  if (l) l.textContent = rxAddLabel(sel.value);
}
function rxExtraAdd(){
  if(_examIsLocked()) return;
  const box=document.getElementById('rx-extra-box'); if(!box) return;
  const id='x'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
  box.insertAdjacentHTML('beforeend', _rxExtraHtml({id, purpose:'constant'}));
  _modalDirty=true;
  const el=document.getElementById('rxx-'+id+'-od-sph'); if(el) el.focus();
}
function rxExtraRemove(id){
  if(_examIsLocked()) return;
  if(!confirm('Удалить эту коррекцию? Если по ней уже оформлен заказ, в заказе останутся оправа и линзы, но без диоптрий.')) return;
  const el=document.querySelector('.rx-extra[data-xid="'+id+'"]'); if(el) el.remove();
  _modalDirty=true;
}
function rxExtraCopyFar(id){
  const g=x=>{const el=document.getElementById(x);return el?el.value:'';};
  const set=(x,val)=>{const el=document.getElementById(x); if(el){el.value=val;}};
  const p='rxx-'+id;
  ['od','os'].forEach(eye=>['sph','cyl','ax','prism'].forEach(f=>set(p+'-'+eye+'-'+f, g('rf-'+eye+'-'+f))));
  set(p+'-pd', g('rf-pd')); set(p+'-add', g('rf-add'));
  _modalDirty=true;
  toast('Скопировано из первой коррекции — поправьте диоптрии','info');
}
function _rxExtraCollect(){
  const g=x=>{const el=document.getElementById(x);return el?el.value.trim():'';};
  return [...document.querySelectorAll('#rx-extra-box .rx-extra')].map(el=>{
    const id=el.dataset.xid, p='rxx-'+id;
    const r={id, purpose:g(p+'-purpose')||'constant'};
    ['od','os'].forEach(eye=>['sph','cyl','ax','prism'].forEach(f=>{ r[eye+'_'+f]=g(p+'-'+eye+'-'+f); }));
    r.pd=g(p+'-pd'); r.add=g(p+'-add'); r.comment=g(p+'-comment'); r.note=g(p+'-note');
    return r;
  }).filter(r=>['od_sph','od_cyl','os_sph','os_cyl','pd','add','comment','note'].some(f=>r[f]));
}

// ── Скрытые заметки (examinations.clinical.note_*): не печатаются, свёрнуты по умолчанию ──
// Ключи note_* не входят в CLIN_SECTIONS, поэтому _clinPrintHtml их не выводит.
function _privNote(key, val, label, id){
  const attr = key ? `id="${_cid(key)}" data-clin="${key}"` : `id="${id}"`;
  return `<details class="ex-priv"${val?' data-has="1"':''}><summary>🔒 ${label} <span class="ex-priv-hint">· не печатается${val?' · есть запись':''}</span></summary>
    <textarea ${attr} oninput="_modalDirty=true">${_escH(val||'')}</textarea></details>`;
}

// ── Прошлые визиты пациента: показываем внутри новой карты, чтобы не прыгать между картами ──
let _prevIdx = 0;
const _exKey = x => x?.exam_date || (x?.created_at||'').split('T')[0] || '';
async function _loadPrevExams(pid, e){
  _examData.prevList = []; _prevIdx = 0;
  if(!pid) return;
  const {data} = await db.from('examinations').select('*').eq('patient_id',pid).is('deleted_at',null);
  const cur = e?.id ? _exKey(e) : (_examDefaultDate?.date || today());
  const curCreated = e?.created_at || '9999';
  _examData.prevList = (data||[]).filter(x=>x.id!==e?.id && (_exKey(x)<cur || (_exKey(x)===cur && (x.created_at||'')<curCreated)))
    .sort((a,b)=>(_exKey(b)+(b.created_at||'')).localeCompare(_exKey(a)+(a.created_at||'')));
}
function _pv(x){ return (x!=null && String(x).trim()!=='') ? _escH(x) : '—'; }
function _prevEyeTable(cols, od, os){
  return `<table class="rx-view"><thead><tr><th></th>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>
    <tr><td class="rx-eye">OD</td>${od.map(v=>`<td>${_pv(v)}</td>`).join('')}</tr>
    <tr><td class="rx-eye">OS</td>${os.map(v=>`<td>${_pv(v)}</td>`).join('')}</tr></tbody></table>`;
}
function _prevNote(txt){ return txt ? `<div class="ex-prev-note">🔒 ${_escH(txt)}</div>` : ''; }
function _prevBody(sec, x){
  const c = x.clinical || {};
  const L = _examData.prevList;
  const pick = L.length>1 ? `<div class="ex-prev-pick">Визит: <select onchange="prevPick(this.value)">${L.map((y,i)=>`<option value="${i}" ${i===_prevIdx?'selected':''}>${fmtExamDate(y)}</option>`).join('')}</select></div>` : '';
  let body = '';
  if(sec==='refr'){
    body = _prevEyeTable(['Sph','Cyl','Ax','R AVE'],[x.refr_od_sph,x.refr_od_cyl,x.refr_od_ax,x.refr_od_ave],[x.refr_os_sph,x.refr_os_cyl,x.refr_os_ax,x.refr_os_ave])
      + (x.refr_od_pd?`<div class="ex-prev-line">PD: <b>${_escH(x.refr_od_pd)}</b></div>`:'')
      + (x.refr_comment?`<div class="ex-prev-line">${_escH(x.refr_comment)}</div>`:'');
  } else if(sec==='exam'){
    body = (c.va_own_ou?`<div class="ex-prev-line">Visus в своих очках OU: <b>${_escH(c.va_own_ou)}</b></div>`:'')
      + _prevEyeTable(['Visus b/k','Sph','Cyl','Ax','Visus s/k'],[x.exam_od_without,x.exam_od_cosph,x.exam_od_cyl,x.exam_od_ax,x.exam_od_with],[x.exam_os_without,x.exam_os_cosph,x.exam_os_cyl,x.exam_os_ax,x.exam_os_with])
      + `<div class="ex-prev-line">OU b/k: <b>${_pv(c.va_ou_wo)}</b> · OU s/k: <b>${_pv(x.exam_ou)}</b></div>`
      + (x.exam_comment?`<div class="ex-prev-line">${_escH(x.exam_comment)}</div>`:'')
      + _prevNote(c.note_exam)
      + `<div class="ex-tools" style="margin:8px 0 0"><button class="btn btn-ghost btn-sm" type="button" onclick="prevCopyExam()">← Подставить Sph / Cyl / Ax в текущую карту</button></div>`;
  } else if(sec==='rx'){
    const kinds = (typeof _rxKindsOf==='function') ? _rxKindsOf(x) : [];
    body = kinds.length ? '<div class="rx-view-grid">'+kinds.map(k=>{
      const note = (k==='far'||k==='comp'||k==='near'||k==='cl') ? c['note_rx_'+k] : (rxExtraList(x).find(r=>r.id===k)||{}).note;
      return '<div>'+_rxTableHtml(x,k)+_prevNote(note)+'</div>';
    }).join('')+'</div>' : '<div class="ex-prev-line">Коррекция не заполнялась</div>';
  }
  return pick + body;
}
function _prevSummary(sec){
  const x = _examData.prevList[_prevIdx];
  const t0 = sec==='refr' ? 'Авторефрактометрия' : sec==='rx' ? 'Коррекция' : 'Обследование';
  return `<span class="ex-prev-chev">▸</span> ${t0} на прошлом визите · <b>${fmtExamDate(x)}</b>${_examData.prevList.length>1?` <span class="ex-prev-hint">(всего визитов: ${_examData.prevList.length})</span>`:''}`;
}
function _prevBox(sec){
  const L = _examData.prevList || [];
  if(!L.length) return '';
  return `<details class="ex-prev" data-nolock data-sec="${sec}"><summary>${_prevSummary(sec)}</summary><div class="ex-prev-body">${_prevBody(sec, L[_prevIdx])}</div></details>`;
}
function prevPick(i){
  _prevIdx = +i || 0;
  document.querySelectorAll('#modal-container .ex-prev').forEach(d=>{
    const sec=d.dataset.sec, x=_examData.prevList[_prevIdx];
    d.querySelector('summary').innerHTML=_prevSummary(sec);
    d.querySelector('.ex-prev-body').innerHTML=_prevBody(sec,x);
  });
}
function prevCopyExam(){
  if(_examIsLocked()){ toast(t('exam_locked_save'),'info'); return; }
  const x = _examData.prevList[_prevIdx]; if(!x) return;
  const set=(id,v)=>{ const el=document.getElementById(id); if(el && v!=null){ el.value=v; } };
  ['od','os'].forEach(eye=>{ set('x-'+eye+'-cs',x['exam_'+eye+'_cosph']); set('x-'+eye+'-cyl',x['exam_'+eye+'_cyl']); set('x-'+eye+'-ax',x['exam_'+eye+'_ax']); });
  _modalDirty=true;
  toast('Подставлено с визита '+fmtExamDate(x)+' — проверьте','info');
}

// ── Кнопки-переключатели строк заключения: вставляют/убирают строку под своим заголовком ──
// Обе группы вставляются в начало заключения.
const LINE_GROUPS = {
  wear: {hdr:'## Режим ношения очков', top:true, label:'Рекомендовано ношение очков:',
    chips:['на постоянной основе','для дали','отдельно для работы за компьютером','для близи'],
    line: c => '• Рекомендовано ношение очков '+c+'.'},
  oph: {hdr:'## Осмотр офтальмолога', top:true, label:'Офтальмолог:',
    chips:['осмотр офтальмолога','осмотр в условиях циклоплегии'],
    lines:['• Рекомендован осмотр офтальмолога.','• Рекомендован осмотр офтальмолога для проведения обследования в условиях циклоплегии.']},
};
const _grpLine = (g,i) => { const G=LINE_GROUPS[g]; return G.lines ? G.lines[i] : G.line(G.chips[i]); };
function _lineChipsHtml(){
  return Object.keys(LINE_GROUPS).map(g=>`<div class="wear-box"><span>${LINE_GROUPS[g].label}</span>${LINE_GROUPS[g].chips.map((c,i)=>`<button type="button" class="wear-chip" data-grp="${g}" data-i="${i}" tabindex="-1" onclick="lineToggle('${g}',${i})">${c}</button>`).join('')}</div>`).join('');
}
function lineToggle(g, i){
  const ta=document.getElementById('e-recs'); if(!ta || ta.disabled) return;
  const G=LINE_GROUPS[g], all=G.chips.map((_,j)=>_grpLine(g,j));
  const lines=ta.value.replace(/\r/g,'').split('\n');
  const line=_grpLine(g,i), at=lines.indexOf(line);
  if(at>=0){
    lines.splice(at,1);
    if(!all.some(l=>lines.includes(l))){
      const h=lines.indexOf(G.hdr);
      if(h>=0){ lines.splice(h,1); if(G.top){ if(lines[h]==='') lines.splice(h,1); } else if(h>0 && lines[h-1]==='') lines.splice(h-1,1); }
    }
  } else {
    const h=lines.indexOf(G.hdr);
    if(h<0){
      if(G.top) lines.unshift(G.hdr, line, '');
      else { while(lines.length && lines[lines.length-1].trim()==='') lines.pop(); if(lines.length) lines.push(''); lines.push(G.hdr, line); }
    } else { let j=h+1; while(j<lines.length && all.includes(lines[j])) j++; lines.splice(j,0,line); }
  }
  ta.value=lines.join('\n'); _modalDirty=true; _wearSync();
}
function _wearSync(){
  const ta=document.getElementById('e-recs'); if(!ta) return;
  const lines=ta.value.split('\n');
  document.querySelectorAll('#modal-container .wear-chip').forEach(b=>b.classList.toggle('on', lines.includes(_grpLine(b.dataset.grp,+b.dataset.i))));
}

const EXAM_TABS=[['anamn','Анамнез'],['refr','Рефрактометрия'],['exam','Обследование'],['bino','Бинокулярное / аккомодация'],['rx','Коррекция'],['concl','Заключение']];
function _drawExam(p,e,visitNum,apptId,apptType){
  const ge=f=>e?.[f]||'';
  const apptNum = e?.appointment_number || '';
  const pid = p?.id||'';
  const patientCode = p?.patient_code || '';
  const age = p?.dob ? calcAge(p.dob) : '';
  const dobStr = p?.dob ? fmt(p.dob) : '';
  // Галочка «Экспресс-преглед»: сохранённое значение, а для новой карты — по типу записи
  // Дата обследования (exam_date + точность). Для старых карт без exam_date — дата внесения.
  const exDateVal = e?.id ? (e.exam_date || (e.exam_date_prec==='unknown' ? '' : (e.created_at||'').split('T')[0])) : (_examDefaultDate?.date || today());
  const exDatePrec = e?.id ? (e.exam_date_prec || 'day') : (_examDefaultDate?.prec || 'day');
  const isExpress = (e && typeof e.express_pregled==='boolean' && e.id) ? e.express_pregled : /Экспресс/i.test(apptType||'');
  _examData.clinicalPrev = (e && e.clinical) || {};
  const _dot = tab => (typeof _clinTabHasData==='function' && _clinTabHasData(tab,e)) ? '<span class="tab-dot"></span>' : '';
  // Объединяем фиксированный список причин с тем, что пациент реально выбрал в анкете онлайн-записи —
  // чтобы галочка гарантированно стояла именно на его причине, даже если формулировка отличается от VISIT_REASONS
  const bookingReasons = (p?.visit_reason||[]).filter(Boolean);
  const reasonOptions = [...VISIT_REASONS];
  bookingReasons.forEach(br=>{ if(!reasonOptions.includes(br)) reasonOptions.push(br); });
  document.getElementById('modal-container').innerHTML=`
  <div class="modal modal-xl">
    <div class="modal-header">
      <div style="display:flex;flex-direction:column;gap:2px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="modal-title">📋 ${t('exam_card')} — ${p?.name||''}</span>${tgTag(p?.telegram_username)}
          <span class="badge badge-accent">${t('visit')}${visitNum}</span>
          <label class="ex-express${isExpress?' on':''}" title="Отметьте, если это экспресс-преглед — отметка выводится на печать"><input type="checkbox" id="e-express" ${isExpress?'checked':''} onchange="this.parentNode.classList.toggle('on',this.checked);_modalDirty=true"> ⚡ ${(typeof _lang!=='undefined'&&_lang==='sr'?'Ekspres pregled':'Экспресс-преглед')}</label>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:2px">
          ${age?`<span style="font-size:12px;color:var(--text-muted,#64748b)">👤 ${age} лет${dobStr?' ('+dobStr+')':''}</span>`:''}
          ${patientCode?`<span style="font-size:12px;color:var(--text-muted,#64748b);font-family:monospace;background:var(--surface2,#f1f5f9);padding:1px 6px;border-radius:4px">ID: ${patientCode}</span>`:''}
        </div>
        <div class="ex-date"><span>${t('exam_date_label')}</span>${dpHtml('e-exam-date', exDateVal, exDatePrec, ' oninput="_modalDirty=true"')}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="_examClose()">✕</button>
    </div>
    <div class="modal-body">
      <div id="exam-lock-banner" class="exam-lock-banner" data-nolock>
        <span>🔒 ${t('exam_locked_title')} <b class="exam-lock-date"></b> — ${t('exam_locked_hint')}</span>
        <button type="button" class="btn btn-warn btn-sm" onclick="examUnlock()">✏️ ${t('pt_edit')}</button>
      </div>
      <div class="tab-bar">
        ${EXAM_TABS.map(([tab,l])=>`<div class="tab${_examTab===tab?' active':''}" onclick="_examTab='${tab}';_switchExamTab()">${l}${(tab==='refr'||tab==='exam'||tab==='bino')?_dot(tab):''}</div>`).join('')}
      </div>

      <div id="exam-tab-anamn" class="tab-content${_examTab==='anamn'?' active':''}">
        <div class="form-grid">
          <div class="form-group full">
            <label>Причина обращения (можно несколько)</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
              ${reasonOptions.map(r=>{
                const savedReasons=(ge('visit_reason')||'').split(', ');
                const sel=savedReasons.includes(r)||bookingReasons.includes(r);
                return`<label style="display:flex;align-items:center;gap:7px;font-size:15px;font-weight:500;cursor:pointer;background:var(--surface2);padding:8px 14px;border-radius:10px;border:1.5px solid ${sel?'var(--accent)':'var(--border)'}">
                  <input type="checkbox" name="visit_reason" value="${r}" ${sel?'checked':''} style="width:auto;accent-color:var(--accent)" onchange="_modalDirty=true"> ${r}
                </label>`;
              }).join('')}
            </div>
          </div>
          <div class="form-group full"><label>Жалобы</label>
            <textarea id="e-complaints" oninput="_modalDirty=true">${ge('complaints_notes')||((p?.complaints||[]).join(', '))}</textarea>
          </div>
          <div class="form-group"><label>Последнее посещение офтальмолога</label><input id="e-lastoph" value="${ge('last_ophthalmologist')}" style="max-width:280px" oninput="_modalDirty=true"></div>
          <div class="form-group"><label>Глазные заболевания</label><input id="e-eyedis" value="${ge('eye_diseases_notes')||((p?.eye_diseases||[]).join(', '))}" oninput="_modalDirty=true"></div>
          <div class="form-group full"><label>Анамнез (со слов пациента)</label>
            <textarea id="e-gendis" style="min-height:130px" oninput="_modalDirty=true">${ge('general_diseases_notes')||(()=>{
  const gd=p?.general_diseases||[];
  const vl=p?.visual_loads||[];
  const has=kw=>gd.some(d=>d.toLowerCase().includes(kw));
  const ad=has('давлен')||has('pritisak')?'повышенное':'N';
  const tj=has('щитовид')||has('štitne')?'патология':'N';
  const db=has('диабет')||has('dijabet')?'Да':'';
  const loads=vl.filter(l=>!l.includes('Ничего')&&!l.includes('Ništa')).join('; ')||'';
  const diopStr=p?.approx_diopters?'\nДиоптрии (со слов): '+p.approx_diopters:'';
  const preNote=p?.pre_notes?'\nПримечания пациента: '+p.pre_notes:'';
  return'Зрение начало портиться с: \nПервые очки - с: \nТравмы головы: \nТравмы глаз: \nАрт. давление: '+ad+', ЩЖ: '+tj+', Диабет/преддиабет: '+db+'\nАллергия: \nНаследственность: \nХарактер зрительной нагрузки: '+loads+diopStr+preNote;
})()}</textarea>
          </div>
        </div>
        <div class="divider"></div>
        <div class="flex justify-between items-center mb-8">
          <span class="fw-6">Используемая коррекция</span>
          <button class="btn btn-ghost btn-sm" onclick="addCorrection()">+ Добавить</button>
        </div>
        <div id="corr-list">${_renderCorrs()}</div>
      </div>

      <div id="exam-tab-refr" class="tab-content${_examTab==='refr'?' active':''}">
        <div class="rx-section">
          <div class="rx-section-title">Авторефрактометрия</div>
          <table class="rx-table">
            <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th><th>R AVE</th></tr>
            <tr><td>OD</td><td>${_rs('r-od-sph','sph',ge('refr_od_sph'))}</td><td>${_rs('r-od-cyl','cyl',ge('refr_od_cyl'))}</td><td>${_rs('r-od-ax','ax',ge('refr_od_ax'))}</td><td>${_ri('r-od-ave',ge('refr_od_ave'))}</td></tr>
            <tr><td>OS</td><td>${_rs('r-os-sph','sph',ge('refr_os_sph'))}</td><td>${_rs('r-os-cyl','cyl',ge('refr_os_cyl'))}</td><td>${_rs('r-os-ax','ax',ge('refr_os_ax'))}</td><td>${_ri('r-os-ave',ge('refr_os_ave'))}</td></tr>
          </table>
          <div class="rx-shared-row" style="max-width:200px">
            <div class="form-group"><label>PD (оба глаза)</label>${_rs('r-pd','pd',ge('refr_od_pd'))}</div>
          </div>
          ${_comment('r-comment',ge('refr_comment'),'Комментарий к авторефрактометрии')}
          ${_prevBox('refr')}
        </div>
        ${typeof _clinTabHtml==='function'?_clinTabHtml('refr',e):''}
      </div>

      <div id="exam-tab-exam" class="tab-content${_examTab==='exam'?' active':''}">
        <div class="rx-section">
          <div class="ex-own">
            <label>Visus в своих очках OU</label>
            <input id="cl-va-own-ou" data-clin="va_own_ou" value="${_escH((e?.clinical||{}).va_own_ou||'')}" oninput="_modalDirty=true">
          </div>
          <div class="rx-section-title">Результаты обследования</div>
          <div class="ex-tools"><button class="btn btn-ghost btn-sm" type="button" tabindex="-1" onclick="clinCopyAutorefToExam()">← Взять из авторефрактометрии</button></div>
          <table class="rx-table" style="table-layout:fixed;width:100%">
            <colgroup>
              <col style="width:32px">
              <col style="width:60px">
              <col style="width:52px">
              <col style="width:110px">
              <col style="width:110px">
              <col style="width:60px">
              <col style="width:52px">
              <col style="width:70px">
              <col style="width:80px">
            </colgroup>
            <tr><th></th><th style="font-size:10px">Visus OU b/k</th><th style="font-size:10px">Visus b/k</th><th>sa Sph</th><th>Cyl</th><th>Ax</th><th style="font-size:10px">Visus s/k</th><th style="font-size:10px">Visus OU s/k</th><th>Prisma</th></tr>
            <tr><td>OD</td><td rowspan="2" style="vertical-align:middle;text-align:center"><input id="cl-va-ou-wo" data-clin="va_ou_wo" value="${_escH((e?.clinical||{}).va_ou_wo||'')}" oninput="_modalDirty=true" style="min-width:36px;max-width:60px"></td><td>${_ri('x-od-wo',ge('exam_od_without'),true)}</td><td>${_rsNoBtn('x-od-cs','sph',ge('exam_od_cosph'))}</td><td>${_rsNoBtn('x-od-cyl','cyl',ge('exam_od_cyl'))}</td><td>${_rsNoBtn('x-od-ax','ax',ge('exam_od_ax'))}</td><td>${_ri('x-od-wi',ge('exam_od_with'),true)}</td><td rowspan="2" style="vertical-align:middle;text-align:center">${_ri('x-ou',ge('exam_ou'),true)}</td><td>${_ri('x-od-prism',ge('exam_od_prism')||'',true)}</td></tr>
            <tr><td>OS</td><td>${_ri('x-os-wo',ge('exam_os_without'),true)}</td><td>${_rsNoBtn('x-os-cs','sph',ge('exam_os_cosph'))}</td><td>${_rsNoBtn('x-os-cyl','cyl',ge('exam_os_cyl'))}</td><td>${_rsNoBtn('x-os-ax','ax',ge('exam_os_ax'))}</td><td>${_ri('x-os-wi',ge('exam_os_with'),true)}</td><td>${_ri('x-os-prism',ge('exam_os_prism')||'',true)}</td></tr>
          </table>
          ${_comment('x-comment',ge('exam_comment'),'Комментарий к обследованию')}
          ${_prevBox('exam')}
          ${_privNote('note_exam',(e?.clinical||{}).note_exam,'Мои заметки по обследованию')}
        </div>
        ${typeof _clinTabHtml==='function'?_clinTabHtml('exam',e):''}
      </div>

      <div id="exam-tab-bino" class="tab-content${_examTab==='bino'?' active':''}">
        ${typeof _clinTabHtml==='function'?_clinTabHtml('bino',e):''}
      </div>

      <div id="exam-tab-rx" class="tab-content${_examTab==='rx'?' active':''}">
        ${_prevBox('rx')}
        <label class="ex-interim${e?.clinical?.interim?' on':''}">
          <input type="checkbox" id="e-interim" data-clin="interim" ${e?.clinical?.interim?'checked':''} onchange="clinInterimToggle(this.checked)">
          <span><b>Промежуточная коррекция для адаптации</b><br><span style="font-weight:400">Бюджетные линзы · контроль через 6–8 недель · затем замена диоптрий в сторону полной коррекции</span></span>
        </label>
        <div class="rx-section">
          <div class="rx-section-title">Параметры для изготовления очков <select id="rf-purpose" class="rx-purpose" onchange="_modalDirty=true;_rxAddLbl(this)">${rxPurposeOptions(ge('rx_far_purpose')||'far')}</select></div>
          <div class="ex-tools"><button class="btn btn-ghost btn-sm" type="button" tabindex="-1" onclick="clinCopyExamToFar()">← Из результатов обследования</button></div>
          <table class="rx-table">
            <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th><th>Prism</th></tr>
            <tr><td>OD</td><td>${_rs('rf-od-sph','sph',ge('rx_far_od_sph'))}</td><td>${_rs('rf-od-cyl','cyl',ge('rx_far_od_cyl'))}</td><td>${_rs('rf-od-ax','ax',ge('rx_far_od_ax'))}</td><td>${_rs('rf-od-prism','prism',ge('rx_far_od_prism'))}</td></tr>
            <tr><td>OS</td><td>${_rs('rf-os-sph','sph',ge('rx_far_os_sph'))}</td><td>${_rs('rf-os-cyl','cyl',ge('rx_far_os_cyl'))}</td><td>${_rs('rf-os-ax','ax',ge('rx_far_os_ax'))}</td><td>${_rs('rf-os-prism','prism',ge('rx_far_os_prism'))}</td></tr>
          </table>
          <div class="rx-shared-row">
            <div class="form-group" style="max-width:80px"><label>PD</label>${_rs('rf-pd','pd',ge('rx_far_od_pd'))}</div>
            <div class="form-group" style="max-width:80px"><label data-addlbl>${rxAddLabel(ge('rx_far_purpose')||'far')}</label>${_rs('rf-add','add',ge('rx_far_os_pd'))}</div>
          </div>
          ${_comment('rf-comment',ge('rx_far_comment'),'Комментарий к коррекции')}
          ${_privNote('note_rx_far',(e?.clinical||{}).note_rx_far,'Мои заметки — как подбирала')}
        </div>
        <div class="rx-section">
          <div class="rx-section-title">Параметры для изготовления очков <select id="rc-purpose" class="rx-purpose" onchange="_modalDirty=true;_rxAddLbl(this)">${rxPurposeOptions(ge('rx_comp_purpose')||'comp')}</select></div>
          <div class="ex-tools"><button class="btn btn-ghost btn-sm" type="button" tabindex="-1" onclick="clinFarPlusAdd('rc')">= Даль + ½ ADD</button></div>
          <table class="rx-table">
            <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th><th>Prism</th></tr>
            <tr><td>OD</td><td>${_rs('rc-od-sph','sph',ge('rx_comp_od_sph'))}</td><td>${_rs('rc-od-cyl','cyl',ge('rx_comp_od_cyl'))}</td><td>${_rs('rc-od-ax','ax',ge('rx_comp_od_ax'))}</td><td>${_rs('rc-od-prism','prism',ge('rx_comp_od_prism'))}</td></tr>
            <tr><td>OS</td><td>${_rs('rc-os-sph','sph',ge('rx_comp_os_sph'))}</td><td>${_rs('rc-os-cyl','cyl',ge('rx_comp_os_cyl'))}</td><td>${_rs('rc-os-ax','ax',ge('rx_comp_os_ax'))}</td><td>${_rs('rc-os-prism','prism',ge('rx_comp_os_prism'))}</td></tr>
          </table>
          <div class="rx-shared-row">
            <div class="form-group" style="max-width:80px"><label>PD</label>${_rs('rc-pd','pd',ge('rx_comp_od_pd'))}</div>
            <div class="form-group" style="max-width:80px"><label data-addlbl>${rxAddLabel(ge('rx_comp_purpose')||'comp')}</label>${_rs('rc-add','add',ge('rx_comp_od_add'))}</div>
          </div>
          ${_comment('rc-comment',ge('rx_comp_comment'),'Комментарий к коррекции')}
          ${_privNote('note_rx_comp',(e?.clinical||{}).note_rx_comp,'Мои заметки — как подбирала')}
        </div>
        <div class="rx-section">
          <div class="rx-section-title">Параметры для изготовления очков <select id="rn-purpose" class="rx-purpose" onchange="_modalDirty=true;_rxAddLbl(this)">${rxPurposeOptions(ge('rx_near_purpose')||'near')}</select></div>
          <div class="ex-tools"><button class="btn btn-ghost btn-sm" type="button" tabindex="-1" onclick="clinFarPlusAdd('rn')">= Даль + ADD</button></div>
          <table class="rx-table">
            <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th><th>Prism</th></tr>
            <tr><td>OD</td><td>${_rs('rn-od-sph','sph',ge('rx_near_od_sph'))}</td><td>${_rs('rn-od-cyl','cyl',ge('rx_near_od_cyl'))}</td><td>${_rs('rn-od-ax','ax',ge('rx_near_od_ax'))}</td><td>${_rs('rn-od-prism','prism',ge('rx_near_od_prism'))}</td></tr>
            <tr><td>OS</td><td>${_rs('rn-os-sph','sph',ge('rx_near_os_sph'))}</td><td>${_rs('rn-os-cyl','cyl',ge('rx_near_os_cyl'))}</td><td>${_rs('rn-os-ax','ax',ge('rx_near_os_ax'))}</td><td>${_rs('rn-os-prism','prism',ge('rx_near_os_prism'))}</td></tr>
          </table>
          <div class="rx-shared-row">
            <div class="form-group" style="max-width:80px"><label>PD</label>${_rs('rn-pd','pd',ge('rx_near_od_pd'))}</div>
            <div class="form-group" style="max-width:80px"><label data-addlbl>${rxAddLabel(ge('rx_near_purpose')||'near')}</label>${_rs('rn-degr','degr',ge('rx_near_od_add'))}</div>
          </div>
          ${_comment('rn-comment',ge('rx_near_comment'),'Комментарий к коррекции')}
          ${_privNote('note_rx_near',(e?.clinical||{}).note_rx_near,'Мои заметки — как подбирала')}
        </div>
        <div id="rx-extra-box">${rxExtraList(e).map(_rxExtraHtml).join('')}</div>
        <button type="button" class="btn btn-ghost rx-extra-add" onclick="rxExtraAdd()">+ Ещё коррекция на очки (например, вторая для дали — послабее)</button>
        <div class="rx-section">
          <div class="rx-section-title">Параметры для заказа контактных линз</div>
          <div class="ex-tools"><button class="btn btn-ghost btn-sm" type="button" tabindex="-1" onclick="clinFarToCL()" title="Вертекс от ±4.00 D, округление в плюс, Cyl ≤ 0.75 → сферический эквивалент, торика под стандартную линейку">← Рассчитать из очков для дали</button></div>
          <div id="cl-calc-note" style="display:none;font-size:12.5px;color:var(--text-m);background:var(--surface);border:1px dashed var(--border);border-radius:8px;padding:6px 10px;margin:-2px 0 10px"></div>
          <table class="rx-table">
            <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th></tr>
            <tr><td>OD</td><td>${_rs('rcl-od-sph','sph',ge('rx_cl_od_sph'))}</td><td>${_rs('rcl-od-cyl','cyl',ge('rx_cl_od_cyl'))}</td><td>${_rs('rcl-od-ax','ax',ge('rx_cl_od_ax'))}</td></tr>
            <tr><td>OS</td><td>${_rs('rcl-os-sph','sph',ge('rx_cl_os_sph'))}</td><td>${_rs('rcl-os-cyl','cyl',ge('rx_cl_os_cyl'))}</td><td>${_rs('rcl-os-ax','ax',ge('rx_cl_os_ax'))}</td></tr>
          </table>
          <div class="rx-shared-row">
            <div class="form-group" style="max-width:80px"><label>BC</label>${_rs('rcl-bc','bc',ge('rx_cl_od_bc'))}</div>
            <div class="form-group" style="max-width:80px"><label>DIA</label>${_rs('rcl-dia','dia',ge('rx_cl_od_dia'))}</div>
          </div>
          <div class="form-group mt-8"><label>Рекомендуемые контактные линзы</label><input id="rcl-type" value="${ge('rx_cl_od_type')}" oninput="_modalDirty=true"></div>
          ${_comment('rcl-comment',ge('rx_cl_comment'),'Комментарий')}
          ${_privNote('note_rx_cl',(e?.clinical||{}).note_rx_cl,'Мои заметки — как подбирала')}
        </div>
      </div>

      <div id="exam-tab-concl" class="tab-content${_examTab==='concl'?' active':''}">
        <div class="form-group"><label>Рекомендации</label>
          <div class="ex-tools" style="margin:0 0 6px">${Object.keys(REC_BLOCKS).map(k=>`<button class="btn btn-ghost btn-sm" type="button" tabindex="-1" onclick="addRecBlock('${k}')">+ ${REC_BLOCKS[k].label}</button>`).join('')}</div>
          ${_lineChipsHtml()}
          <textarea id="e-recs" style="min-height:360px;font-size:14.5px;line-height:1.55" oninput="_modalDirty=true;_wearSync()">${ge('recommendations')||DEFAULT_RECS}</textarea>
          <div style="font-size:12px;color:var(--text-m);margin-top:4px">«## » — заголовок, «• » — пункт, «1) » — шаг схемы, «🇷🇸 » — подсказка по-сербски, «⚠️ » — предупреждение. На печати оформляется автоматически.</div>
        </div>
        <div class="divider"></div>
        <div class="form-grid">
          <div class="form-group"><label>Дата контрольного визита</label>
            <select id="e-ctrl-sel" onchange="updateCtrlDate(this.value)">
              <option value="">— не задана —</option>
              <option value="w6">Через 6 недель (промежуточная коррекция)</option>
              <option value="1">Через 1 месяц</option>
              <option value="3">через 3 месяца</option>
              <option value="6">Через 6 месяцев</option>
              <option value="12">Через 12 месяцев</option>
            </select>
          </div>
          <div class="form-group"><label>Дата контроля</label><input type="date" id="e-ctrl-date" value="${ge('control_date')}" oninput="_modalDirty=true"></div>
        </div>
      </div>
    </div>
    <div class="modal-footer" style="flex-wrap:wrap;gap:8px">
      <button class="btn btn-ghost" onclick="_examClose()" style="margin-right:auto">${t('btn_close')}</button>
      <button class="btn btn-ghost" onclick="saveBeforeEmail('${e?.id||''}','${apptId}','${pid}','${visitNum}','patient')">📧 Пациенту</button>
      <button class="btn btn-ghost" onclick="saveBeforeEmail('${e?.id||''}','${apptId}','${pid}','${visitNum}','clinic')">📧 В оптику</button>
      <button class="btn btn-warn exam-unlock-btn" data-nolock onclick="examUnlock()">✏️ ${t('pt_edit')}</button>
      <button class="btn btn-ghost exam-edit-only" data-hotkey-save="1" title="Ctrl+S" onclick="saveExam('${e?.id||''}','${apptId}','${pid}','${visitNum}')">💾 ${t('btn_save')}</button>
      <button class="btn btn-accent" onclick="saveAndPrint('${e?.id||''}','${apptId}','${pid}','${visitNum}')">🖨️ ${t('btn_print')}</button>
    </div>
  </div>`;
  // Клинические поля (exam-clinical.js) тоже без плейсхолдеров
  document.querySelectorAll('#modal-container [placeholder]').forEach(el=>el.removeAttribute('placeholder'));
  _wearSync();
}
function _examClose(){
  if(_modalDirty && !_examIsLocked() && !confirm(t('close_unsaved'))) return;
  closeModal();
  _examRefreshPatient();
}
// Карточка пациента справа обновляется после сохранения/закрытия карты осмотра
function _examRefreshPatient(){
  if(typeof _openPatientId!=='undefined' && _openPatientId && document.getElementById('pt-detail')) _renderPatientCard(_openPatientId);
}
function _switchExamTab(){
  document.querySelectorAll('[id^=exam-tab-]').forEach(t=>t.classList.remove('active'));
  document.getElementById('exam-tab-'+_examTab)?.classList.add('active');
  document.querySelectorAll('.tab-bar .tab').forEach((t,i)=>{
    const tabs=EXAM_TABS.map(x=>x[0]);
    t.classList.toggle('active',tabs[i]===_examTab);
  });
}
function updateCtrlDate(m){
  if(!m) return;
  const el=document.getElementById('e-ctrl-date');
  // Отсчёт от даты обследования (если она точная), иначе от сегодня
  const exD = document.getElementById('e-exam-date') ? dpGet('e-exam-date') : null;
  const base = exD && exD.prec==='day' && exD.date ? exD.date : today();
  if(m==='w6'){ const d=new Date(base+'T12:00:00'); d.setDate(d.getDate()+42); el.value=d.toISOString().split('T')[0]; }
  else el.value=addMonths(base,+m);
  _modalDirty=true;
}
function _reRenderCorrs(){
  document.getElementById('corr-list').innerHTML=_renderCorrs();
  // Перерисовка через innerHTML не подхватывается общим initEnterNavigation() (вызывается
  // один раз при открытии модалки), поэтому навешиваем Enter-навигацию на новые поля заново.
  if(typeof initEnterNavigation==='function') initEnterNavigation();
}
function _renderCorrs(){
  if(!_examData.corrections.length)return`<p class="text-sm text-m">Нет используемой коррекции</p>`;
  return _examData.corrections.map((c,i)=>{
    const isMKL=c.type==='МКЛ';
    return`<div class="corr-item">
      <div class="flex justify-between items-center mb-8">
        <select style="width:auto;min-width:220px" onchange="_examData.corrections[${i}].type=this.value;_reRenderCorrs()">
          ${CORR_TYPES.map(t=>`<option ${c.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <button class="btn btn-danger btn-xs" onclick="_examData.corrections.splice(${i},1);_reRenderCorrs()">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:36px 1fr 1fr 1fr${isMKL?'':' 1fr'};gap:6px;align-items:start;margin-bottom:4px">
        <span class="text-sm fw-6 text-m" style="padding-top:18px">OD</span>
        <div><label style="font-size:10px">Sph</label><input value="${c.od_sph||''}" data-rx="sph" oninput="_examData.corrections[${i}].od_sph=this.value;_modalDirty=true" style="width:100%;text-align:center"></div>
        <div><label style="font-size:10px">Cyl</label><input value="${c.od_cyl||''}" data-rx="cyl" oninput="_examData.corrections[${i}].od_cyl=this.value;_modalDirty=true" style="width:100%;text-align:center"></div>
        <div><label style="font-size:10px">Ax</label><input value="${c.od_ax||''}" data-rx="ax" oninput="_examData.corrections[${i}].od_ax=this.value;_modalDirty=true" style="width:100%;text-align:center"></div>
        ${isMKL?'':`<div><label style="font-size:10px">Prism</label><input value="${c.od_prism||''}" oninput="_examData.corrections[${i}].od_prism=this.value;_modalDirty=true" style="width:100%;text-align:center"></div>`}
      </div>
      <div style="display:grid;grid-template-columns:36px 1fr 1fr 1fr${isMKL?'':' 1fr'};gap:6px;align-items:center;margin-bottom:8px">
        <span class="text-sm fw-6 text-m">OS</span>
        <div><input value="${c.os_sph||''}" data-rx="sph" oninput="_examData.corrections[${i}].os_sph=this.value;_modalDirty=true" style="width:100%;text-align:center"></div>
        <div><input value="${c.os_cyl||''}" data-rx="cyl" oninput="_examData.corrections[${i}].os_cyl=this.value;_modalDirty=true" style="width:100%;text-align:center"></div>
        <div><input value="${c.os_ax||''}" data-rx="ax" oninput="_examData.corrections[${i}].os_ax=this.value;_modalDirty=true" style="width:100%;text-align:center"></div>
        ${isMKL?'':`<div><input value="${c.os_prism||''}" oninput="_examData.corrections[${i}].os_prism=this.value;_modalDirty=true" style="width:100%;text-align:center"></div>`}
      </div>
      <div style="display:grid;grid-template-columns:60px 60px 1fr 1fr;gap:8px;align-items:end">
        ${isMKL?`
          <div class="form-group"><label>BC</label><input value="${c.bc||''}" oninput="_examData.corrections[${i}].bc=this.value;_modalDirty=true"></div>
          <div class="form-group"><label>DIA</label><input value="${c.dia||''}" oninput="_examData.corrections[${i}].dia=this.value;_modalDirty=true"></div>
        `:`
          <div class="form-group"><label>PD</label><input value="${c.pd||''}" oninput="_examData.corrections[${i}].pd=this.value;_modalDirty=true"></div>
          <div class="form-group"><label>ADD</label><input value="${c.add||''}" oninput="_examData.corrections[${i}].add=this.value;_modalDirty=true" data-rx="add"></div>
        `}
        <div class="form-group"><label>Тип линз</label><input value="${c.lens_type||''}" oninput="_examData.corrections[${i}].lens_type=this.value;_modalDirty=true"></div>
        <div class="form-group"><label>Длительность</label><input value="${c.duration||''}" oninput="_examData.corrections[${i}].duration=this.value;_modalDirty=true"></div>
      </div>
      <div class="form-group mt-8"><label>Примечание</label><input value="${c.note||''}" oninput="_examData.corrections[${i}].note=this.value;_modalDirty=true" style="width:100%"></div>
      ${isMKL?`<div class="form-group mt-8"><label>Вид МКЛ</label><input value="${c.cl_type||''}" oninput="_examData.corrections[${i}].cl_type=this.value;_modalDirty=true"></div>`:''}`+
    `</div>`;
  }).join('');
}
function addCorrection(){_examData.corrections.push({type:'Очки для дали'});_reRenderCorrs();}

async function saveExam(id,apptId,patientId,visitNum){
  if(_examIsLocked()){ toast(t('exam_locked_save'),'info'); return _currentExamId||id||null; }
  const effectiveId = _currentExamId || id || '';
  const exD = dpGet('e-exam-date');
  if(!exD.ok){ toast(t('dp_year_err'),'error'); return null; }
  const vs = id=>{ const el=document.getElementById(id); return el?el.value:''; };
  const data={
    appointment_id:apptId||null,patient_id:patientId,visit_number:+visitNum,
    exam_date:exD.date,exam_date_prec:exD.prec,
    visit_reason:[...document.querySelectorAll('input[name="visit_reason"]:checked')].map(cb=>cb.value).join(', '),
    complaints_notes:vs('e-complaints'),last_ophthalmologist:vs('e-lastoph'),
    eye_diseases_notes:vs('e-eyedis'),general_diseases_notes:vs('e-gendis'),
    current_corrections:_examData.corrections,
    refr_od_sph:vs('r-od-sph'),refr_od_cyl:vs('r-od-cyl'),refr_od_ax:vs('r-od-ax'),refr_od_pd:vs('r-pd'),refr_od_ave:vs('r-od-ave'),
    refr_os_sph:vs('r-os-sph'),refr_os_cyl:vs('r-os-cyl'),refr_os_ax:vs('r-os-ax'),refr_os_pd:vs('r-pd'),refr_os_ave:vs('r-os-ave'),
    refr_comment:vs('r-comment'),
    exam_od_without:vs('x-od-wo'),exam_od_cosph:vs('x-od-cs'),exam_od_cyl:vs('x-od-cyl'),exam_od_ax:vs('x-od-ax'),exam_od_with:vs('x-od-wi'),exam_od_prism:vs('x-od-prism'),
    exam_os_without:vs('x-os-wo'),exam_os_cosph:vs('x-os-cs'),exam_os_cyl:vs('x-os-cyl'),exam_os_ax:vs('x-os-ax'),exam_os_with:vs('x-os-wi'),exam_os_prism:vs('x-os-prism'),
    exam_ou:vs('x-ou'),
    exam_comment:vs('x-comment'),
    rx_far_enabled:true,
    rx_far_od_sph:vs('rf-od-sph'),rx_far_od_cyl:vs('rf-od-cyl'),rx_far_od_ax:vs('rf-od-ax'),rx_far_od_pd:vs('rf-pd'),rx_far_od_prism:vs('rf-od-prism'),
    rx_far_os_sph:vs('rf-os-sph'),rx_far_os_cyl:vs('rf-os-cyl'),rx_far_os_ax:vs('rf-os-ax'),rx_far_os_pd:vs('rf-add'),rx_far_os_prism:vs('rf-os-prism'),
    rx_far_comment:vs('rf-comment'),rx_far_purpose:vs('rf-purpose')||null,
    rx_comp_purpose:vs('rc-purpose')||null,rx_near_purpose:vs('rn-purpose')||null,
    rx_extra:_rxExtraCollect(),
    rx_comp_enabled:true,
    rx_comp_od_sph:vs('rc-od-sph'),rx_comp_od_cyl:vs('rc-od-cyl'),rx_comp_od_ax:vs('rc-od-ax'),rx_comp_od_pd:vs('rc-pd'),rx_comp_od_add:vs('rc-add'),rx_comp_od_prism:vs('rc-od-prism'),
    rx_comp_os_sph:vs('rc-os-sph'),rx_comp_os_cyl:vs('rc-os-cyl'),rx_comp_os_ax:vs('rc-os-ax'),rx_comp_os_prism:vs('rc-os-prism'),
    rx_comp_comment:vs('rc-comment'),
    rx_near_enabled:true,
    rx_near_od_sph:vs('rn-od-sph'),rx_near_od_cyl:vs('rn-od-cyl'),rx_near_od_ax:vs('rn-od-ax'),rx_near_od_pd:vs('rn-pd'),rx_near_od_add:vs('rn-degr'),rx_near_od_prism:vs('rn-od-prism'),
    rx_near_os_sph:vs('rn-os-sph'),rx_near_os_cyl:vs('rn-os-cyl'),rx_near_os_ax:vs('rn-os-ax'),rx_near_os_prism:vs('rn-os-prism'),
    rx_near_comment:vs('rn-comment'),
    rx_cl_enabled:true,
    rx_cl_od_sph:vs('rcl-od-sph'),rx_cl_od_cyl:vs('rcl-od-cyl'),rx_cl_od_ax:vs('rcl-od-ax'),
    rx_cl_od_bc:vs('rcl-bc'),rx_cl_od_dia:vs('rcl-dia'),rx_cl_od_type:vs('rcl-type'),
    rx_cl_os_sph:vs('rcl-os-sph'),rx_cl_os_cyl:vs('rcl-os-cyl'),rx_cl_os_ax:vs('rcl-os-ax'),
    rx_cl_comment:vs('rcl-comment'),
    recommendations:vs('e-recs'),control_date:vs('e-ctrl-date')||null,
    express_pregled:!!document.getElementById('e-express')?.checked,
    clinical:(typeof _clinCollect==='function')?_clinCollect(_examData.clinicalPrev):undefined
  };
  if(data.clinical===undefined) delete data.clinical;
  try{
    if(effectiveId){
      const{error}=await db.from('examinations').update(data).eq('id',effectiveId);
      if(error)throw error;
      toast(t('save_card'),'success');
    }else{
      const{data:ne,error}=await db.from('examinations').insert(data).select().single();
      if(error)throw error;
      if(ne?.id){ _currentExamId=ne.id; window._lastExamId=ne.id; }
      toast(t('card_created'),'success');
    }
    _modalDirty=false;
    _examRefreshPatient();
    return _currentExamId||effectiveId;
  }catch(err){
    console.error('saveExam error:',err);
    if(err.message&&err.message.includes('column')){
      const badCol = err.message.match(/\'([^']+)\'/)?.[1];
      if(badCol && data[badCol]!==undefined){ delete data[badCol]; }
      try{
        if(effectiveId){
          const{error:e2}=await db.from('examinations').update(data).eq('id',effectiveId);
          if(e2)throw e2;
        }else{
          const{data:ne,error:e2}=await db.from('examinations').insert(data).select().single();
          if(e2)throw e2;
          if(ne?.id){ _currentExamId=ne.id; window._lastExamId=ne.id; }
        }
        _modalDirty=false;
        toast(t('save_card'),'success');
        return _currentExamId||effectiveId;
      }catch(err2){
        toast('❌ '+t('save_error')+': '+(err2.message||'нет связи'),'error');
        return null;
      }
    }
    toast('❌ '+t('save_error')+': '+(err.message||'нет связи'),'error');
    return null;
  }
}

async function saveAndPrint(id,apptId,patientId,visitNum){
  const eid = _examIsLocked() ? (_currentExamId||id) : await saveExam(id,apptId,patientId,visitNum);
  if(eid) await printExam(eid);
}

async function saveBeforeEmail(id,apptId,patientId,visitNum,target){
  const eid = _examIsLocked() ? (_currentExamId||id) : await saveExam(id,apptId,patientId,visitNum);
  if(eid) await emailExam(eid,target);
}

// ═══ PRINT ═══
// Сборка печатных форм (_buildPrintCard, _buildPatientPrintCard, _openPrintWindow) — в js/print.js.
async function printExam(examId){
  const {e,p} = await _buildPrintCard(examId);
  const date=e?fmtExamDate(e):fmt(today());
  const title=`${t('exam_card')} — ${p?.name||'pacijent'} — ${date}`;
  const html=document.getElementById('print-area').innerHTML;
  _openPrintWindow(title, html);
}

async function emailExam(examId,target){
  toast('Строим карту...','info');
  const{e,p}=await _buildPrintCard(examId);
  const{data:sRows}=await db.from('settings').select('key,value').in('key',['doctor_name']);
  const s={}; (sRows||[]).forEach(r=>s[r.key]=r.value);
  const date=e?fmtExamDate(e):fmt(today());
  const title=`${t('exam_card')} — ${p?.name||'pacijent'} — ${date}`;
  const html=document.getElementById('print-area').innerHTML;
  _openPrintWindow(title, html);
  let toEmail = target==='clinic' ? 'optikaginter@yahoo.com' : (p?.email||'');
  if(target==='patient'&&!toEmail){ toast('Email pacijenta nije naveden','error'); return; }
  let subj, body;
  if(target==='clinic'){
    subj=`${p?.name||''}`;
    body=`Karta pacijenta ${p?.name||''}`;
  } else {
    subj=`${p?.name||''}`;
    body=`Здравствуйте!\n\nПрикрепляю вашу карту оптометрического обследования.\nДата приёма: ${date}, Визит №${e?.visit_number||1}\n\nС уважением,\n${s.doctor_name||'Ana Novoselova'}`;
  }
  toast('Sacuvajte PDF i prilozite uz pismo','info');
  setTimeout(()=>{ const ml=document.createElement('a');ml.href=`mailto:${toEmail}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;ml.target='_blank';document.body.appendChild(ml);ml.click();document.body.removeChild(ml); },1500);
}

async function savePatientPDF(pid) {
  toast('Строим карточку...','info');
  const p = await _buildPatientPrintCard(pid);
  if(!p) { toast('Ошибка: пациент не найден','error'); return; }
  const title = `Karton pacijenta — ${p.name||'pacijent'} — ${new Date().toLocaleDateString('sr-Latn-RS')}`;
  const html = document.getElementById('print-area').innerHTML;
  _openPrintWindow(title, html);
}

async function emailPatientPDF(pid, target) {
  toast('Строим карточку...','info');
  const p = await _buildPatientPrintCard(pid);
  if(!p) { toast('Ошибка: пациент не найден','error'); return; }
  const date_str = new Date().toLocaleDateString('sr-Latn-RS',{day:'2-digit',month:'2-digit',year:'numeric'});
  const title = `Karton pacijenta — ${p.name||'pacijent'} — ${date_str}`;
  const html = document.getElementById('print-area').innerHTML;
  _openPrintWindow(title, html);
  const toEmail = target==='clinic' ? 'optikaginter@yahoo.com' : (p.email||'');
  if(target==='patient' && !toEmail) { toast('Email pacijenta nije naveden u kartonu','error'); return; }
  const subj = `Karton pacijenta — ${p.name||''} — ${date_str}`;
  const body = target==='clinic'
    ? `Kartica pacijenta ${p.name||''} formirana ${date_str}.\n\nPrilozite sacuvani PDF uz pismo.\n\nS postovanjem,\nAna Novoselova`
    : `Здравствуйте, ${(p.name||'').split(' ')[0]}!\n\nПрикрепляю вашу карточку пациента из Optike Ginter.\n\nС уважением,\nАна Новосёлова\nОптометрист · Нови-Сад`;
  setTimeout(()=>{ const ml=document.createElement('a');ml.href=`mailto:${toEmail}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;ml.target='_blank';document.body.appendChild(ml);ml.click();document.body.removeChild(ml); },1200);
}
