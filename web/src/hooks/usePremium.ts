import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { verificarAssinatura } from '../services/supabaseService';
import { captureError } from '../lib/sentry';

const FREE_CAIXINHA_LIMIT = 3;

export function usePremium() {
  const plano_usuario = useStore((state) => state.plano_usuario);
  const id_usuario = useStore((state) => state.id_usuario);
  const setPlanoUsuario = useStore((state) => state.setPlanoUsuario);
  const isPremium = plano_usuario === 'premium';

  // Middleware de Expiração: verifica assinatura no servidor ao montar
  useEffect(() => {
    if (!isSupabaseConfigured || !id_usuario) return;

    const check = async () => {
      const { data, error } = await verificarAssinatura(id_usuario);
      if (error) {
        captureError(new Error(error), { action: 'usePremium:verificarAssinatura' });
        return;
      }
      if (data === false) {
        setPlanoUsuario('free');
      }
    };
    check();
  }, [id_usuario, setPlanoUsuario]);

  const triggerCheckout = () => {
    window.dispatchEvent(new CustomEvent('open-checkout', { detail: { mensagem: '' } }));
  };

  const triggerPaywall = (reason: string) => {
    window.dispatchEvent(new CustomEvent('open-paywall', { detail: { reason } }));
  };

  const verificarAcessoImportacao = (): boolean => {
    if (!isPremium) {
      triggerPaywall('A importação de extratos (.xlsx, .pdf, .ofx, .csv) é um recurso Premium. Assine para importar sem limites.');
      return false;
    }
    return true;
  };

  const verificarLimiteCaixinhas = (currentCount: number): boolean => {
    if (!isPremium && currentCount >= FREE_CAIXINHA_LIMIT) {
      triggerPaywall(`O plano gratuito permite criar no máximo ${FREE_CAIXINHA_LIMIT} caixinhas de metas. Faça o upgrade para criar quantas quiser!`);
      return false;
    }
    return true;
  };

  const verificarAcessoMultiEspacos = (): boolean => {
    if (!isPremium) {
      triggerPaywall('A criação de múltiplos espaços de trabalho (PF/PJ) é exclusiva para assinantes Premium.');
      return false;
    }
    return true;
  };

  return {
    isPremium,
    showAds: !isPremium,
    canImportFiles: isPremium,
    triggerCheckout,
    triggerPaywall,
    verificarAcessoImportacao,
    verificarLimiteCaixinhas,
    verificarAcessoMultiEspacos,
  };
}
