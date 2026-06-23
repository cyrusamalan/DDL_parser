-- Trino (PrestoSQL): catalog.schema.table naming, connector WITH clause.
-- Trino does not enforce PRIMARY KEY or FOREIGN KEY constraints.
CREATE TABLE hive.default.users (
  user_id BIGINT NOT NULL,
  email VARCHAR NOT NULL,
  created_at TIMESTAMP(6) WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
)
WITH (
  format = 'ORC',
  bucketed_by = ARRAY['user_id'],
  bucket_count = 4
);
