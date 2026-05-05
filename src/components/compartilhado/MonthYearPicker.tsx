"use client";

import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  value: string; // YYYY-MM
  onChange: (value: string) => void;
};

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const anos = Array.from({ length: 11 }, (_, i) => 2024 + i);

export function MonthYearPicker({ open, onClose, value, onChange }: Props) {
  const [selectedYear, setSelectedYear] = useState(parseInt(value.split("-")[0]));
  const [selectedMonth, setSelectedMonth] = useState(parseInt(value.split("-")[1]));

  const handleConfirm = () => {
    const formatted = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
    onChange(formatted);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[360px] p-0 border-white/10 bg-slate-900/95 backdrop-blur-xl overflow-hidden">
        <DialogHeader className="p-4 border-b border-white/5">
          <DialogTitle className="text-sm font-semibold text-slate-300">Selecionar Período</DialogTitle>
        </DialogHeader>

        <div className="flex h-[280px]">
          {/* Coluna Meses */}
          <div className="flex-1 overflow-y-auto scrollbar-none border-r border-white/5 py-2">
            {meses.map((m, idx) => {
              const monthNum = idx + 1;
              const isSelected = selectedMonth === monthNum;
              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(monthNum)}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm transition-all relative group",
                    isSelected 
                      ? "text-blue-400 font-bold bg-blue-500/5" 
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  )}
                >
                  {isSelected && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r-full" />}
                  {m}
                </button>
              );
            })}
          </div>

          {/* Coluna Anos */}
          <div className="w-[120px] overflow-y-auto scrollbar-none py-2">
            {anos.map((y) => {
              const isSelected = selectedYear === y;
              return (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={cn(
                    "w-full px-4 py-2.5 text-center text-sm transition-all relative",
                    isSelected 
                      ? "text-blue-400 font-bold bg-blue-500/5" 
                      : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  )}
                >
                   {isSelected && <div className="absolute right-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-l-full" />}
                   {y}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 bg-white/5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl py-2.5 text-xs font-semibold text-slate-400 hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-500/20"
          >
            Confirmar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
