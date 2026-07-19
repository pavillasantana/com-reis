export interface ParsedBankTransaction {
  id: string;
  data_transacao: string;
  valor: number;
  tipo: 'receita' | 'despesa';
  descricao: string;
  categoria: string;
}

export const parseOFX = (text: string): ParsedBankTransaction[] => {
  const transactions: ParsedBankTransaction[] = [];
  
  // Encontra todos os blocos de transações <STMTTRN>...</STMTTRN>
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;

  while ((match = stmttrnRegex.exec(text)) !== null) {
    const blockContent = match[1];
    
    // Extrai o tipo de transação
    const trntypeMatch = /<TRNTYPE>(.*)/i.exec(blockContent);
    const trntype = trntypeMatch ? trntypeMatch[1].trim() : '';

    // Extrai a data da transação (DTPOSTED)
    const dtpostedMatch = /<DTPOSTED>(\d{8})/i.exec(blockContent);
    let dateStr = new Date().toISOString().split('T')[0];
    if (dtpostedMatch) {
      const year = dtpostedMatch[1].substring(0, 4);
      const month = dtpostedMatch[1].substring(4, 6);
      const day = dtpostedMatch[1].substring(6, 8);
      dateStr = `${year}-${month}-${day}`;
    }

    // Extrai o valor (TRNAMT)
    const trnamtMatch = /<TRNAMT>([^<\s\r\n]+)/i.exec(blockContent);
    let amount = 0;
    if (trnamtMatch) {
      amount = parseFloat(trnamtMatch[1].replace(',', '.'));
    }

    // Extrai a descrição (MEMO ou NAME)
    const memoMatch = /<MEMO>(.*)/i.exec(blockContent);
    const nameMatch = /<NAME>(.*)/i.exec(blockContent);
    let description = 'Transação Importada';
    if (memoMatch && memoMatch[1].trim()) {
      description = memoMatch[1].trim();
    } else if (nameMatch && nameMatch[1].trim()) {
      description = nameMatch[1].trim();
    }

    // Determina se é despesa ou receita
    const tipo = amount < 0 || trntype.toUpperCase() === 'DEBIT' ? 'despesa' : 'receita';
    const valorAbsoluto = Math.abs(amount);

    // Sugere uma categoria inicial com base na descrição
    let categoria = 'Outros';
    const descLower = description.toLowerCase();
    if (descLower.includes('mercado') || descLower.includes('super') || descLower.includes('pao de acucar') || descLower.includes('carrefour')) {
      categoria = 'Alimentação';
    } else if (descLower.includes('aluguel') || descLower.includes('condominio')) {
      categoria = 'Moradia';
    } else if (descLower.includes('uber') || descLower.includes('99') || descLower.includes('posto') || descLower.includes('combustivel')) {
      categoria = 'Transporte';
    } else if (descLower.includes('netflix') || descLower.includes('spotify') || descLower.includes('amazon') || descLower.includes('telef')) {
      categoria = 'Assinaturas';
    } else if (descLower.includes('pix') && amount > 0) {
      categoria = 'Transferência Recebida';
    }

    if (valorAbsoluto > 0) {
      transactions.push({
        id: Math.random().toString(36).substring(2, 9),
        data_transacao: dateStr,
        valor: valorAbsoluto,
        tipo,
        descricao: description,
        categoria
      });
    }
  }

  return transactions;
};
