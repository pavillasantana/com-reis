import currency from 'currency.js';

export const CURRENCY_CONFIGS: Record<string, currency.Options> = {
  BRL: { symbol: 'R$ ', separator: '.', decimal: ',', precision: 2 },
  USD: { symbol: 'US$ ', separator: '.', decimal: ',', precision: 2 },
  EUR: { symbol: '€ ', separator: '.', decimal: ',', precision: 2 },
  ARS: { symbol: 'ARS$ ', separator: '.', decimal: ',', precision: 2 },
  GBP: { symbol: '£ ', separator: '.', decimal: ',', precision: 2 },
  JPY: { symbol: '¥ ', separator: '.', decimal: ',', precision: 0 },
  CAD: { symbol: 'CA$ ', separator: '.', decimal: ',', precision: 2 },
  CHF: { symbol: 'CHF ', separator: '.', decimal: ',', precision: 2 },
  AUD: { symbol: 'AU$ ', separator: '.', decimal: ',', precision: 2 },
  CNY: { symbol: 'CN¥ ', separator: '.', decimal: ',', precision: 2 },
  MXN: { symbol: 'MXN$ ', separator: '.', decimal: ',', precision: 2 },
};

export function formatCurrency(value: number | string, currencyCode: string = 'BRL'): string {
  const config = CURRENCY_CONFIGS[currencyCode] || { symbol: `${currencyCode} `, separator: '.', decimal: ',', precision: 2 };
  return currency(value, config).format();
}

export function addMoney(a: number | string, b: number | string): number {
  return currency(a).add(b).value;
}

export function subtractMoney(a: number | string, b: number | string): number {
  return currency(a).subtract(b).value;
}

export function multiplyMoney(value: number | string, factor: number | string): number {
  return currency(value).multiply(factor).value;
}

export function divideMoney(value: number | string, divisor: number | string): number {
  return currency(value).divide(divisor).value;
}

export function convertCurrency(
  valor: number,
  de: string,
  para: string,
  cotacoes: Record<string, number>
): number {
  if (!valor || de === para) return valor || 0;
  
  const precision = para === 'JPY' ? 0 : 2;
  
  // 1. Check for a direct pair rate in quotes (e.g. USDBRL, ARSBRL, etc.)
  const directPairKey = `${de}${para}`;
  const inversePairKey = `${para}${de}`;
  
  if (cotacoes && cotacoes[directPairKey] !== undefined) {
    const rate = cotacoes[directPairKey];
    const rawVal = currency(valor, { precision: 8 }).multiply(rate).value;
    return currency(rawVal, { precision }).value;
  }
  
  if (cotacoes && cotacoes[inversePairKey] !== undefined && cotacoes[inversePairKey] !== 0) {
    const rate = cotacoes[inversePairKey];
    const rawVal = currency(valor, { precision: 8 }).divide(rate).value;
    return currency(rawVal, { precision }).value;
  }
  
  // 2. Direct conversion if de or para is BRL (the base pivot)
  if (para === 'BRL') {
    const rateDe = cotacoes ? (cotacoes[de] ?? 1.0) : 1.0;
    const rawVal = currency(valor, { precision: 8 }).multiply(rateDe).value;
    return currency(rawVal, { precision }).value;
  }
  
  if (de === 'BRL') {
    const ratePara = cotacoes ? (cotacoes[para] ?? 1.0) : 1.0;
    if (ratePara !== 0) {
      const rawVal = currency(valor, { precision: 8 }).divide(ratePara).value;
      return currency(rawVal, { precision }).value;
    }
  }

  // 3. Fallback to BRL pivot with high-precision intermediate calculations
  const rateDe = cotacoes ? (cotacoes[de] ?? 1.0) : 1.0;
  const ratePara = cotacoes ? (cotacoes[para] ?? 1.0) : 1.0;
  
  if (ratePara === 0) return 0;
  
  const converted = currency(valor, { precision: 8 }).multiply(rateDe).divide(ratePara);
  return currency(converted.value, { precision }).value;
}

export function normalizeToCurrency(
  valor: number,
  fromCurrency: string,
  toCurrency: string,
  cotacoes: Record<string, number>
): number {
  return convertCurrency(valor, fromCurrency, toCurrency, cotacoes);
}

