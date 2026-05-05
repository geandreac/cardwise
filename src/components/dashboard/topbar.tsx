"use client";

import { useState, useMemo } from "react";
import { Bell } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { LogoutButton } from "@/components/dashboard/logout-button";
import { useCartoes } from "@/hooks/useCartoes";
import { formatMoeda } from "@/lib/utils";

type TopbarProps = {
  user: User;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Topbar({ user }: TopbarProps) {
  const name =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "Usuário";

  const initials = getInitials(name);

  const [showNotifications, setShowNotifications] = useState(false);
  const { cartoes, isLoading } = useCartoes();

  const notifications = useMemo(() => {
    if (isLoading) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return cartoes.map(card => {
      // Data de vencimento no mês atual
      let dueDate = new Date(now.getFullYear(), now.getMonth(), card.due_day);
      
      // Se já passou o dia no mês atual, aponta para o próximo mês
      if (dueDate < today) {
        dueDate = new Date(now.getFullYear(), now.getMonth() + 1, card.due_day);
      }

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: card.id,
        cardName: card.nickname,
        daysRemaining: diffDays,
        amount: card.current_spend,
        isCritical: diffDays <= 3,
        isWarning: diffDays <= 7
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [cartoes, isLoading]);

  const activeNotificationsCount = notifications.filter(n => n.isWarning).length;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.05] bg-[#020617]/80 px-4 py-3 backdrop-blur-xl md:px-6">
      <div>
        <p className="text-sm font-semibold text-white">Bem-vindo, {name}!</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Sino de notificações com Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Ver notificações"
            className="relative rounded-xl p-2 text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
          >
            <Bell className="h-[18px] w-[18px]" />
            {activeNotificationsCount > 0 && (
              <span
                className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-slate-950"
              >
                {activeNotificationsCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              {/* Overlay invisível para fechar ao clicar fora */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)} 
              />
              {/* Modal/Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/[0.06] bg-slate-900 p-4 shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between mb-3 border-b border-white/[0.06] pb-2">
                  <h3 className="text-sm font-semibold text-white">
                    Notificações
                  </h3>
                  {activeNotificationsCount > 0 && (
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                      {activeNotificationsCount} Alerta{activeNotificationsCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-none pr-1">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`rounded-lg p-3 transition-colors ${
                          n.isCritical ? 'bg-red-500/10 border border-red-500/20' : 
                          n.isWarning ? 'bg-yellow-500/10 border border-yellow-500/20' : 
                          'bg-white/5 border border-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className={`text-[11px] font-bold ${
                            n.isCritical ? 'text-red-400' : 
                            n.isWarning ? 'text-yellow-400' : 
                            'text-slate-300'
                          }`}>
                            Vencimento {n.cardName}
                          </p>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatMoeda(n.amount)}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-300">
                          {n.daysRemaining === 0 ? (
                            <span className="font-bold text-red-400">Vence HOJE!</span>
                          ) : n.daysRemaining === 1 ? (
                            "Vence amanhã."
                          ) : (
                            `Vence em ${n.daysRemaining} dias.`
                          )}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-center py-4 text-xs text-slate-500">
                      Nenhuma notificação por enquanto.
                    </p>
                  )}
                  
                  {/* Footer estático opcional */}
                  <div className="pt-2">
                    <p className="text-[9px] text-center text-slate-600 uppercase tracking-widest">
                      CardWise Intelligence
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Logout — visível só no mobile (sidebar cobre no desktop) */}
        <div className="md:hidden">
          <LogoutButton variant="topbar" />
        </div>

        {/* Avatar com iniciais */}
        <div
          aria-label={`Avatar de ${name}`}
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white select-none"
        >
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
      </div>
    </header>
  );
}