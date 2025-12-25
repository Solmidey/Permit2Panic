import { Address, decodeEventLog, Hex, Log } from "viem";
import { approvalEvent, lockdownEvent, permitEvent } from "@/lib/permit2/abi";
import { PERMIT2_ADDRESS } from "@/lib/permit2/constants";
import type { TokenSpenderPair } from "@/lib/types";

export type Permit2LogType = "Approval" | "Permit" | "Lockdown";

export interface Permit2Log {
  owner: Address;
  token: Address;
  spender: Address;
  amount?: bigint;
  expiration?: number;
  nonce?: number;
  type: Permit2LogType;
  log: Log;
}

export function decodePermit2Log(log: Log): Permit2Log | null {
  if (log.address.toLowerCase() !== PERMIT2_ADDRESS.toLowerCase()) return null;

  const candidates = [approvalEvent, permitEvent, lockdownEvent];

  for (const abiEvent of candidates) {
    try {
      const decoded = decodeEventLog({
        abi: [abiEvent],
        data: log.data as Hex,
        topics: (log.topics as Hex[]) as unknown as [Hex, ...Hex[]],
      });

      if (decoded.eventName === "Approval") {
        return {
          owner: decoded.args.owner,
          token: decoded.args.token,
          spender: decoded.args.spender,
          amount: decoded.args.amount,
          expiration: Number(decoded.args.expiration),
          type: "Approval",
          log,
        };
      }

      if (decoded.eventName === "Permit") {
        return {
          owner: decoded.args.owner,
          token: decoded.args.token,
          spender: decoded.args.spender,
          amount: decoded.args.amount,
          expiration: Number(decoded.args.expiration),
          nonce: Number(decoded.args.nonce),
          type: "Permit",
          log,
        };
      }

      if (decoded.eventName === "Lockdown") {
        return {
          owner: decoded.args.owner,
          token: decoded.args.token,
          spender: decoded.args.spender,
          type: "Lockdown",
          log,
        };
      }
    } catch (err) {
      continue;
    }
  }

  return null;
}

export function pairsFromLogs(logs: Log[]): TokenSpenderPair[] {
  const pairs = new Map<string, TokenSpenderPair>();
  logs.forEach((log) => {
    const decoded = decodePermit2Log(log);
    if (!decoded) return;
    const key = `${decoded.token.toLowerCase()}-${decoded.spender.toLowerCase()}`;
    if (!pairs.has(key)) {
      pairs.set(key, { token: decoded.token, spender: decoded.spender });
    }
  });
  return Array.from(pairs.values());
}
