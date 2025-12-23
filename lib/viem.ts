import { getRpcUrl } from "@/lib/chains";
import { PERMIT2_ADDRESS } from "@/lib/permit2/constants";
import { createPublicClient, formatUnits, http, parseUnits } from "viem";
import { base, mainnet } from "viem/chains";

export const clients = {
  [mainnet.id]: createPublicClient({
    chain: mainnet,
    transport: http(getRpcUrl(mainnet.id) || mainnet.rpcUrls.default.http[0], {
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
  return clients[chainId] || clients[mainnet.id];
}

export function formatAllowanceAmount(amount: bigint, decimals: number) {
  return formatUnits(amount, decimals);
}

export function parseAllowanceAmount(amount: string, decimals: number) {
  return parseUnits(amount, decimals);
}

export function permit2AddressForChain(_chainId: number) {
  return PERMIT2_ADDRESS as const;
}
