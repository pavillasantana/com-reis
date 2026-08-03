-- Migration: Criar tabela de transações recorrentes
-- Feature: Despesas e receitas recorrentes

CREATE TABLE IF NOT EXISTS public.transacoes_recorrentes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    id_espaco UUID NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
    id_conta UUID NOT NULL REFERENCES public.contas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    valor NUMERIC(15, 2) NOT NULL CHECK (valor > 0),
    categoria TEXT NOT NULL,
    moeda_transacao TEXT DEFAULT 'BRL' NOT NULL,
    descricao TEXT,
    frequencia TEXT NOT NULL CHECK (frequencia IN ('semanal', 'quinzenal', 'mensal', 'bimestral', 'trimestral', 'semestral', 'anual')),
    dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    ativo BOOLEAN DEFAULT TRUE NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- Habilitar RLS
ALTER TABLE public.transacoes_recorrentes ENABLE ROW LEVEL SECURITY;

-- Policies RLS
DROP POLICY IF EXISTS "Usuarios podem ver suas proprias recorrentes" ON public.transacoes_recorrentes;
CREATE POLICY "Usuarios podem ver suas proprias recorrentes"
    ON public.transacoes_recorrentes
    FOR SELECT
    USING (id_usuario = auth.uid());

DROP POLICY IF EXISTS "Usuarios podem inserir suas proprias recorrentes" ON public.transacoes_recorrentes;
CREATE POLICY "Usuarios podem inserir suas proprias recorrentes"
    ON public.transacoes_recorrentes
    FOR INSERT
    WITH CHECK (id_usuario = auth.uid());

DROP POLICY IF EXISTS "Usuarios podem atualizar suas proprias recorrentes" ON public.transacoes_recorrentes;
CREATE POLICY "Usuarios podem atualizar suas proprias recorrentes"
    ON public.transacoes_recorrentes
    FOR UPDATE
    USING (id_usuario = auth.uid());

DROP POLICY IF EXISTS "Usuarios podem deletar suas proprias recorrentes" ON public.transacoes_recorrentes;
CREATE POLICY "Usuarios podem deletar suas proprias recorrentes"
    ON public.transacoes_recorrentes
    FOR DELETE
    USING (id_usuario = auth.uid());

-- Índices
CREATE INDEX IF NOT EXISTS idx_transacoes_recorrentes_usuario_espaco_ativo
    ON public.transacoes_recorrentes (id_usuario, id_espaco, ativo);
