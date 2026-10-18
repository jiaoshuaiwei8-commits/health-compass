import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import type {
  AssessmentAnswers,
  Baseline,
  DimensionScore,
  Finding,
  Meals,
  PlanTaskDraft,
  RedFlag,
  ReportContent,
  SymptomCode,
} from "@/lib/types";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  sex: text("sex").notNull().default("female"),
  birthYear: integer("birth_year"),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  waistCm: real("waist_cm"),
  targetWeightKg: real("target_weight_kg"),
  goal: text("goal").notNull().default("overall"),
  activityLevel: text("activity_level").notNull().default("light"),
  chronotype: text("chronotype"),
  conditions: jsonb("conditions").$type<string[]>().notNull().default([]),
  medications: text("medications"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const consents = pgTable(
  "consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    scope: text("scope").notNull().default("health-data"),
    agreedAt: timestamp("agreed_at", { withTimezone: true }).notNull().defaultNow(),
    userAgent: text("user_agent"),
    ip: text("ip"),
  },
  (table) => [index("consents_user_idx").on(table.userId)],
);

export const assessments = pgTable(
  "assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    answers: jsonb("answers").$type<AssessmentAnswers>().notNull(),
    baseline: jsonb("baseline").$type<Baseline>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("assessments_user_idx").on(table.userId, table.createdAt)],
);

export const dailyLogs = pgTable(
  "daily_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    logDate: date("log_date", { mode: "string" }).notNull(),
    sleepStart: text("sleep_start"),
    sleepEnd: text("sleep_end"),
    sleepMinutes: integer("sleep_minutes"),
    sleepLatencyMin: integer("sleep_latency_min"),
    nightWakes: integer("night_wakes"),
    sleepQuality: integer("sleep_quality"),
    bedtimeDeviationMin: integer("bedtime_deviation_min"),
    steps: integer("steps"),
    exerciseMinutes: integer("exercise_minutes"),
    vigorousMinutes: integer("vigorous_minutes"),
    strengthTraining: boolean("strength_training").notNull().default(false),
    sedentaryHours: real("sedentary_hours"),
    waterMl: integer("water_ml"),
    caffeineCups: integer("caffeine_cups"),
    caffeineAfter2pm: boolean("caffeine_after_2pm").notNull().default(false),
    alcoholUnits: real("alcohol_units"),
    smoked: boolean("smoked").notNull().default(false),
    mood: integer("mood"),
    stress: integer("stress"),
    energy: integer("energy"),
    bowelCount: integer("bowel_count"),
    bristol: integer("bristol"),
    bloating: boolean("bloating").notNull().default(false),
    meals: jsonb("meals").$type<Meals>(),
    symptoms: jsonb("symptoms").$type<SymptomCode[]>(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("daily_logs_user_date_uq").on(table.userId, table.logDate),
    index("daily_logs_user_date_idx").on(table.userId, table.logDate),
  ],
);

export const symptomEvents = pgTable(
  "symptom_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportedOn: date("reported_on", { mode: "string" }).notNull(),
    code: text("code").notNull(),
    severity: integer("severity").notNull().default(1),
    durationDays: integer("duration_days"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("symptom_events_user_idx").on(table.userId, table.reportedOn)],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodStart: date("period_start", { mode: "string" }).notNull(),
    periodEnd: date("period_end", { mode: "string" }).notNull(),
    overall: integer("overall").notNull(),
    scores: jsonb("scores").$type<DimensionScore[]>().notNull(),
    topIssues: jsonb("top_issues").$type<Finding[]>().notNull(),
    redFlags: jsonb("red_flags").$type<RedFlag[]>().notNull(),
    content: jsonb("content").$type<ReportContent>().notNull(),
    engine: text("engine").notNull(),
    model: text("model"),
    promptVersion: text("prompt_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reports_user_idx").on(table.userId, table.createdAt)],
);

export const kbDocs = pgTable("kb_docs", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  publisher: text("publisher"),
  publishedYear: integer("published_year"),
  url: text("url"),
  edition: text("edition"),
  contentHash: text("content_hash"),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kbChunks = pgTable(
  "kb_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    docId: uuid("doc_id")
      .notNull()
      .references(() => kbDocs.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    sectionPath: text("section_path").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }),
    tokenEstimate: integer("token_estimate"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("kb_chunks_doc_idx").on(table.docId)],
);

export const reportCitations = pgTable(
  "report_citations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id, { onDelete: "cascade" }),
    chunkId: uuid("chunk_id").references(() => kbChunks.id, { onDelete: "set null" }),
    refIndex: integer("ref_index").notNull(),
    docTitle: text("doc_title").notNull(),
    sectionPath: text("section_path").notNull(),
    excerpt: text("excerpt").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("report_citations_report_idx").on(table.reportId)],
);

export const plans = pgTable(
  "plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportId: uuid("report_id").references(() => reports.id, { onDelete: "set null" }),
    startDate: date("start_date", { mode: "string" }).notNull(),
    endDate: date("end_date", { mode: "string" }).notNull(),
    focusAreas: jsonb("focus_areas").$type<string[]>().notNull(),
    engine: text("engine").notNull().default("rules"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("plans_user_idx").on(table.userId, table.createdAt)],
);

export const planTasks = pgTable(
  "plan_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    taskDate: date("task_date", { mode: "string" }).notNull(),
    category: text("category").$type<PlanTaskDraft["category"]>().notNull(),
    title: text("title").notNull(),
    detail: text("detail"),
    metricKey: text("metric_key"),
    targetValue: real("target_value"),
    targetUnit: text("target_unit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("plan_tasks_plan_idx").on(table.planId, table.taskDate)],
);

export const checkins = pgTable(
  "checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planTaskId: uuid("plan_task_id")
      .notNull()
      .references(() => planTasks.id, { onDelete: "cascade" }),
    checkedOn: date("checked_on", { mode: "string" }).notNull(),
    done: boolean("done").notNull().default(true),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("checkins_task_uq").on(table.planTaskId)],
);

export const aiCalls = pgTable("ai_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  kind: text("kind").notNull(),
  model: text("model"),
  ok: boolean("ok").notNull().default(true),
  latencyMs: integer("latency_ms"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
