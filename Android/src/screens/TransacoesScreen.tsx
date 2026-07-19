import React, { useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  Modal, 
  ScrollView, 
  TextInput, 
  Share, 
  Linking,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Logo } from '../components/Logo';
import { useStore } from '../store/useStore';
import { usePaywall } from '../hooks/usePaywall';
import { formatCurrency, convertCurrency } from '../utils/currency';
import { parseOFX, ParsedBankTransaction } from '../utils/parseOFX';
import { parseCSV } from '../utils/parseCSV';
import { parsePDF } from '../utils/parsePDF';
import { decode } from 'base64-arraybuffer';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import * as Clipboard from 'expo-clipboard';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  Calendar, 
  Lock, 
  ScanLine, 
  Upload, 
  X, 
  Check, 
  Trash2, 
  Info,
  DollarSign,
  Share2,
  Mail,
  Edit2,
  CheckCircle,
  Circle
} from 'lucide-react-native';
import { theme } from '../lib/theme';
import { AdBanner } from '../components/AdBanner';
import { useI18n } from '../hooks/useI18n';

// Auxiliares de Data e Geração de UUID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const aplicarMascaraData = (text: string): string => {
  const cleaned = text.replace(/\D/g, '');
  const limited = cleaned.slice(0, 8);
  if (limited.length <= 2) return limited;
  if (limited.length <= 4) return `${limited.slice(0, 2)}/${limited.slice(2)}`;
  return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
};

const deBrParaIso = (dataBr: string): string => {
  const parts = dataBr.split('/');
  if (parts.length === 3) {
    const dia = parts[0].padStart(2, '0');
    const mes = parts[1].padStart(2, '0');
    const ano = parts[2];
    if (ano.length === 4) {
      return `${ano}-${mes}-${dia}`;
    }
  }
  return new Date().toISOString().split('T')[0];
};

const deIsoParaBr = (dataIso: string): string => {
  if (!dataIso) return '';
  const parts = dataIso.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataIso;
};

const autoCategorizarInvestimentos = (transacoes: ParsedBankTransaction[]): ParsedBankTransaction[] => {
  const termosProventos = ['provento', 'dividendo', 'jcp', 'juros s/ capital', 'rendimento de', 'resgate rdb', 'resgate cdb', 'resgate fundo', 'resgate liquidez', 'renda fixa'];
  const termosAcoes = ['compra acao', 'compra ação', 'compra acoes', 'compra ações', 'subscricao', 'subscrição', 'boleto investimento', 'app investor', 'nu invest', 'clear', 'btg'];
  
  const tickerRegex = /\b([A-Z]{4}\d{1,2})\b/g;

  return transacoes.map(t => {
    const desc = (t.descricao || '').toLowerCase();
    const cat = (t.categoria || '').toLowerCase();
    
    if (t.tipo === 'receita') {
      if (termosProventos.some(termo => desc.includes(termo))) {
        return { ...t, categoria: 'Proventos' };
      }
    } else if (t.tipo === 'despesa') {
      const hasTicker = tickerRegex.test(t.descricao || '');
      tickerRegex.lastIndex = 0;
      if (hasTicker || termosAcoes.some(termo => desc.includes(termo))) {
        return { ...t, categoria: 'Investimentos' };
      }
    }
    return t;
  });
};

export const TransacoesScreen = () => {
  const { 
    getTransacoesEspacoAtivo, 
    moeda_base, 
    cotacoes_moedas,
    getContasEspacoAtivo, 
    addTransacoesBulk,
    updateTransacaoValor,
    updateTransacao,
    deleteTransacao,
    addProvento,
    addTransacaoAtivo,
    addTransacao,
    addConta,
    espacos,
    id_espaco_ativo,
  } = useStore();
  const { isPremium, verificarAcessoDDA, verificarAcessoImportacao } = usePaywall();
  
  const { t } = useI18n();

  const transacoes = getTransacoesEspacoAtivo();
  const contas = getContasEspacoAtivo();

  const obterValorConvertido = (t: any) => {
    if (!t) return 0;
    const conta = contas.find(c => c.id === t.id_conta);
    const moedaOrigem = conta ? conta.moeda_conta : moeda_base;
    return convertCurrency(t.valor, moedaOrigem, moeda_base, cotacoes_moedas);
  };

  // Aba ativa: 'historico' ou 'fechamento'
  const [abaAtiva, setAbaAtiva] = useState<'historico' | 'fechamento'>('historico');

  // Controle de Modal de Revisão
  const [modalRevisaoVisible, setModalRevisaoVisible] = useState(false);
  const [transacoesRevisar, setTransacoesRevisar] = useState<ParsedBankTransaction[]>([]);
  const [contaDestinoImportacao, setContaDestinoImportacao] = useState<string>('');
  const importandoRef = useRef(false);
  
  // Estados para edição de transação
  const [modalEdicaoVisible, setModalEdicaoVisible] = useState(false);
  const [transacaoSelecionada, setTransacaoSelecionada] = useState<any>(null);
  const [editDescricao, setEditDescricao] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editValor, setEditValor] = useState('');
  const [editData, setEditData] = useState('');

  // Estado para controlar valores editados inline no fechamento mensal
  const [valoresEditados, setValoresEditados] = useState<Record<string, string>>({});
  const [apenasCompartilhadas, setApenasCompartilhadas] = useState(false);

  // Estado para seleção múltipla (exclusão em massa)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelectItem = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      if (next.size === 0) setIsSelectMode(false);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      t('bulk_delete_title'),
      t('bulk_delete_confirm').replace('{count}', String(selectedIds.size)),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of selectedIds) {
                await deleteTransacao(id);
              }
              Alert.alert(t('success'), t('bulk_delete_success').replace('{count}', String(selectedIds.size)));
              setIsSelectMode(false);
              setSelectedIds(new Set());
            } catch (err: any) {
              Alert.alert(t('error_deleting'), err.message || t('unknown_error'));
            }
          }
        }
      ]
    );
  }, [selectedIds, deleteTransacao]);

  const handleAbrirEdicao = (item: any) => {
    setTransacaoSelecionada(item);
    setEditDescricao(item.descricao || '');
    setEditCategoria(item.categoria || '');
    setEditValor(String(item.valor || ''));
    setEditData(deIsoParaBr(item.data_transacao));
    setModalEdicaoVisible(true);
  };

  const handleSalvarEdicao = async () => {
    if (!transacaoSelecionada) return;
    if (!editCategoria.trim()) {
      Alert.alert(t('error'), t('category_empty'));
      return;
    }
    const valNum = parseFloat(editValor);
    if (isNaN(valNum) || valNum <= 0) {
      Alert.alert(t('error'), t('invalid_value'));
      return;
    }

    const dataIso = deBrParaIso(editData);

    try {
      await updateTransacao(transacaoSelecionada.id, {
        descricao: editDescricao.trim() || undefined,
        categoria: editCategoria.trim(),
        valor: valNum,
        data_transacao: dataIso
      });
      setModalEdicaoVisible(false);
      setTransacaoSelecionada(null);
      Alert.alert(t('success'), t('transaction_updated'));
    } catch (err: any) {
      Alert.alert(t('error_updating'), err.message || t('unknown_error'));
    }
  };

  const handleExcluirEdicao = () => {
    if (!transacaoSelecionada) return;
    Alert.alert(
      t('confirm_deletion'),
      t('delete_transaction_confirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { 
          text: t('delete'), 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteTransacao(transacaoSelecionada.id);
              setModalEdicaoVisible(false);
              setTransacaoSelecionada(null);
              Alert.alert(t('success'), t('transaction_deleted'));
            } catch (err: any) {
              Alert.alert(t('error_deleting'), err.message || t('unknown_error'));
            }
          }
        }
      ]
    );
  };

  // DDA Query
  const handleDDAQuery = () => {
    if (verificarAcessoDDA()) {
      Alert.alert(t('dda_search_title'), t('dda_no_results'));
    }
  };

  // Importar Extrato
  const handleImportarExtrato = async () => {
    if (!verificarAcessoImportacao()) {
      return;
    }

    if (contas.length === 0) {
      Alert.alert(t('warning'), t('importar_aviso'));
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/xlsx',
          'application/xls',
          'text/comma-separated-values',
          'application/pdf',
          'application/x-ofx',
          'text/plain',
          '*/*'
        ],
        copyToCacheDirectory: true
      });

      if (result.canceled) return;

      const fileAsset = result.assets[0];
      const fileUri = fileAsset.uri;
      let fileName = (fileAsset.name || '').toLowerCase();
      const mimeType = fileAsset.mimeType || '';
      console.log('[IMPORT] Arquivo selecionado:', { fileName, mimeType, uri: fileUri });

      // Fallback: detectar extensão pelo MIME type se o nome não tiver extensão
      const hasValidExt = /\.(xlsx?|csv|ofx|pdf)$/i.test(fileName);
      if (!hasValidExt) {
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          fileName += '.xlsx';
          console.log('[IMPORT] Extensão adicionada via MIME: .xlsx');
        } else if (mimeType === 'text/csv' || mimeType === 'application/csv' || mimeType === 'text/comma-separated-values') {
          fileName += '.csv';
          console.log('[IMPORT] Extensão adicionada via MIME: .csv');
        } else if (mimeType === 'application/pdf') {
          fileName += '.pdf';
          console.log('[IMPORT] Extensão adicionada via MIME: .pdf');
        } else {
          console.log('[IMPORT] MIME não identificado:', mimeType, '- tentando ler como XLSX');
          fileName += '.xlsx';
        }
      }

      let parsedTrans: ParsedBankTransaction[] = [];

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        console.log('[IMPORT] Processando arquivo XLS/XLSX:', fileName);
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log('[IMPORT] Base64 lido, tamanho:', base64.length);
        const wb = XLSX.read(base64, { type: 'base64', cellDates: false, raw: true });
        console.log('[IMPORT] Workbook parseado, sheets:', wb.SheetNames);
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true, blankrows: false });
        console.log('[IMPORT] Total de linhas extraídas:', rows.length);
        if (rows.length > 0) {
          console.log('[IMPORT] Cabeçalhos (keys):', Object.keys(rows[0]));
          console.log('[IMPORT] Primeira linha:', JSON.stringify(rows[0]));
        }

        if (!rows || rows.length === 0) {
          Alert.alert(t('error'), `${t('importar_erro_nenhum')} (XLSX). Verifique se o arquivo possui dados.`);
          return;
        }

        parsedTrans = rows
          .filter((row) => {
            const valor = Object.values(row).find((v) => {
              const s = String(v).replace(/[R$\s]/g, '').trim();
              if (!s) return false;
              const isBR = /,\d{2}$/.test(s);
              const num = isBR ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s.replace(',', '.'));
              return !isNaN(num) && num !== 0;
            });
            return Boolean(valor);
          })
          .map((row, i) => {
            const keys = Object.keys(row).map((k) => k.toLowerCase());
            const getVal = (...names: string[]) => {
              for (const n of names) {
                const found = Object.keys(row).find((k) => k.toLowerCase().includes(n));
                if (found) return row[found];
              }
              return '';
            };

            const valorRaw = getVal('valor', 'value', 'amount', 'montante', 'saldo', 'credito', 'debito', 'movimento', 'lancamento', 'total');
            const parseValorLocal = (v: unknown): number => {
              if (typeof v === 'number') return Math.abs(v);
              const s = String(v).replace(/[R$\s]/g, '').trim();
              if (!s) return 0;
              const isBR = /,\d{2}$/.test(s);
              const num = isBR ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s.replace(',', '.'));
              return isNaN(num) ? 0 : Math.abs(num);
            };
            const valorNum = parseValorLocal(valorRaw);

            const dataRaw = getVal('data', 'date', 'dt', 'vencimento', 'lancamento', 'dia', 'periodo');
            let dataStr = new Date().toISOString().split('T')[0];
            if (typeof dataRaw === 'number') {
              const excelEpoch = new Date(1900, 0, 1);
              dataStr = new Date(excelEpoch.getTime() + (dataRaw - 2) * 86400000).toISOString().split('T')[0];
            } else if (dataRaw) {
              const brMatch = String(dataRaw).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
              if (brMatch) dataStr = `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
              else dataStr = String(dataRaw).substring(0, 10);
            }

            const tipoRaw = String(getVal('tipo', 'type', 'natureza') || '').toLowerCase();
            const tipo: 'receita' | 'despesa' =
              tipoRaw.includes('receita') || tipoRaw.includes('credit') || tipoRaw === 'c'
                ? 'receita'
                : tipoRaw.includes('despesa') || tipoRaw.includes('debit') || tipoRaw === 'd'
                ? 'despesa'
                : (() => {
                    const s = String(valorRaw).replace(/[R$\s]/g, '').trim();
                    const isBR = /,\d{2}$/.test(s);
                    const num = isBR ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : parseFloat(s.replace(',', '.'));
                    return !isNaN(num) && num < 0 ? 'despesa' : 'receita';
                  })();

            const descricao = String(getVal('descricao', 'descri', 'historico', 'memo', 'description', 'histórico', 'obs', 'observacao', 'complemento', 'detalhe') || '').trim();
            const categoria = String(getVal('categoria', 'category', 'cat') || descricao || 'Importado').trim();

            return {
              id: `xlsx-${Date.now()}-${i}`,
              tipo,
              valor: valorNum,
              categoria: categoria || 'Importado',
              descricao,
              data_transacao: dataStr,
            } as ParsedBankTransaction;
          })
          .filter((t) => t.valor > 0);

        console.log('[IMPORT] XLSX transações mapeadas:', parsedTrans.length);
        if (parsedTrans.length > 0) {
          console.log('[IMPORT] Primeira transação:', JSON.stringify(parsedTrans[0]));
        }

        if (parsedTrans.length === 0) {
          Alert.alert(t('error'), `${t('importar_erro_nenhum')} Verifique se as colunas estão corretas (data, valor, tipo, categoria).\n\nDica: o arquivo deve conter colunas como Data/Data, Valor/Value e Tipo/Type.`);
          return;
        }

      } else if (fileName.endsWith('.ofx')) {
        const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
        parsedTrans = parseOFX(fileContent);
      } else if (fileName.endsWith('.csv')) {
        const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
        parsedTrans = parseCSV(fileContent);
      } else if (fileName.endsWith('.pdf')) {
        const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        const arrayBuffer = decode(base64);
        parsedTrans = await parsePDF(arrayBuffer);
      } else {
        Alert.alert(t('error'), t('importar_formato_invalido'));
        return;
      }

      if (parsedTrans.length === 0) {
        Alert.alert(t('error'), `${t('importar_erro_nenhum')} Verifique o formato.`);
        return;
      }

      // Detecta banco pelo nome do arquivo
      const nomeArquivo = (fileAsset.name || '').toLowerCase();
      const bancosDetectados: Record<string, string> = {
        // Brasil
        'nubank': 'Nubank', 'nu ': 'Nubank', 'nu_bank': 'Nubank',
        'inter': 'Banco Inter', 'bancointer': 'Banco Inter',
        'itau': 'Itaú', 'itaú': 'Itaú', 'itau personnalite': 'Itaú',
        'bradesco': 'Bradesco', 'brad': 'Bradesco',
        'santander': 'Santander',
        'bb': 'Banco do Brasil', 'banco do brasil': 'Banco do Brasil',
        'caixa': 'Caixa Econômica', 'cef': 'Caixa Econômica',
        'brb': 'BRB', 'banco bs2': 'BS2', 'bs2': 'BS2',
        'c6': 'C6 Bank', 'c6 bank': 'C6 Bank',
        'original': 'Banco Original', 'original bank': 'Banco Original',
        'neon': 'Neon', 'picpay': 'PicPay', 'pic pay': 'PicPay',
        'mercadopago': 'Mercado Pago', 'mercado pago': 'Mercado Pago', 'rappi': 'Rappi',
        'pagseguro': 'PagSeguro', 'pag seguro': 'PagSeguro',
        'stone': 'Stone', 'gerencianet': 'Gerencianet', 'gifpay': 'Gerencianet',
        'recarga': 'RecargaPay',
        // Investimentos BR
        'btg': 'BTG Pactual', 'xp': 'XP Investimentos', 'xp investimentos': 'XP Investimentos',
        'clear': 'Clear Corretora', 'modal': 'Modal', 'modalmais': 'Modal',
        'rico': 'Rico', 'easynvest': 'Easynvest', 'toro': 'Toro',
        'hashdex': 'Hashdex', 'flow': 'Flow',
        // EUA
        'chase': 'Chase', 'jpmorgan': 'Chase', 'jpm': 'Chase',
        'bank of america': 'Bank of America', 'boa': 'Bank of America', 'mlife': 'Bank of America',
        'wells fargo': 'Wells Fargo', 'wf': 'Wells Fargo',
        'citi': 'Citibank', 'citibank': 'Citibank', 'citicorp': 'Citibank',
        'capital one': 'Capital One', 'capitalone': 'Capital One',
        'discover': 'Discover', 'usaa': 'USAA',
        'td bank': 'TD Bank', 'pnc': 'PNC Bank',
        'ally': 'Ally Bank', 'sofi': 'SoFi', 'chime': 'Chime',
        'venmo': 'Venmo', 'paypal': 'PayPal', 'cashapp': 'Cash App', 'cash app': 'Cash App',
        'zelle': 'Zelle',
        // Europa
        'revolut': 'Revolut', 'monzo': 'Monzo', 'starling': 'Starling',
        'n26': 'N26', 'bunq': 'Bunq', 'wise': 'Wise', 'transferwise': 'Wise',
        'deutsche bank': 'Deutsche Bank', 'commerzbank': 'Commerzbank',
        'bbva': 'BBVA', 'sabadell': 'Sabadell', 'caixabank': 'CaixaBank',
        'bnl': 'BNL', 'intesa': 'Intesa Sanpaolo', 'unicredit': 'UniCredit',
        'ing': 'ING', 'rabobank': 'Rabobank', 'abn amro': 'ABN AMRO',
        'hsbc': 'HSBC', 'barclays': 'Barclays', 'lloyds': 'Lloyds',
        'natwest': 'NatWest', 'santander uk': 'Santander UK',
        // Latam
        'davivienda': 'Davivienda', 'bancolombia': 'Bancolombia', 'nequi': 'Nequi',
        'banco de chile': 'Banco de Chile', 'scotiabank': 'Scotiabank',
        // Asia/Oceania
        'anz': 'ANZ', 'commonwealth': 'Commonwealth Bank', 'westpac': 'Westpac',
        'nab': 'NAB',
        'db': 'DBS', 'dbs': 'DBS',
        'icbc': 'ICBC', 'ccb': 'CCB', 'boc': 'Bank of China',
      };

      let bancoDetectado = '';
      for (const [chave, nome] of Object.entries(bancosDetectados)) {
        if (nomeArquivo.includes(chave)) {
          bancoDetectado = nome;
          break;
        }
      }

      // Se detectou banco e não tem conta com esse nome, sugere criar
      if (bancoDetectado) {
        const jaExiste = contas.some(c => c.nome_instituicao.toLowerCase().includes(bancoDetectado.toLowerCase()));
        if (!jaExiste) {
          Alert.alert(
            t('importar_conta_nao_encontrada'),
            `${t('importar_detectado')} **${bancoDetectado}**, ${t('importar_conta_nao_cadastrada')}\n\n${t('importar_criar_conta')}`,
            [
              { text: t('importar_nao_usar'), onPress: () => {
                setContaDestinoImportacao(contas[0].id);
                setTransacoesRevisar(autoCategorizarInvestimentos(parsedTrans));
                setModalRevisaoVisible(true);
              }},
              { text: `${t('importar_criar')} ${bancoDetectado}`, onPress: async () => {
                const novaConta = {
                  id: generateUUID(),
                  id_espaco: id_espaco_ativo || '',
                  nome_instituicao: bancoDetectado,
                  moeda_conta: 'BRL',
                  saldo_inicial: 0,
                };
                await addConta(novaConta);
                setContaDestinoImportacao(novaConta.id);
                setTransacoesRevisar(autoCategorizarInvestimentos(parsedTrans));
                setModalRevisaoVisible(true);
              }}
            ]
          );
          return;
        }
      }

      setContaDestinoImportacao(contas[0].id);
      setTransacoesRevisar(autoCategorizarInvestimentos(parsedTrans));
      setModalRevisaoVisible(true);

    } catch (error: any) {
      console.error('Erro ao importar:', error);
      Alert.alert(t('error'), `${t('importar_erro_nenhum')}: ${error.message || t('importar_formato_invalido')}`);
    }
  };

  // Alterar categoria no modal de revisão
  const handleAlterarCategoria = (tempId: string, novaCategoria: string) => {
    setTransacoesRevisar(prev => 
      prev.map(t => t.id === tempId ? { ...t, categoria: novaCategoria } : t)
    );
  };

  // Alterar descrição no modal de revisão
  const handleAlterarDescricao = (tempId: string, novaDescricao: string) => {
    setTransacoesRevisar(prev => 
      prev.map(t => t.id === tempId ? { ...t, descricao: novaDescricao } : t)
    );
  };

  // Remover transação da revisão
  const handleRemoverRevisao = (tempId: string) => {
    setTransacoesRevisar(prev => prev.filter(t => t.id !== tempId));
  };

  // Confirmar Importação
  const handleConfirmarImportacao = async () => {
    if (importandoRef.current) return;
    importandoRef.current = true;
    if (transacoesRevisar.length === 0) {
      setModalRevisaoVisible(false);
      return;
    }

    const contaDestino = contaDestinoImportacao || (contas[0] ? contas[0].id : '');
    if (!contaDestino) {
      Alert.alert(t('error'), t('select_destination_account'));
      return;
    }

    const transacoesNormais: any[] = [];
    let proventosAdicionadosCount = 0;
    let ativosAdicionadosCount = 0;

    for (const t of transacoesRevisar) {
      const tickerRegex = /\b([A-Z]{4}\d{1,2})\b/i;
      const match = (t.descricao || '').match(tickerRegex);
      const ticker = match ? match[1].toUpperCase() : 'GENERICO';

      if (t.categoria === 'Proventos') {
        const descLower = (t.descricao || '').toLowerCase();
        let tipoProv: 'dividendo' | 'jcp' | 'rendimento' = 'dividendo';
        if (descLower.includes('jcp') || descLower.includes('juros')) {
          tipoProv = 'jcp';
        } else if (descLower.includes('rendimento')) {
          tipoProv = 'rendimento';
        }
        
        await addProvento({
          id: generateUUID(),
          ticker,
          tipo: tipoProv,
          valor: t.valor,
          data_pagamento: t.data_transacao
        });
        proventosAdicionadosCount++;
      } else if (t.categoria === 'Investimentos') {
        const tipoTxAtivo = t.tipo === 'receita' ? 'venda' : 'compra';
        await addTransacaoAtivo({
          id: generateUUID(),
          ticker,
          tipo: tipoTxAtivo,
          quantidade: 1,
          preco_unitario: t.valor,
          data_transacao: t.data_transacao
        });
        ativosAdicionadosCount++;
      } else {
        transacoesNormais.push({
          id: generateUUID(),
          id_conta: contaDestino,
          tipo: t.tipo,
          valor: t.valor,
          categoria: t.categoria,
          data_transacao: t.data_transacao,
          taxa_cambio_dia: 1.0,
          descricao: t.descricao,
          is_compartilhada: false
        });
      }
    }

    if (transacoesNormais.length > 0) {
      await addTransacoesBulk(transacoesNormais);
    }

    setModalRevisaoVisible(false);
    setTransacoesRevisar([]);

    let msgSucesso = '';
    if (transacoesNormais.length > 0) {
      msgSucesso += `${transacoesNormais.length} ${t('importar_transacoes_adicionadas')}\n`;
    }
    if (proventosAdicionadosCount > 0) {
      msgSucesso += `${proventosAdicionadosCount} ${t('importar_proventos_adicionados')}\n`;
    }
    if (ativosAdicionadosCount > 0) {
      msgSucesso += `${ativosAdicionadosCount} ${t('importar_investimentos_adicionados')}\n`;
    }

    Alert.alert(t('success'), msgSucesso || t('importar_sucesso'));
    importandoRef.current = false;
  };

  // Mês Corrente (AAAA-MM)
  const mesCorrente = new Date().toISOString().slice(0, 7);

  // Retorna true se a data pertence ao mês e ano do mesCorrente (formato "YYYY-MM")
  const pertenceAoMesCorrente = (dataStr: string, mesRef: string) => {
    if (!dataStr) return false;
    if (dataStr.includes('/')) {
      const partes = dataStr.split('/');
      if (partes.length === 3) {
        const mes = partes[1].padStart(2, '0');
        const ano = partes[2];
        return `${ano}-${mes}` === mesRef;
      }
    }
    if (dataStr.includes('-')) {
      return dataStr.startsWith(mesRef);
    }
    return false;
  };

  const obterNomeMes = (mesRef: string) => {
    const partes = mesRef.split('-');
    if (partes.length === 2) {
      const meses = [
        t('month_january'), t('month_february'), t('month_march'), t('month_april'), t('month_may'), t('month_june'),
        t('month_july'), t('month_august'), t('month_september'), t('month_october'), t('month_november'), t('month_december')
      ];
      const index = parseInt(partes[1], 10) - 1;
      return `${meses[index]} / ${partes[0]}`;
    }
    return mesRef;
  };

  // Filtra todas as despesas normais e compartilhadas do espaço ativo neste mês
  const despesasDoMes = transacoes.filter(t => t.tipo === 'despesa' && pertenceAoMesCorrente(t.data_transacao, mesCorrente));
  const totalDespesasMes = despesasDoMes.reduce((acc, t) => acc + obterValorConvertido(t), 0);

  const porCategoria = despesasDoMes.reduce((acc: Record<string, number>, t) => {
    acc[t.categoria] = (acc[t.categoria] || 0) + obterValorConvertido(t);
    return acc;
  }, {});

  const listaCategorias = Object.keys(porCategoria).map(cat => ({
    categoria: cat,
    valor: porCategoria[cat],
    percentual: totalDespesasMes > 0 ? (porCategoria[cat] / totalDespesasMes) * 100 : 0
  })).sort((a, b) => b.valor - a.valor);

  const exportarPlanilhaMensalCSV = async () => {
    if (despesasDoMes.length === 0) {
      Alert.alert(t('warning'), t('no_expenses_to_export'));
      return;
    }
    // Formato CSV compatível com Excel e Google Sheets (delimitado por ponto e vírgula e BOM)
    let csv = `\uFEFF${t('csv_header')}\n`;
    despesasDoMes.forEach(tx => {
      csv += `${tx.data_transacao};${tx.categoria};${tx.descricao || ''};${obterValorConvertido(tx).toFixed(2)};${moeda_base};${tx.is_compartilhada ? t('yes') : t('no')}\n`;
    });
    
    await Clipboard.setStringAsync(csv);
    Alert.alert(t('sheet_generated'), t('sheet_generated_message'));
  };

  // Filtragem de Gastos Compartilhados (Fechamento Mensal) - Resiliente com tipos de booleano
  const transacoesCompartilhadas = transacoes.filter(t => {
    const isComp = t.is_compartilhada;
    const matchesComp = Boolean(isComp) && String(isComp).toLowerCase() !== 'false' && String(isComp) !== '0';
    return matchesComp && t.tipo === 'despesa' && pertenceAoMesCorrente(t.data_transacao, mesCorrente);
  });
  
  const totalCompartilhado = transacoesCompartilhadas.reduce((acc, t) => acc + obterValorConvertido(t), 0);
  const totalOriginal = totalCompartilhado;
  const metadeDevida = totalCompartilhado / 2;

  // Gerar resumo de texto para compartilhamento
  const gerarResumoTexto = () => {
    let texto = `📊 *${t('shared_closing_title')}*\n\n`;
    texto += `${t('total_general')}: ${formatCurrency(totalOriginal, moeda_base)}\n`;
    texto += `${t('fifty_fifty_split')}: ${formatCurrency(metadeDevida, moeda_base)} para cada\n\n`;
    texto += `*${t('items_detail')}*\n`;

    transacoesCompartilhadas.forEach(tx => {
      texto += `- ${tx.categoria} (${tx.descricao || t('no_description')}): ${formatCurrency(obterValorConvertido(tx), moeda_base)} (sua cota)\n`;
    });

    texto += `\n${t('auto_generated')}`;
    return texto;
  };

  const handleCompartilharWhatsApp = async () => {
    if (transacoesCompartilhadas.length === 0) return;
    try {
      await Share.share({
        message: gerarResumoTexto()
      });
    } catch (err: any) {
      console.warn('Erro ao compartilhar:', err.message);
    }
  };

  const handleEnviarEmail = () => {
    if (transacoesCompartilhadas.length === 0) return;
    const subject = t('monthly_closing_subject');
    const body = gerarResumoTexto();
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(t('error'), t('email_app_not_available'));
    });
  };

  const handleGerarAcerto = async () => {
    if (transacoesCompartilhadas.length === 0) return;
    if (contas.length === 0) {
      Alert.alert(t('error'), t('no_account_for_settlement'));
      return;
    }

    try {
      await addTransacao({
        id: Math.random().toString(36).substring(2, 9),
        id_conta: contas[0].id,
        tipo: 'receita', // Registra como receita pois é um reembolso do participante
        valor: metadeDevida,
        categoria: t('account_adjustment'),
        data_transacao: new Date().toISOString().split('T')[0],
        taxa_cambio_dia: 1.0,
        descricao: `${t('monthly_settlement_description')} - ${obterNomeMes(mesCorrente)}`,
        is_compartilhada: false
      });
      Alert.alert(t('settlement_generated'), t('settlement_generated_message'));
    } catch (err: any) {
      Alert.alert(t('error'), err.message || t('settlement_failed'));
    }
  };

  // Agrupamento temporal para o histórico de transações
  const transacoesFiltradas = transacoes.filter(t => {
    if (!apenasCompartilhadas) return true;
    const isComp = t.is_compartilhada;
    return Boolean(isComp) && String(isComp).toLowerCase() !== 'false' && String(isComp) !== '0';
  });

  const transacoesOrdenadas = [...transacoesFiltradas].sort((a, b) => b.data_transacao.localeCompare(a.data_transacao));

  const flatListData: any[] = [];
  let ultimoMesAno = '';
  let ultimoDia = '';

  const nomesMeses = [
    t('month_january'), t('month_february'), t('month_march'), t('month_april'), t('month_may'), t('month_june'),
    t('month_july'), t('month_august'), t('month_september'), t('month_october'), t('month_november'), t('month_december')
  ];

  transacoesOrdenadas.forEach((t) => {
    const partes = t.data_transacao.split('-');
    if (partes.length === 3) {
      const ano = partes[0];
      const mesIdx = parseInt(partes[1], 10) - 1;
      const dia = partes[2];
      
      const mesAnoStr = `${nomesMeses[mesIdx]} de ${ano}`;
      const diaStr = `${dia} de ${nomesMeses[mesIdx]}`;

      if (mesAnoStr !== ultimoMesAno) {
        flatListData.push({
          id: `month-${ano}-${partes[1]}`,
          type: 'monthHeader',
          label: mesAnoStr
        });
        ultimoMesAno = mesAnoStr;
        ultimoDia = '';
      }

      if (t.data_transacao !== ultimoDia) {
        flatListData.push({
          id: `day-${t.data_transacao}`,
          type: 'dayHeader',
          label: diaStr
        });
        ultimoDia = t.data_transacao;
      } else {
        flatListData.push({
          id: `sep-${t.id}`,
          type: 'separator'
        });
      }

      flatListData.push({
        id: t.id,
        type: 'transaction',
        transaction: t
      });
    }
  });

  // Renderizador de item de transação agrupado
  const renderFlatListItem = ({ item }: { item: any }) => {
    if (item.type === 'monthHeader') {
      return (
        <View style={styles.monthHeaderContainer}>
          <Text style={styles.monthHeaderText}>{item.label}</Text>
        </View>
      );
    }

    if (item.type === 'dayHeader') {
      return (
        <View style={styles.dayHeaderContainer}>
          <Text style={styles.dayHeaderText}>{item.label}</Text>
        </View>
      );
    }

    if (item.type === 'separator') {
      return <View style={styles.daySeparator} />;
    }

    // item.type === 'transaction'
    const tx = item.transaction;
    const isReceita = tx.tipo === 'receita';
    const isDespesa = tx.tipo === 'despesa';
    const isSelected = selectedIds.has(tx.id);

    return (
      <TouchableOpacity 
        style={[
          styles.transactionCard,
          isSelectMode && styles.transactionCardSelectMode,
          isSelected && styles.transactionCardSelected
        ]}
        onPress={() => {
          if (isSelectMode) {
            toggleSelectItem(tx.id);
          } else {
            handleAbrirEdicao(tx);
          }
        }}
        onLongPress={() => {
          if (!isSelectMode) {
            setIsSelectMode(true);
            setSelectedIds(new Set([tx.id]));
          }
        }}
        activeOpacity={0.7}
      >
        {isSelectMode && (
          <View style={styles.selectIndicator}>
            {isSelected 
              ? <CheckCircle size={22} color={theme.colors.primary} />
              : <Circle size={22} color={theme.colors.textMuted} />
            }
          </View>
        )}
        <View style={styles.leftSection}>
          <View style={[
            styles.iconWrapper, 
            isReceita && styles.iconReceita,
            isDespesa && styles.iconDespesa,
            tx.tipo === 'transferencia' && styles.iconTransferencia
          ]}>
            {isReceita && <ArrowUpRight size={16} color={theme.colors.positive} />}
            {isDespesa && <ArrowDownRight size={16} color={theme.colors.negative} />}
            {tx.tipo === 'transferencia' && <RefreshCw size={14} color={theme.colors.primary} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.categoria}>
              {tx.categoria} {tx.is_compartilhada && '👥'}
            </Text>
            {tx.descricao && <Text style={styles.descricao}>{tx.descricao}</Text>}
          </View>
        </View>

        {!isSelectMode && (
          <View style={styles.rightSection}>
            <Text style={[
              styles.valor,
              isReceita && styles.valorReceita,
              isDespesa && styles.valorDespesa,
              tx.tipo === 'transferencia' && styles.valorTransferencia,
              { marginBottom: 8 }
            ]}>
              {isReceita ? '+' : isDespesa ? '-' : ''} {formatCurrency(tx.valor, (() => {
                const conta = contas.find(c => c.id === tx.id_conta);
                return conta ? conta.moeda_conta : moeda_base;
              })())}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TouchableOpacity onPress={() => handleAbrirEdicao(tx)} activeOpacity={0.7}>
                <Edit2 size={16} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  Alert.alert(
                    t('confirm_deletion'),
                    t('delete_transaction_confirm'),
                    [
                      { text: t('cancel'), style: 'cancel' },
                      { 
                        text: t('delete'), 
                        style: 'destructive', 
                        onPress: async () => {
                          try {
                            await deleteTransacao(tx.id);
                            Alert.alert(t('success'), t('transaction_deleted'));
                          } catch (err: any) {
                            Alert.alert(t('error_deleting'), err.message || t('unknown_error'));
                          }
                        }
                      }
                    ]
                  );
                }}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color={theme.colors.negative} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        {isSelectMode && (
          <View style={styles.rightSection}>
            <Text style={[
              styles.valor,
              isReceita && styles.valorReceita,
              isDespesa && styles.valorDespesa,
              tx.tipo === 'transferencia' && styles.valorTransferencia
            ]}>
              {isReceita ? '+' : isDespesa ? '-' : ''} {formatCurrency(tx.valor, (() => {
                const conta = contas.find(c => c.id === tx.id_conta);
                return conta ? conta.moeda_conta : moeda_base;
              })())}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header com Botão de Importar */}
      <View style={styles.header}>
        <Logo variant="horizontal" size="sm" withLeaf />
        <TouchableOpacity style={styles.importBtn} onPress={handleImportarExtrato} activeOpacity={0.7}>
          <Upload size={18} color={theme.colors.primary} />
          <Text style={styles.importBtnText}>{t('import_btn')}</Text>
        </TouchableOpacity>
      </View>

      {/* Seletores de Abas */}
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.tabBtn, abaAtiva === 'historico' && styles.tabBtnActive]}
          onPress={() => setAbaAtiva('historico')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, abaAtiva === 'historico' && styles.tabTextActive]}>{t('history_tab')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.tabBtn, abaAtiva === 'fechamento' && styles.tabBtnActive]}
          onPress={() => setAbaAtiva('fechamento')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, abaAtiva === 'fechamento' && styles.tabTextActive]}>{t('monthly_closing_tab')}</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'historico' ? (
        <>
          {/* MÓDULO 4: Buscador de Boletos Automático (DDA) */}
          <TouchableOpacity 
            style={[styles.ddaBanner, !isPremium && styles.ddaLocked]} 
            onPress={handleDDAQuery}
            activeOpacity={0.8}
          >
            <View style={styles.ddaLeft}>
              <ScanLine size={20} color={isPremium ? theme.colors.primary : theme.colors.textMuted} />
              <View>
                <Text style={styles.ddaTitle}>{t('dda_search_title')}</Text>
                <Text style={styles.ddaSub}>{t('dda_subtitle')}</Text>
              </View>
            </View>
            {!isPremium && <Lock size={16} color={theme.colors.textMuted} />}
          </TouchableOpacity>

          {/* Filtro Rápido Compartilhadas */}
          <View style={styles.filterRow}>
            <Text style={styles.filterText}>{t('filter_shared_only')}</Text>
            <Switch
              value={apenasCompartilhadas}
              onValueChange={setApenasCompartilhadas}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={apenasCompartilhadas ? theme.colors.white : theme.colors.textMuted}
            />
          </View>

          <AdBanner />

          {isSelectMode && (
            <View style={styles.selectToolbar}>
              <TouchableOpacity onPress={toggleSelectMode} activeOpacity={0.7}>
                <X size={22} color={theme.colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.selectToolbarText}>
                {selectedIds.size} selecionada{selectedIds.size !== 1 ? 's' : ''}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  const allTxIds = transacoesOrdenadas.map(t => t.id);
                  if (selectedIds.size === allTxIds.length) {
                    setSelectedIds(new Set());
                    setIsSelectMode(false);
                  } else {
                    setSelectedIds(new Set(allTxIds));
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.selectToolbarAction}>
                  {selectedIds.size === transacoesOrdenadas.length ? t('deselect_all') : t('select_all')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleBulkDelete}
                activeOpacity={0.7}
                disabled={selectedIds.size === 0}
              >
                <Trash2 size={20} color={selectedIds.size > 0 ? theme.colors.negative : theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {flatListData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {apenasCompartilhadas 
                  ? t('no_shared_transactions')
                  : t('no_transactions_in_space')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={flatListData}
              keyExtractor={(item) => item.id}
              renderItem={renderFlatListItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      ) : (
        /* ABA DE FECHAMENTO MENSAL */
        <ScrollView style={styles.fechamentoContainer} contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
          {/* 1. RESUMO GERAL DO MÊS POR CATEGORIA */}
          <Text style={styles.sectionTitle}>{t('expenses_by_category')} ({obterNomeMes(mesCorrente)})</Text>
          <View style={styles.resumoCategoriasCard}>
            {listaCategorias.length === 0 ? (
              <Text style={styles.emptyCategoriasText}>{t('no_expenses_current_month')}</Text>
            ) : (
              listaCategorias.map(c => (
                <View key={c.categoria} style={styles.categoriaProgressRow}>
                  <View style={styles.categoriaProgressLabelRow}>
                    <Text style={styles.categoriaProgressName}>{c.categoria}</Text>
                    <Text style={styles.categoriaProgressValue}>{formatCurrency(c.valor, moeda_base)} ({c.percentual.toFixed(1)}%)</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${c.percentual}%` }]} />
                  </View>
                </View>
              ))
            )}

            {despesasDoMes.length > 0 && (
              <TouchableOpacity style={styles.exportCSVBtn} onPress={exportarPlanilhaMensalCSV} activeOpacity={0.8}>
                <Upload size={16} color={theme.colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.exportCSVBtnText}>{t('export_csv')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 2. RATEIO COMPARTILHADO */}
          <Text style={styles.sectionTitle}>{t('shared_split_title')}</Text>
          {transacoesCompartilhadas.length === 0 ? (
            <View style={[styles.resumoFechamentoCard, { padding: 30, alignItems: 'center' }]}>
              <Text style={[styles.emptyCategoriasText, { textAlign: 'center' }]}>{t('no_shared_expenses')}</Text>
            </View>
          ) : (
            <>
              <View style={styles.resumoFechamentoCard}>
                <View style={styles.resumoRow}>
                  <View>
                    <Text style={styles.resumoLabel}>{t('shared_expenses')}</Text>
                    <Text style={styles.resumoValue}>{formatCurrency(totalOriginal, moeda_base)}</Text>
                  </View>
                  <View style={styles.resumoDivider} />
                  <View>
                    <Text style={styles.resumoLabel}>{t('each_share')}</Text>
                    <Text style={[styles.resumoValue, { color: theme.colors.primary }]}>{formatCurrency(metadeDevida, moeda_base)}</Text>
                  </View>
                </View>
                
                {/* Botões de Ação */}
                <View style={styles.shareButtonsRow}>
                  <TouchableOpacity style={styles.shareBtn} onPress={handleCompartilharWhatsApp} activeOpacity={0.8}>
                    <Share2 size={16} color={theme.colors.white} />
                    <Text style={styles.shareBtnText}>{t('whatsapp')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.shareBtn, styles.emailBtn]} onPress={handleEnviarEmail} activeOpacity={0.8}>
                    <Mail size={16} color={theme.colors.white} />
                    <Text style={styles.shareBtnText}>{t('email_label')}</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={[styles.shareBtn, { backgroundColor: theme.colors.primary, marginTop: 12, height: 48 }]} 
                  onPress={handleGerarAcerto} 
                  activeOpacity={0.8}
                >
                  <Text style={[styles.shareBtnText, { fontSize: 14 }]}>{t('close_month_generate_settlement')}</Text>
                </TouchableOpacity>
              </View>

              {/* Lista Editável das Despesas Compartilhadas */}
              <Text style={styles.sectionTitle}>{t('edit_monthly_values')}</Text>
              <View style={{ gap: 8 }}>
                {transacoesCompartilhadas.map(item => (
                  <View key={item.id} style={styles.editItemCard}>
                    <View style={styles.editLeft}>
                      <Text style={styles.editCategory}>{item.categoria}</Text>
                      {item.descricao && <Text style={styles.editDesc}>{item.descricao}</Text>}
                      <Text style={styles.editDate}>{item.data_transacao}</Text>
                    </View>
                    <View style={styles.editRight}>
                      <Text style={styles.currencyPrefix}>{moeda_base}</Text>
                      <TextInput
                        style={styles.editInput}
                        keyboardType="numeric"
                        defaultValue={item.valor.toString()}
                        onChangeText={(text) => {
                          setValoresEditados(prev => ({ ...prev, [item.id]: text }));
                        }}
                        onBlur={() => {
                          const textVal = valoresEditados[item.id];
                          if (textVal !== undefined) {
                            const val = parseFloat(textVal);
                            if (!isNaN(val) && val >= 0) {
                              updateTransacaoValor(item.id, val);
                            }
                          }
                        }}
                      />
                      <Edit2 size={12} color={theme.colors.textMuted} style={styles.editIconInside} />
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* MODAL DE REVISÃO E CONFIRMAÇÃO DE EXTRATOS */}
      <Modal visible={modalRevisaoVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { flex: 1, maxHeight: undefined, maxWidth: undefined, alignItems: 'stretch' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{t('confirm_transactions')}</Text>
                <Text style={styles.modalSubtitle}>{t('review_imported_categories')}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalRevisaoVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Seletor de Conta de Destino */}
            <View style={styles.seletorContaContainer}>
              <Text style={styles.seletorContaTitle}>{t('import_destination')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seletorContaScrollOuter}>
                <View style={styles.seletorContaScrollInner}>
                  {contas.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.seletorContaBtn,
                        contaDestinoImportacao === c.id && styles.seletorContaBtnActive
                      ]}
                      onPress={() => setContaDestinoImportacao(c.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.seletorContaText,
                        contaDestinoImportacao === c.id && styles.seletorContaTextActive
                      ]}>
                        {c.nome_instituicao} ({c.moeda_conta})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <ScrollView style={[styles.revisaoScroll, { flex: 1 }]} showsVerticalScrollIndicator={false}>
              {transacoesRevisar.map(tx => (
                <View key={tx.id} style={styles.revisaoItemCard}>
                  <View style={styles.revisaoItemLeft}>
                    <TextInput
                      style={styles.revisaoDescInput}
                      value={tx.descricao}
                      onChangeText={(val) => handleAlterarDescricao(tx.id, val)}
                      placeholder={t('item_name_detail_placeholder')}
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    <Text style={styles.revisaoItemDate}>{tx.data_transacao} • {tx.tipo.toUpperCase()}</Text>
                    <Text style={[styles.revisaoItemVal, tx.tipo === 'receita' ? styles.valRec : styles.valDes]}>
                      {(() => {
                        const contaDestino = contas.find(c => c.id === contaDestinoImportacao);
                        const moedaDestino = contaDestino ? contaDestino.moeda_conta : moeda_base;
                        return formatCurrency(tx.valor, moedaDestino);
                      })()}
                    </Text>
                    
                    {/* Atalhos Rápidos para Categorização de Investimentos */}
                    <View style={styles.shortcutChipsContainer}>
                      {tx.tipo === 'receita' ? (
                        <TouchableOpacity
                          style={[
                            styles.shortcutChip,
                            tx.categoria === 'Proventos' && styles.shortcutChipActive
                          ]}
                          onPress={() => handleAlterarCategoria(tx.id, 'Proventos')}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.shortcutChipText,
                            tx.categoria === 'Proventos' && styles.shortcutChipTextActive
                          ]}>{t('plus_proventos')}</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={[
                            styles.shortcutChip,
                            tx.categoria === 'Investimentos' && styles.shortcutChipActive
                          ]}
                          onPress={() => handleAlterarCategoria(tx.id, 'Investimentos')}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.shortcutChipText,
                            tx.categoria === 'Investimentos' && styles.shortcutChipTextActive
                          ]}>{t('plus_buy_stock')}</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.shortcutChip,
                          tx.categoria === 'Outros' && styles.shortcutChipActive
                        ]}
                        onPress={() => handleAlterarCategoria(tx.id, 'Outros')}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.shortcutChipText,
                          tx.categoria === 'Outros' && styles.shortcutChipTextActive
                        ]}>Outros</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.revisaoItemRight}>
                    {/* Categoria Input/Dropdown */}
                    <TextInput
                      style={styles.categoriaInput}
                      value={tx.categoria}
                      onChangeText={(val) => handleAlterarCategoria(tx.id, val)}
                      placeholder={t('category_label')}
                      placeholderTextColor={theme.colors.textMuted}
                    />
                    <TouchableOpacity onPress={() => handleRemoverRevisao(tx.id)} style={styles.trashBtn}>
                      <Trash2 size={16} color={theme.colors.negative} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalRevisaoVisible(false)}>
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmarImportacao}>
                <Check size={16} color={theme.colors.white} />
                <Text style={styles.confirmBtnText}>{t('import_all')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE EDIÇÃO DE TRANSAÇÃO */}
      <Modal visible={modalEdicaoVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%', maxWidth: undefined, alignItems: 'stretch' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t('edit_transaction')}</Text>
                <Text style={styles.modalSubtitle}>{t('modify_transaction_details')}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalEdicaoVisible(false)}>
                <X size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 0 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.labelInput}>{t('description_label')}</Text>
              <TextInput
                style={styles.textInputEdicao}
                value={editDescricao}
                onChangeText={setEditDescricao}
                placeholder={t('description_placeholder')}
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.labelInput}>{t('category_label')}</Text>
              <TextInput
                style={styles.textInputEdicao}
                value={editCategoria}
                onChangeText={setEditCategoria}
                placeholder={t('category_placeholder')}
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.labelInput}>{t('value_label')}</Text>
              <TextInput
                style={styles.textInputEdicao}
                value={editValor}
                onChangeText={setEditValor}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor={theme.colors.textMuted}
              />

              <Text style={styles.labelInput}>{t('date_label')}</Text>
              <TextInput
                style={styles.textInputEdicao}
                value={editData}
                onChangeText={(t) => setEditData(aplicarMascaraData(t))}
                placeholder={t('date_placeholder')}
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={[styles.modalFooter, { flexDirection: 'column', gap: 8, paddingBottom: 36, marginTop: 8 }]}>
              <TouchableOpacity 
                style={[styles.modalVerticalBtn, { backgroundColor: theme.colors.positive }]} 
                onPress={handleSalvarEdicao}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalVerticalBtnText, { color: theme.colors.white }]}>{t('save_changes')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalVerticalBtn, { backgroundColor: theme.colors.negative }]} 
                onPress={handleExcluirEdicao}
                activeOpacity={0.8}
              >
                <Trash2 size={16} color={theme.colors.white} style={{ marginRight: 6 }} />
                <Text style={[styles.modalVerticalBtnText, { color: theme.colors.white }]}>{t('delete_transaction')}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalVerticalBtn, { backgroundColor: theme.colors.cardBg, borderWidth: 1, borderColor: theme.colors.border }]} 
                onPress={() => setModalEdicaoVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalVerticalBtnText, { color: theme.colors.textSecondary }]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    paddingHorizontal: 30,
    paddingTop: 30,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.ink,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.cardBg,
    borderColor: theme.colors.border,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  importBtnText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: theme.colors.lightAccent,
    borderRadius: 8,
    padding: 6,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.cardBg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: theme.colors.primary,
  },
  ddaBanner: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  ddaLocked: {
    opacity: 0.5,
  },
  ddaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ddaTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: 'bold',
  },
  ddaSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  listContainer: {
    paddingHorizontal: 30,
    paddingBottom: 150,
  },
  transactionCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 24,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  transactionCardSelectMode: {
    paddingVertical: 20,
  },
  transactionCardSelected: {
    backgroundColor: 'rgba(16, 69, 161, 0.08)',
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  selectIndicator: {
    marginRight: 12,
  },
  selectToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  selectToolbarText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.ink,
  },
  selectToolbarAction: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconReceita: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  iconDespesa: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  iconTransferencia: {
    backgroundColor: 'rgba(16, 69, 161, 0.1)',
  },
  categoria: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
  },
  descricao: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  valor: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  valorReceita: {
    color: theme.colors.positive,
  },
  valorDespesa: {
    color: theme.colors.negative,
  },
  valorTransferencia: {
    color: theme.colors.primary,
  },
  dateWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  dateText: {
    color: theme.colors.textMuted,
    fontSize: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 60,
    marginTop: 40,
  },
  emptyStateText: {
    color: theme.colors.textMuted,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  fechamentoContainer: {
    flex: 1,
    paddingHorizontal: 30,
  },
  resumoFechamentoCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  resumoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resumoLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  resumoValue: {
    color: theme.colors.ink,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  resumoDivider: {
    width: 1,
    height: 35,
    backgroundColor: theme.colors.border,
  },
  shareButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shareBtn: {
    flex: 1,
    height: 40,
    backgroundColor: theme.colors.positive,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  emailBtn: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  shareBtnText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  fechamentoScroll: {
    paddingBottom: 180,
  },
  editItemCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 21,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  editLeft: {
    flex: 1,
    marginRight: 10,
  },
  editCategory: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
  },
  editDesc: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  editDate: {
    color: theme.colors.textMuted,
    fontSize: 9,
    marginTop: 4,
  },
  editRight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    width: 100,
  },
  currencyPrefix: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 4,
  },
  editInput: {
    flex: 1,
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: 'bold',
    padding: 0,
  },
  editIconInside: {
    marginLeft: 4,
  },
  modalOverlay: {
    ...theme.modalStyles.overlay,
    padding: 16,
  },
  modalContent: {
    ...theme.modalStyles.card,
    padding: 30,
    maxHeight: '85%',
  },
  modalHeader: {
    ...theme.modalStyles.header,
    paddingBottom: 18,
    marginBottom: 12,
  },
  modalTitle: {
    color: theme.colors.ink,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  revisaoScroll: {
    marginVertical: 10,
    flexShrink: 1,
  },
  revisaoItemCard: {
    backgroundColor: theme.colors.bg,
    borderRadius: 10,
    padding: 18,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shortcutChipsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  shortcutChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  shortcutChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  shortcutChipText: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  shortcutChipTextActive: {
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  revisaoItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  revisaoItemDesc: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: 'bold',
  },
  revisaoItemDate: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  revisaoItemVal: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 4,
  },
  valRec: {
    color: theme.colors.positive,
  },
  valDes: {
    color: theme.colors.negative,
  },
  revisaoItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoriaInput: {
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.inputBorder,
    borderWidth: 1,
    borderRadius: 6,
    height: 36,
    width: 100,
    paddingHorizontal: 12,
    color: theme.colors.ink,
    fontSize: 12,
  },
  trashBtn: {
    padding: 9,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 18,
    marginTop: 12,
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: 'bold',
  },
  confirmBtn: {
    flex: 1.5,
    height: 44,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  confirmBtnText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  seletorContaContainer: {
    marginBottom: 16,
    paddingHorizontal: 0,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  seletorContaTitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  seletorContaScrollOuter: {
    flexDirection: 'row',
  },
  seletorContaScrollInner: {
    flexDirection: 'row',
    paddingRight: 12,
  },
  seletorContaBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: theme.colors.bg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
  seletorContaBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(16, 69, 161, 0.1)',
  },
  seletorContaText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  seletorContaTextActive: {
    color: theme.colors.primary,
  },
  labelInput: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 10,
  },
  textInputEdicao: {
    backgroundColor: theme.colors.inputBg,
    borderColor: theme.colors.inputBorder,
    borderWidth: 1,
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 18,
    color: theme.colors.ink,
    fontSize: 14,
    marginBottom: 10,
  },
  resumoCategoriasCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 16,
    padding: 30,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyCategoriasText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 18,
  },
  categoriaProgressRow: {
    marginBottom: 14,
  },
  categoriaProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoriaProgressName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.ink,
  },
  categoriaProgressValue: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.bg,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  exportCSVBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  exportCSVBtnText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  monthHeaderContainer: {
    paddingHorizontal: 30,
    paddingTop: 36,
    paddingBottom: 12,
    backgroundColor: theme.colors.bg,
  },
  monthHeaderText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayHeaderContainer: {
    paddingHorizontal: 30,
    paddingTop: 18,
    paddingBottom: 9,
    backgroundColor: theme.colors.bg,
  },
  dayHeaderText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  daySeparator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 20,
    marginVertical: 4,
    opacity: 0.6,
  },
  revisaoDescInput: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 3,
    marginBottom: 4,
    width: '90%',
  },
  modalVerticalBtn: {
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: 4,
  },
  modalVerticalBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
