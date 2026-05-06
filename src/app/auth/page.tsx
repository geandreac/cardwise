import { AuthCard } from "@/components/auth/AuthCard";

export default function AuthPage() {
  return (
    <main className="min-h-dvh bg-[#0a0e1a] flex overflow-auto">

      {/* ── Painel Esquerdo — Branding (apenas desktop) ── */}
      <div
        className="hidden lg:flex lg:w-[48%] relative overflow-hidden flex-col justify-between p-10"
        style={{ background: "linear-gradient(160deg, #0f1829 0%, #0d2137 40%, #0a2a3a 100%)" }}
      >
        {/* Grid pattern sutil */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Glow acento */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)" }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="14" rx="3" stroke="white" strokeWidth="2"/>
                <path d="M2 10h20" stroke="white" strokeWidth="2"/>
                <circle cx="7" cy="15" r="1.5" fill="white"/>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">CardWise</span>
          </div>
        </div>

        {/* Conteúdo central */}
        <div className="relative z-10 flex-1 flex flex-col justify-center -mt-10">
          <p
            className="text-4xl font-bold leading-tight mb-4"
            style={{
              background: "linear-gradient(135deg, #fff 30%, #3b82f6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Controle financeiro<br />com inteligência.
          </p>
          <p className="text-base text-slate-400 max-w-sm leading-relaxed">
            IA que lê suas faturas, projeta seus gastos e coloca você no controle dos seus cartões.
          </p>

          {/* Cartão flutuante animado */}
          <div className="mt-10" style={{ animation: "cardFloat 6s ease-in-out infinite" }}>
            <div
              className="w-64 h-40 rounded-2xl p-5 flex flex-col justify-between"
              style={{
                background: "linear-gradient(135deg, #1a2940, #0f2a4a)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <div className="flex justify-between items-start">
                <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-300 to-yellow-500 opacity-80" />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue-400 opacity-60 rotate-90">
                  <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-mono tracking-[0.2em] text-slate-400">
                  •••• •••• •••• 4821
                </div>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-xs text-slate-500">CARDWISE USER</span>
                  <span className="text-xs text-slate-500">12/28</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats pulsantes */}
          <div className="flex gap-6 mt-8">
            {[
              { label: "IA ativa 24/7", delay: "0s" },
              { label: "256-bit encryption", delay: "0.7s" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full bg-blue-400"
                  style={{ animation: `pulseDot 2s ease-in-out infinite`, animationDelay: stat.delay }}
                />
                <span className="text-xs text-slate-500">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-600">
          © 2026 CardWise. Todos os direitos reservados.
        </div>
      </div>

      {/* ── Painel Direito — Formulário ── */}
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center p-6 sm:p-10 relative overflow-y-auto">
        {/* Logo mobile */}
        <div className="lg:hidden w-full max-w-sm mb-12 flex items-center gap-3 pt-4">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="3" stroke="white" strokeWidth="2"/>
              <path d="M2 10h20" stroke="white" strokeWidth="2"/>
              <circle cx="7" cy="15" r="1.5" fill="white"/>
            </svg>
          </div>
          <span className="text-xl font-bold text-white tracking-tight">CardWise</span>
        </div>

        <AuthCard />
      </div>

      {/* Animações globais desta página */}
      <style>{`
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50%       { transform: translateY(-12px) rotate(0deg); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.3); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease forwards; }
      `}</style>
    </main>
  );
}