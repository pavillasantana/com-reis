import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "https://comreis.com",
    },
  });
}

Deno.serve(async (req) => {
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
    const { user_id, plano } = await req.json();

    if (!user_id || (plano !== "free" && plano !== "premium")) {
      return jsonResponse({ error: "user_id e plano (free|premium) são obrigatórios." }, 400);
    }

    // Admin client (service_role) — bypassa RLS
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
      return jsonResponse({ error: "Acesso negado." }, 403);
    }

    // Verificar se o usuário alvo existe
    const { data: targetUser } = await supabaseAdmin
      .from("usuarios")
      .select("id, email, plano")
      .eq("id", user_id)
      .single();

    if (!targetUser) {
      return jsonResponse({ error: "Usuário não encontrado." }, 404);
    }

    // Atualizar plano do usuário
    const { error: updateError } = await supabaseAdmin
      .from("usuarios")
      .update({ plano })
      .eq("id", user_id);

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500);
    }

    // Se premium: garantir assinatura ativa para o middleware do app não reverter
    if (plano === "premium") {
      const now = new Date();
      const dataFim = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data: existing } = await supabaseAdmin
        .from("assinaturas")
        .select("id, status")
        .eq("id_usuario", user_id)
        .eq("status", "active")
        .single();

      if (existing) {
        await supabaseAdmin
          .from("assinaturas")
          .update({ status: "active", data_fim: dataFim.toISOString() })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin
          .from("assinaturas")
          .insert({
            id_usuario: user_id,
            data_inicio: now.toISOString(),
            data_fim: dataFim.toISOString(),
            status: "active",
          });
      }
    } else {
      // Voltando para free: cancelar assinaturas ativas
      await supabaseAdmin
        .from("assinaturas")
        .update({ status: "cancelled" })
        .eq("id_usuario", user_id)
        .eq("status", "active");
    }

    return jsonResponse({
      success: true,
      message: `Plano de ${targetUser.email} alterado para ${plano}.`,
      plano,
    });

  } catch (err) {
    console.error("Erro:", err);
    return jsonResponse({ error: "Erro interno." }, 500);
  }
});
