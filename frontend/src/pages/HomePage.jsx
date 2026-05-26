import React from 'react';
import { ClipboardCheck, BookOpen, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const navigate = useNavigate();
  return (
    <section
      className="panel-section active"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        padding: '24px',
        textAlign: 'center'
      }}
    >
      <div className="welcome-banner" style={{ marginBottom: '40px', maxWidth: '700px' }}>
        <span className="welcome-emoji" style={{ fontSize: '48px', marginBottom: '16px', display: 'inline-block' }}>🧸</span>
        <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '32px', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '12px' }}>
          EducaGestão Creche & SEAMI
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--slate-500)', lineHeight: 1.6 }}>
          Bem-vindo ao portal integrado de gestão escolar. Selecione uma das duas áreas de trabalho abaixo para iniciar ou acesse os relatórios analíticos gerais.
        </p>
      </div>

      <div
        className="modules-selection-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          width: '100%',
          maxWidth: '850px',
          marginBottom: '48px'
        }}
      >
        {/* Card Módulo I */}
        <div
          className="module-landing-card animate-fade-in"
          onClick={() => navigate('/chamada')}
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '32px 24px',
            border: '1px solid var(--slate-100)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.borderColor = '#10b981';
            e.currentTarget.style.boxShadow = '0 12px 30px -10px rgba(16, 185, 129, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--slate-100)';
            e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(15, 23, 42, 0.05)';
          }}
        >
          <div style={{ backgroundColor: '#ecfdf5', color: '#10b981', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardCheck size={36} />
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--slate-800)' }}>
            Módulo I: Controle de Frequência
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--slate-500)', lineHeight: 1.5, minHeight: '60px' }}>
            Lançamento de chamada diária por turma, histórico de registros de presença e relatórios pedagógicos de assiduidade escolar.
          </p>
          <button
            className="primary-btn"
            style={{ width: '100%', marginTop: '12px', justifyContent: 'center', backgroundColor: '#10b981', border: 'none' }}
            onClick={(e) => { e.stopPropagation(); navigate('/chamada'); }}
          >
            Entrar no Módulo I
          </button>
        </div>

        {/* Card Módulo II */}
        <div
          className="module-landing-card animate-fade-in"
          onClick={() => navigate('/caderno-seami')}
          style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '32px 24px',
            border: '1px solid var(--slate-100)',
            boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.borderColor = '#ec4899';
            e.currentTarget.style.boxShadow = '0 12px 30px -10px rgba(236, 72, 153, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--slate-100)';
            e.currentTarget.style.boxShadow = '0 4px 20px -2px rgba(15, 23, 42, 0.05)';
          }}
        >
          <div style={{ backgroundColor: '#fdf2f8', color: '#ec4899', padding: '16px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={36} />
          </div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--slate-800)' }}>
            Módulo II: Caderno SEAMI
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--slate-500)', lineHeight: 1.5, minHeight: '60px' }}>
            Caderno de controle de imprevistos: registro e acompanhamento de faltas justificadas, atrasos, atestados e amamentação.
          </p>
          <button
            className="primary-btn"
            style={{ width: '100%', marginTop: '12px', justifyContent: 'center', backgroundColor: '#ec4899', border: 'none' }}
            onClick={(e) => { e.stopPropagation(); navigate('/caderno-seami'); }}
          >
            Entrar no Módulo II
          </button>
        </div>
      </div>

      <button
        className="secondary-btn"
        onClick={() => navigate('/dashboard')}
        style={{
          gap: '8px',
          padding: '10px 24px',
          borderRadius: '50px',
          border: '1px dashed var(--slate-300)',
          backgroundColor: 'rgba(255,255,255,0.6)',
          color: 'var(--slate-600)',
          fontWeight: 600,
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--slate-50)';
          e.currentTarget.style.borderColor = 'var(--brand-primary)';
          e.currentTarget.style.color = 'var(--brand-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.6)';
          e.currentTarget.style.borderColor = 'var(--slate-300)';
          e.currentTarget.style.color = 'var(--slate-600)';
        }}
      >
        <LayoutDashboard size={16} />
        Acessar Painel Analítico & Dashboard Geral
      </button>
    </section>
  );
}
