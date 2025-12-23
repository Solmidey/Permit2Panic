import { Badge } from "@/components/ui/badge";

interface RiskChipsProps {
  labels?: string[];
}

export function RiskChips({ labels }: RiskChipsProps) {
  if (!labels || labels.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <Badge
          key={label}
          variant={label === "Unlimited" ? "destructive" : label.includes("Unverified") ? "warning" : "secondary"}
        >
          {label}
        </Badge>
      ))}
    </div>
  );
}
