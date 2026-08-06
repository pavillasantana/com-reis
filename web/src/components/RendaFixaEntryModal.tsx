import React, { useState } from 'react';
import { X, Check, Landmark } from 'lucide-react';
import { formatCurrency } from '../utils/currency';
import { createTransacaoAtivo } from '../services/supabaseService';
import type { TransacaoAtivo } from '../services/supabaseService';
import { getCategoriaInfo, getNomeSubcategoria, INDICES_RENDA_FIXA } from '../utils/investmentCategories';
import { useToast } from './Toast';

interface RendaFixaFormProps {
  id_usuario: string;
  moedaBase: string;
  onClose: () => void;
  onSaved: (tx: TransacaoAtivo) => void;
}

export const CLEAN_CARD = '#FFFFFF';
export const CLEAN_TEXT = '#1A2744';
export const CLEAN_TEXT_SECONDARY = '#64748B';
export const CLEAN_TEXT_MUTED = '#94A3B8';
export const CLEAN_BORDER = '#E2E8F0';
export const ACCENT_BLUE = '#1045A1';
export const ACCENT_GREEN = '#10B981';

const FORMAS: { id: string; nome: string }[] = [
  { id: 'pos_fixado', nome: 'Pós-fixado' },
  { id: 'prefixado', nome: 'Prefixado' },
  { id: 'hibrido', nome: 'Híbrido' },
];

export const RendaFixaForm: React.FC<RendaFixaFormProps> = ({
  id_usuario, moedaBase, onClose, onSaved,
}) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [emissor, setEmissor] = useState('');
  const [tipoTitulo, setTipoTitulo] = useState('cdb_rdb');
  const [indice, setIndice] = useState('cdi');
  const [taxa, setTaxa] = useState('');
  const [forma, setForma] = useState('');
  const [valor, setValor] = useState('');
  const [dataTransacao, setDataTransacao] = useState(new Date().toISOString().split('T')[0]);
  const [vencimento, setVencimento] = useState('');
  const [liquidezDiaria, setLiquidezDiaria] = useState(false);

  const inputStyle: React.CSSProperties = {
    background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
    borderRadius: '10px', padding: '10px 14px', color: CLEAN_TEXT,
    fontSize: '0.88rem', width: '100%', outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem', color: CLEAN_TEXT_SECONDARY, fontWeight: 700,
    textTransform: 'uppercase', display: 'block', marginBottom: '6px',
  };
  const subcategorias = getCategoriaInfo('renda_fixa_br')?.subcategorias || [];
  const taxaLabel = indice === 'cdi'
    ? 'Taxa do CDI'
    : indice === 'selic'
      ? 'Taxa da Selic'
      : indice === 'ipca'
        ? 'Spread do IPCA+'
        : indice === 'prefixado'
          ? 'Taxa fixa (a.a.)'
          : 'Taxa / spread';
  const taxaPlaceholder = indice === 'cdi' || indice === 'selic'
    ? 'Ex.: 120'
    : indice === 'ipca'
      ? 'Ex.: 5,5'
      : indice === 'prefixado'
        ? 'Ex.: 14'
        : 'Ex.: 100';
  const valorNum = parseFloat(valor.replace(',', '.'));

  const handleSalvar = async () => {
    const taxaNum = taxa === '' ? null : parseFloat(taxa.replace(',', '.'));
    if (tipoTitulo && (isNaN(valorNum) || valorNum <= 0)) {
      toast.error('Informe o valor investido.');
      return;
    }
    setSaving(true);
    const formaFinal = forma
      || (indice === 'ipca' ? 'hibrido' : (indice === 'prefixado' ? 'prefixado' : 'pos_fixado'));
    const ticker = (emissor.trim() || getNomeSubcategoria('renda_fixa_br', tipoTitulo)).toUpperCase();
    const { data, error } = await createTransacaoAtivo({
      id_usuario,
      ticker,
      tipo: 'compra',
      quantidade: 1,
      preco_unitario: isNaN(valorNum) ? 0 : valorNum,
      data_transacao: dataTransacao,
      categoria: 'renda_fixa_br',
      subcategoria: tipoTitulo,
      indice,
      percentual_indexacao: taxaNum ?? undefined,
      data_vencimento: vencimento || undefined,
      emissor: emissor.trim() || undefined,
      forma: formaFinal,
      liquidez_diaria: liquidezDiaria,
    });
    setSaving(false);
    if (data && !error) {
      toast.success('Renda fixa registrada!');
      onSaved(data);
      onClose();
    } else {
      toast.error(error || 'Erro ao registrar renda fixa.');
    }
  };

  return (
    <div>
      <label style={labelStyle}>Tipo de ativo</label>
      <div style={{
        marginBottom: '16px', padding: '10px 14px', borderRadius: '10px',
        background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)',
        fontSize: '0.88rem', fontWeight: 700, color: ACCENT_GREEN,
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <Check size={15} /> Renda Fixa
      </div>

      <label style={labelStyle}>Emissor</label>
      <input
        value={emissor}
        onChange={e => setEmissor(e.target.value)}
        placeholder="Banco Inter, Tesouro Nacional, XP..."
        style={{ ...inputStyle, marginBottom: '16px' }}
      />

      <label style={labelStyle}>Tipo de título</label>
      <select value={tipoTitulo} onChange={e => setTipoTitulo(e.target.value)} style={{ ...inputStyle, marginBottom: '16px', cursor: 'pointer' }}>
        {subcategorias.map(sub => <option key={sub.id} value={sub.id}>{sub.nome}</option>)}
      </select>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Indexador</label>
          <select value={indice} onChange={e => setIndice(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
            {INDICES_RENDA_FIXA.map(i => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>{taxaLabel}</label>
          <input
            type="number" step="0.01" min="0"
            value={taxa}
            onChange={e => setTaxa(e.target.value)}
            placeholder={taxaPlaceholder}
            style={inputStyle}
          />
        </div>
      </div>

      <label style={labelStyle}>Forma (Opcional)</label>
      <select value={forma} onChange={e => setForma(e.target.value)} style={{ ...inputStyle, marginBottom: '16px', cursor: 'pointer' }}>
        <option value="">Selecione (deriva do indexador)</option>
        {FORMAS.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
      </select>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={labelStyle}>Valor (Opcional)</label>
          <input
            type="number" min="0" step="0.01"
            value={valor}
            onChange={e => setValor(e.target.value)}
            placeholder="0,00"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Data da transação</label>
          <input type="date" value={dataTransacao} onChange={e => setDataTransacao(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }} />
        </div>
      </div>

      <label
        onClick={() => setLiquidezDiaria(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
          padding: '10px 14px', borderRadius: '10px', border: `1px solid ${CLEAN_BORDER}`,
          cursor: 'pointer', fontSize: '0.88rem', color: CLEAN_TEXT, fontWeight: 600,
        }}
      >
        <span style={{
          width: '18px', height: '18px', borderRadius: '6px', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: liquidezDiaria ? ACCENT_GREEN : CLEAN_CARD,
          border: `1px solid ${liquidezDiaria ? ACCENT_GREEN : CLEAN_BORDER}`,
          color: '#fff',
        }}>
          {liquidezDiaria && <Check size={12} />}
        </span>
        Liquidez diária
      </label>

      <label style={labelStyle}>Data de vencimento</label>
      <input type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} style={{ ...inputStyle, marginBottom: '20px', cursor: 'pointer' }} />

      <div style={{
        marginBottom: '20px', padding: '12px 16px',
        background: 'rgba(16,69,161,0.06)', borderRadius: '10px',
        fontSize: '0.82rem', color: CLEAN_TEXT_SECONDARY,
      }}>
        Valor total <strong style={{ color: ACCENT_BLUE }}>{formatCurrency(isNaN(valorNum) ? 0 : valorNum, moedaBase)}</strong>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={onClose} style={{
          flex: 1, padding: '12px', background: 'transparent',
          border: `1px solid ${CLEAN_BORDER}`, borderRadius: '12px',
          cursor: 'pointer', color: CLEAN_TEXT_SECONDARY, fontWeight: 600,
        }}>Cancelar</button>
        <button
          onClick={handleSalvar}
          disabled={saving}
          style={{
            flex: 1.5, padding: '12px', background: ACCENT_BLUE, border: 'none',
            borderRadius: '12px', cursor: 'pointer', color: '#fff', fontWeight: 700,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Salvando...' : 'Registrar renda fixa'}
        </button>
      </div>
    </div>
  );
};

interface RendaFixaEntryModalProps {
  id_usuario: string;
  moedaBase: string;
  onClose: () => void;
  onSaved: (tx: TransacaoAtivo) => void;
}

export const RendaFixaEntryModal: React.FC<RendaFixaEntryModalProps> = (props) => {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px',
    }}>
      <div style={{
        background: CLEAN_CARD, border: `1px solid ${CLEAN_BORDER}`,
        borderRadius: '20px', padding: '32px', width: '100%', maxWidth: '480px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.12)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: CLEAN_TEXT }}>Renda Fixa</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '0.75rem', color: CLEAN_TEXT_MUTED }}>
              <Landmark size={13} /> Registro manual de título de renda fixa
            </div>
          </div>
          <button onClick={props.onClose} style={{
            background: 'transparent', border: `1px solid ${CLEAN_BORDER}`,
            borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: CLEAN_TEXT_MUTED,
          }}><X size={16} /></button>
        </div>

        <RendaFixaForm {...props} />
      </div>
    </div>
  );
};
