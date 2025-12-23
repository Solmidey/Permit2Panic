"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPORTED_CHAINS } from "@/lib/chains";

interface ChainSwitcherProps {
  chainId: number;
  onChange: (chainId: number) => void;
}

export function ChainSwitcher({ chainId, onChange }: ChainSwitcherProps) {
  return (
    <Select value={String(chainId)} onValueChange={(val) => onChange(Number(val))}>
      <SelectTrigger className="w-[180px] bg-card/60">
        <SelectValue placeholder="Select chain" />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_CHAINS.map((chain) => (
          <SelectItem key={chain.id} value={String(chain.id)}>
            {chain.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
