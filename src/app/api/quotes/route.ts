import { NextResponse } from "next/server";
import { listQuotes } from "@/lib/service";

export async function GET() {
  return NextResponse.json({ quotes: await listQuotes() });
}
