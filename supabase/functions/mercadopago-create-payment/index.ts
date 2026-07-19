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
  if (!MP_ACCESS_TOKEN) {
    return jsonResponse({ error: "Mercado Pago token not configured" }, 500);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Payload inválido" }, 400);
  }

  const transactionId = payload.transactionId ?? payload.external_reference;
  const amount = Number(payload.amount ?? 0);
  const description = String(payload.description ?? "Com Réis");
  const payerEmail = payload.payerEmail ? String(payload.payerEmail) : undefined;
  const mode = String(payload.mode ?? "preference");

  if (!transactionId || !Number.isFinite(amount) || amount <= 0) {
    return jsonResponse({ error: "transactionId e amount são obrigatórios" }, 400);
  }

  const mpHeaders = {
    Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };

  if (mode === "pix") {
    const idempotencyKey = `pix-${transactionId}-${Date.now()}`;
    const pixPayload: Record<string, unknown> = {
      transaction_amount: amount,
      description,
      payment_method_id: "pix",
      external_reference: String(transactionId),
    };
    if (payerEmail) {
      pixPayload.payer = { email: payerEmail };
    }

    const mpResponse = await fetch(`${MERCADOPAGO_API}/v1/payments`, {
      method: "POST",
      headers: { ...mpHeaders, "X-Idempotency-Key": idempotencyKey },
      body: JSON.stringify(pixPayload),
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      return jsonResponse({ error: "Erro ao criar pagamento PIX", details: errText }, 502);
    }

    const data = await mpResponse.json();
    const qrBase64 = data.point_of_interaction?.transaction_data?.qr_code_base64;
    const qrCode = data.point_of_interaction?.transaction_data?.qr_code;
    const paymentId = String(data.id);

    if (!qrBase64 || !qrCode) {
      return jsonResponse({ error: "Resposta do Mercado Pago incompleta (sem QR Code)." }, 502);
    }

    return jsonResponse({ ok: true, paymentId, qrCodeBase64: qrBase64, pixCopiaCola: qrCode });
  }

  const preferencePayload = {
    items: [
      {
        title: description,
        quantity: 1,
        unit_price: amount,
        currency_id: "BRL",
      },
    ],
    external_reference: String(transactionId),
    ...(payerEmail ? { payer: { email: payerEmail } } : {}),
  };

  const mpResponse = await fetch(`${MERCADOPAGO_API}/checkout/preferences`, {
    method: "POST",
    headers: mpHeaders,
    body: JSON.stringify(preferencePayload),
  });

  if (!mpResponse.ok) {
    const errText = await mpResponse.text();
    return jsonResponse({ error: "Erro ao criar preferência do Mercado Pago", details: errText }, 502);
  }

  const data = await mpResponse.json();
  return jsonResponse({ ok: true, preferenceId: data.id, initPoint: data.init_point });
});
