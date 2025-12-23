import { base, mainnet } from "viem/chains";

export const SUPPORTED_CHAINS = [mainnet, base];

export const RPC_URLS: Record<number, string> = {
  [mainnet.id]: process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "",
  [base.id]: process.env.NEXT_PUBLIC_BASE_RPC_URL || "",
};

export function getRpcUrl(chainId: number) {
  return RPC_URLS[chainId] || "";
}

export function chainById(chainId: number) {
  return SUPPORTED_CHAINS.find((c) => c.id === chainId) || mainnet;
}

export const DEFAULT_CHAIN_ID = base.id;
