import { describe, expect, it } from "vitest";

import { riskLabelsFromAllowance, scoreRisk } from "@/lib/risk";
import type { Allowance } from "@/lib/types";
import { MAX_UINT160 } from "@/lib/permit2/constants";

const baseAllowance: Allowance = {
  chainId: 1,
  owner: "0xowner",
  token: "0xtoken",
  spender: "0xspender",
  amount: "1",
  expiration: Math.floor(Date.now() / 1000) + 60,
  updatedAt: 0,
  lastSeen: 0,
};

describe("risk scoring", () => {
  it("flags unlimited approvals", () => {
    const labels = riskLabelsFromAllowance({ ...baseAllowance, amount: MAX_UINT160.toString() });
    expect(labels).toContain("Unlimited");
  });

  it("detects expiring soon", () => {
    const soon = riskLabelsFromAllowance({ ...baseAllowance, expiration: Math.floor(Date.now() / 1000) + 3600 });
    expect(soon).toContain("Expiring soon");
  });

  it("produces score ordering", () => {
    const expired = scoreRisk({ ...baseAllowance, expiration: 1 });
    const safe = scoreRisk({ ...baseAllowance, expiration: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 120 });
    expect(expired.score).toBeGreaterThan(safe.score);
  });
});
