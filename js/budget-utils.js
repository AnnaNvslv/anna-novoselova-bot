// ═══ BUDGET UTILS v2 ═══
function bToast(msg,type='success'){
  const colors={success:'#6dab8a',error:'#d97070',info:'#c084a0',warn:'#d4946a'};
  const t=document.getElementById('b-toast');
  const d=document.createElement('div');
  d.className='b-toast-msg';
  d.style.background=colors[type]||colors.success;
  d.textContent=msg;
  t.appendChild(d);
  setTimeout(()=>d.remove(),3000);
}
function bOpenModal(html){document.getElementById('b-modal-container').innerHTML=html;document.getElementById('b-overlay').classList.remove('hidden');}
function bCloseModal(){document.getElementById('b-overlay').classList.add('hidden');}
function curSelect(id,selected='DIN'){
  return`<select id="${id}" class="b-cur-sel">${CURRENCIES.map(c=>`<option value="${c}"${c===selected?' selected':''}>${c}</option>`).join('')}</select>`;
}
function amountCell(amountDin,origAmount,origCurrency){
  if(origCurrency&&origCurrency!=='DIN')
    return`<span class="amt-main">${fmtDin(amountDin)}</span><span class="amt-sub">${fmtCur(origAmount,origCurrency)}</span>`;
  return`<span class="amt-main">${fmtDin(amountDin)}</span>`;
}
function bConfirm(msg){return confirm(msg);}
