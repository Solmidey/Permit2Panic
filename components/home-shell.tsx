"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, RefreshCcw, Sparkles } from "lucide-react";

import { AllowanceList } from "@/components/allowance-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SafetyBanner } from "@/components/safety-banner";
import { ChainSwitcher } from "@/components/chain-switcher";
import { PanicButton } from "@/components/panic-button";
import { ReceiptCard } from "@/components/receipt-card";
import { WalletConnect } from "@/components/wallet-connect";
import { DEFAULT_CHAIN_ID } from "@/lib/chains";
import type { Allowance, TokenSpenderPair, Receipt } from "@/lib/types";
import { toast } from "sonner";

export function HomeShell() {
  const [chainId, setChainId] = useState(DEFAULT_CHAIN_ID);
  const [owner, setOwner] = useState<string>("");
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [loading, setLoading] = useState(false);
  const [deepScan, setDeepScan] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [hygieneXp, setHygieneXp] = useState(0);
  const [revokedCount, setRevokedCount] = useState(0);
  const [limitedCount, setLimitedCount] = useState(0);
  const [panickedCount, setPanickedCount] = useState(0);

  useEffect(() => {
    const xp = Number(localStorage.getItem("hygiene_xp") || "0");
    setHygieneXp(xp);
  }, []);

  const activePairs = useMemo<TokenSpenderPair[]>(
    () => allowances.map((a) => ({ token: a.token, spender: a.spender })),
    [allowances]
  );

  const fetchReceipts = async () => {
    if (!owner) return;
    const res = await fetch(`/api/receipts?owner=${owner}&chainId=${chainId}`);
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error("Receipts API returned non-JSON:", text);
      return;
    }
    if (!res.ok) {
      console.error("Receipts API error:", data?.error ?? text);
      return;
    }
    if (!data.error) setReceipts(data.receipts || []);
  };

  useEffect(() => {
    fetchReceipts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, chainId]);

  const scan = async () => {
    if (!owner) {
      toast.error("Enter an address to scan");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        body: JSON.stringify({ owner, chainId, deep: deepScan }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAllowances(data.allowances || []);
      toast.success("Scan complete");
      const newXp = hygieneXp + 1;
      setHygieneXp(newXp);
      localStorage.setItem("hygiene_xp", String(newXp));
      await fetchReceipts();
    } catch (err: any) {
      toast.error(err.message || "Failed to scan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedOwner = localStorage.getItem("last_owner");
    if (savedOwner) setOwner(savedOwner);
  }, []);

  useEffect(() => {
    if (owner) localStorage.setItem("last_owner", owner);
  }, [owner]);

  const handleAllowanceAction = (type: "revoke" | "limit") => {
    if (type === "revoke") setRevokedCount((v) => v + 1);
    if (type === "limit") setLimitedCount((v) => v + 1);
  };

  const saveReceipt = async () => {
    if (!owner) {
      toast.error("Connect or enter a wallet address first.");
      return;
    }
    try {
      await fetch("/api/receipts", {
        method: "POST",
        body: JSON.stringify({
          owner,
          chainId,
          revoked: revokedCount,
          limited: limitedCount,
          panicked: panickedCount,
          summary: `Revoked ${revokedCount} approvals, limited ${limitedCount}, panic batches ${panickedCount}.`,
        }),
      });
      toast.success("Safety Receipt saved");
      fetchReceipts();
      setRevokedCount(0);
      setLimitedCount(0);
      setPanickedCount(0);
    } catch (err: any) {
      toast.error(err.message || "Failed to save receipt");
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-lg">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Sparkles className="h-4 w-4" /> MiniKit ready
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white">Permit2 Panic Button</h1>
            <p className="text-sm text-slate-300">
              Scan, flag, and revoke risky allowances on Ethereum & Base. Keep your wallet hygiene streak alive.
            </p>
          </div>
          <WalletConnect />
        </div>
        <SafetyBanner />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm text-slate-300" htmlFor="owner">Owner address</label>
            <Input
              id="owner"
              placeholder="0x..."
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="bg-slate-900/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Chain</label>
            <ChainSwitcher chainId={chainId} onChange={setChainId} />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Deep scan</label>
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <p className="text-xs text-slate-400">Include historical events (may take longer).</p>
              <Button variant="outline" size="sm" onClick={() => setDeepScan((v) => !v)}>
                {deepScan ? "On" : "Off"}
              </Button>
            </div>
          </div>
        </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={scan} className="gap-2" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          {loading ? "Scanning" : "Scan allowances"}
        </Button>
        <Button variant="secondary" className="gap-2" onClick={fetchReceipts}>
          <ArrowRight className="h-4 w-4" /> Refresh receipts
        </Button>
        <div className="rounded-full bg-slate-900/60 px-3 py-1 text-xs text-slate-300">Hygiene XP: {hygieneXp}</div>
        <PanicButton
          pairs={activePairs}
          onPrepared={() => setPanickedCount((v) => v + 1)}
        />
      </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Allowances</h2>
          <p className="text-xs text-slate-400">Active pairs: {allowances.length}</p>
        </div>
        {loading ? (
          <Card className="border-slate-800 bg-slate-950/70">
            <CardHeader>
              <CardTitle>Scanning...</CardTitle>
              <CardDescription>Pulling Permit2 logs and decoding events.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Building token/spender pairs and reading allowances.
            </CardContent>
          </Card>
        ) : (
          <AllowanceList allowances={allowances} onRescan={scan} onAction={handleAllowanceAction} />
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Safety Receipts</h2>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <p>Shareable summary after cleanups</p>
            <Button size="sm" variant="outline" onClick={saveReceipt}>
              Save receipt
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {receipts.map((receipt) => (
            <ReceiptCard key={receipt.id} receipt={receipt} />
          ))}
          {receipts.length === 0 && (
            <Card className="border-slate-800 bg-slate-950/70">
              <CardHeader>
                <CardTitle>No receipts yet</CardTitle>
                <CardDescription>Complete a scan and revoke/limit approvals to generate a shareable receipt.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Earn weekly streaks by keeping your wallet clean.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
