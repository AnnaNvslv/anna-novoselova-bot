let _lang='ru';
const TG_SVG='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.069-2.02 9.52c-.148.658-.54.818-1.092.508l-3.02-2.228-1.458 1.403c-.162.162-.298.298-.612.298l.218-3.085 5.618-5.073c.244-.218-.054-.338-.378-.12L7.12 13.77l-2.98-.93c-.648-.205-.662-.648.136-.96L17.13 7.22c.54-.195 1.012.132.432.849z"/></svg>';

function initDobSelects(){
  const sd=document.getElementById('dob-d');
  const sm=document.getElementById('dob-m');
  const sy=document.getElementById('dob-y');
  for(let d=1;d<=31;d++){const o=document.createElement('option');o.value=d;o.textContent=String(d).padStart(2,'0');sd.appendChild(o);}
  const curY=new Date().getFullYear();
  for(let y=curY;y>=1920;y--){const o=document.createElement('option');o.value=y;o.textContent=y;sy.appendChild(o);}
}
function fillDobMonths(){
  const sm=document.getElementById('dob-m');
  const cur=sm.value;
  const months=_lang==='sr'
    ?['Januar','Februar','Mart','April','Maj','Jun','Jul','Avgust','Septembar','Oktobar','Novembar','Decembar']
    :['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  const placeholder=_lang==='sr'?'Mesec':'Месяц';
  sm.innerHTML='<option value="">'+placeholder+'</option>';
  months.forEach((m,i)=>{const o=document.createElement('option');o.value=i+1;o.textContent=m;sm.appendChild(o);});
  if(cur)sm.value=cur;
}
function getDobValue(){
  const d=document.getElementById('dob-d').value;
  const m=document.getElementById('dob-m').value;
  const y=document.getElementById('dob-y').value;
  if(!d||!m||!y)return '';
  return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
}
function onDobChange(){
  const dob=getDobValue();
  if(dob)checkAge(dob);
  else{
    document.getElementById('age-disc-10').style.display='none';
    document.getElementById('age-disc-17').style.display='none';
    const btn=document.getElementById('submit-btn');if(btn)btn.disabled=false;
  }
}

const REASONS={primary:[{t:'Плановая проверка зрения',s:'Planska provera vida'},{t:'Подбор очков для дали',s:'Izbor naočara za daljinu'},{t:'Подбор очков для близи/работы',s:'Izbor naočara za blizinu/rad'},{t:'Подбор очков с прогрессивными линзами',s:'Izbor naočara s progresivnim sočivima'},{t:'Нужны новые очки (старые не подходят/сломались/потерялись)',s:'Potrebne nove naočare'},{t:'Подбор контактных линз',s:'Izbor kontaktnih sočiva'},{t:'Подбор КЛ с обучением',s:'Izbor KS s obukom'},{t:'Сложности с адаптацией к очкам/КЛ',s:'Teškoće s adaptacijom na naočare/KS'},{t:'Консультация по гигиене зрения и ношению очков/КЛ',s:'Konsultacija o higijeni vida i nošenju naočara/KS'},{t:'Консультация по выбору линз/оправ',s:'Konsultacija o izboru sočiva/okvira'},{t:'Помощь в оформлении заказа',s:'Pomoć pri formiranju porudžbine'}],repeat:[{t:'Плановая проверка зрения',s:'Planska provera vida'},{t:'Подбор очков для дали',s:'Izbor naočara za daljinu'},{t:'Подбор очков для близи/работы',s:'Izbor naočara za blizinu/rad'},{t:'Подбор очков с прогрессивными линзами',s:'Izbor naočara s progresivnim sočivima'},{t:'Нужны новые очки',s:'Potrebne nove naočare'},{t:'Подбор контактных линз',s:'Izbor kontaktnih sočiva'},{t:'Подбор КЛ с обучением',s:'Izbor KS s obukom'},{t:'Сложности с адаптацией к очкам/КЛ',s:'Teškoće s adaptacijom na naočare/KS'},{t:'Консультация по гигиене зрения и ношению очков/КЛ',s:'Konsultacija o higijeni vida i nošenju naočara/KS'},{t:'Консультация по выбору линз/оправ',s:'Konsultacija o izboru sočiva/okvira'},{t:'Помощь в оформлении заказа',s:'Pomoć pri formiranju porudžbine'}],cl:[{t:'Плановая проверка зрения',s:'Planska provera vida'},{t:'Подбор контактных линз',s:'Izbor kontaktnih sočiva'},{t:'Подбор КЛ с обучением',s:'Izbor KS s obukom'},{t:'Сложности с адаптацией к очкам/КЛ',s:'Teškoće s adaptacijom na naočare/KS'},{t:'Консультация по гигиене зрения и ношению очков/КЛ',s:'Konsultacija o higijeni vida i nošenju naočara/KS'}],control:[{t:'Контроль после подбора очков',s:'Kontrola nakon izbora naočara'},{t:'Контроль после подбора КЛ',s:'Kontrola nakon izbora KS'},{t:'Контроль адаптации к прогрессивным линзам',s:'Kontrola adaptacije na progresivna sočiva'},{t:'Другое',s:'Ostalo'}],help:[{t:'Помощь в оформлении заказа на очки/КЛ',s:'Pomoć pri formiranju porudžbine za naočare/KS'},{t:'Консультация по выбору линз/оправ',s:'Konsultacija o izboru sočiva/okvira'},{t:'Пока сам/а не знаю, что надо',s:'Za sada ne znam šta mi treba'}],express:[{t:'Хочу проверить зрение',s:'Želim da proverim vid'},{t:'Не уверен/а, нужны ли очки',s:'Nisam siguran/na da li su mi potrebne naočare'},{t:'Давно не проверял/а зрение',s:'Dugo nisam proveravao/la vid'},{t:'Хочу узнать, нужно ли менять коррекцию',s:'Želim da saznam da li treba da promenim korekciju'}]};

const BK={ru:{hdrTitle:'Запись на приём к оптометристу Анне Новосёловой',hdrWriteLabel:'Написать Анне',hdrChannel:'Канал',hdrMap:'Карта',step1:'Выберите вид приёма',step1sub:'Шаг 1 из 3',reason:'Причина обращения',contacts:'Контактные данные',complaints:'Жалобы',correction:'Используете ли вы коррекцию зрения?',diop:'Диоптрии',diopHint:'(если знаете, примерно)',eye:'Заболевания глаз',general:'Общие заболевания',loads:'Зрительные нагрузки',notes:'Что хотели бы сообщить перед приёмом?',source:'Откуда вы узнали о нас?',promo:'Промокод',promoHint:'(если есть)',lblTg:'Telegram',lblLastname:'Фамилия (латиницей)',lblFirstname:'Имя (латиницей)',lblDob:'Дата рождения',lblPhone:'Телефон',hintLastname:'Пример: Ivanova',hintFirstname:'Пример: Maria',dobDay:'ДД',dobMonth:'Месяц',dobYear:'Год',submit:'Записаться →',submitting:'Оформляем...',backCal:'← Назад к расписанию',back:'← Назад',nextForm:'Далее — заполнить анкету →',confTitle:'Последний шаг!',confSub:'Напишите боту в Telegram — это подтвердит вашу запись и вы получите напоминания о приёме.',tgPrompt:'Напишите боту, чтобы подтвердить запись и получать напоминания:',tgBtn:'Написать боту в Telegram',tgFallback:'По вопросам пишите: @AnnaNvslv',addrLabel:'Адрес:',addrNote:'(Riblja pijaca, Noćni bazar)',mapLink:'Открыть на карте',againBtn:'⊕ Ещё одна запись',ad10t:'⛔ Приём детей до 10 лет не проводится',ad10:'Оптометрист не осматривает детей младше 10 лет.',ad17t:'⚠️ Важно для пациентов от 10 до 17 лет',ad17:'Приём возможен при условии: ребёнок уже носит очки или КЛ, зрение стабильно, есть актуальный осмотр детского офтальмолога (не старше 6 месяцев).',ad17check:'Продолжая запись, вы подтверждаете ознакомление с условиями приёма для несовершеннолетних.',srcPlaceholder:'— выберите —',srcOpts:['Посоветовали друзья / знакомые','Посоветовали коллеги','Из чата в ТГ','Из рекламного поста','Личное знакомство','Другое'],consent:'Нажимая «Записаться», вы соглашаетесь на обработку персональных данных и получение уведомлений через Telegram-бот.',selType:'Выбранный вид приёма',selSlot:'Ваша запись',months:['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],monthsG:['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],days:['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],daysFull:['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'],chooseTime:'Выберите время — ',phDiop:'Например: OD -2.5, OS -2.0',phNotes:'Любая важная информация...',phPromo:'Введите промокод',errReason:'Пожалуйста, укажите причину обращения',errTg:'Пожалуйста, укажите Telegram username',errLastname:'Пожалуйста, введите фамилию',errFirstname:'Пожалуйста, введите имя',errDob:'Пожалуйста, укажите дату рождения',errComplaints:'Пожалуйста, отметьте хотя бы один пункт в разделе «Жалобы»',errCorrection:'Пожалуйста, укажите используете ли вы коррекцию зрения',errEye:'Пожалуйста, отметьте хотя бы один пункт в разделе «Заболевания глаз»',errGeneral:'Пожалуйста, отметьте хотя бы один пункт в разделе «Общие заболевания»',errLoads:'Пожалуйста, отметьте хотя бы один пункт в разделе «Зрительные нагрузки»',errSlot:'Слот уже занят. Выберите другое время.',errBook:'Ошибка записи. Напишите нам: @AnnaNvslv',errAge:'Запись детей до 10 лет недоступна. Напишите: @AnnaNvslv'},sr:{hdrTitle:'Zakazivanje pregleda kod optometriste Ane Novoselove',hdrWriteLabel:'Pisati Ani',hdrChannel:'Kanal',hdrMap:'Mapa',step1:'Izaberite vrstu pregleda',step1sub:'Korak 1 od 3',reason:'Razlog dolaska',contacts:'Kontaktni podaci',complaints:'Tegobe',correction:'Da li koristite korekciju vida?',diop:'Dioptrija',diopHint:'(ako znate, otprilike)',eye:'Bolesti oka',general:'Opšte bolesti',loads:'Vizuelna opterećenja',notes:'Šta biste voleli da nam saopštite pre pregleda?',source:'Kako ste saznali za nas?',promo:'Promo kod',promoHint:'(ako imate)',lblTg:'Telegram',lblLastname:'Prezime (latinicom)',lblFirstname:'Ime (latinicom)',lblDob:'Datum rođenja',lblPhone:'Telefon',hintLastname:'Primer: Ivanova',hintFirstname:'Primer: Maria',dobDay:'DD',dobMonth:'Mesec',dobYear:'Godina',submit:'Zakaži →',submitting:'Zakazujemo...',backCal:'← Nazad na raspored',back:'← Nazad',nextForm:'Dalje — popunite anketu →',confTitle:'Poslednji korak!',confSub:'Pišite botu na Telegram — to će potvrditi vaš termin i dobićete podsetnik pre pregleda.',tgPrompt:'Pišite botu da biste potvrdili termin i primali podsetnik:',tgBtn:'Pisati botu na Telegram',tgFallback:'Za pitanja pišite: @AnnaNvslv',addrLabel:'Adresa:',addrNote:'(Riblja pijaca, Noćni bazar)',mapLink:'Otvori na mapi',againBtn:'⊕ Još jedno zakazivanje',ad10t:'⛔ Pregled dece do 10 godina nije dostupan',ad10:'Optometrista ne pregleda decu mlađu od 10 godina.',ad17t:'⚠️ Važno za pacijente od 10 do 17 godina',ad17:'Pregled je moguć uz uslov: dete već nosi naočare ili KS, vid je stabilan, postoji aktuelni pregled dečijeg oftalmologa (ne stariji od 6 meseci).',ad17check:'Nastavljajući zakazivanje, potvrđujete da ste upoznati s uslovima pregleda za maloletnike.',srcPlaceholder:'— izaberite —',srcOpts:['Preporučili prijatelji / poznanici','Preporučili kolege','Iz TG grupe','Iz reklamnog posta','Lično poznanstvo','Ostalo'],consent:'Klikom na "Zakaži" pristajete na obradu ličnih podataka i primanje obaveštenja putem Telegram bota.',selType:'Izabrana vrsta pregleda',selSlot:'Vaš termin',months:['Januar','Februar','Mart','April','Maj','Jun','Jul','Avgust','Septembar','Oktobar','Novembar','Decembar'],monthsG:['januara','februara','marta','aprila','maja','juna','jula','avgusta','septembra','oktobra','novembra','decembra'],days:['Ne','Po','Ut','Sr','Če','Pe','Su'],daysFull:['nedelja','ponedeljak','utorak','sreda','četvrtak','petak','subota'],chooseTime:'Izaberite vreme — ',phDiop:'Na primer: OD -2.5, OS -2.0',phNotes:'Bilo koja važna informacija...',phPromo:'Unesite promo kod',errReason:'Molimo navedite razlog dolaska',errTg:'Molimo navedite Telegram korisničko ime',errLastname:'Molimo unesite prezime',errFirstname:'Molimo unesite ime',errDob:'Molimo navedite datum rođenja',errComplaints:'Molimo označite bar jednu stavku u delu "Tegobe"',errCorrection:'Molimo navedite da li koristite korekciju vida',errEye:'Molimo označite bar jednu stavku u delu "Bolesti oka"',errGeneral:'Molimo označite bar jednu stavku u delu "Opšte bolesti"',errLoads:'Molimo označite bar jednu stavku u delu "Vizuelna opterećenja"',errSlot:'Ovaj termin je već zauzet. Izaberite drugo vreme.',errBook:'Greška pri zakazivanju. Pišite nam: @AnnaNvslv',errAge:'Zakazivanje za decu do 10 godina nije dostupno. Pišite: @AnnaNvslv'}};

// slotType в available_slots: 'primary' | 'short' | 'express'
// 'express' — только для акционной диагностики, ставится вручную
// старые слоты без slot_type считаются 'short'
const TYPES_DATA=[
  {id:'express',icon:'🎁',health:false,slotType:'express',badge:'Акция',ru:{name:'Экспресс-диагностика зрения',sub:'Ограниченное число мест',dur:'15 минут',price:'Бесплатно',apptName:'Экспресс-диагностика (акция)'},sr:{name:'Ekspres dijagnostika vida',sub:'Ograničen broj mesta',dur:'15 minuta',price:'Besplatno',apptName:'Ekspres dijagnostika (akcija)'},consult:0},
  {id:'primary',icon:'👁',health:true,slotType:'primary',ru:{name:'Проверка зрения, подбор очков / КЛ',sub:'Первичный приём',dur:'60 минут',price:'3000 дин.',apptName:'Первичный приём (подбор очков/МКЛ)'},sr:{name:'Provera vida, izbor naočara / KS',sub:'Primarni pregled',dur:'60 minuta',price:'3000 din.',apptName:'Primarni pregled (izbor naočara/KS)'},consult:3000},
  {id:'repeat',icon:'🔄',health:true,slotType:'primary',ru:{name:'Повторный приём',sub:'В течение 6 месяцев после первичного',dur:'60 минут',price:'2000 дин.',apptName:'Повторный приём'},sr:{name:'Ponovni pregled',sub:'U roku od 6 meseci od primarnog',dur:'60 minuta',price:'2000 din.',apptName:'Ponovni pregled'},consult:2000},
  {id:'cl',icon:'🔬',health:true,slotType:'primary',ru:{name:'Проверка зрения, подбор и обучение КЛ',sub:'Включает обучение ношению линз',dur:'90–120 минут',price:'3500 дин.',apptName:'Подбор КЛ с обучением'},sr:{name:'Provera vida, izbor i obuka KS',sub:'Uključuje obuku za nošenje sočiva',dur:'90–120 minuta',price:'3500 din.',apptName:'Izbor KS s obukom'},consult:3500},
  {id:'control',icon:'✅',health:false,slotType:'short',ru:{name:'Контрольный визит',sub:'Контрольный визит после получения очков',dur:'15 минут',price:'Бесплатно',apptName:'Контрольный визит'},sr:{name:'Kontrolni pregled',sub:'Kontrolni pregled nakon preuzimanja naočara',dur:'15 minuta',price:'Besplatno',apptName:'Kontrolni pregled'},consult:0},
  {id:'help',icon:'🛍',health:false,slotType:'short',ru:{name:'Помощь при оформлении заказа',sub:'При наличии свободных окошек',dur:'15 минут',price:'Бесплатно',apptName:'Помощь в оптике'},sr:{name:'Pomoć pri formiranju porudžbine',sub:'Uz dostupnost slobodnog termina',dur:'15 minuta',price:'Besplatno',apptName:'Pomoć u optici'},consult:0}
];

function T(k){return BK[_lang]?.[k]??BK.ru[k]??k;}
function setLang(lang){_lang=lang;document.getElementById('btn-ru').classList.toggle('act',lang==='ru');document.getElementById('btn-sr').classList.toggle('act',lang==='sr');applyLang();}
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
  s('ad10-title',T('ad10t'));s('ad10-text',T('ad10'));s('ad17-title',T('ad17t'));s('ad17-text',T('ad17'));s('ad17-check',T('ad17check'));
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
}
function updateTypeSumLang(){if(!selectedType)return;const td=TYPES_DATA.find(t=>t.id===selectedType.id);if(!td)return;const loc=td[_lang]||td.ru;document.getElementById('type-sel-sum').innerHTML='<div class="sel-sum type-sum"><div class="label">'+T('selType')+'</div><div class="value">'+td.icon+' '+loc.name+'</div><div style="font-size:13px;color:var(--tm);margin-top:4px">'+loc.dur+' &nbsp;&middot;&nbsp; '+loc.price+'</div></div>';}
function updateSlotSumLang(){if(!selectedSlot||!selectedType)return;const td=TYPES_DATA.find(t=>t.id===selectedType.id);if(!td)return;const loc=td[_lang]||td.ru;const dt=new Date(selectedSlot.date+'T12:00:00');const mG=T('monthsG'),dF=T('daysFull');const dl=dt.getDate()+' '+mG[dt.getMonth()]+', '+dF[dt.getDay()];document.getElementById('form-slot-sum').innerHTML='<div class="sel-sum slot-sum"><div class="label">'+T('selSlot')+'</div><div class="value">📅 '+dl+'</div><div style="font-size:14px;opacity:.85;margin-top:3px">⏰ '+selectedSlot.time+' &nbsp;&middot;&nbsp; '+loc.dur+' &nbsp;&middot;&nbsp; '+loc.price+'</div></div>';}
function renderReasons(){if(!selectedType)return;const list=REASONS[selectedType.id]||REASONS.primary;document.getElementById('ch-reason').innerHTML=list.map(r=>{const txt=_lang==='sr'?r.s:r.t;return '<div class="chip" onclick="tog(this)" data-ru="'+r.t+'" data-sr="'+r.s+'">'+txt+'</div>';}).join('');}
function calcAge(dob){if(!dob)return null;const b=new Date(dob),n=new Date();let a=n.getFullYear()-b.getFullYear();if(n<new Date(n.getFullYear(),b.getMonth(),b.getDate()))a--;return a;}
function checkAge(dob){const age=calcAge(dob);document.getElementById('age-disc-10').style.display=(age!==null&&age<10)?'block':'none';document.getElementById('age-disc-17').style.display=(age!==null&&age>=10&&age<18)?'block':'none';const btn=document.getElementById('submit-btn');if(btn)btn.disabled=(age!==null&&age<10);}

const SB_URL='https://ncfqiznpilikwmpqhapb.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnFpem5waWxpa3dtcHFoYXBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTE1MDQsImV4cCI6MjA5NDE4NzUwNH0.hAr40xwNbxHnuozUhIiH1QkHFqi44YUGFI410VWH8B4';
const{createClient}=window.supabase;
const db=createClient(SB_URL,SB_KEY);
let selectedType=null,selectedSlot=null,selectedDateStr=null,allSlots=[],calYear=0,calMonth=0,botUsername='';

document.addEventListener('DOMContentLoaded',async()=>{
  initDobSelects();
  applyLang();renderTypes();
  const now=new Date();calYear=now.getFullYear();calMonth=now.getMonth();
  try{const{data:r}=await db.from('settings').select('key,value').eq('key','bot_username');if(r&&r[0])botUsername=r[0].value;}catch(e){}
  const today=now.toISOString().split('T')[0];const future=new Date(now);future.setDate(future.getDate()+60);
  const{data:slots}=await db.from('available_slots').select('*').eq('is_booked',false).gte('date',today).lte('date',future.toISOString().split('T')[0]).order('date').order('start_time');
  allSlots=slots||[];
});

function renderTypes(){
  document.getElementById('type-list').innerHTML=TYPES_DATA.map(t=>{
    const loc=t[_lang]||t.ru;
    const badge=t.badge?'<span style="display:inline-block;background:#dcfce7;color:#16a34a;font-size:11px;font-weight:700;padding:2px 7px;border-radius:20px;margin-left:6px;vertical-align:middle">'+t.badge+'</span>':'';
    return '<div class="type-card" onclick="selectType(\''+t.id+'\')" ><div class="type-icon">'+t.icon+'</div><div style="flex:1"><div class="type-name">'+loc.name+badge+'</div><div class="type-sub">'+loc.sub+'</div><div class="type-meta"><span class="type-dur">⏱ '+loc.dur+'</span><span class="type-price">'+loc.price+'</span></div></div></div>';
  }).join('');
}
function selectType(id){
  selectedType=TYPES_DATA.find(t=>t.id===id);
  document.querySelectorAll('.type-card').forEach(c=>c.classList.remove('sel'));
  document.querySelector('.type-card[onclick*="\''+id+'\'"]')?.classList.add('sel');
  const hs=document.getElementById('health-section');
  if(hs)hs.style.display=selectedType.health?'':'none';
  updateTypeSumLang();renderReasons();renderCalendar();goPage('cal');
}
function calMove(dir){calMonth+=dir;if(calMonth>11){calMonth=0;calYear++;}if(calMonth<0){calMonth=11;calYear--;}renderCalendar();document.getElementById('times-section').style.display='none';selectedDateStr=null;selectedSlot=null;document.getElementById('btn-to-form').disabled=true;}

function getSlotsForType(){
  if(!selectedType)return allSlots;
  const st=selectedType.slotType||'primary';
  return allSlots.filter(s=>{
    // express — строго только 'express'; short — null/undefined/'short'; primary — 'primary'
    const t=s.slot_type||'short';
    if(st==='express') return t==='express';
    if(st==='short') return t==='short';
    return t===st;
  });
}

function renderCalendar(){
  const today=new Date();today.setHours(0,0,0,0);
  document.getElementById('cal-label').textContent=T('months')[calMonth]+' '+calYear;
  const firstDay=new Date(calYear,calMonth,1);
  let startDow=firstDay.getDay();if(startDow===0)startDow=7;
  const daysInMonth=new Date(calYear,calMonth+1,0).getDate();
  const visibleSlots=getSlotsForType();
  const availDates=new Set();
  visibleSlots.forEach(s=>{const d=new Date(s.date+'T12:00:00');if(d.getFullYear()===calYear&&d.getMonth()===calMonth)availDates.add(s.date);});
  let html='';
  for(let i=1;i<startDow;i++)html+='<div class="cal-cell empty"></div>';
  for(let d=1;d<=daysInMonth;d++){
    const ds=calYear+'-'+String(calMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const dt=new Date(calYear,calMonth,d);
    const isPast=dt<today,isAvail=availDates.has(ds)&&!isPast,isSel=ds===selectedDateStr;
    let cls='cal-cell';
    if(isPast)cls+=' past';
    else if(isSel)cls+=' sel-day';
    else if(isAvail)cls+=' avail';
    html+='<div class="'+cls+'"'+(isAvail&&!isSel?' onclick="selectDate(\''+ds+'\')"':'')+'>'+d+'</div>';
  }
  document.getElementById('cal-grid').innerHTML=html;
}

function selectDate(dateStr){
  selectedDateStr=dateStr;selectedSlot=null;
  document.getElementById('btn-to-form').disabled=true;
  renderCalendar();
  const dt=new Date(dateStr+'T12:00:00');
  const mG=T('monthsG'),dF=T('daysFull');
  document.getElementById('times-title').textContent=T('chooseTime')+dt.getDate()+' '+mG[dt.getMonth()]+', '+dF[dt.getDay()];
  const visibleSlots=getSlotsForType();
  const daySlots=visibleSlots.filter(s=>s.date===dateStr);
  document.getElementById('times-grid').innerHTML=daySlots.map(s=>'<button class="time-btn" onclick="selectTime(this,\''+s.id+'\',\''+dateStr+'\',\''+s.start_time.substr(0,5)+'\')">'+s.start_time.substr(0,5)+'</button>').join('');
  document.getElementById('times-section').style.display='block';
  setTimeout(()=>document.getElementById('times-section').scrollIntoView({behavior:'smooth',block:'nearest'}),100);
}
function selectTime(btn,id,date,time){document.querySelectorAll('.time-btn').forEach(b=>b.classList.remove('sel'));btn.classList.add('sel');selectedSlot={id,date,time};updateSlotSumLang();document.getElementById('btn-to-form').disabled=false;document.getElementById('btn-to-form').textContent=T('nextForm');}
function tog(el){el.classList.toggle('on');}
function chips(id){return[...document.querySelectorAll('#'+id+' .on')].map(e=>e.dataset.ru||e.textContent);}
function v(id){return(document.getElementById(id)?.value||'').trim();}

async function submitBooking(){
  const isHealth=!!(selectedType&&selectedType.health);
  const tg=v('f-tg'),lastname=v('f-lastname'),firstname=v('f-firstname');
  const name=(lastname+' '+firstname).trim();
  const dob=getDobValue();
  const age=calcAge(dob);
  if(age!==null&&age<10){alert(T('errAge'));return;}
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
  try{
    const{data:slotCheck}=await db.from('available_slots').select('is_booked').eq('id',selectedSlot.id).single();
    if(slotCheck?.is_booked){alert(T('errSlot'));btn.disabled=false;btn.textContent=T('submit');goPage('cal');return;}
    const{data:p,error:pe}=await db.from('patients').insert({name,dob:dob||null,phone:v('f-phone')||null,telegram_username:tg||null,visit_reason:chips('ch-reason'),complaints:isHealth?chips('ch-complaints'):[],correction_types:isHealth?chips('ch-correction'):[],approx_diopters:v('f-diop')||null,eye_diseases:isHealth?chips('ch-eye'):[],general_diseases:isHealth?chips('ch-general'):[],visual_loads:isHealth?chips('ch-loads'):[],pre_notes:v('f-notes')||null,source:v('f-source')||null,promo_code:v('f-promo')||null,data_consent:true,accuracy_consent:true,is_first_visit:true}).select().single();
    if(pe)throw pe;
    const num=await genNum(selectedSlot.date);
    const td=TYPES_DATA.find(t=>t.id===selectedType.id);
    const{data:a,error:ae}=await db.from('appointments').insert({patient_id:p.id,slot_id:selectedSlot.id,date:selectedSlot.date,time:selectedSlot.time,type:td?.ru?.apptName||selectedType.id,status:'запланирован',appointment_number:num,consultation_price:td?.consult||0}).select().single();
    if(ae)throw ae;
    await db.from('available_slots').update({is_booked:true,appointment_id:a.id}).eq('id',selectedSlot.id);
    await notifyAnna(name,selectedSlot.date,selectedSlot.time,num,td?.ru?.name||selectedType.id);
    showConfirm(a.id);
  }catch(e){console.error(e);alert(T('errBook'));btn.disabled=false;btn.textContent=T('submit');}
}

async function genNum(date){const m=date.substr(5,2),y=date.substr(2,2),pref='OG-'+m+y;const{count}=await db.from('appointments').select('id',{count:'exact',head:true}).like('appointment_number',pref+'-%');return pref+'-'+String((count||0)+1).padStart(2,'0');}

async function notifyAnna(name,date,time,num,typeName){
  try{
    const{data:r}=await db.from('settings').select('key,value').in('key',['bot_token','my_chat_id']);
    const s={};(r||[]).forEach(x=>s[x.key]=x.value);
    if(!s.bot_token||!s.my_chat_id)return;
    const dt=new Date(date+'T12:00:00');
    const mG=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
    const dF=['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
    const msg='📋 Новая запись онлайн!\n\nПациент: '+name+'\nВид: '+typeName+'\n📅 '+dt.getDate()+' '+mG[dt.getMonth()]+', '+dF[dt.getDay()]+'\n⏰ '+time+'\nНомер: '+num;
    await fetch('https://api.telegram.org/bot'+s.bot_token+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:s.my_chat_id,text:msg,parse_mode:'HTML'})});
  }catch(e){}
}

function showConfirm(apptId){
  const bot=botUsername?botUsername.replace('@',''):'';
  document.getElementById('tg-hint').innerHTML=bot
    ?'<p>'+T('tgPrompt')+'</p><a class="tg-link" href="https://t.me/'+bot+'?start=appt_'+apptId+'" target="_blank" rel="noopener">'+TG_SVG+' '+T('tgBtn')+'</a>'
    :'<p>'+T('tgFallback')+'</p>';
  goPage('confirm');
}

function resetBooking(){
  selectedType=null;selectedSlot=null;selectedDateStr=null;
  ['f-tg','f-lastname','f-firstname','f-phone','f-diop','f-notes','f-source','f-promo'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  ['dob-d','dob-m','dob-y'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  document.querySelectorAll('.chip.on').forEach(c=>c.classList.remove('on'));
  document.getElementById('age-disc-10').style.display='none';
  document.getElementById('age-disc-17').style.display='none';
  document.getElementById('health-section').style.display='';
  const sb=document.getElementById('submit-btn');sb.disabled=false;sb.textContent=T('submit');
  goPage('type');
}

function goPage(n){document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));document.getElementById('pg-'+n).classList.add('on');window.scrollTo(0,0);}
