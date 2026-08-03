-- =========================================================================
-- MANGOS APP: CORREÇÕES DE ESTABILIDADE (TRIGGER E MOTOR DE PERSISTÊNCIA)
-- =========================================================================

-- 1. Atualizar a trigger handle_new_user para garantir idempotência total
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    novo_espaco_id UUID;
BEGIN
    -- Insere o registro em usuarios (ON CONFLICT DO NOTHING)
    INSERT INTO public.usuarios (id, email, nome_completo, plano, moeda_base)
    VALUES (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nome_completo', ''),
        'free',
        'BRL'
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
