/* Логика анкеты о зрении ребёнка (12-17 лет) и обновлённый возрастной порог (12 лет).
   Загружается после booking.js и дополняет/переопределяет часть его функций и переводов. */

Object.assign(BK.ru,{
  ad10t:'⛔ Приём детей до 12 лет не проводится',
  ad10:'Оптометрист не осматривает детей младше 12 лет.',
  acc10Label:'Почему нельзя проверить зрение маленькому ребёнку в оптике? Читать →',
  acc10Body:'<p>У маленьких детей очень активна аккомодация — глаз сам «подстраивает» фокус, из-за чего обычная проверка без специальных капель часто даёт неточный результат, а иногда — неверную коррекцию.</p><p>Детский офтальмолог проводит проверку с каплями, временно «выключающими» аккомодацию (циклоплегия) — это единственный надёжный способ понять, нужны ли ребёнку очки и какие именно. У оптометриста таких капель и допуска на их применение нет, поэтому для детей младше 12 лет запись доступна только к офтальмологу.</p>',
  ad17t:'Несколько вопросов о зрении ребёнка',
  ad17:'Чтобы понять, можно ли безопасно провести приём в оптике, ответьте, пожалуйста, на несколько вопросов.',
  acc17Label:'Можно ли проверить зрение ребёнку в оптике, или обязательно нужен офтальмолог? Читать →',
  acc17Body:'<p>Начиная с 12 лет я могу принимать детей, но не для первой диагностики и не для первого назначения очков — этим занимается только детский офтальмолог.</p><p>Я могу помочь, если ребёнку уже назначены и подобраны очки, и нужно уточнить или скорректировать параметры — при условии, что есть свежее заключение офтальмолога (не старше года) и падение зрения плавное, без резких жалоб.</p><p>Если очки ни разу не назначались, ребёнок ими не пользуется, давно не был у врача или есть резкое ухудшение зрения — сначала нужно показать ребёнка офтальмологу.</p>',
  kqQ1:'Вы хотите проверить зрение ребёнку впервые?',
  kqQ2:'Назначали ли ребёнку ранее очки?',
  kqQ3:'Использует ли ребёнок сейчас очки?',
  kqQ4:'Какой рецепт прописан ребёнку?',
  kqQ4Opt:'(если знаете)',
  kqQ5:'Есть ли на руках заключение детского офтальмолога не старше 1 года?',
  kqQ6:'Есть ли у ребёнка диагностированные заболевания глаз?',
  kqQ6Text:'Укажите, пожалуйста, какие',
  kqQ7:'Есть ли у ребёнка особые потребности по состоянию здоровья?',
  kqOptYes:'Да',
  kqOptNo:'Нет',
  kqOptPlaceholder:'— выберите —',
  kqDeclineFirst:'Похоже, вы хотите проверить зрение ребёнка впервые и подобрать первые очки. Такую диагностику должен проводить детский офтальмолог — с каплями, расширяющими зрачок (циклоплегией), это единственный точный способ для детского зрения. Оптометрист первую диагностику и назначение очков детям не делает. Пожалуйста, обратитесь к детскому офтальмологу.',
  kqDeclineNoglasses:'Я принимаю детей этого возраста только если ребёнку уже подобраны и назначены очки. Если очки ещё ни разу не назначались — пожалуйста, обратитесь сначала к детскому офтальмологу.',
  kqDeclineNotusing:'Похоже, ребёнку назначали очки, но сейчас он ими не пользуется. В таком случае лучше сначала показать ребёнка офтальмологу — возможно, коррекцию нужно пересмотреть. После этого я смогу принять ребёнка на уточнение и оформление заказа.',
  kqDeclineNoexam:'Без свежего заключения детского офтальмолога (не старше 1 года) записать ребёнка не могу — покажите его врачу, а затем возвращайтесь ко мне для уточнения и подбора очков.',
  kqAcceptNote:'Хорошо, я могу принять ребёнка. Важно: у детей часто напряжена аккомодация, и это может помешать точной проверке — если качественно провести её не получится, я направлю вас к офтальмологу без назначения очков. Если это устраивает — записывайтесь. Если нет — надёжнее сначала попасть к офтальмологу, а затем прийти ко мне для уточнения и оформления заказа.',
  errKidsIncomplete:'Пожалуйста, ответьте на все вопросы о зрении ребёнка выше.',
  errAge:'Запись детей до 12 лет недоступна. Напишите: @AnnaNvslv'
});
Object.assign(BK.sr,{
  ad10t:'⛔ Pregled dece mlađe od 12 godina nije dostupan',
  ad10:'Optometrista ne pregleda decu mlađu od 12 godina.',
  acc10Label:'Zašto se vid malog deteta ne može proveriti u optici? Pročitaj →',
  acc10Body:'<p>Kod male dece akomodacija je vrlo aktivna — oko samo „podešava" fokus, zbog čega obična provera bez posebnih kapi često daje netačan rezultat, a ponekad i pogrešnu korekciju.</p><p>Dečiji oftalmolog radi proveru sa kapima koje privremeno „isključuju" akomodaciju (cikloplegija) — to je jedini pouzdan način da se utvrdi da li su detetu potrebne naočare i kakve. Optometrista nema takve kapi niti ovlašćenje za njihovu upotrebu, zato je za decu mlađu od 12 godina zakazivanje moguće samo kod oftalmologa.</p>',
  ad17t:'Nekoliko pitanja o vidu deteta',
  ad17:'Da bismo utvrdili da li je pregled u optici bezbedan, molimo odgovorite na nekoliko pitanja.',
  acc17Label:'Da li se vid deteta može proveriti u optici, ili je neophodan oftalmolog? Pročitaj →',
  acc17Body:'<p>Od 12. godine mogu primati decu, ali ne za prvu dijagnostiku niti prvo propisivanje naočara — time se bavi isključivo dečiji oftalmolog.</p><p>Mogu pomoći ako su detetu već propisane i izabrane naočare, i potrebno je proveriti ili prilagoditi parametre — pod uslovom da postoji svež nalaz oftalmologa (ne stariji od godinu dana) i da je pad vida postepen, bez naglih tegoba.</p><p>Ako naočare nikada nisu propisane, dete ih ne koristi, dugo nije bilo kod lekara ili postoji naglo pogoršanje vida — prvo treba pokazati dete oftalmologu.</p>',
  kqQ1:'Da li želite prvi put da proverite vid deteta?',
  kqQ2:'Da li su detetu ranije propisane naočare?',
  kqQ3:'Da li dete trenutno koristi naočare?',
  kqQ4:'Koji je recept propisan detetu?',
  kqQ4Opt:'(ako znate)',
  kqQ5:'Da li imate svež nalaz dečijeg oftalmologa (ne stariji od godinu dana)?',
  kqQ6:'Da li dete ima dijagnostikovane bolesti očiju?',
  kqQ6Text:'Navedite, molimo, koje',
  kqQ7:'Da li dete ima posebne potrebe u vezi sa zdravljem?',
  kqOptYes:'Da',
  kqOptNo:'Ne',
  kqOptPlaceholder:'— izaberite —',
  kqDeclineFirst:'Izgleda da želite prvi put proveriti vid deteta i dobiti prve naočare. Takvu dijagnostiku treba da uradi dečiji oftalmolog — kapima koje šire zenicu (cikloplegija), što je jedini pouzdan način za dečije oči. Optometrista ne radi prvu dijagnostiku i propisivanje naočara deci. Molimo obratite se dečijem oftalmologu.',
  kqDeclineNoglasses:'Decu ovog uzrasta primam samo ako su im već propisane i izabrane naočare. Ako naočare još nikada nisu propisane — molimo prvo se obratite dečijem oftalmologu.',
  kqDeclineNotusing:'Izgleda da su detetu ranije propisane naočare, ali ih trenutno ne koristi. U tom slučaju bolje je prvo pokazati dete oftalmologu — možda korekciju treba preispitati. Nakon toga mogu primiti dete radi provere i poručivanja naočara.',
  kqDeclineNoexam:'Bez svežeg nalaza dečijeg oftalmologa (ne starijeg od godinu dana) ne mogu zakazati dete — pokažite ga lekaru, a zatim se vratite meni radi provere i izbora naočara.',
  kqAcceptNote:'U redu, mogu primiti dete. Važno: kod dece je često pojačana akomodacija, što može otežati tačnu proveru — ako kvalitetna provera ne bude moguća, uputiću vas oftalmologu bez propisivanja naočara. Ako vam to odgovara — zakažite. Ako ne — sigurnije je prvo otići kod oftalmologa, a zatim doći kod mene radi provere i poručivanja naočara.',
  errKidsIncomplete:'Molimo odgovorite na sva pitanja o vidu deteta iznad.',
  errAge:'Zakazivanje za decu do 12 godina nije dostupno. Pišite: @AnnaNvslv'
});

let _kidsState='pending';
function resetKidsQuiz(){
  ['kq-first','kq-prescribed','kq-using','kq-exam','kq-disease','kq-special'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const rx=document.getElementById('kq-rx');if(rx)rx.value='';
  const dt=document.getElementById('kq-disease-text');if(dt)dt.value='';
  ['kq-q2wrap','kq-q3wrap','kq-q4wrap','kq-q5wrap','kq-q6wrap','kq-q6textwrap','kq-q7wrap','kq-decline-first','kq-decline-noglasses','kq-decline-notusing','kq-decline-noexam','kq-accept-note'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});
  _kidsState='pending';
}
function kidsGateActive(){
  const e=document.getElementById('age-disc-17');
  return !!(e&&e.style.display==='block');
}
function finishKidsQuiz(){
  if(!kidsGateActive())return;
  const btn=document.getElementById('submit-btn');
  if(btn)btn.disabled=(_kidsState!=='accept');
}
function updateKidsQuiz(){
  const g=id=>document.getElementById(id);
  if(!g('kq-first'))return;
  const hide=ids=>ids.forEach(id=>{const e=g(id);if(e)e.style.display='none';});
  hide(['kq-decline-first','kq-q2wrap','kq-decline-noglasses','kq-q3wrap','kq-decline-notusing','kq-q4wrap','kq-q5wrap','kq-decline-noexam','kq-q6wrap','kq-q6textwrap','kq-q7wrap','kq-accept-note']);
  _kidsState='pending';
  const first=g('kq-first').value;
  if(!first){finishKidsQuiz();return;}
  if(first==='yes'){
    g('kq-decline-first').innerHTML='<p>'+T('kqDeclineFirst')+'</p>';
    g('kq-decline-first').style.display='block';
    _kidsState='decline';finishKidsQuiz();return;
  }
  g('kq-q2wrap').style.display='block';
  const prescribed=g('kq-prescribed').value;
  if(!prescribed){finishKidsQuiz();return;}
  if(prescribed==='no'){
    g('kq-decline-noglasses').innerHTML='<p>'+T('kqDeclineNoglasses')+'</p>';
    g('kq-decline-noglasses').style.display='block';
    _kidsState='decline';finishKidsQuiz();return;
  }
  g('kq-q3wrap').style.display='block';
  const using=g('kq-using').value;
  if(!using){finishKidsQuiz();return;}
  if(using==='no'){
    g('kq-decline-notusing').innerHTML='<p>'+T('kqDeclineNotusing')+'</p>';
    g('kq-decline-notusing').style.display='block';
    _kidsState='decline';finishKidsQuiz();return;
  }
  g('kq-q4wrap').style.display='block';
  g('kq-q5wrap').style.display='block';
  const exam=g('kq-exam').value;
  if(!exam){finishKidsQuiz();return;}
  if(exam==='no'){
    g('kq-decline-noexam').innerHTML='<p>'+T('kqDeclineNoexam')+'</p>';
    g('kq-decline-noexam').style.display='block';
    _kidsState='decline';finishKidsQuiz();return;
  }
  g('kq-q6wrap').style.display='block';
  g('kq-q7wrap').style.display='block';
  const disease=g('kq-disease').value;
  g('kq-q6textwrap').style.display=(disease==='yes')?'block':'none';
  g('kq-accept-note').innerHTML='<p>'+T('kqAcceptNote')+'</p>';
  g('kq-accept-note').style.display='block';
  _kidsState='accept';
  finishKidsQuiz();
}

/* Переопределяет checkAge из booking.js: порог блокировки поднят с 10 до 12 лет,
   для 12-17 лет активируется анкета вместо статического предупреждения. */
function checkAge(dob){
  const age=calcAge(dob);
  const btn=document.getElementById('submit-btn');
  if(selectedType&&selectedType.noAgeLimit){
    document.getElementById('age-disc-10').style.display='none';
    document.getElementById('age-disc-17').style.display='none';
    resetKidsQuiz();
    if(btn)btn.disabled=false;
    return;
  }
  const under12=age!==null&&age<12;
  const isKid=age!==null&&age>=12&&age<18;
  document.getElementById('age-disc-10').style.display=under12?'block':'none';
  document.getElementById('age-disc-17').style.display=isKid?'block':'none';
  if(!isKid)resetKidsQuiz();
  if(btn)btn.disabled=under12||(isKid&&_kidsState!=='accept');
}

/* Переопределяет onDobChange из booking.js: сбрасывает анкету при очистке даты рождения. */
function onDobChange(){
  const dob=getDobValue();
  if(dob)checkAge(dob);
  else{
    document.getElementById('age-disc-10').style.display='none';
    document.getElementById('age-disc-17').style.display='none';
    resetKidsQuiz();
    const btn=document.getElementById('submit-btn');if(btn)btn.disabled=false;
  }
}

/* Переопределяет resetBooking из booking.js: дополнительно сбрасывает анкету. */
function resetBooking(){
  selectedType=null;selectedSlot=null;selectedDateStr=null;_botMissing=false;
  ['f-tg','f-lastname','f-firstname','f-phone','f-diop','f-notes','f-source','f-promo'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  ['dob-d','dob-m','dob-y'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.querySelectorAll('.chip.on').forEach(c=>c.classList.remove('on'));
  document.getElementById('age-disc-10').style.display='none';
  document.getElementById('age-disc-17').style.display='none';
  resetKidsQuiz();
  document.getElementById('health-section').style.display='';
  const sb=document.getElementById('submit-btn');sb.disabled=false;sb.textContent=T('submit');
  goPage('type');
}

/* Переопределяет submitBooking из booking.js: блокирует отправку до 12 лет и
   пока анкета для 12-17 лет не завершена принятием. */
async function submitBooking(){
  const isHealth=!!(selectedType&&selectedType.health);
  const noAgeLimit=!!(selectedType&&selectedType.noAgeLimit);
  const tg=v('f-tg'),lastname=v('f-lastname'),firstname=v('f-firstname');
  const name=(lastname+' '+firstname).trim();
  const dob=getDobValue();
  const age=calcAge(dob);
  if(!noAgeLimit&&age!==null&&age<12){alert(T('errAge'));return;}
  if(!noAgeLimit&&age!==null&&age>=12&&age<18&&_kidsState!=='accept'){alert(T('errKidsIncomplete'));return;}
  if(!chips('ch-reason').length){alert(T('errReason'));return;}
  if(!tg){alert(T('errTg'));return;}
  if(!lastname){alert(T('errLastname'));return;}
  if(!firstname){alert(T('errFirstname'));return;}
  if(!dob){alert(T('errDob'));return;}
  if(isHealth&&!chips('ch-complaints').length){alert(T('errComplaints'));return;}
  if(isHealth&&!chips('ch-correction').length){alert(T('errCorrection'));return;}
  if(isHealth&&!chips('ch-eye').length){alert(T('errEye'));return;}
  if(isHealth&&!chips('ch-general').length){alert(T('errGeneral'));return;}
  if(isHealth&&!chips('ch-loads').length){alert(T('errLoads'));return;}
  if(!selectedSlot){goPage('cal');return;}
  const btn=document.getElementById('submit-btn');btn.disabled=true;btn.textContent=T('submitting');
  blog('submit_attempt',{patient_name:name,telegram:tg});
  try{
    const{data:slotCheck}=await db.from('available_slots').select('is_booked').eq('id',selectedSlot.id).single();
    if(slotCheck?.is_booked){blog('error',{patient_name:name,telegram:tg,error_text:'slot_already_booked'});alert(T('errSlot'));btn.disabled=false;btn.textContent=T('submit');goPage('cal');return;}
    const patientId=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():(Date.now()+'-'+Math.random().toString(36).slice(2));
    const{error:pe}=await db.from('patients').insert({id:patientId,name,dob:dob||null,phone:v('f-phone')||null,telegram_username:tg||null,visit_reason:chips('ch-reason'),complaints:isHealth?chips('ch-complaints'):[],correction_types:isHealth?chips('ch-correction'):[],approx_diopters:v('f-diop')||null,eye_diseases:isHealth?chips('ch-eye'):[],general_diseases:isHealth?chips('ch-general'):[],visual_loads:isHealth?chips('ch-loads'):[],pre_notes:v('f-notes')||null,source:v('f-source')||null,promo_code:v('f-promo')||null,data_consent:true,accuracy_consent:true,is_first_visit:true});
    if(pe)throw pe;
    const{data:numData,error:numErr}=await db.rpc('get_next_appointment_number',{date_str:selectedSlot.date});
    if(numErr)throw numErr;
    const num=numData;
    const td=TYPES_DATA.find(t=>t.id===selectedType.id);
    const apptId=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():(Date.now()+'-'+Math.random().toString(36).slice(2));
    const{error:ae}=await db.from('appointments').insert({id:apptId,patient_id:patientId,slot_id:selectedSlot.id,date:selectedSlot.date,time:selectedSlot.time,type:td?.ru?.apptName||selectedType.id,status:'запланирован',appointment_number:num,consultation_price:td?.consult||0});
    if(ae)throw ae;
    await db.from('available_slots').update({is_booked:true,appointment_id:apptId}).eq('id',selectedSlot.id);
    await notifyAnna(name,selectedSlot.date,selectedSlot.time,num,td?.ru?.name||selectedType.id);
    _blogDone=true;
    blog('success',{patient_name:name,telegram:tg,appointment_id:apptId});
    showConfirm(apptId,name+' — '+fmtApptShort(selectedSlot.date,selectedSlot.time));
  }catch(e){
    console.error(e);
    blog('error',{patient_name:name,telegram:tg,error_text:(e&&(e.message||e.details||JSON.stringify(e)))||'unknown_error'});
    alert(T('errBook'));btn.disabled=false;btn.textContent=T('submit');
  }
}

/* Переопределяет applyLang из booking.js: добавляет перевод статей и вопросов анкеты,
   убирает ссылку на удалённый элемент ad17-check. */
function applyLang(){
  const s=function(id,v){const e=document.getElementById(id);if(e)e.textContent=v;};
  const h=function(id,v){const e=document.getElementById(id);if(e)e.innerHTML=v;};
  s('hdr-title',T('hdrTitle'));s('hdr-write-label',T('hdrWriteLabel'));s('hdr-channel-text',T('hdrChannel'));s('hdr-map-text',T('hdrMap'));
  s('step1-title',T('step1'));s('step1-sub',T('step1sub'));
  renderTypes();
  s('back-from-cal',T('back'));s('back-from-form',T('backCal'));
  const btf=document.getElementById('btn-to-form');if(btf)btf.textContent=T('nextForm');
  const sb=document.getElementById('submit-btn');if(sb&&!sb.disabled)sb.textContent=T('submit');
  const ag=document.getElementById('btn-again');if(ag)ag.textContent=T('againBtn');
  h('rc-reason-title',T('reason')+' <span class="req">*</span>');s('rc-contacts',T('contacts'));
  h('rc-complaints',T('complaints')+' <span class="req">*</span>');h('rc-correction',T('correction')+' <span class="req">*</span>');
  h('rc-diop',T('diop')+' <span style="font-size:13px;font-weight:400;color:var(--tm)">'+T('diopHint')+'</span>');
  h('rc-eye',T('eye')+' <span class="req">*</span>');h('rc-general',T('general')+' <span class="req">*</span>');h('rc-loads',T('loads')+' <span class="req">*</span>');
  s('rc-notes',T('notes'));s('rc-source',T('source'));h('rc-promo',T('promo')+' <span style="font-size:13px;font-weight:400;color:var(--tm)">'+T('promoHint')+'</span>');
  h('lbl-tg',T('lblTg')+' <span class="req">*</span> <span style="font-weight:400;color:var(--tm)">('+(_lang==='sr'?'za potvrdu':'для подтверждения')+')</span>');
  h('lbl-lastname',T('lblLastname')+' <span class="req">*</span>');
  h('lbl-firstname',T('lblFirstname')+' <span class="req">*</span>');
  h('lbl-dob',T('lblDob')+' <span class="req">*</span>');
  h('lbl-phone',T('lblPhone')+' <span style="font-weight:400;color:var(--tm)">('+(_lang==='sr'?'nije obavezno':'необязательно')+')</span>');
  const sd=document.getElementById('dob-d');if(sd&&sd.options[0])sd.options[0].textContent=T('dobDay');
  const sy=document.getElementById('dob-y');if(sy&&sy.options[0])sy.options[0].textContent=T('dobYear');
  fillDobMonths();
  s('hint-lastname',T('hintLastname'));s('hint-firstname',T('hintFirstname'));
  s('ad10-title',T('ad10t'));s('ad10-text',T('ad10'));s('acc10-label',T('acc10Label'));h('acc10-body',T('acc10Body'));
  s('ad17-title',T('ad17t'));s('ad17-text',T('ad17'));s('acc17-label',T('acc17Label'));h('acc17-body',T('acc17Body'));
  h('kq-q1-label',T('kqQ1')+' <span class="req">*</span>');
  h('kq-q2-label',T('kqQ2')+' <span class="req">*</span>');
  h('kq-q3-label',T('kqQ3')+' <span class="req">*</span>');
  h('kq-q4-label',T('kqQ4')+' <span style="font-weight:400;color:var(--tm)" id="kq-q4-opt">'+T('kqQ4Opt')+'</span>');
  h('kq-q5-label',T('kqQ5')+' <span class="req">*</span>');
  s('kq-q6-label',T('kqQ6'));s('kq-q6text-label',T('kqQ6Text'));s('kq-q7-label',T('kqQ7'));
  ['kq-first','kq-prescribed','kq-using','kq-exam','kq-disease','kq-special'].forEach(id=>{
    const sel=document.getElementById(id);
    if(sel&&sel.options.length>=3){sel.options[0].textContent=T('kqOptPlaceholder');sel.options[1].textContent=T('kqOptYes');sel.options[2].textContent=T('kqOptNo');}
  });
  if(document.getElementById('kq-first'))updateKidsQuiz();
  document.querySelectorAll('.chip[data-ru]').forEach(c=>{c.textContent=_lang==='sr'?(c.dataset.sr||c.dataset.ru):c.dataset.ru;});
  const sel=document.getElementById('f-source');
  if(sel){const cur=sel.value;sel.innerHTML='<option value="">'+T('srcPlaceholder')+'</option>'+T('srcOpts').map(o=>'<option value="'+o+'">'+o+'</option>').join('');sel.value=cur;}
  const pd=document.getElementById('f-diop');if(pd)pd.placeholder=T('phDiop');
  const pn=document.getElementById('f-notes');if(pn)pn.placeholder=T('phNotes');
  const pp=document.getElementById('f-promo');if(pp)pp.placeholder=T('phPromo');
  s('consent-text',T('consent'));s('conf-title',T('confTitle'));s('conf-sub',T('confSub'));
  s('addr-label',T('addrLabel'));s('addr-note',T('addrNote'));s('map-link-text',T('mapLink'));
  const days=T('days');
  [['dh0',1],['dh1',2],['dh2',3],['dh3',4],['dh4',5],['dh5',6],['dh6',0]].forEach(([id,js])=>s(id,days[js]));
  if(calYear)renderCalendar();if(selectedType)renderReasons();if(selectedType)updateTypeSumLang();if(selectedSlot)updateSlotSumLang();
  if(pendingAppts.length||_botMissing)updateTgHint();
}
