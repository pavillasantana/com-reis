import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '../store/useStore';
import { X, CreditCard, QrCode, CheckCircle, ShieldCheck, Copy } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../lib/theme';
import { divideMoney, convertCurrency } from '../utils/currency';

interface CheckoutModalProps {
  visible?: boolean;
  onClose?: () => void;
}

export const CheckoutModal = ({ visible, onClose: onCloseProp }: CheckoutModalProps = {}) => {
  const {
    isCheckoutOpen,
    isCheckoutModalVisible,
    checkoutMessage,
    setCheckoutOpen,
    setPlanoUsuario,
    cotacoes_moedas,
    showToast,
    id_usuario,
    toggleCheckoutModal,
  } = useStore();

  const isOpen = visible !== undefined ? visible : (isCheckoutOpen || isCheckoutModalVisible);
  const onClose = onCloseProp || (() => {
    setCheckoutOpen(false);
    toggleCheckoutModal(false);
  });

  const [metodo, setMetodo] = useState<'pix' | 'cartao'>('pix');
  const [processando, setProcessando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [gerandoPix, setGerandoPix] = useState(false);

  // Dados do PIX gerado pelo Mercado Pago
  const [pixQrBase64, setPixQrBase64] = useState<string | null>(null);
  const [pixCopiaCola, setPixCopiaCola] = useState<string | null>(null);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);

  // Cartão
  const [numeroCartao, setNumeroCartao] = useState('');
  const [nomeTitular, setNomeTitular] = useState('');
  const [validade, setValidade] = useState('');
  const [cvv, setCvv] = useState('');

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const precoBRL = 9.90;
  const precoUSD = convertCurrency(precoBRL, 'BRL', 'USD', cotacoes_moedas).toFixed(2);

  // Limpa ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setMetodo('pix');
      setProcessando(false);
      setSucesso(false);
      setGerandoPix(false);
      setPixQrBase64(null);
      setPixCopiaCola(null);
      setPixPaymentId(null);
      setNumeroCartao('');
      setNomeTitular('');
      setValidade('');
      setCvv('');
    } else {
      // Garante que o polling pare ao fechar
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
  }, [isOpen]);

  // Polling: consulta diretamente a coluna `plano` do usuário no Supabase
  const iniciarPolling = (paymentId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    console.log('[PIX] Polling iniciado para pagamento:', paymentId);

    pollingRef.current = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('usuarios')
          .select('plano')
          .eq('id', id_usuario)
          .single();

        if (data?.plano === 'premium') {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          await setPlanoUsuario('premium');
          setSucesso(true);
          showToast('🎉 Pagamento PIX aprovado! Bem-vindo ao Premium!', 'success');
          setTimeout(() => onClose(), 2800);
        }
      } catch (e) {
        console.warn('[PIX] Erro no polling:', e);
      }
    }, 3000);
  };

  // Gera cobrança PIX real no Mercado Pago
  const handleGerarPix = async () => {
    if (!id_usuario) {
      showToast('Usuário não identificado. Faça login novamente.', 'error');
      return;
    }

    setGerandoPix(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-create-payment', {
        body: {
          transactionId: id_usuario,
          amount: precoBRL,
          description: 'Com Réis PRO – Assinatura Mensal',
          payerEmail: 'pagador@comreis.com',
          mode: 'pix',
        },
      });

      console.log('[PIX] Response data:', JSON.stringify(data), 'error:', JSON.stringify(error));
      if (error) {
        console.error('[PIX] Edge Function error:', JSON.stringify(error));
        console.error('[PIX] Edge Function data:', JSON.stringify(data));
        throw new Error(error.message || JSON.stringify(error) || 'Erro ao chamar Edge Function');
      }

      if (!data?.ok) {
        throw new Error(data?.error || 'Erro ao criar pagamento PIX');
      }

      setPixQrBase64(data.qrCodeBase64);
      setPixCopiaCola(data.pixCopiaCola);
      setPixPaymentId(data.paymentId);
      iniciarPolling(data.paymentId);
    } catch (err: any) {
      console.error('[PIX] Erro ao gerar cobrança:', err);
      showToast('Não foi possível gerar o PIX: ' + err.message, 'error');
    } finally {
      setGerandoPix(false);
    }
  };

  const handleCopiarPix = async () => {
    if (!pixCopiaCola) return;
    await Clipboard.setStringAsync(pixCopiaCola);
    showToast('Código PIX copiado!', 'success');
  };

  const formatarNumeroCartao = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  const formatarValidade = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
    }
    return cleaned;
  };

  const handleFinalizarPagamento = async () => {
    if (metodo === 'cartao') {
      if (!numeroCartao || numeroCartao.length < 19) {
        showToast('Número de cartão de crédito inválido.', 'error');
        return;
      }
      if (!nomeTitular.trim()) {
        showToast('Insira o nome do titular do cartão.', 'error');
        return;
      }
      if (!validade || validade.length < 5) {
        showToast('Insira a data de validade (MM/AA).', 'error');
        return;
      }
      if (!cvv || cvv.length < 3) {
        showToast('Insira o código CVV correto.', 'error');
        return;
      }
    }

    setProcessando(true);
    // Simulação exigida: 3 segundos inteiros de processamento visual
    setTimeout(async () => {
      try {
        await setPlanoUsuario('premium');
        setProcessando(false);
        setSucesso(true);
        showToast('Parabéns! Sua assinatura Premium foi ativada com sucesso.', 'success');
      } catch (err: any) {
        setProcessando(false);
        showToast('Não foi possível processar a transação: ' + err.message, 'error');
      }
    }, 3000);
  };



  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.modalTitle}>Upgrade Premium 🥭</Text>
            </View>
            {!processando && !sucesso && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {sucesso ? (
            /* Tela de Sucesso */
            <View style={styles.successContainer}>
              <CheckCircle size={64} color={theme.colors.positive} style={{ marginBottom: 16 }} />
              <Text style={styles.successTitle}>Assinatura Ativada!</Text>
              <Text style={styles.successText}>
                Parabéns! Seu plano foi atualizado para Premium. Todos os recursos já foram desbloqueados.
              </Text>
              <TouchableOpacity 
                style={styles.successCloseBtn} 
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.successCloseBtnText}>Aproveitar Com Réis Premium</Text>
              </TouchableOpacity>
            </View>
          ) : processando ? (
            /* Tela de Carregamento/Processamento */
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginBottom: 16 }} />
              <Text style={styles.processingTitle}>Processando Assinatura...</Text>
              <Text style={styles.processingText}>
                Comunicando com o gateway de pagamento. Por favor, não feche o aplicativo.
              </Text>
            </View>
          ) : (
            /* Tela de Checkout */
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
              
              {/* Mensagem do Gatilho */}
              {checkoutMessage ? (
                <View style={styles.triggerMsgCard}>
                  <Text style={styles.triggerMsgText}>{checkoutMessage}</Text>
                </View>
              ) : null}

              {/* Detalhes do Plano */}
              <View style={styles.planDetailsCard}>
                <Text style={styles.planName}>Plano Com Réis PRO</Text>
                <Text style={styles.planPrice}>
                  R$ 9,90 <Text style={styles.planPeriod}>/ mês</Text>
                  <Text style={styles.planPriceUSD}> (ou US$ {precoUSD} / mês)</Text>
                </Text>
                <Text style={styles.planIncludes}>Inclui: Espaços PF/PJ Ilimitados, Caixinhas Ilimitadas, DDA Automático, Importador OFX/CSV e Multimoedas.</Text>
              </View>

              {/* Seletor de Método de Pagamento */}
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tabButton, metodo === 'pix' && styles.tabButtonActive]}
                  onPress={() => setMetodo('pix')}
                  activeOpacity={0.8}
                >
                  <QrCode size={18} color={metodo === 'pix' ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[styles.tabButtonText, metodo === 'pix' && styles.tabButtonTextActive]}>PIX</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.tabButton, metodo === 'cartao' && styles.tabButtonActive]}
                  onPress={() => setMetodo('cartao')}
                  activeOpacity={0.8}
                >
                  <CreditCard size={18} color={metodo === 'cartao' ? theme.colors.primary : theme.colors.textMuted} />
                  <Text style={[styles.tabButtonText, metodo === 'cartao' && styles.tabButtonTextActive]}>Cartão de Crédito</Text>
                </TouchableOpacity>
              </View>

              {metodo === 'pix' ? (
                /* Conteúdo PIX Real */
                <View style={styles.paymentSection}>
                  {!pixQrBase64 ? (
                    /* Estado: aguardando gerar PIX */
                    <View style={styles.pixGenerateContainer}>
                      <QrCode size={56} color={theme.colors.border} style={{ marginBottom: 16 }} />
                      <Text style={styles.pixGenerateTitle}>Pagamento via PIX</Text>
                      <Text style={styles.pixGenerateText}>
                        Clique abaixo para gerar o QR Code e o código Copia e Cola. O pagamento é instantâneo e confirmado automaticamente.
                      </Text>
                      <TouchableOpacity
                        style={[styles.payBtn, gerandoPix && { opacity: 0.7 }]}
                        onPress={handleGerarPix}
                        disabled={gerandoPix}
                        activeOpacity={0.8}
                      >
                        {gerandoPix
                          ? <ActivityIndicator color={theme.colors.bg} />
                          : <Text style={styles.payBtnText}>Gerar QR Code PIX – R$ {precoBRL.toFixed(2)}</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Estado: QR Code gerado */
                    <>
                      <View style={styles.qrCodePlaceholder}>
                        <Image
                          source={{ uri: `data:image/png;base64,${pixQrBase64}` }}
                          style={{ width: 200, height: 200 }}
                          resizeMode="contain"
                        />
                      </View>

                      <Text style={styles.paymentInstructions}>
                        Escaneie o QR Code no app do seu banco ou copie o código abaixo.
                      </Text>

                      <TouchableOpacity style={styles.copyPasteBtn} onPress={handleCopiarPix} activeOpacity={0.8}>
                        <Text style={styles.copyPasteBtnText} numberOfLines={1}>{pixCopiaCola}</Text>
                        <Copy size={14} color={theme.colors.primary} style={{ marginLeft: 8 }} />
                        <Text style={styles.copyLabel}>COPIAR</Text>
                      </TouchableOpacity>

                      <View style={styles.statusLiveIndicator}>
                        <ActivityIndicator size="small" color={theme.colors.positive} style={{ marginRight: 8 }} />
                        <Text style={styles.statusLiveText}>Aguardando confirmação automática do PIX...</Text>
                      </View>
                    </>
                  )}
                </View>
              ) : (
                /* Conteúdo Cartão de Crédito */
                <View style={styles.paymentSection}>
                  {/* Mock Visual do Cartão */}
                  <View style={styles.cardPreview}>
                    <Text style={styles.cardPreviewBrand}>MANGOS CARD</Text>
                    <Text style={styles.cardPreviewNumber}>
                      {numeroCartao || '•••• •••• •••• ••••'}
                    </Text>
                    <View style={styles.cardPreviewRow}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.cardPreviewLabel}>TITULAR</Text>
                        <Text style={styles.cardPreviewText} numberOfLines={1}>
                          {nomeTitular.toUpperCase() || 'NOME DO TITULAR'}
                        </Text>
                      </View>
                      <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <Text style={styles.cardPreviewLabel}>VALIDADE</Text>
                        <Text style={styles.cardPreviewText}>{validade || 'MM/AA'}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Inputs */}
                  <Text style={styles.inputLabel}>Número do Cartão</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0000 0000 0000 0000"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="numeric"
                    maxLength={19}
                    value={numeroCartao}
                    onChangeText={(t) => setNumeroCartao(formatarNumeroCartao(t))}
                  />

                  <Text style={styles.inputLabel}>Nome Impresso no Cartão</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="JOÃO SILVA"
                    placeholderTextColor={theme.colors.textMuted}
                    autoCapitalize="characters"
                    value={nomeTitular}
                    onChangeText={setNomeTitular}
                  />

                  <View style={styles.inputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Validade</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="MM/AA"
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="numeric"
                        maxLength={5}
                        value={validade}
                        onChangeText={(t) => setValidade(formatarValidade(t))}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>CVV</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="123"
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="numeric"
                        maxLength={4}
                        secureTextEntry
                        value={cvv}
                        onChangeText={setCvv}
                      />
                    </View>
                  </View>

                  <TouchableOpacity style={styles.payBtn} onPress={handleFinalizarPagamento} activeOpacity={0.8}>
                    <Text style={styles.payBtnText}>Assinar R$ 9,90/mês</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Selo de Segurança */}
              <View style={styles.securityRow}>
                <ShieldCheck size={14} color={theme.colors.positive} />
                <Text style={styles.securityText}>Ambiente de pagamento seguro e criptografado</Text>
              </View>

            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    ...theme.modalStyles.backdrop,
    justifyContent: 'flex-end',
  },
  modalContent: {
    ...theme.modalStyles.container,
    maxHeight: '90%',
    paddingBottom: theme.layout.paddingLg * 1.5,
  },
  modalHeader: {
    ...theme.modalStyles.header,
    paddingHorizontal: theme.layout.paddingLg * 1.25,
    paddingVertical: theme.layout.paddingLg * 1.125,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    color: theme.modalStyles.title.color,
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 9,
  },
  scrollContainer: {
    padding: theme.layout.paddingLg * 1.25,
  },
  triggerMsgCard: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderRadius: theme.layout.radiusMd / 1.5,
    padding: theme.layout.paddingMd,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    marginBottom: 16,
  },
  triggerMsgText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
  },
  planDetailsCard: {
    backgroundColor: theme.colors.bg,
    borderRadius: theme.layout.radiusMd,
    padding: theme.layout.paddingLg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
  },
  planName: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  planPrice: {
    color: theme.colors.ink,
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  planPeriod: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: 'normal',
  },
  planPriceUSD: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  planIncludes: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bg,
    borderRadius: theme.layout.radiusMd / 1.5,
    padding: theme.layout.paddingMd / 2.5,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: theme.layout.radiusMd / 2,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: theme.colors.cardBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.bg,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButtonText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabButtonTextActive: {
    color: theme.colors.primary,
  },
  paymentSection: {
    alignItems: 'center',
    width: '100%',
  },
  qrCodePlaceholder: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.layout.radiusMd,
    padding: theme.layout.paddingLg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
  },
  paymentInstructions: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  copyPasteBtn: {
    flexDirection: 'row',
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.layout.radiusMd / 2,
    height: 46,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  copyPasteBtnText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
  copyLabel: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  payBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.layout.radiusMd / 1.5,
    height: 50,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
  },
  payBtnText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  securityRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
  },
  securityText: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  cardPreview: {
    width: '100%',
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.layout.radiusMd,
    padding: theme.layout.paddingLg * 1.25,
    marginBottom: 20,
    elevation: 3,
  },
  cardPreviewBrand: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  cardPreviewNumber: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginVertical: 24,
  },
  cardPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardPreviewLabel: {
    color: theme.colors.textMuted,
    fontSize: 8,
  },
  cardPreviewText: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
    maxWidth: 180,
  },
  inputLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.bg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.layout.radiusMd / 2,
    height: 44,
    paddingHorizontal: 18,
    color: theme.colors.ink,
    fontSize: 13,
    width: '100%',
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  processingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  processingText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  successContainer: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: theme.colors.positive,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  successText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 15,
  },
  successCloseBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.layout.radiusMd / 1.5,
    height: 48,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCloseBtnText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: theme.layout.radiusMd / 2,
    paddingVertical: 15,
    paddingHorizontal: 18,
    marginBottom: 16,
    width: '100%',
  },
  statusLiveText: {
    color: theme.colors.positive,
    fontSize: 12,
    fontWeight: '600',
  },
  pixGenerateContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    width: '100%',
  },
  pixGenerateTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pixGenerateText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
});

export default CheckoutModal;
