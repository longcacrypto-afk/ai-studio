import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Nhật ký sự kiện của một đơn: chỉ đọc, bảng order_events là append-only (đã chặn UPDATE/DELETE ở migration).
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const rows = await query<{ from_status: string | null; to_status: string; actor_type: string; reason: string | null; created_at: string }>(
    `select e.from_status, e.to_status, e.actor_type, e.reason, e.created_at
       from order_events e join orders o on o.id = e.order_id
      where o.code = $1 order by e.created_at desc limit 100`,
    [code],
  );
  return NextResponse.json({ events: rows });
}
