import { NextResponse } from "next/server";
import { createPublicClient, http, fallback, isAddress } from "viem";
import { base } from "viem/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// If you’re on Vercel Pro you can raise this; safe to keep.
export const maxDuration = 60;

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;

// topic0s you observed
const TOPIC0S = [
  "0xda9fa7c1b00402c17d0161b249b1ab8bbec047c5a52207b9c112deffd817036b",
  "0xc6a377bfc4eb120024a8ac08eef205be16b817020812c73223e81d1bdb9708ec",
  "0x89b1add15eff56b3dfe299ad94e01f2b52fbcb80ae1a3baea6ae8c04cb2b98a4",
] as const;

const allowanceAbi = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  },
] as const;

const erc20Abi = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

const DEFAULT_LOOKBACK = 40_000; // fast default
const MAX_LOOKBACK = 200_000; // safety cap

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function rpcUrls() {
  const raw =
    process.env.NEXT_PUBLIC_BASE_RPC_URLS ||
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    "https://mainnet.base.org";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function client() {
  const urls = rpcUrls();
  return createPublicClient({
    chain: base,
    transport: fallback(urls.map((u) => http(u, { timeout: 20_000 })), { rank: true }),
  });
}

const toHexBlock = (b: bigint) => `0x${b.toString(16)}` as `0x${string}`;

function topicToAddress(topic: `0x${string}`) {
  return `0x${topic.slice(26)}` as `0x${string}`;
}

async function safeTokenMeta(token: `0x${string}`) {
  const c = client();
  const [symbol, decimals] = await Promise.all([
    c.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).catch(() => "TOKEN"),
    c.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
  ]);
  return { symbol, decimals };
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.max(1, limit)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function getLogsChunked(opts: {
  fromBlock: bigint;
  toBlock: bigint;
  ownerTopic: `0x${string}`;
  timeBudgetMs?: number;
}) {
  const c = client();
  const logs: any[] = [];

  let from = opts.fromBlock;
  let step = BigInt(20_000);
  const minStep = BigInt(2_000);

  const started = Date.now();
  const budget = typeof opts.timeBudgetMs === "number" ? opts.timeBudgetMs : 22_000;

  while (from <= opts.toBlock) {
    // Don’t hang forever — return partial logs.
    if (Date.now() - started > budget) break;

    let to = from + step;
    if (to > opts.toBlock) to = opts.toBlock;

    try {
      const chunk = await c.request({
        method: "eth_getLogs",
        params: [
          {
            address: PERMIT2,
            fromBlock: toHexBlock(from),
            toBlock: toHexBlock(to),
            topics: [Array.from(TOPIC0S), opts.ownerTopic],
          },
        ],
      });

      logs.push(...(chunk as any[]));
      from = to + BigInt(1);
      if (step < BigInt(60_000)) step = step + BigInt(5_000);
    } catch (e: any) {
      // shrink chunk on RPC limits
      if (step > minStep) {
        step = step / BigInt(2);
        continue;
      }
      throw e;
    }
  }

  return logs;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const owner = body.owner as `0x${string}` | undefined;
    const chainId = Number(body.chainId ?? 8453);

    if (!owner || !isAddress(owner)) {
      return NextResponse.json({ ok: false, allowances: [], error: "Invalid owner" }, { status: 400 });
    }
    if (chainId !== 8453) {
      return NextResponse.json(
        { ok: false, allowances: [], error: "Only Base (8453) supported for now" },
        { status: 400 }
      );
    }

    const c = client();
    const latest = await c.getBlockNumber();

    const lookbackBlocks = clampInt(Number(body.lookbackBlocks ?? DEFAULT_LOOKBACK), 1, MAX_LOOKBACK);
    const lookback = BigInt(lookbackBlocks);
    const fromBlock = latest > lookback ? latest - lookback : BigInt(0);

    const ownerTopic = (`0x000000000000000000000000${owner.slice(2)}`) as `0x${string}`;
    const logs = await getLogsChunked({ fromBlock, toBlock: latest, ownerTopic, timeBudgetMs: 22_000 });

    const pairs = new Map<string, { token: `0x${string}`; spender: `0x${string}` }>();
    for (const l of logs) {
      const t = (l as any).topics as `0x${string}`[];
      // your observed layout: [topic0, owner, token, spender]
      if (!t?.[2] || !t?.[3]) continue;
      const token = topicToAddress(t[2]);
      const spender = topicToAddress(t[3]);
      pairs.set(`${token}:${spender}`, { token, spender });
    }

    // safety cap
    const pairList = Array.from(pairs.values()).slice(0, 200);

    const results = await mapLimit(pairList, 8, async ({ token, spender }) => {
      const [allowance, meta] = await Promise.all([
        c.readContract({
          address: PERMIT2,
          abi: allowanceAbi,
          functionName: "allowance",
          args: [owner, token, spender],
        }),
        safeTokenMeta(token),
      ]);

      const amount = allowance[0] as bigint;
      // ✅ FIX: viem returns uint48 as number here, not bigint
      const expiration = Number(allowance[1]);

      if (amount <= 0n) return null;

      return {
        token,
        spender,
        amount: amount.toString(),
        expiration,
        symbol: meta.symbol,
        decimals: meta.decimals,
      };
    });

    const out = results.filter(Boolean);

    return NextResponse.json(
      {
        ok: true,
        allowances: out,
        error: null,
        meta: { fromBlock: fromBlock.toString(), toBlock: latest.toString(), lookbackBlocks },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, allowances: [], error: e?.message || "scan_failed" }, { status: 500 });
  }
}
