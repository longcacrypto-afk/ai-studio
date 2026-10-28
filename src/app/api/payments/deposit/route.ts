import { NextResponse } from "next/server";
import { createDepositPayment, getQuote } from "@/lib/service";
import { createPaymentRequest } from "@/lib/payments/payos";
import { payosConfig } from "@/lib/payments/config";

// POST /api/payments/deposit { orderCode } → tạo link thanh toán cọc qua payOS.
export async function POST(req: Request) {
  const cfg = payosConfig();
  if (!cfg) return NextResponse.json({ error: "Cổng thanh toán chưa được cấu hình" }, { status: 503 });
  let body: { orderCode?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 }); }
  if (typeof body.orderCode !== "string") return NextResponse.json({ error: "Thiếu mã đơn" }, { status: 400 });

  const quoteCode = "Q-" + body.orderCode.replace(/^AIS-/, "");
  const quote = await getQuote(quoteCode);
  if (!quote) return NextResponse.json({ error: "Không tìm thấy báo giá" }, { status: 404 });
  const amount = Number(quote.deposit_amount);

  // orderCode số của payOS: lấy từ số đơn (2610031), duy nhất theo đơn
  const providerOrderCode = Number(body.orderCode.replace(/\D/g, ""));
  const base = new URL(req.url).origin;
  try {
    await createDepositPayment(body.orderCode, amount, providerOrderCode, "AIS" + providerOrderCode);
    const link = await createPaymentRequest(cfg, {
      orderCode: providerOrderCode,
      amount,
      description: "Coc " + providerOrderCode,
      cancelUrl: base + "/index.html#c-08",
      returnUrl: base + "/index.html#c-08",
    });
    return NextResponse.json({ checkoutUrl: link.checkoutUrl, qrCode: link.qrCode, amount });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Không tạo được link thanh toán" }, { status: 502 });
  }
}
