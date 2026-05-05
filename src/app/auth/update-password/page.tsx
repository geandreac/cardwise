"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ROTAS } from "@/constants/rotas";

const updateSchema = z.object({
  password: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type UpdateForm = z.infer<typeof updateSchema>;

export default function UpdatePasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
  });

  async function onSubmit(data: UpdateForm) {
    setIsLoading(true);
    setError(null);
    
    // Supabase auth update
    const { error: updateError } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (updateError) {
      setError(updateError.message);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  }

  return (
    <main className="min-h-dvh bg-[#0a0e1a] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {success ? (
          <div className="bg-[#111827] rounded-2xl p-6 border border-white/[0.06] text-center shadow-xl">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Senha atualizada!</h2>
            <p className="text-sm text-slate-400 mb-6">
              Sua senha foi redefinida com sucesso. Você já pode acessar sua conta.
            </p>
            <Link
              href={ROTAS.DASHBOARD}
              className="block w-full py-3 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Ir para o Dashboard
            </Link>
          </div>
        ) : (
          <div className="bg-[#111827] rounded-2xl p-6 border border-white/[0.06] shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-1">Nova senha</h2>
            <p className="text-sm text-slate-500 mb-6">
              Digite a sua nova senha abaixo.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={cn(
                      "w-full bg-[#0a0e1a] border rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder-slate-600 outline-none transition-all",
                      errors.password
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmar nova senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    {...register("confirmPassword")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className={cn(
                      "w-full bg-[#0a0e1a] border rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder-slate-600 outline-none transition-all",
                      errors.confirmPassword
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
                    )}
                  />
                </div>
                {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>}
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
                {isLoading ? "Salvando..." : "Atualizar senha"}
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
