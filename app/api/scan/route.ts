import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { setScanProgress } from "@/lib/scan-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const client = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
});

export async function POST(req: Request) {
  try {
    setScanProgress(0);

    const body = await req.json();
    const chainId = Number(body.chainId ?? 8453);

    if (chainId !== 8453) {
      return NextResponse.json(
        { ok: false, error: "Only Base is supported" },
        { status: 400 }
      );
    }

    const latest = await client.getBlockNumber();
    const fromBlock = latest - BigInt(40_000);

    let scanned = BigInt(0);
    const total = latest - fromBlock;

    const logs = await client.getLogs({
      address: PERMIT2,
      fromBlock,
      toBlock: latest,
    });

    for (const _ of logs) {
      scanned++;
      const progress = Number((scanned * BigInt(100)) / total);
      setScanProgress(progress);
    }

    setScanProgress(100);

    return NextResponse.json({
      ok: true,
      allowances: [],
      meta: { logs: logs.length },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message },
      { status: 500 }
    );
  }
}
