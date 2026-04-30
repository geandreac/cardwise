// src/app/dashboard/page.tsx
import { KpiSection }           from "@/components/dashboard/kpi-section";
import { CardsOverview }        from "@/components/dashboard/cards-overview";
import { CategoriesOverview }   from "@/components/dashboard/categories-overview";
import { RecentTransactions }   from "@/components/dashboard/recent-transactions";
import { AlertsPanel }          from "@/components/dashboard/alerts-panel";

export const metadata = {
  title: "Visão Geral — CardWise",
};

export default function DashboardPage() {
  return (
    <div className="space-y-5">

      {/* ── KPIs + barra de limite ───────────────────────── */}
      <KpiSection />

      {/* ── Cartões + Categorias ─────────────────────────── */}
      <section
        aria-label="Cartões e categorias"
        className="grid grid-cols-1 gap-4 xl:grid-cols-2"
      >
        <CardsOverview />
        <CategoriesOverview />
      </section>

      {/* ── Transações + Alertas ─────────────────────────── */}
      <section
        aria-label="Transações e alertas"
        className="grid grid-cols-1 gap-4 xl:grid-cols-2"
      >
        <RecentTransactions />
        <AlertsPanel />
      </section>

    </div>
  );
}