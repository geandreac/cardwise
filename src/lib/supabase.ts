import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias. " +
    "Verifique se o arquivo .env.local existe e contém essas variáveis."
  );
}

// Cliente Supabase para uso em Client Components e hooks
// Nunca usar no servidor — usar supabaseServer.ts para isso
//
// Precisa ser createBrowserClient (@supabase/ssr), não createClient (@supabase/supabase-js):
// só ele grava a sessão em cookie, que é o que o middleware e os Server Components leem.
// Com createClient a sessão fica em localStorage e o servidor nunca enxerga o login.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
