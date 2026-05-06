"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  User,
  Users,
  FileText,
  MoreHorizontal,
  CreditCard,
  TrendingUp,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

const mainItems = [
  { href: "/dashboard",            label: "Geral",      icon: LayoutDashboard },
  { href: "/dashboard/faturas",    label: "Faturas",    icon: FileText },
  { href: "/dashboard/transacoes", label: "Transações", icon: ArrowLeftRight },
  { href: "/dashboard/analise",    label: "Análise",    icon: BarChart3 },
];

const moreItems = [
  { href: "/dashboard/cartoes",    label: "Meus Cartões", icon: CreditCard },
  { href: "/dashboard/rateio",     label: "Rateio",       icon: Users },
  { href: "/dashboard/projecoes",  label: "Projeções",    icon: TrendingUp },
  { href: "/dashboard/relatorios", label: "Relatórios",   icon: Download },
  { href: "/dashboard/perfil",     label: "Perfil",       icon: User },
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
      {/* Itens Principais */}
      {mainItems.map((item) => {
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
              "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[10px] font-medium transition-all active:scale-95",
              active ? "text-blue-400" : "text-slate-500 active:text-white"
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* Menu Mais */}
      <Drawer>
        <DrawerTrigger asChild>
          <button
            className={cn(
              "flex min-h-[44px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[10px] font-medium transition-all active:scale-95",
              moreItems.some(i => pathname.startsWith(i.href)) ? "text-blue-400" : "text-slate-500 active:text-white"
            )}
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
            <span>Mais</span>
          </button>
        </DrawerTrigger>
        <DrawerContent className="bg-[#0f172a] border-slate-800">
          <DrawerHeader className="border-b border-white/[0.05] pb-4">
            <DrawerTitle className="text-left text-sm font-semibold text-slate-400">
              Menu de Navegação
            </DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-1 gap-1 p-4 pb-12">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);

              return (
                <DrawerClose key={item.href} asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-4 rounded-2xl p-4 transition-colors",
                      active ? "bg-blue-500/10 text-blue-400" : "text-slate-300 active:bg-white/[0.05]"
                    )}
                  >
                    <div className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
                      active ? "border-blue-500/20 bg-blue-500/10" : "border-white/[0.06] bg-white/[0.02]"
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </DrawerClose>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </nav>
  );
}