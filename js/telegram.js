// ═══ TELEGRAM ═══
// Отправка идёт через Edge Function crm-send: токен бота хранится только на сервере.
async function tgSend(chatId,text) {
  if(!chatId)return false;
  try { const{data,error}=await db.functions.invoke('crm-send',{body:{chat_id:chatId,text}}); return !error&&data?.ok===true; } catch{return false;}
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
