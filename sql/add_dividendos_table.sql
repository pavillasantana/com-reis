-- Migration: Adicionar tabela de dividendos/proventos
-- Rode no Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS dividendos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  valor DECIMAL(14,2) NOT NULL,
  data_recebimento DATE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'dividendo' CHECK (tipo IN ('dividendo', 'juros', 'cupom', 'rendimento')),
  descricao TEXT DEFAULT '',
  data_criacao TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE dividendos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário pode ver seus dividendos"
  ON dividendos FOR SELECT
  USING (id_usuario = auth.uid());

CREATE POLICY "Usuário pode inserir seus dividendos"
  ON dividendos FOR INSERT
  WITH CHECK (id_usuario = auth.uid());

CREATE POLICY "Usuário pode atualizar seus dividendos"
  ON dividendos FOR UPDATE
  USING (id_usuario = auth.uid());

CREATE POLICY "Usuário pode deletar seus dividendos"
  ON dividendos FOR DELETE
  USING (id_usuario = auth.uid());

CREATE INDEX IF NOT EXISTS idx_dividendos_usuario ON dividendos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_dividendos_ticker ON dividendos(ticker);

-- Tabela para cache de cotações
CREATE TABLE IF NOT EXISTS precos_ativos (
  ticker TEXT PRIMARY KEY,
  nome TEXT DEFAULT '',
  preco DECIMAL(14,4) DEFAULT 0,
  variacao_percent DECIMAL(8,2) DEFAULT 0,
  fonte TEXT DEFAULT 'brapi',
  data_atualizacao TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE precos_ativos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver preços"
  ON precos_ativos FOR SELECT
  USING (true);

CREATE POLICY "Usuários autenticados podem inserir preços"
  ON precos_ativos FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
