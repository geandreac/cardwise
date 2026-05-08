"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoginFace } from "./LoginFace";
import { RegisterFace } from "./RegisterFace";

export function AuthCard() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="w-full max-w-sm">
      {/* Toggle deslizante */}
      <div className="flex mb-8 bg-surface rounded-xl p-1 relative border border-white/[0.05]">
        <motion.div
          layoutId="auth-toggle"
          className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-elevated rounded-lg shadow-lg border border-white/[0.05]"
          initial={false}
          animate={{ x: mode === "register" ? "100%" : "0%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
        <button
          onClick={() => setMode("login")}
          className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-300 ${
            mode === "login" ? "text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Entrar
        </button>
        <button
          onClick={() => setMode("register")}
          className={`relative z-10 flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors duration-300 ${
            mode === "register" ? "text-white" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Criar conta
        </button>
      </div>

      {/* Formulários com fade */}
      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {mode === "login" ? (
              <LoginFace onSwitchToRegister={() => setMode("register")} />
            ) : (
              <RegisterFace onSwitchToLogin={() => setMode("login")} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}