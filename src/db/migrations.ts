export interface Migration {
  id: string;
  sql: string;
}

const init = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sex text NOT NULL DEFAULT 'female',
  birth_year int,
  height_cm real,
  weight_kg real,
  waist_cm real,
  target_weight_kg real,
  goal text NOT NULL DEFAULT 'overall',
  activity_level text NOT NULL DEFAULT 'light',
  chronotype text,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  medications text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version text NOT NULL,
  scope text NOT NULL DEFAULT 'health-data',
  agreed_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  ip text
);
CREATE INDEX IF NOT EXISTS consents_user_idx ON consents(user_id);

CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers jsonb NOT NULL,
  baseline jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assessments_user_idx ON assessments(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  sleep_start text,
  sleep_end text,
  sleep_minutes int,
  sleep_latency_min int,
  night_wakes int,
  sleep_quality int,
  bedtime_deviation_min int,
  steps int,
  exercise_minutes int,
  vigorous_minutes int,
  strength_training boolean NOT NULL DEFAULT false,
  sedentary_hours real,
  water_ml int,
  caffeine_cups int,
  caffeine_after_2pm boolean NOT NULL DEFAULT false,
  alcohol_units real,
  smoked boolean NOT NULL DEFAULT false,
  mood int,
  stress int,
  energy int,
  bowel_count int,
  bristol int,
  bloating boolean NOT NULL DEFAULT false,
  meals jsonb,
  symptoms jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_logs_user_date_uq UNIQUE (user_id, log_date)
);
CREATE INDEX IF NOT EXISTS daily_logs_user_date_idx ON daily_logs(user_id, log_date DESC);

CREATE TABLE IF NOT EXISTS symptom_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_on date NOT NULL,
  code text NOT NULL,
  severity int NOT NULL DEFAULT 1,
  duration_days int,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS symptom_events_user_idx ON symptom_events(user_id, reported_on DESC);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  overall int NOT NULL,
  scores jsonb NOT NULL,
  top_issues jsonb NOT NULL,
  red_flags jsonb NOT NULL,
  content jsonb NOT NULL,
  engine text NOT NULL,
  model text,
  prompt_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_user_idx ON reports(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS kb_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  publisher text,
  published_year int,
  url text,
  edition text,
  content_hash text,
  ingested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kb_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id uuid NOT NULL REFERENCES kb_docs(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  section_path text NOT NULL,
  content text NOT NULL,
  embedding vector(1024),
  token_estimate int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kb_chunks_doc_idx ON kb_chunks(doc_id);

CREATE TABLE IF NOT EXISTS report_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  chunk_id uuid REFERENCES kb_chunks(id) ON DELETE SET NULL,
  ref_index int NOT NULL,
  doc_title text NOT NULL,
  section_path text NOT NULL,
  excerpt text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_citations_report_idx ON report_citations(report_id);

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  focus_areas jsonb NOT NULL,
  engine text NOT NULL DEFAULT 'rules',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plans_user_idx ON plans(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  task_date date NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  detail text,
  metric_key text,
  target_value real,
  target_unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plan_tasks_plan_idx ON plan_tasks(plan_id, task_date);

CREATE TABLE IF NOT EXISTS checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_task_id uuid NOT NULL REFERENCES plan_tasks(id) ON DELETE CASCADE,
  checked_on date NOT NULL DEFAULT CURRENT_DATE,
  done boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT checkins_task_uq UNIQUE (plan_task_id)
);

CREATE TABLE IF NOT EXISTS ai_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  kind text NOT NULL,
  model text,
  ok boolean NOT NULL DEFAULT true,
  latency_ms int,
  prompt_tokens int,
  completion_tokens int,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
`;

export const MIGRATIONS: Migration[] = [{ id: "0001_init", sql: init }];
