-- Redshift FKs are informational (not enforced). Self-ref, multiple FKs to same target,
-- forward-ref via ALTER TABLE. DISTKEY and SORTKEY vary per table access pattern.
CREATE TABLE accounts (
  account_id BIGINT IDENTITY(1,1),
  email VARCHAR(320) NOT NULL ENCODE ZSTD,
  tier VARCHAR(20) NOT NULL DEFAULT 'personal' ENCODE BYTEDICT,
  parent_id BIGINT ENCODE DELTA,
  PRIMARY KEY (account_id),
  FOREIGN KEY (parent_id) REFERENCES accounts(account_id)
)
DISTSTYLE KEY DISTKEY (account_id)
SORTKEY (account_id);

CREATE TABLE groups (
  group_id BIGINT IDENTITY(1,1),
  group_name VARCHAR(255) NOT NULL ENCODE ZSTD,
  owner_id BIGINT NOT NULL ENCODE DELTA,
  created_by BIGINT ENCODE DELTA,
  PRIMARY KEY (group_id),
  FOREIGN KEY (owner_id) REFERENCES accounts(account_id),
  FOREIGN KEY (created_by) REFERENCES accounts(account_id)
)
DISTSTYLE KEY DISTKEY (group_id)
SORTKEY (group_id);

CREATE TABLE memberships (
  group_id BIGINT NOT NULL ENCODE DELTA,
  account_id BIGINT NOT NULL ENCODE DELTA,
  role VARCHAR(50) NOT NULL DEFAULT 'member' ENCODE BYTEDICT,
  PRIMARY KEY (group_id, account_id),
  FOREIGN KEY (group_id) REFERENCES groups(group_id),
  FOREIGN KEY (account_id) REFERENCES accounts(account_id)
)
DISTSTYLE KEY DISTKEY (group_id);

-- audit_log FK added later via ALTER TABLE (forward-reference pattern)
CREATE TABLE audit_log (
  log_id BIGINT IDENTITY(1,1),
  account_id BIGINT ENCODE DELTA,
  action VARCHAR(100) NOT NULL ENCODE ZSTD,
  logged_at TIMESTAMPTZ DEFAULT SYSDATE ENCODE RAW,
  PRIMARY KEY (log_id)
)
DISTSTYLE KEY DISTKEY (account_id)
COMPOUND SORTKEY (logged_at, account_id);

CREATE TABLE orders (
  order_id BIGINT IDENTITY(1,1),
  account_id BIGINT NOT NULL ENCODE DELTA,
  group_id BIGINT ENCODE DELTA,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' ENCODE BYTEDICT,
  PRIMARY KEY (order_id),
  FOREIGN KEY (account_id) REFERENCES accounts(account_id),
  FOREIGN KEY (group_id) REFERENCES groups(group_id)
)
DISTSTYLE KEY DISTKEY (account_id)
SORTKEY (order_id);

ALTER TABLE audit_log
  ADD CONSTRAINT fk_audit_account
  FOREIGN KEY (account_id) REFERENCES accounts(account_id);
