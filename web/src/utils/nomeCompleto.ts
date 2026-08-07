export function montarNomeCompleto(nome: string, sobrenome?: string | null): string {
  const n = (nome || '').trim();
  const s = (sobrenome || '').trim();
  if (!n) return s;
  if (!s) return n;
  if (n.toLowerCase().endsWith(s.toLowerCase())) return n;
  return `${n} ${s}`;
}

export function normalizarNomeRepetido(nome: string): string {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const parte of partes) {
    const last = out[out.length - 1];
    if (!last || last.toLowerCase() !== parte.toLowerCase()) out.push(parte);
  }
  return out.join(' ');
}
