import { decodeFunctionResult, encodeFunctionData, type Address, type Log } from "viem";
import { allowanceAbiItem, approvalEvent, lockdownEvent, permitEvent } from "@/lib/permit2/abi";
import { PERMIT2_ADDRESS } from "@/lib/permit2/constants";
import { pairsFromLogs } from "@/lib/logs";
import { getClient } from "@/lib/viem";
import { getCursor, listAllowances, saveCursor, upsertAllowance } from "@/lib/db/queries";
import type { Allowance, TokenSpenderPair } from "@/lib/types";
import { scoreRisk } from "@/lib/risk";
const SIX_MONTHS_BLOCKS = BigInt(6 * 30 * 24 * 60 * 60 / 12); // rough for 12s blocks

export interface ScanOptions {
  owner: Address;
  chainId: number;
  deep?: boolean;
}

export async function fetchLogs({ owner, chainId, deep }: ScanOptions): Promise<Log[]> {
  const client = getClient(chainId);
  const latest = await client.getBlockNumber();
  const fromBlock = deep ? 0n : latest - SIX_MONTHS_BLOCKS > 0 ? latest - SIX_MONTHS_BLOCKS : 0n;

  return (await Promise.all([
    client.getLogs({
      address: PERMIT2_ADDRESS,
      event: approvalEvent,
      args: { owner },
      fromBlock,
      toBlock: latest,
    }),
    client.getLogs({
      address: PERMIT2_ADDRESS,
      event: permitEvent,
      args: { owner },
      fromBlock,
      toBlock: latest,
    }),
    client.getLogs({
      address: PERMIT2_ADDRESS,
      event: lockdownEvent,
      args: { owner },
      fromBlock,
      toBlock: latest,
    }),
  ])).flat();
}

export async function scanAllowances(options: ScanOptions) {
  const { chainId, owner, deep } = options;
  const logs = await fetchLogs(options);
  const pairs = pairsFromLogs(logs);
  const allowances = await readAllowancesForPairs(chainId, owner, pairs);
  const client = getClient(chainId);
  const lastScannedBlock = Number(await client.getBlockNumber());
  await saveCursor(chainId, owner, lastScannedBlock);
  return allowances;
}

async function readAllowancesForPairs(chainId: number, owner: Address, pairs: TokenSpenderPair[]) {
  const client = getClient(chainId);
  const now = Math.floor(Date.now() / 1000);
  const results: Allowance[] = [];

  for (const pair of pairs) {
    const { data } = await client.call({
      to: PERMIT2_ADDRESS,
      data: encodeFunctionData({ functionName: "allowance", abi: [allowanceAbiItem], args: [owner, pair.token as Address, pair.spender as Address] }),
    });
    if (!data) continue;
    const decoded = decodeFunctionResult({ functionName: "allowance", abi: [allowanceAbiItem], data });
    const record: Allowance = {
      chainId,
      owner,
      token: pair.token,
      spender: pair.spender,
      amount: decoded[0].toString(),
      expiration: Number(decoded[1]),
      updatedAt: now,
      lastSeen: now,
    };
    const { labels } = scoreRisk(record);
    record.riskLabels = labels;
    results.push(record);
    await upsertAllowance(record);
  }
  return results.filter((item) => {
    const active = BigInt(item.amount) > 0n;
    const notExpired = item.expiration === 0 || item.expiration > now;
    return active && notExpired;
  });
}

export async function getCachedAllowances(chainId: number, owner: Address) {
  const cached = await listAllowances(chainId, owner);
  const now = Math.floor(Date.now() / 1000);
  return cached
    .filter((item) => BigInt(item.amount) > 0n && (item.expiration === 0 || item.expiration > now))
    .map((row) => ({ ...row, riskLabels: scoreRisk(row).labels }));
}

export async function touchedPairsFromCache(chainId: number, owner: string) {
  const cached = await listAllowances(chainId, owner);
  const map = new Map<string, TokenSpenderPair>();
  cached.forEach((row) => {
    const key = `${row.token}-${row.spender}`;
    map.set(key, { token: row.token as Address, spender: row.spender as Address });
  });
  return Array.from(map.values());
}

export async function getScanCursor(chainId: number, owner: string) {
  return getCursor(chainId, owner);
}
