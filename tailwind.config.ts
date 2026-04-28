import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base:     "#020617",
        surface:  "#0f172a",
        elevated: "#1e293b",
        primary: {
          DEFAULT: "#3b82f6",
          hover:   "#2563eb",
        },
        category: {
          alimentacao: "#8b5cf6",
          transporte:  "#3b82f6",
          assinaturas: "#06b6d4",
          saude:       "#f59e0b",
          lazer:       "#f87171",
          outros:      "#64748b",
        },
      },
      borderRadius: {
        sm:   "6px",
        md:   "8px",
        lg:   "12px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        shimmer:   "shimmer 1.5s infinite linear",
        shake:     "shake 300ms ease",
        checkmark: "checkmark-pop 400ms ease forwards",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%":      { transform: "translateX(-4px)" },
          "40%":      { transform: "translateX(4px)" },
          "60%":      { transform: "translateX(-4px)" },
          "80%":      { transform: "translateX(4px)" },
        },
        "checkmark-pop": {
          "0%":   { transform: "scale(0)", opacity: "0" },
          "60%":  { transform: "scale(1.2)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;