import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export const usePaywall = () => {
  const { plano_usuario, verificarAssinaturaAtiva, toggleCheckoutModal, setCheckoutMessage } = useStore();

  const isPremium = plano_usuario === 'premium';

  // Middleware de Expiração: verifica assinatura no servidor ao montar
  useEffect(() => {
    verificarAssinaturaAtiva();
  }, []);

  const triggerUpgradeModal = (mensagem: string) => {
    setCheckoutMessage(mensagem);
    toggleCheckoutModal(true);
  };

  const verificarAcessoEspaco = (tipoEspaco: 'PF' | 'PJ'): boolean => {
    if (tipoEspaco === 'PJ' && !isPremium) {
      triggerUpgradeModal('A gestão de fluxo de caixa empresarial (PJ) está disponível apenas no plano Premium.');
      return false;
    }
    return true;
  };

  const verificarLimiteCaixinhas = (quantidadeCaixinhas: number): boolean => {
    if (quantidadeCaixinhas >= 3 && !isPremium) {
      triggerUpgradeModal('Você atingiu o limite de 3 caixinhas no plano gratuito.');
      return false;
    }
    return true;
  };

  const verificarAcessoDDA = (): boolean => {
    if (!isPremium) {
      triggerUpgradeModal('O Buscador Automático de Boletos (DDA) é um recurso exclusivo para assinantes Premium.');
      return false;
    }
    return true;
  };

  const verificarAcessoImportacao = (): boolean => {
    if (!isPremium) {
      triggerUpgradeModal('A importação automática de extratos bancários (OFX/CSV) é um recurso exclusivo para assinantes Premium.');
      return false;
    }
    return true;
  };

  return {
    isPremium,
    verificarAcessoEspaco,
    verificarLimiteCaixinhas,
    verificarAcessoDDA,
    verificarAcessoImportacao,
    triggerUpgradeModal
  };
};
export default usePaywall;
