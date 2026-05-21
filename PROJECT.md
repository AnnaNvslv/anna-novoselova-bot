# Гинтер Оптика — CRM (контекст проекта)

Документ для разработчиков и LLM-ассистентов.

---

## Назначение

Веб-CRM для сербской оптики «Гинтер Оптика». Основной пользователь — **оптометрист Анна Новосёлова**. Ведёт пациентов, приёмы, карты обследования, заказы на очки/линзы, зарплату.

- Общее расписание с коллегой (роль `ervin`)
- Онлайн-запись пациентов — `booking.html`
- Уведомления в Telegram через бота `@optometrist_novoselova_bot`
- Двуязычный UI: сербский (default) и русский

Валюта: **сербский динар (дин.)**. Даты в UI: `ДД.ММ.ГГГГ`, в БД: ISO `YYYY-MM-DD`.

---

## Деплой

- **Репозиторий:** https://github.com/AnnaNvslv/anna-novoselova-bot
- **GitHub Pages:** https://annanvslv.github.io/anna-novoselova-bot/crm-v3.html
- **Booking:** https://annanvslv.github.io/anna-novoselova-bot/booking.html
- Деплой автоматический при пуше в `main`

---

## Технологии

| Слой | Решение |
|------|---------|
| Frontend | Один HTML-шелл + vanilla JS |
| Стили | Встроенный CSS в `crm-v3.html` |
| Backend / БД | Supabase (PostgreSQL + REST, JS client v2) |
| Supabase project | `ncfqiznpilikwmpqhapb` (anon key в `js/config.js`) |
| Edge Functions | Supabase Edge Functions (Deno) |
| Telegram Bot | `@optometrist_novoselova_bot` через Bot API webhook |
| PDF | html2pdf.js |
| Деплой | GitHub Pages |

---

## Структура файлов

```
crm-v3.html     # Shell: login, sidebar, мобильная навигация, весь CSS, порядок <script>
booking.html    # Публичная онлайн-запись
mobile.css      # ПУСТОЙ — не использовать
mobile.js       # ПУСТОЙ — не использовать
BOT_SETUP.md    # Инструкция по деплою бота
supabase/
  functions/
    telegram-bot/index.ts   # Webhook: /start, callback-кнопки
    send-reminders/index.ts # Cron: напоминания за 24ч и 1ч
  migrations/
    004_bot_columns.sql     # Колонки для бота
js/
  config.js     # Supabase client, константы, глобальный state
  i18n.js       # RU/SR переводы, switchLang()
  auth.js       # PIN login, showApp(), logout, deeplink #patient=ID
  router.js     # nav(section), render()
  utils.js      # fmt, fmtMoney, toast, modal, orderTotal, права
  dashboard.js  # Главная
  patients.js   # Список и карточка пациента
  appointments.js # Приёмы, слоты, статусы
  orders.js     # Заказы, RX, выдача
  exam.js       # Карта обследования, RX, печать/PDF
  calendar.js   # Недельная сетка слотов
  analytics.js  # Выручка и зарплата (только admin)
  settings.js   # Настройки клиники, PIN, Telegram, экспорт
  trash.js      # Мягкое удаление → корзина
  telegram.js   # tgSend(), recalcSalary()
  export.js     # JSON backup
```

---

## Роли и доступ

Вход по PIN (`js/auth.js`). PINы в таблице `settings`, fallback: admin=`1234`, staff=`0000`, ervin=`2222`.

| Роль | Права |
|------|Д|
| `admin` | Всё |
| `staff` | Ограниченное редактирование |
| `ervin` | Только расписание |

Сессия: `localStorage.crm_role`. Последний раздел: `localStorage.crm_section`. Язык: `localStorage.crm_lang`.

---

## Telegram-бот

### Бот
- Username: `@optometrist_novoselova_bot`
- Токен хранится в Supabase Edge Function Secret: `BOT_TOKEN`
- Webhook: `https://ncfqiznpilikwmpqhapb.supabase.co/functions/v1/telegram-bot`

### Архитектура

```
booking.html
  └─ после записи → кнопка «Написать боту»
       └─ ссылка: t.me/optometrist_novoselova_bot?start=appt_<APPOINTMENT_ID>

telegram-bot (Edge Function, webhook)
  ├─ /start appt_<ID>
  │    ├─ находит запись в appointments
  │    ├─ сохраняет telegram_chat_id + username в patients
  │    ├─ отправляет пациенту полное подтверждение записи
  │    └─ отправляет Анне уведомление:
  │         • имя пациента
  │         • @username пациента (ссылка в TG)
  │         • ссылка на профиль в CRM: crm-v3.html#patient=<UUID>
  └─ callback_query (кнопки напоминания)
       ├─ confirm_<ID>    → статус 'confirmed' + уведомление Анне
       ├─ reschedule_<ID> → статус 'reschedule_requested' + уведомление
       └─ cancel_<ID>     → статус 'cancelled', приём отменён + уведомление

send-reminders (Edge Function, cron каждые 30 мин)
  ├─ За 24ч до приёма → сообщение с 3 кнопками:
  │    ✅ Да, подтверждаю
  │    🔄 Не смогу, хочу перезаписаться
  │    ❌ Нет, отменить запись
  └─ За 1ч до приёма → короткое напоминание (текст)
```

### Deeplink в CRM

`auth.js` → `showApp()` проверяет `window.location.hash`:
- Если `#patient=<UUID>` → после рендера вызывает `openPatientCard(UUID)`
- Хэш убирается из URL через `history.replaceState`

### БД — дополнительные колонки

**`patients`:**
- `telegram_chat_id` BIGINT — сохраняется при первом /start

**`appointments`:**
- `patient_chat_id` BIGINT — дублируется для быстрого доступа
- `reminder_24h_sent` BOOLEAN DEFAULT FALSE
- `reminder_1h_sent` BOOLEAN DEFAULT FALSE
- `confirmation_status` TEXT — `NULL` | `confirmed` | `reschedule_requested` | `cancelled`

### Settings в БД (таблица `settings`)

| key | описание |
|-----|----------|
| `bot_token` | токен от @BotFather |
| `bot_username` | `optometrist_novoselova_bot` |
| `my_chat_id` | Telegram chat_id Анны (для уведомлений) |

### Cron

Supabase Database → Cron Jobs → задача `send-reminders`, расписание `*/30 * * * *`.

---

## Мобильная версия

### Архитектура (всё в `crm-v3.html`)

`mobile.css` и `mobile.js` — **пустые файлы**, не трогать.

### Нижняя навигация (`#mobile-nav`)

- Расположен в начале `<body>`, до `#login-screen`
- Скрыт на десктопе через CSS: `#mobile-nav { display: none }`
- На мобиле отображается через `@media(max-width:768px)` с `display:flex`
- Содержит **8 кнопок**: Главная, Пациенты, Приёмы, Заказы, График, Аналитика, Настройки, Korpa
- **Не управляется через JS** — только CSS media query

### JS (`_mobActive`)

Inline `<script>` в конце `<body>`:
- `_mobActive()` — подсвечивает активную кнопку по `window.curSection`
- Вызывается вручную в каждой кнопке `onclick="nav('...'); _mobActive()"`

### Адаптация экранов (`@media(max-width:768px)`)

- Модалки: `max-height: calc(100dvh - 58px)`, скролл внутри `modal-body`
- Формы: `font-size:16px` (предотвращает zoom на Android), `min-height:44px`
- Таблицы: `display:block` → карточки
- History items: кнопки переносятся на новую строку (`flex-direction:column`)
- rx-table: горизонтальный скролл (`overflow-x:auto`)
- Toast: `bottom:68px` — выше нижней навигации

### Печатная форма карты обследования

**Решение в `@media print`:**
```css
#print-area table  { display:table!important }
#print-area thead  { display:table-header-group!important }
#print-area tr     { display:table-row!important }
#print-area th, td { display:table-cell!important }
#print-area input, select, textarea, button { all:unset!important }
```

---

## Модель данных (Supabase)

### `patients`
ФИО, телефон, email, дата рождения, источник, `telegram_username`, `telegram_chat_id`, заметки. Мягкое удаление: `deleted_at`.

### `appointments`
`patient_id`, `date`, `time`, `type`, `status` (`запланирован`|`завершён`|`отменён`), `consultation_price` (3000 дин.), `appointment_number`, `patient_chat_id`, `reminder_24h_sent`, `reminder_1h_sent`, `confirmation_status`.

### `available_slots`
`date`, `start_time`, `is_booked`, `appointment_id`, `booked_by` (`null`|`'ervin'`), `ervin_note`.

Слоты (времена): 09:15, 10:30, 11:45, 13:00, 14:15, 15:30, 16:45.

### `examinations`
Анамнез, RX (даль/компьютер/близь/МКЛ), `visit_number`, `appointment_id`, `patient_id`. Автосохранение каждые 2 мин.

### `orders`
`frame_price`, `lens_price` (×2 в orderTotal), `work_price`, предоплата, статус, тип коррекции.  
`orderTotal = frame_price + lens_price*2 + work_price`  
Статусы: `оформлен` → `в работе` → `готов` → `выдан`

### `settings`
Key-value: `doctor_name`, `clinic_name`, часы работы, PINы, `bot_token`, `bot_username`, `my_chat_id`.

---

## Логика слотов и записи

### Два пути записи — оба бронируют слот

**1. Через `booking.html` (пациент сам):**
- Пациент выбирает слот → `available_slots.is_booked = true`, `appointment_id` заполняется
- Создаётся запись в `appointments`

**2. Через CRM — кнопка `+приём` на свободном слоте (admin):**
- Клик по зелёному слоту → `openAddAppointmentAtSlot(date, time, slotId)`
- `slotId` сохраняется в `window._pickedSlotId`
- При сохранении (`saveAppt`): `available_slots.is_booked = true`, `appointment_id = apptId`

**Fallback при ручном вводе даты/времени:**
- `bookSlotByDateTime(date, time, apptId)` — ищет слот по дате+времени, бронирует если найден

### При отмене/удалении приёма:
```js
await db.from('available_slots')
  .update({ is_booked: false, appointment_id: null })
  .eq('appointment_id', id);
```

### Известный баг (исправлен 2026-05-20)
В `calendar.js` в функции `bookErvinAt` была синтаксическая ошибка — незакрытый шаблонный литерал, из-за чего `calendar.js` падал с SyntaxError и страница расписания не загружалась.

---

## Расчёт зарплаты

1. Сумма `consultation_price` по приёмам месяца
2. Если сумма заказов пациента за месяц **≥ 10 000 дин.** → `counts_for_salary=true`
3. **+10%** от таких заказов

---

## Соглашения

1. Не ломать глобальные функции: `nav()`, `openPatientCard()`, `saveExam()`
2. Мобильное — только в `crm-v3.html`, **НЕ** в `mobile.css`/`mobile.js`
3. Мягкое удаление: `deleted_at`, фильтр `.is('deleted_at', null)`
4. i18n: новые строки в `TRANSLATIONS.ru` и `TRANSLATIONS.sr` в `i18n.js`
5. Деньги: `fmtMoney()`, расчёт через `orderTotal()` из `utils.js`
6. Скрипты: `?v=10` (auth.js — `?v=12`)
7. Нет сборщика, TypeScript, тестов — правки напрямую в `.js`

---

## Владелец

**Анна Новосёлова**, оптометрист, Гинтер Оптика, Нови Сад, Сербия.
