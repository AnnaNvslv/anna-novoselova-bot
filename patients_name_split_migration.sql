-- Разделение ФИО на Фамилию и Имя (для формы пациента).
-- name остаётся основным полем (используется везде по коду) — first_name/last_name
-- только для редактирования в форме. Идемпотентно, безопасно перезапускать.
-- УЖЕ ПРИМЕНЕНО напрямую через Supabase MCP в этой сессии (168 пациентов забэкфилены).
-- Файл добавлен в репо для документации/истории, повторно запускать не нужно.

alter table patients add column if not exists last_name text;
alter table patients add column if not exists first_name text;

-- Разовый бэкфилл существующих 168 пациентов: первое слово в name → last_name,
-- остальное → first_name (соответствует текущему соглашению "Фамилия Имя").
update patients
set
  last_name = split_part(trim(name), ' ', 1),
  first_name = trim(substring(trim(name) from length(split_part(trim(name), ' ', 1)) + 1))
where last_name is null and first_name is null and name is not null and trim(name) <> '';
