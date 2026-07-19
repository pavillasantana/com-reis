-- Habilitar a extensão UUID se não estiver ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================================
-- 1. TABELA usuarios (Profiles vinculados ao auth.users do Supabase)
-- =========================================================================
CREATE TABLE public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    nome_completo TEXT,
    plano TEXT DEFAULT 'free' CHECK (plano IN ('free', 'premium')),
    moeda_base TEXT DEFAULT 'BRL' NOT NULL,
    data_nascimento DATE,
    documento TEXT,
    celular TEXT,
    codigo_identificacao TEXT UNIQUE,
    renda_principal NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    onboarding_completo BOOLEAN DEFAULT FALSE NOT NULL,
    avatar_url TEXT DEFAULT NULL,
    status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'pendente_exclusao')) NOT NULL,
    data_solicitacao_exclusao TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =========================================================================
-- 2. TABELA espacos (Workspaces - Divisão PF/PJ)
-- =========================================================================
CREATE TABLE public.espacos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('PF', 'PJ')),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =========================================================================
-- 3. TABELA contas (Carteiras/Bancos)
-- =========================================================================
CREATE TABLE public.contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_espaco UUID NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
    nome_instituicao TEXT NOT NULL,
    moeda_conta TEXT DEFAULT 'BRL' NOT NULL,
    saldo_inicial NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =========================================================================
-- 3.5. TABELA cartoes (Cartões de Crédito)
-- =========================================================================
CREATE TABLE public.cartoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_espaco UUID NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    limite NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    fatura_atual NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =========================================================================
-- 4. TABELA transacoes (Fluxo de Caixa)
-- =========================================================================
CREATE TABLE public.transacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_conta UUID NOT NULL REFERENCES public.contas(id) ON DELETE CASCADE,
    id_conta_destino UUID REFERENCES public.contas(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('receita', 'despesa', 'transferencia')),
    valor NUMERIC(15, 2) NOT NULL,
    categoria TEXT NOT NULL,
    id_tag UUID REFERENCES public.tags(id) ON DELETE SET NULL,
    data_transacao DATE DEFAULT CURRENT_DATE NOT NULL,
    taxa_cambio_dia NUMERIC(15, 6) DEFAULT 1.000000 NOT NULL,
    descricao TEXT,
    is_compartilhada BOOLEAN DEFAULT FALSE NOT NULL,
    participante_email TEXT,
    id_transacao_pai UUID REFERENCES public.transacoes(id) ON DELETE SET NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- =========================================================================
-- 5. TABELA caixinhas (Metas)
-- =========================================================================
CREATE TABLE public.caixinhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_espaco UUID NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    valor_alvo NUMERIC(15, 2) NOT NULL CHECK (valor_alvo > 0),
    saldo_guardado NUMERIC(15, 2) DEFAULT 0.00 NOT NULL CHECK (saldo_guardado >= 0),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- =========================================================================
-- 6. TABELA transacoes_participantes (Divisão de despesas / Rateio)
-- =========================================================================
CREATE TABLE public.transacoes_participantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_transacao UUID NOT NULL REFERENCES public.transacoes(id) ON DELETE CASCADE,
    id_usuario_participante UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
    email_participante TEXT NOT NULL,
    valor_devido NUMERIC(15, 2) NOT NULL,
    status_pagamento TEXT CHECK (status_pagamento IN ('Pendente', 'Pago')) DEFAULT 'Pendente' NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- =========================================================================
-- 15. TABELA DE ASSINATURAS (CONTROLE DE EXPIRAÇÃO PREMIUM)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.assinaturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(id_usuario, status)
);

CREATE INDEX IF NOT EXISTS idx_assinaturas_usuario ON public.assinaturas(id_usuario);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON public.assinaturas(status);
CREATE INDEX IF NOT EXISTS idx_assinaturas_data_fim ON public.assinaturas(data_fim);

ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias assinaturas"
    ON public.assinaturas FOR SELECT
    USING (id_usuario = auth.uid());

CREATE POLICY "Usuários podem inserir suas próprias assinaturas"
    ON public.assinaturas FOR INSERT
    WITH CHECK (id_usuario = auth.uid());

-- =========================================================================
-- FUNÇÃO verificar_assinatura
-- =========================================================================
CREATE OR REPLACE FUNCTION public.verificar_assinatura(uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ativa BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.assinaturas
        WHERE id_usuario = uid
          AND status = 'active'
          AND data_fim > NOW()
    ) INTO v_ativa;
    RETURN v_ativa;
END;
$$;

-- =========================================================================
-- FUNÇÃO criar_assinatura
-- =========================================================================
CREATE OR REPLACE FUNCTION public.criar_assinatura(uid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.assinaturas
    SET status = 'expired'
    WHERE id_usuario = uid AND status = 'active';
    INSERT INTO public.assinaturas (id_usuario, data_inicio, data_fim, status)
    VALUES (uid, NOW(), NOW() + INTERVAL '30 days', 'active');
    UPDATE public.usuarios
    SET plano = 'premium'
    WHERE id = uid AND plano != 'premium';
END;
$$;

-- =========================================================================
-- INDEXES PARA PERFORMANCE
-- =========================================================================
CREATE INDEX idx_espacos_usuario ON public.espacos(id_usuario);
CREATE INDEX idx_contas_espaco ON public.contas(id_espaco);
CREATE INDEX idx_cartoes_espaco ON public.cartoes(id_espaco);
CREATE INDEX idx_transacoes_conta ON public.transacoes(id_conta);
CREATE INDEX idx_transacoes_data ON public.transacoes(data_transacao);
CREATE INDEX idx_caixinhas_espaco ON public.caixinhas(id_espaco);
CREATE INDEX idx_transacoes_part_transacao ON public.transacoes_participantes(id_transacao);
CREATE INDEX idx_transacoes_part_usuario ON public.transacoes_participantes(id_usuario_participante);

-- Índices compostos para otimização do dashboard
CREATE INDEX IF NOT EXISTS idx_transacoes_conta_data ON public.transacoes(id_conta, data_transacao DESC);
CREATE INDEX IF NOT EXISTS idx_transacoes_conta_criacao ON public.transacoes(id_conta, data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_transacoes_deleted_at ON public.transacoes(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_caixinhas_historico_caixinha_data ON public.caixinhas_historico(id_caixinha, data_movimento DESC);
CREATE INDEX IF NOT EXISTS idx_caixinhas_deleted_at ON public.caixinhas(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bens_patrimonio_deleted_at ON public.bens_patrimonio(deleted_at) WHERE deleted_at IS NULL;

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) - SEGURANÇA
-- =========================================================================
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.espacos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixinhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_participantes ENABLE ROW LEVEL SECURITY;

-- Políticas para 'usuarios'
CREATE POLICY "Usuários podem ler o próprio perfil"
    ON public.usuarios FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar o próprio perfil"
    ON public.usuarios FOR UPDATE
    USING (auth.uid() = id);

-- Políticas para 'espacos'
CREATE POLICY "Usuários podem gerenciar seus próprios espaços"
    ON public.espacos FOR ALL
    USING (auth.uid() = id_usuario);

-- Políticas para 'contas'
CREATE POLICY "Usuários podem gerenciar contas nos seus espaços"
    ON public.contas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.espacos
            WHERE espacos.id = contas.id_espaco
            AND espacos.id_usuario = auth.uid()
        )
    );

-- Políticas para 'cartoes'
CREATE POLICY "Usuários podem gerenciar cartões nos seus espaços"
    ON public.cartoes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.espacos
            WHERE espacos.id = cartoes.id_espaco
            AND espacos.id_usuario = auth.uid()
        )
    );

-- Políticas para 'transacoes'
DROP POLICY IF EXISTS "Usuários podem gerenciar transações de suas contas" ON public.transacoes;

CREATE POLICY "transacoes_select"
    ON public.transacoes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.contas
            JOIN public.espacos ON contas.id_espaco = espacos.id
            WHERE contas.id = transacoes.id_conta
            AND espacos.id_usuario = auth.uid()
        )
        OR
        participante_email = (SELECT email FROM public.usuarios WHERE id = auth.uid())
    );

CREATE POLICY "transacoes_insert"
    ON public.transacoes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.contas
            JOIN public.espacos ON contas.id_espaco = espacos.id
            WHERE contas.id = transacoes.id_conta
            AND espacos.id_usuario = auth.uid()
        )
    );

CREATE POLICY "transacoes_update"
    ON public.transacoes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.contas
            JOIN public.espacos ON contas.id_espaco = espacos.id
            WHERE contas.id = transacoes.id_conta
            AND espacos.id_usuario = auth.uid()
        )
        OR
        participante_email = (SELECT email FROM public.usuarios WHERE id = auth.uid())
    );

CREATE POLICY "transacoes_delete"
    ON public.transacoes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.contas
            JOIN public.espacos ON contas.id_espaco = espacos.id
            WHERE contas.id = transacoes.id_conta
            AND espacos.id_usuario = auth.uid()
        )
    );

-- Políticas para 'caixinhas'
CREATE POLICY "Usuários podem gerenciar caixinhas nos seus espaços"
    ON public.caixinhas FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.espacos
            WHERE espacos.id = caixinhas.id_espaco
            AND espacos.id_usuario = auth.uid()
        )
    );

-- Políticas para 'transacoes_participantes'
DROP POLICY IF EXISTS "Usuários podem gerenciar participantes de despesas" ON public.transacoes_participantes;
DROP POLICY IF EXISTS "Usuários podem gerenciar participações de suas transações" ON public.transacoes_participantes;

CREATE POLICY "tp_select"
    ON public.transacoes_participantes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.transacoes
            JOIN public.contas ON transacoes.id_conta = contas.id
            JOIN public.espacos ON contas.id_espaco = espacos.id
            WHERE transacoes.id = transacoes_participantes.id_transacao
            AND espacos.id_usuario = auth.uid()
        )
        OR id_usuario_participante = auth.uid()
        OR email_participante = (SELECT email FROM public.usuarios WHERE id = auth.uid())
    );

CREATE POLICY "tp_insert"
    ON public.transacoes_participantes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.transacoes
            JOIN public.contas ON transacoes.id_conta = contas.id
            JOIN public.espacos ON contas.id_espaco = espacos.id
            WHERE transacoes.id = transacoes_participantes.id_transacao
            AND espacos.id_usuario = auth.uid()
        )
    );

CREATE POLICY "tp_update"
    ON public.transacoes_participantes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.transacoes
            JOIN public.contas ON transacoes.id_conta = contas.id
            JOIN public.espacos ON contas.id_espaco = espacos.id
            WHERE transacoes.id = transacoes_participantes.id_transacao
            AND espacos.id_usuario = auth.uid()
        )
        OR id_usuario_participante = auth.uid()
        OR email_participante = (SELECT email FROM public.usuarios WHERE id = auth.uid())
    );

CREATE POLICY "tp_delete"
    ON public.transacoes_participantes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.transacoes
            JOIN public.contas ON transacoes.id_conta = contas.id
            JOIN public.espacos ON contas.id_espaco = espacos.id
            WHERE transacoes.id = transacoes_participantes.id_transacao
            AND espacos.id_usuario = auth.uid()
        )
    );

-- =========================================================================
-- TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE USUÁRIO (Supabase Auth -> Public)
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
        -- Criação automática do primeiro espaço do usuário (Espaço Pessoal / PF)
        INSERT INTO public.espacos (id_usuario, nome, tipo)
        VALUES (new.id, 'Minha Vida (PF)', 'PF')
        ON CONFLICT DO NOTHING
        RETURNING id INTO novo_espaco_id;
        
        -- Fallback caso tenha sido criado concorrentemente
        IF novo_espaco_id IS NULL THEN
            SELECT id INTO novo_espaco_id FROM public.espacos WHERE id_usuario = new.id AND tipo = 'PF' LIMIT 1;
        END IF;
    END IF;

    -- Criação automática da primeira conta no espaço PF se não existir
    IF novo_espaco_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM public.contas WHERE id_espaco = novo_espaco_id AND nome_instituicao = 'Carteira Física') THEN
            INSERT INTO public.contas (id_espaco, nome_instituicao, moeda_conta, saldo_inicial)
            VALUES (novo_espaco_id, 'Carteira Física', 'BRL', 0.00)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- Criação automática das tags padrões predefinidas se não existir nenhuma tag para o usuário
    IF NOT EXISTS (SELECT 1 FROM public.tags WHERE id_usuario = new.id LIMIT 1) THEN
        INSERT INTO public.tags (id_usuario, nome, cor) VALUES
        (new.id, 'Gastos Fixos', '#FF5733'),
        (new.id, 'Lazer', '#33FF57'),
        (new.id, 'Saúde', '#3357FF'),
        (new.id, 'Transporte', '#FF33A1'),
        (new.id, 'Não Categorizado', '#808080')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Vincula retroativamente transações compartilhadas criadas antes do cadastro
    UPDATE public.transacoes_participantes
    SET id_usuario_participante = new.id
    WHERE email_participante = new.email;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- NOVAS FUNÇÕES: Fluxo de Exclusão de Conta (LGPD)
-- =========================================================================

-- Solicita exclusão: marca como pendente_exclusao com data
CREATE OR REPLACE FUNCTION public.solicitar_exclusao()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN RETURN 'ERRO: Usuário não autenticado.'; END IF;
    UPDATE public.usuarios SET status = 'pendente_exclusao', data_solicitacao_exclusao = NOW() WHERE id = v_uid;
    IF NOT FOUND THEN RETURN 'ERRO: Perfil de usuário não encontrado.'; END IF;
    RETURN 'OK';
END;
$$;

-- Cancela exclusão: volta para ativo
CREATE OR REPLACE FUNCTION public.cancelar_exclusao()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN RETURN 'ERRO: Usuário não autenticado.'; END IF;
    UPDATE public.usuarios SET status = 'ativo', data_solicitacao_exclusao = NULL WHERE id = v_uid AND status = 'pendente_exclusao';
    IF NOT FOUND THEN RETURN 'ERRO: Nenhuma solicitação de exclusão pendente encontrada.'; END IF;
    RETURN 'OK';
END;
$$;

-- Verifica status de exclusão do usuário logado
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
    IF v_uid IS NULL THEN RETURN jsonb_build_object('status', 'nao_autenticado'); END IF;
    SELECT jsonb_build_object(
        'status', COALESCE(u.status, 'ativo'),
        'data_solicitacao', u.data_solicitacao_exclusao,
        'dias_restantes', CASE
            WHEN u.status = 'pendente_exclusao' AND u.data_solicitacao_exclusao IS NOT NULL
            THEN GREATEST(0, 30 - EXTRACT(DAY FROM NOW() - u.data_solicitacao_exclusao)::INT)
            ELSE NULL
        END
    ) INTO v_result FROM public.usuarios u WHERE u.id = v_uid;
    RETURN COALESCE(v_result, jsonb_build_object('status', 'nao_encontrado'));
END;
$$;

-- Processa exclusão permanente (hard delete + arquivamento)
CREATE OR REPLACE FUNCTION public.processar_exclusao_permanente(uid_alvo UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_email TEXT; v_nome TEXT; v_celular TEXT; v_target_uid UUID;
BEGIN
    IF auth.role() != 'service_role' AND uid_alvo IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: você só pode excluir sua própria conta';
    END IF;
    IF uid_alvo IS NULL THEN
        FOR v_target_uid IN SELECT id FROM public.usuarios WHERE status = 'pendente_exclusao' AND data_solicitacao_exclusao IS NOT NULL AND data_solicitacao_exclusao < NOW() - INTERVAL '30 days' LOOP
            PERFORM public.processar_exclusao_permanente(v_target_uid);
        END LOOP;
        RETURN 'OK';
    END IF;
    SELECT email, nome_completo, celular INTO v_email, v_nome, v_celular FROM public.usuarios WHERE id = uid_alvo;
    INSERT INTO public.usuarios_arquivados (id_usuario_original, nome, email, celular, conta_encerrada, data_encerramento)
    VALUES (uid_alvo, COALESCE(v_nome, ''), COALESCE(v_email, ''), COALESCE(v_celular, ''), TRUE, NOW())
    ON CONFLICT DO NOTHING;
    DELETE FROM auth.users WHERE id = uid_alvo;
    RETURN 'OK';
END;
$$;

-- Tabela de arquivamento mínimo (LGPD)
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
CREATE POLICY "Apenas service_role pode ver arquivados" ON public.usuarios_arquivados FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "Apenas service_role pode inserir arquivados" ON public.usuarios_arquivados FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- =========================================================================
-- 8. TABELA DE TAGS E CATEGORIAS PERSONALIZADAS
-- =========================================================================
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    cor TEXT NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar suas próprias tags"
    ON public.tags FOR ALL
    USING (id_usuario = auth.uid());

-- =========================================================================
-- 9. TABELA DE ATIVOS DE PATRIMÔNIO
-- =========================================================================
CREATE TABLE public.ativos_patrimonio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('acao', 'fiis', 'cripto', 'moeda')),
    quantidade NUMERIC(15, 6) DEFAULT 0.00 NOT NULL,
    preco_medio NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    cotacao_atual NUMERIC(15, 2) DEFAULT 0.00 NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.ativos_patrimonio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar seus próprios ativos"
    ON public.ativos_patrimonio FOR ALL
    USING (id_usuario = auth.uid());

-- =========================================================================
-- 10. TABELA DE TRANSAÇÕES DE ATIVOS (COMPRA/VENDA)
-- =========================================================================
CREATE TABLE public.transacoes_ativos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'venda')),
    quantidade NUMERIC(15, 6) NOT NULL,
    preco_unitario NUMERIC(15, 2) NOT NULL,
    data_transacao DATE DEFAULT CURRENT_DATE NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.transacoes_ativos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar suas transações de ativos"
    ON public.transacoes_ativos FOR ALL
    USING (id_usuario = auth.uid());

-- =========================================================================
-- 11. TABELA DE HISTÓRICO DE PROVENTOS (DIVIDENDOS)
-- =========================================================================
CREATE TABLE public.proventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('dividendo', 'jcp', 'rendimento')),
    valor NUMERIC(15, 2) NOT NULL,
    data_pagamento DATE DEFAULT CURRENT_DATE NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE public.proventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar seus proventos"
    ON public.proventos FOR ALL
    USING (id_usuario = auth.uid());

-- =========================================================================
-- 12. TABELA DE REGRAS DE AUTOCATEGORIZAÇÃO (REGRAS_TAGS)
-- =========================================================================
CREATE TABLE public.regras_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    termo_busca TEXT NOT NULL,
    id_tag UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(id_usuario, termo_busca)
);

ALTER TABLE public.regras_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar suas próprias regras de tags"
    ON public.regras_tags FOR ALL
    USING (id_usuario = auth.uid());

-- =========================================================================
-- 13. TABELA DE HISTÓRICO DE CAIXINHAS (APORTES E RESGATES)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.caixinhas_historico (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caixinha_id UUID NOT NULL REFERENCES public.caixinhas(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('aporte', 'resgate')),
    valor NUMERIC(15, 2) NOT NULL CHECK (valor > 0),
    descricao TEXT DEFAULT '' NOT NULL,
    data_movimento DATE DEFAULT CURRENT_DATE NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_caixinhas_historico_caixinha
    ON public.caixinhas_historico(caixinha_id);

ALTER TABLE public.caixinhas_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar histórico das suas caixinhas"
    ON public.caixinhas_historico FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.caixinhas
            JOIN public.espacos ON caixinhas.id_espaco = espacos.id
            WHERE caixinhas.id = caixinhas_historico.caixinha_id
            AND espacos.id_usuario = auth.uid()
        )
    );

-- =========================================================================
-- 14. TABELA DE INVENTÁRIO DE BENS (PATRIMÔNIO FÍSICO)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.bens_patrimonio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_espaco UUID NOT NULL REFERENCES public.espacos(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    valor_compra NUMERIC(15, 2) NOT NULL CHECK (valor_compra >= 0),
    data_aquisicao DATE DEFAULT CURRENT_DATE NOT NULL,
    categoria TEXT DEFAULT 'Outros' NOT NULL,
    descricao TEXT DEFAULT '' NOT NULL,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_bens_patrimonio_espaco
    ON public.bens_patrimonio(id_espaco);

ALTER TABLE public.bens_patrimonio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar bens nos seus espaços"
    ON public.bens_patrimonio FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.espacos
            WHERE espacos.id = bens_patrimonio.id_espaco
            AND espacos.id_usuario = auth.uid()
        )
    );

-- =========================================================================
-- AUDIT LOG (Gatilhos de Auditoria — Phase 9)
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

CREATE INDEX IF NOT EXISTS idx_audit_log_tabela ON public.audit_log (tabela);
CREATE INDEX IF NOT EXISTS idx_audit_log_id_registro ON public.audit_log (id_registro);
CREATE INDEX IF NOT EXISTS idx_audit_log_data ON public.audit_log (data_criacao DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario ON public.audit_log (id_usuario);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "audit_log_self_service" ON public.audit_log
    FOR SELECT
    USING (
        id_usuario = auth.uid()
        OR auth.role() = 'service_role'
    );

CREATE POLICY IF NOT EXISTS "audit_log_service_insert" ON public.audit_log
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role');

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
        VALUES (TG_TABLE_NAME, 'DELETE', OLD.id, row_to_jsonb(OLD), v_uid);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_log (tabela, operacao, id_registro, dados_antigos, dados_novos, id_usuario)
        VALUES (TG_TABLE_NAME, 'UPDATE', NEW.id, row_to_jsonb(OLD), row_to_jsonb(NEW), v_uid);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_log (tabela, operacao, id_registro, dados_novos, id_usuario)
        VALUES (TG_TABLE_NAME, 'INSERT', NEW.id, row_to_jsonb(NEW), v_uid);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_transacoes ON public.transacoes;
CREATE TRIGGER trg_audit_transacoes
    AFTER DELETE OR UPDATE ON public.transacoes
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_caixinhas ON public.caixinhas;
CREATE TRIGGER trg_audit_caixinhas
    AFTER DELETE OR UPDATE ON public.caixinhas
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_bens_patrimonio ON public.bens_patrimonio;
CREATE TRIGGER trg_audit_bens_patrimonio
    AFTER DELETE OR UPDATE ON public.bens_patrimonio
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

DROP TRIGGER IF EXISTS trg_audit_usuarios ON public.usuarios;
CREATE TRIGGER trg_audit_usuarios
    AFTER DELETE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_log();

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
-- ÍNDICES ADICIONAIS (Migration 010 — Performance)
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_usuarios_status ON public.usuarios (status);
CREATE INDEX IF NOT EXISTS idx_usuarios_data_exclusao ON public.usuarios (data_solicitacao_exclusao) WHERE data_solicitacao_exclusao IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tags_usuario ON public.tags (id_usuario);
CREATE INDEX IF NOT EXISTS idx_ativos_patrimonio_usuario ON public.ativos_patrimonio (id_usuario);
CREATE INDEX IF NOT EXISTS idx_transacoes_ativos_usuario ON public.transacoes_ativos (id_usuario);
CREATE INDEX IF NOT EXISTS idx_proventos_usuario ON public.proventos (id_usuario);
CREATE INDEX IF NOT EXISTS idx_usuarios_arquivados_original ON public.usuarios_arquivados (id_usuario_original);

