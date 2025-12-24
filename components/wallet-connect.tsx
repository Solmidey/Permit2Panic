"use client";

import {
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";

export function WalletConnect() {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-3 py-2 shadow-lg">
      <Wallet>
        <ConnectWallet
          disconnectedLabel="Connect wallet"
          className="rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500 px-4 py-2 text-white font-semibold shadow hover:opacity-95"
        />
        <WalletDropdown>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}
