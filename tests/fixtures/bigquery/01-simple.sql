CREATE TABLE `myproject.mydataset.users` (
  id INT64 NOT NULL,
  email STRING NOT NULL,
  is_active BOOL DEFAULT TRUE,
  score FLOAT64,
  created_at DATETIME
);
