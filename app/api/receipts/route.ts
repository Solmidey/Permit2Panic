import { NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Receipt = {
  id: string;
  createdAt: number;
  owner: `0x${string}`;
  chainId: number;
  revoked: number;
  limited: number;
  panicked: number;
  summary: string;
};

const STORE_KEY = "__permit2panic_receipts__";

function getStore(): Map<string, Receipt[]> {
  const g = globalThis as any;
  if (!g[STORE_KEY]) g[STORE_KEY] = new Map<string, Receipt[]>();
  return g[STORE_KEY];
}

function key(owner: string, chainId: number) {
  return `${owner.toLowerCase()}:${chainId}`;
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner") ?? "";
  const chainId = Number(searchParams.get("chainId") ?? "0");

  if (!owner || !isAddress(owner) || !Number.isFinite(chainId) || chainId <= 0) {
    return NextResponse.json({ ok: false, receipts: [], error: "Invalid owner/chainId" }, { status: 400 });
  }

  const o = getAddress(owner);
  const store = getStore();
  const receipts = store.get(key(o, chainId)) ?? [];

  return NextResponse.json({ ok: true, receipts, error: null }, { status: 200 });
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const owner = body?.owner;
  const chainId = Number(body?.chainId);

  if (!owner || !isAddress(owner) || !Number.isFinite(chainId) || chainId <= 0) {
    return NextResponse.json({ ok: false, error: "Missing required receipt fields" }, { status: 400 });
  }

  const receipt: Receipt = {
    id: typeof body?.id === "string" && body.id ? body.id : makeId(),
    createdAt: typeof body?.createdAt === "number" ? body.createdAt : Date.now(),
    owner: getAddress(owner) as `0x${string}`,
    chainId,
    revoked: Number(body?.revoked ?? 0),
    limited: Number(body?.limited ?? 0),
    panicked: Number(body?.panicked ?? 0),
    summary: typeof body?.summary === "string" && body.summary ? body.summary : "Receipt saved",
  };

  const store = getStore();
  const k = key(receipt.owner, chainId);
  const prev = store.get(k) ?? [];
  store.set(k, [receipt, ...prev].slice(0, 200));

  return NextResponse.json({ ok: true, receipt, error: null }, { status: 200 });
}
