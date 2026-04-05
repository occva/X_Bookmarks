CREATE TABLE IF NOT EXISTS tweets (
  id TEXT PRIMARY KEY,
  created_at_ms INTEGER NOT NULL,
  author_screen_name TEXT,
  author_name TEXT,
  tweet_json TEXT NOT NULL,
  inserted_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tweets_created_id
  ON tweets (created_at_ms DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_tweets_author_screen_name
  ON tweets (author_screen_name);

CREATE TABLE IF NOT EXISTS import_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,
  source_label TEXT,
  parsed_count INTEGER NOT NULL,
  inserted_count INTEGER NOT NULL,
  updated_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL
);
