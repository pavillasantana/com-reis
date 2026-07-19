import { ParsedBankTransaction } from './parseOFX';

export const parseCSV = (text: string): ParsedBankTransaction[] => {
  const transactions: ParsedBankTransaction[] = [];
  const lines = text.split(/\r?\n/);
  
  if (lines.length <= 1) return [];

  // Tenta detectar o delimitador (normalmente ',' ou ';')
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  // Cabeçalho da tabela
  const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());
  
  // Tenta encontrar os índices de Data, Descrição e Valor
  let dateIndex = -1;
  let descIndex = -1;
  let valIndex = -1;

  headers.forEach((header, index) => {
    if (header.includes('data') || header.includes('date') || header.includes('dt')) {
      dateIndex = index;
    } else if (header.includes('desc') || header.includes('hist') || header.includes('memo') || header.includes('name') || header.includes('detalhe')) {
      descIndex = index;
    } else if (header.includes('val') || header.includes('amount') || header.includes('quant') || header.includes('total')) {
      valIndex = index;
    }
  });

  // Fallbacks se não identificar pelos nomes exatos das colunas
  if (dateIndex === -1) dateIndex = 0;
  if (descIndex === -1) descIndex = headers.length > 1 ? 1 : 0;
  if (valIndex === -1) valIndex = headers.length > 2 ? 2 : headers.length - 1;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const columns = line.split(delimiter);
    if (columns.length <= Math.max(dateIndex, descIndex, valIndex)) continue;

    const rawDate = columns[dateIndex].trim();
    const rawDesc = columns[descIndex].trim();
    const rawVal = columns[valIndex].trim();

    // Limpa a data para formato YYYY-MM-DD
    let dateStr = new Date().toISOString().split('T')[0];
    const dateParts = rawDate.split(/[-/]/);
    if (dateParts.length === 3) {
      // Se for DD/MM/YYYY
      if (dateParts[0].length <= 2 && dateParts[2].length === 4) {
        dateStr = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
      } else if (dateParts[0].length === 4) {
        // Se for YYYY/MM/DD
        dateStr = `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`;
      }
    }

    // Limpa o valor
    // Remove cifrões, espaços e trata pontuação de milhar/decimal
    let cleanedVal = rawVal.replace(/[R$\s]/gi, '');
    let amount = 0;

    if (cleanedVal.includes(',') && cleanedVal.includes('.')) {
      // Se tem ambos, normalmente o ponto é milhar e a vírgula é decimal (padrão BR: 1.000,50)
      // ou ponto é decimal e vírgula é milhar (padrão US: 1,000.50)
      if (cleanedVal.indexOf('.') < cleanedVal.indexOf(',')) {
        cleanedVal = cleanedVal.replace(/\./g, '').replace(',', '.'); // BR para float
      } else {
        cleanedVal = cleanedVal.replace(/,/g, ''); // US para float
      }
    } else if (cleanedVal.includes(',')) {
      // Se tem apenas vírgula, substitui por ponto
      cleanedVal = cleanedVal.replace(',', '.');
    }
    
    amount = parseFloat(cleanedVal);

    if (isNaN(amount) || amount === 0) continue;

    const tipo = amount < 0 ? 'despesa' : 'receita';
    const valorAbsoluto = Math.abs(amount);

    // Sugere uma categoria inicial com base na descrição (multilíngue)
    let categoria = 'Outros';
    const descLower = rawDesc.toLowerCase();

    const categoryRules: [string, string[]][] = [
      ['Alimentação', ['mercado', 'super', 'pao de acucar', 'carrefour', 'extra', 'assai', 'atacad', 'hortifruti', 'feira', 'padaria', 'acoug', 'restaurante', 'lanchonete', 'ifood', 'rappi', 'mcdonald', 'burger', 'subway', 'outback', 'plibon', 'sushi', 'pizz', 'grocery', 'walmart', 'costco', 'target', 'whole foods', 'trader joe', 'aldi', 'lidl', 'tesco', 'sainsbury', 'woolworths', 'coles', 'carniceria', 'supermercado', 'tienda', 'almacen', 'superstore', 'metro ag', 'kroger', 'safeway', 'publix', 'food', 'restaurant', 'dining', 'cafe', 'coffee', 'starbucks', 'dunkin', 'chipotle', 'panera']],
      ['Moradia', ['aluguel', 'condominio', 'condomínio', 'iptu', 'agua', 'água', 'sabesp', 'energia', 'celpe', 'cpfl', 'enel', 'light', 'gas', 'rent', 'mortgage', 'utility', 'electric', 'water bill', 'condo', 'housing', 'property', 'home']],
      ['Transporte', ['uber', '99', 'posto', 'combustivel', 'combustível', 'shell', 'ipiranga', 'petrobras', 'ipva', 'oficina', 'mecanic', 'seguro auto', 'rodagem', 'pedagio', 'estacionamento', 'blablacar', 'metro', 'onibus', 'ônibus', 'bilhete', 'gas station', 'fuel', 'parking', 'toll', 'lyft', 'taxi', 'car service', 'auto', 'mechanic', 'transit', 'commute', 'tollway', 'ezpass']],
      ['Assinaturas', ['netflix', 'spotify', 'amazon prime', 'hbo', 'disney', 'globoplay', 'youtube premium', 'deezer', 'apple music', 'icloud', 'cloud', 'telef', 'vivo', 'claro', 'tim', 'internet', 'fibra', 'sky', 'cable', 'streaming', 'subscription', 'phone bill', 'mobile', 'at&t', 'verizon', 't-mobile', 'sprint', 'comcast', 'xfinity']],
      ['Saúde', ['farmacia', 'farmácia', 'drogaria', 'drogasil', 'pague menos', 'raia', 'hospital', 'clinica', 'médic', 'medic', 'laborat', 'exame', 'plano saude', 'plano saúde', 'unimed', 'amil', 'sulamerica', 'pharmacy', 'drugstore', 'doctor', 'clinic', 'hospital', 'health', 'medical', 'dental', 'lab', 'cvs', 'walgreens', 'rite aid', 'health insurance', 'premium', 'deductible', 'copay', 'optum', 'kaiser']],
      ['Educação', ['escola', 'faculdade', 'universidade', 'curso', 'udemy', 'alura', 'coursera', 'mensalidade', 'school', 'university', 'college', 'course', 'tuition', 'education', 'learning', 'lynda', 'skillshare', 'masterclass', 'pluralsight', 'edx', 'khan academy']],
      ['Lazer', ['cinema', 'teatro', 'parque', 'ingresso', 'show', 'academia', 'gym', 'smart fit', 'bio ritmo', 'cinema', 'theater', 'park', 'ticket', 'gym', 'fitness', 'entertainment', 'concert', 'movie', 'play', 'sports', 'recreation', 'peloton', 'equinox', 'planet fitness']],
      ['Transferência Recebida', ['pix', 'transfer in', 'credit transfer', 'wire in', 'deposit', 'cash in']],
      ['Transferência Enviada', ['pix', 'transfer out', 'wire out', 'transferencia enviada']],
      ['Transferência', ['ted', 'doc', 'transferencia', 'transferência', 'transfer', 'wire', 'ach', 'zelle', 'venmo', 'paypal', 'cashapp', 'wise transfer']],
    ];

    for (const [cat, terms] of categoryRules) {
      const isPixReceived = cat === 'Transferência Recebida' && amount > 0;
      const isPixSent = cat === 'Transferência Enviada' && amount < 0;
      const isTransfer = cat === 'Transferência';

      if (isPixReceived || isPixSent) {
        if (terms.some(termo => descLower.includes(termo))) {
          categoria = cat;
          break;
        }
      } else if (!isTransfer || (isTransfer && !['Transferência Recebida', 'Transferência Enviada'].includes(categoria))) {
        if (terms.some(termo => descLower.includes(termo))) {
          categoria = cat;
          break;
        }
      }
    }

    transactions.push({
      id: Math.random().toString(36).substring(2, 9),
      data_transacao: dateStr,
      valor: valorAbsoluto,
      tipo,
      descricao: rawDesc || 'Transação Importada',
      categoria
    });
  }

  return transactions;
};
