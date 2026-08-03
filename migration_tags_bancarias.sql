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
