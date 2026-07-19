import { useStore } from '../store/useStore';

export function usePremium() {
  const { plano_usuario, setCheckoutOpen, setCheckoutMessage } = useStore();
  const isPremium = plano_usuario === 'premium';

  const triggerUpgrade = (mensagem: string) => {
    setCheckoutMessage(mensagem);
    setCheckoutOpen(true);
  };

  const verificarAcessoImportacao = () => {
    if (!isPremium) {
      triggerUpgrade('A importação de extratos (.xlsx, .pdf, .ofx, .csv) é um recurso Premium.');
      return false;
    }
    return true;
  };

  return {
    isPremium,
    showAds: !isPremium,
    canImportFiles: isPremium,
    triggerUpgrade,
    verificarAcessoImportacao
  };
}
