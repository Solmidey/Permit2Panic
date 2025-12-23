import { NextResponse } from "next/server";
import { Address } from "viem";

import { listReceipts, saveReceipt } from "@/lib/db/queries";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner") as Address | null;
  const chainId = Number(searchParams.get("chainId"));
  if (!owner || !chainId) {
    return NextResponse.json({ error: "owner and chainId are required" }, { status: 400 });
  }
  const items = await listReceipts(chainId, owner);
  return NextResponse.json({ receipts: items });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { owner, chainId, revoked, limited, panicked, summary } = body as {
      owner: Address;
      chainId: number;
      revoked: number;
      limited: number;
      panicked: number;
      summary: string;
    };
    if (!owner || !chainId) {
      return NextResponse.json({ error: "owner and chainId are required" }, { status: 400 });
    }
    await saveReceipt({ owner, chainId, revoked, limited, panicked, summary, createdAt: Math.floor(Date.now() / 1000) });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save receipt" }, { status: 500 });
  }
}
