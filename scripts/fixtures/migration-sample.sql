CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS onboarding_step CASCADE;

CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid AS $$
BEGIN
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE TYPE onboarding_step AS ENUM ('plan_selection', 'phone_unverified', 'complete');
CREATE TYPE signal_type AS ENUM ('RSI_OVERSOLD', 'RSI_OVERBOUGHT');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL UNIQUE,
  onboarding_step onboarding_step NOT NULL DEFAULT 'plan_selection',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_clerk ON users (clerk_user_id);

CREATE TABLE alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  signal_types signal_type[] NOT NULL,
  active_days SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}'
);

CREATE TABLE brokerage_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  UNIQUE NULLS NOT DISTINCT (user_id, ticker)
);

CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE signal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_preference_id UUID REFERENCES alert_preferences(id) ON DELETE SET NULL
);

CREATE TABLE ticker_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  article_ids UUID[] NOT NULL DEFAULT '{}'
);

CREATE TABLE call_signals (
  call_log_id UUID NOT NULL REFERENCES call_logs(id) ON DELETE CASCADE,
  signal_event_id UUID NOT NULL REFERENCES signal_events(id) ON DELETE CASCADE,
  PRIMARY KEY (call_log_id, signal_event_id)
);
