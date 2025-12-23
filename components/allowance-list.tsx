"use client";

import { useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";

import { AllowanceCard } from "@/components/allowance-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Allowance } from "@/lib/types";

interface AllowanceListProps {
  allowances: Allowance[];
  onRescan?: () => void;
  onAction?: (type: "revoke" | "limit") => void;
}

export function AllowanceList({
  allowances,
  onRescan,
  onAction,
}: AllowanceListProps) {
  const [activeOnly, setActiveOnly] = useState(true);
  const [unverifiedOnly, setUnverifiedOnly] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return allowances.filter((item) => {
      const now = Math.floor(Date.now() / 1000);
      const active = BigInt(item.amount) > 0n && (item.expiration === 0 || item.expiration > now);
      if (activeOnly && !active) return false;
      if (unverifiedOnly && !item.riskLabels?.includes("Unverified")) return false;
      if (search && !`${item.token}${item.spender}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allowances, activeOnly, search, unverifiedOnly]);

  if (allowances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-800 p-10 text-center text-slate-300">
        <ShieldAlert className="h-8 w-8 text-amber-400" />
        <p>No allowances found. Run a scan to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-2">
          <Switch id="active" checked={activeOnly} onCheckedChange={setActiveOnly} />
          <Label htmlFor="active">Active only</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="unverified" checked={unverifiedOnly} onCheckedChange={setUnverifiedOnly} />
          <Label htmlFor="unverified">Unverified spender</Label>
        </div>
        <div className="flex flex-1 items-center gap-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Token or spender..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-950/40"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {filtered.map((allowance) => (
          <AllowanceCard
            key={`${allowance.token}-${allowance.spender}`}
            allowance={allowance}
            onRescan={onRescan}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}
