import { NextResponse } from "next/server";
import { acceptQuote } from "@/lib/service";
import { QuoteNotAcceptable } from "@/lib/order-flow";

export async function POST(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const result = await acceptQuote(code);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof QuoteNotAcceptable) return NextResponse.json({ error: e.message }, { status: 409 });
    return NextResponse.json({ error: "Không chấp nhận được báo giá" }, { status: 500 });
  }
}
