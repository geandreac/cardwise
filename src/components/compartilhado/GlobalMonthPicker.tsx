"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { MonthYearPicker } from "./MonthYearPicker";
import { useDate } from "@/context/date-context";

export function GlobalMonthPicker() {
  const { referenceMonth, setReferenceMonth } = useDate();
  const [showPicker, setShowPicker] = useState(false);
  
  const [year, month] = referenceMonth ? referenceMonth.split("-").map(Number) : [null, null];
  
  const dateLabel = (year && month) 
    ? new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    : "Timeline";

  const dateLabelFull = (year && month) 
    ? new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "Timeline Global";

  function navigate(delta: number) {
    if (!year || !month) {
      const d = new Date();
      const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      setReferenceMonth(newMonth);
      return;
    }
    const d = new Date(year, month - 1 + delta, 1);
    const newMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    setReferenceMonth(newMonth);
  }

  return (
    <div className="flex items-center gap-0.5 sm:gap-1.5 rounded-xl border border-white/[0.08] bg-slate-800/40 p-0.5 sm:p-1 backdrop-blur-sm">
      <button
        onClick={() => navigate(-1)}
        className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.05] hover:text-white transition-all active:scale-95"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        onClick={() => setShowPicker(true)}
        className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors group"
      >
        {/* Mobile: abreviado — Desktop: completo */}
        <span className="text-center text-xs sm:text-sm font-medium capitalize text-slate-200 group-hover:text-blue-400 transition-colors sm:hidden">
          {dateLabel}
        </span>
        <span className="hidden sm:inline min-w-[110px] text-center text-sm font-medium capitalize text-slate-200 group-hover:text-blue-400 transition-colors">
          {dateLabelFull}
        </span>
        <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
      </button>

      {/* Botão ALL — escondido no mobile */}
      {referenceMonth && (
        <button
          onClick={() => setReferenceMonth("")}
          title="Ver Timeline Global"
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white/[0.05] hover:text-blue-400 transition-all"
        >
          <span className="text-[10px] font-bold">ALL</span>
        </button>
      )}

      <button
        onClick={() => navigate(1)}
        className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.05] hover:text-white transition-all active:scale-95"
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      <MonthYearPicker 
        open={showPicker}
        onClose={() => setShowPicker(false)}
        value={referenceMonth}
        onChange={setReferenceMonth}
      />
    </div>
  );
}
