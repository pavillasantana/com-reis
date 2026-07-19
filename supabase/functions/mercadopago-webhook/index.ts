import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const MERCADOPAGO_API = "https://api.mercadopago.com";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function validarAssinatura(
  req: Request,
  rawBody: string,
  secret: string
): Promise<boolean> {
  try {
    const xSignature = req.headers.get("x-signature") || "";
    const xRequestId = req.headers.get("x-request-id") || "";
    const url = new URL(req.url);
    const dataId = url.searchParams.get("data.id") || "";

    const template = `id:${dataId};request-id:${xRequestId};ts:${xSignature.split(",").find((s) => s.startsWith("ts="))?.replace("ts=", "") || ""}`;

    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      keyMaterial,
      new TextEncoder().encode(template)
    );

    const expectedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const receivedHex =
      xSignature.split(",").find((s) => s.startsWith("v1="))?.replace("v1=", "") || "";

    return expectedHex === receivedHex;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
  const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!MP_ACCESS_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[Webhook] Variáveis de ambiente ausentes.");
    return jsonResponse({ error: "Configuração incompleta no servidor." }, 500);
  }

  // MP_WEBHOOK_SECRET é obrigatório — sem ele, rejeitar qualquer requisição
  if (!MP_WEBHOOK_SECRET) {
    console.error("[Webhook] MP_WEBHOOK_SECRET não configurado — requisição rejeitada.");
    return jsonResponse({ error: "Webhook não configurado." }, 500);
  }

  const rawBody = await req.text();
  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Payload inválido." }, 400);
  }

  // Validar assinatura HMAC — obrigatório
  const valid = await validarAssinatura(req, rawBody, MP_WEBHOOK_SECRET);
  if (!valid) {
    console.warn("[Webhook] Assinatura HMAC inválida – requisição rejeitada.");
    return jsonResponse({ error: "Assinatura inválida." }, 401);
  }

  const tipo = payload.type as string;
  const acao = payload.action as string;
  const dataId = (payload.data as Record<string, unknown>)?.id;

  console.log(`[Webhook] Evento recebido: type=${tipo}, action=${acao}, data.id=${dataId}`);

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ─── Handler: Pagamento aprovado (recorrência ou único) ───────────────
  if (tipo === "payment") {
    const pagamentoId = dataId;
    if (!pagamentoId) {
      return jsonResponse({ error: "ID do pagamento ausente." }, 400);
    }

    let pagamento: Record<string, unknown>;
    try {
      const mpResp = await fetch(`${MERCADOPAGO_API}/v1/payments/${pagamentoId}`, {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!mpResp.ok) {
        const errText = await mpResp.text();
        console.error(`[Webhook] Erro ao buscar pagamento ${pagamentoId}: ${errText}`);
        return jsonResponse({ error: "Erro ao consultar MP." }, 502);
      }

      pagamento = await mpResp.json();
    } catch (err) {
      console.error("[Webhook] Falha de rede ao chamar MP:", err);
      return jsonResponse({ error: "Falha de rede." }, 502);
    }

    const status = pagamento.status as string;
    const externalReference = pagamento.external_reference as string | undefined;
    const preapprovalId = pagamento.preapproval_id as string | undefined;

    console.log(`[Webhook] Pagamento ${pagamentoId} – status: ${status} – ref: ${externalReference} – preapproval: ${preapprovalId}`);

    if (status !== "approved") {
      return jsonResponse({ ok: true, status, message: "Pagamento não aprovado – ignorado." });
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!externalReference || !UUID_REGEX.test(externalReference)) {
      console.error(`[Webhook] external_reference inválido: "${externalReference}"`);
      return jsonResponse({ error: "external_reference inválido." }, 400);
    }

    // Pagamento recorrente (tem preapproval_id) → estender assinatura
    if (preapprovalId) {
      console.log(`[Webhook] Pagamento recorrente – estendendo assinatura de ${externalReference}`);
      const { error } = await supabaseAdmin.rpc("estender_assinatura", {
        uid: externalReference,
        p_dias: 30,
      });

      if (error) {
        console.error(`[Webhook] Erro ao estender assinatura:`, error);
        return jsonResponse({ error: "Erro ao estender assinatura." }, 500);
      }

      console.log(`[Webhook] ✅ Assinatura estendida para ${externalReference} (+30 dias)`);
      return jsonResponse({ ok: true, userId: externalReference, status: "extended" });
    }

    // Pagamento único → criar nova assinatura de 30 dias
    console.log(`[Webhook] Pagamento único – criando assinatura para ${externalReference}`);
    const { error: rpcError } = await supabaseAdmin.rpc("criar_assinatura", {
      uid: externalReference,
    });

    if (rpcError) {
      console.error(`[Webhook] Erro ao criar assinatura para ${externalReference}:`, rpcError);
      return jsonResponse({ error: "Erro ao criar assinatura." }, 500);
    }

    console.log(`[Webhook] ✅ Assinatura criada para ${externalReference} (30 dias)`);
    return jsonResponse({ ok: true, userId: externalReference, status: "premium" });
  }

  // ─── Handler: Preaprovação (assinatura recorrente criada/cancelada) ───
  if (tipo === "preapproval") {
    const preapprovalId = dataId;
    if (!preapprovalId) {
      return jsonResponse({ error: "ID da preaprovação ausente." }, 400);
    }

    let preapproval: Record<string, unknown>;
    try {
      const mpResp = await fetch(`${MERCADOPAGO_API}/preapproval/${preapprovalId}`, {
        headers: {
          Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!mpResp.ok) {
        const errText = await mpResp.text();
        console.error(`[Webhook] Erro ao buscar preaprovação ${preapprovalId}: ${errText}`);
        return jsonResponse({ error: "Erro ao consultar preaprovação." }, 502);
      }

      preapproval = await mpResp.json();
    } catch (err) {
      console.error("[Webhook] Falha de rede ao buscar preaprovação:", err);
      return jsonResponse({ error: "Falha de rede." }, 502);
    }

    const mpStatus = preapproval.status as string;
    const externalReference = preapproval.external_reference as string | undefined;

    console.log(`[Webhook] Preaprovação ${preapprovalId} – status: ${mpStatus} – ref: ${externalReference}`);

    if (!externalReference) {
      return jsonResponse({ error: "external_reference ausente na preaprovação." }, 400);
    }

    // Preaprovação cancelada pelo usuário ou pelo sistema
    if (mpStatus === "cancelled" || mpStatus === "paused") {
      console.log(`[Webhook] Preaprovação cancelada/pausada – cancelando assinatura de ${externalReference}`);
      const { error } = await supabaseAdmin.rpc("cancelar_assinatura", {
        uid: externalReference,
      });

      if (error) {
        console.error(`[Webhook] Erro ao cancelar assinatura:`, error);
        return jsonResponse({ error: "Erro ao cancelar assinatura." }, 500);
      }

      console.log(`[Webhook] ✅ Assinatura cancelada para ${externalReference}`);
      return jsonResponse({ ok: true, userId: externalReference, status: "cancelled" });
    }

    return jsonResponse({ ok: true, preapprovalStatus: mpStatus });
  }

  console.log(`[Webhook] Evento ignorado: type=${tipo}, action=${acao}`);
  return jsonResponse({ ok: true, ignored: true });
});
