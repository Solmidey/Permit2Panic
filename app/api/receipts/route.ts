import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Receipt = {
  id: string;
  owner: `0x${string}`;
  chainId: number;
  revoked: number;
  limited: number;
  panicked: number;
  summary: string;
  createdAt: number;
};

const g = globalThis as any;
g.__permit2panic_receipts ??= new Map<string, Receipt[]>();

function key(owner: string, chainId: number) {
  return `${chainId}:${owner.toLowerCase()}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const chainId = Number(searchParams.get("chainId"));

  if (!owner || !Number.isFinite(chainId)) {
    return NextResponse.json(
      { receipts: [], error: "Missing owner or chainId" },
      { status: 400 }
    );
  }

  const receipts = g.__permit2panic_receipts.get(key(owner, chainId)) ?? [];
  return NextResponse.json({ receipts, error: null }, { status: 200 });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const receipt: Receipt = {
    id: String(body.id ?? ""),
    owner: body.owner,
    chainId: Number(body.chainId),
    revoked: Number(body.revoked ?? 0),
    limited: Number(body.limited ?? 0),
    panicked: Number(body.panicked ?? 0),
    summary: String(body.summary ?? ""),
    createdAt: Number(body.createdAt ?? Date.now()),
  };

  if (!receipt.id || !receipt.owner || !Number.isFinite(receipt.chainId) || !receipt.summary) {
    return NextResponse.json(
      { ok: false, error: "Missing required receipt fields" },
      { status: 400 }
    );
  }

  const k = key(receipt.owner, receipt.chainId);
  const existing = g.__permit2panic_receipts.get(k) ?? [];
  g.__permit2panic_receipts.set(k, [receipt, ...existing]);

  return NextResponse.json({ ok: true, receipt }, { status: 200 });
}
