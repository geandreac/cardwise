# CardWise 💳

> Controle financeiro com inteligência. IA que lê suas faturas, projeta seus gastos e coloca você no controle dos seus cartões.

🔗 **[cardwise-eight.vercel.app](https://cardwise-eight.vercel.app)**

***

## Sobre o Projeto

CardWise é uma aplicação web de gestão financeira pessoal com foco em cartões de crédito. O usuário pode acompanhar gastos, visualizar projeções e obter insights gerados por IA a partir das suas faturas.

***

## Stack

| Camada | Tecnologia |
|--------|------------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS |
| Backend / Auth / DB | [Supabase](https://supabase.com/) |
| Validação de formulários | React Hook Form + Zod |
| Ícones | Lucide React |
| Deploy | [Vercel](https://vercel.com/) |

***

## Funcionalidades

- 🔐 Autenticação com email/senha e login social via **Google OAuth**
- 📊 Dashboard personalizado por usuário com dados isolados via **Row Level Security (RLS)**
- 🤖 IA integrada para leitura e análise de faturas
- 📈 Projeção de gastos e visão consolidada dos cartões
- 🌙 Interface dark mode

***

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com/)
- Conta no [Vercel](https://vercel.com/) (para deploy)

***

## Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/cardwise.git
cd cardwise

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
```

***

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com as seguintes variáveis:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

> ⚠️ **Nunca exponha a `SUPABASE_SERVICE_ROLE_KEY` no cliente.** Ela bypassa todas as políticas de RLS.

***

## Rodando localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

***

## Deploy

### Via Vercel CLI

```bash
npm install -g vercel
vercel --prod
```

### Via Git (recomendado)

Com o repositório conectado ao GitHub no painel da Vercel, o deploy acontece automaticamente a cada `git push` na branch principal.

```bash
git add .
git commit -m "sua mensagem"
git push
```

Lembre de configurar as variáveis de ambiente também no painel da Vercel em **Settings → Environment Variables**.

***

## Autenticação com Google OAuth

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com/)
2. Gere um **OAuth 2.0 Client ID** do tipo *Aplicativo da Web*
3. Adicione em **URIs de redirecionamento autorizados**:
   ```
   https://<seu-projeto>.supabase.co/auth/v1/callback
   ```
4. Cole o **Client ID** e **Client Secret** no Supabase em **Authentication → Providers → Google**
5. Configure o **Site URL** no Supabase para o domínio de produção

***

## Estrutura de Pastas

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── callback/
│   │           └── route.ts       # Handler OAuth callback
│   ├── dashboard/                 # Página principal autenticada
│   └── auth/                      # Página de login/registro
├── components/
│   └── dashboard/
│       ├── topbar.tsx             # Header com saudação e avatar
│       ├── logout-button.tsx      # Botão de logout
│       └── ...
├── constants/
│   └── rotas.ts                   # Centraliza todas as rotas da app
├── lib/
│   ├── supabase.ts                # Cliente Supabase (browser)
│   └── supabaseServer.ts          # Cliente Supabase (server)
```

***

## Segurança

- Dados de cada usuário isolados via **Row Level Security (RLS)** no Supabase
- Variáveis sensíveis (`SERVICE_ROLE_KEY`) nunca expostas ao cliente
- Callback OAuth com suporte ao header `x-forwarded-host` para funcionamento correto no Vercel

***

## Licença

MIT © 2026 CardWise