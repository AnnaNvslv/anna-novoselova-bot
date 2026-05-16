// ═══ APPOINTMENTS ═══
async function renderAppointments() {
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>Приёмы</h1><div class="topbar-actions"><button class="btn btn-accent" onclick="openAddAppointment()">+ Приём</button></div></div><div class="content"><div class="spinner">Загрузка...</div></div>`;
  const{data:appts}=await db.from('appointments').select('*, patients(name,telegram_chat_id)').order('date',{ascending:false}).order('time');
  const filtered=apptFilter==='все'?appts||[]:(appts||[]).filter(a=>a.status===apptFilter);
  document.querySelector('.content').innerHTML=`
    <div class="section-header">
      <div class="filter-bar">${['все','запланирован','завершён','отменён'].map(f=>`<button class="filter-btn${apptFilter===f?' active':''}" onclick="apptFilter='${f}';renderAppointments()">${f}</button>`).join('')}</div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Пациент</th><th>Дата / Время</th><th>Тип приёма</th><th>Стоимость</th><th>Статус</th><th></th></tr></thead>
      <tbody>${filtered.map(a=>`<tr>
        <td><span class="table-name" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard('${a.patient_id}')">${a.patients?.name||'—'}</span></td>
        <td><b>${fmt(a.date)}</b> в ${a.time?.substr(0,5)}</td>
        <td style="font-size:13.5px">${a.type||'—'}</td>
        <td class="money text-m">${a.consultation_price?fmtMoney(a.consultation_price):'—'}</td>
        <td><span class="badge ${STATUS_BADGE[a.status]||'badge-gray'}">${a.status}</span></td>
        <td><div class="flex gap-8">
          ${a.status==='запланирован'?`<button class="btn btn-primary btn-sm" onclick="openExamForm('${a.id}','${a.patient_id}')">📋 Карта</button><button class="btn btn-success btn-sm" onclick="confirmCompleteAppt('${a.id}')">✓</button><button class="btn btn-ghost btn-sm" onclick="openEditAppt('${a.id}')">✏️</button><button class="btn btn-danger btn-sm" onclick="cancelAppt('${a.id}')">✕</button>`:''}
          ${a.status==='завершён'?`<button class="btn btn-ghost btn-sm" onclick="openEditAppt('${a.id}')">✏️</button>`:''}
        </div></td>
      </tr>`).join('')||`<tr><td colspan="6"><div class="empty"><p>Нет приёмов</p></div></td></tr>`}
      </tbody></table></div></div>`;
}
// ═══ APPOINTMENT FORM ═══
function openAddAppointment(){_apptForm(null,null);}
function openAddAppointmentFor(pid){_apptForm(null,pid);}
async function openAddAppointmentAtSlot(date,time,slotId){_apptForm(null,null,date,time);}
async function openEditAppt(id){const{data:a}=await db.from('appointments').select('*').eq('id',id).single();_apptForm(a,null);}
async function _apptForm(a,prePatient,preDate,preTime){
  const{data:patients}=await db.from('patients').select('id,name').order('name');
  openModal(`<div class="modal modal-lg">
    <div class="modal-header"><span class="modal-title">${a?'Редактировать приём':'Новый приём'}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body">
      <div class="form-grid">
        <div class="form-group full"><label>Пациент *</label>
          <select id="a-pid"><option value="">— выберите —</option>${(patients||[]).map(p=>`<option value="${p.id}" ${(a?.patient_id||prePatient)===p.id?'selected':''}>${p.name}</option>`).join('')}</select>
        </div>
        <div class="form-group full"><label>Тип приёма *</label>
          <select id="a-type" onchange="apptTypeChanged()">${APPT_TYPES.map(t=>`<option value="${t.name}" data-dur="${t.duration}" ${(a?.type||'')===t.name?'selected':''}>${t.name}</option>`).join('')}</select>
        </div>
        <div class="form-group"><label>Дата *</label><input type="date" id="a-date" value="${a?.date||preDate||today()}"></div>
        <div class="form-group"><label>Время *</label>
          <select id="a-time">${[...Array(40)].map((_,i)=>{const m=8*60+i*15;const t=minToTime(m);return`<option ${(a?.time||preTime||'10:00').substr(0,5)===t?'selected':''}>${t}</option>`;}).join('')}</select>
        </div>
        <div class="form-group"><label>Стоимость приёма (дин.)</label><input type="number" id="a-price" value="${a?.consultation_price||3000}"></div>
        <div class="form-group"><label>Длительность (мин.)</label><input type="number" id="a-dur" value="${a?APPT_TYPES.find(t=>t.name===a.type)?.duration||60:60}" readonly></div>
        <div class="form-group full"><label>Примечание</label><textarea id="a-notes">${a?.notes||''}</textarea></div>
        <div class="form-group full"><label>Уведомить пациента в Telegram?</label>
          <select id="a-notify"><option value="yes">Да — отправить подтверждение</option><option value="no">Нет</option></select>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">Отмена</button>
      <button class="btn btn-accent" onclick="saveAppt('${a?.id||''}')">Сохранить</button>
    </div>
  </div>`);
}
function apptTypeChanged(){const sel=document.getElementById('a-type');const opt=sel.options[sel.selectedIndex];document.getElementById('a-dur').value=opt?.dataset?.dur||60;}
async function saveAppt(id){
  const patient_id=v('a-pid'),date=v('a-date'),time=v('a-time');
  if(!patient_id||!date||!time){alert('Заполните обязательные поля');return;}
  const typeName=v('a-type');
  const dur=+(v('a-dur'))||60;
  const data={patient_id,date,time,type:typeName,notes:v('a-notes'),consultation_price:+(v('a-price'))||0};
  let apptId=id;
  if(id){await db.from('appointments').update(data).eq('id',id);toast('Приём обновлён');}
  else{
    const apptNum=await generateApptNumber(date);
    const{data:a}=await db.from('appointments').insert({...data,status:'запланирован',appointment_number:apptNum}).select().single();
    apptId=a?.id;
    toast(`Приём записан · ${apptNum}`);
  }
  // Block slots by duration
  if(!id&&apptId){await blockSlotsByDuration(date,time,dur,apptId);}
  // Notify
  if(v('a-notify')==='yes'&&!id){
    const{data:p}=await db.from('patients').select('name,telegram_chat_id').eq('id',patient_id).single();
    if(p?.telegram_chat_id){
      const msg=`Здравствуйте, ${p.name}!\n\nВы записаны в Оптику Ginter на ${typeName} к оптометристу Анне Новосёловой.\n\n📅 ${fmtDateLong(date)}\n⏰ ${time}\n\nАдрес: <a href="https://maps.app.goo.gl/LJerB2rskqhnhES48">Trg Republike, 25 (Рибља пијаца, там, где проходит Ночной Базар)</a> 📍\n\nПродолжительность приёма — ${apptDurText(typeName)}\n\n💰 Стоимость приёма: ${(+(v('a-price')||v('sb-price')||3000)).toLocaleString('ru-RU')} динар. Оплата за приём — только наличными.\n(Очки можно оплатить картой)\n\nНа приём принесите, пожалуйста, все рецепты, обследования и очки с диоптриями, которые у вас есть (даже старые и которые вы уже не используете).\n\nЗа полчаса до приёма нужно прекратить активную зрительную нагрузку — перестать работать за компьютером, телефоном и дать глазам отдохнуть.\n\nЕсли вы носите контактные линзы, то за 20 минут до приёма вам нужно их снять, чтобы глаза отдохнули. Вы можете взять с собой контейнер и жидкость, снять КЛ в оптике, а после приёма надеть. (В таком случае, вам надо прийти в оптику за 20 минут до назначенного времени).\n\n❤️‍🩹 Если ваши планы изменятся или вы захотите отменить или перенести приём — сообщите, пожалуйста, заранее.\n\nЕсли у вас есть ещё вопросы — свободно пишите, обсудим.\n\nДо встречи!\nАнна.`;
      await tgSend(p.telegram_chat_id,msg);
    }
  }
  closeModal();render();
}
async function blockSlotsByDuration(date,startTime,durationMin,appointmentId){
  const{data:slots}=await db.from('available_slots').select('*').eq('date',date).order('start_time');
  if(!slots)return;
  const startMin=timeToMin(startTime);const endMin=startMin+durationMin;
  const toBlock=slots.filter(s=>{ const sm=timeToMin(s.start_time?.substr(0,5));return sm>=startMin&&sm<endMin; });
  for(const sl of toBlock) await db.from('available_slots').update({is_booked:true,appointment_id:appointmentId}).eq('id',sl.id);
}
async function confirmCompleteAppt(id){if(!confirm('Отметить приём как завершённый?'))return;await db.from('appointments').update({status:'завершён'}).eq('id',id);toast('Приём завершён');render();}
async function cancelAppt(id){
  if(!confirm('Отменить приём?'))return;
  await db.from('appointments').update({status:'отменён'}).eq('id',id);
  await db.from('available_slots').update({is_booked:false,appointment_id:null}).eq('appointment_id',id);
  toast('Приём отменён');
  render();
  if(_openPatientId) _renderPatientCard(_openPatientId);
}
// ═══ APPOINTMENT NUMBER ═══
async function generateApptNumber(date){
  const[year,,month]=[date.substr(0,4),'-',date.substr(5,2)];
  const mon=date.substr(5,2); const yr=date.substr(2,2);
  const prefix=`OG-${mon}${yr}`;
  const{count}=await db.from('appointments').select('id',{count:'exact',head:true}).like('appointment_number',`${prefix}-%`);
  return`${prefix}-${String((count||0)+1).padStart(2,'0')}`;
}
