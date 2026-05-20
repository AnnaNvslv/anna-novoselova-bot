-- Добавляем колонки для Telegram бота

-- В таблицу patients
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

-- В таблицу appointments  
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS patient_chat_id BIGINT,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS confirmation_status TEXT DEFAULT NULL;
  -- confirmation_status: NULL | 'confirmed' | 'reschedule_requested' | 'cancelled'
