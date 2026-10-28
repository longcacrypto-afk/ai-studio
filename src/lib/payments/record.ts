// Ghi nhận thanh toán cọc: chỉ xác nhận khi (1) chữ ký webhook đúng, (2) payOS xác nhận lại trạng thái, (3) số tiền khớp.
// Idempotent: cùng một orderCode gửi lại nhiều lần chỉ ghi nhận một lần.
import { tx } from "../db";
import { verifySignature, getPaymentRequest, type PayosConfig } from "./payos";

export type RecordOutcome =
  | { kind: "confirmed"; orderCode: string }
  | { kind: "already" }
  | { kind: "rejected"; reason: string };

export interface WebhookPayload {
  code?: string;
  desc?: string;
  success?: boolean;
  data?: Record<string, unknown> & { orderCode: number; amount: number; paymentLinkId?: string; code?: string };
  signature?: string;
}

export async function recordDepositWebhook(cfg: PayosConfig, payload: WebhookPayload): Promise<RecordOutcome> {
  if (!payload?.data || typeof payload.signature !== "string") return { kind: "rejected", reason: "payload thiếu dữ liệu" };
  // (1) chữ ký
  if (!verifySignature(payload.data, payload.signature, cfg.checksumKey)) return { kind: "rejected", reason: "chữ ký không đúng" };
  if (payload.data.code !== "00") return { kind: "rejected", reason: "giao dịch chưa thành công" };

  const orderCode = payload.data.orderCode;
  // (2) đối chiếu với payOS: nguồn sự thật là payOS
  let remote;
  try {
    remote = await getPaymentRequest(cfg, orderCode);
  } catch {
    return { kind: "rejected", reason: "không đối chiếu được với payOS, sẽ thử lại" };
  }
  if (remote.status !== "PAID") return { kind: "rejected", reason: `payOS báo trạng thái ${remote.status}` };

  return tx(async (q) => {
    // (3) khóa payment theo provider_order_code, chống ghi trùng
    const rows = await q<{ id: string; order_id: string; amount_expected: string; status: string; code: string }>(
      "select id, order_id, amount_expected, status, code from payments where provider_order_code = $1 for update",
      [orderCode],
    );
    const p = rows[0];
    if (!p) return { kind: "rejected", reason: "không có khoản thanh toán này" };
    if (p.status === "paid") return { kind: "already" };
    if (Number(p.amount_expected) !== Number(remote.amount) || Number(remote.amount) !== Number(payload.data!.amount)) {
      await q("update payments set status = 'needs_review' where id = $1", [p.id]);
      return { kind: "rejected", reason: "số tiền không khớp, chuyển chuyên viên đối soát" };
    }
    await q(
      "update payments set status = 'paid', amount_received = $2, paid_at = now(), verified_via = 'webhook' where id = $1",
      [p.id, remote.amountPaid ?? remote.amount],
    );
    const [o] = await q<{ code: string; status: string }>("select code, status from orders where id = $1 for update", [p.order_id]);
    if (o.status === "awaiting_deposit") {
      await q("update orders set status = 'confirmed', amount_paid = amount_paid + $2 where id = $1", [p.order_id, remote.amountPaid ?? remote.amount]);
      await q(
        "insert into order_events (order_id, from_status, to_status, actor_type, reason) values ($1, 'awaiting_deposit', 'confirmed', 'provider', 'Webhook payOS xác nhận cọc ' || $2)",
        [p.order_id, p.code],
      );
    } else {
      await q("update orders set amount_paid = amount_paid + $2 where id = $1", [p.order_id, remote.amountPaid ?? remote.amount]);
    }
    return { kind: "confirmed", orderCode: o.code };
  });
}
