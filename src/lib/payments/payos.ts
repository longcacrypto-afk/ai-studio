// payOS: tạo link thanh toán, xác thực webhook (HMAC-SHA256), đối chiếu trạng thái với payOS trước khi ghi nhận tiền.
// Tài liệu: payos.vn/docs/api, /docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature
import { createHmac, timingSafeEqual } from "node:crypto";

// Chuỗi ký: các cặp key=value sắp theo key (alphabet), nối bằng &. Null/undefined thành rỗng, object/array thành JSON.
export function buildSignString(data: Record<string, unknown>): string {
  return Object.keys(data)
    .sort()
    .map((k) => {
      let v = data[k];
      if (v === null || v === undefined || v === "undefined" || v === "null") v = "";
      else if (typeof v === "object") v = JSON.stringify(v);
      return `${k}=${v}`;
    })
    .join("&");
}

export function sign(data: Record<string, unknown>, checksumKey: string): string {
  return createHmac("sha256", checksumKey).update(buildSignString(data)).digest("hex");
}

// So sánh chữ ký bằng timingSafeEqual.
export function verifySignature(data: Record<string, unknown>, signature: string, checksumKey: string): boolean {
  const expected = Buffer.from(sign(data, checksumKey), "utf8");
  const got = Buffer.from(String(signature ?? ""), "utf8");
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export interface PaymentRequestInput {
  orderCode: number;
  amount: number;
  description: string; // tối đa 9 ký tự với tài khoản không liên kết payOS
  cancelUrl: string;
  returnUrl: string;
  expiredAt?: number;
}

export interface PayosConfig {
  clientId: string;
  apiKey: string;
  checksumKey: string;
  baseUrl?: string;
}

const DEFAULT_BASE = "https://api-merchant.payos.vn";

export async function createPaymentRequest(cfg: PayosConfig, input: PaymentRequestInput) {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new Error("Số tiền phải là số nguyên dương");
  const signed = { amount: input.amount, cancelUrl: input.cancelUrl, description: input.description, orderCode: input.orderCode, returnUrl: input.returnUrl };
  const body = { ...input, signature: sign(signed, cfg.checksumKey) };
  const res = await fetch(`${cfg.baseUrl ?? DEFAULT_BASE}/v2/payment-requests`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-client-id": cfg.clientId, "x-api-key": cfg.apiKey },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { code: string; desc: string; data?: { checkoutUrl: string; paymentLinkId: string; qrCode: string; status: string } };
  if (!res.ok || json.code !== "00" || !json.data) throw new Error(`payOS từ chối: ${json.desc ?? res.status}`);
  return json.data;
}

// Đối chiếu trực tiếp với payOS: nguồn sự thật là payOS, không tin payload webhook một mình.
export async function getPaymentRequest(cfg: PayosConfig, orderCode: number) {
  const res = await fetch(`${cfg.baseUrl ?? DEFAULT_BASE}/v2/payment-requests/${orderCode}`, {
    headers: { "x-client-id": cfg.clientId, "x-api-key": cfg.apiKey },
  });
  const json = (await res.json()) as { code: string; data?: { orderCode: number; amount: number; amountPaid: number; status: string } };
  if (!res.ok || json.code !== "00" || !json.data) throw new Error("Không đối chiếu được với payOS");
  return json.data;
}
