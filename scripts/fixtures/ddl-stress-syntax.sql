-- DDL stress fixture: sanitizer + parser edge cases
-- Expected sanitize notes: stripped non-table statements, enum→TEXT, UUID[]/JSONB[]→TEXT,
-- UNIQUE NULLS NOT DISTINCT normalized, reserved table names quoted.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
DROP TABLE IF EXISTS employees CASCADE;

CREATE OR REPLACE FUNCTION audit_default_label()
RETURNS text AS $$
BEGIN
  RETURN 'auto;generated;label';
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE TYPE account_status AS ENUM ('active', 'suspended', 'closed');
CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'critical');

/* block comment with ; semicolon ; inside */
-- line comment before first table

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE UNLOGGED TABLE session_scratch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payload JSONB NOT NULL DEFAULT '{}'
);

CREATE TEMP TABLE import_staging (
  row_id BIGINT PRIMARY KEY,
  raw_line TEXT NOT NULL
);

CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id),
  manager_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  status account_status NOT NULL DEFAULT 'active'::account_status,
  badge_codes UUID[] NOT NULL DEFAULT '{}',
  tags JSONB[] NOT NULL DEFAULT '{}',
  note TEXT NOT NULL DEFAULT $label$line one; line two$label$
);

CREATE TABLE "group" (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE SCHEMA IF NOT EXISTS billing;

CREATE TABLE billing.order (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_ref TEXT NOT NULL,
  priority_levels priority_level[] NOT NULL DEFAULT '{}',
  UNIQUE NULLS NOT DISTINCT (customer_ref)
);

CREATE TABLE "Audit Log" (
  id BIGSERIAL PRIMARY KEY,
  actor TEXT NOT NULL,
  event_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- isolated table (no FKs) for hide-isolated-tables testing
CREATE TABLE feature_flags (
  flag_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_employees_department ON employees (department_id);
CREATE VIEW active_employees AS SELECT id FROM employees WHERE status = 'active'::account_status;
INSERT INTO departments (name) VALUES ('Engineering');
GRANT SELECT ON employees TO PUBLIC;
