-- Deep FK chain, self-refs, forward-ref via ALTER TABLE.
-- ENCODE, DISTSTYLE, DISTKEY, SORTKEY. CREATE VIEW stripped by sanitizer.
CREATE TABLE organizations (
  org_id BIGINT IDENTITY(1,1),
  org_name VARCHAR(500) NOT NULL ENCODE ZSTD,
  parent_org_id BIGINT ENCODE DELTA,
  created_at TIMESTAMPTZ DEFAULT SYSDATE ENCODE RAW,
  PRIMARY KEY (org_id),
  FOREIGN KEY (parent_org_id) REFERENCES organizations(org_id)
)
DISTSTYLE ALL
SORTKEY (org_id);

CREATE TABLE teams (
  team_id BIGINT IDENTITY(1,1),
  org_id BIGINT NOT NULL ENCODE DELTA,
  team_name VARCHAR(255) NOT NULL ENCODE ZSTD,
  lead_user_id BIGINT ENCODE DELTA,
  PRIMARY KEY (team_id),
  FOREIGN KEY (org_id) REFERENCES organizations(org_id)
)
DISTSTYLE KEY DISTKEY (org_id)
SORTKEY (team_id);

CREATE TABLE users (
  user_id BIGINT IDENTITY(1,1),
  email VARCHAR(320) NOT NULL ENCODE ZSTD,
  org_id BIGINT ENCODE DELTA,
  team_id BIGINT ENCODE DELTA,
  manager_id BIGINT ENCODE DELTA,
  status VARCHAR(20) NOT NULL DEFAULT 'active' ENCODE BYTEDICT,
  PRIMARY KEY (user_id),
  FOREIGN KEY (org_id) REFERENCES organizations(org_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id),
  FOREIGN KEY (manager_id) REFERENCES users(user_id)
)
DISTSTYLE KEY DISTKEY (user_id)
COMPOUND SORTKEY (org_id, team_id);

-- Forward ref: teams.lead_user_id declared above, FK added after users is defined
ALTER TABLE teams
  ADD CONSTRAINT fk_teams_lead
  FOREIGN KEY (lead_user_id) REFERENCES users(user_id);

CREATE TABLE projects (
  project_id BIGINT IDENTITY(1,1),
  team_id BIGINT NOT NULL ENCODE DELTA,
  owner_id BIGINT NOT NULL ENCODE DELTA,
  reviewer_id BIGINT ENCODE DELTA,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' ENCODE BYTEDICT,
  PRIMARY KEY (project_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id),
  FOREIGN KEY (owner_id) REFERENCES users(user_id),
  FOREIGN KEY (reviewer_id) REFERENCES users(user_id)
)
DISTSTYLE KEY DISTKEY (team_id)
SORTKEY (project_id);

CREATE TABLE tasks (
  task_id BIGINT IDENTITY(1,1),
  project_id BIGINT NOT NULL ENCODE DELTA,
  assignee_id BIGINT ENCODE DELTA,
  reporter_id BIGINT ENCODE DELTA,
  parent_task_id BIGINT ENCODE DELTA,
  title VARCHAR(1000) NOT NULL ENCODE ZSTD,
  priority SMALLINT DEFAULT 0 ENCODE RAW,
  PRIMARY KEY (task_id),
  FOREIGN KEY (project_id) REFERENCES projects(project_id),
  FOREIGN KEY (assignee_id) REFERENCES users(user_id),
  FOREIGN KEY (reporter_id) REFERENCES users(user_id),
  FOREIGN KEY (parent_task_id) REFERENCES tasks(task_id)
)
DISTSTYLE KEY DISTKEY (project_id)
COMPOUND SORTKEY (project_id, task_id);

CREATE VIEW active_users AS
  SELECT user_id, email, org_id, team_id FROM users WHERE status = 'active';

CREATE VIEW team_project_count AS
  SELECT team_id, COUNT(*) AS project_count FROM projects GROUP BY team_id;
