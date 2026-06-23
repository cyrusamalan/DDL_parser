-- DDL stress fixture: migration-style deferred foreign keys
-- Phase 1: CREATE TABLE with PKs only. Phase 2: ALTER TABLE ADD CONSTRAINT FK.
-- Includes cross-schema refs, composite FK, ON DELETE variants, and one dangling FK.

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS billing;

CREATE TABLE auth.identities (
  identity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  UNIQUE (provider, external_id)
);

CREATE TABLE app.users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  identity_id UUID NOT NULL
);

CREATE TABLE app.profiles (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL
);

CREATE TABLE billing.accounts (
  account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL
);

CREATE TABLE billing.invoices (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE billing.invoice_lines (
  line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE app.projects (
  project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE app.project_members (
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE app.tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  assignee_user_id UUID,
  title TEXT NOT NULL
);

CREATE TABLE app.task_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  body TEXT NOT NULL
);

CREATE TABLE app.notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'
);

-- dangling target: legacy_sessions is never created
CREATE TABLE app.device_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  legacy_session_id UUID NOT NULL
);

ALTER TABLE app.users
  ADD CONSTRAINT fk_users_identity
  FOREIGN KEY (identity_id) REFERENCES auth.identities(identity_id) ON DELETE CASCADE;

ALTER TABLE app.profiles
  ADD CONSTRAINT fk_profiles_user
  FOREIGN KEY (user_id) REFERENCES app.users(user_id) ON DELETE CASCADE;

ALTER TABLE billing.accounts
  ADD CONSTRAINT fk_accounts_owner
  FOREIGN KEY (owner_user_id) REFERENCES app.users(user_id) ON DELETE CASCADE;

ALTER TABLE billing.invoices
  ADD CONSTRAINT fk_invoices_account
  FOREIGN KEY (account_id) REFERENCES billing.accounts(account_id) ON DELETE CASCADE;

ALTER TABLE billing.invoice_lines
  ADD CONSTRAINT fk_invoice_lines_invoice
  FOREIGN KEY (invoice_id) REFERENCES billing.invoices(invoice_id) ON DELETE CASCADE;

ALTER TABLE app.projects
  ADD CONSTRAINT fk_projects_owner
  FOREIGN KEY (owner_user_id) REFERENCES app.users(user_id) ON DELETE CASCADE;

ALTER TABLE app.project_members
  ADD CONSTRAINT fk_project_members_project
  FOREIGN KEY (project_id) REFERENCES app.projects(project_id) ON DELETE CASCADE;

ALTER TABLE app.project_members
  ADD CONSTRAINT fk_project_members_user
  FOREIGN KEY (user_id) REFERENCES app.users(user_id) ON DELETE CASCADE;

ALTER TABLE app.tasks
  ADD CONSTRAINT fk_tasks_project
  FOREIGN KEY (project_id) REFERENCES app.projects(project_id) ON DELETE CASCADE;

ALTER TABLE app.tasks
  ADD CONSTRAINT fk_tasks_assignee
  FOREIGN KEY (assignee_user_id) REFERENCES app.users(user_id) ON DELETE SET NULL;

ALTER TABLE app.task_comments
  ADD CONSTRAINT fk_task_comments_task
  FOREIGN KEY (task_id) REFERENCES app.tasks(task_id) ON DELETE CASCADE;

ALTER TABLE app.task_comments
  ADD CONSTRAINT fk_task_comments_author
  FOREIGN KEY (author_user_id) REFERENCES app.users(user_id) ON DELETE CASCADE;

ALTER TABLE app.notifications
  ADD CONSTRAINT fk_notifications_user
  FOREIGN KEY (user_id) REFERENCES app.users(user_id) ON DELETE CASCADE;

ALTER TABLE app.device_tokens
  ADD CONSTRAINT fk_device_tokens_user
  FOREIGN KEY (user_id) REFERENCES app.users(user_id) ON DELETE CASCADE;

ALTER TABLE app.device_tokens
  ADD CONSTRAINT fk_device_tokens_legacy_session
  FOREIGN KEY (legacy_session_id) REFERENCES app.legacy_sessions(session_id) ON DELETE CASCADE;

-- composite FK (walker emits first column pair only)
ALTER TABLE billing.invoice_lines
  ADD CONSTRAINT fk_invoice_lines_composite_member
  FOREIGN KEY (invoice_id, sku) REFERENCES app.project_members(project_id, user_id);
