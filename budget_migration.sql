-- ═══ BUDGET TABLES — выполнить в Supabase SQL Editor ═══

CREATE TABLE IF NOT EXISTS budget_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS budget_income (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  source TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'DIN',
  amount_din NUMERIC DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'DIN',
  amount_din NUMERIC DEFAULT 0,
  is_recurring BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'planned',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_savings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month TEXT NOT NULL,
  action TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'DIN',
  amount_din NUMERIC DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_recurring (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,
  amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'DIN',
  note TEXT,
  every_months INTEGER DEFAULT 1,
  active BOOLEAN DEFAULT TRUE
);

INSERT INTO budget_settings (key, value) VALUES
  ('rate_eur_din', '117'),
  ('rate_usd_din', '108'),
  ('rate_rub_din', '1.25'),
  ('savings_total_din', '0')
ON CONFLICT (key) DO NOTHING;

INSERT INTO budget_recurring (category, subcategory, amount, currency, every_months) VALUES
  ('Жильё', 'Аренда квартиры', 750, 'EUR', 1),
  ('Жильё', 'Информатика', 17000, 'DIN', 1),
  ('Жильё', 'Электричество', 9000, 'DIN', 1),
  ('Связь', 'Аня телефон', 1000, 'DIN', 1),
  ('Связь', 'Дима телефон', 1000, 'DIN', 1),
  ('Садик', 'Садик', 44000, 'DIN', 1),
  ('Ваня Концерта', 'Врач+таблетки', 8100, 'DIN', 2)
ON CONFLICT DO NOTHING;