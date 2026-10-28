import { describe, it, expect, beforeAll } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  const sql = readFileSync(join(__dirname, "../supabase/migrations/0001_core.sql"), "utf8");
  await db.exec(sql);
});

describe("migration 0001_core", () => {
  it("tạo đủ bảng lõi", async () => {
    const r = await db.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema='public' order by table_name",
    );
    const names = r.rows.map((x) => x.table_name);
    for (const t of ["users", "customers", "quotes", "quote_items", "orders", "payments", "order_events", "audit_logs"]) {
      expect(names).toContain(t);
    }
  });

  it("từ chối tiền âm và tỷ lệ cọc ngoài 0–100", async () => {
    await db.exec("insert into customers (id, code, display_name) values ('00000000-0000-0000-0000-000000000001','C-1','Khách A')");
    await expect(
      db.exec(
        "insert into quotes (code, customer_id, subtotal, total, deposit_pct, deposit_amount) values ('Q-1','00000000-0000-0000-0000-000000000001', 1, -5, 50, 0)",
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(
        "insert into quotes (code, customer_id, subtotal, total, deposit_pct, deposit_amount) values ('Q-2','00000000-0000-0000-0000-000000000001', 1, 1, 150, 0)",
      ),
    ).rejects.toThrow();
  });

  it("không cho đã trả vượt tổng đơn", async () => {
    await expect(
      db.exec(
        "insert into orders (code, customer_id, total, amount_paid) values ('O-1','00000000-0000-0000-0000-000000000001', 100, 200)",
      ),
    ).rejects.toThrow();
  });

  it("bảng append-only không cho sửa hay xóa", async () => {
    await db.exec(
      "insert into audit_logs (actor_type, action, entity_type) values ('system','created','order')",
    );
    await expect(db.exec("update audit_logs set action='x'")).rejects.toThrow(/append-only/);
    await expect(db.exec("delete from audit_logs")).rejects.toThrow(/append-only/);
  });

  it("updated_at tự cập nhật bằng trigger", async () => {
    await db.exec("insert into services (id, code, name, category) values ('00000000-0000-0000-0000-00000000000a','logo','Logo','design')");
    const before = await db.query<{ updated_at: Date }>("select updated_at from services where code='logo'");
    await new Promise((r) => setTimeout(r, 15));
    await db.exec("update services set name='Logo tối giản' where code='logo'");
    const after = await db.query<{ updated_at: Date }>("select updated_at from services where code='logo'");
    expect(new Date(after.rows[0].updated_at).getTime()).toBeGreaterThan(new Date(before.rows[0].updated_at).getTime());
  });
});
