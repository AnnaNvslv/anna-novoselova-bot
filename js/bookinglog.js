// ═══ ЛОГ ОНЛАЙН-ЗАПИСИ v2: по людям (visitor_id), с историей визитов ═══
// Один человек = один браузер (visitor_id в localStorage). Если человек хоть раз записался —
// его незавершённые визиты не считаются проблемой. Служебные браузеры (Анна/сотрудники) скрываются.

const BLOG_STEPS = ['started','chose_type','chose_slot','reached_form','submit_attempt','success'];
const BLOG_STEP_LABEL = {
  started:{ru:'Только открыл(а) страницу',sr:'Samo otvorio/la stranicu'},
  chose_type:{ru:'Выбрал(а) вид приёма',sr:'Izabrao/la vrstu'},
  chose_slot:{ru:'Выбрал(а) дату и время',sr:'Izabrao/la termin'},
  reached_form:{ru:'Открыл(а) анкету',sr:'Otvorio/la upitnik'},
  submit_attempt:{ru:'Нажал(а) «Записаться»',sr:'Kliknuo/la „Zakaži“'},
  success:{ru:'Записался(лась)',sr:'Zakazao/la'}
};
const BLOG_TYPE = {primary:{ru:'Первичный',sr:'Prvi pregled'},cl:{ru:'Подбор КЛ',sr:'KS'},control:{ru:'Контроль',sr:'Kontrola'},
  help:{ru:'Помощь в оптике',sr:'Pomoć'},repeat:{ru:'Повторный',sr:'Ponovni'},express:{ru:'Экспресс',sr:'Ekspres'}};
function _bL(ru,sr){return _lang==='sr'?sr:ru;}
function _bEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
const BLOG_STEP_SHORT={started:{ru:'открыл',sr:'otvorio'},chose_type:{ru:'вид приёма',sr:'vrsta'},chose_slot:{ru:'дата',sr:'termin'},reached_form:{ru:'анкета',sr:'upitnik'},submit_attempt:{ru:'«Записаться»',sr:'„Zakaži“'},success:{ru:'✅ записан',sr:'✅ zakazan'}};
function _bShort(e){return (BLOG_STEP_SHORT[e]||{})[_lang==='sr'?'sr':'ru']||e;}
function _bStep(e){return (BLOG_STEP_LABEL[e]||{})[_lang==='sr'?'sr':'ru']||e;}
function _bType(id){return id?((BLOG_TYPE[id]||{})[_lang==='sr'?'sr':'ru']||id):'—';}
function _bDT(iso){if(!iso)return'—';const d=new Date(iso);return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0')+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function _bSlot(date,time){if(!date)return'';const[y,m,d]=date.split('-');return d+'.'+m+(time?' '+String(time).substr(0,5):'');}
function _bDur(ms){if(ms<60000)return Math.max(1,Math.round(ms/1000))+_bL(' сек',' s');const m=Math.round(ms/60000);return m<60?m+_bL(' мин',' min'):Math.floor(m/60)+_bL(' ч ',' h ')+(m%60)+_bL(' мин',' min');}
function _bSrc(s){
  if(!s)return'';
  const m={google:'Google',instagram:'Instagram',facebook:'Facebook',telegram:'Telegram','optikaginter.rs':'optikaginter.rs',
    direct:_bL('прямой заход','direktno'),'optometrist.rs':_bL('сайт optometrist.rs','sajt optometrist.rs'),other_search:_bL('поиск','pretraga'),other:_bL('другое','ostalo')};
  return m[s]||s;
}
function _bDev(d){return d==='mobile'?'📱':d==='desktop'?'💻':d==='tablet'?'📱':'';}

let _blogPeriod = 30, _blogFilter = 'problem', _blogShowOpenOnly = false, _blogShowStaff = false, _blogQuery = '';
let _blogPeople = [], _blogStaff = [], _blogOpenRow = null;

async function blogLoadStaff(){
  try{
    const{data}=await db.from('settings').select('value').eq('key','blog_staff_visitors').maybeSingle();
    _blogStaff = data&&data.value ? JSON.parse(data.value) : [];
  }catch(e){ _blogStaff=[]; }
  return _blogStaff;
}
async function blogSaveStaff(){
  await db.from('settings').upsert({key:'blog_staff_visitors',value:JSON.stringify(_blogStaff)});
}
function blogIsStaff(vid){return !!vid && _blogStaff.some(s=>s.id===vid);}

async function blogMarkStaff(vid, label){
  if(!vid) return;
  const name = prompt(_bL('Подпись для этого браузера (например: «Анна, телефон»):','Oznaka za ovaj pregledač (npr. „Ana, telefon“):'), label||'');
  if(name===null) return;
  if(!blogIsStaff(vid)) _blogStaff.push({id:vid,label:name||_bL('служебный','službeni')});
  await blogSaveStaff();
  try{ if(localStorage.getItem('blog_visitor_id')===vid) localStorage.setItem('blog_skip','1'); }catch(e){}
  toast(_bL('Скрыто из лога и аналитики','Sakriveno iz loga i analitike'));
  renderBookingLog();
}
async function blogUnmarkStaff(vid){
  _blogStaff=_blogStaff.filter(s=>s.id!==vid);
  await blogSaveStaff();
  try{ if(localStorage.getItem('blog_visitor_id')===vid) localStorage.removeItem('blog_skip'); }catch(e){}
  renderBookingLog();
}
async function blogMarkThisBrowser(){
  let vid=null; try{ vid=localStorage.getItem('blog_visitor_id'); }catch(e){}
  if(!vid){
    try{ localStorage.setItem('blog_skip','1'); }catch(e){}
    toast(_bL('Готово: с этого браузера онлайн-запись больше не попадает в лог','Gotovo: ovaj pregledač se više ne beleži'));
    return;
  }
  blogMarkStaff(vid, _bL('Мой браузер','Moj pregledač'));
}

function blogSetPeriod(d){_blogPeriod=d;renderBookingLog();}
function blogSetFilter(f){_blogFilter=f;_blogRenderTable();}
function blogToggleOpenOnly(){_blogShowOpenOnly=!_blogShowOpenOnly;_blogRenderTable();}
function blogToggleStaff(){_blogShowStaff=!_blogShowStaff;_blogRenderTable();}
function blogToggleRow(vid){_blogOpenRow=_blogOpenRow===vid?null:vid;_blogRenderTable();}
function filterBookingLogUI(q){_blogQuery=q;_blogRenderTable();}

async function _blogFetch(sinceIso){
  let out=[],from=0;
  for(let i=0;i<20;i++){
    let q=db.from('booking_log').select('*').order('created_at',{ascending:true}).range(from,from+999);
    if(sinceIso) q=q.gte('created_at',sinceIso);
    const{data,error}=await q; if(error) return{error};
    out=out.concat(data||[]); if(!data||data.length<1000) break; from+=1000;
  }
  return{data:out};
}

async function renderBookingLog(){
  const title=_bL('Лог онлайн-записи','Log zakazivanja');
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>${title}</h1></div><div class="content"><div class="spinner">${t('loading')}</div></div>`;
  const since=_blogPeriod?new Date(Date.now()-_blogPeriod*864e5):null;
  const [res] = await Promise.all([_blogFetch(since?since.toISOString():null), blogLoadStaff()]);
  if(res.error){
    document.getElementById('content').innerHTML=`<div class="topbar"><h1>${title}</h1></div><div class="content"><div class="card" style="padding:20px;color:var(--red)">${_bEsc(res.error.message||'error')}</div></div>`;
    return;
  }
  const rows=res.data||[];

  // Сессии
  const S={};
  rows.forEach(r=>{
    const s=S[r.session_id]||(S[r.session_id]={sid:r.session_id,vid:r.visitor_id||('sess:'+r.session_id),events:[],start:r.created_at,end:r.created_at});
    s.events.push(r);
    if(r.created_at<s.start)s.start=r.created_at; if(r.created_at>s.end)s.end=r.created_at;
    ['source','device','from_page','referrer','utm_campaign'].forEach(k=>{if(r[k])s[k]=r[k];});
    if(r.type_id)s.type_id=r.type_id; if(r.slot_date){s.slot_date=r.slot_date;s.slot_time=r.slot_time;}
    if(r.patient_name)s.name=r.patient_name; if(r.telegram)s.tg=r.telegram;
    if(r.event==='error'){s.error=r.error_text||'error';}
    if(r.event==='success'){s.success=r.created_at;s.appointment_id=r.appointment_id;}
  });
  Object.values(S).forEach(s=>{
    let m=0; s.events.forEach(e=>{const i=BLOG_STEPS.indexOf(e.event); if(i>m)m=i;});
    // шаги 2–3 до 10.11 не писались: анкета подразумевает их
    s.lvl=m; s.maxStep=BLOG_STEPS[m];
  });

  // Люди
  const P={};
  Object.values(S).forEach(s=>{
    const p=P[s.vid]||(P[s.vid]={vid:s.vid,sessions:[]});
    p.sessions.push(s);
  });
  const people=Object.values(P);

  // Записывался ли человек когда-либо (в т.ч. до выбранного периода)
  const realVids=people.map(p=>p.vid).filter(v=>!v.startsWith('sess:'));
  const everOk={};
  for(let i=0;i<realVids.length;i+=150){
    const{data}=await db.from('booking_log').select('visitor_id,created_at,patient_name,telegram,appointment_id').eq('event','success').in('visitor_id',realVids.slice(i,i+150));
    (data||[]).forEach(r=>{(everOk[r.visitor_id]=everOk[r.visitor_id]||[]).push(r);});
  }
  // Пациенты по appointment_id
  const apptIds=[...new Set(Object.values(everOk).flat().map(r=>r.appointment_id).filter(Boolean))];
  const apptMap={};
  for(let i=0;i<apptIds.length;i+=150){
    const{data}=await db.from('appointments').select('id,patient_id,date,start_time,status,patients(name,telegram_username,phone)').in('id',apptIds.slice(i,i+150));
    (data||[]).forEach(a=>apptMap[a.id]=a);
  }

  const now=Date.now();
  people.forEach(p=>{
    p.sessions.sort((a,b)=>a.start.localeCompare(b.start));
    p.first=p.sessions[0].start; p.last=p.sessions[p.sessions.length-1].end;
    p.lvl=Math.max(...p.sessions.map(s=>s.lvl));
    p.maxStep=BLOG_STEPS[p.lvl];
    const withSrc=p.sessions.find(s=>s.source); p.source=withSrc&&withSrc.source; p.from_page=withSrc&&withSrc.from_page;
    p.device=(p.sessions.find(s=>s.device)||{}).device;
    p.type_id=[...p.sessions].reverse().find(s=>s.type_id)?.type_id;
    const ss=[...p.sessions].reverse().find(s=>s.slot_date); if(ss){p.slot_date=ss.slot_date;p.slot_time=ss.slot_time;}
    p.name=[...p.sessions].reverse().find(s=>s.name)?.name; p.tg=[...p.sessions].reverse().find(s=>s.tg)?.tg;
    p.error=[...p.sessions].reverse().find(s=>s.error)?.error;
    const oks=(everOk[p.vid]||[]).sort((a,b)=>a.created_at.localeCompare(b.created_at));
    p.okList=oks;
    const okInPeriod=p.sessions.filter(s=>s.success);
    const lastOk=oks.length?oks[oks.length-1]:null;
    if(lastOk){ p.name=p.name||lastOk.patient_name; p.tg=p.tg||lastOk.telegram; const a=apptMap[lastOk.appointment_id]; if(a){p.patient_id=a.patient_id; p.pname=a.patients?.name; p.appt=a; p.tg=p.tg||a.patients?.telegram_username; p.phone=a.patients?.phone;} }
    const patients=new Set(oks.map(o=>apptMap[o.appointment_id]?.patient_id||o.patient_name).filter(Boolean));
    p.multiPatients=patients.size;
    p.staff=blogIsStaff(p.vid);
    if(okInPeriod.length) p.status='success';
    else if(oks.length) p.status=oks.some(o=>o.created_at>p.first)?'later':'earlier';
    else if(now-new Date(p.last).getTime()<30*60*1000) p.status='in_progress';
    else if(p.error) p.status='error';
    else if(p.lvl>=3) p.status='form';
    else if(p.lvl>=1) p.status='steps';
    else p.status='opened';
    p.problem=['error','form','steps'].includes(p.status);
  });
  people.sort((a,b)=>b.last.localeCompare(a.last));
  _blogPeople=people;
  _blogRenderPage();
}

function _blogStatusMeta(st){
  return {
    success:{cls:'badge-green',label:_bL('Записался(лась)','Zakazao/la')},
    later:{cls:'badge-green',label:_bL('Записался(лась) позже','Zakazao/la kasnije')},
    earlier:{cls:'badge-gray',label:_bL('Уже записывался(лась) раньше','Ranije zakazivao/la')},
    in_progress:{cls:'badge-blue',label:_bL('Сейчас на странице','Sada na stranici')},
    error:{cls:'badge-red',label:_bL('Ошибка','Greška')},
    form:{cls:'badge-warn',label:_bL('Бросил(а) анкету','Napustio/la upitnik')},
    steps:{cls:'badge-warn',label:_bL('Бросил(а) на выборе','Napustio/la izbor')},
    opened:{cls:'badge-gray',label:_bL('Только открыл(а)','Samo otvorio/la')}
  }[st];
}

function _blogVisible(){
  const qq=_blogQuery.trim().toLowerCase();
  return _blogPeople.filter(p=>{
    if(p.staff&&!_blogShowStaff) return false;
    if(!_blogShowOpenOnly&&p.status==='opened'&&_blogFilter!=='opened') return false;
    if(_blogFilter==='problem'&&!(p.problem||p.status==='in_progress')) return false;
    if(_blogFilter==='booked'&&!['success','later'].includes(p.status)) return false;
    if(_blogFilter==='opened'&&p.status!=='opened') return false;
    if(qq&&![p.name,p.pname,p.tg,_bType(p.type_id),_bSrc(p.source)].some(x=>(x||'').toLowerCase().includes(qq))) return false;
    return true;
  });
}

function _blogPersonCell(p){
  const nm=p.pname||p.name;
  let h='';
  if(p.patient_id) h+=`<span class="table-name" style="cursor:pointer;color:var(--primary)" onclick="event.stopPropagation();openPatientCard('${p.patient_id}')">${_bEsc(nm)}</span>`;
  else if(nm) h+=`<span>${_bEsc(nm)}</span>`;
  else h+=`<span style="color:var(--text-m)">${_bL('Аноним','Anonimno')}</span>`;
  if(p.tg) h+=` <a href="https://t.me/${_bEsc(String(p.tg).replace(/^@/,''))}" target="_blank" onclick="event.stopPropagation()" style="font-size:12px;color:var(--accent)">@${_bEsc(String(p.tg).replace(/^@/,''))}</a>`;
  if(p.phone) h+=` <a href="tel:${_bEsc(p.phone)}" onclick="event.stopPropagation()" style="font-size:12px;color:var(--text-m);white-space:nowrap">${_bEsc(p.phone)}</a>`;
  if(p.staff) h+=` <span class="badge badge-gray" style="font-size:11px;padding:1px 7px">${_bEsc((_blogStaff.find(s=>s.id===p.vid)||{}).label||_bL('служебный','službeni'))}</span>`;
  else if(p.multiPatients>=3) h+=`<div style="font-size:11.5px;color:var(--warn);margin-top:2px">${_bL('Записал(а) '+p.multiPatients+' разных пациентов — похоже на служебный браузер','Zakazao/la '+p.multiPatients+' pacijenata — verovatno službeni pregledač')}</div>`;
  return h;
}

function _blogDetail(p){
  const sess=[...p.sessions].reverse().map(s=>{
    const steps=BLOG_STEPS.filter((e,i)=>s.events.some(x=>x.event===e)).map(_bShort);
    const src=[_bSrc(s.source), s.from_page?(_bL('со страницы ','sa stranice ')+s.from_page):'', s.utm_campaign?('«'+s.utm_campaign+'»'):''].filter(Boolean).join(', ');
    return `<tr>
      <td style="white-space:nowrap">${_bDT(s.start)}</td>
      <td style="white-space:nowrap;color:var(--text-m)">${_bDur(new Date(s.end)-new Date(s.start))}</td>
      <td>${steps.join(' → ')}${s.error?`<div style="color:var(--red);font-size:12px">${_bEsc(s.error)}</div>`:''}</td>
      <td style="color:var(--text-m)">${_bType(s.type_id)}${s.slot_date?' · '+_bSlot(s.slot_date,s.slot_time):''}</td>
      <td style="color:var(--text-m)">${_bDev(s.device)} ${_bEsc(src)}</td>
    </tr>`;}).join('');
  const oks=p.okList.length?`<div style="margin-top:8px;font-size:13px">${_bL('Успешные записи за всё время','Uspešna zakazivanja ukupno')}: ${p.okList.map(o=>_bDT(o.created_at)+(o.patient_name?' — '+_bEsc(o.patient_name):'')).join('; ')}</div>`:'';
  const staffBtn=p.vid.startsWith('sess:')?'':(p.staff
    ?`<button class="btn btn-sm" style="background:var(--surface2)" onclick="blogUnmarkStaff('${p.vid}')">${_bL('Это не служебный браузер','Nije službeni')}</button>`
    :`<button class="btn btn-sm" style="background:var(--surface2)" onclick="blogMarkStaff('${p.vid}')">${_bL('Это мой / служебный браузер — скрыть','Moj / službeni — sakrij')}</button>`);
  return `<tr class="blog-detail"><td colspan="6" style="background:var(--surface2);padding:12px 16px">
    <div style="font-size:12px;color:var(--text-m);margin-bottom:6px">${_bL('Визиты','Posete')} (${p.sessions.length}):</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px" class="blog-inner">${sess}</table>
    ${oks}
    <div style="margin-top:10px">${staffBtn}</div>
  </td></tr>`;
}

function _blogRenderTable(){
  const list=_blogVisible();
  const tb=document.getElementById('blog-tbody'); if(!tb) return;
  document.querySelectorAll('.blog-chip').forEach(b=>b.classList.toggle('on',b.dataset.f===_blogFilter));
  const oo=document.getElementById('blog-openonly'); if(oo) oo.checked=_blogShowOpenOnly;
  const sf=document.getElementById('blog-staff'); if(sf) sf.checked=_blogShowStaff;
  tb.innerHTML=list.length?list.map(p=>{
    const m=_blogStatusMeta(p.status);
    const open=_blogOpenRow===p.vid;
    const src=[_bSrc(p.source),p.from_page].filter(Boolean).join(' · ');
    return `<tr class="blog-row" onclick="blogToggleRow('${p.vid}')" style="cursor:pointer${open?';background:var(--surface2)':''}">
      <td style="white-space:nowrap;font-size:13px">${_bDT(p.last)}${p.sessions.length>1?`<div style="font-size:11.5px;color:var(--text-m)">${p.sessions.length} ${_bL('визита(ов)','posete')}</div>`:''}</td>
      <td><span class="badge ${m.cls}" style="font-size:12px;padding:2px 9px">${m.label}</span></td>
      <td style="font-size:13.5px">${_blogPersonCell(p)}</td>
      <td style="font-size:13px">${_bStep(p.maxStep)}${p.error&&p.status==='error'?`<div style="font-size:12px;color:var(--red)">${_bEsc(p.error)}</div>`:''}</td>
      <td style="font-size:13px;color:var(--text-m)">${_bType(p.type_id)}${p.slot_date?`<div>${_bSlot(p.slot_date,p.slot_time)}</div>`:''}</td>
      <td style="font-size:13px;color:var(--text-m)">${_bDev(p.device)} ${_bEsc(src)||'—'}</td>
    </tr>${open?_blogDetail(p):''}`;
  }).join(''):`<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-m)">${t('no_data')}</td></tr>`;
}

function _blogRenderPage(){
  const title=_bL('Лог онлайн-записи','Log zakazivanja');
  const ppl=_blogPeople.filter(p=>!p.staff);
  const cnt=f=>ppl.filter(f).length;
  const nBooked=cnt(p=>['success','later'].includes(p.status));
  const nProblem=cnt(p=>p.problem);
  const nForm=cnt(p=>p.status==='form'||p.status==='error');
  const nOpened=cnt(p=>p.status==='opened');
  const nStaffHidden=_blogPeople.filter(p=>p.staff).length;
  const suspects=_blogPeople.filter(p=>!p.staff&&p.multiPatients>=3).length;
  let myVid=null; try{myVid=localStorage.getItem('blog_visitor_id');}catch(e){}
  const meMarked=myVid?blogIsStaff(myVid):(function(){try{return localStorage.getItem('blog_skip')==='1';}catch(e){return false;}})();
  const periodBtns=[[7,'7 '+_bL('дн.','d.')],[30,'30 '+_bL('дн.','d.')],[90,'90 '+_bL('дн.','d.')],[0,_bL('Всё время','Sve')]].map(([d,l])=>`<button class="${_blogPeriod===d?'on':''}" onclick="blogSetPeriod(${d})">${l}</button>`).join('');
  const chip=(f,l,n)=>`<button class="blog-chip" data-f="${f}" onclick="blogSetFilter('${f}')">${l}${n!=null?` <b>${n}</b>`:''}</button>`;

  document.getElementById('content').innerHTML=`
<style>
.blog-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px}
.blog-bar button{border:1px solid var(--border);background:var(--surface);border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;color:var(--text);font-family:inherit}
.blog-bar button.on{background:var(--primary);border-color:var(--primary);color:#fff}
.blog-bar label{font-size:13px;color:var(--text-m);display:flex;align-items:center;gap:6px;cursor:pointer}
.blog-row:hover{background:var(--surface2)}
.blog-row td,.blog-inner td{padding:9px 12px;border-bottom:1px solid var(--surface2);vertical-align:top}
.blog-inner td{padding:5px 8px;border-bottom:1px solid var(--border);font-size:13px}
@media(max-width:800px){.blog-tbl th:nth-child(6),.blog-tbl td:nth-child(6),.blog-tbl th:nth-child(5),.blog-row td:nth-child(5){display:none}}
</style>
<div class="topbar"><h1>${title}</h1><div class="topbar-actions"><div class="search-wrap"><input type="text" id="blogsearch" placeholder="${t('search')}" value="${_bEsc(_blogQuery)}" oninput="filterBookingLogUI(this.value)"></div></div></div>
<div class="content">
  <div class="blog-bar">${periodBtns}</div>
  <div class="stats-grid" style="margin-bottom:16px">
    <div class="stat-card"><div class="stat-label">${_bL('Людей открыли запись','Ljudi otvorilo')}</div><div class="stat-value">${ppl.length}</div></div>
    <div class="stat-card stat-green"><div class="stat-label">${_bL('Записались','Zakazali')}</div><div class="stat-value">${nBooked}</div></div>
    <div class="stat-card"><div class="stat-label">${_bL('Начали и бросили','Počeli i odustali')}</div><div class="stat-value" style="color:${nProblem?'var(--warn)':'inherit'}">${nProblem}</div></div>
    <div class="stat-card"><div class="stat-label">${_bL('Из них дошли до анкеты','Od toga do upitnika')}</div><div class="stat-value">${nForm}</div></div>
    <div class="stat-card"><div class="stat-label">${_bL('Только открыли','Samo otvorili')}</div><div class="stat-value" style="color:var(--text-m)">${nOpened}</div></div>
  </div>
  ${!meMarked?`<div class="card" style="padding:12px 16px;margin-bottom:12px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between">
    <div style="font-size:13.5px">${_bL('Если вы сами открываете страницу записи с этого устройства — отметьте его, чтобы ваши визиты не путались с пациентами.','Ako sami otvarate stranicu zakazivanja sa ovog uređaja — označite ga.')}${suspects?`<div style="font-size:12.5px;color:var(--warn);margin-top:3px">${_bL('Найдено похожих на служебные браузеров: '+suspects+' (записывали 3+ разных пациентов). Откройте строку и нажмите «скрыть».','Pronađeno sumnjivih: '+suspects)}</div>`:''}</div>
    <button class="btn btn-sm btn-primary" onclick="blogMarkThisBrowser()">${_bL('Это моё устройство','Ovo je moj uređaj')}</button></div>`:''}
  <div class="blog-bar">
    ${chip('problem',_bL('Бросили','Odustali'),nProblem)}
    ${chip('booked',_bL('Записались','Zakazali'),nBooked)}
    ${chip('all',_bL('Все','Svi'))}
    ${chip('opened',_bL('Только открыли','Samo otvorili'),nOpened)}
    <label><input type="checkbox" id="blog-openonly" onchange="blogToggleOpenOnly()"> ${_bL('показывать «только открыли»','prikaži „samo otvorili“')}</label>
    ${nStaffHidden?`<label><input type="checkbox" id="blog-staff" onchange="blogToggleStaff()"> ${_bL('показать служебные','prikaži službene')} (${nStaffHidden})</label>`:''}
  </div>
  <div class="card" style="padding:0;overflow:auto">
    <table class="blog-tbl" style="width:100%;border-collapse:collapse">
      <thead><tr style="background:#f8fafc;text-align:left">
        <th style="padding:10px 12px;font-size:12px;color:var(--text-m)">${_bL('Последний визит','Poslednja poseta')}</th>
        <th style="padding:10px 12px;font-size:12px;color:var(--text-m)">${_bL('Итог','Ishod')}</th>
        <th style="padding:10px 12px;font-size:12px;color:var(--text-m)">${_bL('Кто','Ko')}</th>
        <th style="padding:10px 12px;font-size:12px;color:var(--text-m)">${_bL('Дошёл до','Stigao do')}</th>
        <th style="padding:10px 12px;font-size:12px;color:var(--text-m)">${_bL('Вид / дата приёма','Vrsta / termin')}</th>
        <th style="padding:10px 12px;font-size:12px;color:var(--text-m)">${_bL('Откуда','Odakle')}</th>
      </tr></thead>
      <tbody id="blog-tbody"></tbody>
    </table>
  </div>
  <div style="font-size:12px;color:var(--text-m);margin-top:10px;line-height:1.5">${_bL(
    'Один человек = один браузер. Нажмите на строку — увидите все визиты: когда, сколько длились, какие шаги прошёл и откуда пришёл. У записавшихся — имя, телефон и Telegram из карточки пациента; у бросивших — только если успели ввести имя в анкету. Источник и шаги «вид приёма» / «дата» пишутся с 10.11.2026.',
    'Jedna osoba = jedan pregledač. Kliknite na red za sve posete. Ime i Telegram se vide samo ako ih je osoba unela. Izvor i koraci se beleže od 10.11.2026.')}</div>
</div>`;
  _blogRenderTable();
}
