import { MAX_UINT160 } from "@/lib/permit2/constants";
import type { Allowance } from "./types";

const SECONDS_IN_DAY = 86_400;

export function isUnlimited(amount: bigint) {
  return amount === MAX_UINT160;
}

export function isExpired(expiration: number, nowSec: number) {
  return expiration !== 0 && expiration < nowSec;
}

export function isExpiringSoon(expiration: number, nowSec: number) {
  if (expiration === 0) return false;
  return expiration < nowSec + 30 * SECONDS_IN_DAY && expiration >= nowSec;
}

const verifiedSpenders = new Set<string>([
  "0x1111111254eeb25477b68fb85ed929f73a960582", // 1inch
  "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap V3 Router
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff", // 0x
]);

export function riskLabelsFromAllowance(allowance: Allowance, nowSec = Math.floor(Date.now() / 1000)) {
  const labels: string[] = [];
  const amount = BigInt(allowance.amount);

  if (isUnlimited(amount)) {
    labels.push("Unlimited");
  }
  if (isExpired(allowance.expiration, nowSec)) {
    labels.push("Expired");
  } else if (isExpiringSoon(allowance.expiration, nowSec)) {
    labels.push("Expiring soon");
  } else if (allowance.expiration === 0) {
    labels.push("No expiry set");
  } else {
    labels.push("Long expiry");
  }

  if (verifiedSpenders.has(allowance.spender.toLowerCase())) {
    labels.push("Verified");
  } else {
    labels.push("Unverified");
  }

  return labels;
}

export function scoreRisk(allowance: Allowance) {
  const labels = riskLabelsFromAllowance(allowance);
  const score = labels.includes("Unlimited")
    ? 3
    : labels.includes("Expiring soon")
    ? 2
    : labels.includes("Expired")
    ? 1
    : 0;

  return { labels, score };
}
