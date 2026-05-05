"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import Link from "next/link";

const resetSchema = z.object({
  email: z.string().email("Email inválido"),
});

type ResetForm = z.infer<typeof resetSchema>;

export default function EsqueciSenhaPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  async function onSubmit(data: ResetForm) {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      data.email,
      {
        redirectTo: `${window.location.origin}/auth/update-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  }

  return (
    <main className="min-h-dvh bg-[#0a0e1a] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/auth" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Voltar para login
        </Link>

        {success ? (
          <div className="bg-[#111827] rounded-2xl p-6 border border-white/[0.06] text-center shadow-xl">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Email enviado!</h2>
            <p className="text-sm text-slate-400 mb-6">
              Enviamos um link de recuperação para o seu email. Por favor, verifique sua caixa de entrada (e a pasta de spam).
            </p>
            <Link
              href="/auth"
              className="block w-full py-3 rounded-xl bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
            >
              Voltar ao início
            </Link>
          </div>
        ) : (
          <div className="bg-[#111827] rounded-2xl p-6 border border-white/[0.06] shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-1">Esqueceu a senha?</h2>
            <p className="text-sm text-slate-500 mb-6">
              Digite seu email para receber um link de redefinição de senha.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    className={cn(
                      "w-full bg-[#0a0e1a] border rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all",
                      errors.email
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                    )}
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-blue-500 hover:bg-blue-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isLoading && <Loader2 size={16} className="animate-spin" />}
                {isLoading ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
