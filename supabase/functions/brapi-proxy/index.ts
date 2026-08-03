import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const BRAPI_TOKEN = Deno.env.get("BRAPI_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const BRAPI_BASE = "https://brapi.dev/api/v2";

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

// A API v2 da brapi aninha os dados em results[].data.
// Achata para o formato antigo (results[i].campo) para não quebrar os clients.
function flattenResult(r: any): any {
  return { requestedSymbol: r.symbol, symbol: r.symbol, ...(r.data ?? {}) };
}

// A API v2 de dividendos renomeou campos: label (era type),
// lastDatePrior (era exDividendDate), remarks (era description).
function normalizeDividendo(d: any): any {
  return {
    assetIssued: d.assetIssued,
    paymentDate: d.paymentDate,
    rate: d.rate,
    relatedTo: d.relatedTo ?? "",
    approvedOn: d.approvedOn ?? null,
    isinCode: d.isinCode,
    type: d.label ?? d.type ?? "",
    exDividendDate: d.lastDatePrior ?? d.exDividendDate ?? null,
    description: d.remarks ?? d.description ?? "",
  };
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

    // Novo formato da brapi: token via header Authorization (nunca na URL).
    const headers: Record<string, string> = {
      Authorization: `Bearer ${BRAPI_TOKEN}`,
      Accept: "application/json",
    };

    async function fetchJson(brapiUrl: string): Promise<{ ok: boolean; data?: any; status: number }> {
      const res = await fetch(brapiUrl, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      // Token expirado/inválido: retenta sem token (as 4 ações gratuitas funcionam sem auth).
      if (res.status === 401 && BRAPI_TOKEN) {
        const retry = await fetch(brapiUrl, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10000),
        });
        if (retry.ok) return { ok: true, data: await retry.json(), status: retry.status };
      }
      if (!res.ok) return { ok: false, status: res.status };
      return { ok: true, data: await res.json(), status: res.status };
    }

    // 1) Cotações
    const quote = await fetchJson(`${BRAPI_BASE}/stocks/quote?symbols=${cleanTickers}`);
    if (!quote.ok) {
      return jsonResponse({ error: `Brapi retornou HTTP ${quote.status}` }, 502);
    }

    const quoteData = quote.data!;
    const results = (quoteData.results ?? []).map(flattenResult);

    // 2) Dividendos (endpoint separado na v2)
    if (modules?.toLowerCase().includes("dividends") && results.length) {
      const div = await fetchJson(`${BRAPI_BASE}/stocks/dividends?symbols=${cleanTickers}`);
      if (div.ok && div.data) {
        const divBySymbol = new Map<string, any[]>();
        for (const r of div.data.results ?? []) {
          divBySymbol.set(String(r.symbol).toUpperCase(), (r.data?.cashDividends ?? []).map(normalizeDividendo));
        }
        for (const r of results) {
          r.dividendsData = { cashDividends: divBySymbol.get(String(r.symbol).toUpperCase()) ?? [] };
        }
      }
    }

    return jsonResponse({ ...quoteData, results });
  } catch (err) {
    console.error("[brapi-proxy] Erro:", err);
    return jsonResponse({ error: "Erro ao buscar cotações." }, 500);
  }
});
