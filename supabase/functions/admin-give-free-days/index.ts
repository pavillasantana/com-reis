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
    const { user_id, days } = await req.json();

    if (!user_id || !days || days <= 0) {
      return jsonResponse({ error: "user_id e days são obrigatórios." }, 400);
    }

    // Admin client (service_role)
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

    const now = new Date();
    const dataFim = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Buscar assinatura ativa existente
    const { data: existing } = await supabaseAdmin
      .from("assinaturas")
      .select("id, data_fim, status")
      .eq("id_usuario", user_id)
      .eq("status", "active")
      .single();

    if (existing) {
      // Se já tem assinatura ativa, estender a data_fim a partir da MAIOR entre hoje e data_fim atual
      const baseDate = new Date(existing.data_fim) > now ? new Date(existing.data_fim) : now;
      const newFim = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);

      await supabaseAdmin
        .from("assinaturas")
        .update({ data_fim: newFim.toISOString() })
        .eq("id", existing.id);
    } else {
      // Criar nova assinatura ativa
      await supabaseAdmin
        .from("assinaturas")
        .insert({
          id_usuario: user_id,
          data_inicio: now.toISOString(),
          data_fim: dataFim.toISOString(),
          status: "active",
        });
    }

    // Atualizar plano do usuário para premium
    await supabaseAdmin
      .from("usuarios")
      .update({ plano: "premium" })
      .eq("id", user_id);

    return jsonResponse({
      success: true,
      message: `${days} dias grátis concedidos para ${targetUser.email}.`,
      data_fim: existing
        ? (() => {
            const base = new Date(existing.data_fim) > now ? new Date(existing.data_fim) : now;
            return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
          })()
        : dataFim.toISOString(),
    });

  } catch (err) {
    console.error("Erro:", err);
    return jsonResponse({ error: "Erro interno." }, 500);
  }
});
