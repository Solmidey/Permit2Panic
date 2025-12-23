import { NextResponse } from "next/server";
import { Address } from "viem";

import { getCachedAllowances, scanAllowances } from "@/lib/scan";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner, chainId, deep } = body as { owner: Address; chainId: number; deep?: boolean };
    if (!owner || !chainId) {
      return NextResponse.json({ error: "owner and chainId are required" }, { status: 400 });
    }
    const allowances = await scanAllowances({ owner, chainId, deep });
    return NextResponse.json({ allowances });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to scan allowances" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner") as Address | null;
  const chainId = Number(searchParams.get("chainId"));
  if (!owner || !chainId) {
    return NextResponse.json({ error: "owner and chainId are required" }, { status: 400 });
  }
  const allowances = await getCachedAllowances(chainId, owner);
  return NextResponse.json({ allowances });
}
