"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmTxModal } from "@/components/confirm-tx-modal";
import type { TokenSpenderPair } from "@/lib/types";
import { toast } from "sonner";

interface PanicButtonProps {
  pairs: TokenSpenderPair[];
  onPrepared?: () => void;
}

export function PanicButton({ pairs, onPrepared }: PanicButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const onConfirm = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/panic", {
        method: "POST",
        body: JSON.stringify({ pairs }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(
        `Prepared ${data.batches.length} lockdown batch(es). Submit from your wallet.`,
      );
      onPrepared?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to prepare panic transaction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ConfirmTxModal
      trigger={
        <Button variant="destructive" className="gap-2" disabled={pairs.length === 0}>
          <AlertTriangle className="h-4 w-4" /> Panic
        </Button>
      }
      title="Panic lockdown"
      description="Submit bulk lockdown transactions to immediately revoke allowances for the selected pairs."
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}
