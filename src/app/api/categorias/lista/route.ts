import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  // Busca o profile_id do usuário
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!profile) return NextResponse.json([], { status: 404 });

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, emoji")
    .eq("profile_id", profile.id)
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data ?? []);
}