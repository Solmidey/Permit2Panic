import type { Receipt } from "@/lib/types";
import type { Address } from "viem";

function storageKey(owner: Address, chainId: number) {
  return `permit2panic:receipts:${owner.toLowerCase()}:${chainId}`;
}

export function loadLocalReceipts(owner: Address, chainId: number): Receipt[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(owner, chainId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Receipt[]) : [];
  } catch {
    return [];
  }
}

export function prependLocalReceipt(owner: Address, chainId: number, receipt: Receipt): Receipt[] {
  if (typeof window === "undefined") return [receipt];
  const prev = loadLocalReceipts(owner, chainId);
  const next = [receipt, ...prev].slice(0, 200);
  localStorage.setItem(storageKey(owner, chainId), JSON.stringify(next));
  return next;
}

export function mergeReceipts(local: Receipt[], remote: Receipt[]) {
  const seen = new Set<string>();
  const out: Receipt[] = [];

  for (const r of [...remote, ...local]) {
    const id = (r as any).id ? String((r as any).id) : `${(r as any).createdAt ?? ""}-${(r as any).summary ?? ""}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(r);
  }

  out.sort((a: any, b: any) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0));
  return out;
}
