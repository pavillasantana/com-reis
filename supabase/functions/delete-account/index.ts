import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Marcar conta para exclusão (soft delete)
    const { error: updateError } = await supabaseAdmin
      .from("usuarios")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      return jsonResponse({ error: updateError.message }, 500);
    }

    // Cancelar assinaturas ativas
    await supabaseAdmin
      .from("assinaturas")
      .update({ status: "cancelled" })
      .eq("id_usuario", user.id)
      .eq("status", "active");

    return jsonResponse({
      success: true,
      message: "Conta marcada para exclusão. Faça login em até 60 dias para recuperar.",
    });

  } catch (err) {
    console.error("Erro:", err);
    return jsonResponse({ error: "Erro interno." }, 500);
  }
});
