// ═══ TRASH (KORPA) ═══
let _trashData = null;
let _trashQuery = '';

async function renderTrash() {
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>🗑 ${t('nav_trash')||'Korpa'}</h1><div class="topbar-actions"><div class="search-wrap"><input type="text" id="trsearch" placeholder="${t('search')}" oninput="filterTrashUI(this.value)"></div></div></div><div class="content"><div class="spinner">${t('loading')}</div></div>`;

  const [
    {data:patients},
    {data:appts},
    {data:orders},
    {data:exams}
  ] = await Promise.all([
    db.from('patients').select('*').not('deleted_at','is',null).order('deleted_at',{ascending:false}),
    db.from('appointments').select('*,patients(name)').not('deleted_at','is',null).order('deleted_at',{ascending:false}),
    db.from('orders').select('*,patients(name)').not('deleted_at','is',null).order('deleted_at',{ascending:false}),
    db.from('examinations').select('*,patients(name)').not('deleted_at','is',null).order('deleted_at',{ascending:false}),
  ]);

  _trashData = {patients:patients||[], appts:appts||[], orders:orders||[], exams:exams||[]};
  _renderTrashLists();
}
function filterTrashUI(q){ _trashQuery=q; _renderTrashLists(); }

function _renderTrashLists() {
  const q = _trashQuery.trim().toLowerCase();
  const match = name => !q || (name||'').toLowerCase().includes(q);

  const patients = _trashData.patients.filter(p=>match(p.name));
  const appts = _trashData.appts.filter(a=>match(a.patients?.name));
  const orders = _trashData.orders.filter(o=>match(o.patients?.name));
  const exams = _trashData.exams.filter(e=>match(e.patients?.name));

  const rawTotal = _trashData.patients.length+_trashData.appts.length+_trashData.orders.length+_trashData.exams.length;
  const total = patients.length+appts.length+orders.length+exams.length;

  const section = (title, icon, items, renderRow) => {
    if(!items?.length) return '';
    return `<div class="card mb-12">
      <div class="card-header"><span class="card-title">${icon} ${title} (${items.length})</span></div>
      ${items.map(renderRow).join('')}
    </div>`;
  };

  const rowStyle = 'display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)';
  const restoreBtn = (fn, id) => `<button class="btn btn-accent btn-sm" onclick="${fn}('${id}')">${t('restore')||'Vrati'}</button>`;

  if (rawTotal === 0) {
    document.querySelector('.content').innerHTML = `<div class="empty"><p>${t('trash_empty')||'Korpa je prazna'}</p></div>`;
    return;
  }
  if (total === 0) {
    document.querySelector('.content').innerHTML = `<div class="empty"><p>${t('no_data')}</p></div>`;
    return;
  }

  document.querySelector('.content').innerHTML = `
    <div style="margin-bottom:16px;display:flex;justify-content:flex-end">
      ${isAdmin()?`<button class="btn btn-danger btn-sm" onclick="emptyTrash()">🗑 ${t('empty_trash')||'Isprazni korpu'}</button>`:''}
    </div>
    ${section(t('patients')||'Pacijenti','👤', patients, p=>`
      <div style="${rowStyle}">
        <div>
          <b>${p.name}</b><br>
          <span class="text-sm text-m">${p.phone||''} · ${t('deleted_at')||'obrisano'}: ${fmt(p.deleted_at?.split('T')[0])}</span>
        </div>
        ${isAdmin()?restoreBtn('restorePatient',p.id):''}
      </div>`)}
    ${section(t('appointments')||'Pregledi','📅', appts, a=>`
      <div style="${rowStyle}">
        <div>
          <b>${a.patients?.name||'—'}</b> · ${fmt(a.date)} ${a.time?.substr(0,5)}<br>
          <span class="text-sm text-m">${a.type||''} · ${t('deleted_at')||'obrisano'}: ${fmt(a.deleted_at?.split('T')[0])}</span>
        </div>
        ${isAdmin()?restoreBtn('restoreAppt',a.id):''}
      </div>`)}
    ${section(t('orders')||'Porudžbine','🛒', orders, o=>`
      <div style="${rowStyle}">
        <div>
          <b>${o.patients?.name||'—'}</b> · ${o.type||'—'} · ${fmtMoney(orderTotal(o))}<br>
          <span class="text-sm text-m">${statusLabel(o.status)} · ${t('deleted_at')||'obrisano'}: ${fmt(o.deleted_at?.split('T')[0])}</span>
        </div>
        ${isAdmin()?restoreBtn('restoreOrder',o.id):''}
      </div>`)}
    ${section(t('exam_card')||'Kartice pregleda','📋', exams, e=>`
      <div style="${rowStyle}">
        <div>
          <b>${e.patients?.name||'—'}</b> · ${t('visit')||'Poseta'} №${e.visit_number||'—'}<br>
          <span class="text-sm text-m">${fmt(e.created_at?.split('T')[0])} · ${t('deleted_at')||'obrisano'}: ${fmt(e.deleted_at?.split('T')[0])}</span>
        </div>
        ${isAdmin()?restoreBtn('restoreExam',e.id):''}
      </div>`)}
  `;
}

async function restorePatient(id){await db.from('patients').update({deleted_at:null}).eq('id',id);toast(t('restored')||'Vraćeno');renderTrash();}
async function restoreAppt(id){await db.from('appointments').update({deleted_at:null}).eq('id',id);toast(t('restored')||'Vraćeno');renderTrash();}
async function restoreOrder(id){await db.from('orders').update({deleted_at:null}).eq('id',id);toast(t('restored')||'Vraćeno');renderTrash();}
async function restoreExam(id){await db.from('examinations').update({deleted_at:null}).eq('id',id);toast(t('restored')||'Vraćeno');renderTrash();}

async function emptyTrash(){
  if(!confirm(t('confirm_empty_trash')||'Trajno obrisati sve iz korpe? Ovo se ne može poništiti.'))return;
  await Promise.all([
    db.from('patients').delete().not('deleted_at','is',null),
    db.from('appointments').delete().not('deleted_at','is',null),
    db.from('orders').delete().not('deleted_at','is',null),
    db.from('examinations').delete().not('deleted_at','is',null),
  ]);
  toast(t('trash_emptied')||'Korpa ispraznjena');
  renderTrash();
}
