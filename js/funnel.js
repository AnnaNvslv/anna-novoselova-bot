// ═══ ВОРОНКА ЗАПИСИ: сайт optometrist.rs → онлайн-запись → запись ═══
// Данные: site_events (сайт) + booking_log (страница записи). Источники/устройства/шаги 2–3 пишутся с 10.11.2026.
const FN_TRACK_START = '2026-11-10';
let _fnDays = 30;

function _fnL(ru, sr){ return _lang==='sr' ? sr : ru; }
const FN_TYPES = {
  primary:{ru:'Первичный приём',sr:'Prvi pregled'}, cl:{ru:'Подбор КЛ',sr:'Kontaktna sočiva'},
  control:{ru:'Контрольный визит',sr:'Kontrolna poseta'}, help:{ru:'Помощь в оптике',sr:'Pomoć u optici'},
  repeat:{ru:'Повторный приём',sr:'Ponovni pregled'}, express:{ru:'Экспресс-диагностика',sr:'Ekspres dijagnostika'}
};
const FN_SOURCES = {
  google:'Google', instagram:'Instagram', facebook:'Facebook', telegram:'Telegram', direct:null,
  'optometrist.rs':null, 'optikaginter.rs':'optikaginter.rs', other_search:null, other:null
};
function _fnSrcLabel(s){
  if(!s) return _fnL('нет данных (до 10.11)','nema podataka (pre 10.11)');
  if(s==='direct') return _fnL('Прямой заход','Direktno');
  if(s==='optometrist.rs') return _fnL('Сайт optometrist.rs','Sajt optometrist.rs');
  if(s==='other_search') return _fnL('Другой поиск','Druga pretraga');
  if(s==='other') return _fnL('Другое','Ostalo');
  return FN_SOURCES[s] || s;
}
function _fnPageLabel(p){
  const m={'/':_fnL('Главная','Početna'),'/zapis':_fnL('Запись','Zakazivanje'),'/uslugi':_fnL('Услуги','Usluge'),
    '/priem':_fnL('Приём','Pregled'),'/obo-mne':_fnL('Обо мне','O meni'),'/o-zrenii':_fnL('О зрении','O vidu'),
    '/kontakty':_fnL('Контакты','Kontakt'),'/akcii':_fnL('Акции','Akcije')};
  if(m[p]) return m[p];
  if(/^\/articles\//.test(p)) return _fnL('Статья: ','Članak: ')+p.replace('/articles/','');
  return p||'—';
}
const _fnPct = (a,b) => b ? Math.round(a*100/b)+'%' : '—';
const _fnEsc = s => String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Горизонтальные полосы (одна величина, один цвет; подпись и число — текстовым цветом)
function _fnBars(items, opts){
  opts=opts||{};
  const max=Math.max(1,...items.map(i=>+i.v||0));
  if(!items.length) return `<div style="color:var(--text-m);font-size:13px;padding:8px 0">${t('no_data')}</div>`;
  return `<div class="fn-bars">${items.map(i=>`
    <div class="fn-bar-row" title="${_fnEsc(i.tip||(i.label+': '+i.v))}">
      <div class="fn-bar-label">${_fnEsc(i.label)}</div>
      <div class="fn-bar-track"><div class="fn-bar" style="width:${i.w!=null?i.w:Math.max(i.v?2:0,i.v*100/max)}%"></div></div>
      <div class="fn-bar-val">${i.v}${i.sub?`<span class="fn-bar-sub">${_fnEsc(i.sub)}</span>`:''}</div>
    </div>`).join('')}</div>`;
}

// Вертикальные столбики по неделям/дням
function _fnColumns(cols){
  const max=Math.max(1,...cols.map(c=>c.v));
  return `<div class="fn-cols">${cols.map(c=>`
    <div class="fn-col" title="${_fnEsc(c.tip)}">
      <div class="fn-col-v">${c.v||''}</div>
      <div class="fn-col-track"><div class="fn-col-bar" style="height:${c.v?Math.max(3,c.v*100/max):0}%"></div></div>
      <div class="fn-col-l">${_fnEsc(c.label)}</div>
    </div>`).join('')}</div>`;
}

function _fnCss(){
  if(document.getElementById('fn-css')) return;
  const st=document.createElement('style'); st.id='fn-css';
  st.textContent=`
  .fn-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
  @media(max-width:900px){.fn-grid{grid-template-columns:1fr}}
  .fn-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:18px 20px}
  .fn-card h3{font-size:15px;font-weight:700;margin:0 0 4px}
  .fn-card .fn-hint{font-size:12px;color:var(--text-m);margin-bottom:14px}
  .fn-bars{display:flex;flex-direction:column;gap:8px}
  .fn-bar-row{display:grid;grid-template-columns:minmax(110px,38%) 1fr 92px;align-items:center;gap:10px;font-size:13px;padding:2px 0;border-radius:6px}
  .fn-bar-row:hover{background:var(--surface2)}
  .fn-bar-label{color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fn-bar-track{height:14px;background:transparent}
  .fn-bar{height:14px;background:var(--primary);border-radius:0 4px 4px 0;min-width:0}
  .fn-bar-row:hover .fn-bar{background:var(--primary-h)}
  .fn-bar-val{font-weight:700;color:var(--text);text-align:right;font-variant-numeric:tabular-nums}
  .fn-bar-sub{font-weight:400;color:var(--text-m);margin-left:6px;font-size:12px}
  .fn-cols{display:flex;align-items:flex-end;gap:4px;height:180px;padding-top:8px}
  .fn-col{flex:1;display:flex;flex-direction:column;align-items:center;height:100%;min-width:0;border-radius:6px}
  .fn-col:hover{background:var(--surface2)}
  .fn-col-v{font-size:11px;color:var(--text-m);height:16px;font-variant-numeric:tabular-nums}
  .fn-col-track{flex:1;width:100%;display:flex;align-items:flex-end;justify-content:center;border-bottom:1px solid var(--border)}
  .fn-col-bar{width:70%;max-width:28px;background:var(--primary);border-radius:4px 4px 0 0}
  .fn-col-l{font-size:10.5px;color:var(--text-m);margin-top:4px;white-space:nowrap}
  .fn-funnel .fn-bar-row{grid-template-columns:minmax(150px,40%) 1fr 110px}
  .fn-period{display:flex;gap:6px;flex-wrap:wrap}
  .fn-period button{border:1px solid var(--border);background:var(--surface);border-radius:8px;padding:6px 12px;font-size:13px;cursor:pointer;color:var(--text)}
  .fn-period button.on{background:var(--primary);border-color:var(--primary);color:#fff}
  .fn-table{width:100%;border-collapse:collapse;font-size:13px}
  .fn-table th{text-align:left;font-size:12px;color:var(--text-m);font-weight:600;padding:6px 8px;border-bottom:1px solid var(--border)}
  .fn-table td{padding:7px 8px;border-bottom:1px solid var(--surface2)}
  .fn-table td.n{text-align:right;font-variant-numeric:tabular-nums}
  .fn-table th.n{text-align:right}
  .fn-note{font-size:12px;color:var(--text-m);margin-top:6px}
  @media(max-width:700px){.stats-grid.fn-kpi{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.appendChild(st);
}

function fnSetPeriod(d){ _fnDays=d; renderFunnel(); }

async function _fnFetchAll(table, cols, sinceIso){
  let out=[], from=0; const step=1000;
  for(let i=0;i<20;i++){
    const {data,error}=await db.from(table).select(cols).gte('created_at',sinceIso).order('created_at',{ascending:true}).range(from,from+step-1);
    if(error) return {error};
    out=out.concat(data||[]);
    if(!data||data.length<step) break;
    from+=step;
  }
  return {data:out};
}

async function renderFunnel(){
  _fnCss();
  const title=_fnL('Аналитика записи','Analitika zakazivanja');
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>${title}</h1></div><div class="content"><div class="spinner">${t('loading')}</div></div>`;

  const since=new Date(); since.setHours(0,0,0,0); since.setDate(since.getDate()-(_fnDays-1));
  const sinceIso=since.toISOString();
  const [bl, se] = await Promise.all([
    _fnFetchAll('booking_log','created_at,session_id,visitor_id,event,type_id,slot_date,source,from_page,device',sinceIso),
    _fnFetchAll('site_events','created_at,session_id,visitor_id,event,page,source,device',sinceIso)
  ]);
  if(bl.error){
    document.getElementById('content').innerHTML=`<div class="topbar"><h1>${title}</h1></div><div class="content"><div class="card" style="padding:20px;color:var(--red)">${_fnEsc(bl.error.message||'error')}</div></div>`;
    return;
  }
  const rows=bl.data||[], site=se.data||[];

  // ── Сессии онлайн-записи ──
  const S={};
  rows.forEach(r=>{
    const s=S[r.session_id]||(S[r.session_id]={ev:new Set(),start:r.created_at,visitor:r.visitor_id,source:null,device:null,from_page:null,type_id:null,slot_date:null,success_at:null});
    s.ev.add(r.event);
    if(r.created_at<s.start) s.start=r.created_at;
    if(r.source) s.source=r.source;
    if(r.device) s.device=r.device;
    if(r.from_page) s.from_page=r.from_page;
    if(r.type_id) s.type_id=r.type_id;
    if(r.slot_date) s.slot_date=r.slot_date;
    if(r.event==='success'&&!s.success_at) s.success_at=r.created_at;
  });
  const sess=Object.values(S);
  const ORDER=['started','chose_type','chose_slot','reached_form','submit_attempt','success'];
  const lvl=s=>{ let m=0; ORDER.forEach((e,i)=>{ if(s.ev.has(e)) m=i; }); return m; };
  sess.forEach(s=>s.lvl=lvl(s));
  const nOpen=sess.length;
  const nOk=sess.filter(s=>s.ev.has('success')).length;
  const tracked=sess.filter(s=>s.start.slice(0,10)>=FN_TRACK_START);

  // ── Сайт ──
  const views=site.filter(e=>e.event==='view');
  const siteVisitors=new Set(views.map(e=>e.visitor_id).filter(Boolean)).size;
  const siteSessions=new Set(views.map(e=>e.session_id).filter(Boolean)).size;
  const clicks=site.filter(e=>e.event==='booking_click');
  const clickSessions=new Set(clicks.map(e=>e.session_id)).size;
  const tgClicks=site.filter(e=>e.event==='tg_click').length;
  const fromSite=sess.filter(s=>s.source==='optometrist.rs');
  const fromSiteOk=fromSite.filter(s=>s.ev.has('success')).length;

  // ── KPI ──
  const kpi=`<div class="stats-grid fn-kpi" style="margin-bottom:16px">
    <div class="stat-card"><div class="stat-label">${_fnL('Посетители сайта','Posetioci sajta')}</div><div class="stat-value">${siteVisitors}</div></div>
    <div class="stat-card"><div class="stat-label">${_fnL('Открыли запись','Otvorili zakazivanje')}</div><div class="stat-value">${nOpen}</div></div>
    <div class="stat-card stat-green"><div class="stat-label">${_fnL('Записались онлайн','Zakazali online')}</div><div class="stat-value">${nOk}</div></div>
    <div class="stat-card stat-accent"><div class="stat-label">${_fnL('Конверсия записи','Konverzija')}</div><div class="stat-value">${_fnPct(nOk,nOpen)}</div></div>
    <div class="stat-card"><div class="stat-label">${_fnL('Клики в Telegram с сайта','Klikovi na Telegram')}</div><div class="stat-value">${tgClicks}</div></div>
  </div>`;

  // ── Воронка онлайн-записи ──
  const stepNames={
    started:_fnL('Открыли страницу записи','Otvorili stranicu'),
    chose_type:_fnL('Выбрали вид приёма','Izabrali vrstu pregleda'),
    chose_slot:_fnL('Выбрали дату и время','Izabrali termin'),
    reached_form:_fnL('Открыли анкету','Otvorili upitnik'),
    submit_attempt:_fnL('Нажали «Записаться»','Kliknuli „Zakaži“'),
    success:_fnL('Запись создана','Termin zakazan')
  };
  // Шаги 2–3 существуют только с FN_TRACK_START — для них база = отслеживаемые сессии
  const funnelItems=ORDER.map((e,i)=>{
    const base=(e==='chose_type'||e==='chose_slot')?tracked:sess;
    const baseOpen=base.length;
    const n=base.filter(s=>s.lvl>=i).length;
    if(base!==sess&&baseOpen<10) return {label:stepNames[e], v:'…', w:0, sub:_fnL('копится','prikuplja se'), tip:_fnL('Данные собираются с 10.11.2026','Podaci od 10.11.2026')};
    return {label:stepNames[e], v:n, w:baseOpen?Math.max(n?2:0,n*100/baseOpen):0, sub:_fnPct(n,baseOpen), tip:`${stepNames[e]}: ${n} (${_fnPct(n,baseOpen)} ${_fnL('от открывших','od otvorenih')})`};
  });
  const partial=tracked.length<sess.length;

  // Где уходят (последний шаг у тех, кто не записался)
  const lost=sess.filter(s=>!s.ev.has('success'));
  const dropItems=ORDER.slice(0,5).map((e,i)=>({label:stepNames[e],v:lost.filter(s=>s.lvl===i).length}))
    .map(x=>({...x,sub:_fnPct(x.v,lost.length)}));

  // ── По неделям / дням ──
  const byWeek=_fnDays>31;
  const ld=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const keyOf=x=>{ const d=new Date(x); d.setHours(0,0,0,0); if(byWeek) d.setDate(d.getDate()-((d.getDay()+6)%7)); return ld(d); };
  const buckets=[]; const idx={};
  const d0=new Date(since); if(byWeek) d0.setDate(d0.getDate()-((d0.getDay()+6)%7));
  for(let d=new Date(d0); d<=new Date(); d.setDate(d.getDate()+(byWeek?7:1))){
    const k=ld(d); idx[k]=buckets.length;
    buckets.push({k,label:String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0'),ok:0,open:0});
  }
  sess.forEach(s=>{ const k=keyOf(s.start); if(idx[k]!=null){ buckets[idx[k]].open++; if(s.success_at) buckets[idx[k]].ok++; } });
  const every=Math.ceil(buckets.length/16);
  const cols=buckets.map((b,i)=>({v:b.ok,label:(buckets.length-1-i)%every?'':b.label,tip:`${byWeek?_fnL('Неделя с ','Nedelja od '):''}${b.label}: ${b.ok} ${_fnL('записей','zakazivanja')}, ${b.open} ${_fnL('открытий','otvaranja')} (${_fnPct(b.ok,b.open)})`}));

  // ── Источники ──
  const srcMap={};
  sess.forEach(s=>{ const k=s.source||''; const m=srcMap[k]||(srcMap[k]={open:0,ok:0}); m.open++; if(s.success_at) m.ok++; });
  const srcRows=Object.entries(srcMap).sort((a,b)=>b[1].ok-a[1].ok||b[1].open-a[1].open)
    .map(([k,m])=>`<tr><td>${_fnEsc(_fnSrcLabel(k))}</td><td class="n">${m.open}</td><td class="n">${m.ok}</td><td class="n">${_fnPct(m.ok,m.open)}</td></tr>`).join('');

  const siteSrc={};
  const firstView={}; views.forEach(v=>{ if(!firstView[v.session_id]) firstView[v.session_id]=v; });
  Object.values(firstView).forEach(v=>{ const k=v.source||'direct'; siteSrc[k]=(siteSrc[k]||0)+1; });
  const siteSrcItems=Object.entries(siteSrc).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:_fnSrcLabel(k),v,sub:_fnPct(v,siteSessions)}));

  // ── Страницы сайта ──
  const pg={};
  views.forEach(v=>{ const m=pg[v.page]||(pg[v.page]={v:0,c:0}); m.v++; });
  clicks.forEach(c=>{ const m=pg[c.page]||(pg[c.page]={v:0,c:0}); m.c++; });
  const pageRows=Object.entries(pg).sort((a,b)=>b[1].v-a[1].v).slice(0,15)
    .map(([p,m])=>`<tr><td>${_fnEsc(_fnPageLabel(p))}</td><td class="n">${m.v}</td><td class="n">${m.c}</td><td class="n">${_fnPct(m.c,m.v)}</td></tr>`).join('');

  // ── Вид приёма, устройства, срок, дни недели ──
  const okS=sess.filter(s=>s.success_at);
  const tp={}; okS.forEach(s=>{ const k=s.type_id||'—'; tp[k]=(tp[k]||0)+1; });
  const typeItems=Object.entries(tp).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({label:(FN_TYPES[k]||{})[_lang==='sr'?'sr':'ru']||k,v,sub:_fnPct(v,okS.length)}));

  const dv={}; tracked.forEach(s=>{ const k=s.device||'—'; const m=dv[k]||(dv[k]={open:0,ok:0}); m.open++; if(s.success_at)m.ok++; });
  const devName={mobile:_fnL('Телефон','Telefon'),desktop:_fnL('Компьютер','Računar'),tablet:_fnL('Планшет','Tablet')};
  const devItems=Object.entries(dv).sort((a,b)=>b[1].open-a[1].open).map(([k,m])=>({label:devName[k]||k,v:m.open,sub:'→ '+m.ok,tip:`${devName[k]||k}: ${m.open} ${_fnL('открытий','otvaranja')}, ${m.ok} ${_fnL('записей','zakazivanja')}`}));

  const lead={0:0,1:0,2:0,3:0}; const leadL=[_fnL('На сегодня','Za danas'),_fnL('1–2 дня','1–2 dana'),_fnL('3–7 дней','3–7 dana'),_fnL('Больше недели','Više od nedelju')];
  okS.forEach(s=>{ if(!s.slot_date) return; const a=new Date(s.success_at); a.setHours(0,0,0,0); const b=new Date(s.slot_date+'T00:00:00'); const d=Math.round((b-a)/864e5); lead[d<=0?0:d<=2?1:d<=7?2:3]++; });
  const leadItems=[0,1,2,3].map(i=>({label:leadL[i],v:lead[i],sub:_fnPct(lead[i],okS.length)}));

  const wdN=_lang==='sr'?['Pon','Uto','Sre','Čet','Pet','Sub','Ned']:['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const wd=[0,0,0,0,0,0,0]; okS.forEach(s=>{ wd[(new Date(s.success_at).getDay()+6)%7]++; });
  const hr=[_fnL('Ночь 0–7','Noć 0–7'),_fnL('Утро 7–12','Jutro 7–12'),_fnL('День 12–18','Dan 12–18'),_fnL('Вечер 18–24','Veče 18–24')];
  const hc=[0,0,0,0]; okS.forEach(s=>{ const h=new Date(s.success_at).getHours(); hc[h<7?0:h<12?1:h<18?2:3]++; });

  const nRet=(()=>{ const byV={}; sess.forEach(s=>{ if(s.visitor) byV[s.visitor]=(byV[s.visitor]||0)+1; }); return Object.values(byV).filter(n=>n>1).length; })();

  const periodBtns=[7,30,90,365].map(d=>`<button class="${_fnDays===d?'on':''}" onclick="fnSetPeriod(${d})">${d===365?_fnL('Год','Godina'):d+' '+_fnL('дн.','d.')}</button>`).join('');

  document.getElementById('content').innerHTML=`
<div class="topbar"><h1>${title}</h1><div class="topbar-actions"><div class="fn-period">${periodBtns}</div></div></div>
<div class="content">
  ${kpi}
  <div class="fn-grid">
    <div class="fn-card fn-funnel">
      <h3>${_fnL('Воронка онлайн-записи','Levak online zakazivanja')}</h3>
      <div class="fn-hint">${_fnL('Сколько человек дошли до каждого шага, % — от открывших страницу','Koliko ljudi je stiglo do svakog koraka, % od onih koji su otvorili stranicu')}</div>
      ${_fnBars(funnelItems)}
      ${partial?`<div class="fn-note">${_fnL('Шаги «вид приёма» и «дата и время» считаются с 10.11.2026.','Koraci „vrsta“ i „termin“ se prate od 10.11.2026.')}</div>`:''}
    </div>
    <div class="fn-card">
      <h3>${_fnL('Где уходят','Gde odustaju')}</h3>
      <div class="fn-hint">${_fnL('Последний шаг у тех, кто не записался','Poslednji korak kod onih koji nisu zakazali')} (${lost.length})</div>
      ${_fnBars(dropItems)}
      <div class="fn-note">${_fnL('Вернулись к записи повторно','Vratili se ponovo')}: ${nRet} ${_fnL('чел.','os.')}</div>
    </div>
  </div>

  <div class="fn-card" style="margin-bottom:16px">
    <h3>${_fnL('Онлайн-записи','Online zakazivanja')} ${byWeek?_fnL('по неделям','po nedeljama'):_fnL('по дням','po danima')}</h3>
    <div class="fn-hint">${_fnL('Наведите на столбик — там же число открытий и конверсия','Pređite mišem preko stuba za broj otvaranja i konverziju')}</div>
    ${_fnColumns(cols)}
  </div>

  <div class="fn-grid">
    <div class="fn-card">
      <h3>${_fnL('Откуда приходят на запись','Odakle dolaze na zakazivanje')}</h3>
      <div class="fn-hint">${_fnL('По открытиям страницы записи','Po otvaranjima stranice za zakazivanje')}</div>
      <table class="fn-table"><thead><tr><th>${_fnL('Источник','Izvor')}</th><th class="n">${_fnL('Открыли','Otvorili')}</th><th class="n">${_fnL('Записались','Zakazali')}</th><th class="n">%</th></tr></thead><tbody>${srcRows||`<tr><td colspan="4">${t('no_data')}</td></tr>`}</tbody></table>
    </div>
    <div class="fn-card">
      <h3>${_fnL('Сайт optometrist.rs','Sajt optometrist.rs')}</h3>
      <div class="fn-hint">${siteSessions} ${_fnL('визитов','poseta')} · ${clickSessions} ${_fnL('нажали «Записаться»','kliknulo „Zakaži“')} (${_fnPct(clickSessions,siteSessions)}) · ${fromSiteOk} ${_fnL('записались','zakazalo')}</div>
      ${_fnBars(siteSrcItems)}
    </div>
  </div>

  <div class="fn-card" style="margin-bottom:16px">
    <h3>${_fnL('Страницы сайта','Stranice sajta')}</h3>
    <div class="fn-hint">${_fnL('Какие страницы смотрят и с каких чаще идут на запись','Koje stranice gledaju i sa kojih najčešće idu na zakazivanje')}</div>
    <table class="fn-table"><thead><tr><th>${_fnL('Страница','Stranica')}</th><th class="n">${_fnL('Просмотры','Pregledi')}</th><th class="n">${_fnL('Клики «Записаться»','Klikovi „Zakaži“')}</th><th class="n">%</th></tr></thead><tbody>${pageRows||`<tr><td colspan="4">${_fnL('Данные сайта собираются с 10.11.2026','Podaci sajta se prikupljaju od 10.11.2026')}</td></tr>`}</tbody></table>
  </div>

  <div class="fn-grid">
    <div class="fn-card"><h3>${_fnL('На что записываются','Na šta se zakazuju')}</h3><div class="fn-hint">${_fnL('Успешные записи по виду приёма','Uspešna zakazivanja po vrsti')}</div>${_fnBars(typeItems)}</div>
    <div class="fn-card"><h3>${_fnL('За сколько дней записываются','Koliko dana unapred')}</h3><div class="fn-hint">${_fnL('От момента записи до приёма','Od zakazivanja do pregleda')}</div>${_fnBars(leadItems)}</div>
    <div class="fn-card"><h3>${_fnL('Когда записываются','Kada se zakazuju')}</h3><div class="fn-hint">${_fnL('День недели и время суток, когда оформили запись','Dan i doba dana kada su zakazali')}</div>
      ${_fnBars(wdN.map((n,i)=>({label:n,v:wd[i]})))}<div style="height:12px"></div>${_fnBars(hr.map((n,i)=>({label:n,v:hc[i]})))}</div>
    <div class="fn-card"><h3>${_fnL('Устройства','Uređaji')}</h3><div class="fn-hint">${_fnL('Открытия записи и записи по устройствам (с 10.11.2026)','Otvaranja i zakazivanja po uređaju (od 10.11.2026)')}</div>${_fnBars(devItems)}</div>
  </div>
  <div class="fn-note">${_fnL('Подробная статистика посещений (страны, браузеры): Cloudflare → Web analytics → optometrist.rs.','Detaljna statistika poseta: Cloudflare → Web analytics → optometrist.rs.')}</div>
</div>`;
}
