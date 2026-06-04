// ═══ I18N ═══
let _lang = localStorage.getItem('crm_lang') || 'sr';

const TRANSLATIONS = {
  ru: {
    // NAV
    nav_dashboard: 'Главная', nav_patients: 'Пациенты', nav_appointments: 'Приёмы',
    nav_orders: 'Заказы', nav_analytics: 'Аналитика', nav_slots: 'Расписание', nav_settings: 'Настройки',
    role_admin: 'Администратор', role_staff: 'Сотрудник', role_ervin: 'Ervin',
    // COMMON
    loading: 'Загрузка...', save: 'Сохранить', cancel: 'Отмена', close: 'Закрыть',
    edit: 'Редактировать', delete: 'Удалить', add: 'Добавить', search: 'Поиск...',
    all: 'все', no_data: 'Нет данных', today: 'Сегодня', back: 'Назад', forward: 'Вперёд',
    confirm_delete: 'Удалить?', yes: 'Да', no: 'Нет', close_unsaved: 'Закрыть без сохранения?',
    saved: 'Сохранено', error: 'Ошибка', copied: 'Скопировано!',
    // DASHBOARD
    appts_today: 'Приёмов сегодня', orders_today: 'Заказов сегодня',
    ready_for_issue: 'Готовы к выдаче', revenue_month: 'Выручка / месяц',
    total_patients: 'Всего пациентов', planned: 'запланировано', issued_orders: 'выданные заказы',
    waiting: 'ждут пациента', in_base: 'в базе', all_appts: 'Все приёмы',
    today_section: 'Сегодня', upcoming: 'Ближайшие приёмы', no_appts: 'Нет приёмов', no_planned: 'Нет запланированных',
    done: 'Завершён', issue: 'Выдать', notify: 'Оповестить',
    // PATIENTS
    patients: 'Пациенты', patient: 'Пациент', new_patient: 'Новый пациент', edit_patient: 'Редактировать пациента',
    full_name: 'ФИО', phone: 'Телефон', email: 'Email', age: 'Возраст',
    dob: 'Дата рождения', source: 'Откуда узнал', notes: 'Заметки',
    card: 'Профиль',
    patient_profile: 'Профиль пациента',
    no_patients: 'Нет пациентов', added: 'Добавлен', updated: 'Обновлено', deleted: 'Удалено',
    add_appt_short: '+ Приём', add_order_short: '+ Заказ', add_patient_short: '+ Пациент',
    confirm_delete_patient: 'Удалить пациента со всеми данными?', enter_name: 'Введите имя',
    // APPOINTMENTS
    appointments: 'Приёмы', new_appt: 'Новый приём', edit_appt: 'Редактировать приём',
    appt_type: 'Вид приёма', date_time: 'Дата / Время', date: 'Дата', time: 'Время',
    cost: 'Стоимость', status: 'Статус', duration: 'Длительность', duration_min: 'мин.',
    appt_cost: 'Стоимость приёма (дин.)', notes_label: 'Примечание', notify_tg: 'Уведомить пациента в Telegram?',
    notify_yes: 'Да — отправить подтверждение', appt_saved: 'Приём записан', appt_updated: 'Приём обновлён',
    appt_done: 'Приём завершён', appt_cancelled: 'Приём отменён',
    confirm_complete: 'Отметить приём как завершённый?', confirm_cancel: 'Отменить приём?',
    status_planned: 'запланирован', status_done: 'завершён', status_cancelled: 'отменён',
    no_appts_table: 'Нет приёмов', fill_required: 'Заполните обязательные поля',
    // ORDERS
    orders: 'Заказы', new_order: 'Новый заказ', edit_order: 'Редактировать заказ',
    frame: 'Оправа', lenses: 'Линзы', work: 'Работа', total: 'Итого', prepayment: 'Предоплата',
    balance: 'Остаток', promised_date: 'Обещано', frame_code: 'Код оправы', lens_name: 'Линзы',
    order_status_new: 'оформлен', order_status_work: 'в работе', order_status_ready: 'готов',
    order_status_issued: 'выдан', order_status_cancelled: 'отменен', order_status_return: 'возврат', order_status_redo: 'переделка',
    no_orders: 'Нет заказов', confirm_delete_order: 'Удалить заказ?', issue_confirm: 'Остаток %s. Выдать?',
    order_type_glasses: 'Очки', order_type_cl: 'Контактные линзы', order_type_repair: 'Ремонт',
    order_number: '№ заказа',
    // CALENDAR
    schedule: 'Расписание', open_day: 'День', open_week: 'Неделя', my_slot: 'Моя запись',
    custom_slot: 'Свой слот', add_slot: 'Добавить слот', slot_open: 'Свободно', slot_remove: 'убрать',
    slot_take: 'занять', slot_patient: 'Пациент', slot_ervin: 'Занят Ervin',
    open_slots_day: 'Открыть слоты на день', slot_times: 'Время (каждый слот на новой строке)',
    open_slots_week: 'Открыть неделю', work_days: 'Рабочие дни', slots_opened: 'Открыто %s слотов',
    unbook_ervin: 'Снять бронь Ervin?', ervin_booking: 'Запись Ervin', patient_name_opt: 'Пациент (необязательно)',
    booking_added: 'Запись добавлена', slot_added: 'Слот добавлен', schedule_settings: 'Настройки расписания',
    // ANALYTICS
    analytics: 'Аналитика', admin_only: 'Только для администратора',
    revenue: 'Выручка / период', avg_check: 'Средний чек', total_orders: 'Всего заказов',
    my_salary: 'Моя зарплата / период', salary_calc: 'Расчёт зарплаты',
    appt_cost_salary: 'Стоимость приёмов (3000 дин. × %s):', orders_over: 'Заказы пациентов ≥10 000 дин. (×%s):',
    currency_din: 'дин.',
    ten_percent: '10% от суммы заказов:', salary_total: 'Итого к зарплате:', orders_by_status: 'Заказы по статусам',
    period_month: 'Месяц', period_week: 'Неделя', added_period: 'за период',
    // SETTINGS
    settings: 'Настройки', general: 'Основное', doctor_name: 'Имя врача', clinic_name: 'Название клиники',
    pin_codes: 'PIN-коды', admin_pin: 'PIN администратора', staff_pin: 'PIN сотрудника', ervin_pin: 'PIN Ervin',
    update_pin: 'Обновить PIN', pin_updated: 'PIN обновлён',
    work_start: 'Начало рабочего дня', work_end: 'Конец рабочего дня',
    appt_duration: 'Длительность приёма (мин)', break_between: 'Перерыв между приёмами (мин)',
    save_schedule: 'Сохранить расписание', schedule_saved: 'Расписание сохранено',
    export_data: 'Данные', export_json: '⬇ Экспорт JSON', export_done: 'Экспорт готов',
    tg_bot: 'Telegram-бот', tg_token: 'Токен бота', tg_botname: 'Имя бота (@username)',
    tg_mychat: 'Мой Chat ID', tg_save: 'Сохранить', tg_test: 'Тест', tg_find_id: 'Найти Chat ID',
    tg_saved: 'Токен сохранён', tg_sent: '📨 Отправлено!', tg_error: 'Ошибка — проверь токен',
    // EXAM
    exam_card: 'Карта обследования',
    exam_card_short: 'Карта',
    visit: 'Визит №', exam_reason: 'Причина обращения',
    complaints: 'Жалобы', anamnesis: 'Анамнез (со слов пациента)', current_correction: 'Используемая коррекция',
    autoref: 'Авторефрактометрия', exam_results: 'Результаты обследования',
    rx_far: 'Параметры для дали', rx_comp: 'Параметры для компьютера', rx_near: 'Параметры для близи', rx_cl: 'Параметры МКЛ',
    recommendations: 'Рекомендации и заключение', control_visit: 'Контрольный визит',
    save_card: 'Карта сохранена ✓', card_created: 'Карта создана ✓', save_error: 'Ошибка сохранения',
    autosave: 'Автосохранение ✓',
    btn_print: 'Печать', btn_save: 'Сохранить', btn_email_patient: 'Пациенту', btn_email_clinic: 'В оптику', btn_close: 'Закрыть',
    // DAYS & MONTHS
    dow: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
    months: ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'],
    months_gen: ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'],
    days_full: ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'],
    years: 'лет', logout: 'Выйти', prescription: 'Рецепт',
    nav_trash: 'Корзина', available_slots: 'Свободные слоты', trash_empty: 'Корзина пуста', empty_trash: 'Очистить корзину',
    restore: 'Восстановить', restored: 'Восстановлено', deleted_at: 'удалено',
    moved_to_trash: 'Перемещено в корзину', confirm_empty_trash: 'Удалить всё из корзины навсегда?',
    trash_emptied: 'Корзина очищена',
  },
  sr: {
    // NAV
    nav_dashboard: 'Početna', nav_patients: 'Pacijenti', nav_appointments: 'Pregledi',
    nav_orders: 'Porudžbine', nav_analytics: 'Analitika', nav_slots: 'Raspored', nav_settings: 'Podešavanja',
    role_admin: 'Administrator', role_staff: 'Zaposleni', role_ervin: 'Ervin',
    // COMMON
    loading: 'Učitavanje...', save: 'Sačuvaj', cancel: 'Otkaži', close: 'Zatvori',
    edit: 'Uredi', delete: 'Obriši', add: 'Dodaj', search: 'Pretraga...',
    all: 'sve', no_data: 'Nema podataka', today: 'Danas', back: 'Nazad', forward: 'Napred',
    confirm_delete: 'Obrisati?', yes: 'Da', no: 'Ne', close_unsaved: 'Zatvoriti bez čuvanja?',
    saved: 'Sačuvano', error: 'Greška', copied: 'Kopirano!',
    // DASHBOARD
    appts_today: 'Pregledi danas', orders_today: 'Porudžbine danas',
    ready_for_issue: 'Spremni za preuzimanje', revenue_month: 'Prihod / mesec',
    total_patients: 'Ukupno pacijenata', planned: 'zakazano', issued_orders: 'izdate porudžbine',
    waiting: 'čekaju pacijenta', in_base: 'u bazi', all_appts: 'Svi pregledi',
    today_section: 'Danas', upcoming: 'Naredni pregledi', no_appts: 'Nema pregleda', no_planned: 'Nema zakazanih',
    done: 'Završen', issue: 'Preuzmi', notify: 'Obavesti',
    // PATIENTS
    patients: 'Pacijenti', patient: 'Pacijent', new_patient: 'Novi pacijent', edit_patient: 'Uredi pacijenta',
    full_name: 'Ime i prezime', phone: 'Telefon', email: 'Email', age: 'Godine',
    dob: 'Datum rođenja', source: 'Kako je saznao', notes: 'Beleške',
    card: 'Profil',
    patient_profile: 'Profil pacijenta',
    no_patients: 'Nema pacijenata', added: 'Dodat', updated: 'Ažurirano', deleted: 'Obrisano',
    add_appt_short: '+ Pregled', add_order_short: '+ Porudžbina', add_patient_short: '+ Pacijent',
    confirm_delete_patient: 'Obrisati pacijenta sa svim podacima?', enter_name: 'Unesite ime',
    // APPOINTMENTS
    appointments: 'Pregledi', new_appt: 'Novi pregled', edit_appt: 'Uredi pregled',
    appt_type: 'Vrsta pregleda', date_time: 'Datum / Vreme', date: 'Datum', time: 'Vreme',
    cost: 'Cena', status: 'Status', duration: 'Trajanje', duration_min: 'min.',
    appt_cost: 'Cena pregleda (din.)', notes_label: 'Napomena', notify_tg: 'Obavestiti pacijenta na Telegram?',
    notify_yes: 'Da — pošalji potvrdu', appt_saved: 'Pregled zakazan', appt_updated: 'Pregled ažuriran',
    appt_done: 'Pregled završen', appt_cancelled: 'Pregled otkazan',
    confirm_complete: 'Označiti pregled kao završen?', confirm_cancel: 'Otkazati pregled?',
    status_planned: 'zakazan', status_done: 'završen', status_cancelled: 'otkazan',
    no_appts_table: 'Nema pregleda', fill_required: 'Popunite obavezna polja',
    // ORDERS
    orders: 'Porudžbine', new_order: 'Nova porudžbina', edit_order: 'Uredi porudžbinu',
    frame: 'Okvir', lenses: 'Sočiva', work: 'Obrada', total: 'Ukupno', prepayment: 'Avans',
    balance: 'Ostatak', promised_date: 'Obećano', frame_code: 'Šifra okvira', lens_name: 'Sočiva',
    order_status_new: 'kreirana', order_status_work: 'u izradi', order_status_ready: 'spreman',
    order_status_issued: 'izdata', order_status_cancelled: 'otkazana', order_status_return: 'povrat', order_status_redo: 'prepravka',
    no_orders: 'Nema porudžbina', confirm_delete_order: 'Obrisati porudžbinu?', issue_confirm: 'Ostatak %s. Preuzeti?',
    order_type_glasses: 'Naočare', order_type_cl: 'Kontaktna sočiva', order_type_repair: 'Popravka',
    order_number: 'Br. porudžbine',
    // CALENDAR
    schedule: 'Raspored', open_day: 'Dan', open_week: 'Nedelja', my_slot: 'Moj termin',
    custom_slot: 'Moj termin', add_slot: 'Dodaj termin', slot_open: 'Slobodan', slot_remove: 'ukloni',
    slot_take: 'zauzmi', slot_patient: 'Pacijent', slot_ervin: 'Zauzeo Ervin',
    open_slots_day: 'Otvoriti termine za dan', slot_times: 'Vreme (svaki termin u novom redu)',
    open_slots_week: 'Otvoriti nedelju', work_days: 'Radni dani', slots_opened: 'Otvoreno %s termina',
    unbook_ervin: 'Ukloniti rezervaciju Ervin?', ervin_booking: 'Termin Ervin', patient_name_opt: 'Pacijent (nije obavezno)',
    booking_added: 'Termin dodat', slot_added: 'Termin dodat', schedule_settings: 'Podešavanja rasporeda',
    // ANALYTICS
    analytics: 'Analitika', admin_only: 'Samo za administratora',
    revenue: 'Prihod / period', avg_check: 'Prosečna cena', total_orders: 'Ukupno porudžbina',
    my_salary: 'Moja plata / period', salary_calc: 'Obračun plate',
    appt_cost_salary: 'Cena pregleda (3000 din. × %s):', orders_over: 'Porudžbine pacijenata ≥10 000 din. (×%s):',
    currency_din: 'din.',
    ten_percent: '10% od iznosa porudžbina:', salary_total: 'Ukupna plata:', orders_by_status: 'Porudžbine po statusima',
    period_month: 'Mesec', period_week: 'Nedelja', added_period: 'za period',
    // SETTINGS
    settings: 'Podešavanja', general: 'Osnovno', doctor_name: 'Ime doktora', clinic_name: 'Naziv klinike',
    pin_codes: 'PIN-kodovi', admin_pin: 'PIN administratora', staff_pin: 'PIN zaposlenog', ervin_pin: 'PIN Ervin',
    update_pin: 'Ažuriraj PIN', pin_updated: 'PIN ažuriran',
    work_start: 'Početak radnog dana', work_end: 'Kraj radnog dana',
    appt_duration: 'Trajanje pregleda (min)', break_between: 'Pauza između pregleda (min)',
    save_schedule: 'Sačuvaj raspored', schedule_saved: 'Raspored sačuvan',
    export_data: 'Podaci', export_json: '⬇ Eksport JSON', export_done: 'Eksport spreman',
    tg_bot: 'Telegram-bot', tg_token: 'Token bota', tg_botname: 'Ime bota (@username)',
    tg_mychat: 'Moj Chat ID', tg_save: 'Sačuvaj', tg_test: 'Test', tg_find_id: 'Pronađi Chat ID',
    tg_saved: 'Token sačuvan', tg_sent: '📨 Poslato!', tg_error: 'Greška — proveri token',
    // EXAM
    exam_card: 'Optometrijska karta',
    exam_card_short: 'Karta',
    visit: 'Pregled br.', exam_reason: 'Razlog dolaska',
    complaints: 'Tegobe', anamnesis: 'Anamneza (po rečima pacijenta)', current_correction: 'Trenutna korekcija',
    autoref: 'Autorefraktometrija', exam_results: 'Rezultati pregleda',
    rx_far: 'Parametri za daljinu', rx_comp: 'Parametri za računar', rx_near: 'Parametri za blizinu', rx_cl: 'Parametri KSL',
    recommendations: 'Preporuke i zaključak', control_visit: 'Kontrolni pregled',
    save_card: 'Karta sačuvana ✓', card_created: 'Karta kreirana ✓', save_error: 'Greška pri čuvanju',
    autosave: 'Automatski sačuvano ✓',
    btn_print: 'Štampaj', btn_save: 'Sačuvaj', btn_email_patient: 'Pacijentu', btn_email_clinic: 'Optici', btn_close: 'Zatvori',
    // DAYS & MONTHS
    dow: ['Ned','Pon','Uto','Sre','Čet','Pet','Sub'],
    months: ['januar','februar','mart','april','maj','jun','jul','avgust','septembar','oktobar','novembar','decembar'],
    months_gen: ['januara','februara','marta','aprila','maja','juna','jula','avgusta','septembra','oktobra','novembra','decembra'],
    days_full: ['nedelja','ponedeljak','utorak','sreda','četvrtak','petak','subota'],
    years: 'god.', logout: 'Izlaz', prescription: 'Recept',
    nav_trash: 'Korpa', available_slots: 'Slobodni termini', trash_empty: 'Korpa je prazna', empty_trash: 'Isprazni korpu',
    restore: 'Vrati', restored: 'Vraćeno', deleted_at: 'obrisano',
    moved_to_trash: 'Premješteno u korpu', confirm_empty_trash: 'Trajno obrisati sve iz korpe?',
    trash_emptied: 'Korpa ispraznjena',
  }
};


// Status label maps (DB value → display)
const STATUS_SR = {
  'запланирован':'zakazan','завершён':'završen','отменён':'otkazan',
  'оформлен':'kreirana','в работе':'u izradi','готов':'spreman',
  'выдан':'izdata','отменен':'otkazana','возврат':'povrat','переделка':'prepravka',
  'u korpi':'u korpi'
};
const STATUS_RU = {
  'запланирован':'запланирован','завершён':'завершён','отменён':'отменён',
  'оформлен':'оформлен','в работе':'в работе','готов':'готов',
  'выдан':'выдан','отменен':'отменен','возврат':'возврат','переделка':'переделка',
  'u korpi':'в корзине'
};
function statusLabel(s){ return (_lang==='sr'?STATUS_SR:STATUS_RU)[s]||s; }

function t(key) {
  return TRANSLATIONS[_lang]?.[key] ?? TRANSLATIONS.ru?.[key] ?? key;
}

function switchLang(lang) {
  _lang = lang;
  localStorage.setItem('crm_lang', lang);
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.style.fontWeight = b.dataset.lang === lang ? '800' : '400';
    b.style.color = b.dataset.lang === lang ? 'white' : 'rgba(255,255,255,.5)';
  });
  _refreshStaticUI();
  render();
}

function _refreshStaticUI() {
  // Sidebar nav labels
  const navMap = {dashboard:'nav_dashboard',patients:'nav_patients',appointments:'nav_appointments',
    orders:'nav_orders',analytics:'nav_analytics',slots:'nav_slots',settings:'nav_settings',trash:'nav_trash'};
  Object.entries(navMap).forEach(([section, key]) => {
    const el = document.querySelector(`#nav-${section} .sb-label`);
    if (el) el.textContent = t(key);
  });
  // Role label
  const roleEl = document.getElementById('sb-role-label');
  if (roleEl) roleEl.textContent = t(`role_${role}`) || role;
}
