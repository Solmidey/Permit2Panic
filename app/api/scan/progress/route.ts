import { NextResponse } from "next/server";
import { getScanProgress } from "@/lib/scan-progress";

export function GET() {
  return NextResponse.json({
    progress: getScanProgress(),
  });
}
