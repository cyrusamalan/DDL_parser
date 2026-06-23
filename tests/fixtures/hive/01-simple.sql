CREATE TABLE users (
  user_id BIGINT COMMENT 'Primary key',
  email STRING NOT NULL,
  created_at TIMESTAMP,
  is_active BOOLEAN
)
COMMENT 'Application users'
STORED AS PARQUET
TBLPROPERTIES ('parquet.compression'='SNAPPY');
