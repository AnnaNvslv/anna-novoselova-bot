// ═══ TELEGRAM ═══
async function getBotToken() { const{data}=await db.from('settings').select('value').eq('key','bot_token').single(); return data?.value||''; }
async function tgSend(chatId,text) {
  const token=await getBotToken();
  if(!token||!chatId)return false;
  try { const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text,parse_mode:'HTML'})}); return r.ok; } catch{return false;}
}

// ═══ SALARY ═══
async function recalcSalary(patientId) {
  const now=new Date();
  const m1=new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0];
  const m2=new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().split('T')[0];
  const{data:orders}=await db.from('orders').select('*').eq('patient_id',patientId).gte('created_at',m1).lte('created_at',m2+'T23:59:59');
  if(!orders)return;
  const total=orders.reduce((s,o)=>s+orderTotal(o),0);
  const counts=total>=10000;
  for(const o of orders) await db.from('orders').update({counts_for_salary:counts}).eq('id',o.id);
}
