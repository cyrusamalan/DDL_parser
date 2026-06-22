-- Deep FK chain (5 levels), 3 self-refs, ALTER TABLE forward-ref, multiple FKs
-- from one table to the same target, UUID PKs, array columns, ENUM types, DROP + INDEX stripped.
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE content_type AS ENUM ('article', 'video', 'podcast');
CREATE TYPE visibility AS ENUM ('public', 'private', 'draft');

CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  parent_org_id UUID REFERENCES organizations(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teams (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  lead_user_id INTEGER
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status user_status NOT NULL DEFAULT 'active',
  org_id UUID REFERENCES organizations(id),
  team_id UUID REFERENCES teams(id),
  manager_id INTEGER REFERENCES users(id)
);

-- Forward ref: teams.lead_user_id declared above, FK added after users is defined
ALTER TABLE teams
  ADD CONSTRAINT fk_teams_lead
  FOREIGN KEY (lead_user_id) REFERENCES users(id);

CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id),
  owner_id INTEGER NOT NULL REFERENCES users(id),
  reviewer_id INTEGER REFERENCES users(id),
  type content_type NOT NULL DEFAULT 'article',
  visibility visibility NOT NULL DEFAULT 'draft',
  tags TEXT[],
  config JSONB
);

CREATE TABLE tasks (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES projects(id),
  assignee_id INTEGER REFERENCES users(id),
  reporter_id INTEGER REFERENCES users(id),
  parent_task_id BIGINT REFERENCES tasks(id),
  title TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  metadata JSONB
);

CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
DROP TABLE IF EXISTS legacy_tasks;
