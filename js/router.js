// ═══ ROUTER ═══
function nav(s) {
  curSection=s;
  localStorage.setItem('crm_section',s);
  document.querySelectorAll('.sb-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('nav-'+s)?.classList.add('active');
  render();
}
function render() {
  if(typeof checkPromoOwner==='function'&&_isOwner===null) checkPromoOwner();
  ({dashboard:renderDashboard,patients:renderPatients,appointments:renderAppointments,orders:renderOrders,analytics:renderAnalytics,slots:renderSlots,settings:renderSettings,trash:renderTrash,bookinglog:renderBookingLog,promo:(typeof renderPromo==='function'?renderPromo:renderDashboard)}[curSection]||renderDashboard)();
}

// Промокоды: модуль грузится отдельно (страница видна только владельцу)
(function(){var s=document.createElement('script');s.src='js/promo.js?v=2';document.body.appendChild(s);})();
