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

const REASONS={primary:[{t:'Плановая проверка зрения',s:'Planska provera vida'},{t:'Подбор очков для дали',s:'Izbor naočara za daljinu'},{t:'Подбор очков для близи/работы',s:'Izbor naočara za blizinu/rad'},{t:'Подбор очков с прогрессивными линзами',s:'Izbor naočara s progresivnim sočivima'},{t:'Нужны новые очки (старые не подходят/сломались/потерялись)',s:'Potrebne nove naočare'},{t:'Подбор контактных линз',s:'Izbor kontaktnih sočiva'},{t:'Подбор контактных линз с обучением',s:'Izbor kontaktnih sočiva s obukom'},{t:'Сложности с адаптацией к очкам/контактным линзам',s:'Teškoće s adaptacijom na naočare/kontaktna sočiva'},{t:'Консультация по гигиене зрения и ношению очков/контактных линз',s:'Konsultacija o higijeni vida i nošenju naočara/kontaktnih sočiva'},{t:'Консультация по выбору линз/оправ',s:'Konsultacija o izboru sočiva/okvira'},{t:'Помощь в оформлении заказа',s:'Pomoć pri formiranju porudžbine'}],repeat:[{t:'Плановая проверка зрения',s:'Planska provera vida'},{t:'Подбор очков для дали',s:'Izbor naočara za daljinu'},{t:'Подбор очков для близи/работы',s:'Izbor naočara za blizinu/rad'},{t:'Подбор очков с прогрессивными линзами',s:'Izbor naočara s progresivnim sočivima'},{t:'Нужны новые очки',s:'Potrebne nove naočare'},{t:'Подбор контактных линз',s:'Izbor kontaktnih sočiva'},{t:'Подбор контактных линз с обучением',s:'Izbor kontaktnih sočiva s obukom'},{t:'Сложности с адаптацией к очкам/контактным линзам',s:'Teškoće s adaptacijom na naočare/kontaktna sočiva'},{t:'Консультация по гигиене зрения и ношению очков/контактных линз',s:'Konsultacija o higijeni vida i nošenju naočara/kontaktnih sočiva'},{t:'Консультация по выбору линз/оправ',s:'Konsultacija o izboru sočiva/okvira'},{t:'Помощь в оформлении заказа',s:'Pomoć pri formiranju porudžbine'}],cl:[{t:'Плановая проверка зрения',s:'Planska provera vida'},{t:'Подбор контактных линз',s:'Izbor kontaktnih sočiva'},{t:'Подбор контактных линз с обучением',s:'Izbor kontaktnih sočiva s obukom'},{t:'Сложности с адаптацией к очкам/контактным линзам',s:'Teškoće s adaptacijom na naočare/kontaktna sočiva'},{t:'Консультация по гигиене зрения и ношению очков/контактных линз',s:'Konsultacija o higijeni vida i nošenju naočara/kontaktnih sočiva'}],control:[{t:'Контроль после подбора очков',s:'Kontrola nakon izbora naočara'},{t:'Контроль после подбора контактных линз',s:'Kontrola nakon izbora kontaktnih sočiva'},{t:'Контроль адаптации к прогрессивным линзам',s:'Kontrola adaptacije na progresivna sočiva'},{t:'Другое',s:'Ostalo'}],help:[{t:'Помощь в оформлении заказа на очки/контактные линзы',s:'Pomoć pri formiranju porudžbine za naočare/kontaktna sočiva'},{t:'Консультация по выбору линз/оправ',s:'Konsultacija o izboru sočiva/okvira'},{t:'Пока сам/а не знаю, что надо',s:'Za sada ne znam šta mi treba'}],express:[{t:'Хочу проверить зрение',s:'Želim da proverim vid'},{t:'Не уверен/а, нужны ли очки',s:'Nisam siguran/na da li su mi potrebne naočare'},{t:'Давно не проверял/а зрение',s:'Dugo nisam proveravao/la vid'},{t:'Хочу узнать, нужно ли менять коррекцию',s:'Želim da saznam da li treba da promenim korekciju'}]};

const BK={ru:{hdrTitle:'Запись на приём к оптометристу Анне Новосёловой',hdrWriteLabel:'Написать Анне',hdrChannel:'Канал',hdrMap:'Карта',step1:'Выберите вид приёма',step1sub:'Шаг 1 из 3',reason:'Причина обращения',contacts:'Контактные данные',complaints:'Жалобы',correction:'Используете ли вы коррекцию зрения?',diop:'Диоптрии',diopHint:'(если знаете, примерно)',eye:'Заболевания глаз',general:'Общие заболевания',loads:'Зрительные нагрузки',notes:'Что хотели бы сообщить перед приёмом?',source:'Откуда вы узнали о нас?',promo:'Промокод',promoHint:'(если есть)',lblTg:'Telegram',lblLastname:'Фамилия (латиницей)',lblFirstname:'Имя (латиницей)',lblDob:'Дата рождения',lblPhone:'Телефон',hintLastname:'Пример: Ivanova',hintFirstname:'Пример: Maria',dobDay:'ДД',dobMonth:'Месяц',dobYear:'Год',submit:'Записаться →',submitting:'Оформляем...',backCal:'← Назад к расписанию',back:'← Назад',nextForm:'Далее — заполнить анкету →',confTitle:'Последний шаг!',confSub:'Напишите боту в Telegram — это подтвердит вашу запись и вы получите напоминания о приёме.',tgPrompt:'Напишите боту, чтобы подтвердить запись и получать напоминания:',tgBtn:'Написать боту в Telegram',tgFallback:'По вопросам пишите: @AnnaNvslv',addrLabel:'Адрес:',addrNote:'(Riblja pijaca, Noćni bazar)',mapLink:'Открыть на карте',againBtn:'⊕ Ещё одна запись',ad10t:'⛔ Приём детей до 10 лет не проводится',ad10:'Оптометрист не осматривает детей младше 10 лет.',ad17t:'⚠️ Важно для пациентов от 10 до 17 лет',ad17:'Приём возможен при условии: ребёнок уже носит очки или КЛ, зрение стабильно, есть актуальный осмотр детского офтальмолога (не старше 6 месяцев). Присутствие родителя или законного представителя на приёме обязательно.',ad17check:'Продолжая запись, вы подтверждаете ознакомление с условиями приёма для несовершеннолетних.',srcPlaceholder:'— выберите —',srcOpts:['Посоветовали друзья / знакомые','Посоветовали коллеги','Из чата в ТГ','Из рекламного поста','Личное знакомство','Другое'],consent:'Нажимая «Записаться», вы соглашаетесь на обработку персональных данных и получение уведомлений через Telegram-бот.',selType:'Выбранный вид приёма',selSlot:'Ваша запись',months:['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],monthsG:['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],days:['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],daysFull:['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'],chooseTime:'Выберите время — ',phDiop:'Например: OD -2.5, OS -2.0',phNotes:'Любая важная информация...',phPromo:'Введите промокод',errReason:'Пожалуйста, укажите причину обращения',errTg:'Пожалуйста, укажите Telegram username',errLastname:'Пожалуйста, введите фамилию',errFirstname:'Пожалуйста, введите имя',errDob:'Пожалуйста, укажите дату рождения',errComplaints:'Пожалуйста, отметьте хотя бы один пункт в разделе «Жалобы»',errCorrection:'Пожалуйста, укажите используете ли вы коррекцию зрения',errEye:'Пожалуйста, отметьте хотя бы один пункт в разделе «Заболевания глаз»',errGeneral:'Пожалуйста, отметьте хотя бы один пункт в разделе «Общие заболевания»',errLoads:'Пожалуйста, отметьте хотя бы один пункт в разделе «Зрительные нагрузки»',errSlot:'Слот уже занят. Выберите другое время.',errBook:'Ошибка записи. Напишите нам: @AnnaNvslv',errAge:'Запись детей до 10 лет недоступна. Напишите: @AnnaNvslv'},sr:{hdrTitle:'Zakazivanje pregleda kod optometriste Ane Novoselove',hdrWriteLabel:'Pisati Ani',hdrChannel:'Kanal',hdrMap:'Mapa',step1:'Izaberite vrstu pregleda',step1sub:'Korak 1 od 3',reason:'Razlog dolaska',contacts:'Kontaktni podaci',complaints:'Tegobe',correction:'Da li koristite korekciju vida?',diop:'Dioptrija',diopHint:'(ako znate, otprilike)',eye:'Bolesti oka',general:'Opšte bolesti',loads:'Vizuelna opterećenja',notes:'Šta biste voleli da nam saopštite pre pregleda?',source:'Kako ste saznali za nas?',promo:'Promo kod',promoHint:'(ako imate)',lblTg:'Telegram',lblLastname:'Prezime (latinicom)',lblFirstname:'Ime (latinicom)',lblDob:'Datum rođenja',lblPhone:'Telefon',hintLastname:'Primer: Ivanova',hintFirstname:'Primer: Maria',dobDay:'DD',dobMonth:'Mesec',dobYear:'Godina',submit:'Zakaži →',submitting:'Zakazujemo...',backCal:'← Nazad na raspored',back:'← Nazad',nextForm:'Dalje — popunite anketu →',confTitle:'Poslednji korak!',confSub:'Pišite botu na Telegram — to će potvrditi vaš termin i dobićete podsetnik pre pregleda.',tgPrompt:'Pišite botu da biste potvrdili termin i primali podsetnik:',tgBtn:'Pisati botu na Telegram',tgFallback:'Za pitanja pišite: @AnnaNvslv',addrLabel:'Adresa:',addrNote:'(Riblja pijaca, Noćni bazar)',mapLink:'Otvori na mapi',againBtn:'⊕ Još jedno zakazivanje',ad10t:'⛔ Pregled dece do 10 godina nije dostupan',ad10:'Optometrista ne pregleda decu mlađu od 10 godina.',ad17t:'⚠️ Važno za pacijente od 10 do 17 godina',ad17:'Pregled je moguć uz uslov: dete već nosi naočare ili KS, vid je stabilan, postoji aktuelni pregled dečijeg oftalmologa (ne stariji od 6 meseci). Prisustvo roditelja ili zakonskog staratelja na pregledu je obavezno.',ad17check:'Nastavljajući zakazivanje, potvrđujete da ste upoznati s uslovima pregleda za maloletnike.',srcPlaceholder:'— izaberite —',srcOpts:['Preporučili prijatelji / poznanici','Preporučili kolege','Iz TG grupe','Iz reklamnog posta','Lično poznanstvo','Ostalo'],consent:'Klikom na "Zakaži" pristajete na obradu ličnih podataka i primanje obaveštenja putem Telegram bota.',selType:'Izabrana vrsta pregleda',selSlot:'Vaš termin',months:['Januar','Februar','Mart','April','Maj','Jun','Jul','Avgust','Septembar','Oktobar','Novembar','Decembar'],monthsG:['januara','februara','marta','aprila','maja','juna','jula','avgusta','septembra','oktobra','novembra','decembra'],days:['Ne','Po','Ut','Sr','Če','Pe','Su'],daysFull:['nedelja','ponedeljak','utorak','sreda','četvrtak','petak','subota'],chooseTime:'Izaberite vreme — ',phDiop:'Na primer: OD -2.5, OS -2.0',phNotes:'Bilo koja važna informacija...',phPromo:'Unesite promo kod',errReason:'Molimo navedite razlog dolaska',errTg:'Molimo navedite Telegram korisničko ime',errLastname:'Molimo unesite prezime',errFirstname:'Molimo unesite ime',errDob:'Molimo navedite datum rođenja',errComplaints:'Molimo označite bar jednu stavku u delu "Tegobe"',errCorrection:'Molimo navedite da li koristite korekciju vida',errEye:'Molimo označite bar jednu stavku u delu "Bolesti oka"',errGeneral:'Molimo označite bar jednu stavku u delu "Opšte bolesti"',errLoads:'Molimo označite bar jednu stavku u delu "Vizuelna opterećenja"',errSlot:'Ovaj termin je već zauzet. Izaberite drugo vreme.',errBook:'Greška pri zakazivanju. Pišite nam: @AnnaNvslv',errAge:'Zakazivanje za decu do 10 godina nije dostupno. Pišite: @AnnaNvslv'}};

const CL_NOTE={ru:'На приёме оптометриста не проводится циклоплегия (расширение зрачка), осмотр глазного дна и измерение внутриглазного давления. Это делает офтальмолог — врач, который также диагностирует и лечит глазные заболевания (катаракту, глаукому, патологии сетчатки и т.п.).',sr:'Na pregledu kod optometriste se ne vrši cikloplegija (širenje zenice), pregled očnog dna niti merenje očnog pritiska. To radi oftalmolog — lekar koji takođe dijagnostikuje i leči očna oboljenja (kataraktu, glaukom, bolesti mrežnjače i sl.).'};
const TG_POST='https://t.me/optometrist_anna_ns/12';

// slotType в available_slots: 'primary' | 'short' | 'express'
// 'express' — только для акционной диагностики, ставится вручную
// старые слоты без slot_type считаются 'short'
// noAgeLimit:true — для этих видов приёма возрастные дисклеймеры/ограничения не показываются вообще (помощь и контроль)
const TYPES_DATA=[
  {id:'primary',icon:'👁',health:true,slotType:'primary',
    ru:{name:'Проверка зрения, подбор очков и контактных линз',sub:'Часовая консультация с обследованием и подбором очков и контактных линз',dur:'60 минут',price:'3000 дин.',apptName:'Первичный приём (подбор очков/КЛ)'},
    sr:{name:'Provera vida, izbor naočara i kontaktnih sočiva',sub:'Jednočasovna konsultacija sa pregledom i izborom naočara i kontaktnih sočiva',dur:'60 minuta',price:'3000 din.',apptName:'Primarni pregled (izbor naočara/KS)'},
    consult:3000,
    includes:{ru:['Подробный сбор анамнеза','Обследование на авторефкератометре (объективная рефракция)','Проверка остроты зрения','Субъективная проверка рефракции пробным набором линз','Подбор очков с учётом особенностей зрительной работы','Рекомендации и разъяснения по вашей ситуации','Сопровождение в оптике при заказе очков'],
             sr:['Detaljno prikupljanje anamneze','Pregled na autorefraktometru (objektivna refrakcija)','Provera oštrine vida','Subjektivna provera refrakcije probnim setom sočiva','Izbor naočara prema vašim vizuelnim potrebama','Preporuke i objašnjenje vaše situacije','Praćenje u optici prilikom poručivanja naočara']},
    note:CL_NOTE,
    tgLink:TG_POST},
  {id:'cl',icon:'🔬',health:true,slotType:'primary',
    ru:{name:'Проверка зрения, подбор контактных линз',sub:'Практическое обучение снятию/надеванию контактных линз',dur:'90–120 минут',price:'3500 дин.',apptName:'Подбор контактных линз с обучением'},
    sr:{name:'Provera vida, izbor i obuka za kontaktna sočiva',sub:'Uključuje praktičnu obuku za stavljanje i skidanje sočiva',dur:'90–120 minuta',price:'3500 din.',apptName:'Izbor kontaktnih sočiva s obukom'},
    consult:3500,
    includes:{ru:['Подробный сбор анамнеза','Обследование на авторефкератометре','Проверка остроты зрения','Субъективная проверка рефракции, подбор параметров линз','Теоретическая часть: правила безопасного ношения контактных линз','Специалист покажет на себе, как надевать и снимать линзу, затем наденет линзу вам','Вы будете тренироваться сами под контролем специалиста, пока не начнёт получаться уверенно'],
             sr:['Detaljno prikupljanje anamneze','Pregled na autorefraktometru','Provera oštrine vida','Subjektivna provera refrakcije, izbor parametara sočiva','Teorijski deo: pravila bezbednog nošenja kontaktnih sočiva','Specijalista će na sebi pokazati kako se sočivo stavlja i skida, a zatim će vam staviti sočivo','Sami ćete vežbati uz nadzor specijaliste, dok ne budete sigurni u stavljanju/skidanju']},
    note:CL_NOTE,
    tgLink:TG_POST},
  {id:'control',icon:'✅',health:false,slotType:'short',noAgeLimit:true,
    ru:{name:'Контрольный визит',sub:'Контрольный визит после получения очков',dur:'15 минут',price:'Бесплатно',apptName:'Контрольный визит'},
    sr:{name:'Kontrolni pregled',sub:'Kontrolni pregled nakon preuzimanja naočara',dur:'15 minuta',price:'Besplatno',apptName:'Kontrolni pregled'},
    consult:0},
  {id:'help',icon:'🛍',health:false,slotType:'short',noAgeLimit:true,
    ru:{name:'Помощь при оформлении заказа',sub:'Если есть рецепт на очки, но нужна помощь в оптике, в том числе с детскими очками',dur:'15 минут',price:'Бесплатно',apptName:'Помощь в оптике'},
    sr:{name:'Pomoć pri formiranju porudžbine',sub:'Ako imate recept za naočare, ali vam je potrebna pomoć u optici, uključujući i dečije naočare',dur:'15 minuta',price:'Besplatno',apptName:'Pomoć u optici'},
    consult:0,
    helpList:{ru:['Помощь в подборе оправы','Рекомендации по посадке, качеству и техническим ограничениям в соответствии с вашим рецептом','Помощь с выбором очковых линз — объясню разницу, подберу варианты под ваш бюджет','Ремонт очков','Проверка соответствия изготовленных очков вашему рецепту'],
              sr:['Pomoć pri izboru okvira','Preporuke o pristajanju, kvalitetu i tehničkim ograničenjima u skladu s vašim receptom','Pomoć pri izboru sočiva za naočare — objasniću razlike i pomoći da izaberete opciju prema budžetu','Popravka naočara','Provera da li izrađene naočare odgovaraju vašem receptu']}},
  {id:'repeat',icon:'🔄',health:true,slotType:'primary',
    ru:{name:'Повторный приём',sub:'В течение 6 месяцев после первичного',dur:'60 минут',price:'2000 дин.',apptName:'Повторный приём'},
    sr:{name:'Ponovni pregled',sub:'U roku od 6 meseci od primarnog',dur:'60 minuta',price:'2000 din.',apptName:'Ponovni pregled'},
    consult:2000},
  {id:'express',icon:'🎁',health:false,slotType:'express',
    ru:{name:'Экспресс-диагностика зрения',sub:'Экспресс-чекап: нужны ли новые очки (не полноценная проверка зрения)',dur:'15 минут',price:'Бесплатно',apptName:'Экспресс-диагностика'},
    sr:{name:'Ekspres dijagnostika vida',sub:'Ekspres-čekap: da li su vam potrebne nove naočare (nije kompletna provera vida)',dur:'15 minuta',price:'Besplatno',apptName:'Ekspres dijagnostika'},
    consult:0,
    includes:{ru:['Авторефрактометрия (проверка на аппарате)','Проверка остроты зрения без коррекции','Проверка остроты зрения в ваших очках','Рекомендации: нужны ли новые очки'],
              sr:['Autorefraktometrija (provera na aparatu)','Provera oštrine vida bez korekcije','Provera oštrine vida u vašim naočarima','Preporuka: da li su potrebne nove naočare']},
    resultNote:{ru:'В результате вы получите: понимание, пора ли заказывать первые очки или менять старые, направление к офтальмологу при необходимости, общие рекомендации по состоянию зрения.',
                sr:'Nakon pregleda ćete saznati: da li je vreme za prve naočare ili zamenu starih, dobićete uput kod oftalmologa ako je potrebno, i opšte preporuke o stanju vida.'},
    fitGroups:[
      {tone:'green',title:{ru:'Подойдёт, если',sr:'Odgovara vam, ako:'},
        items:{ru:['Зрение начало портиться, но не уверены — нужны ли очки','Очки стали слабоваты','Хотите проверить, что очки подобраны верно'],
               sr:['Vid je počeo da slabi, ali niste sigurni da li su potrebne naočare','Naočare su postale preslabe','Želite da proverite da li su naočare pravilno izabrane']}},
      {tone:'blue',title:{ru:'Нужен полноценный приём, если',sr:'Potreban vam je pun pregled, ako:'},
        items:{ru:['Нужен подбор очков/контактных линз, в т.ч. прогрессивных/офисных','Давно не проверяли зрение, были сложности с подбором','Есть астигматизм, амблиопия, анизометропия и т.п.','Пациент младше 20 лет'],
               sr:['Potreban vam je izbor naočara/kontaktnih sočiva, uključujući progresivna/kancelarijska sočiva','Dugo niste proveravali vid, imali ste poteškoća pri izboru','Imate astigmatizam, ambliopiju, anizometropiju i sl.','Pacijent je mlađi od 20 godina']}}
    ]}
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
function checkAge(dob){
  const age=calcAge(dob);
  const btn=document.getElementById('submit-btn');
  if(selectedType&&selectedType.noAgeLimit){
    document.getElementById('age-disc-10').style.display='none';
    document.getElementById('age-disc-17').style.display='none';
    if(btn)btn.disabled=false;
    return;
  }
  document.getElementById('age-disc-10').style.display=(age!==null&&age<10)?'block':'none';
  document.getElementById('age-disc-17').style.display=(age!==null&&age>=10&&age<18)?'block':'none';
  if(btn)btn.disabled=(age!==null&&age<10);
}

const SB_URL='https://ncfqiznpilikwmpqhapb.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnFpem5waWxpa3dtcHFoYXBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTE1MDQsImV4cCI6MjA5NDE4NzUwNH0.hAr40xwNbxHnuozUhIiH1QkHFqi44YUGFI410VWH8B4';
const{createClient}=window.supabase;
const db=createClient(SB_URL,SB_KEY);
let selectedType=null,selectedSlot=null,selectedDateStr=null,allSlots=[],calYear=0,calMonth=0,botUsername='@optometrist_novoselova_bot';

const BLOG_SESSION=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():(Date.now()+'-'+Math.random().toString(36).slice(2));
const BLOG_VISITOR=(function(){
  try{
    let id=localStorage.getItem('blog_visitor_id');
    if(!id){id=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():(Date.now()+'-'+Math.random().toString(36).slice(2));localStorage.setItem('blog_visitor_id',id);}
    return id;
  }catch(e){return null;}
})();
let _blogDone=false,_blogReachedForm=false;
function blogName(){return((v('f-lastname')||'')+' '+(v('f-firstname')||'')).trim()||null;}
function blog(event,extra){
  try{
    const base={session_id:BLOG_SESSION,visitor_id:BLOG_VISITOR,event:event,type_id:selectedType?selectedType.id:null,slot_date:selectedSlot?selectedSlot.date:null,slot_time:selectedSlot?selectedSlot.time:null};
    db.from('booking_log').insert(Object.assign(base,extra||{})).then(()=>{},()=>{});
  }catch(e){}
}
function blogBeacon(event){
  try{
    fetch(SB_URL+'/rest/v1/booking_log',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Prefer':'return=minimal'},body:JSON.stringify({session_id:BLOG_SESSION,visitor_id:BLOG_VISITOR,event:event,type_id:selectedType?selectedType.id:null,slot_date:selectedSlot?selectedSlot.date:null,slot_time:selectedSlot?selectedSlot.time:null,patient_name:blogName(),telegram:v('f-tg')||null})});
  }catch(e){}
}
window.addEventListener('pagehide',()=>{if(!_blogDone&&_blogReachedForm)blogBeacon('abandoned');});

document.addEventListener('DOMContentLoaded',async()=>{
  initDobSelects();
  applyLang();renderTypes();
  blog('started');
  const now=new Date();calYear=now.getFullYear();calMonth=now.getMonth();
  const today=now.toISOString().split('T')[0];const future=new Date(now);future.setDate(future.getDate()+60);
  const{data:slots}=await db.from('available_slots').select('*').eq('is_booked',false).gte('date',today).lte('date',future.toISOString().split('T')[0]).order('date').order('start_time');
  allSlots=slots||[];
});

function toggleAcc(h,e){
  if(e)e.stopPropagation();
  const b=h.nextElementSibling;
  const open=b.style.display==='block';
  b.style.display=open?'none':'block';
  h.classList.toggle('open',!open);
}

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
  if(t.tgLink){
    const label=_lang==='sr'?'O tome kako izgleda pregled →':'О том, как проходит приём →';
    extra+='<div class="type-tg"><a href="'+t.tgLink+'" target="_blank" rel="noopener" onclick="event.stopPropagation()">'+label+'</a></div>';
  }
  return extra;
}

function renderTypes(){
  document.getElementById('type-list').innerHTML=TYPES_DATA.map(t=>{
    const loc=t[_lang]||t.ru;
    const extra=typeExtraHtml(t);
    return '<div class="type-card" onclick="selectType(\''+t.id+'\')" ><div class="type-icon">'+t.icon+'</div><div style="flex:1"><div class="type-name">'+loc.name+'</div><div class="type-sub">'+loc.sub+'</div><div class="type-meta"><span class="type-dur">⏱ '+loc.dur+'</span><span class="type-price">'+loc.price+'</span></div>'+extra+'</div></div>';
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
  const noAgeLimit=!!(selectedType&&selectedType.noAgeLimit);
  const tg=v('f-tg'),lastname=v('f-lastname'),firstname=v('f-firstname');
  const name=(lastname+' '+firstname).trim();
  const dob=getDobValue();
  const age=calcAge(dob);
  if(!noAgeLimit&&age!==null&&age<10){alert(T('errAge'));return;}
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
    showConfirm(apptId);
  }catch(e){
    console.error(e);
    blog('error',{patient_name:name,telegram:tg,error_text:(e&&(e.message||e.details||JSON.stringify(e)))||'unknown_error'});
    alert(T('errBook'));btn.disabled=false;btn.textContent=T('submit');
  }
}

async function notifyAnna(name,date,time,num,typeName){
  try{
    await fetch(SB_URL+'/functions/v1/notify-new-booking',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,date,time,num,typeName})
    });
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

function goPage(n){document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));document.getElementById('pg-'+n).classList.add('on');window.scrollTo(0,0);if(n==='form'&&!_blogReachedForm){_blogReachedForm=true;blog('reached_form');}}
