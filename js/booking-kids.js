/* booking-kids.js — расширения booking.js, загружается вторым (после booking.js).
   v2: детская анкета 12-17 (v1) + правки по списку Анны от 2026-09-20:
   - убран тип "подбор КЛ"
   - новое описание экспресс-диагностики
   - "как проходит приём" — аккордеон вместо ссылки
   - доп. строки в описание первичного приёма про контактные линзы
   - подсказка про ник в Telegram
   - "используете вы" → "пользуется ли пациент"
   - поле "другое" в заболеваниях глаз + отдельный блок операций на глазах с годом
   - правки текста зрительных нагрузок (сделаны в booking.html, чипы статичны)
   - валидация: скролл + подсветка вместо alert */

/* ── 1. Правки TYPES_DATA (мутируем объекты/массив на месте, TYPES_DATA остаётся тем же const) ── */
(function(){
  const idx = TYPES_DATA.findIndex(t=>t.id==='cl');
  if(idx!==-1) TYPES_DATA.splice(idx,1);

  const primary = TYPES_DATA.find(t=>t.id==='primary');
  if(primary && primary.includes){
    primary.includes.ru.push(
      'Подбор параметров контактных линз — при наличии пробников выдам их вам на дом для примерки',
      'Теория использования контактных линз: правила ношения, надевания и снимания, ограничения — на приёме'
    );
    primary.includes.sr.push(
      'Izbor parametara kontaktnih sočiva — ako imam probna sočiva, daću vam ih da isprobate kod kuće',
      'Teorija korišćenja kontaktnih sočiva: pravila nošenja, stavljanja i skidanja, ograničenja — na pregledu'
    );
    primary.aboutVisit = {
      ru: '<p>Приём длится час — коротко из чего он состоит:</p>'
        +'<ol style="padding-left:18px;margin:6px 0 0"><li><b>Анкета</b> — до приёма прошу заполнить анкету о целях визита и истории зрения, при необходимости уточняю детали заранее.</li>'
        +'<li><b>Анамнез и объяснение</b> — подробно расспрашиваю про историю зрения и жалобы, на схеме объясняю, что происходит с глазами и почему нужна коррекция.</li>'
        +'<li><b>Обследование</b> — авторефкератометр (объективная рефракция) и проверка пробным набором линз (субъективная рефракция).</li>'
        +'<li><b>Подбор очков</b> — с учётом ваших зрительных задач, без спешки.</li>'
        +'<li><b>Рекомендации и сопровождение</b> — карточка с результатами, схема адаптации, сопровождение в оптике при выборе оправы и линз; я остаюсь на связи после приёма.</li></ol>',
      sr: '<p>Pregled traje sat vremena — ukratko od čega se sastoji:</p>'
        +'<ol style="padding-left:18px;margin:6px 0 0"><li><b>Anketa</b> — pre pregleda tražim da popunite anketu o cilju posete i istoriji vida, po potrebi razjasnim detalje unapred.</li>'
        +'<li><b>Anamneza i objašnjenje</b> — detaljno pitam o istoriji vida i tegobama, na šemi objašnjavam šta se dešava sa očima i zašto je potrebna korekcija.</li>'
        +'<li><b>Pregled</b> — autorefraktometar (objektivna refrakcija) i provera probnim setom sočiva (subjektivna refrakcija).</li>'
        +'<li><b>Izbor naočara</b> — prema vašim vizuelnim potrebama, bez žurbe.</li>'
        +'<li><b>Preporuke i praćenje</b> — kartica sa rezultatima, šema adaptacije, praćenje u optici pri izboru okvira i sočiva; ostajem dostupna i posle pregleda.</li></ol>'
    };
  }

  const express = TYPES_DATA.find(t=>t.id==='express');
  if(express){
    express.ru.sub = 'Экспресс-чекап за 15 минут: подходят ли ещё ваши очки или их пора менять; пора ли заказывать первые очки. Подбор очков в экспресс-чекап не входит, только быстрая диагностика.';
    express.sr.sub = 'Ekspres-čekap za 15 minuta: da li vam još odgovaraju naočare ili ih je vreme zameniti; da li je vreme za prve naočare. Izbor naočara nije uključen u ekspres-čekap, samo brza dijagnostika.';
  }
})();

/* ── 2. Переопределяет typeExtraHtml из booking.js: "О том, как проходит приём" теперь аккордеон, не ссылка ── */
function typeExtraHtml(t){
  let extra='';
  if(t.includes){
    const items=(t.includes[_lang]||t.includes.ru).map(i=>'<li>'+i+'</li>').join('');
    const resultHtml=t.resultNote?'<div class="type-result">'+(t.resultNote[_lang]||t.resultNote.ru)+'</div>':'';
    const noteHtml=t.note?'<div class="type-note">'+(t.note[_lang]||t.note.ru)+'</div>':'';
    const label=_lang==='sr'?'Šta je uključeno':(t.id==='express'?'Что входит':'Что входит в приём');
    extra+='<div class="type-acc"><div class="type-acc-h" onclick="toggleAcc(this,event)">'+label+' <span class="chev">▾</span></div><div class="type-acc-b"><ul>'+items+'</ul>'+resultHtml+noteHtml+'</div></div>';
  }
  if(t.fitGroups){
    const groups=t.fitGroups.map(g=>{
      const gi=(g.items[_lang]||g.items.ru).map(i=>'<li>'+i+'</li>').join('');
      const gt=g.title[_lang]||g.title.ru;
      return '<div class="type-group '+g.tone+'"><span class="type-group-t">'+gt+'</span><ul>'+gi+'</ul></div>';
    }).join('');
    const label=_lang==='sr'?'Da li mi odgovara ekspres provera?':'Подходит ли мне экспресс-проверка?';
    extra+='<div class="type-acc"><div class="type-acc-h" onclick="toggleAcc(this,event)">'+label+' <span class="chev">▾</span></div><div class="type-acc-b">'+groups+'</div></div>';
  }
  if(t.helpList){
    const items=(t.helpList[_lang]||t.helpList.ru).map(i=>'<li>'+i+'</li>').join('');
    const label=_lang==='sr'?'U čemu mogu da pomognem':'Чем могу помочь';
    extra+='<div class="type-acc"><div class="type-acc-h" onclick="toggleAcc(this,event)">'+label+' <span class="chev">▾</span></div><div class="type-acc-b"><ul>'+items+'</ul></div></div>';
  }
  if(t.aboutVisit){
    const label=_lang==='sr'?'O tome kako izgleda pregled →':'О том, как проходит приём →';
    const more=_lang==='sr'?'Detaljnije na sajtu →':'Подробнее на сайте →';
    const body=(t.aboutVisit[_lang]||t.aboutVisit.ru)+'<p style="margin-top:8px"><a href="'+(t.tgLink||PRIEM_LINK)+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">'+more+'</a></p>';
    extra+='<div class="type-acc"><div class="type-acc-h" onclick="toggleAcc(this,event)">'+label+' <span class="chev">▾</span></div><div class="type-acc-b">'+body+'</div></div>';
  }
  return extra;
}

/* ── 3. Переводы: подсказка про Telegram, новые лейблы блока операций на глазах, "пользуется ли пациент" ── */
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
  errAge:'Запись детей до 12 лет недоступна. Напишите: @AnnaNvslv',
  hintTg:'Укажите именно ник (username) в Telegram, например @ivanova — без него не сможем подтвердить запись',
  correction:'Пользуется ли пациент коррекцией зрения?',
  lblEyeOther:'Другое (укажите)',
  rcEyeSurgery:'Были ли у пациента операции на глазах?',
  lblEyeSurgeryYear:'В каком году проводили операцию?'
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
  errAge:'Zakazivanje za decu do 12 godina nije dostupno. Pišite: @AnnaNvslv',
  hintTg:'Navedite baš korisničko ime (username) na Telegramu, npr. @ivanova — bez toga ne možemo potvrditi termin',
  correction:'Da li pacijent koristi korekciju vida?',
  lblEyeOther:'Ostalo (navedite)',
  rcEyeSurgery:'Da li je pacijent imao operacije na očima?',
  lblEyeSurgeryYear:'Koje godine je urađena operacija?'
});

/* ── 4. Детская анкета (без изменений логики от версии v1) ── */
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
function collectKidsAnswers(){
  if(!kidsGateActive())return null;
  return {
    first:v('kq-first'),prescribed:v('kq-prescribed'),using:v('kq-using'),
    rx:v('kq-rx'),exam:v('kq-exam'),disease:v('kq-disease'),disease_text:v('kq-disease-text'),
    special:v('kq-special'),result:_kidsState
  };
}

/* ── 5. Блок «Операции на глазах»: мультиселект + год операции, если что-то выбрано ── */
function toggleEyeSurgery(el){
  tog(el);
  updateEyeSurgeryYearVisibility();
}
function updateEyeSurgeryYearVisibility(){
  const has=chips('ch-eye-surgery').length>0;
  const w=document.getElementById('eye-surgery-year-wrap');
  if(w)w.style.display=has?'':'none';
}

/* ── 6. Скролл + подсветка невалидного поля вместо alert() ── */
function showFieldError(sel){
  const el=document.querySelector(sel);
  if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  el.classList.add('field-error');
  setTimeout(()=>el.classList.remove('field-error'),2500);
}

/* ── 7. checkAge/onDobChange: порог 12 лет, детская анкета (без изменений от v1) ── */
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

/* ── 8. resetBooking: сброс новых полей (операции на глазах, "другое") ── */
function resetBooking(){
  selectedType=null;selectedSlot=null;selectedDateStr=null;_botMissing=false;
  ['f-tg','f-lastname','f-firstname','f-phone','f-diop','f-notes','f-source','f-promo','f-eye-other','f-eye-surgery-year'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  ['dob-d','dob-m','dob-y'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.querySelectorAll('.chip.on').forEach(c=>c.classList.remove('on'));
  document.getElementById('age-disc-10').style.display='none';
  document.getElementById('age-disc-17').style.display='none';
  resetKidsQuiz();
  updateEyeSurgeryYearVisibility();
  document.getElementById('health-section').style.display='';
  const sb=document.getElementById('submit-btn');sb.disabled=false;sb.textContent=T('submit');
  goPage('type');
}

/* ── 9. submitBooking: скролл+подсветка вместо alert для обязательных полей, новые поля в payload ── */
async function submitBooking(){
  const isHealth=!!(selectedType&&selectedType.health);
  const noAgeLimit=!!(selectedType&&selectedType.noAgeLimit);
  const tg=v('f-tg'),lastname=v('f-lastname'),firstname=v('f-firstname');
  const name=(lastname+' '+firstname).trim();
  const dob=getDobValue();
  const age=calcAge(dob);
  if(!noAgeLimit&&age!==null&&age<12){showFieldError('#age-disc-10');return;}
  if(!noAgeLimit&&age!==null&&age>=12&&age<18&&_kidsState!=='accept'){showFieldError('#age-disc-17');return;}
  if(!chips('ch-reason').length){showFieldError('#ch-reason');return;}
  if(!tg){showFieldError('#f-tg');return;}
  if(!lastname){showFieldError('#f-lastname');return;}
  if(!firstname){showFieldError('#f-firstname');return;}
  if(!dob){showFieldError('.dob-row');return;}
  if(isHealth&&!chips('ch-complaints').length){showFieldError('#ch-complaints');return;}
  if(isHealth&&!chips('ch-correction').length){showFieldError('#ch-correction');return;}
  if(isHealth&&!chips('ch-eye').length){showFieldError('#ch-eye');return;}
  if(isHealth&&!chips('ch-general').length){showFieldError('#ch-general');return;}
  if(isHealth&&!chips('ch-loads').length){showFieldError('#ch-loads');return;}
  if(!selectedSlot){goPage('cal');return;}
  const btn=document.getElementById('submit-btn');btn.disabled=true;btn.textContent=T('submitting');
  blog('submit_attempt',{patient_name:name,telegram:tg});
  try{
    const{data:slotCheck}=await db.from('available_slots').select('is_booked').eq('id',selectedSlot.id).single();
    if(slotCheck?.is_booked){blog('error',{patient_name:name,telegram:tg,error_text:'slot_already_booked'});alert(T('errSlot'));btn.disabled=false;btn.textContent=T('submit');goPage('cal');return;}
    const payload={
      name,last_name:lastname,first_name:firstname,dob:dob||null,phone:v('f-phone')||null,telegram_username:tg||null,
      visit_reason:chips('ch-reason'),
      complaints:isHealth?chips('ch-complaints'):[],
      correction_types:isHealth?chips('ch-correction'):[],
      approx_diopters:v('f-diop')||null,
      eye_diseases:isHealth?chips('ch-eye'):[],
      eye_diseases_other:v('f-eye-other')||null,
      eye_surgeries:chips('ch-eye-surgery'),
      eye_surgery_year:v('f-eye-surgery-year')||null,
      general_diseases:isHealth?chips('ch-general'):[],
      visual_loads:isHealth?chips('ch-loads'):[],
      pre_notes:v('f-notes')||null,
      source:v('f-source')||null,
      promo_code:v('f-promo')||null,
      kids_questionnaire:collectKidsAnswers(),
      data_consent:true,accuracy_consent:true,is_first_visit:true
    };
    const patientId=await bkFindOrCreatePatient(payload);
    const{data:numData,error:numErr}=await db.rpc('get_next_appointment_number',{date_str:selectedSlot.date});
    if(numErr)throw numErr;
    const num=numData;
    const td=TYPES_DATA.find(t=>t.id===selectedType.id);
    const apptId=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():(Date.now()+'-'+Math.random().toString(36).slice(2));
    await bkInsertAppointment({id:apptId,patient_id:patientId,slot_id:selectedSlot.id,date:selectedSlot.date,time:selectedSlot.time,type:td?.ru?.apptName||selectedType.id,status:'запланирован',appointment_number:num,consultation_price:td?.consult||0},bkIntake(payload));
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

/* ── 10. applyLang: полная копия из booking.js + новые элементы (подсказка Telegram, блок операций на глазах, анкета подростка) ── */
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
  s('hint-tg',T('hintTg'));
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
  s('lbl-eye-other',T('lblEyeOther'));
  s('rc-eye-surgery',T('rcEyeSurgery'));
  s('lbl-eye-surgery-year',T('lblEyeSurgeryYear'));
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
