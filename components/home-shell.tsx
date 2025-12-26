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
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function HomeShell() {
  const { address: connectedAddress, isConnected } = useAccount();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [chainId, setChainId] = useState<number>(DEFAULT_CHAIN_ID);

  // owner input + toggle (default ON: use connected wallet)
  const [ownerInput, setOwnerInput] = useState<string>("");
  const [useConnectedOwner, setUseConnectedOwner] = useState<boolean>(true);

  const owner = useMemo(() => normalizeAddress(ownerInput), [ownerInput]);

  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(false);
  const [deepScan, setDeepScan] = useState(false);

  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [hygieneXp, setHygieneXp] = useState(0);

  const [revokedCount, setRevokedCount] = useState(0);
  const [limitedCount, setLimitedCount] = useState(0);
  const [panickedCount] = useState(0); // wire later if needed

  // track “last successful scan” so users can save receipts even without actions
  const [lastScanKey, setLastScanKey] = useState<string | null>(null);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);

  // init: hygiene xp + last owner
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

  // keep owner synced to connected wallet when toggle is ON
  useEffect(() => {
    if (!isConnected || !connectedAddress) return;
    if (!useConnectedOwner) return;

    setOwnerInput(connectedAddress);
    localStorage.setItem(LAST_OWNER_KEY, connectedAddress);
  }, [isConnected, connectedAddress, useConnectedOwner]);

  // persist whatever is currently in the input
  useEffect(() => {
    if (ownerInput) localStorage.setItem(LAST_OWNER_KEY, ownerInput);
  }, [ownerInput]);

  const activePairs = useMemo<TokenSpenderPair[]>(
    () => allowances.map((a) => ({ token: a.token as Address, spender: a.spender as Address })),
    [allowances]
  );

  const fetchReceipts = useCallback(
    async (overrideOwner?: Address) => {
      const target = overrideOwner ?? owner;
      if (!target) return;

      // 1) show local receipts immediately
      const local = loadLocalReceipts(target, chainId);
      setReceipts(local);

      // 2) best-effort: fetch server receipts and merge
      try {
        const res = await fetch(`/api/receipts?owner=${target}&chainId=${chainId}`, {
          cache: "no-store",
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (!res.ok) throw new Error(data?.error ?? "Failed to load receipts");
        const remote = Array.isArray(data.receipts) ? (data.receipts as Receipt[]) : [];

        setReceipts(mergeReceipts(local, remote));
      } catch (err) {
        console.error(err);
      }
    },
    [owner, chainId]
  );

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const scan = useCallback(
    async (overrideOwner?: Address) => {
      const target = overrideOwner ?? owner;

      if (!target) {
        toast.error(isConnected ? "Connect a wallet or enter an address to scan." : "Enter an address to scan.");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner: target, chainId, deep: deepScan }),
        });

        const text = await res.text();
        const data = text ? JSON.parse(text) : {};

        if (!res.ok) throw new Error(data?.error ?? "Scan failed");
        if (data.error) throw new Error(data.error);

        const nextAllowances = Array.isArray(data.allowances) ? (data.allowances as Allowance[]) : [];
        setAllowances(nextAllowances);

        // mark last successful scan (lets Save Receipt work even with 0 actions)
        setLastScanKey(`${target}:${chainId}`);
        setLastScanAt(Date.now());

        toast.success("Scan complete");

        setHygieneXp((prev) => {
          const next = prev + 1;
          localStorage.setItem(HYGIENE_XP_KEY, String(next));
          return next;
        });

        await fetchReceipts(target);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to scan");
      } finally {
        setLoading(false);
      }
    },
    [owner, chainId, deepScan, isConnected, fetchReceipts]
  );

  const canSaveReceipt = useMemo(() => {
    if (!owner) return false;

    const actions = revokedCount + limitedCount + panickedCount;
    if (actions > 0) return true;

    // allow saving if a scan succeeded for current owner+chain
    return lastScanKey === `${owner}:${chainId}` && lastScanAt !== null;
  }, [owner, chainId, revokedCount, limitedCount, panickedCount, lastScanKey, lastScanAt]);

  const saveReceipt = useCallback(async () => {
    if (!owner) {
      toast.error("Connect or enter a wallet address first.");
      return;
    }

    if (!canSaveReceipt) {
      toast.error("Run a scan or take an action (revoke/limit) first.");
      return;
    }

    const createdAt = Date.now();
    const id = makeId();

    const actions = revokedCount + limitedCount + panickedCount;
    const allowanceCount = allowances.length;

    const summary =
      actions > 0
        ? `Actions: revoked ${revokedCount}, limited ${limitedCount}, panic batches ${panickedCount}. (Scan saw ${allowanceCount} allowances.)`
        : `Scan receipt: ${allowanceCount} allowances found. No actions taken.`;

    const receipt: Receipt = {
      ...( {
        id,
        owner,
        chainId,
        revoked: revokedCount,
        limited: limitedCount,
        panicked: panickedCount,
        summary,
        createdAt,
      } as any ),
    };

    // ✅ always save locally first
    const nextLocal = prependLocalReceipt(owner, chainId, receipt);
    setReceipts(nextLocal);
    toast.success("Safety Receipt saved");

    // reset counters for next session
    setRevokedCount(0);
    setLimitedCount(0);

    // Best-effort sync
    try {
      const res = await fetch("/api/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receipt),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) throw new Error(data?.error ?? "Failed to sync receipt");

      await fetchReceipts(owner);
    } catch (err) {
      console.error(err);
      toast.message("Saved locally. Server sync failed (still saved).");
    }
  }, [
    owner,
    chainId,
    allowances.length,
    revokedCount,
    limitedCount,
    panickedCount,
    canSaveReceipt,
    fetchReceipts,
  ]);

  const handleAllowanceAction = useCallback((type: "revoke" | "limit") => {
    if (type === "revoke") setRevokedCount((v) => v + 1);
    if (type === "limit") setLimitedCount((v) => v + 1);
  }, []);

  const scanConnected = () => {
    const addr = normalizeAddress(connectedAddress ?? "");
    if (!addr) {
      toast.error("Connect a wallet first.");
      return;
    }
    setUseConnectedOwner(true);
    setOwnerInput(addr);
    scan(addr);
  };

  const invalidOwner = ownerInput.trim().length > 0 && !owner;

  return (
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Owner address</label>
              <Input
                value={ownerInput}
                onChange={(e) => setOwnerInput(e.target.value)}
                placeholder="0x..."
                disabled={useConnectedOwner && isConnected}
              />
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useConnectedOwner}
                    onChange={(e) => setUseConnectedOwner(e.target.checked)}
                  />
                  Use connected wallet
                </label>

                {isConnected && connectedAddress ? (
                  <button
                    type="button"
                    className="underline underline-offset-4 hover:text-slate-200"
                    onClick={scanConnected}
                  >
                    Scan {shortAddr(getAddress(connectedAddress) as Address)}
                  </button>
                ) : null}

                {invalidOwner ? <span className="text-red-400">Invalid address</span> : null}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Chain</label>
              {mounted ? (
                <ChainSwitcher chainId={chainId} onChange={(id) => setChainId(id)} />
              ) : (
                <div className="h-10 w-[180px] rounded-xl border border-slate-800 bg-slate-950/30" />
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm text-slate-300">Deep scan</label>
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3">
                <span className="text-sm text-slate-300">Include historical events (may take longer).</span>
                <button
                  type="button"
                  className="text-sm text-slate-200 underline underline-offset-4"
                  onClick={() => setDeepScan((v) => !v)}
                >
                  {deepScan ? "On" : "Off"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => scan()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scan className="mr-2 h-4 w-4" />}
              Scan allowances
            </Button>

            <Button
              variant="secondary"
              onClick={() => fetchReceipts()}
              disabled={!owner}
              title={!owner ? "Enter a valid address first" : "Refresh receipts"}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh receipts
            </Button>

            <div className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-sm text-slate-200">
              Hygiene XP: {hygieneXp}
            </div>

            <Button variant="outline" onClick={saveReceipt} disabled={!canSaveReceipt}>
              Save receipt
            </Button>
          </div>

          <AllowanceList allowances={allowances} onRescan={() => scan()} onAction={handleAllowanceAction} />

          <div className="text-xs text-slate-500">Active pairs ready for panic/lockdown: {activePairs.length}</div>
        </CardContent>
      </Card>

      <div className="mt-8 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-white">Receipts</h2>
        </div>

        {receipts.length ? (
          <div className="space-y-3">
            {receipts.map((r, idx) => (
              <ReceiptCard key={(r as any).id ?? `${(r as any).createdAt ?? idx}`} receipt={r} />
            ))}
          </div>
        ) : (
          <Card className="border-slate-800 bg-slate-950/40">
            <CardContent className="py-8 text-center text-slate-300">
              No receipts found. Run a scan and save a receipt.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default HomeShell;
