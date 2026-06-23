-- Deep FK chain, self-refs. Hive FKs are DISABLE NOVALIDATE (not enforced).
-- PARTITIONED BY, CLUSTERED BY, STORED AS. CREATE VIEW and CREATE INDEX stripped.
CREATE TABLE organizations (
  org_id BIGINT NOT NULL,
  org_name STRING NOT NULL,
  parent_org_id BIGINT,
  metadata MAP<STRING, STRING>,
  created_at TIMESTAMP,
  CONSTRAINT pk_organizations PRIMARY KEY (org_id) DISABLE NOVALIDATE,
  CONSTRAINT fk_orgs_parent FOREIGN KEY (parent_org_id)
    REFERENCES organizations(org_id) DISABLE NOVALIDATE RELY
)
COMMENT 'Organizational hierarchy'
STORED AS ORC
TBLPROPERTIES ('orc.compress'='SNAPPY', 'transactional'='true');

CREATE TABLE teams (
  team_id BIGINT NOT NULL,
  org_id BIGINT NOT NULL,
  team_name STRING NOT NULL,
  lead_user_id BIGINT,
  tags ARRAY<STRING>,
  CONSTRAINT pk_teams PRIMARY KEY (team_id) DISABLE NOVALIDATE,
  CONSTRAINT fk_teams_org FOREIGN KEY (org_id)
    REFERENCES organizations(org_id) DISABLE NOVALIDATE RELY,
  CONSTRAINT fk_teams_lead FOREIGN KEY (lead_user_id)
    REFERENCES users(user_id) DISABLE NOVALIDATE RELY
)
STORED AS ORC
TBLPROPERTIES ('transactional'='true');

CREATE TABLE users (
  user_id BIGINT NOT NULL,
  email STRING NOT NULL,
  org_id BIGINT,
  team_id BIGINT,
  manager_id BIGINT,
  status STRING NOT NULL DEFAULT 'active',
  profile STRUCT<display_name:STRING, timezone:STRING>,
  CONSTRAINT pk_users PRIMARY KEY (user_id) DISABLE NOVALIDATE,
  CONSTRAINT fk_users_org FOREIGN KEY (org_id)
    REFERENCES organizations(org_id) DISABLE NOVALIDATE RELY,
  CONSTRAINT fk_users_team FOREIGN KEY (team_id)
    REFERENCES teams(team_id) DISABLE NOVALIDATE RELY,
  CONSTRAINT fk_users_manager FOREIGN KEY (manager_id)
    REFERENCES users(user_id) DISABLE NOVALIDATE RELY
)
PARTITIONED BY (status STRING)
STORED AS ORC
TBLPROPERTIES ('transactional'='true');

CREATE TABLE projects (
  project_id BIGINT NOT NULL,
  team_id BIGINT NOT NULL,
  owner_id BIGINT NOT NULL,
  reviewer_id BIGINT,
  project_type STRING NOT NULL DEFAULT 'standard',
  visibility STRING NOT NULL DEFAULT 'private',
  tags ARRAY<STRING>,
  CONSTRAINT pk_projects PRIMARY KEY (project_id) DISABLE NOVALIDATE,
  CONSTRAINT fk_projects_team FOREIGN KEY (team_id)
    REFERENCES teams(team_id) DISABLE NOVALIDATE RELY,
  CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id)
    REFERENCES users(user_id) DISABLE NOVALIDATE RELY,
  CONSTRAINT fk_projects_reviewer FOREIGN KEY (reviewer_id)
    REFERENCES users(user_id) DISABLE NOVALIDATE RELY
)
PARTITIONED BY (project_type STRING)
CLUSTERED BY (team_id) INTO 8 BUCKETS
STORED AS ORC
TBLPROPERTIES ('transactional'='true');

CREATE TABLE tasks (
  task_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  assignee_id BIGINT,
  reporter_id BIGINT,
  parent_task_id BIGINT,
  title STRING NOT NULL,
  priority INT DEFAULT 0,
  labels ARRAY<STRING>,
  CONSTRAINT pk_tasks PRIMARY KEY (task_id) DISABLE NOVALIDATE,
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_id)
    REFERENCES projects(project_id) DISABLE NOVALIDATE RELY,
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id)
    REFERENCES users(user_id) DISABLE NOVALIDATE RELY,
  CONSTRAINT fk_tasks_reporter FOREIGN KEY (reporter_id)
    REFERENCES users(user_id) DISABLE NOVALIDATE RELY,
  CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id)
    REFERENCES tasks(task_id) DISABLE NOVALIDATE RELY
)
PARTITIONED BY (project_id BIGINT)
STORED AS ORC
TBLPROPERTIES ('transactional'='true');

CREATE VIEW active_users AS
  SELECT user_id, email, org_id, team_id FROM users WHERE status = 'active';

CREATE VIEW open_tasks AS
  SELECT task_id, title, project_id, assignee_id FROM tasks WHERE parent_task_id IS NULL;
