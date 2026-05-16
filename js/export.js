// ═══ EXPORT ═══
async function exportAll(){
  const[{data:pa},{data:ap},{data:ex},{data:or}]=await Promise.all([db.from('patients').select('*'),db.from('appointments').select('*'),db.from('examinations').select('*'),db.from('orders').select('*')]);
  const blob=new Blob([JSON.stringify({patients:pa,appointments:ap,examinations:ex,orders:or,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`crm-backup-${today()}.json`;a.click();toast('Экспорт готов');
