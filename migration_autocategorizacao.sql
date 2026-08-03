-- =========================================================================
-- MIGRAÇÃO: MOTOR DE AUTOCATEGORIZAÇÃO E TAGS
-- =========================================================================

-- 1. Alterar a tabela transacoes para incluir o vínculo de id_tag
ALTER TABLE public.transacoes 
ADD COLUMN IF NOT EXISTS id_tag UUID REFERENCES public.tags(id) ON DELETE SET NULL;

-- 2. Criar a tabela de regras_tags para autocategorização
CREATE TABLE IF NOT EXISTS public.regras_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    termo_busca TEXT NOT NULL,
    id_tag UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE(id_usuario, termo_busca)
);

-- Habilitar RLS para regras_tags
ALTER TABLE public.regras_tags ENABLE ROW LEVEL SECURITY;

-- Criar política de RLS para regras_tags se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'regras_tags' AND policyname = 'Usuários podem gerenciar suas próprias regras de tags'
    ) THEN
        CREATE POLICY "Usuários podem gerenciar suas próprias regras de tags"
            ON public.regras_tags FOR ALL
            USING (id_usuario = auth.uid());
    END IF;
END
$$;

-- 3. Atualizar o trigger handle_new_user para criar tags padrões ao nascer de um usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    novo_espaco_id UUID;
    espaco_existe BOOLEAN;
BEGIN
    INSERT INTO public.usuarios (id, email, nome_completo, plano, moeda_base)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nome_completo', ''),
        'free',
        'BRL'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Verifica se o usuário já possui algum espaço cadastrado
    SELECT EXISTS (
        SELECT 1 FROM public.espacos WHERE id_usuario = new.id
    ) INTO espaco_existe;

    IF NOT espaco_existe THEN
        -- Criação automática do primeiro espaço do usuário (Espaço Pessoal / PF)
        INSERT INTO public.espacos (id_usuario, nome, tipo)
        VALUES (new.id, 'Minha Vida (PF)', 'PF')
        RETURNING id INTO novo_espaco_id;

        -- Criação automática da primeira conta no espaço PF recém-criado
        INSERT INTO public.contas (id_espaco, nome_instituicao, moeda_conta, saldo_inicial)
        VALUES (novo_espaco_id, 'Carteira Física', 'BRL', 0.00);

        -- Criação automática das tags padrões predefinidas
        INSERT INTO public.tags (id_usuario, nome, cor) VALUES
        (new.id, 'Gastos Fixos', '#FF5733'),
        (new.id, 'Lazer', '#33FF57'),
        (new.id, 'Saúde', '#3357FF'),
        (new.id, 'Transporte', '#FF33A1'),
        (new.id, 'Não Categorizado', '#808080');
    END IF;

    -- Vincula retroativamente transações compartilhadas criadas antes do cadastro
    UPDATE public.transacoes_participantes
    SET id_usuario_participante = new.id
    WHERE email_participante = new.email;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Inserir retroativamente as tags padrões para usuários existentes que não as possuam
INSERT INTO public.tags (id_usuario, nome, cor)
SELECT u.id, t.nome, t.cor
FROM public.usuarios u
CROSS JOIN (
    VALUES 
        ('Gastos Fixos', '#FF5733'),
        ('Lazer', '#33FF57'),
        ('Saúde', '#3357FF'),
        ('Transporte', '#FF33A1'),
        ('Não Categorizado', '#808080')
) AS t(nome, cor)
WHERE NOT EXISTS (
    SELECT 1 FROM public.tags 
    WHERE id_usuario = u.id AND nome = t.nome
);
