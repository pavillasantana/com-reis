/**
 * FAQTermos.tsx — Telas estáticas de Ajuda/FAQ e Política de Privacidade (LGPD)
 * Phase 1: Infraestrutura e Segurança
 */
import { useState } from 'react';

import { ChevronDown, ChevronUp, Shield, HelpCircle, X } from 'lucide-react';

// ─── FAQ ────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'O Com Réis armazena minha senha bancária?',
    a: 'Não. O Com Réis nunca armazena senhas de contas bancárias. Você registra apenas seus saldos e transações manualmente ou por importação de extratos (CSV/OFX). Não temos acesso às suas contas bancárias.'
  },
  {
    q: 'Meus dados financeiros são seguros?',
    a: 'Sim. Seus dados são protegidos pelo Supabase (infraestrutura PostgreSQL com RLS — Row Level Security), garantindo que apenas você acesse suas informações. Toda comunicação é criptografada via HTTPS/TLS.'
  },
  {
    q: 'O que acontece se eu perder acesso à internet?',
    a: 'O Com Réis persiste seus dados localmente via localStorage. Você pode continuar visualizando e registrando transações offline. Ao reconectar, os dados são sincronizados automaticamente com a nuvem.'
  },
  {
    q: 'Como funciona a sincronização entre Web e App Android?',
    a: 'Ambas as plataformas usam o mesmo banco de dados Supabase. Ao fazer login com o mesmo e-mail, seus espaços, contas, transações e caixinhas estão disponíveis em todos os dispositivos em tempo real.'
  },
  {
    q: 'Posso excluir minha conta e todos os meus dados?',
    a: 'Sim. Você pode solicitar a exclusão completa de sua conta e dados enviando um e-mail para privacidade@comreis.com. Cumprimos os prazos da LGPD (até 15 dias úteis para confirmação).'
  },
  {
    q: 'O plano gratuito tem limite de transações?',
    a: 'O plano gratuito permite transações ilimitadas em um único espaço de trabalho, com até 3 caixinhas de metas. O plano Premium desbloqueia espaços ilimitados (PF + PJ), importação ilimitada e cotações em tempo real.'
  },
  {
    q: 'Como importar meu extrato bancário?',
    a: 'Acesse o painel principal, selecione uma conta de destino e clique em "Selecionar Extrato". Suportamos os formatos CSV, OFX, XLSX e PDF. Recomendamos exportar o extrato diretamente do internet banking do seu banco.'
  },
  {
    q: 'O Com Réis está em conformidade com a LGPD?',
    a: 'Sim. Coletamos apenas os dados necessários para o funcionamento do serviço. Você pode solicitar portabilidade, correção ou exclusão dos seus dados a qualquer momento. Consulte nossa Política de Privacidade completa.'
  }
];

export function FAQModal({ onClose }: { onClose: () => void }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '680px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-glass)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem', fontWeight: 800 }}>
            <HelpCircle size={24} color="var(--accent-blue)" />
            Ajuda & FAQ
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={22} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQ_ITEMS.map((item, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--card-border)',
                borderRadius: '16px',
                overflow: 'hidden',
                border: openIndex === idx ? '1px solid var(--accent-blue)' : '1px solid transparent',
                transition: 'border-color 0.2s'
              }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  textAlign: 'left',
                  gap: '12px'
                }}
              >
                <span>{item.q}</span>
                {openIndex === idx
                  ? <ChevronUp size={18} color="var(--accent-blue)" />
                  : <ChevronDown size={18} color="var(--text-muted)" />
                }
              </button>
              {openIndex === idx && (
                <div style={{
                  padding: '0 20px 20px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.9rem',
                  lineHeight: '1.7'
                }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <p style={{ marginTop: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Ainda com dúvidas? Entre em contato: <a href="mailto:suporte@comreis.com">suporte@comreis.com</a>
        </p>
      </div>
    </div>
  );
}

// ─── TERMOS DE PRIVACIDADE ───────────────────────────────────────────────────

export function TermosModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '720px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-glass)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem', fontWeight: 800 }}>
            <Shield size={24} color="var(--accent-green)" />
            Política de Privacidade & LGPD
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <X size={22} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Última atualização: Janeiro de 2026 • Em conformidade com a Lei nº 13.709/2018 (LGPD)
        </p>

        {[
          {
            title: '1. Dados que Coletamos',
            body: 'Coletamos apenas os dados estritamente necessários para o funcionamento do Com Réis: endereço de e-mail (para autenticação), nome de usuário, preferência de moeda base e os dados financeiros que você insere voluntariamente (saldos, transações, metas). Não coletamos dados bancários, senhas de bancos ou documentos de identidade.'
          },
          {
            title: '2. Finalidade do Tratamento',
            body: 'Seus dados são utilizados exclusivamente para: (a) fornecer a funcionalidade de gestão financeira pessoal, (b) sincronizar seus dados entre dispositivos, (c) personalizar sua experiência no app. Não vendemos, compartilhamos ou repassamos seus dados a terceiros para fins comerciais.'
          },
          {
            title: '3. Armazenamento e Segurança',
            body: 'Os dados são armazenados em servidores seguros (Supabase — PostgreSQL com criptografia em repouso). Utilizamos Row Level Security (RLS) para garantir que nenhum usuário acesse dados de outro. Toda comunicação é criptografada via HTTPS/TLS 1.3.'
          },
          {
            title: '4. Seus Direitos (LGPD Art. 18)',
            body: 'Como titular dos dados, você tem direito a: confirmar a existência de tratamento; acessar seus dados; corrigir dados incompletos ou desatualizados; solicitar anonimização, bloqueio ou eliminação dos seus dados; obter portabilidade dos dados; revogar consentimento a qualquer momento.'
          },
          {
            title: '5. Retenção e Exclusão',
            body: 'Seus dados são mantidos enquanto você tiver uma conta ativa. Ao solicitar exclusão, removemos permanentemente todos os seus dados em até 15 dias úteis. Para exercer seus direitos, envie e-mail para: privacidade@comreis.com'
          },
          {
            title: '6. Cookies e Armazenamento Local',
            body: 'Utilizamos localStorage do navegador para persistência de sessão e preferências do usuário. Não utilizamos cookies de rastreamento ou analytics de terceiros. O armazenamento local pode ser limpo a qualquer momento pelo usuário nas configurações do navegador.'
          },
          {
            title: '7. Contato e DPO',
            body: 'Encarregado de Proteção de Dados (DPO): privacidade@comreis.com. Para reclamações à autoridade supervisora: Autoridade Nacional de Proteção de Dados (ANPD) — www.gov.br/anpd'
          }
        ].map((section) => (
          <section key={section.title} style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
              {section.title}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              {section.body}
            </p>
          </section>
        ))}
      </div>
    </div>
  );
}
