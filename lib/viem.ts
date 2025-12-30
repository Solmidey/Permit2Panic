import { getRpcUrl } from "@/lib/chains";
import { PERMIT2_ADDRESS } from "@/lib/permit2/constants";
import { createPublicClient, formatUnits, http, parseUnits } from "viem";
import { base } from "viem/chains";
import type { Address } from "viem";

export const clients = {
      fetchOptions: { cache: "no-store" },
    }),
  }),
  [base.id]: createPublicClient({
    chain: base,
    transport: http(getRpcUrl(base.id) || base.rpcUrls.default.http[0], {
      fetchOptions: { cache: "no-store" },
    }),
  }),
};

export function getClient(chainId: number) {
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
