import { NextResponse } from "next/server";
import { createPublicClient, http, fallback, isAddress } from "viem";
import { base } from "viem/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;

// topic0s seen in your logs
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

function rpcUrls() {
  const raw =
    process.env.NEXT_PUBLIC_BASE_RPC_URLS ||
    process.env.NEXT_PUBLIC_BASE_RPC_URL ||
    "https://mainnet.base.org";
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
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
  return (`0x${topic.slice(26)}`) as `0x${string}`;
}

async function getLogsChunked(opts: { fromBlock: bigint; toBlock: bigint; ownerTopic: `0x${string}` }) {
  const c = client();
  const logs: any[] = [];

  let from = opts.fromBlock;
  let step = 50000n;
  const minStep = 5000n;

  while (from <= opts.toBlock) {
    let to = from + step;
    if (to > opts.toBlock) to = opts.toBlock;

    try {
      // Use raw RPC to allow "topics" without TS type errors
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
      from = to + 1n;
      if (step < 100000n) step += 10000n;
    } catch (e: any) {
      if (step > minStep) {
        step = step / 2n;
        continue;
      }
      throw e;
    }
  }

  return logs;
}

async function safeTokenMeta(token: `0x${string}`) {
  const c = client();
  const [symbol, decimals] = await Promise.all([
    c.readContract({ address: token, abi: erc20Abi, functionName: "symbol" }).catch(() => "TOKEN"),
    c.readContract({ address: token, abi: erc20Abi, functionName: "decimals" }).catch(() => 18),
  ]);
  return { symbol, decimals };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const owner = body.owner as `0x${string}` | undefined;
    const chainId = Number(body.chainId ?? 8453);

    if (!owner || !isAddress(owner)) {
      return NextResponse.json({ allowances: [], error: "Invalid owner" }, { status: 200 });
    }
    if (chainId !== 8453) {
      return NextResponse.json({ allowances: [], error: "Only Base (8453) supported for now" }, { status: 200 });
    }

    const c = client();
    const latest = await c.getBlockNumber();

    const lookback = BigInt(body.lookbackBlocks ?? 1296000);
    const fromBlock = latest > lookback ? latest - lookback : 0n;

    const ownerTopic = (`0x000000000000000000000000${owner.slice(2)}`) as `0x${string}`;
    const logs = await getLogsChunked({ fromBlock, toBlock: latest, ownerTopic });

    const pairs = new Map<string, { token: `0x${string}`; spender: `0x${string}` }>();
    for (const l of logs) {
      const t = (l as any).topics as `0x${string}`[];
      if (!t?.[2] || !t?.[3]) continue;
      const token = topicToAddress(t[2]);
      const spender = topicToAddress(t[3]);
      pairs.set(`${token}:${spender}`, { token, spender });
    }

    const out: any[] = [];
    for (const { token, spender } of pairs.values()) {
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
      const expiration = allowance[1] as number;

      if (amount > 0n) {
        out.push({
          token,
          spender,
          amount: amount.toString(),
          expiration,
          symbol: meta.symbol,
          decimals: meta.decimals,
        });
      }
    }

    return NextResponse.json(
      { allowances: out, error: null, meta: { fromBlock: fromBlock.toString(), toBlock: latest.toString() } },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ allowances: [], error: e?.message || "scan_failed" }, { status: 200 });
  }
}
