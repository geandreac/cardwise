// src/app/dashboard/relatorios/page.tsx
"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { useCartoes } from "@/hooks/useCartoes";
import { useInvoices } from "@/hooks/useInvoices";
import { usePerfil } from "@/hooks/usePerfil";
import { formatMoeda } from "@/lib/utils";
import { Skeleton } from "@/components/compartilhado/Skeleton";
import {
  Document, Page, Text, View, StyleSheet, pdf,
} from "@react-pdf/renderer";

// ─── estilos PDF ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page:     { padding: 40, backgroundColor: "#ffffff", fontFamily: "Helvetica" },
  header:   { marginBottom: 24 },
  title:    { fontSize: 22, fontWeight: "bold", color: "#0f172a" },
  subtitle: { fontSize: 11, color: "#64748b", marginTop: 4 },
  section:  { marginBottom: 20 },
  secTitle: { fontSize: 13, fontWeight: "bold", color: "#0f172a", marginBottom: 10, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingBottom: 4 },
  row:      { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  label:    { fontSize: 10, color: "#475569" },
  value:    { fontSize: 10, color: "#0f172a", fontWeight: "bold" },
  kpiRow:   { flexDirection: "row", gap: 12, marginBottom: 16 },
  kpiBox:   { flex: 1, backgroundColor: "#f8fafc", padding: 12, borderRadius: 8 },
  kpiLabel: { fontSize: 9, color: "#94a3b8", marginBottom: 3 },
  kpiValue: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  footer:   { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 9, color: "#94a3b8" },
});

// ─── documento PDF ────────────────────────────────────────────────────────────

type PDFProps = {
  nomeUsuario: string;
  mesRef: string;
  gastoTotal: number;
  limiteTotal: number;
  cartoes: { nickname: string; current_spend: number; credit_limit: number; usage_percent: number }[];
  faturas: { card_nickname: string; total_amount: number; status: string; due_date: string }[];
};

function RelatorioPDF({ nomeUsuario, mesRef, gastoTotal, limiteTotal, cartoes, faturas }: PDFProps) {
  const [anoStr, mesStr] = mesRef.split("-");
  const mesLabel = new Date(Number(anoStr), Number(mesStr) - 1, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <Document title={`Relatório CardWise — ${mesLabel}`} author="CardWise">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>CardWise — Relatório Financeiro</Text>
          <Text style={styles.subtitle}>{mesLabel} · {nomeUsuario}</Text>
        </View>

        <View style={styles.kpiRow}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>GASTO DO MÊS</Text>
            <Text style={styles.kpiValue}>{formatMoeda(gastoTotal)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>LIMITE TOTAL</Text>
            <Text style={styles.kpiValue}>{formatMoeda(limiteTotal)}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>DISPONÍVEL</Text>
            <Text style={styles.kpiValue}>{formatMoeda(limiteTotal - gastoTotal)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.secTitle}>Meus Cartões</Text>
          {cartoes.map((c, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.label}>{c.nickname}</Text>
              <Text style={styles.value}>
                {formatMoeda(c.current_spend)} / {formatMoeda(c.credit_limit)} ({c.usage_percent}%)
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.secTitle}>Faturas do Mês</Text>
          {faturas.length === 0 ? (
            <Text style={{ fontSize: 10, color: "#94a3b8" }}>Nenhuma fatura encontrada</Text>
          ) : faturas.map((f, i) => (
            <View key={i} style={styles.row}>
              <Text style={styles.label}>{f.card_nickname}</Text>
              <Text style={styles.value}>
                {formatMoeda(f.total_amount)} · {f.status} · venc.{" "}
                {new Date(f.due_date).toLocaleDateString("pt-BR")}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Gerado pelo CardWise em {new Date().toLocaleDateString("pt-BR")} · Documento confidencial
        </Text>
      </Page>
    </Document>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── página ───────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const { cartoes, isLoading: loadC, gasto_total, limite_total } = useCartoes();
  const { invoices, isLoading: loadI }                           = useInvoices();
  const { perfil,   isLoading: loadP }                           = usePerfil();

  const [mesRef,  setMesRef]  = useState(mesAtual());
  const [gerando, setGerando] = useState(false);

  const isLoading   = loadC || loadI || loadP;
  const faturasMes  = invoices.filter((inv) => inv.reference_month.startsWith(mesRef));

  async function gerarPDF() {
    setGerando(true);
    try {
      const blob = await pdf(
        <RelatorioPDF
          nomeUsuario={perfil?.full_name ?? "Usuário"}
          mesRef={mesRef}
          gastoTotal={gasto_total}
          limiteTotal={limite_total}
          cartoes={cartoes}
          faturas={faturasMes}
        />
      ).toBlob();

      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `cardwise-relatorio-${mesRef}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGerando(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-28 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const [anoStr, mesStr] = mesRef.split("-");
  const mesLabel = new Date(Number(anoStr), Number(mesStr) - 1, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5 max-w-2xl">
      <h1 className="text-xl font-bold text-white">Relatórios</h1>

      <div className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-5">
        <h2 className="mb-4 text-sm font-semibold text-white">Gerar Relatório em PDF</h2>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              Mês de referência
            </label>
            <input
              type="month"
              value={mesRef}
              onChange={(e) => setMesRef(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-slate-800 px-3.5 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-colors"
            />
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-slate-800/50 p-4 space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500 mb-3">
              Conteúdo do relatório — {mesLabel}
            </p>
            {[
              { label: "Resumo financeiro",  value: `${formatMoeda(gasto_total)} gastos / ${formatMoeda(limite_total)} limite` },
              { label: "Cartões incluídos",  value: `${cartoes.length} cartão${cartoes.length !== 1 ? "s" : ""}` },
              { label: "Faturas do período", value: `${faturasMes.length} fatura${faturasMes.length !== 1 ? "s" : ""}` },
              { label: "Gerado para",        value: perfil?.full_name ?? "Usuário" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-300 font-medium">{value}</span>
              </div>
            ))}
          </div>

          <button
            onClick={gerarPDF}
            disabled={gerando}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {gerando ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Gerando PDF...</>
            ) : (
              <><FileDown className="h-4 w-4" /> Baixar PDF</>
            )}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Meses disponíveis</h2>
        <div className="space-y-2">
          {Array.from({ length: 4 }, (_, i) => {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const ref   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            const count = invoices.filter((inv) => inv.reference_month.startsWith(ref)).length;
            return (
              <button
                key={ref}
                onClick={() => setMesRef(ref)}
                className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-colors ${
                  mesRef === ref
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "hover:bg-white/[0.03] text-slate-400 border border-transparent"
                }`}
              >
                <span className="capitalize">{label}</span>
                <span className="text-xs text-slate-500">
                  {count} fatura{count !== 1 ? "s" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}