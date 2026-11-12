CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE readings (
  ts        TIMESTAMPTZ NOT NULL,
  sensor_id INT         NOT NULL,
  temp      REAL        NOT NULL
);

SELECT create_hypertable('readings', 'ts',
  chunk_time_interval => INTERVAL '30 minutes',
  create_default_indexes => FALSE);

CREATE INDEX ON readings (sensor_id, ts DESC);

CREATE TABLE alerts (
  id        BIGSERIAL PRIMARY KEY,
  ts        TIMESTAMPTZ NOT NULL,
  sensor_id INT NOT NULL,
  zone      INT NOT NULL,
  type      TEXT NOT NULL,
  value     REAL
);
CREATE INDEX ON alerts (ts DESC);

-- raw readings are only kept for about an hour, which caps the DB size
SELECT add_retention_policy('readings', INTERVAL '1 hour',
  schedule_interval => INTERVAL '10 minutes');