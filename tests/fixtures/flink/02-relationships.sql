-- Self-referential FK, multiple FKs to same target, forward-ref via ALTER TABLE.
-- Flink FKs are NOT ENFORCED (informational for query optimization).
CREATE TABLE accounts (
  account_id BIGINT NOT NULL,
  email STRING NOT NULL,
  tier STRING NOT NULL,
  parent_id BIGINT,
  proc_time AS PROCTIME(),
  PRIMARY KEY (account_id) NOT ENFORCED,
  CONSTRAINT fk_accounts_parent FOREIGN KEY (parent_id)
    REFERENCES accounts(account_id) NOT ENFORCED
)
WITH (
  'connector' = 'kafka',
  'topic' = 'accounts',
  'properties.bootstrap.servers' = 'localhost:9092',
  'format' = 'json'
);

CREATE TABLE groups (
  group_id BIGINT NOT NULL,
  group_name STRING NOT NULL,
  owner_id BIGINT NOT NULL,
  created_by BIGINT,
  PRIMARY KEY (group_id) NOT ENFORCED,
  CONSTRAINT fk_groups_owner FOREIGN KEY (owner_id)
    REFERENCES accounts(account_id) NOT ENFORCED,
  CONSTRAINT fk_groups_creator FOREIGN KEY (created_by)
    REFERENCES accounts(account_id) NOT ENFORCED
)
WITH (
  'connector' = 'kafka',
  'topic' = 'groups',
  'properties.bootstrap.servers' = 'localhost:9092',
  'format' = 'json'
);

CREATE TABLE memberships (
  group_id BIGINT NOT NULL,
  account_id BIGINT NOT NULL,
  role STRING NOT NULL,
  PRIMARY KEY (group_id, account_id) NOT ENFORCED,
  CONSTRAINT fk_memberships_group FOREIGN KEY (group_id)
    REFERENCES groups(group_id) NOT ENFORCED,
  CONSTRAINT fk_memberships_account FOREIGN KEY (account_id)
    REFERENCES accounts(account_id) NOT ENFORCED
)
WITH (
  'connector' = 'filesystem',
  'path' = 'file:///data/memberships',
  'format' = 'json'
);

-- audit_log FK added later via ALTER TABLE (forward-reference pattern)
CREATE TABLE audit_log (
  log_id BIGINT NOT NULL,
  account_id BIGINT,
  action STRING NOT NULL,
  logged_at TIMESTAMP(3),
  PRIMARY KEY (log_id) NOT ENFORCED
)
WITH (
  'connector' = 'kafka',
  'topic' = 'audit',
  'properties.bootstrap.servers' = 'localhost:9092',
  'format' = 'json'
);

CREATE TABLE orders (
  order_id BIGINT NOT NULL,
  account_id BIGINT NOT NULL,
  group_id BIGINT,
  status STRING NOT NULL,
  PRIMARY KEY (order_id) NOT ENFORCED,
  CONSTRAINT fk_orders_account FOREIGN KEY (account_id)
    REFERENCES accounts(account_id) NOT ENFORCED,
  CONSTRAINT fk_orders_group FOREIGN KEY (group_id)
    REFERENCES groups(group_id) NOT ENFORCED
)
WITH (
  'connector' = 'kafka',
  'topic' = 'orders',
  'properties.bootstrap.servers' = 'localhost:9092',
  'format' = 'json'
);

ALTER TABLE audit_log
  ADD CONSTRAINT fk_audit_account
  FOREIGN KEY (account_id) REFERENCES accounts(account_id) NOT ENFORCED;
