import { Bell } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { LogoutButton } from "@/components/dashboard/logout-button";

type TopbarProps = {
  user: User;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

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

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.05] bg-[#020617]/80 px-4 py-3 backdrop-blur-xl md:px-6">
      <div>
        <p className="text-xs text-slate-500">{getGreeting()}</p>
        <p className="text-sm font-semibold text-white">{name}</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Sino de notificações */}
        <button
          aria-label="Ver notificações"
          className="relative rounded-xl p-2 text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full bg-red-500"
            aria-hidden="true"
          />
        </button>

        {/* Logout — visível só no mobile (sidebar cobre no desktop) */}
        <div className="md:hidden">
          <LogoutButton variant="topbar" />
        </div>

        {/* Avatar com iniciais */}
        <div
          aria-label={`Avatar de ${name}`}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white select-none"
        >
          {initials}
        </div>
      </div>
    </header>
  );
}