import { decodeFunctionResult, encodeFunctionData, getAddress, isAddress, type Address, type Log } from "viem";
import { allowanceAbiItem, approvalEvent, lockdownEvent, permitEvent } from "@/lib/permit2/abi";
import { PERMIT2_ADDRESS } from "@/lib/permit2/constants";
import { pairsFromLogs } from "@/lib/logs";
import { getClient } from "@/lib/viem";
import { getCursor, saveCursor, upsertAllowance } from "@/lib/db/queries";
import type { Allowance, TokenSpenderPair } from "@/lib/types";
import { scoreRisk } from "@/lib/risk";

const DEFAULT_WINDOW_BLOCKS = 40_000n; // ~5.5 days on 12s blocks

export interface ScanOptions {
  owner: Address;
  chainId: number;
  deep?: boolean;
  maxBlocks?: number; // optional override for fast testing
}

function clampBigInt(n: bigint) {
  return n < 0n ? 0n : n;
}

async function fetchLogs({ owner, chainId, deep, maxBlocks }: ScanOptions): Promise<Log[]> {
  const client = getClient(chainId);
  const latest = await client.getBlockNumber();

  // Use cursor if available (fast incremental scans)
  let cursor: number | null = null;
  try {
    cursor = await getCursor(chainId, owner);
  } catch {
    cursor = null;
  }

  const windowBlocks =
    typeof maxBlocks === "number" && Number.isFinite(maxBlocks) && maxBlocks > 0
      ? BigInt(maxBlocks)
      : DEFAULT_WINDOW_BLOCKS;

  const fromBlock = deep
    ? 0n
    : cursor && cursor > 0
      ? clampBigInt(BigInt(cursor))
      : clampBigInt(latest - windowBlocks);

  // IMPORTANT:
  // viem does NOT allow args with multi-event { events: [...] }.
  // So we query per-event with args: { owner } and then merge.
  const [approvalLogs, permitLogs, lockdownLogs] = await Promise.all([
    client.getLogs({
      address: PERMIT2_ADDRESS,
      event: approvalEvent as any,
      args: { owner } as any,
      fromBlock,
      toBlock: latest,
    }),
    client.getLogs({
      address: PERMIT2_ADDRESS,
      event: permitEvent as any,
      args: { owner } as any,
      fromBlock,
      toBlock: latest,
    }),
    client.getLogs({
      address: PERMIT2_ADDRESS,
      event: lockdownEvent as any,
      args: { owner } as any,
      fromBlock,
      toBlock: latest,
    }),
  ]);

  return [...approvalLogs, ...permitLogs, ...lockdownLogs];
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;

  const workers = new Array(Math.max(1, limit)).fill(0).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

function dedupePairs(pairs: TokenSpenderPair[]) {
  const seen = new Set<string>();
  const out: TokenSpenderPair[] = [];
  for (const p of pairs) {
    const key = `${p.token.toLowerCase()}-${p.spender.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

async function readAllowancesForPairs(chainId: number, owner: Address, pairs: TokenSpenderPair[]) {
  const client = getClient(chainId);
  const now = Math.floor(Date.now() / 1000);

  const uniquePairs = dedupePairs(pairs);
  if (uniquePairs.length === 0) return [];

  // Read RPC calls concurrently (faster), write to DB sequentially (safer for sqlite)
  const records = await mapWithConcurrency(uniquePairs, 8, async (pair) => {
    const { data } = await client.call({
      to: PERMIT2_ADDRESS,
      data: encodeFunctionData({
        functionName: "allowance",
        abi: [allowanceAbiItem],
        args: [owner, pair.token as Address, pair.spender as Address],
      }),
    });

    if (!data) throw new Error("RPC returned empty call result");

    const decoded = decodeFunctionResult({
      functionName: "allowance",
      abi: [allowanceAbiItem],
      data,
    });

    const record: Allowance = {
      chainId,
      owner,
      token: pair.token,
      spender: pair.spender,
      amount: decoded[0].toString(),
      expiration: Number(decoded[1]),
      updatedAt: now,
      lastSeen: now,
      riskLabels: [],
    };

    record.riskLabels = scoreRisk(record).labels;
    return record;
  });

  // Upsert sequentially to avoid SQLITE_BUSY in concurrent writes
  for (const r of records) {
    await upsertAllowance(r);
  }

  // only active + not expired
  return records.filter((item) => {
    const active = BigInt(item.amount) > 0n;
    const notExpired = item.expiration === 0 || item.expiration > now;
    return active && notExpired;
  });
}

export async function scanAllowances(options: ScanOptions) {
  const { chainId, owner } = options;

  const logs = await fetchLogs(options);
  const pairs = pairsFromLogs(logs);
  const allowances = await readAllowancesForPairs(chainId, owner, pairs);

  // update cursor AFTER scan
  const client = getClient(chainId);
  const lastScannedBlock = Number(await client.getBlockNumber());
  await saveCursor(chainId, owner, lastScannedBlock);

  return allowances;
}

// Optional helper if you ever accept raw owner input server-side
export function normalizeOwner(value: string): Address | null {
  if (!value) return null;
  if (!isAddress(value)) return null;
  return getAddress(value) as Address;
}
