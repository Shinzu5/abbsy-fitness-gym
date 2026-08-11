CREATE TABLE IF NOT EXISTS membership_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(100) NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS members (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(200) NOT NULL,
  contact_number VARCHAR(50) NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES membership_plans(id),
  start_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_sales_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  total_sales NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_sales >= 0),
  transaction_count INTEGER NOT NULL DEFAULT 0 CHECK (transaction_count >= 0),
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NULL REFERENCES members(id) ON DELETE SET NULL,
  customer_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  notes TEXT NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  daily_report_id INTEGER NULL REFERENCES daily_sales_reports(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_status_payment_date
  ON payments (status, payment_date);

CREATE INDEX IF NOT EXISTS idx_payments_daily_report_id
  ON payments (daily_report_id);

CREATE INDEX IF NOT EXISTS idx_memberships_member_id
  ON memberships (member_id);

CREATE INDEX IF NOT EXISTS idx_memberships_expiration_date
  ON memberships (expiration_date);

CREATE INDEX IF NOT EXISTS idx_members_full_name
  ON members (full_name);

CREATE INDEX IF NOT EXISTS idx_daily_sales_reports_report_date
  ON daily_sales_reports (report_date DESC);
