import { encodeAbiParameters, encodeEventTopics } from "viem";
import { describe, expect, it } from "vitest";

import { decodePermit2Log } from "@/lib/logs";
import { approvalEvent } from "@/lib/permit2/abi";
import { PERMIT2_ADDRESS } from "@/lib/permit2/constants";

const owner = "0x000000000000000000000000000000000000dEaD";
const token = "0x0000000000000000000000000000000000000aAa";
const spender = "0x0000000000000000000000000000000000000bBb";

function buildApprovalLog() {
  const topics = encodeEventTopics({
    abi: [approvalEvent],
    eventName: "Approval",
    args: { owner, token, spender, amount: 1n, expiration: 1000n },
  });
  const data = encodeAbiParameters(
    [
      { type: "uint160", name: "amount" },
      { type: "uint48", name: "expiration" },
    ],
    [1n, 1000n]
  );
  return {
    address: PERMIT2_ADDRESS,
    blockNumber: 1n,
    logIndex: 0,
    transactionHash: "0x",
    transactionIndex: 0,
    blockHash: "0x",
    data,
    topics,
    removed: false,
  } as const;
}

describe("Permit2 log decoding", () => {
  it("decodes approval log", () => {
    const log = buildApprovalLog();
    const decoded = decodePermit2Log(log as any);
    expect(decoded).toBeTruthy();
    expect(decoded?.owner.toLowerCase()).toBe(owner.toLowerCase());
    expect(decoded?.token.toLowerCase()).toBe(token.toLowerCase());
    expect(decoded?.spender.toLowerCase()).toBe(spender.toLowerCase());
    expect(decoded?.type).toBe("Approval");
  });
});
