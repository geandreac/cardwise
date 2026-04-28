import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CardWise — Controle real sobre seus cartões",
  description:
    "Gerencie todos os seus cartões de crédito, acompanhe faturas e antecipe gastos com inteligência artificial.",
  keywords: ["cartão de crédito", "finanças pessoais", "gestão financeira", "fatura"],
  authors: [{ name: "CardWise" }],
  robots: "noindex",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased min-h-dvh bg-[#020617] text-[#f8fafc]">
        {children}
      </body>
    </html>
  );
}