-- Deep FK chain, self-refs, forward-ref via ALTER TABLE.
-- CREATE VIEW and CREATE INDEX stripped by sanitizer. ORGANIZE BY ROW.
CREATE TABLE organizations (
  org_id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  org_name VARCHAR(500) NOT NULL,
  parent_org_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT TIMESTAMP,
  CONSTRAINT pk_organizations PRIMARY KEY (org_id),
  CONSTRAINT fk_orgs_parent FOREIGN KEY (parent_org_id)
    REFERENCES organizations(org_id) ON DELETE SET NULL
) IN USERSPACE1
ORGANIZE BY ROW;

CREATE TABLE teams (
  team_id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  org_id INTEGER NOT NULL,
  team_name VARCHAR(255) NOT NULL,
  lead_user_id INTEGER,
  CONSTRAINT pk_teams PRIMARY KEY (team_id),
  CONSTRAINT fk_teams_org FOREIGN KEY (org_id)
    REFERENCES organizations(org_id) ON DELETE RESTRICT
) IN USERSPACE1
ORGANIZE BY ROW;

CREATE TABLE users (
  user_id INTEGER NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  email VARCHAR(255) NOT NULL,
  org_id INTEGER,
  team_id INTEGER,
  manager_id INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  CONSTRAINT pk_users PRIMARY KEY (user_id),
  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT fk_users_org FOREIGN KEY (org_id)
    REFERENCES organizations(org_id) ON DELETE SET NULL,
  CONSTRAINT fk_users_team FOREIGN KEY (team_id)
    REFERENCES teams(team_id) ON DELETE SET NULL,
  CONSTRAINT fk_users_manager FOREIGN KEY (manager_id)
    REFERENCES users(user_id) ON DELETE SET NULL
) IN USERSPACE1
ORGANIZE BY ROW;

-- Forward ref: teams.lead_user_id declared above, FK added after users is defined
ALTER TABLE teams
  ADD CONSTRAINT fk_teams_lead FOREIGN KEY (lead_user_id)
  REFERENCES users(user_id) ON DELETE SET NULL;

CREATE TABLE projects (
  project_id BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  team_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  reviewer_id INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  CONSTRAINT pk_projects PRIMARY KEY (project_id),
  CONSTRAINT fk_projects_team FOREIGN KEY (team_id)
    REFERENCES teams(team_id) ON DELETE RESTRICT,
  CONSTRAINT fk_projects_owner FOREIGN KEY (owner_id)
    REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_projects_reviewer FOREIGN KEY (reviewer_id)
    REFERENCES users(user_id) ON DELETE SET NULL
) IN USERSPACE1;

CREATE TABLE tasks (
  task_id BIGINT NOT NULL GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  project_id BIGINT NOT NULL,
  assignee_id INTEGER,
  reporter_id INTEGER,
  parent_task_id BIGINT,
  title VARCHAR(500) NOT NULL,
  priority SMALLINT NOT NULL DEFAULT 0,
  CONSTRAINT pk_tasks PRIMARY KEY (task_id),
  CONSTRAINT fk_tasks_project FOREIGN KEY (project_id)
    REFERENCES projects(project_id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_assignee FOREIGN KEY (assignee_id)
    REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_reporter FOREIGN KEY (reporter_id)
    REFERENCES users(user_id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_parent FOREIGN KEY (parent_task_id)
    REFERENCES tasks(task_id) ON DELETE SET NULL
) IN USERSPACE1;

CREATE VIEW active_users AS
  SELECT user_id, email, org_id, team_id FROM users WHERE status = 'active';

CREATE VIEW team_project_summary AS
  SELECT t.team_id, t.team_name, COUNT(p.project_id) AS project_count
  FROM teams t LEFT JOIN projects p ON t.team_id = p.team_id
  GROUP BY t.team_id, t.team_name;

CREATE INDEX idx_tasks_project ON tasks (project_id);
CREATE INDEX idx_tasks_assignee ON tasks (assignee_id);
CREATE UNIQUE INDEX idx_users_email ON users (email);
