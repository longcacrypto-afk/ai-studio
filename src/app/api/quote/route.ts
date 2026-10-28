import { NextResponse } from "next/server";
import { price } from "@/lib/pricing";
import { findService } from "@/lib/catalog";

// POST /api/quote  { service: "logo", optionCodes?: string[], qty?: number, rush?: boolean }
// Báo giá chỉ do engine tính (AI không tự bịa giá). Chưa lưu DB ở lát này.
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu không đúng định dạng JSON" }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const service = typeof b.service === "string" ? findService(b.service) : undefined;
  if (!service) return NextResponse.json({ error: "Dịch vụ không tồn tại" }, { status: 404 });

  try {
    const result = price({
      service,
      optionCodes: Array.isArray(b.optionCodes) ? (b.optionCodes as string[]) : [],
      qty: typeof b.qty === "number" ? b.qty : 1,
      rush: b.rush === true,
    });
    return NextResponse.json({ service: service.code, revisions: service.includedRevisions, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Không tính được báo giá";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
