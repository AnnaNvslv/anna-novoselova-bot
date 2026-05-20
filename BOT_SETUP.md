# Настройка Telegram-бота

## 1. SQL-миграция (выполнить в Supabase → SQL Editor)

```sql
-- файл: supabase/migrations/004_bot_columns.sql
ALTER TABLE patients ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS patient_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT NULL;
```

## 2. Deploy Edge Functions

```bash
npx supabase functions deploy telegram-bot --no-verify-jwt
npx supabase functions deploy send-reminders
```

## 3. Secrets (Supabase → Edge Functions → Secrets)

```
BOT_TOKEN=<токен от @BotFather>
```

## 4. Webhook (заменить YOUR_PROJECT на ncfqiznpilikwmpqhapb)

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://ncfqiznpilikwmpqhapb.supabase.co/functions/v1/telegram-bot"
```

## 5. Cron для напоминаний (Supabase → Database → Cron Jobs)

```sql
-- Каждые 30 минут
select cron.schedule(
  'send-reminders',
  '*/30 * * * *',
  $$
  select net.http_post(
    url:='https://ncfqiznpilikwmpqhapb.supabase.co/functions/v1/send-reminders',
    headers:='{"Authorization": "Bearer <SUPABASE_SERVICE_ROLE_KEY>"}'
  );
  $$
);
```

## 6. Settings в БД (уже должны быть)

```sql
INSERT INTO settings (key, value) VALUES
  ('bot_username', '@your_bot_username'),
  ('bot_token', '<токен>'),
  ('my_chat_id', '<ваш chat_id>');
```

## Как работает flow

1. Пациент заполняет booking.html → запись создаётся
2. Показывается кнопка **«Написать боту»** → ссылка `t.me/BOT?start=appt_ID`
3. Бот получает /start, находит запись, сохраняет `chat_id` и `username`, отправляет подтверждение
4. Cron каждые 30 мин проверяет записи:
   - За 24ч → сообщение с кнопками подтверждения
   - За 1ч → короткое напоминание
5. Нажатие кнопок → callback → статус в БД + ответ пациенту + уведомление Анне
