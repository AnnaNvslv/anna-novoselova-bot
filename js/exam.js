async function saveExam(id,apptId,patientId,visitNum){
  const effectiveId = _currentExamId || id || '';
  // Только колонки которые точно есть в таблице examinations
  const data={
    appointment_id:apptId||null,patient_id:patientId,visit_number:+visitNum,
    visit_reason:[...document.querySelectorAll('input[name="visit_reason"]:checked')].map(cb=>cb.value).join(', '),
    complaints_notes:v('e-complaints'),last_ophthalmologist:v('e-lastoph'),
    eye_diseases_notes:v('e-eyedis'),general_diseases_notes:v('e-gendis'),
    current_corrections:_examData.corrections,
    refr_od_sph:v('r-od-sph'),refr_od_cyl:v('r-od-cyl'),refr_od_ax:v('r-od-ax'),refr_od_pd:v('r-pd'),refr_od_ave:v('r-od-ave'),
    refr_os_sph:v('r-os-sph'),refr_os_cyl:v('r-os-cyl'),refr_os_ax:v('r-os-ax'),refr_os_pd:v('r-pd'),refr_os_ave:v('r-os-ave'),
    exam_od_without:v('x-od-wo'),exam_od_cosph:v('x-od-cs'),exam_od_cyl:v('x-od-cyl'),exam_od_ax:v('x-od-ax'),exam_od_with:v('x-od-wi'),
    exam_os_without:v('x-os-wo'),exam_os_cosph:v('x-os-cs'),exam_os_cyl:v('x-os-cyl'),exam_os_ax:v('x-os-ax'),exam_os_with:v('x-os-wi'),
    exam_ou:v('x-ou'),
    rx_far_enabled:true,
    rx_far_od_sph:v('rf-od-sph'),rx_far_od_cyl:v('rf-od-cyl'),rx_far_od_ax:v('rf-od-ax'),rx_far_od_pd:v('rf-pd'),
    rx_far_os_sph:v('rf-os-sph'),rx_far_os_cyl:v('rf-os-cyl'),rx_far_os_ax:v('rf-os-ax'),rx_far_os_pd:v('rf-add'),
    rx_comp_enabled:true,
    rx_comp_od_sph:v('rc-od-sph'),rx_comp_od_cyl:v('rc-od-cyl'),rx_comp_od_ax:v('rc-od-ax'),rx_comp_od_pd:v('rc-pd'),rx_comp_od_add:v('rc-add'),
    rx_comp_os_sph:v('rc-os-sph'),rx_comp_os_cyl:v('rc-os-cyl'),rx_comp_os_ax:v('rc-os-ax'),
    rx_near_enabled:true,
    rx_near_od_sph:v('rn-od-sph'),rx_near_od_cyl:v('rn-od-cyl'),rx_near_od_ax:v('rn-od-ax'),rx_near_od_pd:v('rn-pd'),rx_near_od_add:v('rn-degr'),
    rx_near_os_sph:v('rn-os-sph'),rx_near_os_cyl:v('rn-os-cyl'),rx_near_os_ax:v('rn-os-ax'),
    rx_cl_enabled:true,
    rx_cl_od_sph:v('rcl-od-sph'),rx_cl_od_cyl:v('rcl-od-cyl'),rx_cl_od_ax:v('rcl-od-ax'),
    rx_cl_od_bc:v('rcl-bc'),rx_cl_od_dia:v('rcl-dia'),rx_cl_od_type:v('rcl-type'),
    rx_cl_os_sph:v('rcl-os-sph'),rx_cl_os_cyl:v('rcl-os-cyl'),rx_cl_os_ax:v('rcl-os-ax'),
    recommendations:v('e-recs'),control_date:v('e-ctrl-date')||null
  };
  try{
    if(effectiveId){
      const{error}=await db.from('examinations').update(data).eq('id',effectiveId);
      if(error)throw error;
      toast(t('save_card'),'success');
    }else{
      const{data:ne,error}=await db.from('examinations').insert(data).select().single();
      if(error)throw error;
      if(ne?.id){ _currentExamId=ne.id; window._lastExamId=ne.id; }
      toast(t('card_created'),'success');
    }
    _modalDirty=false;
    return _currentExamId||effectiveId;
  }catch(err){
    console.error('saveExam error:',err);
    toast('❌ '+t('save_error')+': '+(err.message||'нет связи'),'error');
    return null;
  }
}
