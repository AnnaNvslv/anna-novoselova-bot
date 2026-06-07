// ═══ EXAMINATION FORM ═══
let _autosaveTimer = null;
let _currentExamId = null;
async function openExamForm(apptId,patientId){
  _examTab='anamn';_examData={corrections:[]};_currentExamId=null;
  if(_autosaveTimer) clearInterval(_autosaveTimer);
  openModal(`<div class="modal modal-xl"><div class="modal-header"><span class="modal-title">Загрузка...</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div><div class="modal-body"><div class="spinner"></div></div></div>`);
  const[{data:p},{data:exams},{data:cnt}]=await Promise.all([
    db.from('patients').select('*').eq('id',patientId).single(),
    db.from('examinations').select('*').eq('appointment_id',apptId).order('created_at',{ascending:false}).limit(1),
    db.from('examinations').select('id',{count:'exact',head:true}).eq('patient_id',patientId)
  ]);
  const ex = exams?.[0] || null;
  const e=ex||{};const visitNum=e.visit_number||(cnt||0)+1;
  _currentExamId = e.id || null;
  if(e.current_corrections?.length)_examData.corrections=e.current_corrections;
  _drawExam(p,e,visitNum,apptId);
  _autosaveTimer = setInterval(()=>{
    if(_modalDirty && document.getElementById('e-complaints')){
      saveExam(_currentExamId||'',apptId,patientId,visitNum).then(()=>{
        if(document.getElementById('e-complaints')) toast(t('autosave'),'info');
      });
    }
  },120000);
}
async function openExamView(examId,pid){
  _examTab='anamn';
  const{data:e}=await db.from('examinations').select('*').eq('id',examId).single();
  const{data:p}=await db.from('patients').select('*').eq('id',pid).single();
  _examData.corrections=e?.current_corrections||[];
  openModal(`<div class="modal modal-xl"><div class="modal-header"><span></span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div><div class="modal-body"><div class="spinner"></div></div></div>`);
  _drawExam(p,e,e?.visit_number||1,e?.appointment_id||'');
}
// ── RX SELECT HELPERS ──
function _genOpts(vals, saved) {
  const s = String(saved||'');
  let html = '<option value="">—</option>';
  vals.forEach(v => { html += `<option value="${v}" ${String(v)===s?'selected':''}>${v}</option>`; });
  if(s && s!=='' && !vals.map(String).includes(s))
    html += `<option value="${s}" selected>${s}</option>`;
  return html;
}
// Sph: плюса по убыванию, потом 0.00, потом минуса — так при selected=0.00 вверх плюса, вниз минуса
function _sphVals() {
  const plus=[];
  for(let i=1300;i>=25;i-=25) plus.push('+'+(i/100).toFixed(2));
  const minus=[];
  for(let i=25;i<=1300;i+=25) minus.push('-'+(i/100).toFixed(2));
  return [...plus,'0.00',...minus];
}
// Cyl: пустое по умолчанию, только минуса -0.25..-6.00
function _cylVals() {
  const v=[];
  for(let i=25;i<=600;i+=25) v.push('-'+(i/100).toFixed(2));
  return v;
}
function _axVals() { return Array.from({length:181},(_,i)=>i); }
// PD: default 62
function _pdVals() {
  const vals=Array.from({length:31},(_,i)=>i+50);
  const idx=vals.indexOf(62);
  return [vals[idx],...vals.slice(0,idx),...vals.slice(idx+1)];
}
function _addVals() { const v=[]; for(let i=25;i<=400;i+=25) v.push((i/100).toFixed(2)); return v; }
function _bcVals() { const v=[]; for(let i=83;i<=90;i++) v.push((i/10).toFixed(1)); return v; }
function _diaVals() { const v=[]; for(let i=140;i<=150;i++) v.push((i/10).toFixed(1)); return v; }

const SS = 'padding:4px 3px;border:1.5px solid var(--border);border-radius:5px;font-size:12.5px;width:100%;background:#fff;color:var(--t)';
const SN = 'padding:4px 3px;border:1.5px solid var(--border);border-radius:5px;font-size:12.5px;width:72px;background:#fff;color:var(--t)';

function _rs(id, type, val) {
  let opts, style=SS;
  if(type==='sph')    { opts=_sphVals(); }
  else if(type==='cyl'){ opts=_cylVals(); }
  else if(type==='ax') { opts=_axVals(); style=SN; }
  else if(type==='pd') { opts=_pdVals(); style=SN; }
  else if(type==='add'){ opts=_addVals(); style=SN; }
  else if(type==='degr'){opts=_addVals(); style=SN; }
  else if(type==='bc') { opts=_bcVals(); style=SN; }
  else if(type==='dia'){ opts=_diaVals(); style=SN; }
  else return `<input id="${id}" value="${val||''}" style="${SN}" oninput="_modalDirty=true">`;
  return`<div style="display:flex;gap:2px;align-items:center">
    <select id="${id}" style="${style}" onchange="_modalDirty=true">${_genOpts(opts,val)}</select>
    <button type="button" title="+" onclick="addCustomRx('${id}')" style="padding:3px 5px;border:1.5px solid var(--border);border-radius:5px;background:white;cursor:pointer;font-size:13px;color:var(--accent);flex-shrink:0;line-height:1">+</button>
  </div>`;
}
function addCustomRx(id){
  const val=prompt('Введите значение:');
  if(val===null||val==='')return;
  const sel=document.getElementById(id);if(!sel)return;
  const opt=document.createElement('option');opt.value=val;opt.textContent=val;opt.selected=true;
  sel.appendChild(opt);sel.value=val;_modalDirty=true;
}
function _ri(id,val,narrow){return`<input id="${id}" value="${val||''}" oninput="_modalDirty=true" style="min-width:${narrow?'44px':'52px'};max-width:${narrow?'70px':'none'}">`;
}
function _riText(id,val){return`<input id="${id}" value="${val||''}" oninput="_modalDirty=true" style="width:100%">`;
}
function _comment(id,val,placeholder){
  placeholder = placeholder || 'Комментарий (необязательно)';
  return`<div class="form-group full" style="margin-top:8px">
    <label style="font-size:11px;color:var(--text-muted,#64748b)">${placeholder}</label>
    <input id="${id}" value="${val||''}" oninput="_modalDirty=true" placeholder="${placeholder}" style="width:100%;font-size:12.5px">
  </div>`;
}

const DEFAULT_RECS = `Контроль остроты зрения через 1 год / 6 мес. / 3 мес.
Плановый осмотр врача-офтальмолога 1 р/год.
Рекомендован осмотр врача-офтальмолога.

Рекомендовано соблюдение гигиены зрения при работе за компьютером/телефоном:

• Правило 20-20-20: каждые 20 минут смотреть вдаль (~6 м) в течение 20 секунд.
• Работать в хорошо освещённом помещении.
• Установить на мониторе режим «Тёплые тона» (снижение синего спектра).
• Увлажняющие капли с гиалуроновой кислотой: по 1 капле в каждый глаз каждые 3 часа.
• Увлажнение помещения 40–60%.
• Следить за правильным положением тела, делать разминку для шеи каждые 2 часа.

При появлении дискомфорта в новых очках (слабое головокружение, непривычные и слабые болевые ощущения в глазах и голове) перейти к схеме адаптации к очкам:
Утром, проснувшись, надеть очки.
15 мин. в очках / 5 мин. без очков →
20 мин. в очках / 5 мин. без очков →
25 мин. в очках / 5 мин. без очков →
35 мин. в очках / 5 мин. без очков →
Привыкать каждый день, начиная с той длительности, на которой остановились.
Старые очки не использовать!
Адаптация может длиться до 2 недель.
При сохранении дискомфорта через 2 недели — контрольный приём (напишите @AnnaNvslv)`;

function _drawExam(p,e,visitNum,apptId){
  const ge=f=>e?.[f]||'';
  const apptNum = e?.appointment_number || '';
  const pid = p?.id||'';
  const patientCode = p?.patient_code || '';
  const age = p?.dob ? calcAge(p.dob) : '';
  const dobStr = p?.dob ? fmt(p.dob) : '';
  document.getElementById('modal-container').innerHTML=`
  <div class="modal modal-xl">
    <div class="modal-header">
      <div style="display:flex;flex-direction:column;gap:2px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span class="modal-title">📋 ${t('exam_card')} — ${p?.name||''}</span>
          ${apptNum?`<span class="badge badge-accent">${apptNum}</span>`:`<span class="badge badge-accent">${t('visit')}${visitNum}</span>`}
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:2px">
          ${age?`<span style="font-size:12px;color:var(--text-muted,#64748b)">👤 ${age} лет${dobStr?' ('+dobStr+')':''}</span>`:''}
          ${patientCode?`<span style="font-size:12px;color:var(--text-muted,#64748b);font-family:monospace;background:var(--surface2,#f1f5f9);padding:1px 6px;border-radius:4px">ID: ${patientCode}</span>`:''}
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="_examClose()">✕</button>
    </div>
    <div class="modal-body">
      <div class="tab-bar">
        ${[['anamn','Анамнез'],['refr','Рефрактометрия'],['exam','Обследование'],['rx','Рецепты'],['concl','Заключение']].map(([tab,l])=>`<div class="tab${_examTab===tab?' active':''}" onclick="_examTab='${tab}';_switchExamTab()">${l}</div>`).join('')}
      </div>

      <div id="exam-tab-anamn" class="tab-content${_examTab==='anamn'?' active':''}">
        <div class="form-grid">
          <div class="form-group full">
            <label>Причина обращения (можно несколько)</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px">
              ${VISIT_REASONS.map(r=>{
                const savedReasons=(ge('visit_reason')||'').split(', ');
                const bookingReasons=(p?.visit_reason||[]);
                const sel=savedReasons.includes(r)||bookingReasons.some(br=>br&&r&&(br.includes(r.substr(0,12))||r.includes(br.substr(0,12))));
                return`<label style="display:flex;align-items:center;gap:5px;font-size:13.5px;font-weight:500;cursor:pointer;background:var(--surface2);padding:5px 10px;border-radius:6px;border:1.5px solid ${sel?'var(--accent)':'var(--border)'}">
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
            <div class="form-group"><label>PD (оба глаза)</label>${_ri('r-pd',ge('refr_od_pd'))}</div>
          </div>
          ${_comment('r-comment',ge('refr_comment'),'Комментарий к авторефрактометрии')}
        </div>
      </div>

      <div id="exam-tab-exam" class="tab-content${_examTab==='exam'?' active':''}">
        <div class="rx-section">
          <div class="rx-section-title">Результаты обследования</div>
          <table class="rx-table">
            <tr><th></th><th>Visus без корр.</th><th>sa Sph</th><th>Cyl</th><th>Ax</th><th>Visus с корр.</th><th>OU с корр.</th></tr>
            <tr><td>OD</td><td>${_ri('x-od-wo',ge('exam_od_without'))}</td><td>${_rs('x-od-cs','sph',ge('exam_od_cosph'))}</td><td>${_rs('x-od-cyl','cyl',ge('exam_od_cyl'))}</td><td>${_rs('x-od-ax','ax',ge('exam_od_ax'))}</td><td>${_ri('x-od-wi',ge('exam_od_with'))}</td><td rowspan="2" style="vertical-align:middle;text-align:center">${_ri('x-ou',ge('exam_ou'))}</td></tr>
            <tr><td>OS</td><td>${_ri('x-os-wo',ge('exam_os_without'))}</td><td>${_rs('x-os-cs','sph',ge('exam_os_cosph'))}</td><td>${_rs('x-os-cyl','cyl',ge('exam_os_cyl'))}</td><td>${_rs('x-os-ax','ax',ge('exam_os_ax'))}</td><td>${_ri('x-os-wi',ge('exam_os_with'))}</td></tr>
          </table>
          ${_comment('x-comment',ge('exam_comment'),'Комментарий к обследованию')}
        </div>
      </div>

      <div id="exam-tab-rx" class="tab-content${_examTab==='rx'?' active':''}">
        <div class="rx-section">
          <div class="rx-section-title">Параметры для изготовления очков для дали</div>
          <table class="rx-table">
            <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th></tr>
            <tr><td>OD</td><td>${_rs('rf-od-sph','sph',ge('rx_far_od_sph'))}</td><td>${_rs('rf-od-cyl','cyl',ge('rx_far_od_cyl'))}</td><td>${_rs('rf-od-ax','ax',ge('rx_far_od_ax'))}</td></tr>
            <tr><td>OS</td><td>${_rs('rf-os-sph','sph',ge('rx_far_os_sph'))}</td><td>${_rs('rf-os-cyl','cyl',ge('rx_far_os_cyl'))}</td><td>${_rs('rf-os-ax','ax',ge('rx_far_os_ax'))}</td></tr>
          </table>
          <div class="rx-shared-row">
            <div class="form-group" style="max-width:80px"><label>PD</label>${_rs('rf-pd','pd',ge('rx_far_od_pd'))}</div>
            <div class="form-group" style="max-width:80px"><label>ADD</label>${_rs('rf-add','add',ge('rx_far_os_pd'))}</div>
          </div>
          ${_comment('rf-comment',ge('rx_far_comment'),'Комментарий к рецепту для дали')}
        </div>
        <div class="rx-section">
          <div class="rx-section-title">Параметры для изготовления очков для работы с компьютером</div>
          <table class="rx-table">
            <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th></tr>
            <tr><td>OD</td><td>${_rs('rc-od-sph','sph',ge('rx_comp_od_sph'))}</td><td>${_rs('rc-od-cyl','cyl',ge('rx_comp_od_cyl'))}</td><td>${_rs('rc-od-ax','ax',ge('rx_comp_od_ax'))}</td></tr>
            <tr><td>OS</td><td>${_rs('rc-os-sph','sph',ge('rx_comp_os_sph'))}</td><td>${_rs('rc-os-cyl','cyl',ge('rx_comp_os_cyl'))}</td><td>${_rs('rc-os-ax','ax',ge('rx_comp_os_ax'))}</td></tr>
          </table>
          <div class="rx-shared-row">
            <div class="form-group" style="max-width:80px"><label>PD</label>${_rs('rc-pd','pd',ge('rx_comp_od_pd'))}</div>
            <div class="form-group" style="max-width:80px"><label>ADD</label>${_rs('rc-add','add',ge('rx_comp_od_add'))}</div>
          </div>
          ${_comment('rc-comment',ge('rx_comp_comment'),'Комментарий к рецепту для компьютера')}
        </div>
        <div class="rx-section">
          <div class="rx-section-title">Параметры для изготовления очков для близи / чтения</div>
          <table class="rx-table">
            <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th></tr>
            <tr><td>OD</td><td>${_rs('rn-od-sph','sph',ge('rx_near_od_sph'))}</td><td>${_rs('rn-od-cyl','cyl',ge('rx_near_od_cyl'))}</td><td>${_rs('rn-od-ax','ax',ge('rx_near_od_ax'))}</td></tr>
            <tr><td>OS</td><td>${_rs('rn-os-sph','sph',ge('rx_near_os_sph'))}</td><td>${_rs('rn-os-cyl','cyl',ge('rx_near_os_cyl'))}</td><td>${_rs('rn-os-ax','ax',ge('rx_near_os_ax'))}</td></tr>
          </table>
          <div class="rx-shared-row">
            <div class="form-group" style="max-width:80px"><label>PD</label>${_rs('rn-pd','pd',ge('rx_near_od_pd'))}</div>
            <div class="form-group" style="max-width:80px"><label>Degr</label>${_rs('rn-degr','degr',ge('rx_near_od_add'))}</div>
          </div>
          ${_comment('rn-comment',ge('rx_near_comment'),'Комментарий к рецепту для близи')}
        </div>
        <div class="rx-section">
          <div class="rx-section-title">Параметры для назначения МКЛ</div>
          <table class="rx-table">
            <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th></tr>
            <tr><td>OD</td><td>${_rs('rcl-od-sph','sph',ge('rx_cl_od_sph'))}</td><td>${_rs('rcl-od-cyl','cyl',ge('rx_cl_od_cyl'))}</td><td>${_rs('rcl-od-ax','ax',ge('rx_cl_od_ax'))}</td></tr>
            <tr><td>OS</td><td>${_rs('rcl-os-sph','sph',ge('rx_cl_os_sph'))}</td><td>${_rs('rcl-os-cyl','cyl',ge('rx_cl_os_cyl'))}</td><td>${_rs('rcl-os-ax','ax',ge('rx_cl_os_ax'))}</td></tr>
          </table>
          <div class="rx-shared-row">
            <div class="form-group" style="max-width:80px"><label>BC</label>${_rs('rcl-bc','bc',ge('rx_cl_od_bc'))}</div>
            <div class="form-group" style="max-width:80px"><label>DIA</label>${_rs('rcl-dia','dia',ge('rx_cl_od_dia'))}</div>
          </div>
          <div class="form-group mt-8"><label>Вид МКЛ</label><input id="rcl-type" value="${ge('rx_cl_od_type')}" placeholder="напр.: однодневные, ежемесячные, торические..." oninput="_modalDirty=true"></div>
          ${_comment('rcl-comment',ge('rx_cl_comment'),'Комментарий к рецепту МКЛ')}
        </div>
      </div>

      <div id="exam-tab-concl" class="tab-content${_examTab==='concl'?' active':''}">
        <div class="form-group"><label>Рекомендации</label><textarea id="e-recs" style="min-height:220px" oninput="_modalDirty=true">${ge('recommendations')||DEFAULT_RECS}</textarea></div>
        <div class="divider"></div>
        <div class="form-grid">
          <div class="form-group"><label>Дата контрольного визита</label>
            <select id="e-ctrl-sel" onchange="updateCtrlDate(this.value)">
              <option value="">— не задана —</option>
              <option value="1">Через 1 месяц</option>
              <option value="3">Через 3 месяца</option>
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
      <button class="btn btn-ghost" onclick="saveExam('${e?.id||''}','${apptId}','${pid}','${visitNum}')">💾 ${t('btn_save')}</button>
      <button class="btn btn-accent" onclick="saveAndPrint('${e?.id||''}','${apptId}','${pid}','${visitNum}')">🖨️ ${t('btn_print')}</button>
    </div>
  </div>`;
}
function _examClose(){
  if(_modalDirty && !confirm(t('close_unsaved'))) return;
  closeModal();
}
function _switchExamTab(){
  document.querySelectorAll('[id^=exam-tab-]').forEach(t=>t.classList.remove('active'));
  document.getElementById('exam-tab-'+_examTab)?.classList.add('active');
  document.querySelectorAll('.tab-bar .tab').forEach((t,i)=>{
    const tabs=['anamn','refr','exam','rx','concl'];
    t.classList.toggle('active',tabs[i]===_examTab);
  });
}
function updateCtrlDate(m){if(m)document.getElementById('e-ctrl-date').value=addMonths(today(),+m);}
function _renderCorrs(){
  if(!_examData.corrections.length)return`<p class="text-sm text-m">Нет используемой коррекции</p>`;
  return _examData.corrections.map((c,i)=>{
    const isMKL=c.type==='МКЛ';
    const sphOpts = _sphVals();
    const cylOpts = _cylVals();
    return`<div class="corr-item">
      <div class="flex justify-between items-center mb-8">
        <select style="width:auto;min-width:220px" onchange="_examData.corrections[${i}].type=this.value;document.getElementById('corr-list').innerHTML=_renderCorrs()">
          ${CORR_TYPES.map(t=>`<option ${c.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
        <button class="btn btn-danger btn-xs" onclick="_examData.corrections.splice(${i},1);document.getElementById('corr-list').innerHTML=_renderCorrs()">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:50px 1fr 1fr 1fr 1fr;gap:6px;align-items:center;margin-bottom:6px">
        <span class="text-sm fw-6 text-m">OD</span>
        <div><label style="font-size:10px">Sph</label>
          <select oninput="_examData.corrections[${i}].od_sph=this.value" style="text-align:center;width:100%">
            ${_genOpts(sphOpts,c.od_sph)}
          </select>
        </div>
        <div><label style="font-size:10px">Cyl</label>
          <select oninput="_examData.corrections[${i}].od_cyl=this.value" style="text-align:center;width:100%">
            <option value="">—</option>${_genOpts(cylOpts,c.od_cyl)}
          </select>
        </div>
        <div><label style="font-size:10px">Ax</label><input value="${c.od_ax||''}" oninput="_examData.corrections[${i}].od_ax=this.value" style="text-align:center"></div>
        <div><label style="font-size:10px">ADD</label><input value="${c.od_add||''}" oninput="_examData.corrections[${i}].od_add=this.value" style="text-align:center"></div>
      </div>
      <div style="display:grid;grid-template-columns:50px 1fr 1fr 1fr 1fr;gap:6px;align-items:center;margin-bottom:8px">
        <span class="text-sm fw-6 text-m">OS</span>
        <div>
          <select oninput="_examData.corrections[${i}].os_sph=this.value" style="text-align:center;width:100%">
            ${_genOpts(sphOpts,c.os_sph)}
          </select>
        </div>
        <div>
          <select oninput="_examData.corrections[${i}].os_cyl=this.value" style="text-align:center;width:100%">
            <option value="">—</option>${_genOpts(cylOpts,c.os_cyl)}
          </select>
        </div>
        <div><input value="${c.os_ax||''}" oninput="_examData.corrections[${i}].os_ax=this.value" style="text-align:center"></div>
        <div><input value="${c.os_add||''}" oninput="_examData.corrections[${i}].os_add=this.value" style="text-align:center"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">
        ${isMKL?`
          <div class="form-group"><label>BC</label><input value="${c.bc||''}" oninput="_examData.corrections[${i}].bc=this.value"></div>
          <div class="form-group"><label>DIA</label><input value="${c.dia||''}" oninput="_examData.corrections[${i}].dia=this.value"></div>
          <div class="form-group"><label>Длительность</label><input value="${c.duration||''}" oninput="_examData.corrections[${i}].duration=this.value" placeholder="напр. 2 года"></div>
          <div class="form-group"><label>Примечание</label><input value="${c.note||''}" oninput="_examData.corrections[${i}].note=this.value"></div>
        `:`
          <div class="form-group"><label>PD</label><input value="${c.pd||''}" oninput="_examData.corrections[${i}].pd=this.value"></div>
          <div class="form-group"><label>Длительность</label><input value="${c.duration||''}" oninput="_examData.corrections[${i}].duration=this.value" placeholder="напр. 2 года"></div>
          <div class="form-group full" style="grid-column:span 2"><label>Примечание</label><input value="${c.note||''}" oninput="_examData.corrections[${i}].note=this.value"></div>
        `}
      </div>
      ${isMKL?`<div class="form-group mt-8"><label>Вид МКЛ</label><input value="${c.cl_type||''}" oninput="_examData.corrections[${i}].cl_type=this.value" placeholder="тип линз"></div>`:''}`+
    `</div>`;
  }).join('');
}
function addCorrection(){_examData.corrections.push({type:'Очки для дали'});document.getElementById('corr-list').innerHTML=_renderCorrs();}

async function saveExam(id,apptId,patientId,visitNum){
  const effectiveId = _currentExamId || id || '';
  const data={
    appointment_id:apptId||null,patient_id:patientId,visit_number:+visitNum,
    visit_reason:[...document.querySelectorAll('input[name="visit_reason"]:checked')].map(cb=>cb.value).join(', '),
    complaints_notes:v('e-complaints'),last_ophthalmologist:v('e-lastoph'),
    eye_diseases_notes:v('e-eyedis'),general_diseases_notes:v('e-gendis'),
    current_corrections:_examData.corrections,
    refr_od_sph:v('r-od-sph'),refr_od_cyl:v('r-od-cyl'),refr_od_ax:v('r-od-ax'),refr_od_pd:v('r-pd'),refr_od_ave:v('r-od-ave'),
    refr_os_sph:v('r-os-sph'),refr_os_cyl:v('r-os-cyl'),refr_os_ax:v('r-os-ax'),refr_os_pd:v('r-pd'),refr_os_ave:v('r-os-ave'),
    refr_comment:v('r-comment'),
    exam_od_without:v('x-od-wo'),exam_od_cosph:v('x-od-cs'),exam_od_cyl:v('x-od-cyl'),exam_od_ax:v('x-od-ax'),exam_od_with:v('x-od-wi'),
    exam_os_without:v('x-os-wo'),exam_os_cosph:v('x-os-cs'),exam_os_cyl:v('x-os-cyl'),exam_os_ax:v('x-os-ax'),exam_os_with:v('x-os-wi'),
    exam_ou:v('x-ou'),
    exam_comment:v('x-comment'),
    rx_far_enabled:true,
    rx_far_od_sph:v('rf-od-sph'),rx_far_od_cyl:v('rf-od-cyl'),rx_far_od_ax:v('rf-od-ax'),rx_far_od_pd:v('rf-pd'),
    rx_far_os_sph:v('rf-os-sph'),rx_far_os_cyl:v('rf-os-cyl'),rx_far_os_ax:v('rf-os-ax'),rx_far_os_pd:v('rf-add'),
    rx_far_comment:v('rf-comment'),
    rx_comp_enabled:true,
    rx_comp_od_sph:v('rc-od-sph'),rx_comp_od_cyl:v('rc-od-cyl'),rx_comp_od_ax:v('rc-od-ax'),rx_comp_od_pd:v('rc-pd'),rx_comp_od_add:v('rc-add'),
    rx_comp_os_sph:v('rc-os-sph'),rx_comp_os_cyl:v('rc-os-cyl'),rx_comp_os_ax:v('rc-os-ax'),
    rx_comp_comment:v('rc-comment'),
    rx_near_enabled:true,
    rx_near_od_sph:v('rn-od-sph'),rx_near_od_cyl:v('rn-od-cyl'),rx_near_od_ax:v('rn-od-ax'),rx_near_od_pd:v('rn-pd'),rx_near_od_add:v('rn-degr'),
    rx_near_os_sph:v('rn-os-sph'),rx_near_os_cyl:v('rn-os-cyl'),rx_near_os_ax:v('rn-os-ax'),
    rx_near_comment:v('rn-comment'),
    rx_cl_enabled:true,
    rx_cl_od_sph:v('rcl-od-sph'),rx_cl_od_cyl:v('rcl-od-cyl'),rx_cl_od_ax:v('rcl-od-ax'),
    rx_cl_od_bc:v('rcl-bc'),rx_cl_od_dia:v('rcl-dia'),rx_cl_od_type:v('rcl-type'),
    rx_cl_os_sph:v('rcl-os-sph'),rx_cl_os_cyl:v('rcl-os-cyl'),rx_cl_os_ax:v('rcl-os-ax'),
    rx_cl_comment:v('rcl-comment'),
    recommendations:v('e-recs'),control_date:v('e-ctrl-date')||null
  };
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
    return _currentExamId||effectiveId;
  }catch(err){
    console.error('saveExam error:',err);
    toast('❌ '+t('save_error')+': '+(err.message||'нет связи'),'error');
    return null;
  }
}

async function saveAndPrint(id,apptId,patientId,visitNum){
  const eid = await saveExam(id,apptId,patientId,visitNum);
  if(eid) await printExam(eid);
}

async function saveBeforeEmail(id,apptId,patientId,visitNum,target){
  const eid = await saveExam(id,apptId,patientId,visitNum);
  if(eid) await emailExam(eid,target);
}

// ═══ PRINT ═══
async function _buildPrintCard(examId) {
  const{data:e}=await db.from('examinations').select('*').eq('id',examId).single();
  const{data:p}=await db.from('patients').select('*').eq('id',e?.patient_id).single();
  const{data:sRows}=await db.from('settings').select('key,value').in('key',['doctor_name']);
  const s={}; (sRows||[]).forEach(r=>s[r.key]=r.value);
  const rx=f=>e?.[f]||'';
  const age=p?.dob?calcAge(p.dob):'';
  const hd=(fields)=>fields.some(f=>rx(f));
  const date=fmt((e?.created_at||today()).split('T')[0]);
  const doctor=s.doctor_name||'Ana Novoselova';

  // title = serbian, titleRu = russian translation on new line
  const rxBlock=(title,titleRu,rows,shared,comment)=>{
    if(!rows.some(r=>r.v1||r.v2||r.v3)) return '';
    return`<div class="pc-rx-block" style="page-break-inside:avoid">
      <div class="pc-rx-title">${title}<br><span style="font-weight:400;font-size:7pt;color:#777;text-transform:none;letter-spacing:0">${titleRu}</span></div>
      <table class="pc-table">
        <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th></tr>
        <tr><td class="eye">OD</td><td>${rows[0].v1}</td><td>${rows[0].v2}</td><td>${rows[0].v3}</td></tr>
        <tr><td class="eye">OS</td><td>${rows[1].v1}</td><td>${rows[1].v2}</td><td>${rows[1].v3}</td></tr>
      </table>
      <div style="display:flex;gap:16pt;margin-top:4pt;font-size:8pt">
        ${shared.filter(s=>s.val).map(s=>`<span><b>${s.label}:</b> ${s.val}</span>`).join('')}
      </div>
      ${comment?`<div style="margin-top:4pt;font-size:8pt;color:#555;font-style:italic">${comment}</div>`:''}
    </div>`;
  };

  const secLabel=(sr,ru)=>`<div class="pc-sec-label">${sr}<br><span style="font-weight:400;color:#777;font-size:6.5pt;text-transform:none;letter-spacing:0">${ru}</span></div>`;

  const html=`<div class="print-card">
    <div class="pc-bar"></div>
    <div class="pc-header">
      <div>
        <div style="font-size:9pt;color:#555">${doctor}</div>
        <div class="pc-doctor-sub">Optometrista · Novi Sad, Srbija · Optika Ginter</div>
      </div>
      <div class="pc-meta">
        <div style="font-size:11pt;font-weight:800;color:#1B4F72">${e?.appointment_number||('Poseta br.'+(e?.visit_number||1))}</div>
        <div style="font-size:9pt;color:#555">${date}</div>
      </div>
    </div>
    <div class="pc-title">Karton optometrijskog pregleda</div>
    <div class="pc-patient-block">
      <div style="font-size:14pt;font-weight:800;color:#1a1a2e">${p?.name||''}</div>
      <div style="font-size:10pt;color:#555;margin-top:2pt">${age?age+' god.':''}${p?.patient_code?' · ID: '+p.patient_code:''}</div>
    </div>
    ${rx('visit_reason')?`<div class="pc-sec">${secLabel('Razlog dolaska','Причина обращения')}<div class="pc-text">${rx('visit_reason')}</div></div>`:''}
    ${rx('complaints_notes')?`<div class="pc-sec">${secLabel('Tegobe','Жалобы')}<div class="pc-text">${rx('complaints_notes')}</div></div>`:''}
    ${rx('eye_diseases_notes')?`<div class="pc-sec">${secLabel('Bolesti oka','Глазные заболевания')}<div class="pc-text">${rx('eye_diseases_notes')}</div></div>`:''}
    ${rx('general_diseases_notes')?`<div class="pc-sec">${secLabel('Anamneza','Анамнез')}<div class="pc-text">${rx('general_diseases_notes').split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('Диоптрии (со слов)')&&!s.startsWith('Примечания пациента')).join('; ')}</div></div>`:''}`+
    `${(e?.current_corrections?.length)?`<div class="pc-sec" style="page-break-inside:avoid">
      ${secLabel('Korekcija u upotrebi','Используемая коррекция')}
      ${e.current_corrections.map(c=>`<div style="margin-bottom:5pt">
        <div style="font-size:8pt;font-weight:700;color:#1B4F72;margin-bottom:2pt">${c.type}${c.duration?' · '+c.duration:''}</div>
        <table class="pc-table"><tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th>${c.type==='МКЛ'?'<th>BC</th><th>DIA</th>':'<th>PD</th>'}${c.od_add?'<th>ADD</th>':''}</tr>
          <tr><td class="eye">OD</td><td>${c.od_sph||''}</td><td>${c.od_cyl||''}</td><td>${c.od_ax||''}</td><td>${c.type==='МКЛ'?(c.bc||''):(c.pd||'')}</td>${c.od_add?`<td>${c.od_add}</td>`:''}</tr>
          <tr><td class="eye">OS</td><td>${c.os_sph||''}</td><td>${c.os_cyl||''}</td><td>${c.os_ax||''}</td><td>${c.type==='МКЛ'?(c.dia||''):''}${c.type!=='МКЛ'?'':''}</td>${c.os_add?`<td>${c.os_add}</td>`:''}</tr>
        </table>
        ${c.cl_type?`<div style="font-size:7.5pt;color:#555;margin-top:1pt">Vrsta KS: ${c.cl_type}</div>`:''}
        ${c.note?`<div style="font-size:7.5pt;color:#555">Napomena: ${c.note}</div>`:''}
      </div>`).join('')}
    </div>`:''}`+
    `<div class="pc-sec" style="page-break-inside:avoid">
      ${secLabel('Autorefraktometrija','Авторефрактометрия')}
      <table class="pc-table">
        <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th><th>R AVE</th></tr>
        <tr><td class="eye">OD</td><td>${rx('refr_od_sph')}</td><td>${rx('refr_od_cyl')}</td><td>${rx('refr_od_ax')}</td><td>${rx('refr_od_ave')}</td></tr>
        <tr><td class="eye">OS</td><td>${rx('refr_os_sph')}</td><td>${rx('refr_os_cyl')}</td><td>${rx('refr_os_ax')}</td><td>${rx('refr_os_ave')}</td></tr>
      </table>
      ${rx('refr_od_pd')?`<div style="font-size:8pt;margin-top:4pt"><b>PD:</b> ${rx('refr_od_pd')}</div>`:''}
      ${rx('refr_comment')?`<div style="font-size:8pt;margin-top:4pt;color:#555;font-style:italic">${rx('refr_comment')}</div>`:''}
    </div>
    <div class="pc-sec" style="page-break-inside:avoid">
      ${secLabel('Rezultati pregleda','Результаты обследования')}
      <table class="pc-table">
        <tr><th></th><th>Visus bez kor.</th><th>sa Sph</th><th>Cyl</th><th>Ax</th><th>Visus sa kor.</th></tr>
        <tr><td class="eye">OD</td><td>${rx('exam_od_without')}</td><td>${rx('exam_od_cosph')}</td><td>${rx('exam_od_cyl')}</td><td>${rx('exam_od_ax')}</td><td>${rx('exam_od_with')}</td></tr>
        <tr><td class="eye">OS</td><td>${rx('exam_os_without')}</td><td>${rx('exam_os_cosph')}</td><td>${rx('exam_os_cyl')}</td><td>${rx('exam_os_ax')}</td><td>${rx('exam_os_with')}</td></tr>
      </table>
      ${rx('exam_ou')?`<div style="font-size:8pt;margin-top:4pt"><b>OU sa korekcijom:</b> ${rx('exam_ou')}</div>`:''}
      ${rx('exam_comment')?`<div style="font-size:8pt;margin-top:4pt;color:#555;font-style:italic">${rx('exam_comment')}</div>`:''}
    </div>
    ${hd(['rx_far_od_sph','rx_far_os_sph'])?rxBlock(
      'Parametri za izradu naocara za daljinu',
      'Параметры для изготовления очков для дали',
      [{v1:rx('rx_far_od_sph'),v2:rx('rx_far_od_cyl'),v3:rx('rx_far_od_ax')},{v1:rx('rx_far_os_sph'),v2:rx('rx_far_os_cyl'),v3:rx('rx_far_os_ax')}],
      [{label:'PD',val:rx('rx_far_od_pd')},{label:'ADD',val:rx('rx_far_os_pd')}],
      rx('rx_far_comment')):''}
    ${hd(['rx_comp_od_sph','rx_comp_os_sph'])?rxBlock(
      'Parametri za izradu naocara za rad za racunarom',
      'Параметры для изготовления очков для работы с компьютером',
      [{v1:rx('rx_comp_od_sph'),v2:rx('rx_comp_od_cyl'),v3:rx('rx_comp_od_ax')},{v1:rx('rx_comp_os_sph'),v2:rx('rx_comp_os_cyl'),v3:rx('rx_comp_os_ax')}],
      [{label:'PD',val:rx('rx_comp_od_pd')},{label:'ADD',val:rx('rx_comp_od_add')}],
      rx('rx_comp_comment')):''}
    ${hd(['rx_near_od_sph','rx_near_os_sph'])?rxBlock(
      'Parametri za izradu naocara za blizinu',
      'Параметры для изготовления очков для близи',
      [{v1:rx('rx_near_od_sph'),v2:rx('rx_near_od_cyl'),v3:rx('rx_near_od_ax')},{v1:rx('rx_near_os_sph'),v2:rx('rx_near_os_cyl'),v3:rx('rx_near_os_ax')}],
      [{label:'PD',val:rx('rx_near_od_pd')},{label:'Degr',val:rx('rx_near_od_add')}],
      rx('rx_near_comment')):''}
    ${hd(['rx_cl_od_sph','rx_cl_os_sph'])?`<div class="pc-rx-block" style="page-break-inside:avoid">
      <div class="pc-rx-title">Parametri za propisivanje KS<br><span style="font-weight:400;font-size:7pt;color:#777;text-transform:none;letter-spacing:0">Параметры для заказа контактных линз</span></div>
      <table class="pc-table">
        <tr><th></th><th>Sph</th><th>Cyl</th><th>Ax</th></tr>
        <tr><td class="eye">OD</td><td>${rx('rx_cl_od_sph')}</td><td>${rx('rx_cl_od_cyl')}</td><td>${rx('rx_cl_od_ax')}</td></tr>
        <tr><td class="eye">OS</td><td>${rx('rx_cl_os_sph')}</td><td>${rx('rx_cl_os_cyl')}</td><td>${rx('rx_cl_os_ax')}</td></tr>
      </table>
      <div style="font-size:8pt;margin-top:4pt;display:flex;gap:16pt">
        ${rx('rx_cl_od_bc')?`<span><b>BC:</b> ${rx('rx_cl_od_bc')}</span>`:''}
        ${rx('rx_cl_od_dia')?`<span><b>DIA:</b> ${rx('rx_cl_od_dia')}</span>`:''}
        ${rx('rx_cl_od_type')?`<span><b>Vrsta KS:</b> ${rx('rx_cl_od_type')}</span>`:''}
      </div>
      ${rx('rx_cl_comment')?`<div style="font-size:8pt;margin-top:4pt;color:#555;font-style:italic">${rx('rx_cl_comment')}</div>`:''}
    </div>`:''}
    <div class="pc-sec" style="page-break-inside:avoid">
      ${secLabel('Preporuke i zakljucak','Рекомендации и заключение')}
      <div class="pc-recs">${rx('recommendations')||'—'}</div>
    </div>
    <div class="pc-footer">
      <div class="pc-note">Dokument je namenjen za izbor i izradu opticke korekcije (naocare / KS). U slucaju bolesti oka, bolova ili naglog pogorsanja vida, obratite se lekaru oftalmologu.</div>
      ${e?.control_date?`<div class="pc-control">Kontrolna poseta:<br>${fmt(e.control_date)}</div>`:''}
    </div>
  </div>`;
  document.getElementById('print-area').innerHTML = html;
  return {e, p};
}

async function printExam(examId){
  await _buildPrintCard(examId);
  setTimeout(()=>window.print(),300);
}

async function emailExam(examId,target){
  toast('Строим карту...','info');
  const{e,p}=await _buildPrintCard(examId);
  const{data:sRows}=await db.from('settings').select('key,value').in('key',['doctor_name']);
  const s={}; (sRows||[]).forEach(r=>s[r.key]=r.value);
  const date=fmt((e?.created_at||today()).split('T')[0]);
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

// ═══ PATIENT CARD PDF ═══
async function _buildPatientPrintCard(pid) {
  const [{data:p},{data:appts},{data:orders},{data:exams}] = await Promise.all([
    db.from('patients').select('*').eq('id',pid).single(),
    db.from('appointments').select('*').eq('patient_id',pid).order('date',{ascending:false}),
    db.from('orders').select('*').eq('patient_id',pid).order('created_at',{ascending:false}),
    db.from('examinations').select('*').eq('patient_id',pid).order('created_at',{ascending:false})
  ]);
  if(!p) return null;
  const age = p.dob ? calcAge(p.dob) : '';
  const today_str = new Date().toLocaleDateString('sr-Latn-RS',{day:'2-digit',month:'2-digit',year:'numeric'});

  const apptRows = (appts||[]).map(a=>`
    <tr>
      <td>${fmt(a.date)}</td>
      <td>${a.appointment_number||'—'}</td>
      <td>${a.type||'—'}</td>
      <td>${a.time?.substr(0,5)||'—'}</td>
      <td>${a.status||'—'}</td>
      <td>${a.consultation_price?fmtMoney(a.consultation_price):'—'}</td>
    </tr>`).join('') || '<tr><td colspan="6" style="color:#999;text-align:center">Nema pregleda</td></tr>';

  const lastExam = (exams||[])[0];
  const examBlock = lastExam ? `
    <div class="pc-sec">
      <div class="pc-sec-label">Poslednji karton — ${lastExam.appointment_number||('Poseta br.'+(lastExam.visit_number||'—'))} (${fmt(lastExam.created_at?.split('T')[0])})</div>
      <table class="pc-table" style="font-size:8pt">
        <tr><th></th><th>Sph daljina</th><th>Cyl</th><th>Ax</th></tr>
        <tr><td class="eye">OD</td><td>${lastExam.rx_far_od_sph||'—'}</td><td>${lastExam.rx_far_od_cyl||'—'}</td><td>${lastExam.rx_far_od_ax||'—'}</td></tr>
        <tr><td class="eye">OS</td><td>${lastExam.rx_far_os_sph||'—'}</td><td>${lastExam.rx_far_os_cyl||'—'}</td><td>${lastExam.rx_far_os_ax||'—'}</td></tr>
      </table>
      ${lastExam.control_date?`<div style="margin-top:4pt;font-size:8pt;color:#b45309"><b>Kontrolna poseta:</b> ${fmt(lastExam.control_date)}</div>`:''}
    </div>` : '';

  const orderRows = (orders||[]).map(o=>`
    <tr>
      <td>${fmt(o.created_at?.split('T')[0])}</td>
      <td>${o.type||'—'}</td>
      <td>${o.status||'—'}</td>
      <td>${o.order_total?fmtMoney(o.order_total):'—'}</td>
    </tr>`).join('') || '<tr><td colspan="4" style="color:#999;text-align:center">Nema porudzbina</td></tr>';

  const html = `<div class="print-card">
    <div class="pc-bar"></div>
    <div class="pc-header">
      <div>
        <div class="pc-doctor">Ana Novoselova</div>
        <div class="pc-doctor-sub">Optometrista · Novi Sad, Srbija · Optika Ginter</div>
      </div>
      <div class="pc-meta">
        <div class="pc-meta-num">Karton pacijenta</div>
        <div>Datum: ${today_str}</div>
      </div>
    </div>
    <div class="pc-title">Karton pacijenta</div>
    <div class="pc-patient-block">
      <div class="pc-patient-name">${p.name||''}</div>
      <div class="pc-patient-sub">${age?age+' god.':''}${p.dob?' · D.r.: '+fmt(p.dob):''}${p.patient_code?' · ID: '+p.patient_code:''}</div>
    </div>
    <div class="pc-sec">
      <div class="pc-sec-label">Kontaktni podaci</div>
      <table style="font-size:8.5pt;width:100%;border-collapse:collapse">
        <tr><td style="width:35%;color:#555;padding:2pt 0">Telefon</td><td>${p.phone||'—'}</td></tr>
        <tr><td style="color:#555;padding:2pt 0">Email</td><td>${p.email||'—'}</td></tr>
        <tr><td style="color:#555;padding:2pt 0">Telegram</td><td>${p.telegram_chat_id?'ID: '+p.telegram_chat_id:p.telegram_username?'@'+p.telegram_username:'—'}</td></tr>
        <tr><td style="color:#555;padding:2pt 0">Izvor</td><td>${p.source||'—'}</td></tr>
        <tr><td style="color:#555;padding:2pt 0">U bazi od</td><td>${fmt(p.created_at?.split('T')[0])}</td></tr>
      </table>
      ${p.notes?`<div style="margin-top:6pt;font-size:8pt;background:#f0f9ff;padding:5pt 8pt;border-radius:4pt"><b>Napomene:</b> ${p.notes}</div>`:''}
    </div>
    ${examBlock}
    <div class="pc-sec">
      <div class="pc-sec-label">Istorija pregleda</div>
      <table class="pc-table" style="font-size:8pt">
        <tr><th>Datum</th><th>Br. pregleda</th><th>Vrsta</th><th>Vreme</th><th>Status</th><th>Cena</th></tr>
        ${apptRows}
      </table>
    </div>
    <div class="pc-sec">
      <div class="pc-sec-label">Porudzbine</div>
      <table class="pc-table" style="font-size:8pt">
        <tr><th>Datum</th><th>Vrsta</th><th>Status</th><th>Iznos</th></tr>
        ${orderRows}
      </table>
    </div>
    <div class="pc-footer">
      <div class="pc-note">Dokument je automatski generisan iz CRM sistema Optike Ginter. Poverljivo.</div>
    </div>
  </div>`;
  document.getElementById('print-area').innerHTML = html;
  return p;
}

function _openPrintWindow(title, html) {
  const win = window.open('', '_blank', 'width=900,height=750');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>
    @page{margin:14mm 16mm;size:A4}
    body{margin:0;padding:16px;background:#fff}
    .print-card{font-family:'Helvetica Neue',Arial,sans-serif;font-size:9pt;color:#1a1a2e;background:#fff;max-width:185mm;margin:0 auto;line-height:1.45}
    .pc-bar{height:3.5pt;background:linear-gradient(to right,#1B4F72,#0891b2);margin-bottom:10pt;border-radius:2pt}
    .pc-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8pt;padding-bottom:8pt;border-bottom:0.5pt solid #dde}
    .pc-doctor{font-size:13pt;font-weight:700;color:#1B4F72;letter-spacing:-0.3pt}
    .pc-doctor-sub{font-size:7.5pt;color:#888;margin-top:1pt}
    .pc-meta{text-align:right;font-size:8pt;color:#555}
    .pc-meta-num{font-size:10pt;font-weight:700;color:#1B4F72}
    .pc-title{text-align:center;font-size:11pt;font-weight:700;text-transform:uppercase;letter-spacing:1pt;color:#1B4F72;margin:8pt 0 10pt;padding:6pt 0;border-top:0.5pt solid #dde;border-bottom:0.5pt solid #dde}
    .pc-patient-block{background:#f0f5fb;border-radius:4pt;padding:6pt 8pt;margin-bottom:10pt}
    .pc-patient-name{font-size:11pt;font-weight:700;color:#1a1a2e}
    .pc-patient-sub{font-size:8pt;color:#555;margin-top:2pt}
    .pc-sec{margin-bottom:8pt}
    .pc-sec-label{font-size:7pt;font-weight:700;color:#0891b2;text-transform:uppercase;letter-spacing:0.8pt;margin-bottom:3pt}
    .pc-text{font-size:8.5pt;padding:3pt 0;color:#333}
    .pc-table{width:100%;border-collapse:collapse;margin-bottom:2pt;font-size:8.5pt}
    .pc-table th{text-align:center;padding:3pt 5pt;font-size:7pt;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.4pt;border-bottom:1pt solid #c8d8e8;background:#f0f5fb}
    .pc-table td{padding:3.5pt 5pt;text-align:center;border-bottom:0.5pt solid #e8eef4}
    .pc-table .eye{font-weight:700;color:#1B4F72;text-align:left;width:22pt}
    .pc-rx-block{background:#f8fafe;border-radius:4pt;padding:6pt 8pt;margin-bottom:6pt}
    .pc-rx-title{font-size:8pt;font-weight:700;color:#1B4F72;margin-bottom:4pt;text-transform:uppercase;letter-spacing:0.3pt}
    .pc-recs{background:#f0fdf4;border-left:2.5pt solid #10b981;padding:6pt 8pt;font-size:8.5pt;white-space:pre-wrap;line-height:1.6;color:#1a2e1a}
    .pc-footer{margin-top:10pt;padding-top:6pt;border-top:0.5pt solid #dde;display:flex;justify-content:space-between;align-items:flex-end}
    .pc-note{font-size:6.5pt;color:#999;max-width:130mm}
    .pc-control{font-size:8.5pt;font-weight:700;color:#1B4F72;text-align:right}
  </style></head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>{ win.print(); },400);
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
