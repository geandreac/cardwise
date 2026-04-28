import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente Supabase para uso em Server Components e Route Handlers
// Lê cookies do request para manter a sessão do usuário

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component — cookies só podem ser escritos em Route Handlers
            // Ignorar silenciosamente quando chamado de Server Component
          }
        },
      },
    }
  );
}