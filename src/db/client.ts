import path from "node:path";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { MIGRATIONS } from "./migrations";

export interface DbBundle {
  db: PgDatabase<never, typeof schema>;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  exec(text: string): Promise<void>;
  close(): Promise<void>;
  dialect: "postgres" | "pglite";
}

type GlobalWithDb = typeof globalThis & {
  __healthCompassDb?: Promise<DbBundle>;
};

const globalForDb = globalThis as GlobalWithDb;

async function createPostgres(url: string): Promise<DbBundle> {
  const { default: postgres } = await import("postgres");
  const { drizzle } = await import("drizzle-orm/postgres-js");

  const client = postgres(url, {
    max: 8,
    idle_timeout: 20,
    prepare: false,
    onnotice: () => {},
  });
  const db = drizzle(client, { schema }) as unknown as PgDatabase<never, typeof schema>;

  return {
    db,
    dialect: "postgres",
    query: async <T>(text: string, params: unknown[] = []) =>
      (await client.unsafe(text, params as never[])) as unknown as T[],
    exec: async (text: string) => {
      await client.unsafe(text);
    },
    close: async () => {
      await client.end();
    },
  };
}

async function createPglite(dataDir: string): Promise<DbBundle> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { vector } = await import("@electric-sql/pglite/vector");
  const { drizzle } = await import("drizzle-orm/pglite");

  const pg = new PGlite(dataDir, { extensions: { vector } });
  await pg.waitReady;
  const db = drizzle(pg, { schema }) as unknown as PgDatabase<never, typeof schema>;

  return {
    db,
    dialect: "pglite",
    query: async <T>(text: string, params: unknown[] = []) => {
      const result = await pg.query<T>(text, params);
      return result.rows;
    },
    exec: async (text: string) => {
      await pg.exec(text);
    },
    close: async () => {
      await pg.close();
    },
  };
}

async function applyMigrations(bundle: DbBundle) {
  await bundle.exec(
    `CREATE TABLE IF NOT EXISTS app_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const applied = await bundle.query<{ id: string }>(`SELECT id FROM app_migrations`);
  const done = new Set(applied.map((row) => row.id));

  for (const migration of MIGRATIONS) {
    if (done.has(migration.id)) continue;
    await bundle.exec(migration.sql);
    await bundle.query(`INSERT INTO app_migrations (id) VALUES ($1) ON CONFLICT DO NOTHING`, [
      migration.id,
    ]);
  }
}

async function init(): Promise<DbBundle> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const bundle = databaseUrl
    ? await createPostgres(databaseUrl)
    : await createPglite(path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR || ".pglite"));

  await applyMigrations(bundle);
  return bundle;
}

/**
 * 首次调用时建立连接并执行建表语句；开发环境热更新复用同一连接。
 */
export function ensureDatabase(): Promise<DbBundle> {
  if (!globalForDb.__healthCompassDb) {
    globalForDb.__healthCompassDb = init().catch((error) => {
      globalForDb.__healthCompassDb = undefined;
      throw error;
    });
  }
  return globalForDb.__healthCompassDb;
}

export async function getDb() {
  return (await ensureDatabase()).db;
}

/**
 * 关闭连接。只在一次性脚本里调用：Web 运行时会一直复用同一个连接，
 * 而 CLI 脚本结束后如果不关闭，PGlite 残留的定时器会让进程无法退出。
 */
export async function closeDatabase(): Promise<void> {
  const pending = globalForDb.__healthCompassDb;
  if (!pending) return;
  globalForDb.__healthCompassDb = undefined;
  try {
    const bundle = await pending;
    await bundle.close();
  } catch {
    // 连接本身建立失败时无需再关闭
  }
}

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.map((value) => Number(value.toFixed(6))).join(",")}]`;
}
