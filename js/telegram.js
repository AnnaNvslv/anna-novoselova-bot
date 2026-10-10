// ═══ TELEGRAM ═══
async function getBotToken() { const{data}=await db.from('settings').select('value').eq('key','bot_token').single(); return data?.value||''; }
async function tgSend(chatId,text) {
  const token=await getBotToken();
  if(!token||!chatId)return false;
  try { const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text,parse_mode:'HTML'})}); return r.ok; } catch{return false;}
}

// ═══ SALARY ═══
// Месяц считается по дате заказа (order_date — её часто вносят задним числом), а не по дате внесения.
// monthOf — любая дата месяца (ISO), по умолчанию текущий месяц.
async function recalcSalary(patientId, monthOf) {
  const base = monthOf || today();
  const ym = base.slice(0,7);
  const{data:all}=await db.from('orders').select('*').eq('patient_id',patientId).is('deleted_at',null);
  if(!all)return;
  const orders=all.filter(o=>orderDateOf(o).slice(0,7)===ym && o.order_date_prec!=='year');
  const total=orders.reduce((s,o)=>s+orderTotal(o),0);
  const counts=total>=10000;
  for(const o of orders) await db.from('orders').update({counts_for_salary:counts}).eq('id',o.id);
}
