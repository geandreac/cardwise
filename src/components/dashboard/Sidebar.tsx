"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  ArrowLeftRight,
  BarChart3,
  TrendingUp,
  Download,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/dashboard/logout-button";

const items = [
  { href: "/dashboard",            label: "Visão Geral",  icon: LayoutDashboard },
  { href: "/dashboard/cartoes",    label: "Meus Cartões", icon: CreditCard },
  { href: "/dashboard/faturas",    label: "Faturas",      icon: FileText },
  { href: "/dashboard/transacoes", label: "Transações",   icon: ArrowLeftRight },
  { href: "/dashboard/analise",    label: "Análise",      icon: BarChart3 },
  { href: "/dashboard/projecoes",  label: "Projeções",    icon: TrendingUp },
  { href: "/dashboard/relatorios", label: "Relatórios",   icon: Download },
  { href: "/dashboard/perfil",     label: "Perfil",       icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-[220px] flex-col border-r border-white/[0.06] bg-[#020617]/90 backdrop-blur-xl md:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500">
          <CreditCard className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold tracking-tight text-white">
          CardWise
        </span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-0.5 px-2" aria-label="Menu principal">
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
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-150",
                active
                  ? "bg-blue-500/10 text-blue-400"
                  : "text-slate-400 hover:bg-white/[0.03] hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px] flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 pb-1">
        <LogoutButton variant="sidebar" />
      </div>

      {/* Badge de plano */}
      <div className="p-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">
            Plano
          </p>
          <p className="mt-0.5 text-xs font-semibold text-blue-400">Premium</p>
        </div>
      </div>
    </aside>
  );
}