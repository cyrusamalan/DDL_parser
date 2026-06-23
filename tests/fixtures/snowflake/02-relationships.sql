-- Self-referential FK, multiple FKs to same target, forward-ref via ALTER TABLE.
-- Snowflake FKs are declared but not enforced by default.
CREATE TABLE accounts (
  account_id NUMBER AUTOINCREMENT,
  email VARCHAR(255) NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'personal',
  parent_id NUMBER,
  PRIMARY KEY (account_id),
  FOREIGN KEY (parent_id) REFERENCES accounts(account_id)
);

CREATE TABLE groups (
  group_id NUMBER AUTOINCREMENT,
  group_name VARCHAR(255) NOT NULL,
  owner_id NUMBER NOT NULL,
  created_by NUMBER,
  PRIMARY KEY (group_id),
  FOREIGN KEY (owner_id) REFERENCES accounts(account_id),
  FOREIGN KEY (created_by) REFERENCES accounts(account_id)
);

CREATE TABLE memberships (
  group_id NUMBER NOT NULL,
  account_id NUMBER NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  PRIMARY KEY (group_id, account_id),
  FOREIGN KEY (group_id) REFERENCES groups(group_id),
  FOREIGN KEY (account_id) REFERENCES accounts(account_id)
);

-- audit_log FK added later via ALTER TABLE (forward-reference pattern)
CREATE TABLE audit_log (
  log_id NUMBER AUTOINCREMENT,
  account_id NUMBER,
  action VARCHAR(100) NOT NULL,
  logged_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (log_id)
);

CREATE TABLE orders (
  order_id NUMBER AUTOINCREMENT,
  account_id NUMBER NOT NULL,
  group_id NUMBER,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  PRIMARY KEY (order_id),
  FOREIGN KEY (account_id) REFERENCES accounts(account_id),
  FOREIGN KEY (group_id) REFERENCES groups(group_id)
);

ALTER TABLE audit_log
  ADD CONSTRAINT fk_audit_account
  FOREIGN KEY (account_id) REFERENCES accounts(account_id);
