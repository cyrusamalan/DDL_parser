-- Self-referential FK, multiple FKs to same target.
-- Hive FKs use DISABLE NOVALIDATE (declared but not enforced).
CREATE TABLE accounts (
  account_id BIGINT NOT NULL,
  email STRING NOT NULL,
  tier STRING NOT NULL DEFAULT 'personal',
  parent_id BIGINT,
  CONSTRAINT pk_accounts PRIMARY KEY (account_id) DISABLE NOVALIDATE,
  CONSTRAINT fk_accounts_parent FOREIGN KEY (parent_id)
    REFERENCES accounts(account_id) DISABLE NOVALIDATE RELY
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

CREATE TABLE groups (
  group_id BIGINT NOT NULL,
  group_name STRING NOT NULL,
  owner_id BIGINT NOT NULL,
  created_by BIGINT,
  CONSTRAINT pk_groups PRIMARY KEY (group_id) DISABLE NOVALIDATE,
  CONSTRAINT fk_groups_owner FOREIGN KEY (owner_id)
    REFERENCES accounts(account_id) DISABLE NOVALIDATE RELY,
  CONSTRAINT fk_groups_creator FOREIGN KEY (created_by)
    REFERENCES accounts(account_id) DISABLE NOVALIDATE RELY
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');

CREATE TABLE memberships (
  group_id BIGINT NOT NULL,
  account_id BIGINT NOT NULL,
  role STRING NOT NULL DEFAULT 'member',
  CONSTRAINT pk_memberships PRIMARY KEY (group_id, account_id) DISABLE NOVALIDATE,
  CONSTRAINT fk_memberships_group FOREIGN KEY (group_id)
    REFERENCES groups(group_id) DISABLE NOVALIDATE RELY,
  CONSTRAINT fk_memberships_account FOREIGN KEY (account_id)
    REFERENCES accounts(account_id) DISABLE NOVALIDATE RELY
)
STORED AS ORC;

CREATE TABLE audit_log (
  log_id BIGINT NOT NULL,
  account_id BIGINT,
  action STRING NOT NULL,
  logged_at TIMESTAMP,
  CONSTRAINT pk_audit_log PRIMARY KEY (log_id) DISABLE NOVALIDATE,
  CONSTRAINT fk_audit_account FOREIGN KEY (account_id)
    REFERENCES accounts(account_id) DISABLE NOVALIDATE RELY
)
PARTITIONED BY (log_date DATE)
STORED AS PARQUET;

CREATE TABLE orders (
  order_id BIGINT NOT NULL,
  account_id BIGINT NOT NULL,
  group_id BIGINT,
  status STRING NOT NULL DEFAULT 'pending',
  CONSTRAINT pk_orders PRIMARY KEY (order_id) DISABLE NOVALIDATE,
  CONSTRAINT fk_orders_account FOREIGN KEY (account_id)
    REFERENCES accounts(account_id) DISABLE NOVALIDATE RELY,
  CONSTRAINT fk_orders_group FOREIGN KEY (group_id)
    REFERENCES groups(group_id) DISABLE NOVALIDATE RELY
)
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY');
