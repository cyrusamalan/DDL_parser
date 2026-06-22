-- Self-referential FK, multiple FKs to same target, forward-ref via ALTER TABLE,
-- reserved-word table names (sanitizer should quote them), composite-PK junction table.
CREATE TYPE account_tier AS ENUM ('personal', 'business');

CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  tier account_tier NOT NULL DEFAULT 'personal',
  parent_id INTEGER REFERENCES accounts(id)
);

CREATE TABLE groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES accounts(id),
  created_by INTEGER REFERENCES accounts(id)
);

CREATE TABLE memberships (
  group_id INTEGER NOT NULL REFERENCES groups(id),
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  role TEXT NOT NULL DEFAULT 'member',
  PRIMARY KEY (group_id, account_id)
);

-- audit_log defined here but FK added later (forward-reference pattern via ALTER TABLE)
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  account_id INTEGER,
  action TEXT NOT NULL,
  resource_id INTEGER
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  group_id INTEGER REFERENCES groups(id),
  status TEXT NOT NULL DEFAULT 'pending'
);

ALTER TABLE audit_log
  ADD CONSTRAINT fk_audit_account
  FOREIGN KEY (account_id) REFERENCES accounts(id);
