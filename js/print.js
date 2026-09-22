// ═══ ПЕЧАТНЫЕ ФОРМЫ ═══
// Подключается ПОСЛЕ exam.js и переопределяет _buildPrintCard, _buildPatientPrintCard,
// _openPrintWindow (старые версии в exam.js больше не используются).
// ═══ PRINT ═══
// Экранирование + переносы строк для свободного текста в печатных формах
function _pe(v){
  if(v===null||v===undefined) return '';
  return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _pt(v){ return _pe(v).trim().replace(/\n{3,}/g,'\n\n'); }
// Заголовок секции: сербский + русский в одну строку
function _pcLabel(sr,ru){ return `<div class="pc-sec-label">${sr}${ru?`<span class="pc-ru"> · ${ru}</span>`:''}</div>`; }
// Шапка документа
function _pcHeader(doctor,docType,numLine,date){
  return `<div class="pc-header">
      <div>
        <div class="pc-doctor">${_pe(doctor)}</div>
        <div class="pc-doctor-sub">Optometrista · Optika Ginter · Novi Sad</div>
      </div>
      <div class="pc-meta">
        <div class="pc-meta-num">${_pe(numLine)}</div>
        <div>${_pe(date)}</div>
      </div>
    </div>
    <div class="pc-title">${docType}</div>`;
}
// Таблица OD/OS
function _pcEyeTable(cols,od,os){
  // Фиксированная ширина колонок — Sph/Cyl/Ax выровнены во всех таблицах карты
  return `<table class="pc-table" style="width:${32+cols.length*66}pt">
      <colgroup><col class="c-eye">${cols.map(()=>`<col style="width:66pt">`).join('')}</colgroup>
      <tr><th></th>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>
      <tr><td class="eye">OD</td>${od.map(v=>`<td>${_pe(v)}</td>`).join('')}</tr>
      <tr><td class="eye">OS</td>${os.map(v=>`<td>${_pe(v)}</td>`).join('')}</tr>
    </table>`;
}
function _pcKV(items){
  const f=items.filter(i=>i.val);
  if(!f.length) return '';
  return `<div class="pc-kv">${f.map(i=>`<span><b>${i.label}:</b> ${_pe(i.val)}</span>`).join('')}</div>`;
}
function _pcComment(v){ return v?`<div class="pc-comment">${_pt(v)}</div>`:''; }

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

  const textSec=(sr,ru,val)=>val?`<div class="pc-sec">${_pcLabel(sr,ru)}<div class="pc-text">${_pt(val)}</div></div>`:'';

  const rxBlock=(title,titleRu,rows,shared,comment)=>{
    if(!rows.some(r=>r.v1||r.v2||r.v3||r.v4)) return '';
    const hasPrism = rows.some(r=>r.v4);
    const cols=['Sph','Cyl','Ax'].concat(hasPrism?['Prizma']:[]);
    const od=[rows[0].v1,rows[0].v2,rows[0].v3].concat(hasPrism?[rows[0].v4]:[]);
    const os=[rows[1].v1,rows[1].v2,rows[1].v3].concat(hasPrism?[rows[1].v4]:[]);
    return `<div class="pc-sec pc-rx">${_pcLabel(title,titleRu)}${_pcEyeTable(cols,od,os)}${_pcKV(shared)}${_pcComment(comment)}</div>`;
  };

  const anamnez = rx('general_diseases_notes')
    ? rx('general_diseases_notes').split('\n').map(x=>x.trim()).filter(x=>x&&!x.startsWith('Диоптрии (со слов)')&&!x.startsWith('Примечания пациента')).join('\n')
    : '';

  const corrections = (e?.current_corrections?.length) ? `<div class="pc-sec">
      ${_pcLabel('Korekcija u upotrebi','Используемая коррекция')}
      ${e.current_corrections.map(c=>{
        const isCL = c.type==='МКЛ';
        const cHasPrism = !isCL && (c.od_prism||c.os_prism);
        const cols=['Sph','Cyl','Ax'].concat(cHasPrism?['Prizma']:[]).concat(isCL?['BC','DIA']:['PD']).concat(c.add?['ADD']:[]);
        const od=[c.od_sph,c.od_cyl,c.od_ax].concat(cHasPrism?[c.od_prism]:[]).concat(isCL?[c.bc,c.dia]:[c.pd]).concat(c.add?[c.add]:[]);
        const os=[c.os_sph,c.os_cyl,c.os_ax].concat(cHasPrism?[c.os_prism]:[]).concat(isCL?[c.bc,c.dia]:['']).concat(c.add?['']:[]);
        return `<div class="pc-sub">
          <div class="pc-sub-title">${_pe(c.type||'')}${c.duration?' · '+_pe(c.duration):''}</div>
          ${_pcEyeTable(cols,od,os)}
          ${_pcKV([{label:'Vrsta stakala',val:c.lens_type},{label:'Vrsta KS',val:c.cl_type}])}
          ${_pcComment(c.note)}
        </div>`;}).join('')}
    </div>` : '';

  const hasExamPrism = rx('exam_od_prism')||rx('exam_os_prism');

  const html=`<div class="print-card">
    ${_pcHeader(doctor,'Karton optometrijskog pregleda',e?.appointment_number||('Poseta br. '+(e?.visit_number||1)),date)}
    <div class="pc-patient-block">
      <div class="pc-patient-name">${_pe(p?.name||'')}</div>
      <div class="pc-patient-sub">${[age!==''&&age!==null?age+' god.':'',p?.dob?'D.r. '+fmt(p.dob):'',p?.patient_code?'ID: '+_pe(p.patient_code):''].filter(Boolean).join(' · ')}</div>
    </div>
    ${textSec('Razlog dolaska','Причина обращения',rx('visit_reason'))}
    ${textSec('Tegobe','Жалобы',rx('complaints_notes'))}
    ${textSec('Bolesti oka','Глазные заболевания',rx('eye_diseases_notes'))}
    ${textSec('Anamneza','Анамнез',anamnez)}
    ${corrections}
    ${hd(['refr_od_sph','refr_os_sph','refr_od_cyl','refr_os_cyl'])?`<div class="pc-sec">
      ${_pcLabel('Autorefraktometrija','Авторефрактометрия')}
      ${_pcEyeTable(['Sph','Cyl','Ax','R AVE'],[rx('refr_od_sph'),rx('refr_od_cyl'),rx('refr_od_ax'),rx('refr_od_ave')],[rx('refr_os_sph'),rx('refr_os_cyl'),rx('refr_os_ax'),rx('refr_os_ave')])}
      ${_pcKV([{label:'PD',val:rx('refr_od_pd')}])}
      ${_pcComment(rx('refr_comment'))}
    </div>`:''}
    <div class="pc-sec">
      ${_pcLabel('Rezultati pregleda','Результаты обследования')}
      ${_pcEyeTable(
        ['Visus bez kor.','Sph','Cyl','Ax','Visus sa kor.'].concat(hasExamPrism?['Prizma']:[]),
        [rx('exam_od_without'),rx('exam_od_cosph'),rx('exam_od_cyl'),rx('exam_od_ax'),rx('exam_od_with')].concat(hasExamPrism?[rx('exam_od_prism')]:[]),
        [rx('exam_os_without'),rx('exam_os_cosph'),rx('exam_os_cyl'),rx('exam_os_ax'),rx('exam_os_with')].concat(hasExamPrism?[rx('exam_os_prism')]:[]))}
      ${_pcKV([{label:'Visus OU sa korekcijom',val:rx('exam_ou')}])}
      ${_pcComment(rx('exam_comment'))}
    </div>
    ${hd(['rx_far_od_sph','rx_far_os_sph'])?rxBlock(
      'Parametri za izradu naočara za daljinu','Очки для дали',
      [{v1:rx('rx_far_od_sph'),v2:rx('rx_far_od_cyl'),v3:rx('rx_far_od_ax'),v4:rx('rx_far_od_prism')},{v1:rx('rx_far_os_sph'),v2:rx('rx_far_os_cyl'),v3:rx('rx_far_os_ax'),v4:rx('rx_far_os_prism')}],
      [{label:'PD',val:rx('rx_far_od_pd')},{label:'ADD',val:rx('rx_far_os_pd')}],
      rx('rx_far_comment')):''}
    ${hd(['rx_comp_od_sph','rx_comp_os_sph'])?rxBlock(
      'Parametri za izradu naočara za rad na računaru','Очки для компьютера',
      [{v1:rx('rx_comp_od_sph'),v2:rx('rx_comp_od_cyl'),v3:rx('rx_comp_od_ax'),v4:rx('rx_comp_od_prism')},{v1:rx('rx_comp_os_sph'),v2:rx('rx_comp_os_cyl'),v3:rx('rx_comp_os_ax'),v4:rx('rx_comp_os_prism')}],
      [{label:'PD',val:rx('rx_comp_od_pd')},{label:'ADD',val:rx('rx_comp_od_add')}],
      rx('rx_comp_comment')):''}
    ${hd(['rx_near_od_sph','rx_near_os_sph'])?rxBlock(
      'Parametri za izradu naočara za blizinu','Очки для близи',
      [{v1:rx('rx_near_od_sph'),v2:rx('rx_near_od_cyl'),v3:rx('rx_near_od_ax'),v4:rx('rx_near_od_prism')},{v1:rx('rx_near_os_sph'),v2:rx('rx_near_os_cyl'),v3:rx('rx_near_os_ax'),v4:rx('rx_near_os_prism')}],
      [{label:'PD',val:rx('rx_near_od_pd')},{label:'Degr',val:rx('rx_near_od_add')}],
      rx('rx_near_comment')):''}
    ${hd(['rx_cl_od_sph','rx_cl_os_sph'])?`<div class="pc-sec pc-rx">
      ${_pcLabel('Parametri za porudžbinu kontaktnih sočiva','Контактные линзы')}
      ${_pcEyeTable(['Sph','Cyl','Ax'],[rx('rx_cl_od_sph'),rx('rx_cl_od_cyl'),rx('rx_cl_od_ax')],[rx('rx_cl_os_sph'),rx('rx_cl_os_cyl'),rx('rx_cl_os_ax')])}
      ${_pcKV([{label:'BC',val:rx('rx_cl_od_bc')},{label:'DIA',val:rx('rx_cl_od_dia')},{label:'Preporučena KS',val:rx('rx_cl_od_type')}])}
      ${_pcComment(rx('rx_cl_comment'))}
    </div>`:''}
    <div class="pc-sec">
      ${_pcLabel('Preporuke i zaključak','Рекомендации и заключение')}
      <div class="pc-recs">${_pt(rx('recommendations'))||'—'}</div>
    </div>
    ${e?.control_date?`<div class="pc-control"><span>Kontrolna poseta</span><b>${fmt(e.control_date)}</b></div>`:''}
    <div class="pc-footer">
      <div class="pc-note">Dokument je namenjen za izbor i izradu optičke korekcije (naočare / kontaktna sočiva). U slučaju bolesti oka, bolova ili naglog pogoršanja vida obratite se lekaru oftalmologu.</div>
      <div class="pc-sign"><div class="pc-sign-line"></div>${_pe(doctor)}</div>
    </div>
  </div>`;
  document.getElementById('print-area').innerHTML = html;
  return {e, p};
}

// ═══ PATIENT CARD PDF ═══
async function _buildPatientPrintCard(pid) {
  const [{data:p},{data:appts},{data:orders},{data:exams}] = await Promise.all([
    db.from('patients').select('*').eq('id',pid).single(),
    db.from('appointments').select('*').eq('patient_id',pid).is('deleted_at',null).order('date',{ascending:false}),
    db.from('orders').select('*').eq('patient_id',pid).is('deleted_at',null).order('created_at',{ascending:false}),
    db.from('examinations').select('*').eq('patient_id',pid).order('created_at',{ascending:false})
  ]);
  if(!p) return null;
  const age = p.dob ? calcAge(p.dob) : '';
  const today_str = fmt(today());
  const st = v => v ? _pe((typeof STATUS_SR!=='undefined' && STATUS_SR[v]) || v) : '—';
  const money = v => (+v) ? fmtMoney(v).replace(' дин.',' din.') : '—';

  const apptRows = (appts||[]).map(a=>`
    <tr>
      <td>${fmt(a.date)}</td>
      <td>${a.time?a.time.substr(0,5):'—'}</td>
      <td>${_pe(a.appointment_number||'—')}</td>
      <td class="l">${_pe(a.type||'—')}</td>
      <td>${st(a.status)}</td>
      <td class="r">${money(a.consultation_price)}</td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty">Nema pregleda</td></tr>';

  const lastExam = (exams||[])[0];
  let examBlock = '';
  if(lastExam){
    const hasPrism = lastExam.rx_far_od_prism||lastExam.rx_far_os_prism;
    const hasRx = lastExam.rx_far_od_sph||lastExam.rx_far_os_sph||lastExam.rx_far_od_cyl||lastExam.rx_far_os_cyl;
    examBlock = `<div class="pc-sec">
      ${_pcLabel('Poslednji pregled — '+_pe(lastExam.appointment_number||('poseta br. '+(lastExam.visit_number||'—')))+', '+fmt(lastExam.created_at?.split('T')[0]),'')}
      ${hasRx?`<div class="pc-sub-title">Naočare za daljinu</div>`+_pcEyeTable(
        ['Sph','Cyl','Ax'].concat(hasPrism?['Prizma']:[]),
        [lastExam.rx_far_od_sph,lastExam.rx_far_od_cyl,lastExam.rx_far_od_ax].concat(hasPrism?[lastExam.rx_far_od_prism]:[]),
        [lastExam.rx_far_os_sph,lastExam.rx_far_os_cyl,lastExam.rx_far_os_ax].concat(hasPrism?[lastExam.rx_far_os_prism]:[])):'<div class="pc-text muted">Parametri za naočare nisu upisani.</div>'}
      ${lastExam.control_date?`<div class="pc-kv"><span><b>Kontrolna poseta:</b> ${fmt(lastExam.control_date)}</span></div>`:''}
    </div>`;
  }

  const orderRows = (orders||[]).map(o=>`
    <tr>
      <td>${fmt(o.created_at?.split('T')[0])}</td>
      <td class="l">${_pe(o.type||'—')}</td>
      <td>${st(o.status)}</td>
      <td class="r">${money(orderTotal(o))}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="empty">Nema porudžbina</td></tr>';

  const tg = p.telegram_username ? '@'+_pe(p.telegram_username.replace(/^@/,'')) : (p.telegram_chat_id ? 'povezan' : '—');

  const html = `<div class="print-card">
    ${_pcHeader('Ana Novoselova','Karton pacijenta','',today_str)}
    <div class="pc-patient-block">
      <div class="pc-patient-name">${_pe(p.name||'')}</div>
      <div class="pc-patient-sub">${[age!==''&&age!==null?age+' god.':'',p.dob?'D.r. '+fmt(p.dob):'',p.patient_code?'ID: '+_pe(p.patient_code):''].filter(Boolean).join(' · ')}</div>
    </div>
    <div class="pc-sec">
      ${_pcLabel('Kontakt podaci','')}
      <table class="pc-info">
        <tr><td>Telefon</td><td>${_pe(p.phone||'—')}</td><td>Email</td><td>${_pe(p.email||'—')}</td></tr>
        <tr><td>Telegram</td><td>${tg}</td><td>Izvor</td><td>${_pe(p.source||'—')}</td></tr>
        <tr><td>U bazi od</td><td>${p.created_at?fmt(p.created_at.split('T')[0]):'—'}</td><td></td><td></td></tr>
      </table>
      ${p.notes?`<div class="pc-comment"><b>Napomene:</b> ${_pt(p.notes)}</div>`:''}
    </div>
    ${examBlock}
    <div class="pc-sec">
      ${_pcLabel('Istorija poseta','')}
      <table class="pc-table pc-list">
        <colgroup><col style="width:15%"><col style="width:10%"><col style="width:15%"><col><col style="width:14%"><col style="width:16%"></colgroup>
        <tr><th>Datum</th><th>Vreme</th><th>Broj</th><th class="l">Vrsta</th><th>Status</th><th class="r">Cena</th></tr>
        ${apptRows}
      </table>
    </div>
    <div class="pc-sec">
      ${_pcLabel('Porudžbine','')}
      <table class="pc-table pc-list">
        <colgroup><col style="width:15%"><col><col style="width:16%"><col style="width:18%"></colgroup>
        <tr><th>Datum</th><th class="l">Vrsta</th><th>Status</th><th class="r">Iznos</th></tr>
        ${orderRows}
      </table>
    </div>
    <div class="pc-footer">
      <div class="pc-note">Poverljivo. Samo za internu upotrebu Optike Ginter.</div>
    </div>
  </div>`;
  document.getElementById('print-area').innerHTML = html;
  return p;
}

// Печать в отдельном окне.
// @page margin:0 — браузер не печатает колонтитулы (URL, дату, заголовок, номера страниц).
// Поля страницы задаются вручную: слева/справа — padding body, сверху/снизу — повторяющиеся
// thead/tfoot-распорки, чтобы отступы были на КАЖДОЙ странице.
function _openPrintWindow(title, html) {
  const win = window.open('', '_blank', 'width=900,height=750');
  if(!win){ toast('Разрешите всплывающие окна для печати','error'); return; }
  win.document.write(`<!DOCTYPE html><html lang="sr-Latn"><head><meta charset="utf-8"><title>${_pe(title)}</title><style>
    @page{size:A4;margin:0}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    html,body{margin:0;padding:0;background:#fff}
    body{padding:0 16mm}
    .pw{width:100%;border-collapse:collapse}
    .pw>thead>tr>td,.pw>tfoot>tr>td,.pw>tbody>tr>td{padding:0}
    .pw-top{height:14mm}.pw-bot{height:14mm}
    @media screen{body{padding:0 16mm;max-width:210mm;margin:0 auto;box-shadow:0 0 0 1px #e5e7eb}}

    .print-card{font-family:'Helvetica Neue',Arial,sans-serif;font-size:9.5pt;color:#1f2937;line-height:1.45;hyphens:auto;overflow-wrap:break-word}
    .pc-header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:6pt;border-bottom:1.2pt solid #1B4F72}
    .pc-doctor{font-size:13pt;font-weight:700;color:#1B4F72}
    .pc-doctor-sub{font-size:8pt;color:#6b7280;margin-top:1pt}
    .pc-meta{text-align:right;font-size:8.5pt;color:#4b5563}
    .pc-meta-num{font-size:10.5pt;font-weight:700;color:#1B4F72}
    .pc-title{font-size:14pt;font-weight:700;color:#111827;margin:12pt 0 8pt}
    .pc-patient-block{border:0.8pt solid #d1d9e2;border-radius:3pt;padding:7pt 9pt;margin-bottom:12pt}
    .pc-patient-name{font-size:12pt;font-weight:700;color:#111827}
    .pc-patient-sub{font-size:9pt;color:#4b5563;margin-top:2pt}

    .pc-sec{margin-bottom:11pt;break-inside:avoid;page-break-inside:avoid}
    .pc-sec-label{font-size:8pt;font-weight:700;color:#1B4F72;text-transform:uppercase;letter-spacing:.5pt;padding-bottom:3pt;margin-bottom:5pt;border-bottom:0.6pt solid #d1d9e2;break-after:avoid;page-break-after:avoid}
    .pc-ru{font-weight:400;color:#9ca3af;text-transform:none;letter-spacing:0}
    .pc-text{white-space:pre-line;font-size:9.5pt}
    .pc-text.muted{color:#9ca3af}
    .pc-sub{margin-bottom:7pt;break-inside:avoid;page-break-inside:avoid}
    .pc-sub:last-child{margin-bottom:0}
    .pc-sub-title{font-size:8.5pt;font-weight:700;color:#374151;margin-bottom:3pt}

    .pc-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.5pt;font-variant-numeric:tabular-nums}
    .pc-table col.c-eye{width:32pt}
    .pc-table th{padding:3pt 4pt;font-size:7.5pt;font-weight:700;color:#4b5563;text-align:center;background:#f1f5f9;border-bottom:0.8pt solid #cbd5e1}
    .pc-table td{padding:4pt 4pt;text-align:center;border-bottom:0.5pt solid #e5e7eb;vertical-align:top}
    .pc-table tr{break-inside:avoid;page-break-inside:avoid}
    .pc-table .eye{font-weight:700;color:#1B4F72;text-align:left;padding-left:6pt}
    .pc-table .l{text-align:left}.pc-table .r{text-align:right;padding-right:6pt}
    .pc-table .empty{color:#9ca3af;text-align:center}
    .pc-list td{font-size:9pt}

    .pc-info{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.5pt}
    .pc-info td{padding:2.5pt 0;vertical-align:top}
    .pc-info td:nth-child(odd){width:17%;color:#6b7280}
    .pc-info td:nth-child(even){width:33%}

    .pc-kv{display:flex;flex-wrap:wrap;gap:4pt 18pt;margin-top:5pt;font-size:9pt}
    .pc-comment{margin-top:5pt;font-size:9pt;color:#4b5563;white-space:pre-line}
    .pc-recs{border-left:2pt solid #1B4F72;padding:4pt 0 4pt 9pt;font-size:9.5pt;white-space:pre-line;line-height:1.55}
    .pc-control{display:flex;justify-content:space-between;align-items:center;border:0.8pt solid #1B4F72;border-radius:3pt;padding:6pt 9pt;margin-bottom:11pt;font-size:10pt;color:#1B4F72;break-inside:avoid}
    .pc-footer{margin-top:14pt;padding-top:6pt;border-top:0.6pt solid #d1d9e2;display:flex;justify-content:space-between;align-items:flex-end;gap:20pt;break-inside:avoid;page-break-inside:avoid}
    .pc-note{font-size:7.5pt;color:#6b7280;max-width:115mm;line-height:1.4}
    .pc-sign{font-size:8.5pt;color:#374151;text-align:center;min-width:48mm}
    .pc-sign-line{border-top:0.6pt solid #6b7280;margin:22pt 0 2pt}
  </style></head><body><table class="pw"><thead><tr><td><div class="pw-top"></div></td></tr></thead><tfoot><tr><td><div class="pw-bot"></div></td></tr></tfoot><tbody><tr><td>${html}</td></tr></tbody></table></body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>{ win.print(); },400);
}

