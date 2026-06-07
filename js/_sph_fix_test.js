// fix: _genOptsSph — when no saved value, select — (empty), 0.00 is first after — so visible on open
function _genOptsSph(vals, saved) {
  const s = String(saved||'');
  let html = `<option value=""${s===''?' selected':'}>—</option>`;
  vals.forEach(v => { html += `<option value="${v}" ${String(v)===s&&s!==''?'selected':''}>${v}</option>`; });
  if(s && s!=='' && !vals.map(String).includes(s))
    html += `<option value="${s}" selected>${s}</option>`;
  return html;
}
