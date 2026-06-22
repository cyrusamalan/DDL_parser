CREATE TABLE content (
  id INTEGER PRIMARY KEY,
  body TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en'
);

CREATE TABLE content_meta (
  id INTEGER PRIMARY KEY,
  content_id INTEGER NOT NULL REFERENCES content(id),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'string'
);

CREATE TABLE catalogs (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE entries (
  id INTEGER PRIMARY KEY,
  catalog_id INTEGER NOT NULL REFERENCES catalogs(id),
  meta_id INTEGER REFERENCES content_meta(id),
  content_id INTEGER REFERENCES content(id),
  parent_id INTEGER REFERENCES entries(id),
  created_at TEXT NOT NULL
);

CREATE TABLE entry_tags (
  entry_id INTEGER NOT NULL REFERENCES entries(id),
  tag TEXT NOT NULL,
  PRIMARY KEY (entry_id, tag)
) WITHOUT ROWID;

CREATE TABLE collections (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES collections(id)
);

CREATE TABLE collection_entries (
  collection_id INTEGER NOT NULL REFERENCES collections(id),
  entry_id INTEGER NOT NULL REFERENCES entries(id),
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, entry_id)
);

CREATE INDEX idx_entries_catalog ON entries(catalog_id);
CREATE INDEX idx_entries_parent ON entries(parent_id);
