"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Mail, Lock, User, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const registerSchema = z.object({
  full_name: z.string().min(2, "Nome muito curto"),
  email: z.string().email("Email inválido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Precisa de uma letra maiúscula")
    .regex(/[0-9]/, "Precisa de um número"),
  confirm_password: z.string(),
  terms: z.boolean().refine((v) => v === true, "Aceite os termos para continuar"),
}).refine((d) => d.password === d.confirm_password, {
  message: "As senhas não coincidem",
  path: ["confirm_password"],
});

type RegisterForm = z.infer<typeof registerSchema>;

interface RegisterFaceProps {
  onSwitchToLogin: () => void;
}

function calcStrength(password: string): number {
  let score = 0;
  if (password.length >= 8)          score++;
  if (/[A-Z]/.test(password))        score++;
  if (/[0-9]/.test(password))        score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const strengthColors = ["", "#ef4444", "#f59e0b", "#84cc16", "#22c55e"];
const strengthLabels = ["", "Fraca", "Razoável", "Boa", "Forte"];

export function RegisterFace({ onSwitchToLogin }: RegisterFaceProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState("");

  const router = useRouter();
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const strength = calcStrength(passwordValue);

  async function onSubmit(data: RegisterForm) {
    setIsLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.full_name } },
    });
    if (error) {
      // Mensagens amigáveis para erros conhecidos
      if (error.message === "User already registered") {
        setError("Este email já está cadastrado.");
      } else if (error.message.toLowerCase().includes("email") && error.message.toLowerCase().includes("rate")) {
        setError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
      } else if (error.message.toLowerCase().includes("signup") && error.message.toLowerCase().includes("disabled")) {
        setError("Cadastro temporariamente desabilitado. Contate o suporte.");
      } else {
        // Exibe o erro real do Supabase para diagnóstico
        setError(`Erro: ${error.message}`);
      }
      setIsLoading(false);
      return;
    }
    setIsSuccess(true);
    setIsLoading(false);
    
    // Redireciona após 1.5s para dar feedback visual
    setTimeout(() => {
      router.push("/dashboard");
    }, 1500);
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center text-center py-12">
        <div className="animate-bounce mb-6">
          <CheckCircle2 size={64} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Conta preparada!</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Tudo pronto. Redirecionando você para o painel...
        </p>
        <Loader2 className="animate-spin text-blue-500" size={24} />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Crie sua conta</h2>
      <p className="text-sm text-slate-500 mb-6">Comece a controlar suas finanças com IA</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome completo</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              {...register("full_name")}
              type="text"
              placeholder="Seu nome"
              autoComplete="name"
              className={cn(
                "w-full bg-[#111827] border rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all",
                errors.full_name ? "border-red-500/50" : "border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              )}
            />
          </div>
          {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              {...register("email")}
              type="email"
              placeholder="seu@email.com"
              autoComplete="email"
              className={cn(
                "w-full bg-[#111827] border rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all",
                errors.email ? "border-red-500/50" : "border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              )}
            />
          </div>
          {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
        </div>

        {/* Senha + Strength */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Mín. 8 caracteres"
              autoComplete="new-password"
              onChange={(e) => setPasswordValue(e.target.value)}
              className={cn(
                "w-full bg-[#111827] border rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder-slate-600 outline-none transition-all",
                errors.password ? "border-red-500/50" : "border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {/* Strength bars */}
          {passwordValue.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{ backgroundColor: i <= strength ? strengthColors[strength] : "#1e293b" }}
                  />
                ))}
              </div>
              <p className="text-xs mt-1" style={{ color: strengthColors[strength] || "#475569" }}>
                {passwordValue ? strengthLabels[strength] : ""}
              </p>
            </div>
          )}
          {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
        </div>

        {/* Confirmar senha */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmar senha</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            <input
              {...register("confirm_password")}
              type={showConfirm ? "text" : "password"}
              placeholder="Repita a senha"
              autoComplete="new-password"
              className={cn(
                "w-full bg-[#111827] border rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder-slate-600 outline-none transition-all",
                errors.confirm_password ? "border-red-500/50" : "border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
              aria-label={showConfirm ? "Ocultar senha" : "Mostrar senha"}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.confirm_password && <p className="text-red-400 text-xs mt-1">{errors.confirm_password.message}</p>}
        </div>

        {/* Termos LGPD */}
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            {...register("terms")}
            type="checkbox"
            className="w-4 h-4 mt-0.5 rounded border-slate-700 bg-[#111827] accent-blue-500"
          />
          <span className="text-xs text-slate-500 leading-relaxed">
            Concordo com os{" "}
            <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Termos de Uso</span>
            {" "}e{" "}
            <span className="text-blue-400 hover:text-blue-300 cursor-pointer">Política de Privacidade</span>
          </span>
        </label>
        {errors.terms && <p className="text-red-400 text-xs -mt-2">{errors.terms.message}</p>}

        {/* Erro geral */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-blue-500 hover:bg-blue-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {isLoading ? "Criando conta..." : "Criar conta grátis"}
        </button>
      </form>

      <p className="text-center text-xs text-slate-600 mt-6">
        Já tem conta?{" "}
        <button onClick={onSwitchToLogin} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Entre aqui
        </button>
      </p>
    </div>
  );
}