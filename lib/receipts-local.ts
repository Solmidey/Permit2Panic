// lib/receipts-local.ts
"use client";

import type { Address } from "viem";
import type { Receipt } from "@/lib/types";

const PREFIX = "permit2panic:receipts:v1";

function storageKey(owner: Address, chainId: number) {
  return `${PREFIX}:${chainId}:${owner.toLowerCase()}`;
}

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadLocalReceipts(owner: Address, chainId: number): Receipt[] {
  if (typeof window === "undefined") return [];
  const key = storageKey(owner, chainId);
  const parsed = safeParse<Receipt[]>(localStorage.getItem(key));
  return Array.isArray(parsed) ? parsed : [];
}

export function saveLocalReceipts(owner: Address, chainId: number, receipts: Receipt[]) {
  if (typeof window === "undefined") return;
  const key = storageKey(owner, chainId);
  localStorage.setItem(key, JSON.stringify(receipts));
}

export function prependLocalReceipt(owner: Address, chainId: number, receipt: Receipt) {
  const current = loadLocalReceipts(owner, chainId);
  const next = [receipt, ...current].slice(0, 100); // keep last 100
  saveLocalReceipts(owner, chainId, next);
  return next;
}

function receiptKey(r: any) {
  // prefer stable ids if present
  if (r?.id) return `id:${String(r.id)}`;
  // fallback: hash-ish key
  return `t:${String(r?.createdAt ?? "")}|s:${String(r?.summary ?? "")}|c:${String(r?.chainId ?? "")}|o:${String(r?.owner ?? "")}`;
}

export function mergeReceipts(local: Receipt[], remote: Receipt[]) {
  const map = new Map<string, Receipt>();
  for (const r of remote) map.set(receiptKey(r), r);
  for (const r of local) map.set(receiptKey(r), r);

  // sort newest first if timestamps exist
  return Array.from(map.values()).sort((a: any, b: any) => {
    const ta = Number(a?.createdAt ?? a?.created_at ?? 0);
    const tb = Number(b?.createdAt ?? b?.created_at ?? 0);
    return tb - ta;
  });
}
