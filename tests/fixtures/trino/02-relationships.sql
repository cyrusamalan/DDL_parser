-- Trino does not support FK or PK constraints; relationships are implicit via column naming.
-- Tables use catalog.schema.table naming and connector-specific WITH clause.
CREATE TABLE hive.app.accounts (
  account_id BIGINT NOT NULL,
  email VARCHAR NOT NULL,
  tier VARCHAR NOT NULL,
  parent_id BIGINT
)
WITH (format = 'PARQUET');

CREATE TABLE hive.app.groups (
  group_id BIGINT NOT NULL,
  group_name VARCHAR NOT NULL,
  owner_id BIGINT NOT NULL,
  created_by BIGINT
)
WITH (format = 'PARQUET');

CREATE TABLE hive.app.memberships (
  group_id BIGINT NOT NULL,
  account_id BIGINT NOT NULL,
  role VARCHAR NOT NULL
)
WITH (
  format = 'PARQUET',
  partitioned_by = ARRAY['role']
);

CREATE TABLE hive.app.audit_log (
  log_id BIGINT NOT NULL,
  account_id BIGINT,
  action VARCHAR NOT NULL,
  logged_at TIMESTAMP(6) WITH TIME ZONE
)
WITH (
  format = 'ORC',
  partitioned_by = ARRAY['logged_at']
);

CREATE TABLE hive.app.orders (
  order_id BIGINT NOT NULL,
  account_id BIGINT NOT NULL,
  group_id BIGINT,
  status VARCHAR NOT NULL
)
WITH (format = 'PARQUET');
