import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://comreis.com",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "https://comreis.com",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Não autorizado." }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Sessão inválida." }, 401);

    // Verificar admin — fail-closed: qualquer erro = negar acesso
    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from("usuarios").select("role").eq("id", user.id).single();

    if (perfilError || !perfil || perfil.role !== "admin") {
      return jsonResponse({ error: "Acesso negado." }, 403);
    }

    // Listar todos os usuários via service_role (bypassa RLS)
    const { data: usuarios, error: listError } = await supabaseAdmin
      .from("usuarios")
      .select("id, email, nome_completo, plano, moeda_base, status, data_criacao")
      .order("data_criacao", { ascending: false });

    if (listError) return jsonResponse({ error: listError.message }, 500);

    return jsonResponse({ users: usuarios || [] });

  } catch (err) {
    console.error("Erro:", err);
    return jsonResponse({ error: "Erro interno." }, 500);
  }
});
