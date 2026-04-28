import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase para uso em Client Components e hooks
// Nunca usar no servidor — usar supabaseServer.ts para isso

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Instância singleton para uso direto nos hooks
export const supabase = createClient();