import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const MERCADOPAGO_API = "https://api.mercadopago.com";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Configuração incompleta no servidor." }, 500);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Payload inválido." }, 400);
  }

  const userId = payload.userId as string;
  const billingType = (payload.billingType as string) || 'monthly';
  const amount = Number(payload.amount ?? 9.90);
  const payerEmail = payload.payerEmail ? String(payload.payerEmail) : undefined;

  if (!userId) {
    return jsonResponse({ error: "userId é obrigatório." }, 400);
  }

  const isAnnual = billingType === 'annual';
  const description = isAnnual
    ? `Com Réis Premium - Assinatura Anual (R$ ${amount.toFixed(2)}/ano)`
    : `Com Réis Premium - Assinatura Mensal (R$ ${amount.toFixed(2)}/mês)`;
  const frequency = isAnnual ? 12 : 1;
  const frequencyType = isAnnual ? 'months' : 'months';
  const subscriptionDays = isAnnual ? 365 : 30;

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Buscar email do usuário se não fornecido
  let email = payerEmail;
  if (!email) {
    const { data: user } = await supabaseAdmin
      .from("usuarios")
      .select("email")
      .eq("id", userId)
      .single();
    email = user?.email;
  }

  // Criar preaprovação recorrente no Mercado Pago
  const preapprovalPayload: Record<string, unknown> = {
    reason: description,
    auto_recurring: {
      frequency,
      frequency_type: frequencyType,
      transaction_amount: amount,
      currency_id: "BRL",
    },
    payer_email: email,
    external_reference: userId,
    back_url: "https://comreis.com/assinatura",
  };

  try {
    const mpResp = await fetch(`${MERCADOPAGO_API}/preapproval`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preapprovalPayload),
    });

    if (!mpResp.ok) {
      const errText = await mpResp.text();
      console.error("[CreateSubscription] Erro MP:", errText);
      return jsonResponse({ error: "Erro ao criar assinatura recorrente.", details: errText }, 502);
    }

    const data = await mpResp.json();
    const preapprovalId = data.id;
    const initPoint = data.init_point;

    // Criar assinatura no banco com dados de recorrência
    const { error: rpcError } = await supabaseAdmin.rpc("criar_assinatura", {
      uid: userId,
      p_valor: amount,
      p_dias: subscriptionDays,
      p_preapproval_id: String(preapprovalId),
    });

    if (rpcError) {
      console.error("[CreateSubscription] Erro ao criar assinatura no BD:", rpcError);
      return jsonResponse({ error: "Erro ao registrar assinatura." }, 500);
    }

    console.log(`[CreateSubscription] ✅ Assinatura recorrente criada: preapproval=${preapprovalId}, user=${userId}`);

    return jsonResponse({
      ok: true,
      preapprovalId: String(preapprovalId),
      initPoint,
      amount,
    });
  } catch (err) {
    console.error("[CreateSubscription] Falha de rede:", err);
    return jsonResponse({ error: "Falha de rede ao acessar Mercado Pago." }, 502);
  }
});
