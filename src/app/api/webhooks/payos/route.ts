import { NextResponse } from "next/server";
import { recordDepositWebhook } from "@/lib/payments/record";
import { payosConfig } from "@/lib/payments/config";

// POST /api/webhooks/payos: chỉ ghi nhận sau khi chữ ký đúng và payOS xác nhận lại.
export async function POST(req: Request) {
  const cfg = payosConfig();
  if (!cfg) return NextResponse.json({ error: "not configured" }, { status: 503 });
  let payload;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  const r = await recordDepositWebhook(cfg, payload);
  if (r.kind === "rejected" && r.reason.includes("sẽ thử lại")) return NextResponse.json({ error: r.reason }, { status: 503 });
  return NextResponse.json({ ok: true, result: r.kind, reason: r.kind === "rejected" ? r.reason : undefined });
}
