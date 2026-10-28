// Database cho bản chạy thử: PGlite (Postgres thật, chạy trong Node). Khi có Supabase, đổi driver ở đây.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { mkdirSync } from "node:fs";

type Db = PGlite;
let instance: Promise<Db> | null = null;

export function getDb(): Promise<Db> {
  if (!instance) {
    instance = (async () => {
      // Lưu ra đĩa để dữ liệu còn sau khi khởi động lại. PGLITE_DIR đặt ở đâu tùy môi trường.
      const dir = process.env.PGLITE_DIR || join(process.cwd(), ".data/pglite");
      mkdirSync(dirname(dir), { recursive: true });
      const db = new PGlite(dir);
      const sql = readFileSync(join(process.cwd(), "supabase/migrations/0001_core.sql"), "utf8");
      const [{ n }] = (await db.query<{ n: number }>("select count(*)::int as n from information_schema.tables where table_schema = 'public'")).rows;
      if (n === 0) {
        await db.exec(sql);
        await seed(db);
      }
      return db;
    })();
  }
  return instance;
}

// Dữ liệu mẫu theo prototype: khách Quán Mộc An, một báo giá chờ chấp nhận, một đơn đã cọc.
async function seed(db: Db) {
  await db.exec(`
    insert into users (id, email, full_name) values
      ('00000000-0000-0000-0000-0000000000a1', 'ngochan@mocan.vn', 'Ngọc Hân') on conflict do nothing;
    insert into customers (id, code, display_name) values
      ('00000000-0000-0000-0000-0000000000c1', 'KH-MOCAN', 'Quán Mộc An') on conflict do nothing;
    insert into customer_members (customer_id, user_id, role) values
      ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a1', 'owner') on conflict do nothing;
    insert into quotes (id, code, customer_id, status, subtotal, total, deposit_pct, deposit_amount, valid_until) values
      ('00000000-0000-0000-0000-0000000000f1', 'Q-2610-031', '00000000-0000-0000-0000-0000000000c1', 'sent', 1290000, 1290000, 50, 645000, '2026-10-30T16:59:00Z') on conflict do nothing;
  `);
}

export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const r = await db.query<T>(sql, params);
  return r.rows;
}

export async function exec(sql: string, params: unknown[] = []): Promise<void> {
  const db = await getDb();
  await db.query(sql, params);
}

export async function tx<T>(fn: (q: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(async (t) => {
    return fn(async <R>(sql: string, params: unknown[] = []) => (await t.query<R>(sql, params)).rows);
  });
}
