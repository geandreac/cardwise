import { redirect } from "next/navigation";
import { ROTAS } from "@/constants/rotas";

// Rota raiz — redireciona para /auth
// O middleware cuida do redirect para /dashboard se já estiver logado
export default function Home() {
  redirect(ROTAS.AUTH);
}
