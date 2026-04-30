import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { BottomNav } from "@/components/dashboard/bottom-nav";

export const metadata = {
  title: "Dashboard — CardWise",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      {/* Skip link — acessibilidade */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-blue-500 focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        Ir para o conteúdo
      </a>

      <div className="flex min-h-screen">
        {/* Sidebar fixa — desktop */}
        <Sidebar />

        {/* Coluna principal — offset da sidebar no desktop */}
        <div className="flex min-h-screen flex-1 flex-col md:pl-[220px]">
          <Topbar user={user} />

          {/* Única região de scroll do app */}
          <main
            id="main-content"
            className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-24 pt-4 md:px-6 md:pb-8 md:pt-6"
          >
            {children}
          </main>
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  );
}