import { NextResponse } from "next/server";
import { nextReply, type IntakeState } from "@/lib/intake";

// POST /api/chat  { message, state? } → trả lời theo luật cố định, kèm báo giá từ engine nếu đủ brief.
export async function POST(req: Request) {
  let body: { message?: unknown; state?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 }); }
  if (typeof body.message !== "string" || body.message.length > 2000) {
    return NextResponse.json({ error: "Tin nhắn không hợp lệ" }, { status: 400 });
  }
  const state = (typeof body.state === "object" && body.state !== null ? body.state : {}) as IntakeState;
  return NextResponse.json(nextReply(body.message, state));
}
