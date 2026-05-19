# Гинтер Оптика — CRM (контекст проекта)

Документ для разработчиков и LLM-ассистентов.

---

## Назначение

Веб-CRM для сербской оптики «Гинтер Оптика». Основной пользователь — **оптометрист Анна Новосёлова**. Ведёт пациентов, приёмы, карты обследования, заказы на очки/линзы, зарплату.

- Общее расписание с коллегой (роль `ervin`)
- Онлайн-запись пациентов — `booking.html`
- Уведомления в Telegram
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
| PDF | html2pdf.js |
| Деплой | GitHub Pages |

---

## Структура файлов

```
crm-v3.html     # Shell: login, sidebar, мобильная навигация, весь CSS, порядок <script>
booking.html    # Публичная онлайн-запись
mobile.css      # ПУСТОЙ — не использовать
mobile.js       # ПУСТОЙ — не использовать
js/
  config.js     # Supabase client, константы, глобальный state
  i18n.js       # RU/SR переводы, switchLang()
  auth.js       # PIN login, showApp(), logout
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
|------|-------|
| `admin` | Всё |
| `staff` | Ограниченное редактирование |
| `ervin` | Только расписание |

Сессия: `localStorage.crm_role`. Последний раздел: `localStorage.crm_section`. Язык: `localStorage.crm_lang`.

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
- На экране логина не видна: `#login-screen` покрывает весь экран через `position:fixed; inset:0; z-index:999`

### JS (`_mobActive`)

Inline `<script>` в конце `<body>`:
- `_mobActive()` — подсвечивает активную кнопку по `window.curSection`
- Вызывается вручную в каждой кнопке `onclick="nav('...'); _mobActive()"`
- `curSection` устанавливается в `router.js`

### Адаптация экранов (`@media(max-width:768px)`)

- Модалки: `max-height: calc(100dvh - 58px)`, скролл внутри `modal-body`, футер всегда виден
- Формы: `font-size:16px` (предотвращает zoom на Android), `min-height:44px`
- Таблицы: `display:block` → карточки
- History items: кнопки переносятся на новую строку (`flex-direction:column`)
- rx-table (карта обследования): горизонтальный скролл (`overflow-x:auto`)
- Toast: `bottom:68px` — выше нижней навигации
- `#app`: `padding-bottom:58px` — контент не уходит под nav

### Печатная форма карты обследования

**Проблема была:** мобильный CSS `table,thead,tbody,th,td,tr{display:block!important}` применялся при печати, ломая таблицы.

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
ФИО, телефон, email, дата рождения, источник, Telegram, заметки. Мягкое удаление: `deleted_at`.

### `appointments`
`patient_id`, `date`, `time`, `type`, `status` (`запланирован`|`завершён`|`отменён`), `consultation_price` (3000 дин.), `appointment_number`.

### `available_slots`
`date`, `start_time`, `is_booked`, `appointment_id`, `booked_by` (`null`|`'ervin'`), `ervin_note`.

### `examinations`
Анамнез, RX (даль/компьютер/близь/МКЛ), `visit_number`, `appointment_id`, `patient_id`. Автосохранение каждые 2 мин.

### `orders`
`frame_price`, `lens_price` (×2 в orderTotal), `work_price`, предоплата, статус, тип коррекции.  
`orderTotal = frame_price + lens_price*2 + work_price`  
Статусы: `оформлен` → `в работе` → `готов` → `выдан`

### `settings`
Key-value: `doctor_name`, `clinic_name`, часы работы, PINы, `bot_token`, `bot_username`, `my_chat_id`.

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
6. Скрипты: `?v=9` (auth.js — `?v=11`)
7. Нет сборщика, TypeScript, тестов — правки напрямую в `.js`

---

## Владелец

**Анна Новосёлова**, оптометрист, Гинтер Оптика, Нови Сад, Сербия.
