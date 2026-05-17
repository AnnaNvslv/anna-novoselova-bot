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
const VISIT_REASONS = ['Подбор очков','Замена очков','Подбор контактных линз','Контрольный осмотр','Жалобы на зрение','Проверка зрения','Другое'];
const SOURCES = ['Посоветовали друзья','ТГ канал','Реклама в Телеграм','Личное знакомство','Посоветовали коллеги'];
const STATUS_BADGE = { 'запланирован':'badge-blue','завершён':'badge-green','отменён':'badge-gray','оформлен':'badge-accent','в работе':'badge-blue','готов':'badge-warn','выдан':'badge-green','отменен':'badge-gray','возврат':'badge-red','переделка':'badge-warn' };

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
