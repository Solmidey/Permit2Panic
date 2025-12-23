import { NextResponse } from "next/server";
import { Address } from "viem";

import { getAllowanceByPair, listAllowances } from "@/lib/db/queries";
import { scoreRisk } from "@/lib/risk";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner") as Address | null;
  const chainId = Number(searchParams.get("chainId"));
  const token = searchParams.get("token");
  const spender = searchParams.get("spender");

  if (!owner || !chainId) {
    return NextResponse.json({ error: "owner and chainId are required" }, { status: 400 });
  }

  if (token && spender) {
    const allowance = await getAllowanceByPair(chainId, owner, token, spender);
    if (!allowance) return NextResponse.json({ allowance: null });
    return NextResponse.json({ allowance: { ...allowance, riskLabels: scoreRisk(allowance).labels } });
  }

  const allowances = await listAllowances(chainId, owner);
  return NextResponse.json({ allowances: allowances.map((row) => ({ ...row, riskLabels: scoreRisk(row).labels })) });
}
