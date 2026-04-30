import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type HintVariant = "green" | "red" | "yellow" | "blue" | "muted";

type KpiCardProps = {
  title: string;
  value: string;
  hint: string;
  icon: ReactNode;
  hintVariant?: HintVariant;
};

const hintColors: Record<HintVariant, string> = {
  green:  "text-green-400",
  red:    "text-red-400",
  yellow: "text-yellow-400",
  blue:   "text-blue-400",
  muted:  "text-slate-500",
};

export function KpiCard({
  title,
  value,
  hint,
  icon,
  hintVariant = "muted",
}: KpiCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-white/[0.06] p-4 transition-all duration-200",
        "bg-gradient-to-br from-slate-900/80 to-slate-900/50",
        "hover:-translate-y-0.5 hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/5"
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
          {title}
        </span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.05]">
          {icon}
        </div>
      </div>

      <p className="text-2xl font-bold tabular-nums text-white">{value}</p>

      <p className={cn("mt-1 text-[11px]", hintColors[hintVariant])}>
        {hint}
      </p>
    </article>
  );
}