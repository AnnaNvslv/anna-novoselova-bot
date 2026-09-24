-- ═══════════════════════════════════════════════════════════════════
-- 005 — Повторные записи: один пациент = одна карточка
-- Запускать целиком в Supabase → SQL Editor. Скрипт можно запускать повторно.
--
-- 1) appointments.intake — анкета онлайн-записи хранится в КАЖДОЙ записи,
--    а не затирается в карточке пациента.
-- 2) find_or_create_patient(p) — онлайн-запись ищет пациента по
--    фамилии+имени+дате рождения и прикрепляет запись к нему.
-- 3) merge_patients(keep, drop) — ручное объединение дублей из CRM.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. Анкета в записи ───────────────────────────────────────────────
alter table public.appointments add column if not exists intake jsonb;

-- Перенос уже существующих анкет: анкета пациента → в его самую раннюю запись
-- (раньше каждая онлайн-запись создавала нового пациента, так что анкета
-- пациента = анкета его первой записи).
update public.appointments a
set intake = jsonb_strip_nulls(jsonb_build_object(
  'visit_reason',       p.visit_reason,
  'complaints',         p.complaints,
  'correction_types',   p.correction_types,
  'approx_diopters',    p.approx_diopters,
  'eye_diseases',       p.eye_diseases,
  'eye_diseases_other', p.eye_diseases_other,
  'eye_surgeries',      p.eye_surgeries,
  'eye_surgery_year',   p.eye_surgery_year,
  'general_diseases',   p.general_diseases,
  'visual_loads',       p.visual_loads,
  'pre_notes',          p.pre_notes,
  'promo_code',         p.promo_code,
  'kids_questionnaire', p.kids_questionnaire
))
from public.patients p
where a.patient_id = p.id
  and a.intake is null
  and a.id = (select a2.id from public.appointments a2
              where a2.patient_id = p.id
              order by a2.created_at asc limit 1)
  and (coalesce(array_length(p.visit_reason,1),0) > 0
       or coalesce(array_length(p.complaints,1),0) > 0
       or p.kids_questionnaire is not null
       or p.pre_notes is not null);

-- ── 2. Нормализация имени ────────────────────────────────────────────
-- "  Ivanova   Maria " = "ivanova maria" = "Maria Ivanova"
-- (регистр, лишние пробелы и порядок слов не важны)
create or replace function public.norm_patient_name(n text)
returns text language sql immutable as $$
  select coalesce(string_agg(w, ' ' order by w), '')
  from unnest(regexp_split_to_array(lower(trim(coalesce(n,''))), '\s+')) as w
  where w <> ''
$$;

create or replace function public.norm_tg(u text)
returns text language sql immutable as $$
  select nullif(lower(regexp_replace(trim(coalesce(u,'')), '^@', '')), '')
$$;

create or replace function public._jtext_arr(j jsonb)
returns text[] language sql immutable as $$
  select case when j is null or jsonb_typeof(j) <> 'array' then null
              else array(select jsonb_array_elements_text(j)) end
$$;

-- ── 3. Поиск / создание пациента при онлайн-записи ──────────────────
-- Вызывается с публичной страницы (anon). SECURITY DEFINER нужен, чтобы
-- искать по таблице patients, не открывая anon-ключу чтение всей таблицы.
-- Функция возвращает только id — никаких данных пациента наружу не отдаёт.
-- У существующего пациента заполняются ТОЛЬКО пустые поля: чужой человек,
-- знающий ФИО и дату рождения, не сможет подменить телефон/Telegram.
create or replace function public.find_or_create_patient(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id   uuid;
  v_name text := trim(regexp_replace(coalesce(p->>'name',''), '\s+', ' ', 'g'));
  v_key  text := public.norm_patient_name(p->>'name');
  v_dob  date := nullif(p->>'dob','')::date;
  v_tg   text := public.norm_tg(p->>'telegram_username');
begin
  if v_key = '' then
    raise exception 'name is required';
  end if;

  -- a) точное совпадение: ФИО + дата рождения
  if v_dob is not null then
    select id into v_id from patients
    where deleted_at is null
      and dob = v_dob
      and public.norm_patient_name(name) = v_key
    order by created_at asc
    limit 1;
  end if;

  -- b) в старой карточке нет даты рождения (заведена вручную) —
  --    тогда ФИО + тот же Telegram
  if v_id is null and v_tg is not null then
    select id into v_id from patients
    where deleted_at is null
      and dob is null
      and public.norm_patient_name(name) = v_key
      and public.norm_tg(telegram_username) = v_tg
    order by created_at asc
    limit 1;
  end if;

  if v_id is not null then
    update patients set
      dob               = coalesce(dob, v_dob),
      phone             = coalesce(nullif(phone,''), nullif(p->>'phone','')),
      telegram_username = coalesce(nullif(telegram_username,''), nullif(p->>'telegram_username','')),
      last_name         = coalesce(nullif(last_name,''), nullif(p->>'last_name','')),
      first_name        = coalesce(nullif(first_name,''), nullif(p->>'first_name','')),
      source            = coalesce(nullif(source,''), nullif(p->>'source','')),
      is_first_visit    = false
    where id = v_id;
    return v_id;
  end if;

  insert into patients (
    name, last_name, first_name, dob, phone, telegram_username,
    visit_reason, complaints, correction_types, approx_diopters,
    eye_diseases, eye_diseases_other, eye_surgeries, eye_surgery_year,
    general_diseases, visual_loads, pre_notes, source, promo_code,
    kids_questionnaire, data_consent, accuracy_consent, is_first_visit
  ) values (
    v_name, nullif(p->>'last_name',''), nullif(p->>'first_name',''), v_dob,
    nullif(p->>'phone',''), nullif(p->>'telegram_username',''),
    public._jtext_arr(p->'visit_reason'), public._jtext_arr(p->'complaints'),
    public._jtext_arr(p->'correction_types'), nullif(p->>'approx_diopters',''),
    public._jtext_arr(p->'eye_diseases'), nullif(p->>'eye_diseases_other',''),
    public._jtext_arr(p->'eye_surgeries'), nullif(p->>'eye_surgery_year',''),
    public._jtext_arr(p->'general_diseases'), public._jtext_arr(p->'visual_loads'),
    nullif(p->>'pre_notes',''), nullif(p->>'source',''), nullif(p->>'promo_code',''),
    case when jsonb_typeof(p->'kids_questionnaire') = 'object' then p->'kids_questionnaire' end,
    coalesce((p->>'data_consent')::boolean, true),
    coalesce((p->>'accuracy_consent')::boolean, true),
    true
  )
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.find_or_create_patient(jsonb) from public;
grant execute on function public.find_or_create_patient(jsonb) to anon, authenticated;

-- ── 4. Объединение двух карточек (только из CRM) ─────────────────────
-- Всё из drop переносится в keep, drop уходит в корзину (deleted_at).
create or replace function public.merge_patients(keep_id uuid, drop_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  k patients%rowtype;
  d patients%rowtype;
  n_appt int; n_exam int; n_ord int;
begin
  if keep_id is null or drop_id is null or keep_id = drop_id then
    raise exception 'Нужны два разных пациента';
  end if;
  select * into k from patients where id = keep_id for update;
  select * into d from patients where id = drop_id for update;
  if k.id is null or d.id is null then
    raise exception 'Пациент не найден';
  end if;

  -- анкета drop-пациента ещё не перенесена в его запись — переносим,
  -- чтобы не потерять её после объединения
  update appointments a set intake = jsonb_strip_nulls(jsonb_build_object(
    'visit_reason', d.visit_reason, 'complaints', d.complaints,
    'correction_types', d.correction_types, 'approx_diopters', d.approx_diopters,
    'eye_diseases', d.eye_diseases, 'eye_diseases_other', d.eye_diseases_other,
    'eye_surgeries', d.eye_surgeries, 'eye_surgery_year', d.eye_surgery_year,
    'general_diseases', d.general_diseases, 'visual_loads', d.visual_loads,
    'pre_notes', d.pre_notes, 'promo_code', d.promo_code,
    'kids_questionnaire', d.kids_questionnaire))
  where a.id = (select id from appointments where patient_id = drop_id order by created_at asc limit 1)
    and a.intake is null
    and (coalesce(array_length(d.visit_reason,1),0) > 0
         or coalesce(array_length(d.complaints,1),0) > 0
         or d.kids_questionnaire is not null or d.pre_notes is not null);

  update appointments set patient_id = keep_id where patient_id = drop_id;
  get diagnostics n_appt = row_count;
  update examinations set patient_id = keep_id where patient_id = drop_id;
  get diagnostics n_exam = row_count;
  update orders set patient_id = keep_id where patient_id = drop_id;
  get diagnostics n_ord = row_count;

  -- пустые поля основной карточки заполняем из дубля
  update patients set
    dob                = coalesce(k.dob, d.dob),
    phone              = coalesce(nullif(k.phone,''), nullif(d.phone,'')),
    email              = coalesce(nullif(k.email,''), nullif(d.email,'')),
    telegram_username  = coalesce(nullif(k.telegram_username,''), nullif(d.telegram_username,'')),
    telegram_chat_id   = coalesce(nullif(k.telegram_chat_id,''), nullif(d.telegram_chat_id,'')),
    last_name          = coalesce(nullif(k.last_name,''), nullif(d.last_name,'')),
    first_name         = coalesce(nullif(k.first_name,''), nullif(d.first_name,'')),
    source             = coalesce(nullif(k.source,''), nullif(d.source,'')),
    notes              = nullif(concat_ws(E'\n', nullif(k.notes,''), nullif(d.notes,'')), ''),
    visit_reason       = coalesce(k.visit_reason, d.visit_reason),
    complaints         = coalesce(k.complaints, d.complaints),
    correction_types   = coalesce(k.correction_types, d.correction_types),
    approx_diopters    = coalesce(k.approx_diopters, d.approx_diopters),
    eye_diseases       = coalesce(k.eye_diseases, d.eye_diseases),
    eye_diseases_other = coalesce(k.eye_diseases_other, d.eye_diseases_other),
    eye_surgeries      = coalesce(k.eye_surgeries, d.eye_surgeries),
    eye_surgery_year   = coalesce(k.eye_surgery_year, d.eye_surgery_year),
    general_diseases   = coalesce(k.general_diseases, d.general_diseases),
    visual_loads       = coalesce(k.visual_loads, d.visual_loads),
    pre_notes          = coalesce(k.pre_notes, d.pre_notes),
    kids_questionnaire = coalesce(k.kids_questionnaire, d.kids_questionnaire),
    is_first_visit     = false
  where id = keep_id;

  -- номера визитов по порядку
  update examinations e set visit_number = r.rn
  from (select id, row_number() over (order by created_at) as rn
        from examinations where patient_id = keep_id) r
  where e.id = r.id;

  update patients set
    deleted_at = now(),
    notes = concat_ws(E'\n', nullif(d.notes,''),
      'Объединён с ' || coalesce(k.patient_code, k.name) || ' (' || to_char(now(),'DD.MM.YYYY') || ')')
  where id = drop_id;

  return jsonb_build_object('appointments', n_appt, 'examinations', n_exam, 'orders', n_ord);
end;
$$;

revoke all on function public.merge_patients(uuid, uuid) from public, anon;
grant execute on function public.merge_patients(uuid, uuid) to authenticated;
