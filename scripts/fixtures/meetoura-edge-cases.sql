CREATE TYPE onboarding_step AS ENUM ('plan_selection', 'complete');
CREATE TYPE signal_type AS ENUM ('RSI_OVERSOLD', 'RSI_OVERBOUGHT');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_step onboarding_step NOT NULL DEFAULT 'plan_selection'
);

CREATE TABLE alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signal_types signal_type[] NOT NULL
);

CREATE TABLE ticker_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_ids UUID[] NOT NULL DEFAULT '{}'
);

CREATE TABLE post_call_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_log_id UUID UNIQUE REFERENCES call_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  voice_call_session_id UUID UNIQUE REFERENCES voice_call_sessions(id) ON DELETE CASCADE,
  CONSTRAINT chk_pcs_one_source
    CHECK ((call_log_id IS NOT NULL) != (voice_call_session_id IS NOT NULL))
);

CREATE TABLE cron_locks (
  lock_name TEXT PRIMARY KEY,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
