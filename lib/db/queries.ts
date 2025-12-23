import { and, eq } from "drizzle-orm";

import { db } from "./client";
import { allowances, receipts, scanCursors } from "./schema";
import type { Allowance, Receipt } from "@/lib/types";

export async function upsertAllowance(record: Allowance) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .insert(allowances)
    .values({
      chainId: record.chainId,
      owner: record.owner.toLowerCase(),
      token: record.token.toLowerCase(),
      spender: record.spender.toLowerCase(),
      amount: record.amount,
      expiration: record.expiration,
      updatedAt: record.updatedAt || now,
      lastSeen: record.lastSeen || now,
    })
    .onConflictDoUpdate({
      target: [allowances.chainId, allowances.owner, allowances.token, allowances.spender],
      set: {
        amount: record.amount,
        expiration: record.expiration,
        updatedAt: record.updatedAt || now,
        lastSeen: record.lastSeen || now,
      },
    });
}

export async function listAllowances(chainId: number, owner: string) {
  return db
    .select()
    .from(allowances)
    .where(and(eq(allowances.chainId, chainId), eq(allowances.owner, owner.toLowerCase())));
}

export async function getAllowanceByPair(chainId: number, owner: string, token: string, spender: string) {
  const rows = await db
    .select()
    .from(allowances)
    .where(
      and(
        eq(allowances.chainId, chainId),
        eq(allowances.owner, owner.toLowerCase()),
        eq(allowances.token, token.toLowerCase()),
        eq(allowances.spender, spender.toLowerCase())
      )
    )
    .limit(1);
  return rows[0];
}

export async function saveCursor(chainId: number, owner: string, lastScannedBlock: number) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .insert(scanCursors)
    .values({ chainId, owner: owner.toLowerCase(), lastScannedBlock, lastScannedAt: now })
    .onConflictDoUpdate({
      target: [scanCursors.chainId, scanCursors.owner],
      set: { lastScannedBlock, lastScannedAt: now },
    });
}

export async function getCursor(chainId: number, owner: string) {
  const rows = await db
    .select()
    .from(scanCursors)
    .where(and(eq(scanCursors.chainId, chainId), eq(scanCursors.owner, owner.toLowerCase())))
    .limit(1);
  return rows[0];
}

export async function saveReceipt(record: Receipt) {
  const now = Math.floor(Date.now() / 1000);
  await db.insert(receipts).values({
    owner: record.owner.toLowerCase(),
    chainId: record.chainId,
    revoked: record.revoked,
    limited: record.limited,
    panicked: record.panicked,
    summary: record.summary,
    createdAt: record.createdAt || now,
  });
}

export async function listReceipts(chainId: number, owner: string) {
  return db
    .select()
    .from(receipts)
    .where(and(eq(receipts.chainId, chainId), eq(receipts.owner, owner.toLowerCase())));
}
