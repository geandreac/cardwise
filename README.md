# CardWise 💳

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-blue?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Supabase-DB-green?style=for-the-badge&logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/Framer_Motion-6.0+-purple?style=for-the-badge&logo=framer" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
</p>

> **CardWise** é o seu centro de comando financeiro inteligente. Mais do que um rastreador de gastos, é uma IA que compreende suas faturas, projeta seu futuro financeiro em 24 meses e garante que você nunca mais seja pego de surpresa pelo fechamento de um cartão.

🔗 **[Acesse o CardWise](https://cardwise-eight.vercel.app)**

---

## ✨ Funcionalidades "Premium"

### 🤖 Smart Invoice Parsing (IA)
Esqueça o preenchimento manual. Arraste o PDF da sua fatura e nossa IA extrai automaticamente:
- Banco e emissor
- Transações detalhadas
- Data de vencimento e fechamento
- **Auto-Calibragem:** Se o seu ciclo de fechamento mudar, o CardWise detecta e ajusta suas projeções futuras automaticamente.

### 📅 Smart Cycle Calendar
Visualize exatamente quando suas faturas fecham e vencem. O sistema calcula a **"Melhor Data de Compra"** em tempo real, baseando-se no comportamento histórico do seu cartão.

### 📈 Projeções Rolling de 24 Meses
Diferente de apps comuns, o CardWise projeta suas parcelas e gastos recorrentes em uma janela móvel de 2 anos, permitindo um planejamento de longo prazo real.

### ⚡ UX/UI de Alta Fidelidade
- **Micro-interações:** Transições suaves alimentadas por `framer-motion`.
- **Design System Customizado:** Tokens de design centralizados para uma experiência visual consistente e "fintech-grade".
- **Mobile First:** Totalmente responsivo, com navegação tátil otimizada para smartphones.

---

## 🛠️ Stack Tecnológica

### Frontend & UI
- **Next.js 14 (App Router):** SSR, Streaming e Server Actions para performance máxima.
- **Tailwind CSS:** Estilização baseada em tokens utilitários.
- **Framer Motion:** Animações de estado e transições de página fluidas.
- **Lucide React:** Iconografia moderna e leve.
- **SWR:** Cache inteligente e Revalidação Optimistic UI.

### Backend & Segurança
- **Supabase:** Autenticação, Banco de Dados (PostgreSQL) e Real-time.
- **RLS (Row Level Security):** Segurança a nível de banco de dados — seus dados são estritamente seus.
- **Zod & React Hook Form:** Validação rigorosa de esquemas em tempo de execução.
- **Zero Profile Storage:** Política estrita de privacidade (não armazenamos imagens ou metadados desnecessários).

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+
- Instância do Supabase ativa

### Passo a Passo
1. **Clone e Instale:**
   ```bash
   git clone https://github.com/seu-usuario/cardwise.git
   cd cardwise
   npm install
   ```

2. **Variáveis de Ambiente:**
   Crie um `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
   ```

3. **Inicie o Dev Server:**
   ```bash
   npm run dev
   ```

---

## 🔒 Segurança e Privacidade

- **Isolamento de Dados:** Cada conta possui uma chave única criptografada no banco.
- **Sessões Seguras:** Auth via JWT e HTTP-Only cookies.
- **Data Export:** Cumprimento da LGPD — exporte todos os seus dados em JSON a qualquer momento.
- **Danger Zone:** Exclusão de conta irreversível e imediata.

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

---

<p align="center">
  Desenvolvido com ❤️ por <strong>Geandrea</strong>
</p>