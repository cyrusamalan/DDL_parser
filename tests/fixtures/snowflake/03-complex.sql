-- Deep FK chain, self-refs, forward-ref via ALTER TABLE. VARIANT/ARRAY columns,
-- CLUSTER BY, CREATE SEQUENCE/VIEW/STREAM stripped by sanitizer.
CREATE SEQUENCE org_id_seq START = 1 INCREMENT = 1;

CREATE TABLE organizations (
  org_id NUMBER DEFAULT org_id_seq.NEXTVAL,
  org_name VARCHAR(255) NOT NULL,
  parent_org_id NUMBER,
  metadata VARIANT,
  created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (org_id),
  FOREIGN KEY (parent_org_id) REFERENCES organizations(org_id)
)
CLUSTER BY (org_id)
DATA_RETENTION_TIME_IN_DAYS = 7
COMMENT = 'Top-level org hierarchy';

CREATE TABLE teams (
  team_id NUMBER AUTOINCREMENT,
  org_id NUMBER NOT NULL,
  team_name VARCHAR(255) NOT NULL,
  lead_user_id NUMBER,
  tags ARRAY,
  PRIMARY KEY (team_id),
  FOREIGN KEY (org_id) REFERENCES organizations(org_id)
);

CREATE TABLE users (
  user_id NUMBER AUTOINCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  org_id NUMBER,
  team_id NUMBER,
  manager_id NUMBER,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  profile VARIANT,
  PRIMARY KEY (user_id),
  FOREIGN KEY (org_id) REFERENCES organizations(org_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id),
  FOREIGN KEY (manager_id) REFERENCES users(user_id)
);

-- Forward ref: teams.lead_user_id declared above, FK added after users is defined
ALTER TABLE teams
  ADD CONSTRAINT fk_teams_lead
  FOREIGN KEY (lead_user_id) REFERENCES users(user_id);

CREATE TABLE projects (
  project_id NUMBER AUTOINCREMENT,
  team_id NUMBER NOT NULL,
  owner_id NUMBER NOT NULL,
  reviewer_id NUMBER,
  config VARIANT,
  tags ARRAY,
  PRIMARY KEY (project_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id),
  FOREIGN KEY (owner_id) REFERENCES users(user_id),
  FOREIGN KEY (reviewer_id) REFERENCES users(user_id)
)
CLUSTER BY (team_id);

CREATE TABLE tasks (
  task_id NUMBER AUTOINCREMENT,
  project_id NUMBER NOT NULL,
  assignee_id NUMBER,
  reporter_id NUMBER,
  parent_task_id NUMBER,
  title VARCHAR(500) NOT NULL,
  priority NUMBER DEFAULT 0,
  metadata VARIANT,
  PRIMARY KEY (task_id),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (assignee_id) REFERENCES users(user_id),
  FOREIGN KEY (reporter_id) REFERENCES users(user_id),
  FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id)
);

CREATE VIEW active_users AS
  SELECT user_id, email, org_id FROM users WHERE status = 'active';

CREATE STREAM task_changes ON TABLE tasks APPEND_ONLY = TRUE;

CREATE INDEX idx_tasks_project ON tasks (project_id);
CREATE INDEX idx_tasks_assignee ON tasks (assignee_id);
