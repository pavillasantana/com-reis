import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
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
    if (!authHeader) return jsonResponse({ error: "Não autorizado." }, 401);

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Não autorizado." }, 401);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: sessionData } = await supabaseUser.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const refreshToken = sessionData?.session?.refresh_token;

    if (!accessToken || !refreshToken) {
      return jsonResponse({ error: "Sessão inválida." }, 401);
    }

    const code = generateCode();

    const { error: insertError } = await supabaseAdmin.from("sso_codes").insert({
      id_usuario: user.id,
      code,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      console.error("[sso-create-code] Erro ao inserir código:", insertError);
      return jsonResponse({ error: "Erro ao gerar código." }, 500);
    }

    return jsonResponse({ code });
  } catch (err) {
    console.error("[sso-create-code] Erro:", err);
    return jsonResponse({ error: "Erro interno." }, 500);
  }
});
