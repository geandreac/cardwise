"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "sidebar" | "topbar";
};

export function LogoutButton({ variant = "sidebar" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  if (variant === "topbar") {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        aria-label="Sair da conta"
        className="relative rounded-xl p-2 text-slate-400 transition hover:bg-white/[0.05] hover:text-red-400 disabled:opacity-50"
      >
        <LogOut className="h-[18px] w-[18px]" />
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-150",
        "text-slate-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
      )}
    >
      <LogOut className="h-[18px] w-[18px] flex-shrink-0" />
      <span>{loading ? "Saindo..." : "Sair"}</span>
    </button>
  );
}
