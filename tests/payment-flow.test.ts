import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.PGLITE_DIR = mkdtempSync(join(tmpdir(), "pglite-pay-"));
import { acceptQuote, createDepositPayment, listOrders } from "../src/lib/service";
import { recordDepositWebhook, type WebhookPayload } from "../src/lib/payments/record";
import { sign } from "../src/lib/payments/payos";
import { query } from "../src/lib/db";

const cfg = { clientId: "c", apiKey: "k", checksumKey: "test-checksum-key" };
const ORDER_CODE = 2610031;

// payOS giả lập: trạng thái PAID với số tiền đã trả
function fakePayos(status: string, amount: number) {
  return vi.fn(async () => new Response(JSON.stringify({ code: "00", desc: "success", data: { orderCode: ORDER_CODE, amount, amountPaid: amount, status } }), { status: 200 }));
}

function signedWebhook(amount: number, orderCode = ORDER_CODE): WebhookPayload {
  const data = { orderCode, amount, description: "COC", accountNumber: "1", reference: "R1", transactionDateTime: "2026-10-28 14:40:00", currency: "VND", paymentLinkId: "lnk", code: "00", desc: "Thành công" };
  return { code: "00", desc: "success", success: true, data, signature: sign(data, cfg.checksumKey) };
}

describe("thanh toán cọc qua payOS (DB thật + payOS giả lập)", () => {
  beforeAll(async () => {
    await acceptQuote("Q-2610-031", new Date("2026-10-28T14:00:00Z"));
    await createDepositPayment("AIS-2610-031", 645000, ORDER_CODE, "AIS2610031");
  });
  afterAll(() => vi.unstubAllGlobals());

  it("chữ ký sai bị từ chối, không ghi nhận", async () => {
    const w = signedWebhook(645000);
    w.signature = "sai";
    const r = await recordDepositWebhook(cfg, w);
    expect(r.kind).toBe("rejected");
    const [o] = (await listOrders()).filter((x) => x.code === "AIS-2610-031");
    expect(o.status).toBe("awaiting_deposit");
  });

  it("số tiền lệch so với payOS: chuyển cần đối soát, không xác nhận cọc", async () => {
    vi.stubGlobal("fetch", fakePayos("PAID", 600000));
    const r = await recordDepositWebhook(cfg, signedWebhook(600000));
    expect(r.kind).toBe("rejected");
    const [o] = (await listOrders()).filter((x) => x.code === "AIS-2610-031");
    expect(o.status).toBe("awaiting_deposit");
    const [p] = await query<{ status: string }>("select status from payments where provider_order_code = $1", [ORDER_CODE]);
    expect(p.status).toBe("needs_review");
  });

  it("payOS chưa báo PAID thì không xác nhận", async () => {
    vi.stubGlobal("fetch", fakePayos("PENDING", 645000));
    const r = await recordDepositWebhook(cfg, signedWebhook(645000));
    expect(r.kind).toBe("rejected");
  });

  it("thanh toán đúng: đơn chuyển confirmed, cọc ghi nhận", async () => {
    // payment vẫn đang needs_review từ bước trước; đặt lại để kiểm tra luồng đúng
    await query("update payments set status = 'pending' where provider_order_code = $1", [ORDER_CODE]);
    vi.stubGlobal("fetch", fakePayos("PAID", 645000));
    const r = await recordDepositWebhook(cfg, signedWebhook(645000));
    expect(r).toEqual({ kind: "confirmed", orderCode: "AIS-2610-031" });
    const [o] = (await listOrders()).filter((x) => x.code === "AIS-2610-031");
    expect(o.status).toBe("confirmed");
    expect(Number(o.amount_paid)).toBe(645000);
  });

  it("webhook gửi lại lần hai không ghi nhận thêm (idempotent)", async () => {
    vi.stubGlobal("fetch", fakePayos("PAID", 645000));
    const r = await recordDepositWebhook(cfg, signedWebhook(645000));
    expect(r.kind).toBe("already");
    const [o] = (await listOrders()).filter((x) => x.code === "AIS-2610-031");
    expect(Number(o.amount_paid)).toBe(645000);
  });
});
