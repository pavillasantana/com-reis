import { ParsedBankTransaction } from './parseOFX';
import * as pdfjsLib from 'pdfjs-dist';

// Configura worker desativado para compatibilidade com React Native/Expo se necessário
if ((pdfjsLib as any).GlobalWorkerOptions) {
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '';
}

export const parsePDFText = (text: string): ParsedBankTransaction[] => {
  const transactions: ParsedBankTransaction[] = [];
  const lines = text.split(/\r?\n/);
  
  const dateRegex = /(\d{2}\/\d{2}(?:\/\d{4})?)/;
  const amountRegex = /(?:R\$\s*)?(-?\s*\d{1,3}(?:\.\d{3})*,\d{2})/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const dateMatch = dateRegex.exec(line);
    const amountMatch = amountRegex.exec(line);

    if (dateMatch && amountMatch) {
      const rawDate = dateMatch[1];
      const rawAmount = amountMatch[1];

      let dateStr = new Date().toISOString().split('T')[0];
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      } else if (parts.length === 2) {
        const currentYear = new Date().getFullYear();
        dateStr = `${currentYear}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }

      let cleanedVal = rawAmount.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
      const amountNum = parseFloat(cleanedVal);

      if (isNaN(amountNum) || amountNum === 0) continue;

      let desc = line.replace(rawDate, '').replace(rawAmount, '').replace(/R\$/g, '').trim();
      if (!desc) desc = 'Transação Extrato PDF';

      const tipo = amountNum < 0 || desc.toLowerCase().includes('saida') || desc.toLowerCase().includes('pagamento') ? 'despesa' : 'receita';
      const valorAbsoluto = Math.abs(amountNum);

      let categoria = 'Outros';
      const descLower = desc.toLowerCase();
      if (descLower.includes('mercado') || descLower.includes('super') || descLower.includes('pao de acucar') || descLower.includes('carrefour')) {
        categoria = 'Alimentação';
      } else if (descLower.includes('aluguel') || descLower.includes('condominio')) {
        categoria = 'Moradia';
      } else if (descLower.includes('uber') || descLower.includes('99') || descLower.includes('posto') || descLower.includes('combustivel')) {
        categoria = 'Transporte';
      } else if (descLower.includes('netflix') || descLower.includes('spotify') || descLower.includes('amazon') || descLower.includes('telef')) {
        categoria = 'Assinaturas';
      } else if (descLower.includes('pix') && amountNum > 0) {
        categoria = 'Transferência Recebida';
      }

      transactions.push({
        id: `pdf-${Math.random().toString(36).substring(2, 9)}`,
        data_transacao: dateStr,
        valor: valorAbsoluto,
        tipo,
        descricao: desc,
        categoria
      });
    }
  }

  return transactions;
};

export const parsePDF = async (arrayBuffer: ArrayBuffer): Promise<ParsedBankTransaction[]> => {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return parsePDFText(fullText);
  } catch (err) {
    console.warn('Erro ao ler PDF:', err);
    return [];
  }
};
