import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const BRAPI_TOKEN = Deno.env.get("BRAPI_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Não autorizado." }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonResponse({ error: "Não autorizado." }, 401);

    const url = new URL(req.url);
    const tickers = url.searchParams.get("tickers");
    const modules = url.searchParams.get("modules");

    if (!tickers) {
      return jsonResponse({ error: "Parâmetro 'tickers' obrigatório." }, 400);
    }

    const cleanTickers = tickers.replace(/[^A-Za-z0-9,]/g, "").substring(0, 500);
    let brapiUrl = `https://brapi.dev/api/quote/${cleanTickers}?token=${BRAPI_TOKEN}`;
    if (modules) {
      const cleanModules = modules.replace(/[^a-zA-Z,]/g, "").substring(0, 200);
      brapiUrl += `&modules=${cleanModules}`;
    }

    const response = await fetch(brapiUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return jsonResponse({ error: `Brapi retornou HTTP ${response.status}` }, 502);
    }

    const data = await response.json();
    return jsonResponse(data);
  } catch (err) {
    console.error("[brapi-proxy] Erro:", err);
    return jsonResponse({ error: "Erro ao buscar cotações." }, 500);
  }
});
