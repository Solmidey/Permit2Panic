import { base } from "viem/chains";

export const SUPPORTED_CHAINS = [base];

export const RPC_URLS: Record<number, string> = {
  [base.id]: process.env.NEXT_PUBLIC_BASE_RPC_URL || "",
};

export function getRpcUrl(chainId: number) {
  return RPC_URLS[chainId] || "";
}

export function chainById(chainId: number) {
  return SUPPORTED_CHAINS.find((c) => c.id === chainId) || base;
}

export const DEFAULT_CHAIN_ID = base.id;
