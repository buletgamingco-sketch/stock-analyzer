-- Run this once against your Vercel Postgres database.
-- (Vercel dashboard → Storage → your DB → Query, paste, run.)

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  stripe_customer TEXT,
  sub_status      TEXT DEFAULT 'none',     -- none | active | canceled | past_due
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usage (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period    TEXT NOT NULL,                 -- 'YYYY-MM'
  cents     DOUBLE PRECISION DEFAULT 0,    -- accumulated API spend this period
  PRIMARY KEY (user_id, period)
);
