CREATE TABLE sessions (
  nonce TEXT PRIMARY KEY,
  started_at_ms INTEGER NOT NULL,
  expires_at_ms INTEGER NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('touch', 'desktop'))
);

CREATE TABLE runs (
  nonce TEXT PRIMARY KEY,
  day_key TEXT NOT NULL,
  duration_bucket INTEGER NOT NULL CHECK (duration_bucket BETWEEN 0 AND 1200),
  device_type TEXT NOT NULL CHECK (device_type IN ('touch', 'desktop')),
  trusted INTEGER NOT NULL CHECK (trusted IN (0, 1)),
  created_at_ms INTEGER NOT NULL
);

CREATE TABLE daily_histogram (
  day_key TEXT NOT NULL,
  device_type TEXT NOT NULL,
  duration_bucket INTEGER NOT NULL,
  run_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day_key, device_type, duration_bucket)
);

CREATE TRIGGER increment_trusted_histogram
AFTER INSERT ON runs WHEN NEW.trusted = 1
BEGIN
  INSERT INTO daily_histogram(day_key, device_type, duration_bucket, run_count)
  VALUES (NEW.day_key, NEW.device_type, NEW.duration_bucket, 1)
  ON CONFLICT(day_key, device_type, duration_bucket)
  DO UPDATE SET run_count = run_count + 1;
END;

CREATE INDEX sessions_expiry_idx ON sessions(expires_at_ms);
CREATE INDEX runs_created_idx ON runs(created_at_ms);
