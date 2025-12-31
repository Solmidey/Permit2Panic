import { getRpcUrl } from "@/lib/chains";
import { PERMIT2_ADDRESS } from "@/lib/permit2/constants";
import { createPublicClient, formatUnits, http, parseUnits } from "viem";
import { base } from "viem/chains";
import type { Address, PublicClient } from "viem";

const baseClient = createPublicClient({
  chain: base,
  transport: http(
    getRpcUrl(base.id) || base.rpcUrls.default.http[0],
    {
      fetchOptions: { cache: "no-store" },
    }
  ),
});

// 🚨 DO NOT type this as Record<number, PublicClient>
export const clients = {
  [base.id]: baseClient,
} as const;

export function getClient(chainId: number): PublicClient {
  return (clients as Record<number, PublicClient>)[chainId] ?? baseClient;
}

export function formatAllowanceAmount(amount: bigint, decimals: number) {
  return formatUnits(amount, decimals);
}

export function parseAllowanceAmount(amount: string, decimals: number) {
  return parseUnits(amount, decimals);
}

export function permit2AddressForChain(_chainId: number) {
  return PERMIT2_ADDRESS as Address;
}
