-- ═══════════════════════════════════════════════════════════════════
-- ÍNDICES PARA OTIMIZAÇÃO DE PERFORMANCE - Supabase
-- Data: 2026-07-25
-- Objetivo: Reduzir uso de RAM e tempo de queries
-- ═══════════════════════════════════════════════════════════════════

-- ─── TRANSACOES (tabela mais consultada) ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_transacoes_deleted_at
  ON transacoes (deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_data_criacao
  ON transacoes (data_criacao DESC);

CREATE INDEX IF NOT EXISTS idx_transacoes_id_conta
  ON transacoes (id_conta);

CREATE INDEX IF NOT EXISTS idx_transacoes_data_transacao
  ON transacoes (data_transacao);

CREATE INDEX IF NOT EXISTS idx_transacoes_id_tag_bancaria
  ON transacoes (id_tag_bancaria)
  WHERE id_tag_bancaria IS NOT NULL;

-- ─── CAIXINHAS ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_caixinhas_deleted_at
  ON caixinhas (deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_caixinhas_id_espaco
  ON caixinhas (id_espaco);

CREATE INDEX IF NOT EXISTS idx_caixinhas_data_criacao
  ON caixinhas (data_criacao ASC);

-- ─── CAIXINHAS HISTORICO ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_caixinhas_historico_caixinha_id
  ON caixinhas_historico (caixinha_id);

CREATE INDEX IF NOT EXISTS idx_caixinhas_historico_data_movimento
  ON caixinhas_historico (data_movimento DESC);

-- ─── TRANSCOES RECORRENTES ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transacoes_recorrentes_deleted_at
  ON transacoes_recorrentes (deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_recorrentes_id_usuario
  ON transacoes_recorrentes (id_usuario);

CREATE INDEX IF NOT EXISTS idx_transacoes_recorrentes_data_criacao
  ON transacoes_recorrentes (data_criacao DESC);

-- ─── BENS PATRIMONIO ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bens_patrimonio_deleted_at
  ON bens_patrimonio (deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bens_patrimonio_id_espaco
  ON bens_patrimonio (id_espaco);

CREATE INDEX IF NOT EXISTS idx_bens_patrimonio_data_aquisicao
  ON bens_patrimonio (data_aquisicao DESC);

-- ─── CONTAS ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contas_id_espaco
  ON contas (id_espaco);

CREATE INDEX IF NOT EXISTS idx_contas_data_criacao
  ON contas (data_criacao ASC);

-- ─── ESPACOS ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_espacos_id_usuario
  ON espacos (id_usuario);

CREATE INDEX IF NOT EXISTS idx_espacos_data_criacao
  ON espacos (data_criacao ASC);

-- ─── CARTOES ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cartoes_id_espaco
  ON cartoes (id_espaco);

CREATE INDEX IF NOT EXISTS idx_cartoes_data_criacao
  ON cartoes (data_criacao ASC);

-- ─── TAGS BANCARIAS ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tags_bancarias_id_usuario
  ON tags_bancarias (id_usuario);

CREATE INDEX IF NOT EXISTS idx_tags_bancarias_data_criacao
  ON tags_bancarias (data_criacao ASC);

-- ─── ATIVOS PATRIMONIO ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ativos_patrimonio_id_usuario
  ON ativos_patrimonio (id_usuario);

CREATE INDEX IF NOT EXISTS idx_ativos_patrimonio_ticker
  ON ativos_patrimonio (ticker ASC);

-- ─── TRANSCOES ATIVOS ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transacoes_ativos_id_usuario
  ON transacoes_ativos (id_usuario);

CREATE INDEX IF NOT EXISTS idx_transacoes_ativos_data_criacao
  ON transacoes_ativos (data_criacao DESC);

-- ─── USUARIOS ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_usuarios_email
  ON usuarios (email);

-- ═══════════════════════════════════════════════════════════════════
-- ÍNDICES PARCIAIS (WHERE) - Mais eficientes para queries filtradas
-- ═══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_caixinhas_active
  ON caixinhas (data_criacao ASC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bens_patrimonio_active
  ON bens_patrimonio (data_aquisicao DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_recorrentes_active
  ON transacoes_recorrentes (data_criacao DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_active
  ON transacoes (data_criacao DESC)
  WHERE deleted_at IS NULL;
