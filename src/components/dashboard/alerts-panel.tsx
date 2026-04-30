// src/components/dashboard/alerts-panel.tsx
"use client";

import { AlertCircle, Info, AlertTriangle, X, CheckCheck } from "lucide-react";
import { useAlertas, type AlertSeverity } from "@/hooks/useAlertas";
import { Skeleton } from "@/components/compartilhado/Skeleton";

// ─── config visual por severity ──────────────────────────────────────────────

type StyleConfig = { wrapper: string; iconBg: string; icon: string; title: string };

const STYLES: Record<AlertSeverity, StyleConfig> = {
  info: {
    wrapper: "bg-blue-500/5 border-blue-500/10",
    iconBg:  "bg-blue-500/15",
    icon:    "text-blue-400",
    title:   "text-blue-400",
  },
  warning: {
    wrapper: "bg-yellow-500/5 border-yellow-500/10",
    iconBg:  "bg-yellow-500/15",
    icon:    "text-yellow-400",
    title:   "text-yellow-400",
  },
  danger: {
    wrapper: "bg-red-500/5 border-red-500/10",
    iconBg:  "bg-red-500/15",
    icon:    "text-red-400",
    title:   "text-red-400",
  },
};

const ICONS = {
  info:    Info,
  warning: AlertTriangle,
  danger:  AlertCircle,
};

function formatTipo(type: string) {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── componente ───────────────────────────────────────────────────────────────

export function AlertsPanel() {
  const { alertas, isLoading, isError, naoLidos, marcarComoLido, marcarTodosLidos } = useAlertas();

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-slate-900/80 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white">Alertas Inteligentes</h2>
          {naoLidos > 0 && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {naoLidos}
            </span>
          )}
        </div>
        {naoLidos > 0 && (
          <button
            onClick={marcarTodosLidos}
            className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <CheckCheck className="h-3 w-3" />
            Marcar todos como lidos
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Erro */}
      {isError && (
        <p className="py-6 text-center text-xs text-slate-500">
          Erro ao carregar alertas
        </p>
      )}

      {/* Vazio */}
      {!isLoading && !isError && alertas.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="text-2xl">✅</span>
          <p className="text-xs text-slate-400">Nenhum alerta no momento</p>
        </div>
      )}

      {/* Lista */}
      {!isLoading && alertas.length > 0 && (
        <ul className="space-y-2.5" role="list">
          {alertas.map((alerta) => {
            const s    = STYLES[alerta.severity];
            const Icon = ICONS[alerta.severity];

            return (
              <li
                key={alerta.id}
                className={`flex gap-3 rounded-xl border p-3 transition-opacity ${s.wrapper} ${alerta.is_read ? "opacity-40" : "opacity-100"}`}
              >
                <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${s.iconBg}`}>
                  <Icon className={`h-3.5 w-3.5 ${s.icon}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium ${s.title}`}>
                    {formatTipo(alerta.type)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400 leading-relaxed">
                    {alerta.message}
                  </p>
                </div>

                {!alerta.is_read && (
                  <button
                    onClick={() => marcarComoLido(alerta.id)}
                    aria-label="Marcar como lido"
                    className="mt-0.5 shrink-0 rounded-md p-0.5 text-slate-600 hover:text-slate-300 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}