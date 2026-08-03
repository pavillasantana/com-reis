-- =========================================================================
-- MÓDULO 3: GASTOS COMPARTILHADOS (MIGRAÇÃO DE BANCO)
-- =========================================================================

-- 1. Alterar tabela transacoes
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS is_compartilhada BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS id_transacao_pai UUID REFERENCES public.transacoes(id) ON DELETE SET NULL;

-- 2. Criar tabela associativa transacoes_participantes
CREATE TABLE IF NOT EXISTS public.transacoes_participantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_transacao UUID NOT NULL REFERENCES public.transacoes(id) ON DELETE CASCADE,
    id_usuario_participante UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    valor_devido NUMERIC(15, 2) NOT NULL CHECK (valor_devido > 0),
    status_pagamento TEXT DEFAULT 'Pendente' CHECK (status_pagamento IN ('Pendente', 'Pago')) NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index para performance nas buscas de participantes
CREATE INDEX IF NOT EXISTS idx_participantes_transacao ON public.transacoes_participantes(id_transacao);
CREATE INDEX IF NOT EXISTS idx_participantes_usuario ON public.transacoes_participantes(id_usuario_participante);

-- Row Level Security (RLS) para transacoes_participantes
ALTER TABLE public.transacoes_participantes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem gerenciar participações de suas transações" ON public.transacoes_participantes;

CREATE POLICY "tp_select_migration"
    ON public.transacoes_participantes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.transacoes
            JOIN public.contas ON transacoes.id_conta = contas.id
            JOIN public.espacos ON contas.id_espaco = espacos.id
            WHERE transacoes_participantes.id_transacao = transacoes.id
            AND espacos.id_usuario = auth.uid()
        )
        OR id_usuario_participante = auth.uid()
    );
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
-- ============================================================
-- Migration 008: Fluxo de Exclusão de Conta (Phase 10 — LGPD)
-- 1. Colunas de status no perfil do usuário
-- 2. Tabela de arquivamento pós-exclusão
-- 3. Funções RPC para solicitar, cancelar e processar exclusão
-- ============================================================

-- =========================================================================
-- 1. NOVAS COLUNAS na tabela usuarios
-- =========================================================================
ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo'
        CHECK (status IN ('ativo', 'pendente_exclusao'));

ALTER TABLE public.usuarios
    ADD COLUMN IF NOT EXISTS data_solicitacao_exclusao TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Atualiza a trigger de novo usuário para incluir status (a definição
-- original da function handle_new_user será recriada ao final)

-- =========================================================================
-- 2. TABELA DE ARQUIVAMENTO (LGPD — reter mínimo necessário)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.usuarios_arquivados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario_original UUID NOT NULL,
    nome TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    celular TEXT DEFAULT '',
    conta_encerrada BOOLEAN DEFAULT TRUE NOT NULL,
    data_encerramento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.usuarios_arquivados ENABLE ROW LEVEL SECURITY;

-- Apenas administradores (ou service_role) podem ler — o usuário já foi deletado
DROP POLICY IF EXISTS "Apenas service_role pode ver arquivados" ON public.usuarios_arquivados;
CREATE POLICY "Apenas service_role pode ver arquivados"
    ON public.usuarios_arquivados FOR SELECT
    USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Apenas service_role pode inserir arquivados" ON public.usuarios_arquivados;
CREATE POLICY "Apenas service_role pode inserir arquivados"
    ON public.usuarios_arquivados FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- =========================================================================
-- 3. FUNÇÃO: solicitar_exclusao
-- Define status como 'pendente_exclusao' e registra a data.
-- O usuário tem 30 dias para cancelar.
-- =========================================================================
DROP FUNCTION IF EXISTS public.solicitar_exclusao();
CREATE OR REPLACE FUNCTION public.solicitar_exclusao()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN 'ERRO: Usuário não autenticado.';
    END IF;

    UPDATE public.usuarios
    SET status = 'pendente_exclusao',
        data_solicitacao_exclusao = NOW()
    WHERE id = v_uid;

    IF NOT FOUND THEN
        RETURN 'ERRO: Perfil de usuário não encontrado.';
    END IF;

    RETURN 'OK';
END;
$$;

-- =========================================================================
-- 4. FUNÇÃO: cancelar_exclusao
-- Reverte o status para 'ativo' e limpa a data de solicitação.
-- =========================================================================
DROP FUNCTION IF EXISTS public.cancelar_exclusao();
CREATE OR REPLACE FUNCTION public.cancelar_exclusao()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN 'ERRO: Usuário não autenticado.';
    END IF;

    UPDATE public.usuarios
    SET status = 'ativo',
        data_solicitacao_exclusao = NULL
    WHERE id = v_uid AND status = 'pendente_exclusao';

    IF NOT FOUND THEN
        RETURN 'ERRO: Nenhuma solicitação de exclusão pendente encontrada.';
    END IF;

    RETURN 'OK';
END;
$$;

-- =========================================================================
-- 5. FUNÇÃO: verificar_status_exclusao
-- Retorna o status atual do usuário + data_solicitacao (se houver).
-- =========================================================================
DROP FUNCTION IF EXISTS public.verificar_status_exclusao();
CREATE OR REPLACE FUNCTION public.verificar_status_exclusao()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid UUID;
    v_result JSONB;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RETURN jsonb_build_object('status', 'nao_autenticado');
    END IF;

    SELECT jsonb_build_object(
        'status', COALESCE(u.status, 'ativo'),
        'data_solicitacao', u.data_solicitacao_exclusao,
        'dias_restantes', CASE
            WHEN u.status = 'pendente_exclusao' AND u.data_solicitacao_exclusao IS NOT NULL
            THEN GREATEST(0, 30 - EXTRACT(DAY FROM NOW() - u.data_solicitacao_exclusao)::INT)
            ELSE NULL
        END
    ) INTO v_result
    FROM public.usuarios u
    WHERE u.id = v_uid;

    RETURN COALESCE(v_result, jsonb_build_object('status', 'nao_encontrado'));
END;
$$;

-- =========================================================================
-- 6. FUNÇÃO: processar_exclusao_permanente (executada por cron/job externo)
-- Recebe um uid e executa o hard delete / anonimização completa.
-- ATENÇÃO: Esta função deve ser chamada apenas pelo service_role (cron).
-- =========================================================================
DROP FUNCTION IF EXISTS public.processar_exclusao_permanente(uuid);
CREATE OR REPLACE FUNCTION public.processar_exclusao_permanente(uid_alvo UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email TEXT;
    v_nome TEXT;
    v_celular TEXT;
    v_target_uid UUID;
BEGIN
    -- Segurança: apenas service_role pode processar em lote ou excluir outro usuário
    IF auth.role() != 'service_role' AND uid_alvo IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: você só pode excluir sua própria conta';
    END IF;

    IF uid_alvo IS NULL THEN
        FOR v_target_uid IN
            SELECT id FROM public.usuarios
            WHERE status = 'pendente_exclusao'
              AND data_solicitacao_exclusao IS NOT NULL
              AND data_solicitacao_exclusao < NOW() - INTERVAL '30 days'
        LOOP
            PERFORM public.processar_exclusao_permanente(v_target_uid);
        END LOOP;
        RETURN 'OK';
    END IF;

    SELECT email, nome_completo, celular
    INTO v_email, v_nome, v_celular
    FROM public.usuarios
    WHERE id = uid_alvo;

    INSERT INTO public.usuarios_arquivados (id_usuario_original, nome, email, celular, conta_encerrada, data_encerramento)
    VALUES (uid_alvo, COALESCE(v_nome, ''), COALESCE(v_email, ''), COALESCE(v_celular, ''), TRUE, NOW())
    ON CONFLICT DO NOTHING;

    DELETE FROM auth.users WHERE id = uid_alvo;

    RETURN 'OK';
END;
$$;

-- =========================================================================
-- 7. ATUALIZA a trigger handle_new_user para incluir status
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    novo_espaco_id UUID;
    codigo_gerado TEXT;
BEGIN
    codigo_gerado := upper(substring(md5(random()::text), 1, 7));

    INSERT INTO public.usuarios (id, email, nome_completo, plano, moeda_base, codigo_identificacao, status)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nome_completo', ''),
        'free',
        'BRL',
        codigo_gerado,
        'ativo'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Busca espaço PF existente do usuário para evitar duplicações
    SELECT id INTO novo_espaco_id FROM public.espacos WHERE id_usuario = new.id AND tipo = 'PF' LIMIT 1;

    IF novo_espaco_id IS NULL THEN
        INSERT INTO public.espacos (id_usuario, nome, tipo)
        VALUES (new.id, 'Minha Vida (PF)', 'PF')
        ON CONFLICT DO NOTHING
        RETURNING id INTO novo_espaco_id;

        IF novo_espaco_id IS NULL THEN
            SELECT id INTO novo_espaco_id FROM public.espacos WHERE id_usuario = new.id AND tipo = 'PF' LIMIT 1;
        END IF;
    END IF;

    IF novo_espaco_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.contas WHERE id_espaco = novo_espaco_id AND nome_instituicao = 'Carteira Física') THEN
            INSERT INTO public.contas (id_espaco, nome_instituicao, moeda_conta, saldo_inicial)
            VALUES (novo_espaco_id, 'Carteira Física', 'BRL', 0.00)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.tags WHERE id_usuario = new.id LIMIT 1) THEN
        INSERT INTO public.tags (id_usuario, nome, cor) VALUES
        (new.id, 'Gastos Fixos', '#FF5733'),
        (new.id, 'Lazer', '#33FF57'),
        (new.id, 'Saúde', '#3357FF'),
        (new.id, 'Transporte', '#FF33A1'),
        (new.id, 'Não Categorizado', '#808080')
        ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.transacoes_participantes
    SET id_usuario_participante = new.id
    WHERE email_participante = new.email;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================
-- Migration 009: Gatilhos de Auditoria (Phase 9)
-- 1. Tabela audit_log
-- 2. Função genérica de log
-- 3. Triggers nas tabelas críticas (transacoes, caixinhas, bens_patrimonio, usuarios)
-- ============================================================

-- =========================================================================
-- 1. TABELA DE LOG DE AUDITORIA
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabela TEXT NOT NULL,
    operacao TEXT NOT NULL CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE')),
    id_registro UUID NOT NULL,
    dados_antigos JSONB DEFAULT NULL,
    dados_novos JSONB DEFAULT NULL,
    id_usuario UUID DEFAULT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Índices para consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_log_tabela ON public.audit_log (tabela);
CREATE INDEX IF NOT EXISTS idx_audit_log_id_registro ON public.audit_log (id_registro);
CREATE INDEX IF NOT EXISTS idx_audit_log_data ON public.audit_log (data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario ON public.audit_log (id_usuario);

-- RLS: somente service_role e o próprio dono do registro podem ler
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_self_service" ON public.audit_log;
CREATE POLICY "audit_log_self_service" ON public.audit_log
    FOR SELECT
    USING (
        id_usuario = auth.uid()
        OR auth.role() = 'service_role'
    );

-- Apenas service_role pode inserir (triggers internos)
DROP POLICY IF EXISTS "audit_log_service_insert" ON public.audit_log;
CREATE POLICY "audit_log_service_insert" ON public.audit_log
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

-- =========================================================================
-- 2. FUNÇÃO GENÉRICA DE AUDITORIA
-- =========================================================================

CREATE OR REPLACE FUNCTION public.trigger_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();

    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_log (tabela, operacao, id_registro, dados_antigos, id_usuario)
        VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, to_jsonb(OLD), v_uid);
        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_log (tabela, operacao, id_registro, dados_antigos, dados_novos, id_usuario)
        VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, to_jsonb(OLD), to_jsonb(NEW), v_uid);
        RETURN NEW;

    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_log (tabela, operacao, id_registro, dados_novos, id_usuario)
        VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, to_jsonb(NEW), v_uid);
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

-- =========================================================================
-- 3. TRIGGERS NAS TABELAS CRÍTICAS
-- =========================================================================

-- Transacoes
DROP TRIGGER IF EXISTS trg_audit_transacoes ON public.transacoes;
CREATE TRIGGER trg_audit_transacoes
    AFTER DELETE OR UPDATE ON public.transacoes
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

-- Caixinhas
DROP TRIGGER IF EXISTS trg_audit_caixinhas ON public.caixinhas;
CREATE TRIGGER trg_audit_caixinhas
    AFTER DELETE OR UPDATE ON public.caixinhas
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

-- Bens Patrimonio
DROP TRIGGER IF EXISTS trg_audit_bens_patrimonio ON public.bens_patrimonio;
CREATE TRIGGER trg_audit_bens_patrimonio
    AFTER DELETE OR UPDATE ON public.bens_patrimonio
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

-- Usuarios (apenas DELETE — dados sensíveis)
DROP TRIGGER IF EXISTS trg_audit_usuarios ON public.usuarios;
CREATE TRIGGER trg_audit_usuarios
    AFTER DELETE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

-- =========================================================================
-- 4. LIMPEZA DE LOGS ANTIGOS (retenção máxima de 1 ano)
-- =========================================================================

DROP FUNCTION IF EXISTS public.limpar_audit_log();
CREATE OR REPLACE FUNCTION public.limpar_audit_log()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.audit_log WHERE data_criacao < NOW() - INTERVAL '1 year';
END;
$$;
-- =========================================================================
-- MIGRAÇÃO: Tags Bancárias + Moeda na Transação (Sub-conta como Tag)
-- =========================================================================

-- 1. Nova tabela: tags_bancarias (labels de conta bancária)
CREATE TABLE IF NOT EXISTS public.tags_bancarias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cor TEXT DEFAULT '#6B7280' NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_bancarias_usuario ON public.tags_bancarias(id_usuario);

ALTER TABLE public.tags_bancarias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios podem gerenciar suas tags bancarias" ON public.tags_bancarias;
CREATE POLICY "Usuarios podem gerenciar suas tags bancarias"
    ON public.tags_bancarias FOR ALL
    USING (id_usuario = auth.uid());

-- 2. Novos campos em transacoes
ALTER TABLE public.transacoes
ADD COLUMN IF NOT EXISTS moeda_transacao TEXT DEFAULT 'BRL' NOT NULL,
ADD COLUMN IF NOT EXISTS id_tag_bancaria UUID REFERENCES public.tags_bancarias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_tag_bancaria ON public.transacoes(id_tag_bancaria) WHERE id_tag_bancaria IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transacoes_moeda ON public.transacoes(moeda_transacao);

-- 3. Migração de dados: copiar moeda da conta para moeda_transacao
UPDATE public.transacoes t
SET moeda_transacao = c.moeda_conta
FROM public.contas c
WHERE t.id_conta = c.id
  AND t.moeda_transacao = 'BRL'
  AND c.moeda_conta != 'BRL';

-- 4. Migrar contas secundárias para tags_bancarias (se houver múltiplas contas por espaço)
-- Para cada conta que NÃO seja a primeira do espaço, criar uma tag bancária
WITH contas_para_tag AS (
    SELECT
        c.id AS conta_id,
        c.id_espaco,
        c.nome_instituicao,
        e.id_usuario,
        ROW_NUMBER() OVER (PARTITION BY c.id_espaco ORDER BY c.data_criacao ASC) AS rn
    FROM public.contas c
    JOIN public.espacos e ON c.id_espaco = e.id
),
primeiras_contas AS (
    SELECT conta_id FROM contas_para_tag WHERE rn = 1
),
tags_criadas AS (
    INSERT INTO public.tags_bancarias (id_usuario, nome, cor)
    SELECT DISTINCT
        cpt.id_usuario,
        cpt.nome_instituicao,
        CASE cpt.nome_instituicao
            WHEN 'Nubank' THEN '#8B5CF6'
            WHEN 'Wise' THEN '#10B981'
            WHEN 'Wise USD' THEN '#10B981'
            WHEN 'Banco Inter' THEN '#FF6B00'
            WHEN 'Banco Inter PJ' THEN '#FF6B00'
            WHEN 'Bradesco' THEN '#CC092F'
            WHEN 'Santander' THEN '#EC0000'
            WHEN 'Itaú' THEN '#F68B1F'
            WHEN 'Caixa' THEN '#0066CC'
            WHEN 'Carteira Física' THEN '#6B7280'
            ELSE '#6B7280'
        END
    FROM contas_para_tag cpt
    WHERE cpt.rn > 1
      AND NOT EXISTS (
          SELECT 1 FROM public.tags_bancarias tb
          WHERE tb.id_usuario = cpt.id_usuario AND tb.nome = cpt.nome_instituicao
      )
    ON CONFLICT DO NOTHING
    RETURNING id, nome, id_usuario
)
-- Vincular transações das contas secundárias às tags criadas
UPDATE public.transacoes t
SET id_tag_bancaria = tb.id
FROM public.contas c
JOIN public.tags_bancarias tb ON tb.nome = c.nome_instituicao AND tb.id_usuario = (SELECT e.id_usuario FROM public.espacos e WHERE e.id = c.id_espaco)
WHERE t.id_conta = c.id
  AND c.id NOT IN (SELECT conta_id FROM primeiras_contas)
  AND t.id_tag_bancaria IS NULL;

-- 5. Atualizar o handle_new_user para criar tag "Investimentos" default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    novo_espaco_id UUID;
    codigo_gerado TEXT;
BEGIN
    codigo_gerado := upper(substring(md5(random()::text), 1, 7));

    INSERT INTO public.usuarios (id, email, nome_completo, plano, moeda_base, codigo_identificacao, status)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nome_completo', ''),
        'free',
        'BRL',
        codigo_gerado,
        'ativo'
    )
    ON CONFLICT (id) DO NOTHING;
    
    SELECT id INTO novo_espaco_id FROM public.espacos WHERE id_usuario = new.id AND tipo = 'PF' LIMIT 1;

    IF novo_espaco_id IS NULL THEN
        INSERT INTO public.espacos (id_usuario, nome, tipo)
        VALUES (new.id, 'Minha Vida (PF)', 'PF')
        ON CONFLICT DO NOTHING
        RETURNING id INTO novo_espaco_id;
        
        IF novo_espaco_id IS NULL THEN
            SELECT id INTO novo_espaco_id FROM public.espacos WHERE id_usuario = new.id AND tipo = 'PF' LIMIT 1;
        END IF;
    END IF;

    IF novo_espaco_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.contas WHERE id_espaco = novo_espaco_id AND nome_instituicao = 'Carteira Física') THEN
            INSERT INTO public.contas (id_espaco, nome_instituicao, moeda_conta, saldo_inicial)
            VALUES (novo_espaco_id, 'Carteira Física', 'BRL', 0.00)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- Tags de categoria padrão
    IF NOT EXISTS (SELECT 1 FROM public.tags WHERE id_usuario = new.id LIMIT 1) THEN
        INSERT INTO public.tags (id_usuario, nome, cor) VALUES
        (new.id, 'Gastos Fixos', '#FF5733'),
        (new.id, 'Lazer', '#33FF57'),
        (new.id, 'Saúde', '#3357FF'),
        (new.id, 'Transporte', '#FF33A1'),
        (new.id, 'Não Categorizado', '#808080')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Tags bancárias padrão
    IF NOT EXISTS (SELECT 1 FROM public.tags_bancarias WHERE id_usuario = new.id LIMIT 1) THEN
        INSERT INTO public.tags_bancarias (id_usuario, nome, cor) VALUES
        (new.id, 'Investimentos', '#10B981'),
        (new.id, 'Salário', '#3B82F6')
        ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.transacoes_participantes
    SET id_usuario_participante = new.id
    WHERE email_participante = new.email;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
