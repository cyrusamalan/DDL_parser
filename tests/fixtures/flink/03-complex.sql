-- Deep FK chain, self-refs, forward-ref via ALTER TABLE. NOT ENFORCED FKs.
-- WATERMARK, COMPUTED COLUMNS, various connector types. CREATE VIEW stripped.
CREATE TABLE organizations (
  org_id BIGINT NOT NULL,
  org_name STRING NOT NULL,
  parent_org_id BIGINT,
  metadata STRING,
  created_at TIMESTAMP(3),
  row_time AS CAST(created_at AS TIMESTAMP_LTZ(3)),
  WATERMARK FOR row_time AS row_time - INTERVAL '5' SECOND,
  PRIMARY KEY (org_id) NOT ENFORCED,
  CONSTRAINT fk_orgs_parent FOREIGN KEY (parent_org_id)
    REFERENCES organizations(org_id) NOT ENFORCED
)
WITH (
  'connector' = 'kafka',
  'topic' = 'organizations',
  'properties.bootstrap.servers' = 'localhost:9092',
  'format' = 'json',
  'json.timestamp-format.standard' = 'ISO-8601'
);

CREATE TABLE teams (
  team_id BIGINT NOT NULL,
  org_id BIGINT NOT NULL,
  team_name STRING NOT NULL,
  lead_user_id BIGINT,
  tags ARRAY<STRING>,
  PRIMARY KEY (team_id) NOT ENFORCED,
  CONSTRAINT fk_teams_org FOREIGN KEY (org_id)
    REFERENCES organizations(org_id) NOT ENFORCED
)
WITH (
  'connector' = 'kafka',
  'topic' = 'teams',
  'properties.bootstrap.servers' = 'localhost:9092',
  'format' = 'json'
);

CREATE TABLE users (
  user_id BIGINT NOT NULL,
  email STRING NOT NULL,
  org_id BIGINT,
  team_id BIGINT,
  manager_id BIGINT,
  status STRING NOT NULL,
  updated_at TIMESTAMP(3),
  proc_time AS PROCTIME(),
  PRIMARY KEY (user_id) NOT ENFORCED,
  CONSTRAINT fk_users_org FOREIGN KEY (org_id)
    REFERENCES organizations(org_id) NOT ENFORCED,
  CONSTRAINT fk_users_team FOREIGN KEY (team_id)
    REFERENCES teams(team_id) NOT ENFORCED,
  CONSTRAINT fk_users_manager FOREIGN KEY (manager_id)
    REFERENCES users(user_id) NOT ENFORCED
)
WITH (
  'connector' = 'kafka',
  'topic' = 'users',
  'properties.bootstrap.servers' = 'localhost:9092',
  'format' = 'json'
);

-- Forward ref: teams.lead_user_id declared above, FK added after users is defined
ALTER TABLE teams
  ADD CONSTRAINT fk_teams_lead
  FOREIGN KEY (lead_user_id) REFERENCES users(user_id) NOT ENFORCED;

CREATE TABLE projects (
  project_id BIGINT NOT NULL,
  team_id BIGINT NOT NULL,
  owner_id BIGINT NOT NULL,
  reviewer_id BIGINT,
  project_type STRING NOT NULL,
  visibility STRING NOT NULL,
  created_at TIMESTAMP(3),
  PRIMARY KEY (project_id) NOT ENFORCED,
  CONSTRAINT fk_projects_team FOREIGN KEY (team_id)
    REFERENCES teams(team_id) NOT ENFORCED,
  CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id)
    REFERENCES users(user_id) NOT ENFORCED,
  CONSTRAINT fk_projects_reviewer FOREIGN KEY (reviewer_id)
    REFERENCES users(user_id) NOT ENFORCED
)
WITH (
  'connector' = 'filesystem',
  'path' = 'file:///data/projects',
  'format' = 'parquet'
);

CREATE TABLE tasks (
  task_id BIGINT NOT NULL,
  project_id BIGINT NOT NULL,
  assignee_id BIGINT,
  reporter_id BIGINT,
  parent_task_id BIGINT,
  title STRING NOT NULL,
  priority INT DEFAULT 0,
  event_time TIMESTAMP(3),
  WATERMARK FOR event_time AS event_time - INTERVAL '10' SECOND,
  PRIMARY KEY (task_id) NOT ENFORCED,
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_id)
    REFERENCES projects(project_id) NOT ENFORCED,
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id)
    REFERENCES users(user_id) NOT ENFORCED,
  CONSTRAINT fk_tasks_reporter FOREIGN KEY (reporter_id)
    REFERENCES users(user_id) NOT ENFORCED,
  CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id)
    REFERENCES tasks(task_id) NOT ENFORCED
)
WITH (
  'connector' = 'kafka',
  'topic' = 'tasks',
  'properties.bootstrap.servers' = 'localhost:9092',
  'format' = 'json'
);

CREATE VIEW active_users AS
  SELECT user_id, email, org_id, team_id FROM users WHERE status = 'active';
