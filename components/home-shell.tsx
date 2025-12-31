"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAddress, isAddress, type Address } from "viem";
import { useAccount } from "wagmi";
import { Loader2, RefreshCcw, Scan } from "lucide-react";
import { toast } from "sonner";

import { AllowanceList } from "@/components/allowance-list";
import { ChainSwitcher } from "@/components/chain-switcher";
import { ReceiptCard } from "@/components/receipt-card";
import { SafetyBanner } from "@/components/safety-banner";
import { WalletConnect } from "@/components/wallet-connect";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { DEFAULT_CHAIN_ID } from "@/lib/chains";
import type { Allowance, Receipt, TokenSpenderPair } from "@/lib/types";
import { loadLocalReceipts, mergeReceipts, prependLocalReceipt } from "@/lib/receipts-local";

const HYGIENE_XP_KEY = "hygiene_xp";
const LAST_OWNER_KEY = "permit2panic:lastOwner";
const LEGACY_LAST_OWNER_KEY = "last_owner";

function normalizeAddress(value: string): Address | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (!isAddress(v)) return null;
  return getAddress(v) as Address;
}

function shortAddr(addr: Address) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* =========================
   Scan Progress Bar
========================= */
export function ScanProgressBar() {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) return;

    const i = setInterval(async () => {
      try {
        const r = await fetch("/api/scan/progress");
        const j = await r.json();
        setProgress(j.progress);
        if (j.progress >= 100) setActive(false);
      } catch {
        setActive(false);
      }
    }, 800);

    return () => clearInterval(i);
  }, [active]);

  return (
    <div className="w-full mt-4">
      <button
        onClick={() => {
          setProgress(0);
          setActive(true);
        }}
        className="mb-2 text-sm underline"
      >
        Start scan
      </button>

      {active && (
        <div className="w-full h-2 bg-gray-200 rounded">
          <div
            className="h-2 bg-blue-500 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

/* =========================
   Home Shell
========================= */
export function HomeShell() {
  const { address: connectedAddress, isConnected } = useAccount();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [chainId, setChainId] = useState<number>(DEFAULT_CHAIN_ID);
  const [ownerInput, setOwnerInput] = useState("");
  const [useConnectedOwner, setUseConnectedOwner] = useState(true);

  const owner = useMemo(() => normalizeAddress(ownerInput), [ownerInput]);

  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(false);
  const [deepScan, setDeepScan] = useState(false);

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [hygieneXp, setHygieneXp] = useState(0);

  const [revokedCount, setRevokedCount] = useState(0);
  const [limitedCount, setLimitedCount] = useState(0);
  const [panickedCount] = useState(0);

  const [lastScanKey, setLastScanKey] = useState<string | null>(null);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);

  useEffect(() => {
    const xp = Number(localStorage.getItem(HYGIENE_XP_KEY) || "0");
    setHygieneXp(Number.isFinite(xp) ? xp : 0);

    const saved =
      localStorage.getItem(LAST_OWNER_KEY) ||
      localStorage.getItem(LEGACY_LAST_OWNER_KEY) ||
      "";

    if (saved && normalizeAddress(saved)) {
      setOwnerInput(saved);
      setUseConnectedOwner(false);
    }
  }, []);

  useEffect(() => {
    if (!isConnected || !connectedAddress || !useConnectedOwner) return;
    setOwnerInput(connectedAddress);
    localStorage.setItem(LAST_OWNER_KEY, connectedAddress);
  }, [isConnected, connectedAddress, useConnectedOwner]);

  useEffect(() => {
    if (ownerInput) localStorage.setItem(LAST_OWNER_KEY, ownerInput);
  }, [ownerInput]);

  const activePairs = useMemo<TokenSpenderPair[]>(
    () => allowances.map((a) => ({ token: a.token as Address, spender: a.spender as Address })),
    [allowances]
  );

  const fetchReceipts = useCallback(async (overrideOwner?: Address) => {
    const target = overrideOwner ?? owner;
    if (!target) return;

    const local = loadLocalReceipts(target, chainId);
    setReceipts(local);

    try {
      const res = await fetch(`/api/receipts?owner=${target}&chainId=${chainId}`, { cache: "no-store" });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error();
      setReceipts(mergeReceipts(local, data.receipts ?? []));
    } catch {}
  }, [owner, chainId]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const scan = useCallback(async () => {
    if (!owner) {
      toast.error("Enter a valid address first.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, chainId, deep: deepScan }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAllowances(data.allowances ?? []);
      setLastScanKey(`${owner}:${chainId}`);
      setLastScanAt(Date.now());

      setHygieneXp((x) => {
        const n = x + 1;
        localStorage.setItem(HYGIENE_XP_KEY, String(n));
        return n;
      });

      toast.success("Scan complete");
      await fetchReceipts(owner);
    } catch (e: any) {
      toast.error(e.message ?? "Scan failed");
    } finally {
      setLoading(false);
    }
  }, [owner, chainId, deepScan, fetchReceipts]);

  const invalidOwner = ownerInput.trim().length > 0 && !owner;

  return (
    <>
      <ScanProgressBar />

      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold text-white">Permit2 Panic Button</h1>
            <p className="mt-2 text-slate-300">Review spender and token before signing.</p>
          </div>
          <WalletConnect />
        </div>

        <Card className="mt-6 border-slate-800 bg-slate-950/40">
          <CardHeader>
            <CardTitle className="text-white">Scan</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <SafetyBanner />

            <Input
              value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value)}
              placeholder="0x..."
              disabled={useConnectedOwner && isConnected}
            />

            {invalidOwner && <div className="text-sm text-red-400">Invalid address</div>}

            <Button onClick={scan} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scan className="mr-2 h-4 w-4" />}
              Scan allowances
            </Button>

            <div className="text-sm text-slate-300">Hygiene XP: {hygieneXp}</div>

            <AllowanceList allowances={allowances} onRescan={scan} onAction={() => {}} />
            <div className="text-xs text-slate-500">Active pairs: {activePairs.length}</div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default HomeShell;
