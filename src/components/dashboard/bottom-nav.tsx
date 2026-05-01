"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard",            label: "Geral",      icon: LayoutDashboard },
  { href: "/dashboard/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/dashboard/rateio",     label: "Rateio",     icon: Users },
  { href: "/dashboard/analise",    label: "Análise",    icon: BarChart3 },
  { href: "/dashboard/perfil",     label: "Perfil",     icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/[0.06] bg-[#020617]/95 px-2 backdrop-blur-xl md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 6px)",
        paddingTop: "6px",
      }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[10px] font-medium transition",
              active ? "text-blue-400" : "text-slate-500 active:text-white"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}