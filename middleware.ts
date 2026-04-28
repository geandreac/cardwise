import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ROTAS } from "@/constants/rotas";

// Middleware executado em TODA requisição antes do rendering
// Responsabilidade: verificar sessão e proteger rotas do dashboard

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Verifica sessão — NÃO usar getSession() aqui (inseguro no middleware)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Rotas protegidas: qualquer /dashboard/*
  const isProtectedRoute = pathname.startsWith("/dashboard");

  // Rotas públicas: /auth e /api/auth/*
  const isAuthRoute =
    pathname.startsWith(ROTAS.AUTH) ||
    pathname.startsWith("/api/auth");

  // Usuário não autenticado tentando acessar rota protegida
  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ROTAS.AUTH;
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Usuário autenticado tentando acessar /auth → manda pro dashboard
  if (isAuthRoute && user && !pathname.startsWith("/api/auth")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = ROTAS.DASHBOARD;
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

// Aplica o middleware apenas nestas rotas (ignora _next, assets, favicon)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};