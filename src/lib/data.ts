import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  assessments,
  checkins,
  consents,
  dailyLogs,
  planTasks,
  plans,
  profiles,
  reportCitations,
  reports,
  symptomEvents,
} from "@/db/schema";
import { addDays } from "@/lib/utils";

export async function getProfile(userId: string) {
  const db = await getDb();
  const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return row ?? null;
}

export async function getLatestAssessment(userId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(assessments)
    .where(eq(assessments.userId, userId))
    .orderBy(desc(assessments.createdAt))
    .limit(1);
  return row ?? null;
}

export async function getLatestConsent(userId: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(consents)
    .where(eq(consents.userId, userId))
    .orderBy(desc(consents.agreedAt))
    .limit(1);
  return row ?? null;
}

export async function getLog(userId: string, date: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(dailyLogs)
    .where(and(eq(dailyLogs.userId, userId), eq(dailyLogs.logDate, date)))
    .limit(1);
  return row ?? null;
}

export async function getRecentLogs(userId: string, endDate: string, days: number) {
  const db = await getDb();
  const startDate = addDays(endDate, -(days - 1));
  return db
    .select()
    .from(dailyLogs)
    .where(
      and(eq(dailyLogs.userId, userId), gte(dailyLogs.logDate, startDate), lte(dailyLogs.logDate, endDate)),
    )
    .orderBy(dailyLogs.logDate);
}

export async function getSymptomEvents(userId: string, endDate: string, days = 60) {
  const db = await getDb();
  const startDate = addDays(endDate, -days);
  return db
    .select()
    .from(symptomEvents)
    .where(and(eq(symptomEvents.userId, userId), gte(symptomEvents.reportedOn, startDate)))
    .orderBy(desc(symptomEvents.reportedOn));
}

export async function getLatestReport(userId: string) {
  const db = await getDb();
  const [report] = await db
    .select()
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt))
    .limit(1);
  if (!report) return null;
  const citations = await db
    .select()
    .from(reportCitations)
    .where(eq(reportCitations.reportId, report.id))
    .orderBy(reportCitations.refIndex);
  return { report, citations };
}

export async function getPreviousReport(userId: string) {
  const db = await getDb();
  const rows = await db
    .select()
    .from(reports)
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt))
    .limit(2);
  return rows[1] ?? null;
}

export async function getReportCountToday(userId: string) {
  const db = await getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(
      and(
        eq(reports.userId, userId),
        sql`(${reports.createdAt} AT TIME ZONE 'Asia/Shanghai')::date = (now() AT TIME ZONE 'Asia/Shanghai')::date`,
      ),
    );
  return row?.count ?? 0;
}

export async function getActivePlan(userId: string) {
  const db = await getDb();
  const [plan] = await db
    .select()
    .from(plans)
    .where(eq(plans.userId, userId))
    .orderBy(desc(plans.createdAt))
    .limit(1);
  if (!plan) return null;

  const taskRows = await db
    .select({
      task: planTasks,
      checkinId: checkins.id,
      checkedOn: checkins.checkedOn,
    })
    .from(planTasks)
    .leftJoin(checkins, eq(checkins.planTaskId, planTasks.id))
    .where(eq(planTasks.planId, plan.id))
    .orderBy(planTasks.taskDate, planTasks.createdAt);

  const days = new Map<string, { date: string; tasks: (typeof taskRows)[number][] }>();
  for (const row of taskRows) {
    const date = row.task.taskDate;
    if (!days.has(date)) days.set(date, { date, tasks: [] });
    days.get(date)!.tasks.push(row);
  }

  return { plan, days: [...days.values()] };
}

export async function getExportBundle(userId: string) {
  const db = await getDb();
  const [profile, assessment, logs, symptoms, plan, reportRows, consentRows] = await Promise.all([
    getProfile(userId),
    getLatestAssessment(userId),
    db.select().from(dailyLogs).where(eq(dailyLogs.userId, userId)).orderBy(dailyLogs.logDate),
    db.select().from(symptomEvents).where(eq(symptomEvents.userId, userId)).orderBy(symptomEvents.reportedOn),
    getActivePlan(userId),
    db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt)),
    db.select().from(consents).where(eq(consents.userId, userId)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile,
    assessment,
    dailyLogs: logs,
    symptomEvents: symptoms,
    plan,
    reports: reportRows,
    consents: consentRows,
  };
}
