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
• Плановый осмотр офтальмолога — 1 раз в год.
• Рекомендован осмотр офтальмолога.`},
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
🇷🇸 В аптеке: «Dobar dan, trebaju mi kapi za oči HYLO-COMOD.» Если нет: «Imate li neke veštačke suze bez konzervansa, sa hijaluronskom kiselinom?»
⚠️ Покраснение, боль, выделения или резкое ухудшение зрения — это не к каплям: срочно к офтальмологу.`},
  adapt: {label:'Адаптация к очкам', text:`## Адаптация к новым очкам
В первые дни нормально: лёгкое головокружение, «наклон» пола, искажение формы предметов, усталость глаз.
Надевайте очки утром сразу после пробуждения. Если дискомфортно — привыкайте по шагам, каждый день начиная с того шага, на котором остановились:
1) 15 мин в очках → 5 мин отдыха
2) 20 мин в очках → 5 мин отдыха
3) 25 мин в очках → 5 мин отдыха
4) 35 мин в очках → 5 мин отдыха
5) Очки весь день
• Старые очки не надевайте — это затягивает привыкание.
• Обычно адаптация занимает до 2 недель. Если дискомфорт сохраняется дольше — напишите @AnnaNvslv, назначим бесплатный контрольный визит.`},
  interim: {label:'Промежуточная коррекция', text:`## Промежуточная коррекция
• Эти очки — промежуточный этап: переходим к полной коррекции постепенно, чтобы привыкание было комфортным.
• Рекомендуем бюджетные линзы — через 6–8 недель диоптрии будут изменены.
• Контрольный визит через 6–8 недель (бесплатно, 30 минут): проверим адаптацию и подберём следующий шаг. Telegram-бот напомнит и пришлёт ссылку на запись.`},
};
const DEFAULT_RECS = ['control','hygiene','drops','adapt'].map(k=>REC_BLOCKS[k].text).join('\n\n');
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

const EXAM_TABS=[['anamn','Анамнез'],['refr','Рефрактометрия'],['exam','Обследование'],['bino','Бинокулярное / аккомодация'],['rx','Рецепты'],['concl','Заключение']];
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
          ${apptNum?`<span class="badge badge-accent">${apptNum}</span>`:`<span class="badge badge-accent">${t('visit')}${visitNum}</span>`}
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
        </div>
        ${typeof _clinTabHtml==='function'?_clinTabHtml('refr',e):''}
      </div>

      <div id="exam-tab-exam" class="tab-content${_examTab==='exam'?' active':''}">
        <div class="rx-section">
          <div class="rx-section-title">Результаты обследования</div>
          <div class="ex-tools"><button class="btn btn-ghost btn-sm" type="button" tabindex="-1" onclick="clinCopyAutorefToExam()">← Взять из авторефрактометрии</button></div>
          <table class="rx-table" style="table-layout:fixed;width:100%">
            <colgroup>
              <col style="width:32px">
              <col style="width:52px">
              <col style="width:110px">
              <col style="width:110px">
              <col style="width:60px">
              <col style="width:52px">
              <col style="width:70px">
              <col style="width:80px">
            </colgroup>
            <tr><th></th><th style="font-size:10px">Visus b/k</th><th>sa Sph</th><th>Cyl</th><th>Ax</th><th style="font-size:10px">Visus s/k</th><th style="font-size:10px">Visus OU s/k</th><th>Prisma</th></tr>
            <tr><td>OD</td><td>${_ri('x-od-wo',ge('exam_od_without'),true)}</td><td>${_rsNoBtn('x-od-cs','sph',ge('exam_od_cosph'))}</td><td>${_rsNoBtn('x-od-cyl','cyl',ge('exam_od_cyl'))}</td><td>${_rsNoBtn('x-od-ax','ax',ge('exam_od_ax'))}</td><td>${_ri('x-od-wi',ge('exam_od_with'),true)}</td><td rowspan="2" style="vertical-align:middle;text-align:center">${_ri('x-ou',ge('exam_ou'),true)}</td><td>${_ri('x-od-prism',ge('exam_od_prism')||'',true)}</td></tr>
            <tr><td>OS</td><td>${_ri('x-os-wo',ge('exam_os_without'),true)}</td><td>${_rsNoBtn('x-os-cs','sph',ge('exam_os_cosph'))}</td><td>${_rsNoBtn('x-os-cyl','cyl',ge('exam_os_cyl'))}</td><td>${_rsNoBtn('x-os-ax','ax',ge('exam_os_ax'))}</td><td>${_ri('x-os-wi',ge('exam_os_with'),true)}</td><td>${_ri('x-os-prism',ge('exam_os_prism')||'',true)}</td></tr>
          </table>
          ${_comment('x-comment',ge('exam_comment'),'Комментарий к обследованию')}
        </div>
        ${typeof _clinTabHtml==='function'?_clinTabHtml('exam',e):''}
      </div>

      <div id="exam-tab-bino" class="tab-content${_examTab==='bino'?' active':''}">
        ${typeof _clinTabHtml==='function'?_clinTabHtml('bino',e):''}
      </div>

      <div id="exam-tab-rx" class="tab-content${_examTab==='rx'?' active':''}">
        <label class="ex-interim${e?.clinical?.interim?' on':''}">
          <input type="checkbox" id="e-interim" data-clin="interim" ${e?.clinical?.interim?'checked':''} onchange="clinInterimToggle(this.checked)">
          <span><b>Промежуточная коррекция для адаптации</b><br><span style="font-weight:400">Бюджетные линзы · контроль через 6–8 недель · затем замена диоптрий в сторону полной коррекции</span></span>
        </label>
        <div class="rx-section">
          <div class="rx-section-title">Параметры для изготовления очков для дали</div>
          <div class="ex-tools"><button class="btn btn-ghost btn-sm" type="button" tabindex="-1" onclick="clinCopyExamToFar()">← Из результатов обследования</button></div>
          <table class="rx-table">
            <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th><th>Prism</th></tr>
            <tr><td>OD</td><td>${_rs('rf-od-sph','sph',ge('rx_far_od_sph'))}</td><td>${_rs('rf-od-cyl','cyl',ge('rx_far_od_cyl'))}</td><td>${_rs('rf-od-ax','ax',ge('rx_far_od_ax'))}</td><td>${_rs('rf-od-prism','prism',ge('rx_far_od_prism'))}</td></tr>
            <tr><td>OS</td><td>${_rs('rf-os-sph','sph',ge('rx_far_os_sph'))}</td><td>${_rs('rf-os-cyl','cyl',ge('rx_far_os_cyl'))}</td><td>${_rs('rf-os-ax','ax',ge('rx_far_os_ax'))}</td><td>${_rs('rf-os-prism','prism',ge('rx_far_os_prism'))}</td></tr>
          </table>
          <div class="rx-shared-row">
            <div class="form-group" style="max-width:80px"><label>PD</label>${_rs('rf-pd','pd',ge('rx_far_od_pd'))}</div>
            <div class="form-group" style="max-width:80px"><label>ADD</label>${_rs('rf-add','add',ge('rx_far_os_pd'))}</div>
          </div>
          ${_comment('rf-comment',ge('rx_far_comment'),'Комментарий к рецепту для дали')}
        </div>
        <div class="rx-section">
          <div class="rx-section-title">Параметры для изготовления очков для работы с компьютером</div>
          <div class="ex-tools"><button class="btn btn-ghost btn-sm" type="button" tabindex="-1" onclick="clinFarPlusAdd('rc')">= Даль + ½ ADD</button></div>
          <table class="rx-table">
            <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th><th>Prism</th></tr>
            <tr><td>OD</td><td>${_rs('rc-od-sph','sph',ge('rx_comp_od_sph'))}</td><td>${_rs('rc-od-cyl','cyl',ge('rx_comp_od_cyl'))}</td><td>${_rs('rc-od-ax','ax',ge('rx_comp_od_ax'))}</td><td>${_rs('rc-od-prism','prism',ge('rx_comp_od_prism'))}</td></tr>
            <tr><td>OS</td><td>${_rs('rc-os-sph','sph',ge('rx_comp_os_sph'))}</td><td>${_rs('rc-os-cyl','cyl',ge('rx_comp_os_cyl'))}</td><td>${_rs('rc-os-ax','ax',ge('rx_comp_os_ax'))}</td><td>${_rs('rc-os-prism','prism',ge('rx_comp_os_prism'))}</td></tr>
          </table>
          <div class="rx-shared-row">
            <div class="form-group" style="max-width:80px"><label>PD</label>${_rs('rc-pd','pd',ge('rx_comp_od_pd'))}</div>
            <div class="form-group" style="max-width:80px"><label>ADD</label>${_rs('rc-add','add',ge('rx_comp_od_add'))}</div>
          </div>
          ${_comment('rc-comment',ge('rx_comp_comment'),'Комментарий к рецепту для компьютера')}
        </div>
        <div class="rx-section">
          <div class="rx-section-title">Параметры для изготовления очков для близи / чтения</div>
          <div class="ex-tools"><button class="btn btn-ghost btn-sm" type="button" tabindex="-1" onclick="clinFarPlusAdd('rn')">= Даль + ADD</button></div>
          <table class="rx-table">
            <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th><th>Prism</th></tr>
            <tr><td>OD</td><td>${_rs('rn-od-sph','sph',ge('rx_near_od_sph'))}</td><td>${_rs('rn-od-cyl','cyl',ge('rx_near_od_cyl'))}</td><td>${_rs('rn-od-ax','ax',ge('rx_near_od_ax'))}</td><td>${_rs('rn-od-prism','prism',ge('rx_near_od_prism'))}</td></tr>
            <tr><td>OS</td><td>${_rs('rn-os-sph','sph',ge('rx_near_os_sph'))}</td><td>${_rs('rn-os-cyl','cyl',ge('rx_near_os_cyl'))}</td><td>${_rs('rn-os-ax','ax',ge('rx_near_os_ax'))}</td><td>${_rs('rn-os-prism','prism',ge('rx_near_os_prism'))}</td></tr>
          </table>
          <div class="rx-shared-row">
            <div class="form-group" style="max-width:80px"><label>PD</label>${_rs('rn-pd','pd',ge('rx_near_od_pd'))}</div>
            <div class="form-group" style="max-width:80px"><label>Degr</label>${_rs('rn-degr','degr',ge('rx_near_od_add'))}</div>
          </div>
          ${_comment('rn-comment',ge('rx_near_comment'),'Комментарий к рецепту для близи')}
        </div>
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
        </div>
      </div>

      <div id="exam-tab-concl" class="tab-content${_examTab==='concl'?' active':''}">
        <div class="form-group"><label>Рекомендации</label>
          <div class="ex-tools" style="margin:0 0 6px">${Object.keys(REC_BLOCKS).map(k=>`<button class="btn btn-ghost btn-sm" type="button" tabindex="-1" onclick="addRecBlock('${k}')">+ ${REC_BLOCKS[k].label}</button>`).join('')}</div>
          <textarea id="e-recs" style="min-height:360px;font-size:14.5px;line-height:1.55" oninput="_modalDirty=true">${ge('recommendations')||DEFAULT_RECS}</textarea>
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
    rx_far_comment:vs('rf-comment'),
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
