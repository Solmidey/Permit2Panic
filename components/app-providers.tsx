"use client";

import { ReactNode, useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "viem/chains";
import { wagmiConfig } from "@/lib/wagmi";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          chain={base}
          rpcUrl={process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org"}
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          config={{
            wallet: { display: "modal" },
            appearance: { name: "Permit2Panic", mode: "dark", theme: "cyberpunk" },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
