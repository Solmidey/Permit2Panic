import { NextResponse } from "next/server";
import { Address, Hex } from "viem";

import { buildRevokeTx } from "@/lib/tx";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, spender } = body as { token: Address; spender: Address };
    if (!token || !spender) {
      return NextResponse.json({ error: "token and spender are required" }, { status: 400 });
    }
    const tx = buildRevokeTx(token, spender);
    return NextResponse.json({
      request: { to: tx.to, data: tx.data as Hex, value: tx.value.toString() },
      message: "Set allowance to zero to revoke this Permit2 approval.",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to build revoke transaction" }, { status: 500 });
  }
}
