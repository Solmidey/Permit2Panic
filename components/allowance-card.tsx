"use client";

import { useState } from "react";
import { Clock, Shield, ShieldOff, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmTxModal } from "@/components/confirm-tx-modal";
import { RiskChips } from "@/components/risk-chips";
import { formatTimestamp, shortAddress } from "@/lib/utils";
import type { Allowance } from "@/lib/types";
import { toast } from "sonner";

interface AllowanceCardProps {
  allowance: Allowance;
  onRescan?: () => void;
  onAction?: (type: "revoke" | "limit") => void;
}

export function AllowanceCard({
  allowance,
  onRescan,
  onAction,
}: AllowanceCardProps) {
  const [isSending, setIsSending] = useState(false);

  const handleRevoke = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/revoke", {
        method: "POST",
        body: JSON.stringify({ token: allowance.token, spender: allowance.spender }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Prepared revoke transaction. Submit in your wallet.");
      onRescan?.();
      onAction?.("revoke");
    } catch (err: any) {
      toast.error(err.message || "Failed to prepare revoke");
    } finally {
      setIsSending(false);
    }
  };

  const handleLimit = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/limit", {
        method: "POST",
        body: JSON.stringify({
          token: allowance.token,
          spender: allowance.spender,
          amount: "1",
          expiration: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success("Prepared limit transaction. Submit in your wallet.");
      onRescan?.();
      onAction?.("limit");
    } catch (err: any) {
      toast.error(err.message || "Failed to prepare limit");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-sky-400" /> {shortAddress(allowance.token)}
          </CardTitle>
          <CardDescription className="flex items-center gap-2 text-xs">
            Spender {shortAddress(allowance.spender)}
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" /> Permit2
            </Badge>
          </CardDescription>
        </div>
        <RiskChips labels={allowance.riskLabels} />
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Amount</p>
          <p className="text-lg font-semibold break-all">{allowance.amount}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Expires</p>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <p className="text-sm">{allowance.expiration === 0 ? "No expiry" : formatTimestamp(allowance.expiration)}</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge variant={allowance.expiration === 0 ? "secondary" : "success"} className="gap-1">
            {allowance.expiration === 0 ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            Active
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <ConfirmTxModal
          trigger={<Button variant="outline" size="sm">Limit</Button>}
          title="Limit allowance"
          description="Reduce the allowance to a safer amount with a short expiry."
          onConfirm={handleLimit}
          isLoading={isSending}
        />
        <ConfirmTxModal
          trigger={<Button variant="destructive" size="sm">Revoke</Button>}
          title="Revoke allowance"
          description="Set the allowance to zero. You will submit this transaction from your wallet."
          onConfirm={handleRevoke}
          isLoading={isSending}
        />
      </CardFooter>
    </Card>
  );
}
