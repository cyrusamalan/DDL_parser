CREATE TABLE `analytics.events.event_types` (
  type_id STRING NOT NULL,
  display_name STRING NOT NULL,
  parent_type_id STRING REFERENCES `analytics.events.event_types` (type_id) NOT ENFORCED,
  event_schema JSON,
  tags ARRAY<STRING>,
  PRIMARY KEY (type_id) NOT ENFORCED
);

CREATE TABLE `analytics.events.sessions` (
  session_id STRING NOT NULL,
  user_id INT64 NOT NULL,
  device STRUCT<os STRING, browser STRING, version STRING>,
  geo STRUCT<country STRING, region STRING, city STRING>,
  started_at DATETIME,
  ended_at DATETIME,
  properties JSON,
  PRIMARY KEY (session_id) NOT ENFORCED
)
PARTITION BY DATE(started_at)
OPTIONS (description = "User sessions");

CREATE TABLE `analytics.events.events` (
  event_id STRING NOT NULL,
  session_id STRING NOT NULL,
  type_id STRING NOT NULL,
  parent_event_id STRING,
  payload JSON,
  location GEOGRAPHY,
  amount BIGNUMERIC(20, 6),
  tags ARRAY<STRUCT<tag_key STRING, tag_value STRING>>,
  attributes ARRAY<STRING>,
  created_at DATETIME,
  PRIMARY KEY (event_id) NOT ENFORCED,
  CONSTRAINT fk_event_session FOREIGN KEY (session_id)
    REFERENCES `analytics.events.sessions` (session_id) NOT ENFORCED,
  CONSTRAINT fk_event_type FOREIGN KEY (type_id)
    REFERENCES `analytics.events.event_types` (type_id) NOT ENFORCED,
  CONSTRAINT fk_event_parent FOREIGN KEY (parent_event_id)
    REFERENCES `analytics.events.events` (event_id) NOT ENFORCED
)
PARTITION BY DATE(created_at)
CLUSTER BY session_id, type_id;

CREATE TABLE `analytics.events.aggregates` (
  agg_id STRING NOT NULL,
  event_type_id STRING NOT NULL,
  period STRUCT<start_ts DATETIME, end_ts DATETIME>,
  metrics ARRAY<STRUCT<metric_name STRING, metric_value FLOAT64, unit STRING>>,
  total_count INT64 NOT NULL DEFAULT 0,
  PRIMARY KEY (agg_id) NOT ENFORCED,
  CONSTRAINT fk_agg_type FOREIGN KEY (event_type_id)
    REFERENCES `analytics.events.event_types` (type_id) NOT ENFORCED
)
OPTIONS (description = "Aggregated events");

ALTER TABLE `analytics.events.events`
  ADD CONSTRAINT fk_event_parent_dup
  FOREIGN KEY (parent_event_id)
  REFERENCES `analytics.events.events` (event_id)
  NOT ENFORCED;
