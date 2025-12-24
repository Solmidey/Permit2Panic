"use client";

import type { ReactNode } from "react";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "viem/chains";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      chain={base}
      rpcUrl={process.env.NEXT_PUBLIC_BASE_RPC_URL}
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
    >
      {children}
    </OnchainKitProvider>
  );
}
