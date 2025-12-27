import { NextResponse } from "next/server";
import { createPublicClient, http, fallback, isAddress } from "viem";
import { base, mainnet } from "viem/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;

// topic0s you observed (Permit2 events)
const TOPIC0S = [
  "0xda9fa7c1b00402c17d0161b249b1ab8bbec047c5a52207b9c112deffd817036b",
  "0xc6a377bfc4eb120024a8ac08eef205be16b817020812c73223e81d1bdb9708ec",
  "0x89b1add15eff56b3dfe299ad94e01f2b52fbcb80ae1a3baea6ae8c04cb2b98a4",
] as const;

type SupportedChainId = 1 | 8453;

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

// Defaults tuned per chain (Ethereum RPCs are more likely to limit large ranges)
const DEFAULT_LOOKBACK_BY_CHAIN: Record<SupportedChainId, number> = {
  8453: 40000,
  1: 12000,
};

const MAX_LOOKBACK_BY_CHAIN: Record<SupportedChainId, number> = {
  8453: 200000,
  1: 80000,
};

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function toSupportedChainId(chainId: number): SupportedChainId | null {
  if (chainId === 1 || chainId === 8453) return chainId;
  return null;
}

function rpcUrlsFor(chainId: SupportedChainId) {
  const raw =
    chainId === 8453
      ? process.env.NEXT_PUBLIC_BASE_RPC_URLS || process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"
      : process.env.NEXT_PUBLIC_MAINNET_RPC_URLS ||
        process.env.NEXT_PUBLIC_MAINNET_RPC_URL ||
        "https://cloudflare-eth.com";

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * FIX:
 * Base + Mainnet clients are different TS types, so caching them in a typed Map breaks.
 * We store them as `unknown` and cast on read/write.
 */
const clientCache = new Map<SupportedChainId, unknown>();

function client(chainId: SupportedChainId) {
  const cached = clientCache.get(chainId);
  if (cached) return cached as ReturnType<typeof createPublicClient>;

  const urls = rpcUrlsFor(chainId);
  const chain = chainId === 8453 ? base : mainnet;

  const c = createPublicClient({
    chain,
    transport: fallback(urls.map((u) => http(u, { timeout: 18000 })), { rank: true }),
  });

  clientCache.set(chainId, c as unknown);
  return c as ReturnType<typeof createPublicClient>;
}

const toHexBlock = (b: bigint) => `0x${b.toString(16)}` as `0x${string}`;

function topicToAddress(topic: `0x${string}`) {
  return (`0x${topic.slice(26)}`) as `0x${string}`;
}

async function safeTokenMeta(chainId: SupportedChainId, token: `0x${string}`) {
  const c = client(chainId);
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
  chainId: SupportedChainId;
  fromBlock: bigint;
  toBlock: bigint;
  ownerTopic: `0x${string}`;
  timeBudgetMs?: number;
}) {
  const c = client(opts.chainId);
  const logs: any[] = [];

  let from = opts.fromBlock;

  let step = opts.chainId === 1 ? BigInt(8000) : BigInt(20000);
  const minStep = opts.chainId === 1 ? BigInt(1500) : BigInt(2000);

  const started = Date.now();
  const budget = typeof opts.timeBudgetMs === "number" ? opts.timeBudgetMs : 9000;

  while (from <= opts.toBlock) {
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

      const maxStep = opts.chainId === 1 ? BigInt(15000) : BigInt(60000);
      const bump = opts.chainId === 1 ? BigInt(1000) : BigInt(5000);
      if (step < maxStep) step = step + bump;
    } catch (e: any) {
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
    const chainIdRaw = Number(body.chainId ?? 8453);
    const chainId = toSupportedChainId(chainIdRaw);

    if (!owner || !isAddress(owner)) {
      return NextResponse.json({ ok: false, allowances: [], error: "Invalid owner" }, { status: 400 });
    }

    if (!chainId) {
      return NextResponse.json(
        { ok: false, allowances: [], error: "Unsupported chainId (use 1 or 8453)" },
        { status: 400 }
      );
    }

    const c = client(chainId);
    const latest = await c.getBlockNumber();

    const defaultLookback = DEFAULT_LOOKBACK_BY_CHAIN[chainId];
    const maxLookback = MAX_LOOKBACK_BY_CHAIN[chainId];
    const lookbackBlocks = clampInt(Number(body.lookbackBlocks ?? defaultLookback), 1, maxLookback);

    const lookback = BigInt(lookbackBlocks);
    const fromBlock = latest > lookback ? latest - lookback : BigInt(0);

    const ownerTopic = (`0x000000000000000000000000${owner.slice(2)}`) as `0x${string}`;
    const logs = await getLogsChunked({
      chainId,
      fromBlock,
      toBlock: latest,
      ownerTopic,
      timeBudgetMs: 9000,
    });

    const pairs = new Map<string, { token: `0x${string}`; spender: `0x${string}` }>();
    for (const l of logs) {
      const t = (l as any).topics as `0x${string}`[];
      if (!t?.[2] || !t?.[3]) continue;
      const token = topicToAddress(t[2]);
      const spender = topicToAddress(t[3]);
      pairs.set(`${token}:${spender}`, { token, spender });
    }

    const cap = chainId === 1 ? 80 : 200;
    const pairList = Array.from(pairs.values()).slice(0, cap);
    const concurrency = chainId === 1 ? 5 : 8;

    const results = await mapLimit(pairList, concurrency, async ({ token, spender }) => {
      const [allowance, meta] = await Promise.all([
        c.readContract({
          address: PERMIT2,
          abi: allowanceAbi,
          functionName: "allowance",
          args: [owner, token, spender],
        }),
        safeTokenMeta(chainId, token),
      ]);

      const tuple = allowance as readonly [bigint, unknown, unknown];
      const amount = tuple[0] as bigint;
      const expirationRaw = tuple[1];
      const expiration = Number(expirationRaw);

      if (amount <= BigInt(0)) return null;

      return {
        token,
        spender,
        amount: amount.toString(),
        expiration: Number.isFinite(expiration) ? expiration : 0,
        symbol: meta.symbol,
        decimals: meta.decimals,
      };
    });

    const out = results.filter((x): x is NonNullable<typeof x> => Boolean(x));

    return NextResponse.json(
      {
        ok: true,
        allowances: out,
        error: null,
        meta: {
          chainId,
          fromBlock: fromBlock.toString(),
          toBlock: latest.toString(),
          lookbackBlocks,
          logsFound: logs.length,
          pairsFound: pairs.size,
          pairsScanned: pairList.length,
        },
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, allowances: [], error: e?.message || "scan_failed" }, { status: 500 });
  }
}
