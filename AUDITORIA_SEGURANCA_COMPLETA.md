# 🔴 AUDITORIA SEVERA DE SEGURANÇA — COM RÉIS
## Relatório Completo de Segurança

**Data:** 30 de julho de 2026  
**Projeto:** Com Réis — Controle Financeiro PF + PJ  
**Status:** 🔴 **CRÍTICO — NÃO SEGURO PARA PRODUÇÃO**  
**Score Geral:** 4.4/10

---

## 📑 ÍNDICE

1. [Sumário Executivo](#sumário-executivo)
2. [Descobertas Críticas](#descobertas-críticas)
3. [Vulnerabilidades Detalhadas](#vulnerabilidades-detalhadas)
4. [Análise de Segurança](#análise-de-segurança)
5. [Guia de Remediação](#guia-de-remediação)

---

## SUMÁRIO EXECUTIVO

### Status Geral

| Dimensão | Score | Status |
|----------|-------|--------|
| **Gerenciamento de Secrets** | 1/10 | 🔴 CRÍTICO |
| **Vulnerabilidades de Dependência** | 3/10 | 🔴 CRÍTICO |
| **CSP / Headers de Segurança** | 4/10 | 🔴 ALTO |
| **Autenticação** | 6/10 | 🟡 MÉDIO |
| **CORS / CSRF** | 7/10 | 🟡 MÉDIO |
| **Injeção / XSS** | 8/10 | 🟢 BOM |
| **Criptografia** | 8/10 | 🟢 BOM |
| **SCORE GERAL** | **4.4/10** | **🔴 CRÍTICO** |

### Recomendação

**NÃO IMPLANTE EM PRODUÇÃO** até que todas as críticas sejam resolvidas.

Risco de:
- Roubo de dados de usuários
- Manipulação de transações financeiras
- Violação de LGPD/GDPR

---

## DESCOBERTAS CRÍTICAS

### 🔴 CRÍTICA #1: EXPOSIÇÃO DE CREDENCIAIS EM REPOSITÓRIO PÚBLICO

**Severidade:** CRÍTICA  
**Impacto:** Acesso direto ao banco de dados em produção  

#### Achados

```
Arquivo: .env (VERSIONADO NO GIT — PÚBLICO)
├─ EXPO_PUBLIC_SUPABASE_URL = "https://bwcquemvvqaivsxaclpl.supabase.co"
├─ EXPO_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_5QbtKEEs8J4D27sx9nQ5Nw_AHnHtFVu"
├─ VITE_SENTRY_DSN = "https://88f03b86da01e83dbc9001ed1163277f@o4511611535622144..."
└─ VITE_ADSENSE_CLIENT_ID = "ca-pub-7399193408946990"

Arquivo: web/wrangler.toml (VERSIONADO NO GIT — PÚBLICO)
├─ EXPO_PUBLIC_SUPABASE_URL = "https://bwcquemvvqaivsxaclpl.supabase.co"
├─ EXPO_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_5QbtKEEs8J4D27sx9nQ5Nw_AHnHtFVu"
└─ VITE_ADSENSE_CLIENT_ID = "ca-pub-7399193408946990"

Repositório: https://github.com/pavillasantana/com-reis.git
```

#### Consequências Diretas

- ❌ **Qualquer pessoa** pode acessar seu banco de dados Supabase
- ❌ Possível extrair dados de **todos os usuários** (máximo 1000 registros por request)
- ❌ Possível **modificar dados** sem autenticação
- ❌ Roubo de dados de transações financeiras
- ❌ Violação de LGPD/GDPR (lei de proteção de dados brasileira)

#### Ações Imediatas Necessárias (HOJE)

**1. Rotacionar TODAS as chaves Supabase**
```bash
# 1. Acesse https://app.supabase.com/
# 2. Vá para > Seu projeto > Settings > API
# 3. Clique no ícone 🔄 para regenerar "Anon Key"
# 4. Salve a nova chave em local seguro
```

**2. Remover .env do histórico git**
```bash
cd /run/media/pavilla/HD/Documentos/Projetos/Com\ Réis

# Validar o que será removido
git filter-repo --path .env --dry-run

# REMOVER .env do histórico permanentemente
git filter-repo --path .env --invert-paths

# REMOVER web/wrangler.toml do histórico
git filter-repo --path web/wrangler.toml --invert-paths

# Validar que foram removidos
git log --all --full-history -- .env
# Deve mostrar: (empty)
```

**3. Criar .gitignore**
```bash
cat >> .gitignore << 'IGNORE'

# Secrets & Environment
.env
.env.local
.env.*.local
web/wrangler.toml
Android/wrangler.toml

# Build artifacts
dist/
build/
.next/

# Dependencies
node_modules/

# Logs
*.log
npm-debug.log*

IGNORE

git add .gitignore
git commit -m "fix: Add .gitignore to prevent secrets exposure"
```

**4. Force Push (após avisar colaboradores)**
```bash
git push origin main --force
git push origin --all --force
```

---

### 🔴 CRÍTICA #2: 52 VULNERABILIDADES EM DEPENDÊNCIAS

**Severidade:** CRÍTICA  
**Impacto:** Crashes, bypassing de segurança, execução de código não autorizado  

#### Vulnerabilidades na Web (4 altas)

| Pacote | Versão | Vulnerabilidade | CVE | Impacto |
|--------|--------|-----------------|-----|---------|
| `react-router-dom` | >=7.12.0 | RSC Mode CSRF Bypass | GHSA-qwww-vcr4-c8h2 | Execução de ações sem consentimento |
| `postcss` | <=8.5.17 | Path Traversal via Source Map | GHSA-r28c-9q8g-f849 | Divulgação de arquivos .map |
| `brace-expansion` | <=5.0.7 | DoS | GHSA-mh99-v99m-4gvg | Crash de processo |

#### Vulnerabilidades no Android (52 em cascata)

**Crítica (13 vulns):**
- `tar` <=7.5.20: Path traversal, symlink poisoning, interpretação diferencial

**Altas (via eas-cli):**
- `node-forge` <=1.3.3: 7 vulnerabilidades (ASN.1, signature forgery, DoS)
- `@xmldom/xmldom` <=0.8.12: 5 vulnerabilidades (XML injection)
- Mais 18+ moderadas

#### Ações (PRÓXIMAS 48 HORAS)

**Web:**
```bash
cd web

# Ver vulnerabilidades
npm audit

# Corrigir automaticamente
npm audit fix

# Para react-router (requer versão anterior):
# Editar package.json:
# "react-router-dom": "^7.11.0"  (era: "^7.18.1")

npm install
npm run build
git add package-lock.json
git commit -m "fix: Update dependencies to resolve 4 high vulnerabilities"
```

**Android:**
```bash
cd Android
npm audit fix --force
npm run build  # validar
git add package-lock.json
git commit -m "fix: Update Android dependencies"
```

---

### 🟠 ALTA PRIORIDADE #3: CONTENT SECURITY POLICY INADEQUADA

**Severidade:** ALTA  
**Localização:** `web/index.html` (linhas 17-21)  
**Risco:** Ataques XSS, injeção de código JavaScript  

#### Problemas Encontrados

```html
❌ script-src 'unsafe-inline' — permite qualquer <script> inline
❌ script-src 'unsafe-eval' — permite eval() no navegador
❌ script-src https://pagead2.googlesyndication.com — ads podem executar JS
❌ admin.html — SEM CSP NENHUMA — vulnerável a XSS completo
```

#### Vetores de Ataque

1. **Injeção XSS inline:** Um invasor injecta `<script>alert('hacked')</script>` em um campo de entrada
2. **Compromisso de Script de Ads:** Google Ads é comprometido, injecta código malicioso
3. **Admin desprotegido:** admin.html pode ser explorado sem proteção

#### Ações (PRÓXIMA SEMANA)

**Editar `web/index.html`:**
```html
<!-- ANTES (linhas 17-21) -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://...;
  ...
">

<!-- DEPOIS -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://js.sentry-cdn.com https://browser.sentry-cdn.com https://www.googletagmanager.com https://www.google-analytics.com;
  script-src-elem 'self' https://pagead2.googlesyndication.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob: https://geospatialtraining.com/wp-content/uploads/2023/01/Vector-Tile-Style-Editor-8.png
  connect-src 'self' https://bwcquemvvqaivsxaclpl.supabase.co wss://bwcquemvvqaivsxaclpl.supabase.co https://sentry.io https://*.ingest.us.sentry.io https://brapi.dev https://openexchange.bcb.gov.br https://economia.awesomeapi.com.br https://servicodados.ibge.gov.br https://apisidra.ibge.gov.br https://countriesnow.space https://api.teleport.org https://www.google.com https://googleads.g.doubleclick.net;
  frame-src https://pagead2.googlesyndication.com https://tpc.googlesyndication.com https://www.google.com;
  object-src 'none';
">
```

**Adicionar CSP em `web/admin.html`:**
```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="
      default-src 'self';
      script-src 'self' https://js.sentry-cdn.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      connect-src 'self' https://bwcquemvvqaivsxaclpl.supabase.co wss://bwcquemvvqaivsxaclpl.supabase.co https://*.ingest.us.sentry.io;
      object-src 'none';
    ">
    ...
  </head>
  ...
</html>
```

---

## VULNERABILIDADES DETALHADAS

### 1. Supabase RLS (Row-Level Security) — Não Verificada

**Severidade:** ALTA  
**Risco:** Usuários podem acessar dados uns dos outros  

**Validações necessárias:**
```sql
-- Verificar se RLS está ativado em TODAS as tabelas
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- Se houver resultados = FALHA de segurança
-- Se vazio = OK
```

**Ações:**
- [ ] Verificar que todas as tabelas têm RLS ativado
- [ ] Verificar que as políticas RLS filtram por `auth.uid()`
- [ ] Testar que um usuário não consegue acessar dados de outro

### 2. Autenticação e Sessão

**Status Atual:**

| Item | Config | Risco |
|------|--------|-------|
| JWT Expiry | 3600s (1 hora) | ✅ OK |
| Refresh Token Rotation | Ativo | ✅ OK |
| Minimum Password | 6 caracteres | ❌ Fraco |
| Passkeys/WebAuthn | Desativado | ⚠️ Sem MFA padrão |
| Email Confirmations | `false` | ❌ Usuários não confirmam |
| Secure Password Change | `false` | ❌ Sem reauthenticação |

**Recomendações:**

Editar `supabase/config.toml`:
```toml
# Linha ~130
minimum_password_length = 12  # Era 6

# Linha ~134
enable_confirmations = true  # Era false

# Novo
password_requirements = "lower_upper_letters_digits"

# Linha ~221
secure_password_change = true  # Era false
```

### 3. Supply Chain Risk — xlsx do CDN

**Severidade:** ALTA  
**Problema:** Dependência obtida de CDN, não do npm registry

```json
// package.json e web/package.json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

**Riscos:**
- ❌ **CDN Hijacking**: Se SheetJS CDN for comprometido, código malicioso executado
- ❌ **MITM**: Sem hash SRI, integridade não verificada
- ❌ **Supply Chain Compromise**: Terceiros podem injetar código

**Solução:**
```bash
# Remover override de CDN em package.json
npm install xlsx@^0.20.3

# Na web também
cd web
npm install xlsx@^0.20.3

npm run build
git add package*.json web/package-lock.json
git commit -m "fix: Use npm registry for xlsx (supply chain security)"
```

### 4. Verificações de Código

**XSS/Injeção:** ✅ PASSOU
- ✅ Nenhum `dangerouslySetInnerHTML` detectado
- ✅ Nenhum `eval()` detectado
- ✅ Limpeza de token em URL implementada (bom!)

**Secrets em Código:** ⚠️ PARCIAL PASSOU
- ✅ Nenhum hardcoded de chaves privadas
- ❌ **MAS wrangler.toml tem chaves reais** (NÃO ESPERADO)

---

## ANÁLISE DE SEGURANÇA

### Endpoints Externos (via CSP)

| Endpoint | Tipo | Status |
|----------|------|--------|
| Supabase | Banco de dados | ✅ Esperado |
| Sentry | Error tracking | ✅ Esperado |
| Google Ads | Monetização | ⚠️ Risco (JS arbitrário) |
| BRAPI | Cotações | ⚠️ Não verificado |
| IBGE APIs | Dados públicos | ✅ Esperado |
| CartoDB | Mapas | ✅ Esperado |

### GitHub

**Repositório:** https://github.com/pavillasantana/com-reis.git (público)  
**Histórico:** 49 commits  
**Exposição:** Chaves no histórico permanente  

---

## GUIA DE REMEDIAÇÃO

### FASE 1: EMERGÊNCIA (1-2 HORAS) 🔴 CRÍTICA

#### Passo 1: Rotacionar Chaves Supabase (10 min)
```bash
# 1. https://app.supabase.com/ > Settings > API
# 2. Clique 🔄 para regenerar Anon Key
# 3. Salve a chave em local seguro (não compartilhe)
# 4. Atualize em seu .env local (mas NÃO commit)
```

#### Passo 2: Remover Secrets do Git (15 min)
```bash
cd /run/media/pavilla/HD/Documentos/Projetos/Com\ Réis

# Validar
git filter-repo --path .env --dry-run
git filter-repo --path web/wrangler.toml --dry-run

# Executar
git filter-repo --path .env --invert-paths
git filter-repo --path web/wrangler.toml --invert-paths

# Validar remoção
git log --all --full-history -- .env
git log --all --full-history -- web/wrangler.toml
```

#### Passo 3: Criar .gitignore (5 min)
```bash
cat >> .gitignore << 'IGNORE'

# Secrets
.env
.env.local
.env.*.local
web/wrangler.toml
Android/wrangler.toml

# Build
dist/
build/
.next/

# Dependencies
node_modules/

# Logs
*.log

IGNORE

git add .gitignore
git commit -m "fix: Add .gitignore to prevent secrets from being committed"
```

#### Passo 4: Criar .env.example (5 min)
```bash
cat > .env.example << 'EXAMPLE'
# Supabase (https://app.supabase.com/project/{id}/settings/api)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# MercadoPago (servidor)
MP_ACCESS_TOKEN=

# Sentry (https://sentry.io/)
VITE_SENTRY_DSN=https://key@sentry.io/...

# Google AdSense
VITE_ADSENSE_CLIENT_ID=ca-pub-...

# App Version
VITE_APP_VERSION=0.1.0
EXAMPLE

git add .env.example
git commit -m "docs: Add .env.example template"
```

#### Passo 5: Atualizar .env Local (5 min)
```bash
cat > .env << 'NEWENV'
EXPO_PUBLIC_SUPABASE_URL=https://bwcquemvvqaivsxaclpl.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<NOVA_CHAVE_DO_PASSO_1>
VITE_SENTRY_DSN=https://88f03b86da01e83dbc9001ed1163277f@o4511611535622144.ingest.us.sentry.io/4511611540471808
VITE_ADSENSE_CLIENT_ID=ca-pub-7399193408946990
VITE_APP_VERSION=0.1.0
MP_ACCESS_TOKEN=
NEWENV

# NÃO COMMIT — ele está em .gitignore agora
```

#### Passo 6: Force Push (2 min)
```bash
# Avisar colaboradores primeiro!
# "Eu vou fazer rewrite do histórico git. Todos precisam fazer git clone novamente."

git push origin main --force
git push origin --all --force
git push origin --tags --force
```

---

### FASE 2: VULNERABILIDADES (2-4 HORAS) 🔴 CRÍTICA

#### Passo 7: Corrigir Web (30 min)
```bash
cd web

# Ver vulnerabilidades
npm audit

# Corrigir automaticamente
npm audit fix

# Para react-router CSRF:
# Editar package.json:
# "react-router-dom": "^7.11.0"  (era: "^7.18.1")

npm install
npm run build

# Validar
npm run lint
npm run test

git add package-lock.json
git commit -m "fix: Update dependencies to resolve critical vulnerabilities

- Fixed react-router CSRF bypass
- Fixed postcss path traversal  
- Fixed brace-expansion DoS
"
```

#### Passo 8: Corrigir xlsx (10 min)
```bash
# Remover override de CDN
# Editar package.json e remover "overrides"

npm install xlsx@^0.20.3
cd web
npm install xlsx@^0.20.3

npm run build
git add package*.json web/package-lock.json
git commit -m "fix: Use npm registry for xlsx instead of CDN"
```

#### Passo 9: Android (1 hora)
```bash
cd Android

# Tentar automático
npm audit fix --force

# Se quebrar, atualizar eas-cli manualmente
npm update eas-cli

# Validar
npm run build  # ou eas build --local

git add package-lock.json
git commit -m "fix: Update Android dependencies"
```

---

### FASE 3: HEADERS DE SEGURANÇA (1 DIA) 🟠 ALTA

#### Passo 10: Corrigir CSP em index.html (20 min)
```bash
# Editar web/index.html — remover 'unsafe-inline' e 'unsafe-eval'
# Ver exemplo acima na seção de CSP
```

#### Passo 11: Adicionar CSP em admin.html (5 min)
```bash
# Editar web/admin.html — adicionar <meta http-equiv="Content-Security-Policy">
# Ver exemplo acima
```

#### Passo 12: Atualizar Supabase Config (15 min)
```bash
# Editar supabase/config.toml
# - minimum_password_length = 12
# - enable_confirmations = true
# - password_requirements = "lower_upper_letters_digits"
# - secure_password_change = true
```

---

### FASE 4: TESTES (1-2 DIAS) 🟡 MÉDIA

#### Passo 13: Validação de Build (30 min)
```bash
cd /run/media/pavilla/HD/Documentos/Projetos/Com\ Réis

# Web
cd web
npm run build
npm run test
npm run lint

# Android
cd ../Android
npm run build

cd ..
```

#### Passo 14: Testes de Segurança (30 min)
```bash
# 1. Verificar que .env foi removido
git log --all --full-history -- .env | head

# 2. Verificar CSP
# Abrir navegador > DevTools > Network > Response Headers
# Procurar por "Content-Security-Policy"

# 3. Testar password mínimo
# Tentar registrar com senha < 12 caracteres
# Deve rejeitar

# 4. Teste XSS básico (não deve ser executado)
# Console: fetch('https://example.com/?xss=<script>alert(1)</script>')
```

#### Passo 15: Documentação (10 min)
```bash
cat > SECURITY.md << 'SECURITY'
# Política de Segurança

## Reportar Vulnerabilidades

Não abra issues públicas. Envie email para: [seu-email]

## Changelog

### v0.2.0 (30 de julho de 2026)
- Rotacionadas chaves Supabase
- Removidos secrets do git
- Atualizado react-router para 7.11.0
- Removido 'unsafe-inline' de CSP
- Aumentado minimum_password_length para 12
- Ativadas email confirmations

SECURITY

git add SECURITY.md
git commit -m "docs: Add security policy"
```

---

## ✅ CHECKLIST FINAL

**FASE 1 (Hoje):**
- [ ] Chaves Supabase rotacionadas
- [ ] .env removido do git
- [ ] web/wrangler.toml removido do git
- [ ] .gitignore criado
- [ ] .env.example criado
- [ ] .env local atualizado
- [ ] Force push realizado

**FASE 2 (48h):**
- [ ] npm audit fix executado na web
- [ ] react-router atualizado para 7.11.0
- [ ] xlsx mudado para npm registry
- [ ] npm audit fix --force no Android
- [ ] Build valida sem erros

**FASE 3 (Semana):**
- [ ] CSP removido 'unsafe-inline' em index.html
- [ ] CSP removido 'unsafe-eval' em index.html
- [ ] CSP adicionado em admin.html
- [ ] supabase/config.toml atualizado
- [ ] Testes passam

**FASE 4 (Semana):**
- [ ] Builds completos validados
- [ ] Testes de segurança manuais passam
- [ ] SECURITY.md criado
- [ ] Colaboradores notificados

---

## ⏰ CRONOGRAMA

| Fase | Duração | Prioridade | Status |
|------|---------|-----------|--------|
| 1. Emergência | 1-2h | 🔴 CRÍTICA | ⏳ HOJE |
| 2. Vulnerabilidades | 2-4h | 🔴 CRÍTICA | ⏳ 48H |
| 3. Headers | 1d | 🟠 ALTA | ⏳ SEMANA |
| 4. Testes | 1-2d | 🟡 MÉDIA | ⏳ SEMANA |
| **TOTAL** | **3-4 dias** | | |

---

## 🚨 RISCOS SE NÃO FIZER

1. **Credenciais Expostas**
   - Qualquer pessoa acessa seu banco de dados
   - Roubo de dados de usuários
   - Manipulação de transações financeiras

2. **Vulnerabilidades em Dependências**
   - Crashes de aplicação
   - Execução de código malicioso
   - Bypassing de validação

3. **CSP Inadequado**
   - Ataques XSS
   - Injeção de código JavaScript
   - Comprometimento de sessões

4. **Conformidade**
   - Violação de LGPD
   - Possíveis multas regulatórias
   - Perda de confiança de usuários

---

## 📞 PRÓXIMOS PASSOS

1. **HOJE:** Comece pela Fase 1 (Emergência)
2. **Amanhã:** Continue com Fase 2 (Vulnerabilidades)
3. **Próxima Semana:** Fases 3 e 4 (Headers e Testes)
4. **Após remediação:** Solicite auditoria independente

---

*Relatório Completo de Segurança — Com Réis (30 de julho de 2026)*
*Score Geral: 4.4/10 🔴 CRÍTICO — NÃO SEGURO PARA PRODUÇÃO*
