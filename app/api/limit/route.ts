import { NextResponse } from "next/server";
import { Address, Hex, parseUnits } from "viem";

import { buildLimitTx } from "@/lib/tx";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, spender, amount, decimals = 18, expiration } = body as {
      token: Address;
      spender: Address;
      amount: string;
      decimals?: number;
      expiration: number;
    };

    if (!token || !spender || !amount || !expiration) {
      return NextResponse.json({ error: "token, spender, amount, and expiration are required" }, { status: 400 });
    }

    const parsedAmount = parseUnits(amount, decimals);
    const tx = buildLimitTx(token, spender, parsedAmount, BigInt(expiration));
    return NextResponse.json({
      request: { to: tx.to, data: tx.data as Hex, value: tx.value.toString() },
      message: "Limit this Permit2 approval with a safer amount and expiry.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to build limit transaction" }, { status: 500 });
  }
}
