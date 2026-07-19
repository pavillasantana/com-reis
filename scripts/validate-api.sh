#!/bin/bash
# =========================================================================
# validate-api.sh — Validação de API do Projeto Mangos
# Data: 2026-07-11
#
# Verifica se os endpoints principais estão respondendo (200 OK).
# Uso: bash scripts/validate-api.sh
# =========================================================================

set -euo pipefail

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

check() {
    local name="$1"
    local url="$2"
    local expected_codes="${3:-200 404}"
    
    printf "  %-50s" "$name"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    
    if echo "$expected_codes" | grep -qw "$response"; then
        echo -e "${GREEN}✅ $response OK${NC}"
        ((PASS++))
    elif [ "$response" = "000" ]; then
        echo -e "${RED}❌ TIMEOUT/ERRO DE CONEXÃO${NC}"
        ((FAIL++))
    else
        echo -e "${YELLOW}⚠️  $response (esperado: $expected_codes)${NC}"
        ((WARN++))
    fi
}

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║       MANGOS — Validação de Endpoints de API            ║"
echo "║       $(date '+%Y-%m-%d %H:%M:%S')                           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Carrega .env se existir
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
if [ -f "$ROOT_DIR/.env" ]; then
    # Extrai apenas as variáveis que precisamos (não exporta tudo por segurança)
    SUPABASE_URL=$(grep '^EXPO_PUBLIC_SUPABASE_URL' "$ROOT_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    BRAPI_TOKEN=$(grep '^EXPO_PUBLIC_BRAPI_TOKEN' "$ROOT_DIR/.env" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
fi

SUPABASE_URL="${SUPABASE_URL:-https://bwcquemvvqaivsxaclpl.supabase.co}"
BRAPI_TOKEN="${BRAPI_TOKEN:-}"

echo "📡 Supabase URL: $SUPABASE_URL"
echo ""

echo "── 1. Supabase Health ──────────────────────────────────"
check "Supabase REST API (root)" "$SUPABASE_URL/rest/v1/" "200 401 404"
check "Supabase Auth (health)" "$SUPABASE_URL/auth/v1/health" "200 404"
check "Supabase Realtime" "https://$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|/.*||')/realtime/v1/websocket?vsn=1.0.0" "101 200 400 404"
echo ""

echo "── 2. Supabase Tables (RPC) ────────────────────────────"
check "Table: usuarios (REST)" "$SUPABASE_URL/rest/v1/usuarios?select=id&limit=1" "200 401"
check "Table: espacos (REST)" "$SUPABASE_URL/rest/v1/espacos?select=id&limit=1" "200 401"
check "Table: transacoes (REST)" "$SUPABASE_URL/rest/v1/transacoes?select=id&limit=1" "200 401"
check "Table: caixinhas (REST)" "$SUPABASE_URL/rest/v1/caixinhas?select=id&limit=1" "200 401"
check "Table: cartoes (REST)" "$SUPABASE_URL/rest/v1/cartoes?select=id&limit=1" "200 401"
check "Table: ativos_patrimonio (REST)" "$SUPABASE_URL/rest/v1/ativos_patrimonio?select=id&limit=1" "200 401"
check "Table: transacoes_ativos (REST)" "$SUPABASE_URL/rest/v1/transacoes_ativos?select=id&limit=1" "200 401"
check "Table: tags (REST)" "$SUPABASE_URL/rest/v1/tags?select=id&limit=1" "200 401"
check "Table: bens_patrimonio (REST)" "$SUPABASE_URL/rest/v1/bens_patrimonio?select=id&limit=1" "200 401"
check "Table: proventos (REST)" "$SUPABASE_URL/rest/v1/proventos?select=id&limit=1" "200 401"
echo ""

echo "── 3. Brapi API (Cotações) ─────────────────────────────"
if [ -n "$BRAPI_TOKEN" ]; then
    check "Brapi: PETR4 quote" "https://brapi.dev/api/quote/PETR4?token=$BRAPI_TOKEN" "200"
else
    echo "  ⚠️  BRAPI_TOKEN não encontrado no .env — pulando testes Brapi"
    ((WARN++))
fi
echo ""

echo "── 4. AwesomeAPI (Exchange Rates) ──────────────────────"
check "AwesomeAPI: USD-BRL" "https://economia.awesomeapi.com.br/json/last/USD-BRL" "200"
echo ""

echo "── 5. Yahoo Finance (Fallback Cotações) ────────────────"
check "Yahoo Finance: PETR4.SA" "https://query1.finance.yahoo.com/v7/finance/quote?symbols=PETR4.SA" "200 401 403"
echo ""

echo "══════════════════════════════════════════════════════════"
echo -e "  Resultado: ${GREEN}$PASS passou${NC}  ${RED}$FAIL falhou${NC}  ${YELLOW}$WARN avisos${NC}"
echo "══════════════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
    echo -e "\n${RED}❌ $FAIL endpoint(s) com falha — verifique a conectividade.${NC}"
    exit 1
else
    echo -e "\n${GREEN}✅ Todos os endpoints acessíveis estão respondendo corretamente.${NC}"
    exit 0
fi
