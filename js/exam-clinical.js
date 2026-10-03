// ═══ РАСШИРЕННАЯ КАРТА ОБСЛЕДОВАНИЯ ═══
// Подключается после exam-intake.js, до print.js.
// Все клинические тесты сверх базовой рефракции хранятся в одном JSONB-поле
// examinations.clinical (ключ → строка). Так новые тесты добавляются без миграций:
// достаточно дописать строку в CLIN_SECTIONS — поле появится в карте и в печати.
// examinations.express_pregled (boolean) — галочка «Экспресс-преглед».
//
// Типы строк:
//   eye   — OD / OS (+ OU, если ou:true) × колонки cols
//   dn    — Даль / Близь × колонки cols (по умолчанию одна колонка)
//   text  — одно поле
//   sel   — выпадающий список (opts)
//   area  — многострочный текст
// Ключ значения: <row.k>_<строка>_<колонка>, например kera_od_r1, cover_d, wort_n.

const CLIN_SECTIONS = {
  // ── вкладка «Рефрактометрия» ──
  kera: {
    tab: 'refr', title: 'Кератометрия', sr: 'Keratometrija',
    rows: [
      { k:'kera', type:'eye', cols:[
        {k:'r1', l:'R1 мм / D', ph:'7.80'},
        {k:'r2', l:'R2 мм / D', ph:'7.65'},
        {k:'ax', l:'Ax R1', ph:'180'},
        {k:'hvid', l:'HVID мм', ph:'11.8'} ] },
    ]
  },
  // ── вкладка «Обследование» (субъективная рефракция) ──
  subj: {
    tab: 'exam', title: 'Субъективная рефракция — дополнительно', sr: 'Subjektivna refrakcija — dodatno',
    rows: [
      { k:'near_va', type:'eye', ou:true, l:'Visus вблизи (40 см)', lsr:'Visus na blizinu (40 cm)', cols:[
        {k:'wo', l:'без корр.', ph:'0.8'},
        {k:'wi', l:'с корр.', ph:'1.0'} ] },
      { k:'duo', type:'eye', l:'Дуохром-тест', lsr:'Duohrom test', cols:[
        {k:'v', l:'результат', opts:['','равно','красный ярче','зелёный ярче']} ] },
      { k:'dominant', type:'sel', l:'Ведущий глаз', lsr:'Dominantno oko', opts:['','OD','OS','не определён'] },
      { k:'balance', type:'text', l:'Бинокулярный баланс', lsr:'Binokularni balans', ph:'выполнен, уравнен призмами Грефе' },
      { k:'fog', type:'text', l:'Туманирование / кросс-цилиндр', lsr:'Zamagljivanje / krosscilindar', ph:'+0.75 туман, Cyl уточнён КЦ ±0.25' },
      { k:'trial', type:'text', l:'Пробная оправа (комфорт)', lsr:'Probni okvir (komfor)', ph:'комфортно, 15 мин' },
    ]
  },
  // ── вкладка «Бинокулярное зрение» ──
  bino: {
    tab: 'bino', title: 'Бинокулярное зрение', sr: 'Binokularni vid',
    rows: [
      { k:'cover', type:'dn', l:'Cover test', lsr:'Cover test', cols:[{k:'v', l:'', ph:'орто / экзо 4Δ'}] },
      { k:'phoria', type:'dn', l:'Гетерофория (Мэддокс / Торингтон), Δ', lsr:'Heteroforija, Δ', cols:[
        {k:'h', l:'горизонт.', ph:'2 экзо'},
        {k:'v', l:'вертик.', ph:'орто'} ] },
      { k:'wort', type:'dn', l:'Тест Ворса', lsr:'Vorsov test', cols:[
        {k:'v', l:'', opts:['','бинокулярное (4)','одновременное (5)','подавление OD (3 зел.)','подавление OS (2 крас.)']} ] },
      { k:'fus_bo', type:'dn', l:'Фузионные резервы BO (размыт./разрыв/восст.)', lsr:'Fuzione rezerve BO', cols:[{k:'v', l:'', ph:'9 / 19 / 10'}] },
      { k:'fus_bi', type:'dn', l:'Фузионные резервы BI (размыт./разрыв/восст.)', lsr:'Fuzione rezerve BI', cols:[{k:'v', l:'', ph:'x / 7 / 4'}] },
      { k:'npc', type:'text', l:'БТК (ближ. точка конвергенции), см — разрыв / восст.', lsr:'Bliska tačka konvergencije, cm', ph:'6 / 9' },
      { k:'stereo', type:'text', l:'Стереозрение (″ дуги)', lsr:'Stereo vid (″)', ph:'60″ (Titmus)' },
      { k:'motility', type:'text', l:'Моторика глаз', lsr:'Motilitet', ph:'в полном объёме' },
      { k:'pupils', type:'text', l:'Зрачки / реакция на свет', lsr:'Zenice / reakcija na svetlo', ph:'D=S, живые' },
    ]
  },
  accom: {
    tab: 'bino', title: 'Аккомодация', sr: 'Akomodacija',
    rows: [
      { k:'acc', type:'eye', ou:true, l:'', cols:[
        {k:'amp', l:'Объём, D (push-up)', ph:'8.0'},
        {k:'flip', l:'Гибкость ±2.00, цикл/мин', ph:'11'},
        {k:'lag', l:'Lag (MEM / КЦ), D', ph:'+0.50'} ] },
      { k:'nra', type:'text', l:'ООА — отрицательный запас (+)', lsr:'NRA (+)', ph:'+2.50' },
      { k:'pra', type:'text', l:'ПОА — положительный запас (−)', lsr:'PRA (−)', ph:'−3.00' },
      { k:'aca', type:'text', l:'AC/A', lsr:'AC/A', ph:'4/1' },
    ]
  },
  extra: {
    tab: 'bino', title: 'Дополнительные исследования', sr: 'Dodatna ispitivanja',
    rows: [
      { k:'color', type:'text', l:'Цветоощущение', lsr:'Raspoznavanje boja', ph:'Ishihara 17/17, норма' },
      { k:'amsler', type:'eye', l:'Сетка Амслера', lsr:'Amslerova mreža', cols:[{k:'v', l:'', ph:'норма'}] },
      { k:'contrast', type:'text', l:'Контрастная чувствительность', lsr:'Kontrastna osetljivost', ph:'норма' },
      { k:'tear', type:'text', l:'Слёзная плёнка / сухость (OSDI, NIBUT)', lsr:'Suzni film (OSDI, NIBUT)', ph:'OSDI 18, NIBUT 8 с' },
      { k:'bino_concl', type:'area', l:'Заключение по бинокулярным функциям', lsr:'Zaključak o binokularnim funkcijama', ph:'Напр.: недостаточность конвергенции, экзофория вблизи 8Δ…' },
    ]
  },
};

const _CLIN_EYES = { od:'OD', os:'OS', ou:'OU' };
const _CLIN_DN = { d:'Даль', n:'Близь' };
const _CLIN_DN_SR = { d:'Daljina', n:'Blizina' };

function _ce(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }
function _cid(key){ return 'cl-'+key.replace(/_/g,'-'); }

// Поле ввода / селект для одной ячейки
function _clinInput(key, col, c){
  const val = c[key] || '';
  if (col.opts) {
    const opts = col.opts.includes(val) || !val ? col.opts : col.opts.concat([val]);
    return `<select id="${_cid(key)}" data-clin="${key}" onchange="_modalDirty=true">${opts.map(o=>`<option value="${_ce(o)}" ${o===val?'selected':''}>${o?_ce(o):'—'}</option>`).join('')}</select>`;
  }
  return `<input id="${_cid(key)}" data-clin="${key}" value="${_ce(val)}" placeholder="${_ce(col.ph||'')}" oninput="_modalDirty=true">`;
}

function _clinRowHtml(row, c){
  if (row.type === 'eye' || row.type === 'dn') {
    const lines = row.type === 'eye' ? ['od','os'].concat(row.ou?['ou']:[]) : ['d','n'];
    const names = row.type === 'eye' ? _CLIN_EYES : _CLIN_DN;
    const showHead = row.cols.some(cl=>cl.l);
    return `<div class="clin-row">
      ${row.l?`<div class="clin-label">${row.l}</div>`:''}
      <table class="rx-table clin-table">
        ${showHead?`<tr><th></th>${row.cols.map(cl=>`<th>${cl.l}</th>`).join('')}</tr>`:''}
        ${lines.map(ln=>`<tr><td>${names[ln]}</td>${row.cols.map(cl=>`<td>${_clinInput(row.k+'_'+ln+'_'+cl.k, cl, c)}</td>`).join('')}</tr>`).join('')}
      </table>
    </div>`;
  }
  if (row.type === 'sel') {
    return `<div class="form-group"><label>${row.l}</label>${_clinInput(row.k, {opts:row.opts}, c)}</div>`;
  }
  if (row.type === 'area') {
    return `<div class="form-group full"><label>${row.l}</label><textarea id="${_cid(row.k)}" data-clin="${row.k}" placeholder="${_ce(row.ph||'')}" oninput="_modalDirty=true" style="min-height:70px">${_ce(c[row.k]||'')}</textarea></div>`;
  }
  return `<div class="form-group"><label>${row.l}</label>${_clinInput(row.k, {ph:row.ph}, c)}</div>`;
}

// HTML секции для вкладки. Таблицы — на всю ширину, одиночные поля — сеткой в 2 колонки.
function _clinSectionHtml(secKey, e){
  const sec = CLIN_SECTIONS[secKey];
  const c = (e && e.clinical) || {};
  const tables = sec.rows.filter(r=>r.type==='eye'||r.type==='dn');
  const singles = sec.rows.filter(r=>!(r.type==='eye'||r.type==='dn'));
  return `<div class="rx-section">
    <div class="rx-section-title">${sec.title}</div>
    ${tables.length?`<div class="clin-tables">${tables.map(r=>_clinRowHtml(r,c)).join('')}</div>`:''}
    ${singles.length?`<div class="form-grid" style="margin-top:${tables.length?'14px':'0'}">${singles.map(r=>_clinRowHtml(r,c)).join('')}</div>`:''}
  </div>`;
}
function _clinTabHtml(tab, e){
  return Object.keys(CLIN_SECTIONS).filter(k=>CLIN_SECTIONS[k].tab===tab).map(k=>_clinSectionHtml(k,e)).join('');
}

// Сбор значений из формы. Пустые ключи не сохраняем.
function _clinCollect(prev){
  const out = {};
  // Сохраняем ключи, которых нет в текущей форме (на случай будущих/удалённых полей)
  if (prev && typeof prev === 'object') Object.keys(prev).forEach(k=>{ if(!document.querySelector('[data-clin="'+k+'"]') && prev[k]) out[k]=prev[k]; });
  document.querySelectorAll('#modal-container [data-clin]').forEach(el=>{
    const val = (el.value||'').trim();
    if (val) out[el.dataset.clin] = val;
  });
  return out;
}

// Есть ли данные на вкладке (для точки-индикатора на вкладке)
function _clinTabHasData(tab, e){
  const c = (e && e.clinical) || {};
  const keys = Object.keys(c).filter(k=>c[k]);
  return Object.keys(CLIN_SECTIONS).filter(s=>CLIN_SECTIONS[s].tab===tab)
    .some(s=>CLIN_SECTIONS[s].rows.some(r=>keys.some(k=>k===r.k||k.startsWith(r.k+'_'))));
}

// ── ПЕЧАТЬ: только заполненные поля ──
function _clinPrintHtml(e, onlyKeys){
  const c = (e && e.clinical) || {};
  const has = k => !!(c[k] && String(c[k]).trim());
  if (!Object.keys(c).some(has)) return '';
  const esc = (typeof _pe === 'function') ? _pe : _ce;
  const out = [];
  (onlyKeys || Object.keys(CLIN_SECTIONS)).forEach(sk=>{
    const sec = CLIN_SECTIONS[sk];
    if (!sec) return;
    const parts = [];
    const kv = [];
    sec.rows.forEach(row=>{
      if (row.type === 'eye' || row.type === 'dn') {
        const lines = row.type === 'eye' ? ['od','os'].concat(row.ou?['ou']:[]) : ['d','n'];
        const names = row.type === 'eye' ? _CLIN_EYES : _CLIN_DN_SR;
        const cols = row.cols.filter(cl=>lines.some(ln=>has(row.k+'_'+ln+'_'+cl.k)));
        const rows = lines.filter(ln=>cols.some(cl=>has(row.k+'_'+ln+'_'+cl.k)));
        if (!cols.length) return;
        // Одна колонка без заголовка → компактная строка «Daljina: … · Blizina: …»
        if (cols.length === 1 && !cols[0].l) {
          kv.push({ l: row.lsr || row.l, ru: row.lsr ? row.l : '', v: rows.map(ln=>`${names[ln]}: ${esc(c[row.k+'_'+ln+'_'+cols[0].k])}`).join(' · ') });
          return;
        }
        parts.push(`<div class="pc-sub">
          ${row.l||row.lsr?`<div class="pc-sub-title">${esc(row.lsr||row.l)}${row.lsr&&row.l?` <span class="pc-ru">· ${esc(row.l)}</span>`:''}</div>`:''}
          <table class="pc-table" style="width:${32+cols.length*90}pt">
            <colgroup><col class="c-eye">${cols.map(()=>'<col style="width:90pt">').join('')}</colgroup>
            <tr><th></th>${cols.map(cl=>`<th>${esc(cl.l)}</th>`).join('')}</tr>
            ${rows.map(ln=>`<tr><td class="eye">${names[ln]}</td>${cols.map(cl=>`<td>${esc(c[row.k+'_'+ln+'_'+cl.k]||'')}</td>`).join('')}</tr>`).join('')}
          </table>
        </div>`);
        return;
      }
      if (!has(row.k)) return;
      kv.push({ l: row.lsr || row.l, ru: row.lsr ? row.l : '', v: esc(c[row.k]), area: row.type==='area' });
    });
    if (!parts.length && !kv.length) return;
    const kvHtml = kv.length ? `<table class="pc-info pc-clin">${kv.map(i=>`<tr><td>${esc(i.l)}${i.ru?`<div class="pc-ru" style="font-size:7.5pt">${esc(i.ru)}</div>`:''}</td><td${i.area?' style="white-space:pre-line"':''}>${i.v}</td></tr>`).join('')}</table>` : '';
    out.push(`<div class="pc-sec">${(typeof _pcLabel==='function')?_pcLabel(sec.sr, sec.title):`<div class="pc-sec-label">${sec.sr}</div>`}${parts.join('')}${kvHtml}</div>`);
  });
  return out.join('');
}

// ── ЭРГОНОМИКА: перенос значений между блоками ──
function _num(s){
  if (s==null) return NaN;
  const t = String(s).replace(/[−–]/g,'-').replace(',','.').replace(/[^0-9.+\-]/g,'');
  return t===''||t==='-'||t==='+' ? NaN : parseFloat(t);
}
function _fmtD(n){
  if (isNaN(n)) return '';
  const r = Math.round(n*4)/4;
  if (r === 0) return '0.00';
  return (r>0?'+':'-')+Math.abs(r).toFixed(2);
}
function _setVal(id, val){ const el=document.getElementById(id); if(el && val!==undefined && val!==null){ el.value=val; _modalDirty=true; el.classList.add('clin-flash'); setTimeout(()=>el.classList.remove('clin-flash'),700);} }
function _getVal(id){ const el=document.getElementById(id); return el ? el.value.trim() : ''; }

// Авторефрактометрия → стартовые значения субъективной рефракции (только пустые поля)
function clinCopyAutorefToExam(){
  [['od'],['os']].forEach(([eye])=>{
    [['sph','cs'],['cyl','cyl'],['ax','ax']].forEach(([from,to])=>{
      const src=_getVal(`r-${eye}-${from}`), dst=`x-${eye}-${to}`;
      if (src && !_getVal(dst)) _setVal(dst, src);
    });
  });
  toast('Авторефрактометрия перенесена в пустые поля','info');
}
// Результаты обследования → очки для дали
function clinCopyExamToFar(){
  ['od','os'].forEach(eye=>{
    _setVal(`rf-${eye}-sph`, _getVal(`x-${eye}-cs`));
    _setVal(`rf-${eye}-cyl`, _getVal(`x-${eye}-cyl`));
    _setVal(`rf-${eye}-ax`,  _getVal(`x-${eye}-ax`));
    _setVal(`rf-${eye}-prism`, _getVal(`x-${eye}-prism`));
  });
  if (!_getVal('rf-pd') && _getVal('r-pd')) _setVal('rf-pd', _getVal('r-pd'));
  toast('Данные обследования перенесены в «очки для дали»','info');
}
// Очки для дали + ADD → очки для близи
function clinFarPlusAdd(targetPrefix){
  const add = _num(_getVal('rf-add')) || _num(_getVal(targetPrefix==='rc'?'rc-add':'rn-degr'));
  if (isNaN(add)) { toast('Сначала укажите ADD в блоке «для дали»','error'); return; }
  ['od','os'].forEach(eye=>{
    const sph = _num(_getVal(`rf-${eye}-sph`));
    _setVal(`${targetPrefix}-${eye}-sph`, _fmtD((isNaN(sph)?0:sph) + (targetPrefix==='rc' ? add/2 : add)));
    _setVal(`${targetPrefix}-${eye}-cyl`, _getVal(`rf-${eye}-cyl`));
    _setVal(`${targetPrefix}-${eye}-ax`,  _getVal(`rf-${eye}-ax`));
  });
  const pd = _num(_getVal('rf-pd'));
  if (!isNaN(pd) && !_getVal(targetPrefix==='rc'?'rc-pd':'rn-pd')) _setVal(targetPrefix==='rc'?'rc-pd':'rn-pd', String(pd-(targetPrefix==='rc'?2:3)));
  toast(targetPrefix==='rc' ? 'Компьютер = даль + ½ ADD, PD −2 мм (проверьте!)' : 'Близь = даль + ADD, PD −3 мм (проверьте!)','info');
}
// Очки для дали → МКЛ с пересчётом на вертекс 12 мм (по главным меридианам)
function clinFarToCL(){
  const v = 0.012;
  const conv = F => F / (1 - v*F);
  ['od','os'].forEach(eye=>{
    const s = _num(_getVal(`rf-${eye}-sph`));
    if (isNaN(s)) return;
    const c = _num(_getVal(`rf-${eye}-cyl`)) || 0;
    const m1 = conv(s), m2 = conv(s + c);
    _setVal(`rcl-${eye}-sph`, _fmtD(m1));
    _setVal(`rcl-${eye}-cyl`, c ? _fmtD(m2 - m1) : '');
    _setVal(`rcl-${eye}-ax`, c ? _getVal(`rf-${eye}-ax`) : '');
  });
  toast('Пересчёт на вертекс 12 мм выполнен — подберите ближайшие доступные параметры КЛ','info');
}

// ── Нормализация ввода диоптрий при выходе из поля ──
// "-1,25" → "-1.25", "1.5" → "+1.50", "−0.5" → "-0.50". Ось: только 0–180, иначе подсветка.
document.addEventListener('focusout', ev=>{
  const el = ev.target;
  if (!el || !el.dataset || !el.dataset.rx) return;
  const raw = el.value.trim();
  if (!raw) { el.classList.remove('rx-bad'); return; }
  const type = el.dataset.rx;
  if (type === 'sph' || type === 'cyl' || type === 'add' || type === 'degr') {
    if (/^[+\-−–]?\d{1,2}([.,]\d{1,2})?$/.test(raw)) {
      const n = _num(raw);
      el.value = (type==='add'||type==='degr') && n>0 ? Math.abs(Math.round(n*4)/4).toFixed(2) : _fmtD(n);
      if (type==='cyl' && n>0) el.classList.add('rx-bad'); else el.classList.remove('rx-bad');
      if (Math.abs(Math.round(n*4)/4 - n) > 0.001) el.classList.add('rx-bad');
      // Значение изменено программно — сообщаем обработчикам oninput (например, «Используемая коррекция»)
      el.dispatchEvent(new Event('input', {bubbles:true}));
    }
  } else if (type === 'ax') {
    const n = parseInt(raw,10);
    el.classList.toggle('rx-bad', !/^\d{1,3}$/.test(raw) || n<0 || n>180);
  }
}, true);

// Стили модуля
(function(){
  const st = document.createElement('style');
  st.textContent = `
  .clin-tables{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px 18px}
  .clin-row{min-width:0}
  .clin-label{font-size:13px;font-weight:600;color:var(--text-m);margin-bottom:2px}
  .clin-table td:first-child{width:46px}
  .clin-table select{border:none;background:transparent;font-size:15px;width:100%;padding:8px 4px}
  .clin-table th{font-size:12px}
  .rx-bad{background:#fee2e2!important;border-radius:6px}
  .clin-flash{background:#dbeafe!important;transition:background .6s}
  .ex-tools{display:flex;gap:8px;flex-wrap:wrap;margin:-4px 0 10px}
  .ex-tools .btn{font-size:12.5px;padding:5px 10px}
  .ex-express{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:20px;border:1.5px solid var(--border);font-size:13.5px;font-weight:700;cursor:pointer;user-select:none;color:var(--text-m);background:var(--surface)}
  .ex-express input{width:16px;height:16px;margin:0;accent-color:#16a34a}
  .ex-express.on{background:#dcfce7;border-color:#86efac;color:#15803d}
  .tab .tab-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--accent);margin-left:6px;vertical-align:middle}
  @media(max-width:768px){.clin-tables{grid-template-columns:1fr}}
  `;
  document.head.appendChild(st);
})();
