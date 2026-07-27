-- ═══════════════════════════════════════════════════════════════════
-- MIGRAÇÃO: Adicionar colunas categoria/subcategoria em transacoes_ativos
-- Data: 2026-07-27
-- Objetivo: Permitir categorização correta de investimentos importados
-- ═══════════════════════════════════════════════════════════════════

-- Adicionar coluna categoria (ex: 'renda_fixa_br', 'renda_variavel_br', 'internacional')
ALTER TABLE public.transacoes_ativos 
ADD COLUMN IF NOT EXISTS categoria TEXT;

-- Adicionar coluna subcategoria (ex: 'tesouro_direto', 'acoes', 'fiis')
ALTER TABLE public.transacoes_ativos 
ADD COLUMN IF NOT EXISTS subcategoria TEXT;

-- Criar índice para buscas por categoria
CREATE INDEX IF NOT EXISTS idx_transacoes_ativos_categoria 
ON public.transacoes_ativos (categoria) 
WHERE categoria IS NOT NULL;

-- Criar índice para buscas por subcategoria
CREATE INDEX IF NOT EXISTS idx_transacoes_ativos_subcategoria 
ON public.transacoes_ativos (subcategoria) 
WHERE subcategoria IS NOT NULL;

-- Comentários nas colunas
COMMENT ON COLUMN public.transacoes_ativos.categoria IS 'Categoria do investimento (ex: renda_fixa_br, renda_variavel_br, internacional, fundos, alternativos)';
COMMENT ON COLUMN public.transacoes_ativos.subcategoria IS 'Subcategoria do investimento (ex: tesouro_direto, acoes, fiis, stocks)';

-- ═══════════════════════════════════════════════════════════════════
-- FIM DA MIGRAÇÃO
-- ═══════════════════════════════════════════════════════════════════