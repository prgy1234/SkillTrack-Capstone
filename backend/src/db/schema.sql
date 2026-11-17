CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('Coordinator', 'Candidate')),
  must_change_password INTEGER NOT NULL DEFAULT 0,
  temp_password_expiry TEXT,
  password_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS learners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  cohort TEXT NOT NULL,
  account_id INTEGER UNIQUE,
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  planned_hours REAL NOT NULL CHECK(planned_hours > 0)
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id INTEGER NOT NULL,
  activity_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK(status IN ('Not Started', 'In Progress', 'Completed')),
  FOREIGN KEY (learner_id) REFERENCES learners(id),
  FOREIGN KEY (activity_id) REFERENCES activities(id),
  UNIQUE(learner_id, activity_id)
);
