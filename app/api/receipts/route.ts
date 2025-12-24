import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Keep UI stable even if you haven't implemented receipts persistence yet.
  return NextResponse.json({ receipts: [], error: null }, { status: 200 });
}
