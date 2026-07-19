import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "https://comreis.com",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { email, password, nome } = await req.json();

    if (!email || !password) {
      return jsonResponse({ error: "Email e senha são obrigatórios." }, 400);
    }
    if (password.length < 8) {
      return jsonResponse({ error: "A senha deve ter no mínimo 8 caracteres." }, 400);
    }

    // Client com service_role (admin)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar se o chamador é admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Não autorizado." }, 401);
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Sessão inválida." }, 401);
    }

    const { data: perfil, error: perfilError } = await supabaseAdmin
      .from("usuarios")
      .select("role")
      .eq("id", user.id)
      .single();

    // Fail-closed: qualquer erro ou role != admin = negar acesso
    if (perfilError || !perfil || perfil.role !== "admin") {
      return jsonResponse({ error: "Acesso negado. Somente administradores podem criar usuários." }, 403);
    }

    // Criar usuário no auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome_completo: nome || "" },
    });

    if (createError) {
      return jsonResponse({ error: createError.message }, 400);
    }

    // Inserir na tabela usuarios
    const { error: insertError } = await supabaseAdmin
      .from("usuarios")
      .upsert({
        id: newUser.user.id,
        email,
        nome_completo: nome || null,
        plano: "free",
        moeda_base: "BRL",
        status: "ativo",
      }, { onConflict: "id" });

    if (insertError) {
      console.warn("Aviso: falha ao inserir na tabela usuarios:", insertError.message);
    }

    return jsonResponse({
      success: true,
      user: { id: newUser.user.id, email: newUser.user.email },
    });

  } catch (err) {
    console.error("Erro inesperado:", err);
    return jsonResponse({ error: "Erro interno do servidor." }, 500);
  }
});
