// ═══ BUDGET CONFIG ═══
const SB_URL = 'https://ncfqiznpilikwmpqhapb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnFpem5waWxpa3dtcHFoYXBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTE1MDQsImV4cCI6MjA5NDE4NzUwNH0.hAr40xwNbxHnuozUhIiH1QkHFqi44YUGFI410VWH8B4';
let bdb = null;
try { const { createClient } = window.supabase; bdb = createClient(SB_URL, SB_KEY); } catch(e) { console.error('Supabase init error', e); }
let currentMonth = new Date().toISOString().substr(0, 7);
let rates = { eur: 117, usd: 108, rub: 1.25 };
let savingsTotal = 0;
const CURRENCIES = ['DIN', 'EUR', 'USD', 'RUB'];
const CURRENCY_SYMBOLS = { DIN: 'дин.', EUR: '€', USD: '$', RUB: '₽' };
function toDin(amount, currency) {
  if (!amount) return 0;
  const n = parseFloat(amount) || 0;
  switch (currency) {
    case 'EUR': return n * rates.eur;
    case 'USD': return n * rates.usd;
    case 'RUB': return n * rates.rub;
    default: return n;
  }
}
function fmtDin(n) { return Math.round(n || 0).toLocaleString('ru-RU') + ' дин.'; }
function fmtCur(n, currency) { const sym = CURRENCY_SYMBOLS[currency] || currency; return (parseFloat(n) || 0).toLocaleString('ru-RU') + ' ' + sym; }
const INCOME_SOURCES = [
  { id: 'anya_optica', label: 'Аня — оптика', icon: '👁', auto: true },
  { id: 'anya_other',  label: 'Аня — другое', icon: '💼', auto: false },
  { id: 'dima',        label: 'Дима',          icon: '👨', auto: false },
  { id: 'rent_house',  label: 'Аренда дома',   icon: '🏠', auto: false },
  { id: 'other',       label: 'Другое',        icon: '➕', auto: false },
];
const EXPENSE_CATEGORIES = ['Жильё','Садик','Занятия детские','Животные','Машина','Связь','Транспорт','Подписки','Аня','Ваня Концерта','Продукты','Дом','Другое'];
const EXPENSE_STATUS = {
  planned:  { label: 'Запланировано', color: '#94a3b8' },
  reserved: { label: 'Отложено',      color: '#f59e0b' },
  paid:     { label: 'Оплачено',      color: '#10b981' },
};
const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
function monthLabel(ym) { const [y, m] = ym.split('-'); return MONTHS_RU[+m - 1] + ' ' + y; }
function prevMonth(ym) { const d = new Date(ym + '-01'); d.setMonth(d.getMonth() - 1); return d.toISOString().substr(0, 7); }
function nextMonth(ym) { const d = new Date(ym + '-01'); d.setMonth(d.getMonth() + 1); return d.toISOString().substr(0, 7); }
async function loadRates() {
  const { data } = await bdb.from('budget_settings').select('key,value');
  if (!data) return;
  const s = {}; data.forEach(r => s[r.key] = r.value);
  rates.eur = parseFloat(s.rate_eur_din) || 117;
  rates.usd = parseFloat(s.rate_usd_din) || 108;
  rates.rub = parseFloat(s.rate_rub_din) || 1.25;
  savingsTotal = parseFloat(s.savings_total_din) || 0;
}
async function saveRates() {
  await Promise.all([
    bdb.from('budget_settings').upsert({ key: 'rate_eur_din', value: String(rates.eur) }),
    bdb.from('budget_settings').upsert({ key: 'rate_usd_din', value: String(rates.usd) }),
    bdb.from('budget_settings').upsert({ key: 'rate_rub_din', value: String(rates.rub) }),
  ]);
}
async function saveSavingsTotal() { await bdb.from('budget_settings').upsert({ key: 'savings_total_din', value: String(Math.round(savingsTotal)) }); }