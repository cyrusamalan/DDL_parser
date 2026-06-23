CREATE TABLE users (
  user_id BIGINT NOT NULL,
  email STRING NOT NULL,
  created_at TIMESTAMP(3),
  is_active BOOLEAN,
  PRIMARY KEY (user_id) NOT ENFORCED
)
WITH (
  'connector' = 'filesystem',
  'path' = 'file:///data/users',
  'format' = 'json'
);
