// ═══ CONFIG ═══
const SB_URL = 'https://ncfqiznpilikwmpqhapb.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jZnFpem5waWxpa3dtcHFoYXBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2MTE1MDQsImV4cCI6MjA5NDE4NzUwNH0.hAr40xwNbxHnuozUhIiH1QkHFqi44YUGFI410VWH8B4';
let db = null;
try { const { createClient } = window.supabase; db = createClient(SB_URL, SB_KEY); } catch(e) { console.error('Supabase init error', e); }

// ═══ CONSTANTS ═══
const APPT_TYPES = [
  { name: 'Первичный приём (подбор очков/МКЛ)', duration: 60 },
  { name: 'Повторный приём', duration: 60 },
  { name: 'Подбор КЛ с обучением', duration: 90 },
  { name: 'Помощь в оптике', duration: 30 },
  { name: 'Контрольный осмотр', duration: 15 },
];
const ORDER_STATUSES_NEW = ['оформлен'];
const ORDER_STATUSES_ALL = ['оформлен','в работе','готов','выдан','отменен','возврат','переделка'];
const CORR_TYPES = ['Очки для дали','Очки для компьютера','Очки для близи','Прогрессивные очки','Очки постоянного ношения','МКЛ'];
// Причины обращения — синхронизированы с анкетой booking.html
const VISIT_REASONS = [
  'Плановая проверка зрения',
  'Подбор очков для дали',
  'Подбор очков для близи/работы',
  'Подбор очков с прогрессивными линзами',
  'Нужны новые очки (старые не подходят/сломались/потерялись)',
  'Подбор контактных линз',
  'Подбор КЛ с обучением',
  'Сложности с адаптацией к очкам/КЛ',
  'Консультация по гигиене зрения и ношению очков/КЛ',
];
const SOURCES = ['Посоветовали друзья','ТГ канал','Реклама в Телеграм','Личное знакомство','Посоветовали коллеги'];
const STATUS_BADGE = { 'запланирован':'badge-blue','завершён':'badge-green','отменён':'badge-gray','оформлен':'badge-accent','в работе':'badge-blue','готов':'badge-warn','выдан':'badge-green','отменен':'badge-gray','возврат':'badge-red','переделка':'badge-warn' };


const APPT_TYPES_SR = {
  'Первичный приём (подбор очков/МКЛ)': 'Primarni pregled (naočare/KS)',
  'Повторный приём': 'Ponovni pregled',
  'Подбор КЛ с обучением': 'Izbor KS s obukom',
  'Помощь в оптике': 'Pomoć u optici',
  'Контрольный осмотр': 'Kontrolni pregled',
};
function apptTypeName(ru){ return (typeof _lang!=='undefined'&&_lang==='sr'&&APPT_TYPES_SR[ru])||ru; }

// ═══ STATE ═══
let role = null;
let curSection = 'dashboard';
let orderFilter = 'все';
let apptFilter = 'все';
let _calWeekOffset = 0;
let _modalDirty = false;
let _examData = { corrections: [] };
let _examTab = 'anamn';
let _cardTab = 'appts';
