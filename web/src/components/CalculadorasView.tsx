import React, { useState } from 'react';
import { useI18n } from '../i18n';
import { formatCurrency } from '../utils/currency';
import {
  TAXAS_REFERENCIA,
  jurosCompostos,
  jurosSimples,
  converterTaxaMensalParaAnual,
  converterTaxaAnualParaMensal,
  calcularInvestimentoIndexado,
  calcularCDB,
  calcularPoupanca,
  calcularFGTS,
  calcularFerias,
  calcularFeriasProporcionais,
  calcularAbonoFerias,
  calcularSalarioLiquidoBR,
  calcularSalarioLiquidoAR,
  calcularRescisaoCLT,
  calcularFinanciamentoPrice,
  calcularFinanciamentoSAC,
} from '../utils/calculadoras';

type CalcId =
  | 'cdi' | 'lca' | 'lci' | 'cdb'
  | 'compostos' | 'simples' | 'taxas'
  | 'ferias' | 'salario' | 'fgts' | 'rescisao'
  | 'poupanca' | 'dias' | 'emprestimo' | 'financiamento';

type Pais = 'BR' | 'AR';

interface CalculadorasViewProps {
  moeda: string;
}

function Field({
  label, value, onChange, type = 'number', placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: 600 }}>
        {label}
      </label>
      <input
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        className="input-text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--card-border)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: '0.95rem', fontWeight: highlight ? 800 : 600, color: highlight ? 'var(--accent-blue)' : 'var(--text-main)' }}>
        {value}
      </span>
    </div>
  );
}

function num(v: string): number {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function CalculadorasView({ moeda }: CalculadorasViewProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState<CalcId | null>(null);
  const [pais, setPais] = useState<Pais>(moeda === 'ARS' ? 'AR' : 'BR');

  const iconMap: Record<CalcId, string> = {
    cdi: 'trending_up', lca: 'savings', lci: 'savings', cdb: 'account_balance',
    compostos: 'auto_graph', simples: 'percent', taxas: 'swap_vert',
    ferias: 'beach_access', salario: 'payments', fgts: 'home_work', rescisao: 'work_off',
    poupanca: 'piggy_bank', dias: 'event', emprestimo: 'credit_score', financiamento: 'house',
  };

  const cards: Array<{ id: CalcId; title: string }> = [
    { id: 'cdi', title: t('calc_cdi') },
    { id: 'lca', title: t('calc_lca') },
    { id: 'lci', title: t('calc_lci') },
    { id: 'cdb', title: t('calc_cdb') },
    { id: 'compostos', title: t('calc_juros_compostos') },
    { id: 'simples', title: t('calc_juros_simples') },
    { id: 'taxas', title: t('calc_taxas') },
    { id: 'ferias', title: t('calc_ferias') },
    { id: 'salario', title: t('calc_salario_liquido') },
    { id: 'fgts', title: t('calc_fgts') },
    { id: 'rescisao', title: t('calc_rescisao') },
    { id: 'poupanca', title: t('calc_poupanca') },
    { id: 'dias', title: t('calc_dias') },
    { id: 'emprestimo', title: t('calc_emprestimo') },
    { id: 'financiamento', title: t('calc_financiamento') },
  ];

  const currency = pais === 'AR' ? 'ARS' : 'BRL';
  const fmt = (v: number) => formatCurrency(v, currency);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px 80px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
          {t('calc_title')}
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 12px' }}>
          {t('calc_desc')}
        </p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          {(['BR', 'AR'] as Pais[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPais(p)}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--card-border)',
                background: pais === p ? 'var(--accent-blue)' : 'var(--card-bg)',
                color: pais === p ? '#fff' : 'var(--text-secondary)',
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
              }}
            >
              {p === 'BR' ? 'Brasil (BRL)' : 'Argentina (ARS)'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => setOpen(open === card.id ? null : card.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
              background: open === card.id ? 'var(--accent-blue)' : 'var(--card-bg)',
              border: '1px solid var(--card-border)', borderRadius: '14px', cursor: 'pointer',
              color: open === card.id ? '#fff' : 'var(--text-main)', transition: 'all 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: open === card.id ? '#fff' : 'var(--accent-blue)' }}>
              {iconMap[card.id]}
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{card.title}</span>
          </button>
        ))}
      </div>

      {open && (
        <div className="fade-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '24px', maxWidth: '560px' }}>
          {open === 'cdi' && <CdiCalc fmt={fmt} t={t} />}
          {open === 'lca' && <LcaLciCalc fmt={fmt} t={t} isento />}
          {open === 'lci' && <LcaLciCalc fmt={fmt} t={t} isento />}
          {open === 'cdb' && <CdbCalc fmt={fmt} t={t} />}
          {open === 'compostos' && <CompostosCalc fmt={fmt} t={t} />}
          {open === 'simples' && <SimplesCalc fmt={fmt} t={t} />}
          {open === 'taxas' && <TaxasCalc t={t} />}
          {open === 'ferias' && <FeriasCalc fmt={fmt} t={t} />}
          {open === 'salario' && <SalarioCalc fmt={fmt} t={t} pais={pais} />}
          {open === 'fgts' && <FgtsCalc fmt={fmt} t={t} />}
          {open === 'rescisao' && <RescisaoCalc fmt={fmt} t={t} />}
          {open === 'poupanca' && <PoupancaCalc fmt={fmt} t={t} />}
          {open === 'dias' && <DiasCalc t={t} />}
          {open === 'emprestimo' && <EmprestimoCalc fmt={fmt} t={t} />}
          {open === 'financiamento' && <FinanciamentoCalc fmt={fmt} t={t} />}
        </div>
      )}
    </div>
  );
}

type T = (key: string, params?: Record<string, string | number>) => string;

function CdiCalc({ fmt, t }: { fmt: (v: number) => string; t: T }) {
  const [valor, setValor] = useState('10000');
  const [percentual, setPercentual] = useState('100');
  const [meses, setMeses] = useState('12');
  const res = calcularInvestimentoIndexado(num(valor), num(percentual), TAXAS_REFERENCIA.cdi, num(meses));
  return (
    <CalcPanel title={t('calc_cdi')} note={t('calc_taxa_referencia', { taxa: TAXAS_REFERENCIA.cdi })}>
      <Field label={t('calc_valor')} value={valor} onChange={setValor} />
      <Field label={t('calc_percentual')} value={percentual} onChange={setPercentual} />
      <Field label={t('calc_meses')} value={meses} onChange={setMeses} />
      <Row label={t('calc_montante')} value={fmt(res.bruto)} highlight />
      <Row label={t('calc_juros')} value={fmt(res.juros)} />
    </CalcPanel>
  );
}

function LcaLciCalc({ fmt, t, isento }: { fmt: (v: number) => string; t: T; isento: boolean }) {
  const [valor, setValor] = useState('10000');
  const [percentual, setPercentual] = useState('95');
  const [meses, setMeses] = useState('12');
  const res = calcularInvestimentoIndexado(num(valor), num(percentual), TAXAS_REFERENCIA.cdi, num(meses));
  return (
    <CalcPanel title={t(isento ? 'calc_lca' : 'calc_lci')} note={`${t('calc_taxa_referencia', { taxa: TAXAS_REFERENCIA.cdi })} · ${t('calc_isento_ir')}`}>
      <Field label={t('calc_valor')} value={valor} onChange={setValor} />
      <Field label={t('calc_percentual')} value={percentual} onChange={setPercentual} />
      <Field label={t('calc_meses')} value={meses} onChange={setMeses} />
      <Row label={t('calc_montante')} value={fmt(res.bruto)} highlight />
      <Row label={t('calc_juros')} value={fmt(res.juros)} />
    </CalcPanel>
  );
}

function CdbCalc({ fmt, t }: { fmt: (v: number) => string; t: T }) {
  const [valor, setValor] = useState('10000');
  const [percentual, setPercentual] = useState('100');
  const [meses, setMeses] = useState('12');
  const res = calcularCDB(num(valor), num(percentual), TAXAS_REFERENCIA.cdi, num(meses));
  return (
    <CalcPanel title={t('calc_cdb')} note={t('calc_ir_regressivo')}>
      <Field label={t('calc_valor')} value={valor} onChange={setValor} />
      <Field label={t('calc_percentual')} value={percentual} onChange={setPercentual} />
      <Field label={t('calc_meses')} value={meses} onChange={setMeses} />
      <Row label={t('calc_bruto')} value={fmt(res.bruto)} />
      <Row label={t('calc_ir')} value={fmt(res.ir ?? 0)} />
      <Row label={t('calc_liquido')} value={fmt(res.liquido ?? 0)} highlight />
    </CalcPanel>
  );
}

function CompostosCalc({ fmt, t }: { fmt: (v: number) => string; t: T }) {
  const [valor, setValor] = useState('10000');
  const [aporte, setAporte] = useState('0');
  const [taxa, setTaxa] = useState('1');
  const [meses, setMeses] = useState('12');
  const montante = jurosCompostos(num(valor), num(taxa), num(meses), num(aporte));
  const juros = montante - num(valor) - num(aporte) * num(meses);
  return (
    <CalcPanel title={t('calc_juros_compostos')}>
      <Field label={t('calc_valor')} value={valor} onChange={setValor} />
      <Field label={t('calc_aporte')} value={aporte} onChange={setAporte} />
      <Field label={t('calc_taxa_mensal')} value={taxa} onChange={setTaxa} />
      <Field label={t('calc_meses')} value={meses} onChange={setMeses} />
      <Row label={t('calc_montante')} value={fmt(montante)} highlight />
      <Row label={t('calc_juros')} value={fmt(juros)} />
    </CalcPanel>
  );
}

function SimplesCalc({ fmt, t }: { fmt: (v: number) => string; t: T }) {
  const [valor, setValor] = useState('10000');
  const [taxa, setTaxa] = useState('1');
  const [meses, setMeses] = useState('12');
  const res = jurosSimples(num(valor), num(taxa), num(meses));
  return (
    <CalcPanel title={t('calc_juros_simples')}>
      <Field label={t('calc_valor')} value={valor} onChange={setValor} />
      <Field label={t('calc_taxa_mensal')} value={taxa} onChange={setTaxa} />
      <Field label={t('calc_meses')} value={meses} onChange={setMeses} />
      <Row label={t('calc_montante')} value={fmt(res.montante)} highlight />
      <Row label={t('calc_juros')} value={fmt(res.juros)} />
    </CalcPanel>
  );
}

function TaxasCalc({ t }: { t: T }) {
  const [anual, setAnual] = useState('12');
  const [mensal, setMensal] = useState('1');
  return (
    <CalcPanel title={t('calc_taxas')}>
      <Field label={t('calc_taxa_anual')} value={anual} onChange={setAnual} />
      <Field label={t('calc_taxa_mensal')} value={mensal} onChange={setMensal} />
      <Row label={t('calc_mensal_equiv')} value={`${converterTaxaAnualParaMensal(num(anual)).toFixed(4)}%`} />
      <Row label={t('calc_anual_equiv')} value={`${converterTaxaMensalParaAnual(num(mensal)).toFixed(2)}%`} />
    </CalcPanel>
  );
}

function FeriasCalc({ fmt, t }: { fmt: (v: number) => string; t: T }) {
  const [tipo, setTipo] = useState<'completas' | 'proporcionais' | 'abono'>('completas');
  const [salario, setSalario] = useState('3000');
  const [dias, setDias] = useState('30');
  const [meses, setMeses] = useState('6');
  const valor = tipo === 'completas'
    ? calcularFerias(num(salario), num(dias))
    : tipo === 'proporcionais'
      ? calcularFeriasProporcionais(num(salario), num(meses))
      : calcularAbonoFerias(num(salario));
  return (
    <CalcPanel title={t('calc_ferias')}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {(['completas', 'proporcionais', 'abono'] as const).map((tp) => (
          <button
            key={tp}
            type="button"
            onClick={() => setTipo(tp)}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--card-border)',
              background: tipo === tp ? 'var(--accent-blue)' : 'var(--card-bg)',
              color: tipo === tp ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
            }}
          >
            {t(tp === 'completas' ? 'calc_ferias_completas' : tp === 'proporcionais' ? 'calc_ferias_proporcionais' : 'calc_ferias_abono')}
          </button>
        ))}
      </div>
      <Field label={t('calc_salario')} value={salario} onChange={setSalario} />
      {tipo === 'completas' && <Field label={t('calc_dias_ferias')} value={dias} onChange={setDias} />}
      {tipo === 'proporcionais' && <Field label={t('calc_meses_ano')} value={meses} onChange={setMeses} />}
      <Row label={t('calc_valor_receber')} value={fmt(valor)} highlight />
    </CalcPanel>
  );
}

function SalarioCalc({ fmt, t, pais }: { fmt: (v: number) => string; t: T; pais: Pais }) {
  const [salario, setSalario] = useState('5000');
  const [dependentes, setDependentes] = useState('0');
  const br = calcularSalarioLiquidoBR(num(salario), num(dependentes));
  const ar = calcularSalarioLiquidoAR(num(salario));
  return (
    <CalcPanel title={t('calc_salario_liquido')}>
      <Field label={t('calc_salario')} value={salario} onChange={setSalario} />
      {pais === 'BR' ? (
        <>
          <Field label={t('calc_dependentes')} value={dependentes} onChange={setDependentes} />
          <Row label={t('calc_inss')} value={fmt(br.inss)} />
          <Row label={t('calc_irrf')} value={fmt(br.irrf)} />
          <Row label={t('calc_liquido')} value={fmt(br.liquido)} highlight />
        </>
      ) : (
        <>
          <Row label={t('calc_aportes')} value={fmt(ar.aportes)} />
          <Row label={t('calc_liquido')} value={fmt(ar.liquido)} highlight />
        </>
      )}
    </CalcPanel>
  );
}

function FgtsCalc({ fmt, t }: { fmt: (v: number) => string; t: T }) {
  const [salario, setSalario] = useState('3000');
  const [meses, setMeses] = useState('12');
  const res = calcularFGTS(num(salario), num(meses));
  return (
    <CalcPanel title={t('calc_fgts')}>
      <Field label={t('calc_salario')} value={salario} onChange={setSalario} />
      <Field label={t('calc_meses')} value={meses} onChange={setMeses} />
      <Row label={t('calc_depositos')} value={fmt(res.depositos)} />
      <Row label={t('calc_juros')} value={fmt(res.juros)} />
      <Row label={t('calc_total')} value={fmt(res.total)} highlight />
    </CalcPanel>
  );
}

function RescisaoCalc({ fmt, t }: { fmt: (v: number) => string; t: T }) {
  const [salario, setSalario] = useState('3000');
  const [diasMes, setDiasMes] = useState('15');
  const [mesesFerias, setMesesFerias] = useState('6');
  const [meses13, setMeses13] = useState('8');
  const [diasAviso, setDiasAviso] = useState('30');
  const [saldoFgts, setSaldoFgts] = useState('5000');
  const res = calcularRescisaoCLT({
    salario: num(salario),
    diasTrabalhadosNoMes: num(diasMes),
    mesesFeriasProporcionais: num(mesesFerias),
    mesesDecimoTerceiro: num(meses13),
    diasAvisoPrevio: num(diasAviso),
    saldoFGTS: num(saldoFgts),
  });
  return (
    <CalcPanel title={t('calc_rescisao')}>
      <Field label={t('calc_salario')} value={salario} onChange={setSalario} />
      <Field label={t('calc_dias_trabalhados')} value={diasMes} onChange={setDiasMes} />
      <Field label={t('calc_meses_ferias')} value={mesesFerias} onChange={setMesesFerias} />
      <Field label={t('calc_meses_13')} value={meses13} onChange={setMeses13} />
      <Field label={t('calc_dias_aviso')} value={diasAviso} onChange={setDiasAviso} />
      <Field label={t('calc_saldo_fgts')} value={saldoFgts} onChange={setSaldoFgts} />
      <Row label={t('calc_saldo_salario')} value={fmt(res.saldoSalario)} />
      <Row label={t('calc_aviso_valor')} value={fmt(res.avisoPrevio)} />
      <Row label={t('calc_ferias_prop')} value={fmt(res.feriasProporcionais)} />
      <Row label={t('calc_terceiro')} value={fmt(res.decimoTerceiro)} />
      <Row label={t('calc_multa')} value={fmt(res.multaFGTS)} />
      <Row label={t('calc_total')} value={fmt(res.total)} highlight />
    </CalcPanel>
  );
}

function PoupancaCalc({ fmt, t }: { fmt: (v: number) => string; t: T }) {
  const [valor, setValor] = useState('10000');
  const [aporte, setAporte] = useState('0');
  const [meses, setMeses] = useState('12');
  const res = calcularPoupanca(num(valor), num(aporte), TAXAS_REFERENCIA.poupanca, num(meses));
  return (
    <CalcPanel title={t('calc_poupanca')}>
      <Field label={t('calc_valor')} value={valor} onChange={setValor} />
      <Field label={t('calc_aporte')} value={aporte} onChange={setAporte} />
      <Field label={t('calc_meses')} value={meses} onChange={setMeses} />
      <Row label={t('calc_montante')} value={fmt(res.bruto)} highlight />
      <Row label={t('calc_juros')} value={fmt(res.juros)} />
    </CalcPanel>
  );
}

function DiasCalc({ t }: { t: T }) {
  const hoje = new Date();
  const pad = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const futuro = new Date(hoje);
  futuro.setDate(futuro.getDate() + 30);
  const [inicio, setInicio] = useState(pad(hoje));
  const [fim, setFim] = useState(pad(futuro));
  const dInicio = new Date(`${inicio}T00:00:00`);
  const dFim = new Date(`${fim}T00:00:00`);
  const dias = Math.round((dFim.getTime() - dInicio.getTime()) / (1000 * 60 * 60 * 24));
  return (
    <CalcPanel title={t('calc_dias')}>
      <Field label={t('calc_data_inicial')} value={inicio} onChange={setInicio} type="date" />
      <Field label={t('calc_data_final')} value={fim} onChange={setFim} type="date" />
      <Row label={t('calc_dias_restantes')} value={`${Math.max(0, dias)} ${t('calc_dias_unidade')}`} highlight />
      {dias < 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>{t('calc_dias_passado')}</div>
      )}
    </CalcPanel>
  );
}

function EmprestimoCalc({ fmt, t }: { fmt: (v: number) => string; t: T }) {
  const [valor, setValor] = useState('10000');
  const [taxa, setTaxa] = useState('2');
  const [parcelas, setParcelas] = useState('24');
  const res = calcularFinanciamentoPrice(num(valor), num(taxa), num(parcelas));
  return (
    <CalcPanel title={t('calc_emprestimo')}>
      <Field label={t('calc_valor')} value={valor} onChange={setValor} />
      <Field label={t('calc_taxa_mensal')} value={taxa} onChange={setTaxa} />
      <Field label={t('calc_parcelas')} value={parcelas} onChange={setParcelas} />
      <Row label={t('calc_parcela')} value={fmt(res.valorParcela)} highlight />
      <Row label={t('calc_total_pago')} value={fmt(res.totalPago)} />
      <Row label={t('calc_juros')} value={fmt(res.jurosTotais)} />
    </CalcPanel>
  );
}

function FinanciamentoCalc({ fmt, t }: { fmt: (v: number) => string; t: T }) {
  const [sistema, setSistema] = useState<'price' | 'sac'>('price');
  const [valor, setValor] = useState('300000');
  const [taxa, setTaxa] = useState('0.8');
  const [parcelas, setParcelas] = useState('360');
  const price = calcularFinanciamentoPrice(num(valor), num(taxa), num(parcelas));
  const sac = calcularFinanciamentoSAC(num(valor), num(taxa), num(parcelas));
  return (
    <CalcPanel title={t('calc_financiamento')}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        {(['price', 'sac'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSistema(s)}
            style={{
              padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--card-border)',
              background: sistema === s ? 'var(--accent-blue)' : 'var(--card-bg)',
              color: sistema === s ? '#fff' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
            }}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>
      <Field label={t('calc_valor')} value={valor} onChange={setValor} />
      <Field label={t('calc_taxa_mensal')} value={taxa} onChange={setTaxa} />
      <Field label={t('calc_parcelas')} value={parcelas} onChange={setParcelas} />
      {sistema === 'price' ? (
        <>
          <Row label={t('calc_parcela')} value={fmt(price.valorParcela)} highlight />
          <Row label={t('calc_total_pago')} value={fmt(price.totalPago)} />
          <Row label={t('calc_juros')} value={fmt(price.jurosTotais)} />
        </>
      ) : (
        <>
          <Row label={t('calc_primeira')} value={fmt(sac.primeiraParcela)} highlight />
          <Row label={t('calc_ultima')} value={fmt(sac.ultimaParcela)} />
          <Row label={t('calc_total_pago')} value={fmt(sac.totalPago)} />
          <Row label={t('calc_juros')} value={fmt(sac.jurosTotais)} />
        </>
      )}
    </CalcPanel>
  );
}

function CalcPanel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{title}</h3>
        {note && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{note}</span>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{children}</div>
    </div>
  );
}
