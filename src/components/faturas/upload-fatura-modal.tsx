"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import type { ICard } from "@/types";

interface UploadFaturaModalProps {
  open: boolean;
  cartoes: ICard[];
  onClose: () => void;
  onSuccess: () => void;
}

type Status = "idle" | "loading" | "success" | "error";

interface UploadResult {
  bank: string;
  total_amount: number;
  due_date: string;
  cycle_adjusted: boolean;
  new_closing_day: number;
  transactions_count: number;
}

export function UploadFaturaModal({ open, cartoes, onClose, onSuccess }: UploadFaturaModalProps) {
  const [selectedCard, setSelectedCard] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && f.type === "application/pdf") {
      setFile(f);
      setStatus("idle");
      setErrorMsg("");
    } else if (f) {
      setErrorMsg("Selecione um arquivo PDF válido.");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") {
      setFile(f);
      setStatus("idle");
      setErrorMsg("");
    }
  }

  async function handleUpload() {
    if (!file || !selectedCard) return;
    setStatus("loading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("card_id", selectedCard);

    try {
      const res = await fetch("/api/faturas/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMsg(data.error ?? "Erro ao processar fatura.");
        return;
      }

      setResult(data);
      setStatus("success");
      onSuccess();
    } catch {
      setStatus("error");
      setErrorMsg("Erro de conexão. Tente novamente.");
    }
  }

  function handleClose() {
    setFile(null);
    setSelectedCard("");
    setStatus("idle");
    setErrorMsg("");
    setResult(null);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
          {/* Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={handleClose} 
          />

          {/* Modal */}
          <motion.div 
            initial={{ opacity: 0, y: 100, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full h-[90%] sm:h-auto sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-white/[0.08] bg-surface p-5 sm:p-6 shadow-2xl overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Importar Fatura</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Envie o PDF da sua fatura para importar automaticamente
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {status === "success" && result ? (
              /* Tela de sucesso */
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-lg">Fatura importada!</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Banco: <span className="text-white">{result.bank}</span>
                  </p>
                  <p className="text-slate-400 text-sm">
                    {result.transactions_count} transações • R${" "}
                    {result.total_amount.toFixed(2).replace(".", ",")}
                  </p>
                  <p className="text-slate-400 text-sm">
                    Vencimento:{" "}
                    {new Date(result.due_date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </p>
                  
                  {result.cycle_adjusted && (
                    <div className="mt-4 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-left">
                      <p className="text-[11px] font-medium text-blue-400 uppercase tracking-wider mb-1">Calibragem Automática</p>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Detectamos que sua fatura fechou dia <span className="text-white font-bold">{result.new_closing_day}</span>. 
                        Ajustamos seu ciclo para maior precisão nos próximos meses.
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  className="w-full py-3 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                {/* Seleção de cartão */}
                <div className="mb-4">
                  <label htmlFor="upload_card" className="block text-xs font-medium text-slate-400 mb-1.5">Cartão</label>
                  <select
                    id="upload_card"
                    value={selectedCard}
                    onChange={(e) => setSelectedCard(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-sm text-white outline-none focus:border-blue-500/50 transition-colors min-h-[44px]"
                  >
                    <option value="">Selecione um cartão</option>
                    {cartoes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nickname} •••• {c.last_four}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Área de upload */}
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => inputRef.current?.click()}
                  className="relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-800 bg-surface/50 py-10 cursor-pointer hover:border-slate-700 hover:bg-surface transition-colors mb-4"
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <>
                      <FileText className="h-8 w-8 text-blue-400" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-white">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFile(null);
                        }}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remover
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-slate-600" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-400">
                          Clique ou arraste o PDF aqui
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Nubank, Inter, Bradescard, Carrefour
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Erro */}
                {(errorMsg || status === "error") && (
                  <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 mb-4">
                    <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-red-400 text-sm">{errorMsg}</p>
                  </div>
                )}

                {/* Botão */}
                <button
                  onClick={handleUpload}
                  disabled={!file || !selectedCard || status === "loading"}
                  className="w-full py-3 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {status === "loading" ? "Processando..." : "Enviar PDF"}
                </button>

                <p className="text-center text-xs text-slate-600 mt-3">
                  O PDF é processado localmente e não é armazenado
                </p>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}