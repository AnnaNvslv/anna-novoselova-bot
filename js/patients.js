// ═══ PATIENTS ═══
async function renderPatients() {
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>${t('patients')}</h1><div class="topbar-actions"><div class="search-wrap"><input type="text" id="psearch" placeholder="${t('search')}" oninput="filterPatientsUI(this.value)"></div><button class="btn btn-accent" onclick="openAddPatient()">+ Пациент</button></div></div><div class="content"><div class="spinner">Загрузка...</div></div>`;
  const{data:patients}=await db.from('patients').select('*').is('deleted_at',null).order('name');
  _allPatients=patients||[];
  renderPatientsTable(_allPatients);
}
let _allPatients=[];
let _lastAddedPatientId = null;
function renderPatientsTable(patients) {
  const c=document.querySelector('.content'); if(!c)return;
  c.innerHTML=`<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>${t('patient')}</th><th>${t('phone')}</th><th>Telegram</th><th>${t('age')}</th><th></th></tr></thead>
    <tbody>${patients.map(p=>`<tr id="prow-${p.id}" style="${_lastAddedPatientId===p.id?'background:#d1fae5;transition:background 2s':''}">
      <td><div class="flex items-center gap-8"><div class="patient-avatar" style="width:36px;height:36px;font-size:14px">${initials(p.name)}</div>
        <div><div class="table-name" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard('${p.id}')">${p.name}</div>
        ${p.email?`<div class="table-sub">${p.email}</div>`:''}</div></div></td>
      <td class="text-m">${p.phone||'—'}</td>
      <td>${p.telegram_chat_id?'<span class="badge badge-green">✓ TG</span>':p.telegram_username?`@${p.telegram_username}`:'—'}</td>
      <td class="text-m">${p.dob?(calcAge(p.dob)+' лет'):'—'}</td>
      <td><div class="flex gap-8">
        <button class="btn btn-ghost btn-xs" onclick="openAddAppointmentFor('${p.id}')">+ Приём</button>
        ${isAdmin()?`<button class="btn btn-ghost btn-xs" onclick="openAddOrderFor('${p.id}')">+ Заказ</button>`:''}
        <button class="btn btn-accent btn-sm" onclick="openPatientCard('${p.id}')">${t('card')}</button>
        ${isAdmin()?`<button class="btn btn-ghost btn-sm" onclick="openEditPatient('${p.id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="delPatient('${p.id}')">🗑</button>`:''}
      </div></td>
    </tr>`).join('')||`<tr><td colspan="5"><div class="empty"><p>${t('no_patients')}</p></div></td></tr>`}
    </tbody></table></div></div>`;
  if(_lastAddedPatientId) {
    setTimeout(()=>{ const r=document.getElementById('prow-'+_lastAddedPatientId); if(r) r.style.background=''; },3000);
  }
}
function filterPatientsUI(q) {
  const f=q?_allPatients.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())||p.phone?.includes(q)):_allPatients;
  renderPatientsTable(f);
}
// ═══ PATIENT CARD ═══
async function openPatientCard(pid) {
  _cardTab='appts';
  openModal(`<div class="modal modal-full"><div class="modal-header"><span class="modal-title">Загрузка...</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div><div class="modal-body"><div class="spinner">Загрузка...</div></div></div>`);
  await _renderPatientCard(pid);
}
let _openPatientId = null;
async function _renderPatientCard(pid) {
  _openPatientId = pid;
  const[{data:p},{data:appts},{data:orders},{data:exams}]=await Promise.all([
    db.from('patients').select('*').eq('id',pid).single(),
    db.from('appointments').select('*').eq('patient_id',pid).order('date',{ascending:false}),
    db.from('orders').select('*').eq('patient_id',pid).order('created_at',{ascending:false}),
    db.from('examinations').select('*').eq('patient_id',pid).order('created_at',{ascending:false})
  ]);
  if(!p){closeModal();return;}
  const age=calcAge(p.dob);
  document.getElementById('modal-container').innerHTML=`
    <div class="modal modal-full">
      <div class="modal-header">
        <div class="flex items-center gap-12">
          <div class="patient-avatar" style="width:52px;height:52px;font-size:20px">${initials(p.name)}</div>
          <div>
            <div style="font-size:20px;font-weight:800">${p.name}</div>
            <div style="font-size:13px;color:var(--text-m)">${age?age+' лет · ':''} ${p.phone||''} ${p.telegram_chat_id?'· ✈️ TG':''}</div>
          </div>
        </div>
        <div class="flex gap-8">
          <button class="btn btn-accent" onclick="openAddAppointmentFor('${pid}')">+ Приём</button>
          ${isAdmin()?`<button class="btn btn-accent" onclick="openAddOrderFor('${pid}')">+ Заказ</button><button class="btn btn-ghost btn-sm" onclick="closeModal();openEditPatient('${pid}')">✏️ Редактировать</button>`:''}
          <button class="btn btn-ghost btn-sm" title="Скачать PDF карточки" onclick="savePatientPDF('${pid}')">💾 PDF</button>
          <button class="btn btn-ghost btn-sm" title="Отправить PDF пациенту" onclick="emailPatientPDF('${pid}','patient')">📧 Пациенту</button>
          <button class="btn btn-ghost btn-sm" title="Отправить PDF в оптику" onclick="emailPatientPDF('${pid}','clinic')">📨 В оптику</button>
          <button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button>
        </div>
      </div>
      <div class="modal-body">
        <div class="info-grid mb-12">
          <div class="info-item"><label>${t('phone')}</label><p>${p.phone||'—'}</p></div>
          <div class="info-item"><label>Email</label><p>${p.email||'—'}</p></div>
          <div class="info-item"><label>Telegram</label><p>${p.telegram_chat_id?`ID: ${p.telegram_chat_id}`:p.telegram_username?`@${p.telegram_username}`:'—'}</p></div>
          <div class="info-item"><label>${t('dob')}</label><p>${p.dob?fmt(p.dob)+(age?' ('+age+' лет)':''):'—'}</p></div>
          <div class="info-item"><label>${t('source')}</label><p>${p.source||'—'}</p></div>
          <div class="info-item"><label>${t('in_base')}</label><p>${fmt(p.created_at?.split('T')[0])}</p></div>
        </div>
        ${p.notes?`<div class="mb-12 text-m text-sm">${p.notes}</div>`:''}
        <div class="divider"></div>
        <div class="tab-bar">
          <div class="tab${_cardTab==='appts'?' active':''}" onclick="_cardTab='appts';_renderPatientCard('${pid}')">${t('appointments')} (${(appts||[]).length})</div>
          <div class="tab${_cardTab==='exams'?' active':''}" onclick="_cardTab='exams';_renderPatientCard('${pid}')">${t('exam_card').split(' ')[0]} (${(exams||[]).length})</div>
          <div class="tab${_cardTab==='orders'?' active':''}" onclick="_cardTab='orders';_renderPatientCard('${pid}')">${t('orders')} (${(orders||[]).length})</div>
        </div>
        ${_cardTab==='appts'?_apptTab(appts||[],pid):''}
        ${_cardTab==='exams'?_examTabHtml(exams||[],pid):''}
        ${_cardTab==='orders'?_orderTab(orders||[],pid):''}
      </div>
    </div>`;
}
function _apptTab(appts,pid){
  if(!appts.length)return`<div class="empty"><p>${t('no_appts')}</p></div>`;
  return appts.map(a=>`<div class="history-item">
    <div class="history-dot"></div>
    <div style="flex:1">
      <div class="history-date">${fmt(a.date)} в ${a.time?.substr(0,5)} · <span class="badge ${STATUS_BADGE[a.status]||'badge-gray'}" style="font-size:11px">${a.status}</span></div>
      <div class="history-title">${a.type||'Приём'}</div>
      ${a.consultation_price?`<div class="text-sm text-m">${t('cost')}: ${fmtMoney(a.consultation_price)}</div>`:''}
    </div>
    <div class="flex gap-8">
      <button class="btn btn-primary btn-sm" onclick="openExamForm('${a.id}','${pid}')">📋 Карта</button>
      <button class="btn btn-ghost btn-sm" onclick="openEditAppt('${a.id}')">✏️</button>
      ${a.status==='запланирован'?`<button class="btn btn-success btn-sm" title="Završen" onclick="confirmCompleteAppt('${a.id}')">✓</button><button class="btn btn-ghost btn-sm" title="Otkaži pregled" onclick="cancelAppt('${a.id}')">🚫</button><button class="btn btn-danger btn-sm" title="Obriši (greška)" onclick="deleteAppt('${a.id}')">🗑</button>`:''}
      ${a.status==='отменён'?`<span class="badge badge-gray">${t('status_cancelled')}</span>`:''}
    </div>
  </div>`).join('');
}
function _examTabHtml(exams,pid){
  if(!exams.length)return`<div class="empty"><p>${t('exam_card')} - нет</p></div>`;
  return exams.map(e=>`<div class="history-item">
    <div class="history-dot" style="background:var(--primary-l);border-color:var(--primary)"></div>
    <div style="flex:1">
      <div class="history-date">Визит №${e.visit_number||'—'} · ${fmt(e.created_at?.split('T')[0])}</div>
      <div class="history-title">Карта обследования</div>
      <div class="text-sm text-m">${[e.rx_far_od_sph?'Даль':'',e.rx_comp_od_sph?'Компьютер':'',e.rx_near_od_sph?'Близь':'',e.rx_cl_od_sph?'МКЛ':''].filter(Boolean).join(' · ')||'Параметры не заполнены'}</div>
      ${e.control_date?`<div class="text-sm" style="color:var(--warn)">Контроль: ${fmt(e.control_date)}</div>`:''}
    </div>
    <div class="flex gap-8">
      <button class="btn btn-ghost btn-sm" onclick="openExamView('${e.id}','${pid}')">Otvori</button>
      <button class="btn btn-primary btn-sm" onclick="printExam('${e.id}')">🖨️</button>
    </div>
  </div>`).join('');
}
function _orderTab(orders,pid){
  if(!orders.length)return`<div class="empty"><p>${t('no_orders')}</p></div>`;
  return orders.map(o=>{const bal=orderBalance(o);return`<div class="history-item">
    <div class="history-dot" style="background:var(--accent-l);border-color:var(--accent)"></div>
    <div style="flex:1">
      <div class="history-date">${fmt(o.created_at?.split('T')[0])} · <span class="badge ${STATUS_BADGE[o.status]||'badge-gray'}" style="font-size:11px">${o.status}</span>${o.counts_for_salary?' <span class="salary-badge">💰</span>':''}</div>
      <div class="history-title">${o.type}${o.prescription_label?' — '+o.prescription_label:''}</div>
      <div class="text-sm text-m">${[o.frame_code,o.lens_name].filter(Boolean).join(' / ')||'—'}</div>
      <div class="text-sm mt-4">Итого: <b>${fmtMoney(orderTotal(o))}</b> · Предоплата: ${fmtMoney(o.prepayment)} · Остаток: <span class="${bal>0?'money-debt':'money-paid'}">${fmtMoney(bal)}</span></div>
    </div>
    <div class="flex gap-8">
      ${o.status==='в работе'?`<button class="btn btn-ghost btn-sm" title="Отметить готовым" onclick="updateOrderStatus('${o.id}','готов')">Готов</button>`:''}
      ${o.status==='готов'?`<button class="btn btn-ghost btn-sm" title="Оповестить о готовности" onclick="notifyOrderReady('${o.id}')">📨</button><button class="btn btn-accent btn-sm" onclick="issueOrder('${o.id}')">Выдать</button>`:''}
      ${o.status==='выдан'?`<button class="btn btn-ghost btn-sm" title="Опрос через 2 нед." onclick="sendFollowUpSurvey('${o.id}')">🔁</button>`:''}
      <button class="btn btn-ghost btn-sm" onclick="openOrderCard('${o.id}')">${t('card')}</button>
    </div>
  </div>`;}).join('');
}

// ═══ PATIENT FORM ═══
function openAddPatient(){_patientForm(null);}
async function openEditPatient(id){const{data:p}=await db.from('patients').select('*').eq('id',id).single();_patientForm(p);}
function _patientForm(p){
  openModal(`<div class="modal modal-lg">
    <div class="modal-header"><span class="modal-title">${p?t('edit_patient'):t('new_patient')}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group full"><label>${t('full_name')} *</label><input id="p-name" value="${p?.name||''}" placeholder="Иванова Мария Петровна"></div>
        <div class="form-group"><label>${t('phone')}</label><input id="p-phone" value="${p?.phone||''}"></div>
        <div class="form-group"><label>Email</label><input id="p-email" value="${p?.email||''}"></div>
        <div class="form-group">
          <label>${t('dob')}</label>
          <input type="date" id="p-dob" value="${p?.dob||''}" max="${today()}" oninput="showAgeHint(this.value)">
          <div id="age-hint" class="age-hint">${p?.dob?calcAge(p.dob)+' лет':''}</div>
        </div>
        <div class="form-group"><label>Telegram @username</label><input id="p-tguser" value="${p?.telegram_username||''}"></div>
        <div class="form-group"><label>Telegram Chat ID</label><input id="p-tgid" value="${p?.telegram_chat_id||''}" placeholder="123456789"></div>
        <div class="form-group full"><label>${t('source')}</label>
          <select id="p-source"><option value="">— выберите —</option>${SOURCES.map(s=>`<option ${p?.source===s?'selected':''}>${s}</option>`).join('')}</select>
        </div>
        <div class="form-group full"><label>${t('notes')}</label><textarea id="p-notes">${p?.notes||''}</textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">${t('cancel')}</button>
      <button class="btn btn-accent" onclick="savePatient('${p?.id||''}')">${t('save')}</button>
    </div>
  </div>`);
}
function showAgeHint(dob){const a=calcAge(dob);document.getElementById('age-hint').textContent=a?a+' лет':'';}
async function savePatient(id){
  const name=v('p-name');if(!name){alert(t('enter_name'));return;}
  const data={name,phone:v('p-phone'),email:v('p-email'),dob:v('p-dob')||null,telegram_username:v('p-tguser'),telegram_chat_id:v('p-tgid'),source:v('p-source'),notes:v('p-notes')};
  if(id){
    await db.from('patients').update(data).eq('id',id);
    toast(t('updated'));_lastAddedPatientId=null;
    closeModal();render();
  } else {
    const{data:np}=await db.from('patients').insert(data).select().single();
    _lastAddedPatientId=np?.id;
    toast(t('added'));
    closeModal();
    if(np?.id) openPatientCard(np.id);
    else render();
  }
}
async function delPatient(id){if(!confirm(t('confirm_delete_patient')))return;await db.from('patients').update({deleted_at:new Date().toISOString()}).eq('id',id);toast(t('moved_to_trash')||'U korpu');render();}
