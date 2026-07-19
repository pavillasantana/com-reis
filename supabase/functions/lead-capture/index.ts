import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
        "Access-Control-Allow-Headers": "content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { email, source } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return jsonResponse({ error: "Email válido é obrigatório." }, 400);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabaseAdmin.from("leads").upsert(
      { email: email.toLowerCase().trim(), source: source || "unknown" },
      { onConflict: "email" }
    );

    if (error) {
      if (error.message.includes("relation") && error.message.includes("does not exist")) {
        console.error("[lead-capture] Tabela 'leads' não existe. Execute a migration 019.");
        return jsonResponse({ ok: true, message: "Obrigado!" });
      }
      console.error("[lead-capture] Erro ao salvar lead:", error);
      return jsonResponse({ error: "Erro ao registrar lead." }, 500);
    }

    console.log(`[lead-capture] ✅ Lead capturado: ${email} (fonte: ${source})`);
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("[lead-capture] Erro:", err);
    return jsonResponse({ error: "Erro interno." }, 500);
  }
});
