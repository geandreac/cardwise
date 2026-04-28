import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";
import { ROTAS } from "@/constants/rotas";

// Callback OAuth do Supabase (Google, Magic Link)
// O Supabase redireciona para esta rota após autenticação externa

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? ROTAS.DASHBOARD;

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Falha na autenticação — redireciona para auth com erro
  return NextResponse.redirect(`${origin}${ROTAS.AUTH}?error=auth_callback_failed`);
}