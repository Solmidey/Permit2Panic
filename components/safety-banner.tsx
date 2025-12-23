import { ShieldAlert } from "lucide-react";

export function SafetyBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100">
      <ShieldAlert className="mt-0.5 h-5 w-5" />
      <div>
        <p className="font-semibold">Review spender and token before signing.</p>
        <p className="text-sm opacity-90">
          This app cannot recover stolen funds. Always double-check transaction details and only proceed when you trust the spender.
        </p>
      </div>
    </div>
  );
}
