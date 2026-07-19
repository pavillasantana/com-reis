import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
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
    const { code } = await req.json();
    if (!code) return jsonResponse({ error: "Código é obrigatório." }, 400);

    if (!/^[A-Z2-9]{8}$/.test(code)) {
      return jsonResponse({ error: "Formato de código inválido." }, 400);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: ssoRecord, error: lookupError } = await supabaseAdmin
      .from("sso_codes")
      .select("id_usuario, access_token, refresh_token, expires_at, used")
      .eq("code", code)
      .single();

    if (lookupError || !ssoRecord) {
      return jsonResponse({ error: "Código inválido." }, 401);
    }

    if (ssoRecord.used) {
      await supabaseAdmin.from("sso_codes").delete().eq("code", code);
      return jsonResponse({ error: "Código já utilizado." }, 401);
    }

    if (new Date(ssoRecord.expires_at) < new Date()) {
      await supabaseAdmin.from("sso_codes").delete().eq("code", code);
      return jsonResponse({ error: "Código expirado." }, 401);
    }

    await supabaseAdmin
      .from("sso_codes")
      .update({ used: true })
      .eq("code", code);

    const accessToken = ssoRecord.access_token;
    const refreshToken = ssoRecord.refresh_token;

    await supabaseAdmin.from("sso_codes").delete().eq("code", code);

    return jsonResponse({ access_token: accessToken, refresh_token: refreshToken });
  } catch (err) {
    console.error("[sso-exchange-code] Erro:", err);
    return jsonResponse({ error: "Erro interno." }, 500);
  }
});
