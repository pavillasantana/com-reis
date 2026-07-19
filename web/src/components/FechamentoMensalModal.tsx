import React, { useState, useMemo } from 'react';
import {
  X, CalendarDays, Users, Send, CheckSquare,
  Square, Share2, ClipboardCopy, Check
} from 'lucide-react';
import type { Transacao } from '../store/useStore';
import { useI18n } from '../i18n';

interface FechamentoMensalProps {
  isOpen: boolean;
  onClose: () => void;
  transacoes: Transacao[];
  moedaBase: string;
  addTransacao: (tx: Omit<Transacao, 'id'>) => void;
  contaId: string; // default account
}

const MESES_KEYS = ['month_january','month_february','month_march','month_april','month_may','month_june','month_july','month_august','month_september','month_october','month_november','month_december'];

export const FechamentoMensalModal: React.FC<FechamentoMensalProps> = ({
  isOpen, onClose, transacoes, moedaBase, addTransacao, contaId,
}) => {
  const { t } = useI18n();
  const hoje = new Date();
  const [mesIdx, setMesIdx] = useState(hoje.getMonth());
  const [anoSel, setAnoSel] = useState(hoje.getFullYear());
  const [participantes, setParticipantes] = useState<string[]>([t('web_closing_you'), t('web_closing_partner')]);
  const [novoParticipante, setNovoParticipante] = useState('');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [responsaveis, setResponsaveis] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [acertoFeito, setAcertoFeito] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const mesStr = `${anoSel}-${String(mesIdx + 1).padStart(2, '0')}`;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: moedaBase === 'USD' ? 'USD' : moedaBase === 'EUR' ? 'EUR' : 'BRL', minimumFractionDigits: 2 });

  const mesNome = t(MESES_KEYS[mesIdx]);

  const txsMes = useMemo(() =>
    transacoes.filter(t => t.tipo === 'despesa' && t.data_transacao.startsWith(mesStr)),
    [transacoes, mesStr]
  );

  const toggleTx = (id: string) => setSelecionadas(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const txsSelecionadas = txsMes.filter(t => selecionadas.has(t.id));
  const totalSel = txsSelecionadas.reduce((a, t) => a + t.valor, 0);

  // Cálculo por participante
  const splitPorParticipante: Record<string, number> = {};
  participantes.forEach(p => { splitPorParticipante[p] = 0; });
  txsSelecionadas.forEach(t => {
    const resp = responsaveis[t.id] || participantes[0];
    if (splitPorParticipante[resp] !== undefined) {
      splitPorParticipante[resp] += t.valor;
    }
  });
  const parteIgual = participantes.length > 0 ? totalSel / participantes.length : 0;
  const ajustes: Record<string, number> = {};
  participantes.forEach(p => { ajustes[p] = splitPorParticipante[p] - parteIgual; });

  // Gera texto para compartilhar
  const gerarTexto = () => {
    const linhas = [
      `📊 *${t('web_closing_title')} — ${mesNome}/${anoSel}*`,
      `${t('web_closing_total_expenses')}: ${fmt(totalSel)}`,
      `${t('web_closing_each_share')}: ${fmt(parteIgual)}`,
      '',
      `📋 *${t('web_closing_selected_expenses')}:*`,
      ...txsSelecionadas.map(t => `• ${t.descricao || t.categoria}: ${fmt(t.valor)} (${responsaveis[t.id] || participantes[0]})`),
      '',
      `⚖️ *${t('web_closing_generate')}:*`,
      ...participantes.map(p => {
        const a = ajustes[p];
        if (a > 0.01) return `• ${p} ${t('web_closing_paid', { amount: fmt(splitPorParticipante[p]) })} → ${t('web_closing_owes', { amount: fmt(a) })}`;
        if (a < -0.01) return `• ${p} ${t('web_closing_paid', { amount: fmt(splitPorParticipante[p]) })} → ${t('web_closing_receives', { amount: fmt(Math.abs(a)) })}`;
        return `• ${p} — ${t('web_closing_balanced')}`;
      }),
    ];
    return linhas.join('\n');
  };

  const handleCopiar = async () => {
    await navigator.clipboard.writeText(gerarTexto());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(gerarTexto());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleAcerto = () => {
    // Cria transação de acerto automático
    const quemDevolve = participantes.filter(p => ajustes[p] > 0.01);
    quemDevolve.forEach(p => {
      addTransacao({
        id_conta: contaId,
        tipo: 'receita',
        valor: ajustes[p],
        categoria: t('web_closing_monthly_settlement'),
        data_transacao: new Date().toISOString().split('T')[0],
        taxa_cambio_dia: 1,
        descricao: `${t('web_closing_generate')} ${mesNome}/${anoSel} — ${p}`,
      });
    });
    setAcertoFeito(true);
  };

  if (!isOpen) return null;

  const inputSt: React.CSSProperties = {
    background: 'var(--card-bg)', border: '1px solid var(--card-border)',
    borderRadius: '10px', padding: '9px 12px', color: 'var(--modal-text)',
    fontSize: '0.85rem', outline: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--modal-overlay)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1400, padding: '16px' }}>
      <div style={{ background: 'var(--modal-bg)', border: '1px solid var(--card-border)', borderRadius: '22px', width: '100%', maxWidth: '580px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-glass)', overflow: 'hidden' }}>

        {/* ── Header ── */}
        <div style={{ padding: '22px 26px 16px', borderBottom: '1px solid var(--card-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarDays size={18} color="#FFB400" />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{t('web_closing_title')}</h3>
            </div>
            <button onClick={onClose} style={{ background: 'var(--bg-color)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={15} /></button>
          </div>

          {/* Step indicator */}
          <div style={{ display: 'flex', gap: '4px', marginTop: '16px' }}>
            {[1,2,3].map(s => (
              <div key={s} style={{ flex: 1, height: '3px', borderRadius: '4px', background: step >= s ? '#FFB400' : 'var(--card-border)', transition: 'background 0.3s' }} />
            ))}
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {step === 1 ? t('web_closing_step1')
              : step === 2 ? t('web_closing_step2')
              : t('web_closing_step3')}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 26px' }}>

          {/* ── STEP 1: mês + participantes ── */}
          {step === 1 && (
            <>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>{t('web_closing_month_label')}</label>
                  <select value={mesIdx} onChange={e => setMesIdx(Number(e.target.value))} style={{ ...inputSt, width: '100%', cursor: 'pointer' }}>
                    {MESES_KEYS.map((mk, i) => <option key={i} value={i}>{t(mk)}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '5px' }}>{t('web_closing_year_label')}</label>
                  <select value={anoSel} onChange={e => setAnoSel(Number(e.target.value))} style={{ ...inputSt, width: '100%', cursor: 'pointer' }}>
                    {[anoSel - 1, anoSel, anoSel + 1].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                <Users size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                {t('web_closing_participants')}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {participantes.map(p => (
                  <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: 'rgba(255,180,0,0.06)', border: '1px solid rgba(255,180,0,0.2)', borderRadius: '20px', fontSize: '0.8rem', color: '#B8860B' }}>
                    {p}
                    <button onClick={() => setParticipantes(prev => prev.filter(x => x !== p))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FFB400', padding: 0, lineHeight: 1 }}><X size={11} /></button>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={novoParticipante} onChange={e => setNovoParticipante(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && novoParticipante.trim()) { setParticipantes(p => [...p, novoParticipante.trim()]); setNovoParticipante(''); } }} placeholder={t('web_closing_add_participant') + '...'} style={{ ...inputSt, flex: 1 }} />
                <button onClick={() => { if (novoParticipante.trim()) { setParticipantes(p => [...p, novoParticipante.trim()]); setNovoParticipante(''); } }} style={{ padding: '9px 16px', background: 'rgba(255,180,0,0.15)', border: '1px solid rgba(255,180,0,0.3)', borderRadius: '10px', cursor: 'pointer', color: '#FFB400', fontWeight: 700, fontSize: '0.82rem' }}>
                  {t('web_closing_add_button')}
                </button>
              </div>

              <div style={{ marginTop: '20px', padding: '12px 16px', background: 'var(--bg-color)', borderRadius: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Despesas encontradas em {mesNome}/{anoSel}: <strong style={{ color: '#FFB400' }}>{txsMes.length}</strong>
              </div>
            </>
          )}

          {/* ── STEP 2: selecionar despesas ── */}
          {step === 2 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selecionadas.size} {t('web_closing_selected_count')} · {t('web_closing_total_expenses')}: <strong style={{ color: '#FFB400' }}>{fmt(totalSel)}</strong></span>
                <button onClick={() => setSelecionadas(new Set(txsMes.map(t => t.id)))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-cyan)', fontSize: '0.78rem', fontWeight: 700 }}>
                  {t('web_closing_select_all')}
                </button>
              </div>
              {txsMes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>{t('web_closing_no_expenses_month', { month: mesNome, year: String(anoSel) })}</div>
              ) : (
                txsMes.map(t => (
                  <div key={t.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '10px', alignItems: 'center', padding: '10px 12px', borderRadius: '12px', marginBottom: '4px', background: selecionadas.has(t.id) ? 'rgba(255,180,0,0.05)' : 'transparent', border: `1px solid ${selecionadas.has(t.id) ? 'rgba(255,180,0,0.2)' : 'transparent'}`, cursor: 'pointer' }}
                    onClick={() => toggleTx(t.id)}
                  >
                    {selecionadas.has(t.id) ? <CheckSquare size={16} color="#FFB400" /> : <Square size={16} color="var(--text-muted)" />}
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.descricao || t.categoria}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.data_transacao} · {t.categoria}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#FF5252', fontSize: '0.88rem' }}>{fmt(t.valor)}</div>
                      {selecionadas.has(t.id) && participantes.length > 1 && (
                        <select
                          value={responsaveis[t.id] || participantes[0]}
                          onChange={e => { e.stopPropagation(); setResponsaveis(r => ({ ...r, [t.id]: e.target.value })); }}
                          onClick={e => e.stopPropagation()}
                          style={{ ...inputSt, padding: '3px 6px', fontSize: '0.72rem', marginTop: '4px', width: '100%' }}
                        >
                          {participantes.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* ── STEP 3: resumo + acerto ── */}
          {step === 3 && (
            <>
              <div style={{ background: 'var(--bg-color)', border: '1px solid rgba(255,180,0,0.2)', borderRadius: '14px', padding: '18px', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 700, color: '#B8860B' }}>{t('web_closing_summary', { month: mesNome, year: String(anoSel) })}</h4>
                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('web_closing_total_selected')}</span><strong>{fmt(totalSel)}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('web_closing_participants')}</span><strong>{participantes.length}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{t('web_closing_equal_share')}</span><strong style={{ color: '#FFB400' }}>{fmt(parteIgual)}</strong></div>
                </div>
              </div>

              {participantes.map(p => {
                const a = ajustes[p];
                const devolver = a > 0.01;
                const receber = a < -0.01;
                return (
                  <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '12px', marginBottom: '6px', background: 'var(--bg-color)', border: '1px solid var(--card-border)' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('web_closing_paid', { amount: fmt(splitPorParticipante[p]) })}</div>
                    </div>
                    <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, background: devolver ? 'rgba(255,82,82,0.12)' : receber ? 'rgba(0,230,118,0.12)' : 'rgba(255,255,255,0.06)', color: devolver ? '#FF5252' : receber ? '#00E676' : 'var(--text-muted)' }}>
                      {devolver ? t('web_closing_owes', { amount: fmt(a) }) : receber ? t('web_closing_receives', { amount: fmt(Math.abs(a)) }) : t('web_closing_balanced')}
                    </span>
                  </div>
                );
              })}

              <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
                <button onClick={handleCopiar} style={{ flex: 1, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.82rem' }}>
                  {copied ? <><Check size={14} />{t('web_closing_copied')}</> : <><ClipboardCopy size={14} />{t('web_closing_copy_text')}</>}
                </button>
                <button onClick={handleWhatsApp} style={{ flex: 1, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: '12px', cursor: 'pointer', color: '#25D366', fontWeight: 600, fontSize: '0.82rem' }}>
                  <Share2 size={14} />WhatsApp
                </button>
                {!acertoFeito && (
                  <button onClick={handleAcerto} style={{ flex: 1.5, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'linear-gradient(135deg,#FFB400,#FF8C00)', border: 'none', borderRadius: '12px', cursor: 'pointer', color: '#000', fontWeight: 700, fontSize: '0.82rem' }}>
                    <Send size={14} />{t('web_closing_register_settlement')}
                  </button>
                )}
                {acertoFeito && (
                  <div style={{ flex: 1.5, padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.25)', borderRadius: '12px', color: '#00E676', fontWeight: 700, fontSize: '0.82rem' }}>
                    <Check size={14} />{t('web_closing_settlement_registered')}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Footer navigation ── */}
        <div style={{ padding: '14px 26px', borderTop: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button onClick={() => step > 1 ? setStep(s => (s - 1) as 1|2|3) : onClose()} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '10px', cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>
            {step === 1 ? t('cancel') : t('web_closing_back')}
          </button>
          {step < 3 && (
            <button onClick={() => setStep(s => (s + 1) as 1|2|3)} disabled={step === 2 && selecionadas.size === 0} style={{ padding: '10px 28px', background: 'linear-gradient(135deg,#FFB400,#FF8C00)', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#000', fontWeight: 700, fontSize: '0.85rem', opacity: (step === 2 && selecionadas.size === 0) ? 0.5 : 1 }}>
              {t('web_closing_next')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
