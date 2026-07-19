/**
 * useXlsxImport
 * Hook para importar extratos bancários em formato XLSX/CSV e criar transações.
 *
 * Colunas esperadas no arquivo (case-insensitive):
 * data | valor | tipo | categoria | descricao | id_conta (opcional)
 */
import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as XLSX from 'xlsx';
import { useStore } from '../store/useStore';
import { Transacao } from '../store/useStore';

const MOEDA_DEFAULT = 'BRL';

function parseData(valor: any): string {
  if (!valor) return new Date().toISOString().split('T')[0];
  if (typeof valor === 'number') {
    // Data serial do Excel (número de dias desde 1/1/1900)
    const excelEpoch = new Date(1900, 0, 1);
    const date = new Date(excelEpoch.getTime() + (valor - 2) * 86400000);
    return date.toISOString().split('T')[0];
  }
  const str = String(valor).trim();
  // Tenta formatos DD/MM/AAAA e AAAA-MM-DD
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return str.substring(0, 10);
  return new Date().toISOString().split('T')[0];
}

function parseValor(valor: any): number {
  if (typeof valor === 'number') return Math.abs(valor);
  const str = String(valor).replace(/[R$\s]/g, '').trim();
  if (!str) return 0;
  const isBR = /,\d{2}$/.test(str);
  const num = isBR ? parseFloat(str.replace(/\./g, '').replace(',', '.')) : parseFloat(str.replace(',', '.'));
  return isNaN(num) ? 0 : Math.abs(num);
}

function parseTipo(valor: any, row: any): 'receita' | 'despesa' {
  if (valor) {
    const v = String(valor).toLowerCase();
    if (v.includes('receita') || v.includes('credit') || v.includes('entrada') || v === 'c') return 'receita';
    if (v.includes('despesa') || v.includes('debit') || v.includes('saida') || v.includes('saída') || v === 'd') return 'despesa';
  }
  // Tenta inferir pelo sinal do valor original
  const rawValor = row.valor ?? row.Valor ?? row.VALOR;
  if (typeof rawValor === 'number' && rawValor < 0) return 'despesa';
  return 'despesa';
}

function normalizarChave(obj: Record<string, any>, ...keys: string[]): any {
  for (const key of keys) {
    const found = Object.keys(obj).find((k) => k.toLowerCase().trim() === key.toLowerCase());
    if (found !== undefined) return obj[found];
  }
  return undefined;
}

export const useXlsxImport = () => {
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const { addTransacoesBulk, getContasEspacoAtivo, showToast } = useStore();

  const importar = async () => {
    try {
      setImportando(true);
      setProgresso(0);

      // 1. Seleciona o arquivo
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        setImportando(false);
        return;
      }

      const file = result.assets[0];
      const ext = file.name?.toLowerCase().split('.').pop();

      // 2. Lê o conteúdo
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 3. Parseia com xlsx
      const workbook = XLSX.read(base64, { type: 'base64', cellDates: false });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rows || rows.length === 0) {
        showToast('O arquivo está vazio ou sem dados reconhecíveis.', 'error');
        setImportando(false);
        return;
      }

      const contas = getContasEspacoAtivo();
      const contaDefault = contas[0];
      if (!contaDefault) {
        showToast('Nenhuma conta ativa encontrada. Crie uma conta antes de importar.', 'error');
        setImportando(false);
        return;
      }

      // 4. Converte cada linha em Transação
      const transacoesParaImportar: Transacao[] = [];
      let erros = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const dataRaw = normalizarChave(row, 'data', 'date', 'data_transacao', 'dt', 'Data');
          const valorRaw = normalizarChave(row, 'valor', 'value', 'amount', 'Valor', 'Montante');
          const tipoRaw = normalizarChave(row, 'tipo', 'type', 'natureza', 'Tipo');
          const categoriaRaw = normalizarChave(row, 'categoria', 'category', 'Categoria', 'desc', 'historico');
          const descricaoRaw = normalizarChave(row, 'descricao', 'description', 'memo', 'Descricao', 'Descricão', 'Historico');
          const idContaRaw = normalizarChave(row, 'id_conta', 'conta', 'account');

          const valorNum = parseValor(valorRaw);
          if (!valorRaw || valorNum <= 0) continue; // Pula linhas sem valor

          const contaId = contas.find((c) => c.id === idContaRaw)?.id || contaDefault.id;

          const transacao: Transacao = {
            id: `imp-${Date.now()}-${i}`,
            id_conta: contaId,
            tipo: parseTipo(tipoRaw, row),
            valor: valorNum,
            categoria: String(categoriaRaw || descricaoRaw || 'Importado').trim() || 'Importado',
            descricao: String(descricaoRaw || '').trim() || undefined,
            data_transacao: parseData(dataRaw),
            taxa_cambio_dia: 1.0,
          };

          transacoesParaImportar.push(transacao);
          setProgresso(Math.round(((i + 1) / rows.length) * 50)); // 50% for parsing
        } catch (lineErr) {
          console.warn(`Linha ${i + 1} ignorada:`, lineErr);
          erros++;
        }
      }

      if (transacoesParaImportar.length > 0) {
        setProgresso(60);
        await addTransacoesBulk(transacoesParaImportar);
        setProgresso(100);
        showToast(`Importação concluída! ${transacoesParaImportar.length} transações criadas${erros > 0 ? `, ${erros} linhas com erro ignoradas` : ''}.`, 'success');
      } else {
        showToast('Nenhuma transação foi importada. Verifique o formato do arquivo.', 'error');
      }
    } catch (err: any) {
      console.error('Erro na importação XLSX:', err);
      showToast(`Erro ao importar: ${err.message || 'Verifique o formato do arquivo.'}`, 'error');
    } finally {
      setImportando(false);
      setProgresso(0);
    }
  };

  return { importar, importando, progresso };
};
