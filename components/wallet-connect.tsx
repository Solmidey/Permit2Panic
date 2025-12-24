"use client";

import { useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

function shortAddr(a?: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);

  const available = useMemo(
    () => connectors.filter((c) => c.id !== "mock"),
    [connectors]
  );

  return (
    <div className="flex items-center gap-2">
      {isConnected ? (
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
          <span className="text-sm font-semibold">{shortAddr(address)}</span>
          <button
            onClick={() => disconnect()}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <>
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95"
          >
            Connect wallet
          </button>

          {open && (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
              <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0b0f1a]/90 p-4 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-extrabold">Choose a wallet</div>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-3 grid gap-2">
                  {available.map((c) => (
                    <button
                      key={c.uid}
                      disabled={isPending}
                      onClick={async () => {
                        await connectAsync({ connector: c });
                        setOpen(false);
                      }}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
                    >
                      <span className="font-semibold">{c.name}</span>
                      <span className="text-xs opacity-80">
                        {c.type === "injected" ? "Browser" : "QR / App"}
                      </span>
                    </button>
                  ))}
                </div>

                {error && (
                  <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm">
                    {error.message}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
