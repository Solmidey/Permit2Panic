"use client";

import { ConnectWallet, Wallet, WalletDropdown } from "@coinbase/onchainkit";
import { base } from "viem/chains";

export function WalletConnect() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <Wallet chain={base}>
        <ConnectWallet text="Connect wallet" className="bg-primary text-primary-foreground" />
        <WalletDropdown />
      </Wallet>
    </div>
  );
}
