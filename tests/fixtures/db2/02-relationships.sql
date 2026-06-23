-- Self-referential FK, multiple FKs to same target, forward-ref via ALTER TABLE.
-- Db2 enforces FK constraints by default.
CREATE TABLE accounts (
  account_id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  email VARCHAR(255) NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'personal',
  parent_id INTEGER,
  CONSTRAINT pk_accounts PRIMARY KEY (account_id),
  CONSTRAINT uq_accounts_email UNIQUE (email),
  CONSTRAINT fk_accounts_parent FOREIGN KEY (parent_id)
    REFERENCES accounts(account_id) ON DELETE SET NULL
) IN USERSPACE1;

CREATE TABLE groups (
  group_id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  group_name VARCHAR(255) NOT NULL,
  owner_id INTEGER NOT NULL,
  created_by INTEGER,
  CONSTRAINT pk_groups PRIMARY KEY (group_id),
  CONSTRAINT fk_groups_owner FOREIGN KEY (owner_id)
    REFERENCES accounts(account_id) ON DELETE RESTRICT,
  CONSTRAINT fk_groups_creator FOREIGN KEY (created_by)
    REFERENCES accounts(account_id) ON DELETE SET NULL
) IN USERSPACE1;

CREATE TABLE memberships (
  group_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  CONSTRAINT pk_memberships PRIMARY KEY (group_id, account_id),
  CONSTRAINT fk_memberships_group FOREIGN KEY (group_id)
    REFERENCES groups(group_id) ON DELETE CASCADE,
  CONSTRAINT fk_memberships_account FOREIGN KEY (account_id)
    REFERENCES accounts(account_id) ON DELETE CASCADE
) IN USERSPACE1;

-- audit_log FK added later via ALTER TABLE (forward-reference pattern)
CREATE TABLE audit_log (
  log_id BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  account_id INTEGER,
  action VARCHAR(100) NOT NULL,
  logged_at TIMESTAMP NOT NULL DEFAULT CURRENT TIMESTAMP,
  CONSTRAINT pk_audit_log PRIMARY KEY (log_id)
) IN USERSPACE1;

CREATE TABLE orders (
  order_id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  account_id INTEGER NOT NULL,
  group_id INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  CONSTRAINT pk_orders PRIMARY KEY (order_id),
  CONSTRAINT fk_orders_account FOREIGN KEY (account_id)
    REFERENCES accounts(account_id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_group FOREIGN KEY (group_id)
    REFERENCES groups(group_id) ON DELETE SET NULL
) IN USERSPACE1;

ALTER TABLE audit_log
  ADD CONSTRAINT fk_audit_account FOREIGN KEY (account_id)
  REFERENCES accounts(account_id) ON DELETE SET NULL;
