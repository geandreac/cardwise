import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// cn() — combina classes Tailwind sem conflitos
// Uso: cn("base-class", condicao && "conditional-class", props.className)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formata valor monetário em BRL
// Uso: formatMoeda(1234.56) → "R$ 1.234,56"
export function formatMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

// Extrai números de string BRL para float
// Uso: parseCurrencyInput("R$ 1.234,56") → 1234.56
export function parseCurrencyInput(value: string): number {
  const numericValue = value.replace(/\D/g, "");
  return Number(numericValue) / 100;
}

// Formata data ISO para pt-BR
// Uso: formatData("2024-04-01") → "01/04/2024"
export function formatData(data: string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(data));
}

// Formata data por extenso
// Uso: formatDataExtenso("2024-04-01") → "1 de abril de 2024"
export function formatDataExtenso(data: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(data));
}

// Retorna mês/ano abreviado
// Uso: formatMesAno("2024-04-01") → "abr/2024"
export function formatMesAno(data: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "numeric",
  }).format(new Date(data));
}

// Calcula porcentagem de uso do limite
// Uso: calcPorcentagemUso(800, 1000) → 80
export function calcPorcentagemUso(gasto: number, limite: number): number {
  if (limite === 0) return 0;
  return Math.min(Math.round((gasto / limite) * 100), 100);
}

// Retorna cor do badge baseado no % de uso (RN04)
export function corPorcentagem(pct: number): "green" | "yellow" | "red" {
  if (pct < 60)  return "green";
  if (pct < 85)  return "yellow";
  return "red";
}

// Trunca texto longo com reticências
// Uso: truncate("Nome muito longo", 20) → "Nome muito longo..."
export function truncate(texto: string, limite: number): string {
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite) + "...";
}

// Debounce — evita chamadas excessivas em buscas
// Uso: const buscar = debounce(fetchResultados, 300)
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}