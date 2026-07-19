import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const MERCADOPAGO_API = "https://api.mercadopago.com";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: "Configuração incompleta no servidor." }, 500);
  }

  // Extrair identidade do chamador via JWT (NÃO do body)
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Não autorizado." }, 401);
  }

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Sessão inválida." }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Payload inválido." }, 400);
  }

  const targetUserId = payload.userId as string;
  if (!targetUserId) {
    return jsonResponse({ error: "userId é obrigatório." }, 400);
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Verificar se o chamador é admin — fail-closed
  const { data: caller, error: callerError } = await supabaseAdmin
    .from("usuarios")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerError || !caller || caller.role !== "admin") {
    return jsonResponse({ error: "Acesso negado." }, 403);
  }

  // Buscar assinatura ativa do usuário alvo
  const { data: assinatura, error: assinaturaError } = await supabaseAdmin
    .from("assinaturas")
    .select("id, id_preapproval_mp, status")
    .eq("id_usuario", targetUserId)
    .eq("status", "active")
    .single();

  if (assinaturaError || !assinatura) {
    return jsonResponse({ error: "Nenhuma assinatura ativa encontrada." }, 404);
  }

  // Cancelar preaprovação no MP (se existir)
  if (assinatura.id_preapproval_mp) {
    try {
      const mpResp = await fetch(
        `${MERCADOPAGO_API}/preapproval/${assinatura.id_preapproval_mp}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "cancelled" }),
        }
      );

      if (!mpResp.ok) {
        const errText = await mpResp.text();
        console.error(`[AdminCancel] Erro ao cancelar preaprovação MP: ${errText}`);
      } else {
        console.log(`[AdminCancel] Preaprovação MP ${assinatura.id_preapproval_mp} cancelada.`);
      }
    } catch (err) {
      console.error(`[AdminCancel] Falha de rede ao cancelar MP:`, err);
    }
  }

  // Cancelar assinatura no banco
  const { error: cancelError } = await supabaseAdmin.rpc("cancelar_assinatura", {
    uid: targetUserId,
  });

  if (cancelError) {
    console.error(`[AdminCancel] Erro ao cancelar assinatura no BD:`, cancelError);
    return jsonResponse({ error: "Erro ao cancelar assinatura." }, 500);
  }

  console.log(`[AdminCancel] ✅ Assinatura cancelada para ${targetUserId} por admin ${user.id}`);
  return jsonResponse({ ok: true, userId: targetUserId, status: "cancelled" });
});
