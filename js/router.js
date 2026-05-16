// ═══ ROUTER ═══
function nav(s) {
  curSection=s;
  document.querySelectorAll('.sb-item').forEach(el=>el.classList.remove('active'));
  document.getElementById('nav-'+s)?.classList.add('active');
  render();
}
function render() {
  ({dashboard:renderDashboard,patients:renderPatients,appointments:renderAppointments,orders:renderOrders,analytics:renderAnalytics,slots:renderSlots,settings:renderSettings}[curSection]||renderDashboard)();
}
