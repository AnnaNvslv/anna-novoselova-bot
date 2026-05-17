// ═══ APPOINTMENTS ═══
async function renderAppointments() {
  document.getElementById('content').innerHTML=`<div class="topbar"><h1>${t('appointments')}</h1><div class="topbar-actions"><button class="btn btn-accent" onclick="openAddAppointment()">+ ${t('appointments')||'Pregledi'}</button></div></div><div class="content"><div class="spinner">Загрузка...</div></div>`;
  const{data:appts}=await db.from('appointments').select('*, patients(name,telegram_chat_id)').is('deleted_at',null).order('date',{ascending:false}).order('time');
  const filtered=apptFilter==='все'?appts||[]:(appts||[]).filter(a=>a.status===apptFilter);
  document.querySelector('.content').innerHTML=`
    <div class="section-header">
      <div class="filter-bar">${['все','запланирован','завершён','отменён'].map(f=>`<button class="filter-btn${apptFilter===f?' active':''}" onclick="apptFilter='${f}';renderAppointments()">${{'все':t('all'),'запланирован':t('status_planned'),'завершён':t('status_done'),'отменён':t('status_cancelled')}[f]||f}</button>`).join('')}</div>
    </div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>${t('patient')}</th><th>${t('date_time')}</th><th>${t('appt_type')}</th><th>${t('cost')}</th><th>${t('status')}</th><th></th></tr></thead>
      <tbody>${filtered.map(a=>`<tr>
        <td><span class="table-name" style="cursor:pointer;color:var(--primary)" onclick="openPatientCard('${a.patient_id}')">${a.patients?.name||'—'}</span></td>
        <td><b>${fmt(a.date)}</b> в ${a.time?.substr(0,5)}</td>
        <td style="font-size:13.5px">${a.type||'—'}</td>
        <td class="money text-m">${a.consultation_price?fmtMoney(a.consultation_price):'—'}</td>
        <td><span class="badge ${STATUS_BADGE[a.status]||'badge-gray'}">${statusLabel(a.status)}</span></td>
        <td><div class="flex gap-8">
          ${a.status=='запланирован'?`<button class="btn btn-primary btn-sm" onclick="openExamForm('${a.id}','${a.patient_id}')">📋 Kartica</button><button class="btn btn-success btn-sm" onclick="confirmCompleteAppt('${a.id}')">✓</button><button class="btn btn-ghost btn-sm" onclick="openEditAppt('${a.id}')">✏️</button><button class="btn btn-ghost btn-sm" title="Otkaži pregled" onclick="cancelAppt('${a.id}')">🚫</button><button class="btn btn-danger btn-sm" title="Obriši (greška)" onclick="deleteAppt('${a.id}')">🗑</button>`:''}
          ${a.status==='завершён'?`<button class="btn btn-ghost btn-sm" onclick="openEditAppt('${a.id}')">✏️</button><button class="btn btn-ghost btn-sm" title="Vrati na zakazan" onclick="revertApptToPlanned('${a.id}')">↩</button>`:''}
        </div></td>
      </tr>`).join('')||`<tr><td colspan="6"><div class="empty"><p>${t('no_appts_table')}</p></div></td></tr>`}
      </tbody></table></div></div>`;
}
// ═══ APPOINTMENT FORM ═══
function openAddAppointment(){_apptForm(null,null);}
function openAddAppointmentFor(pid){_apptForm(null,pid);}
async function openAddAppointmentAtSlot(date,time,slotId){_apptForm(null,null,date,time);}
async function openEditAppt(id){const{data:a}=await db.from('appointments').select('*').eq('id',id).single();_apptForm(a,null);}
async function _apptForm(a,prePatient,preDate,preTime){
  const{data:patients}=await db.from('patients').select('id,name').is('deleted_at',null).order('name');
  // Free slots next 21 days
  const toD=new Date();toD.setDate(toD.getDate()+21);
  const{data:freeSlots}=await db.from('available_slots').select('*').eq('is_booked',false).is('booked_by',null).gte('date',today()).lte('date',toD.toISOString().split('T')[0]).order('date').order('start_time');
  const slotsByDate={};(freeSlots||[]).forEach(s=>{if(!slotsByDate[s.date])slotsByDate[s.date]=[];slotsByDate[s.date].push(s);});
  const slotDates=Object.keys(slotsByDate).sort();
  const slotPickerHtml=slotDates.length?`<div class="form-group full"><label>${t('available_slots')||'Slobodni termini'}</label>
    <div style="max-height:160px;overflow-y:auto;padding:4px 0">
      ${slotDates.map(d=>`<div style="margin-bottom:8px">
        <div style="font-size:11px;font-weight:700;color:var(--text-m);margin-bottom:4px">${fmtDateLong(d)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${slotsByDate[d].map(s=>`<button type="button" class="slot-pick-btn" data-sid="${s.id}" onclick="pickSlot('${s.date}','${s.start_time?.substr(0,5)}','${s.id}')" style="padding:3px 10px;border:1.5px solid ${a&&a.date===s.date&&a.time?.substr(0,5)===s.start_time?.substr(0,5)?'var(--accent)':'var(--border)'};border-radius:6px;background:${a&&a.date===s.date&&a.time?.substr(0,5)===s.start_time?.substr(0,5)?'var(--accent)':'white'};color:${a&&a.date===s.date&&a.time?.substr(0,5)===s.start_time?.substr(0,5)?'white':'inherit'};cursor:pointer;font-size:13px;font-weight:600">${s.start_time?.substr(0,5)}</button>`).join('')}
        </div></div>`).join('')}
    </div></div>`:'<div class="form-group full" style="color:var(--text-m);font-size:13px">Nema slobodnih termina. Izaberite datum i vreme ručno.</div>';
  const timeOpts=[...Array(45)].map((_,i)=>{const m=8*60+i*15;const ts=minToTime(m);return`<option ${((a?.time||preTime||'10:00').substr(0,5)===ts)?'selected':''}>${ts}</option>`;}).join('');
  window._pickedSlotId=null;
  if(a){const curSlot=(freeSlots||[]).find(s=>s.date===a.date&&s.start_time?.substr(0,5)===a.time?.substr(0,5));if(curSlot)window._pickedSlotId=curSlot.id;}
  openModal(`<div class="modal modal-lg">
    <div class="modal-header"><span class="modal-title">${a?t('edit_appt'):t('new_appt')}</span><button class="btn btn-ghost btn-sm" onclick="closeModal()">✕</button></div>
    <div class="modal-body"><div class="form-grid">
      <div class="form-group full"><label>${t('patient')} *<button type="button" class="btn btn-ghost btn-sm" style="margin-left:8px;font-size:12px" onclick="_apptSaveState();openAddPatient()">+ Novi pacijent</button></label>
        <select id="a-pid"><option value="">${isErvin()?'— izaberite —':'— '+t('patient')+' —'}</option>${(patients||[]).map(p=>`<option value="${p.id}" ${(a?.patient_id||prePatient)===p.id?'selected':''}>${p.name}</option>`).join('')}</select>
      </div>
      <div class="form-group full"><label>${t('appt_type')} *</label>
        <select id="a-type" onchange="apptTypeChanged()">${APPT_TYPES.map(tp=>`<option value="${tp.name}" data-dur="${tp.duration}" ${(a?.type||'')===tp.name?'selected':''}>${apptTypeName(tp.name)}</option>`).join('')}</select>
      </div>
      ${slotPickerHtml}
      <div class="form-group"><label>${t('date')} *</label><input type="date" id="a-date" value="${a?.date||preDate||today()}"></div>
      <div class="form-group"><label>${t('time')} *</label><select id="a-time">${timeOpts}</select></div>
      <div class="form-group"><label>${t('appt_cost')}</label><input type="number" id="a-price" value="${a?.consultation_price||3000}"></div>
      <div class="form-group"><label>${t('duration')} (${t('duration_min')})</label><input type="number" id="a-dur" value="${a?APPT_TYPES.find(tp=>tp.name===a.type)?.duration||60:60}" readonly></div>
      <div class="form-group full"><label>${t('notes_label')}</label><textarea id="a-notes">${a?.notes||''}</textarea></div>
      <div class="form-group full"><label>${t('notify_tg')}</label>
        <select id="a-notify"><option value="yes">${t('notify_yes')}</option><option value="no">${isErvin()?'Ne':'Нет'}</option></select>
      </div>
    </div></div>
    <div class="modal-footer">
      <button class="btn btn-ghost" onclick="closeModal()">${t('cancel')}</button>
      <button class="btn btn-accent" onclick="saveAppt('${a?.id||''}')">${isErvin()?'Zauzimi':t('save')}</button>
    </div>
  </div>`);
}
function pickSlot(date,time,slotId){
  document.querySelectorAll('.slot-pick-btn').forEach(b=>{
    const active=b.dataset.sid===slotId;
    b.style.background=active?'var(--accent)':'white';
    b.style.color=active?'white':'inherit';
    b.style.borderColor=active?'var(--accent)':'var(--border)';
  });
  document.getElementById('a-date').value=date;
  const sel=document.getElementById('a-time');
  for(let o of sel.options) if(o.value===time||o.textContent===time){o.selected=true;break;}
  window._pickedSlotId=slotId;
}
function apptTypeChanged(){const sel=document.getElementById('a-type');const opt=sel.options[sel.selectedIndex];document.getElementById('a-dur').value=opt?.dataset?.dur||60;}

async function saveAppt(id){
  const btn=document.querySelector('.modal-footer .btn-accent');
  if(btn){if(btn.disabled)return;btn.disabled=true;}
  const patient_id=v('a-pid'),date=v('a-date'),time=v('a-time');
  if(!patient_id||!date||!time){
    const inv = !patient_id?'a-pid':!date?'a-date':'a-time';
    const el=document.getElementById(inv);
    if(el){el.style.border='2px solid #ef4444';el.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>el.style.border='',2000);}
    alert(t('fill_required'));return;
  }
  const typeName=v('a-type');
  const dur=+(v('a-dur'))||60;
  const data={patient_id,date,time,type:typeName,notes:v('a-notes'),consultation_price:+(v('a-price'))||0};
  let apptId=id;
  if(id){
    // Check duplicate on new time (exclude current appt)
    const{data:dupCheck}=await db.from('appointments').select('id').eq('patient_id',patient_id).eq('date',date).eq('time',time).is('deleted_at',null).neq('id',id);
    if(dupCheck?.length){toast('Pregled već postoji u to vreme!','error');const b=document.querySelector('.modal-footer .btn-accent');if(b)b.disabled=false;return;}
    // Free old slot, book new slot
    await db.from('available_slots').update({is_booked:false,appointment_id:null}).eq('appointment_id',id);
    await db.from('appointments').update(data).eq('id',id);
    if(window._pickedSlotId){
      await db.from('available_slots').update({is_booked:true,appointment_id:id}).eq('id',window._pickedSlotId);
    } else {
      await blockSlotsByDuration(date,time,dur,id);
    }
    toast(t('appt_updated'));
  }
  else{
    // Check for duplicate
    const{data:existing}=await db.from('appointments').select('id').eq('patient_id',patient_id).eq('date',date).eq('time',time).is('deleted_at',null);
    if(existing?.length){toast('Pregled već postoji u to vreme!','error');const btn=document.querySelector('.modal-footer .btn-accent');if(btn)btn.disabled=false;return;}
    const apptNum=await generateApptNumber(date);
    const{data:a}=await db.from('appointments').insert({...data,status:'запланирован',appointment_number:apptNum}).select().single();
    apptId=a?.id;
    toast(`${t('appt_saved')} · ${apptNum}`);
  }
  // Check slot still free before blocking
  if(!id&&apptId&&window._pickedSlotId){
    const{data:slotChk}=await db.from('available_slots').select('is_booked,booked_by').eq('id',window._pickedSlotId).single();
    if(slotChk?.is_booked){
      toast('Ovaj termin je već zauzet! Izaberite drugo vreme.','error');
      await db.from('appointments').delete().eq('id',apptId);
      const btn=document.querySelector('.modal-footer .btn-accent');if(btn)btn.disabled=false;
      return;
    }
  }
  // Check by date+time as fallback
  if(!id&&apptId){
    const{data:timeChk}=await db.from('appointments').select('id').eq('date',date).eq('time',time).is('deleted_at',null).neq('status','отменён').neq('id',apptId);
    if(timeChk?.length){
      toast('Na ovo vreme već postoji pregled!','error');
      await db.from('appointments').delete().eq('id',apptId);
      const btn=document.querySelector('.modal-footer .btn-accent');if(btn)btn.disabled=false;
      return;
    }
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
  closeModal();
  // If new appointment for a patient - reopen patient card
  if(!id && patient_id) {
    openPatientCard(patient_id);
  } else {
    render();
  }
}
async function blockSlotsByDuration(date,startTime,durationMin,appointmentId){
  const{data:slots}=await db.from('available_slots').select('*').eq('date',date).order('start_time');
  if(!slots)return;
  const startMin=timeToMin(startTime);const endMin=startMin+durationMin;
  const toBlock=slots.filter(s=>{ const sm=timeToMin(s.start_time?.substr(0,5));return sm>=startMin&&sm<endMin; });
  for(const sl of toBlock) await db.from('available_slots').update({is_booked:true,appointment_id:appointmentId}).eq('id',sl.id);
}
async function confirmCompleteAppt(id){if(!confirm(t('confirm_complete')))return;await db.from('appointments').update({status:'завершён'}).eq('id',id);toast(t('appt_done'));render();}
async function cancelAppt(id){
  if(!confirm(t('confirm_cancel')))return;
  await db.from('appointments').update({status:'отменён'}).eq('id',id);
  await db.from('available_slots').update({is_booked:false,appointment_id:null}).eq('appointment_id',id);
  toast(t('appt_cancelled'));
  if(_openPatientId){_renderPatientCard(_openPatientId);}else{renderAppointments();}
}
async function deleteAppt(id){
  if(!confirm(t('confirm_delete')||'Obrisati pregled?'))return;
  await db.from('available_slots').update({is_booked:false,appointment_id:null}).eq('appointment_id',id);
  const{data:apptDel}=await db.from('appointments').select('date,time').eq('id',id).single();
  if(apptDel?.date&&apptDel?.time){
    await db.from('available_slots').update({is_booked:false,appointment_id:null}).eq('date',apptDel.date).eq('start_time',apptDel.time).eq('is_booked',true);
  }
  await db.from('appointments').update({deleted_at:new Date().toISOString()}).eq('id',id);
  toast(t('moved_to_trash')||'Premješteno u korpu');
  if(_openPatientId){_renderPatientCard(_openPatientId);}else{renderAppointments();}
}
// ═══ APPOINTMENT NUMBER ═══
async function generateApptNumber(date){
  const[year,,month]=[date.substr(0,4),'-',date.substr(5,2)];
  const mon=date.substr(5,2); const yr=date.substr(2,2);
  const prefix=`OG-${mon}${yr}`;
  const{count}=await db.from('appointments').select('id',{count:'exact',head:true}).like('appointment_number',`${prefix}-%`);
  return`${prefix}-${String((count||0)+1).padStart(2,'0')}`;
}

async function revertApptToPlanned(id){
  if(!confirm('Vratiti status pregleda na zakazan?'))return;
  await db.from('appointments').update({status:'запланирован'}).eq('id',id);
  toast('Status vraćen na zakazan');
  if(_openPatientId){_renderPatientCard(_openPatientId);}else{renderAppointments();}
}

function _apptSaveState(){
  window._pendingApptPid=v('a-pid');
  window._pendingApptType=v('a-type');
  window._pendingApptDate=v('a-date');
  window._pendingApptTime=v('a-time');
}
