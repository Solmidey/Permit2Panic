import { NextResponse } from "next/server";
import { Hex } from "viem";

import { buildLockdownTx } from "@/lib/tx";
import type { TokenSpenderPair } from "@/lib/types";

const BATCH_SIZE = 10;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pairs } = body as { pairs: TokenSpenderPair[] };

    if (!pairs || pairs.length === 0) {
      return NextResponse.json({ error: "pairs are required" }, { status: 400 });
    }

    const batches = chunk(pairs, BATCH_SIZE).map((batch) => {
      const tx = buildLockdownTx(batch);
      return { to: tx.to, data: tx.data as Hex, value: tx.value.toString(), size: batch.length };
    });

    return NextResponse.json({
      message: "Submit lockdown transactions to revoke active allowances in bulk.",
      batches,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to prepare panic transaction" }, { status: 500 });
  }
}

function chunk<T>(arr: T[], size: number) {
  const groups: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    groups.push(arr.slice(i, i + size));
  }
  return groups;
}
