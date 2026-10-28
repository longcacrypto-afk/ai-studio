import { NextResponse } from "next/server";
import { listOrders } from "@/lib/service";

export async function GET() {
  return NextResponse.json({ orders: await listOrders() });
}
