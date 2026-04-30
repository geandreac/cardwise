"use client";

import { useState } from "react";
import { LoginFace } from "./LoginFace";
import { RegisterFace } from "./RegisterFace";

export function AuthCard() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="w-full max-w-sm">
      {/* Toggle deslizante */}
      <div className="flex mb-8 bg-[#111827] rounded-xl p-1 relative">
        <div
          className="absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] bg-[#1e293b] rounded-lg transition-transform duration-300 ease-out"
          style={{ transform: mode === "register" ? "translateX(100%)" : "translateX(0)" }}
        />
        <button
          onClick={() => setMode("login")}
          className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-300 ${
            mode === "login" ? "text-white" : "text-slate-500"
          }`}
        >
          Entrar
        </button>
        <button
          onClick={() => setMode("register")}
          className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-300 ${
            mode === "register" ? "text-white" : "text-slate-500"
          }`}
        >
          Criar conta
        </button>
      </div>

      {/* Formulários com fade */}
      <div className="relative">
        <div className={mode === "login" ? "block animate-fadeIn" : "hidden"}>
          <LoginFace onSwitchToRegister={() => setMode("register")} />
        </div>
        <div className={mode === "register" ? "block animate-fadeIn" : "hidden"}>
          <RegisterFace onSwitchToLogin={() => setMode("login")} />
        </div>
      </div>
    </div>
  );
}