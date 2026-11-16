-- 006: истории и «О себе» в Telegram для бизнеса — черновики на одобрение Анне
create table if not exists public.story_drafts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('bio','schedule','slots','frame','nosat')),
  for_date date not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','published','skipped','failed')),
  tg_message_id bigint,
  story_id bigint,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, for_date)
);
alter table public.story_drafts enable row level security;
-- политик нет: доступ только у Edge Functions (service role)

-- График смен: неделя с anchor = weeks[0], следующая = weeks[1], дальше по кругу
insert into public.settings(key, value) values
  ('work_schedule', '{"anchor":"2026-11-16","weeks":[{"wd":"13:00–20:00","sat":"9:00–14:00"},{"wd":"9:00–16:00","sat":null}]}'),
  ('story_slot_days', '[2,4]'),
  ('bio_base', 'Запись на подбор очков и помощь в оптике: zapis.optometrist.rs Сайт: optometrist.rs')
on conflict (key) do nothing;

-- Черновики каждый день кроме воскресенья в 9:05 по Белграду (функция сама проверяет местный час)
select cron.schedule('stories-daily', '5 7,8 * * 1-6', $$
  select net.http_post(
    url := 'https://ncfqiznpilikwmpqhapb.supabase.co/functions/v1/stories',
    -- тот же ключ, что у задачи order-notify (чтобы не хранить его в репозитории)
    headers := jsonb_build_object('Authorization', 'Bearer ' || (select (regexp_match(command, 'Bearer ([A-Za-z0-9._-]+)'))[1] from cron.job where jobname = 'order-notify'), 'Content-Type', 'application/json'),
    body := '{"action":"daily"}'::jsonb
  );
$$);
