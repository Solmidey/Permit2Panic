import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Receipt } from "@/lib/types";
import { formatTimestamp } from "@/lib/utils";

interface ReceiptCardProps {
  receipt: Receipt;
}

export function ReceiptCard({ receipt }: ReceiptCardProps) {
  return (
    <Card className="border-slate-800 bg-slate-950/70">
      <CardHeader>
        <CardTitle>Safety Receipt</CardTitle>
        <CardDescription>
          {receipt.revoked} revoked · {receipt.limited} limited · {receipt.panicked} batches — {formatTimestamp(receipt.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-slate-200">{receipt.summary}</p>
      </CardContent>
    </Card>
  );
}
