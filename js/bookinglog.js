// ═══ BOOKING LOG (лог онлайн-записи + алерты) ═══
const BLOG_EVENT_LABEL={
  started:{ru:'Открыл(а) страницу',sr:'Otvorio/la stranicu'},
  reached_form:{ru:'Дошёл(шла) до анкеты',sr:'Došao/la do ankete'},
  submit_attempt:{ru:'Нажал(а) «Записаться»',sr:'Kliknuo/la "Zakaži"'},
  success:{ru:'Запись успешна',sr:'Uspešno zakazano'},
  error:{ru:'Ошибка',sr:'Greška'},
  abandoned:{ru:'Ушёл(шла), не закончив',sr:'Napustio/la, nije završio/la'}
};
function _blogEventLabel(ev){return(BLOG_EVENT_LABEL[ev]||{})[_lang==='sr'?'sr':'ru']||ev;}
function _blogTime(iso){if(!iso)return'—';const d=new Date(iso);return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}

async function renderBookingLog(){
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>${_lang==='sr'?'Log zakazivanja':'Лог онлайн-записи'}</h1></div><div class="content"><div class="spinner">${t('loading')}</div></div>`;

  const since=new Date();since.setDate(since.getDate()-30);
  const{data:rows,error}=await db.from('booking_log').select('*').gte('created_at',since.toISOString()).order('created_at',{ascending:false});

  if(error){
    document.getElementById('content').innerHTML=`<div class="topbar"><h1>${_lang==='sr'?'Log zakazivanja':'Лог онлайн-записи'}</h1></div>
    <div class="content"><div class="card" style="padding:20px;text-align:center;color:var(--text-m)">
      ${_lang==='sr'?'Tabela booking_log još nije kreirana u bazi.':'Таблица booking_log ещё не создана в базе — попроси Claude прислать SQL для Supabase.'}
    </div></div>`;
    return;
  }

  // Группировка по session_id
  const sessions={};
  (rows||[]).forEach(r=>{
    const s=sessions[r.session_id]||(sessions[r.session_id]={events:[],start:null,name:null,tg:null,type_id:null,error_text:null});
    s.events.push(r);
    if(!s.start||r.created_at<s.start)s.start=r.created_at;
    if(r.patient_name)s.name=r.patient_name;
    if(r.telegram)s.tg=r.telegram;
    if(r.type_id)s.type_id=r.type_id;
    if(r.event==='error'&&r.error_text)s.error_text=r.error_text;
  });

  const now=Date.now();
  const list=Object.entries(sessions).map(([sid,s])=>{
    const evNames=s.events.map(e=>e.event);
    let status='in_progress';
    if(evNames.includes('success'))status='success';
    else if(evNames.includes('error'))status='error';
    else if(evNames.includes('abandoned'))status='abandoned';
    else if(now-new Date(s.start).getTime()>30*60*1000)status='incomplete'; // начал(а), 30+ минут тишины, не дошло до успеха
    const last=s.events[0];
    return{sid,...s,status,last_at:last.created_at,last_event:last.event};
  }).sort((a,b)=>b.last_at.localeCompare(a.last_at));

  const days7=now-7*24*60*60*1000;
  const recent=list.filter(x=>new Date(x.last_at).getTime()>=days7);
  const problemCount=recent.filter(x=>['error','abandoned','incomplete'].includes(x.status)).length;
  const successCount=recent.filter(x=>x.status==='success').length;
  const inProgressCount=list.filter(x=>x.status==='in_progress').length;

  const STATUS_META={
    success:{color:'#16a34a',bg:'#dcfce7',label:_lang==='sr'?'Uspešno':'Успешно'},
    error:{color:'#dc2626',bg:'#fee2e2',label:_lang==='sr'?'Greška':'Ошибка'},
    abandoned:{color:'#d97706',bg:'#fef3c7',label:_lang==='sr'?'Napušteno':'Не закончил(а)'},
    incomplete:{color:'#d97706',bg:'#fef3c7',label:_lang==='sr'?'Nezavršeno':'Не завершено'},
    in_progress:{color:'#2563eb',bg:'#dbeafe',label:_lang==='sr'?'U toku':'В процессе'}
  };

  const alertHtml=problemCount>0
    ?`<div class="card" style="padding:16px;background:#fef2f2;border:1px solid #fecaca;margin-bottom:16px">
        <div style="font-weight:700;color:#991b1b;font-size:15px">⚠️ ${_lang==='sr'?`${problemCount} problematičnih pokušaja zakazivanja u poslednjih 7 dana`:`${problemCount} проблемных попыток записи за последние 7 дней`}</div>
        <div style="font-size:13px;color:#991b1b;opacity:.85;margin-top:4px">${_lang==='sr'?'Pacijenti su naišli na grešku ili nisu završili zakazivanje — pogledajte tabelu ispod.':'Пациенты столкнулись с ошибкой или не завершили запись — смотри таблицу ниже.'}</div>
      </div>`
    :`<div class="card" style="padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;margin-bottom:16px">
        <div style="font-weight:700;color:#166534;font-size:14px">✅ ${_lang==='sr'?'Nema problema u poslednjih 7 dana':'Проблем за последние 7 дней нет'}</div>
      </div>`;

  const rowsHtml=list.length?list.map(s=>{
    const meta=STATUS_META[s.status];
    const nameOrTg=s.name||s.tg||'—';
    const errTxt=s.status==='error'&&s.error_text?`<div style="font-size:12px;color:#991b1b;margin-top:2px">${s.error_text}</div>`:'';
    return`<tr>
      <td style="white-space:nowrap;font-size:13px">${_blogTime(s.last_at)}</td>
      <td><span style="display:inline-block;padding:2px 9px;border-radius:20px;font-size:12px;font-weight:700;background:${meta.bg};color:${meta.color}">${meta.label}</span></td>
      <td style="font-size:13.5px">${nameOrTg}${errTxt}</td>
      <td style="font-size:13px;color:var(--text-m)">${s.type_id||'—'}</td>
      <td style="font-size:13px;color:var(--text-m)">${_blogEventLabel(s.last_event)}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-m)">${t('no_data')}</td></tr>`;

  document.getElementById('content').innerHTML=`
<div class="topbar"><h1>${_lang==='sr'?'Log zakazivanja':'Лог онлайн-записи'}</h1></div>
<div class="content">
  <div class="stats-grid" style="margin-bottom:16px">
    <div class="stat-card"><div class="stat-label">${_lang==='sr'?'Problemi (7 dana)':'Проблемы (7 дней)'}</div><div class="stat-value" style="color:${problemCount?'#dc2626':'inherit'}">${problemCount}</div></div>
    <div class="stat-card stat-green"><div class="stat-label">${_lang==='sr'?'Uspešno (7 dana)':'Успешно (7 дней)'}</div><div class="stat-value">${successCount}</div></div>
    <div class="stat-card stat-accent"><div class="stat-label">${_lang==='sr'?'U toku sada':'Сейчас в процессе'}</div><div class="stat-value">${inProgressCount}</div></div>
  </div>
  ${alertHtml}
  <div class="card" style="padding:0;overflow:hidden">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc;text-align:left">
        <th style="padding:10px 12px;font-size:12px;color:var(--text-m)">${_lang==='sr'?'Vreme':'Время'}</th>
        <th style="padding:10px 12px;font-size:12px;color:var(--text-m)">${_lang==='sr'?'Status':'Статус'}</th>
        <th style="padding:10px 12px;font-size:12px;color:var(--text-m)">${_lang==='sr'?'Pacijent / Telegram':'Пациент / Telegram'}</th>
        <th style="padding:10px 12px;font-size:12px;color:var(--text-m)">${_lang==='sr'?'Vrsta':'Вид приёма'}</th>
        <th style="padding:10px 12px;font-size:12px;color:var(--text-m)">${_lang==='sr'?'Poslednji korak':'Последний шаг'}</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
  </div>
  <div style="font-size:12px;color:var(--text-m);margin-top:10px">${_lang==='sr'?'Prikaz poslednjih 30 dana, grupisano po sesiji.':'Показаны последние 30 дней, сгруппировано по сессии.'}</div>
</div>`;
}
