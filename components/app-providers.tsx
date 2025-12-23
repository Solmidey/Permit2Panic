"use client";

import { OnchainKitProvider } from "@coinbase/onchainkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

import { ThemeProvider } from "./theme-provider";
import { base } from "viem/chains";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <OnchainKitProvider
        chain={base}
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY || "demo"}
        projectId={process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_ID}
      >
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster richColors position="top-right" closeButton />
        </QueryClientProvider>
      </OnchainKitProvider>
    </ThemeProvider>
  );
}
