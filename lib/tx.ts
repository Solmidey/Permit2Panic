import { Address, encodeFunctionData } from "viem";
import { approveAbiItem, lockdownAbiItem } from "@/lib/permit2/abi";
import { PERMIT2_ADDRESS } from "@/lib/permit2/constants";
import type { TokenSpenderPair } from "@/lib/types";

export function buildRevokeTx(token: Address, spender: Address) {
  return {
    to: PERMIT2_ADDRESS,
    data: encodeFunctionData({
      abi: [approveAbiItem],
      functionName: "approve",
      args: [token, spender, 0n, 0n],
    }),
    value: 0n,
  };
}

export function buildLimitTx(token: Address, spender: Address, amount: bigint, expiration: bigint) {
  return {
    to: PERMIT2_ADDRESS,
    data: encodeFunctionData({
      abi: [approveAbiItem],
      functionName: "approve",
      args: [token, spender, amount, expiration],
    }),
    value: 0n,
  };
}

export function buildLockdownTx(pairs: TokenSpenderPair[]) {
  return {
    to: PERMIT2_ADDRESS,
    data: encodeFunctionData({
      abi: [lockdownAbiItem],
      functionName: "lockdown",
      args: [pairs],
    }),
    value: 0n,
  };
}
