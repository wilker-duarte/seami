import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CalendarX, HeartHandshake, TrendingUp, GraduationCap } from 'lucide-react';
import { API_BASE_URL } from '../context/AppContext';

export default function InsightsPage() {
  const [occurrences, setOccurrences] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/occurrences`)
      .then(r => r.json())
      .then(setOccurrences)
      .catch(err => console.error('[InsightsPage]', err));
  }, []);

  const today = new Date().toISOString().split('T')[0];

  const urgentList = (() => {
    const counts = {};
    occurrences.filter(o => o.type === 'atraso' || o.type === 'falta').forEach(o => {
      const key = o.studentId;
      if (!counts[key]) counts[key] = { studentName: o.studentName, classroom: o.classroom, count: 0, avatar: '⚠️' };
      counts[key].count++;
    });
    return Object.values(counts).filter(s => s.count >= 4).map(s => ({
      ...s,
      reason: `${s.count} ocorrências combinadas de atraso e falta registradas.`
    }));
  })();

  const delayPatterns = (() => {
    const counts = {};
    occurrences.filter(o => o.type === 'atraso').forEach(o => {
      const key = o.studentId;
      if (!counts[key]) counts[key] = { studentName: o.studentName, classroom: o.classroom, count: 0, motive: o.motive };
      counts[key].count++;
    });
    return Object.values(counts).filter(s => s.count >= 2).sort((a, b) => b.count - a.count);
  })();

  const absencePatterns = (() => {
    const counts = {};
    occurrences.filter(o => o.type === 'falta').forEach(o => {
      const key = o.studentId;
      if (!counts[key]) counts[key] = { studentName: o.studentName, classroom: o.classroom, count: 0, motive: o.motive };
      counts[key].count++;
    });
    return Object.values(counts).filter(s => s.count >= 2).sort((a, b) => b.count - a.count);
  })();

  const medicalList = occurrences
    .filter(o => o.type === 'atestado' && o.startDate <= today && o.endDate >= today)
    .map(o => ({
      studentName: o.studentName,
      classroom: o.classroom,
      reason: `Afastado até ${o.endDate?.split('-').reverse().join('/')} — CID ${o.cid}`
    }));

  const classroomFocus = (() => {
    const rooms = {};
    occurrences.forEach(o => {
      if (!rooms[o.classroom]) rooms[o.classroom] = { delays: 0, absences: 0, medical: 0 };
      if (o.type === 'atraso') rooms[o.classroom].delays++;
      if (o.type === 'falta') rooms[o.classroom].absences++;
      if (o.type === 'atestado') rooms[o.classroom].medical++;
    });
    return Object.entries(rooms).map(([room, data]) => ({
      room: `Sala ${room}`,
      issue: `${data.delays} atrasos, ${data.absences} faltas, ${data.medical} atestados`
    }));
  })();

  const pedagogicalSuggestions = [
    { title: 'Reunião de Alinhamento com Responsáveis', desc: 'Para famílias com mais de 3 atrasos consecutivos, sugerir reunião de acolhimento pedagógico.' },
    { title: 'Programa de Acompanhamento Médico', desc: 'Crianças com atestados recorrentes devem ter acompanhamento psicopedagógico quinzenal.' },
    { title: 'Incentivo de Assiduidade', desc: 'Criar um mural de reconhecimento para turmas com menor índice de faltas no mês.' }
  ];

  return (
    <section className="panel-section active">
      <div className="insights-top-intro">
        <div className="sparkle-logo">✨</div>
        <div className="insights-intro-text">
          <h2>Análise Inteligente e Insights Pedagógicos</h2>
          <p>Nossa IA analisa padrões de presença e comportamento na creche para propor melhorias operacionais, acompanhamentos médicos preventivos e suporte pedagógico humanizado.</p>
        </div>
      </div>

      <div className="insights-grid">
        <div className="insights-column">
          <div className="insight-group-card alert-card-urgent">
            <div className="insight-card-header">
              <AlertTriangle size={18} />
              <h3>Atenção Necessária (Alto Risco de Faltas/Atrasos)</h3>
            </div>
            <div className="insight-card-content">
              {urgentList.length === 0 ? (
                <p className="no-data-text">Nenhum alerta crítico ativo hoje.</p>
              ) : (
                urgentList.map((item, idx) => (
                  <div key={idx} className="insight-item-row">
                    <span className="item-badge-red">{item.avatar}</span>
                    <div>
                      <strong>{item.studentName}</strong> (Sala {item.classroom})
                      <p className="item-sub-desc">{item.reason}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="insight-group-card">
            <div className="insight-card-header">
              <Clock size={18} />
              <h3>Padrões de Atrasos Recorrentes</h3>
            </div>
            <div className="insight-card-content">
              {delayPatterns.length === 0 ? (
                <p className="no-data-text">Nenhum padrão sistêmico de atraso encontrado.</p>
              ) : (
                delayPatterns.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="insight-pattern-row">
                    <strong>{item.studentName}</strong> (Sala {item.classroom})
                    <p className="pattern-desc">{item.motive}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="insight-group-card">
            <div className="insight-card-header">
              <CalendarX size={18} />
              <h3>Padrões de Faltas Sistemáticas</h3>
            </div>
            <div className="insight-card-content">
              {absencePatterns.length === 0 ? (
                <p className="no-data-text">Nenhum padrão de falta identificado.</p>
              ) : (
                absencePatterns.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="insight-pattern-row">
                    <strong>{item.studentName}</strong> (Sala {item.classroom})
                    <p className="pattern-desc">{item.motive}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="insights-column">
          <div className="insight-group-card alert-card-medical">
            <div className="insight-card-header">
              <HeartHandshake size={18} />
              <h3>Acompanhamento de Saúde (Retornos de Atestado)</h3>
            </div>
            <div className="insight-card-content">
              {medicalList.length === 0 ? (
                <p className="no-data-text">Nenhum acompanhamento clínico ativo hoje.</p>
              ) : (
                medicalList.map((item, idx) => (
                  <div key={idx} className="insight-item-row">
                    <span className="item-badge-green">🩺</span>
                    <div>
                      <strong>{item.studentName}</strong> (Sala {item.classroom})
                      <p className="item-sub-desc">{item.reason}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="insight-group-card">
            <div className="insight-card-header">
              <TrendingUp size={18} />
              <h3>Foco Operacional e Gargalos por Sala</h3>
            </div>
            <div className="insight-card-content">
              {classroomFocus.map((item, idx) => (
                <div key={idx} className="insight-pattern-row">
                  <strong>{item.room}</strong>
                  <p className="pattern-desc">{item.issue}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="insight-group-card alert-card-pedagogic">
            <div className="insight-card-header">
              <GraduationCap size={18} />
              <h3>Diretrizes Pedagógicas Sugeridas</h3>
            </div>
            <div className="insight-card-content">
              {pedagogicalSuggestions.map((item, idx) => (
                <div key={idx} className="insight-item-row">
                  <span className="item-badge-blue">💡</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p className="item-sub-desc">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
