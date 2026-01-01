"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { useAccount } from "wagmi";
import { Loader2, Scan } from "lucide-react";
import { toast } from "sonner";

import { AllowanceList } from "@/components/allowance-list";
import { SafetyBanner } from "@/components/safety-banner";
import { WalletConnect } from "@/components/wallet-connect";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { Allowance, TokenSpenderPair } from "@/lib/types";

const BASE_CHAIN_ID = 8453;
const HYGIENE_XP_KEY = "hygiene_xp";
const LAST_OWNER_KEY = "permit2panic:lastOwner";

function normalizeAddress(value: string): Address | null {
  const v = value.trim();
  if (!v || !isAddress(v)) return null;
  return getAddress(v);
}

/* =========================
   Scan Progress Bar
========================= */
function ScanProgressBar({ active }: { active: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }

    const i = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + 10));
    }, 400);

    return () => clearInterval(i);
  }, [active]);

  if (!active) return null;

  return (
    <div className="w-full mt-4">
      <div className="w-full h-2 bg-gray-200 rounded">
        <div
          className="h-2 bg-blue-500 rounded transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* =========================
   Home Shell
========================= */
export default function HomeShell() {
  const { address: connectedAddress, isConnected } = useAccount();

  const [ownerInput, setOwnerInput] = useState("");
  const owner = useMemo(() => normalizeAddress(ownerInput), [ownerInput]);

  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressActive, setProgressActive] = useState(false);

  const [hygieneXp, setHygieneXp] = useState(0);

  /* init */
  useEffect(() => {
    const xp = Number(localStorage.getItem(HYGIENE_XP_KEY) || "0");
    setHygieneXp(Number.isFinite(xp) ? xp : 0);

    if (isConnected && connectedAddress) {
      setOwnerInput(connectedAddress);
      localStorage.setItem(LAST_OWNER_KEY, connectedAddress);
    }
  }, [isConnected, connectedAddress]);

  const activePairs = useMemo<TokenSpenderPair[]>(
    () => allowances.map((a) => ({ token: a.token as Address, spender: a.spender as Address })),
    [allowances]
  );

  const scan = useCallback(async () => {
    if (!owner) {
      toast.error("Enter a valid address.");
      return;
    }

    setLoading(true);
    setProgressActive(true);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          chainId: BASE_CHAIN_ID,
          deep: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Scan failed");

      setAllowances(data.allowances ?? []);

      setHygieneXp((x) => {
        const n = x + 1;
        localStorage.setItem(HYGIENE_XP_KEY, String(n));
        return n;
      });

      toast.success("Scan complete");
    } catch (e: any) {
      toast.error(e.message ?? "Scan failed");
    } finally {
      setLoading(false);
      setProgressActive(false);
    }
  }, [owner]);

  const invalidOwner = ownerInput.length > 0 && !owner;

  return (
    <>
      <ScanProgressBar active={progressActive} />

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-semibold text-white">Permit2 Panic Button</h1>
            <p className="mt-2 text-slate-300">Scan Base. Stay clean.</p>
          </div>
          <WalletConnect />
        </div>

        <Card className="mt-6 border-slate-800 bg-slate-950/40">
          <CardHeader>
            <CardTitle className="text-white">Scan (Base)</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <SafetyBanner />

            <Input
              value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value)}
              placeholder="0x..."
            />

            {invalidOwner && <p className="text-sm text-red-400">Invalid address</p>}

            <Button onClick={scan} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scan className="mr-2 h-4 w-4" />}
              Scan allowances
            </Button>

            <div className="text-sm text-slate-300">Hygiene XP: {hygieneXp}</div>

            <AllowanceList allowances={allowances} onRescan={scan} onAction={() => {}} />

            <div className="text-xs text-slate-500">
              Active pairs: {activePairs.length}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
