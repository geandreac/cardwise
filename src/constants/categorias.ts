// Categorias padrão do CardWise
// Consistente em TODAS as telas — nunca alterar cores aqui sem atualizar globals.css

export interface CategoriaConfig {
  id: string;        // chave fixa para seed do banco
  name: string;
  emoji: string;
  color: string;     // hex — deve coincidir com var(--color-cat-*)
  is_default: boolean;
}

export const CATEGORIAS_PADRAO: CategoriaConfig[] = [
  {
    id: "alimentacao",
    name: "Alimentação",
    emoji: "🍔",
    color: "#8b5cf6",
    is_default: true,
  },
  {
    id: "transporte",
    name: "Transporte",
    emoji: "🚗",
    color: "#3b82f6",
    is_default: true,
  },
  {
    id: "assinaturas",
    name: "Assinaturas",
    emoji: "📱",
    color: "#06b6d4",
    is_default: true,
  },
  {
    id: "saude",
    name: "Saúde",
    emoji: "💊",
    color: "#f59e0b",
    is_default: true,
  },
  {
    id: "lazer",
    name: "Lazer",
    emoji: "🎮",
    color: "#f87171",
    is_default: true,
  },
  {
    id: "outros",
    name: "Outros",
    emoji: "📦",
    color: "#64748b",
    is_default: true,
  },
];

// Map para lookup rápido por id
export const CATEGORIA_MAP = Object.fromEntries(
  CATEGORIAS_PADRAO.map((c) => [c.id, c])
) as Record<string, CategoriaConfig>;