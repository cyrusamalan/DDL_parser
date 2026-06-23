-- Deep table graph. Trino does not support PK or FK constraints;
-- relationships are implicit. CREATE VIEW and CREATE SCHEMA stripped.
-- Uses ARRAY, MAP, ROW types and various connector WITH clauses.
CREATE SCHEMA hive.analytics
WITH (location = 'hdfs://namenode/analytics');

CREATE TABLE hive.analytics.organizations (
  org_id BIGINT NOT NULL,
  org_name VARCHAR NOT NULL,
  parent_org_id BIGINT,
  metadata MAP(VARCHAR, VARCHAR),
  created_at TIMESTAMP(6) WITH TIME ZONE
)
WITH (
  format = 'PARQUET',
  partitioned_by = ARRAY['created_at']
);

CREATE TABLE hive.analytics.teams (
  team_id BIGINT NOT NULL,
  org_id BIGINT NOT NULL,
  team_name VARCHAR NOT NULL,
  lead_user_id BIGINT,
  tags ARRAY(VARCHAR)
)
WITH (
  format = 'PARQUET'
);

CREATE TABLE hive.analytics.users (
  user_id BIGINT NOT NULL,
  email VARCHAR NOT NULL,
  org_id BIGINT,
  team_id BIGINT,
  manager_id BIGINT,
  status VARCHAR NOT NULL,
  profile ROW(display_name VARCHAR, timezone VARCHAR, locale VARCHAR)
)
WITH (
  format = 'ORC',
  bucketed_by = ARRAY['user_id'],
  bucket_count = 8
);

CREATE TABLE hive.analytics.projects (
  project_id BIGINT NOT NULL,
  team_id BIGINT NOT NULL,
  owner_id BIGINT NOT NULL,
  reviewer_id BIGINT,
  status VARCHAR NOT NULL,
  tags ARRAY(VARCHAR),
  config MAP(VARCHAR, VARCHAR)
)
WITH (
  format = 'PARQUET',
  partitioned_by = ARRAY['status']
);

CREATE TABLE hive.analytics.tasks (
  task_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  assignee_id BIGINT,
  reporter_id BIGINT,
  parent_task_id BIGINT,
  title VARCHAR NOT NULL,
  priority INTEGER,
  labels ARRAY(VARCHAR)
)
WITH (
  format = 'ORC',
  bucketed_by = ARRAY['project_id'],
  bucket_count = 16
);

CREATE VIEW hive.analytics.active_users AS
  SELECT user_id, email, org_id, team_id
  FROM hive.analytics.users
  WHERE status = 'active';

CREATE VIEW hive.analytics.open_tasks AS
  SELECT t.task_id, t.title, t.project_id, t.assignee_id
  FROM hive.analytics.tasks t
  WHERE t.parent_task_id IS NULL;
