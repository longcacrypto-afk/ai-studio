import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.PGLITE_DIR = mkdtempSync(join(tmpdir(), "pglite-"));
import { acceptQuote, listQuotes, listOrders } from "../src/lib/service";
import { QuoteNotAcceptable } from "../src/lib/order-flow";

// Dùng DB thật (PGlite, đúng migration + seed). Test chạy theo thứ tự trong file.
describe("nghiệp vụ báo giá → đơn trên DB", () => {
  beforeAll(async () => {
    const quotes = await listQuotes();
    expect(quotes.some((q) => q.code === "Q-2610-031")).toBe(true);
  });

  it("chấp nhận báo giá tạo đơn chờ cọc với cọc đúng 50%", async () => {
    const r = await acceptQuote("Q-2610-031", new Date("2026-10-28T14:00:00Z"));
    expect(r.orderCode).toBe("AIS-2610-031");
    expect(r.depositDue).toBe(645000);
    const orders = await listOrders();
    const o = orders.find((x) => x.code === "AIS-2610-031");
    expect(o?.status).toBe("awaiting_deposit");
    expect(Number(o?.total)).toBe(1290000);
  });

  it("chấp nhận lần hai bị chặn, không tạo đơn trùng", async () => {
    await expect(acceptQuote("Q-2610-031", new Date("2026-10-28T14:01:00Z"))).rejects.toThrow(QuoteNotAcceptable);
    const orders = (await listOrders()).filter((x) => x.code === "AIS-2610-031");
    expect(orders.length).toBe(1);
  });

  it("báo giá không tồn tại bị từ chối", async () => {
    await expect(acceptQuote("Q-9999-999")).rejects.toThrow(QuoteNotAcceptable);
  });
});
