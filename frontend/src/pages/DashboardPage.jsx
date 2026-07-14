import React, { useState, useEffect } from 'react';
import {
  Baby, Clock, LogOut, Activity, CalendarX, Heart,
  SlidersHorizontal, X, TrendingUp, Percent, CheckSquare,
  BookOpen, ClipboardCheck
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getOccurrences, getAttendance } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import DashboardCharts from '../components/DashboardCharts';

export default function DashboardPage({ setActiveModule }) {
  const { students, isDark } = useAppContext();
  const activeStudents = students.filter(s => s.active !== false);
  const navigate = useNavigate();

  const [occurrences, setOccurrences] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [filters, setFilters] = useState({ dateStart: '', dateEnd: '', classroom: '', studentId: '' });
  const [loading, setLoading] = useState(true);
  const [selectedClassForModal, setSelectedClassForModal] = useState(null);

  const getInitialFilters = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;
    const lastDayVal = new Date(year, d.getMonth() + 1, 0).getDate();
    const lastDay = `${year}-${month}-${String(lastDayVal).padStart(2, '0')}`;
    return { dateStart: firstDay, dateEnd: lastDay, classroom: '', studentId: '' };
  };

  useEffect(() => {
    setFilters(getInitialFilters());
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [occData, attData] = await Promise.all([
          getOccurrences(),
          getAttendance()
        ]);
        setOccurrences(occData || []);
        setAttendanceList(attData || []);
      } catch (err) {
        console.error('[DashboardPage] Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Filtros
  const filtered = occurrences.filter(o => {
    const { dateStart, dateEnd, classroom, studentId } = filters;
    if (dateStart && o.date < dateStart) return false;
    if (dateEnd && o.date > dateEnd) return false;
    if (classroom && o.classroom !== classroom) return false;
    if (studentId && o.studentId !== studentId) return false;
    return true;
  });

  // Métricas
  const today = new Date().toISOString().split('T')[0];

  const delayList = filtered.filter(o => o.type === 'atraso');
  let totalMinutes = 0;
  delayList.forEach(occ => {
    if (occ.time) {
      const [h, m] = occ.time.split(':').map(Number);
      const late = (h * 60 + m) - (8 * 60);
      if (late > 0) totalMinutes += late;
    }
  });

  const lackList = filtered.filter(o => o.type === 'falta');
  const lacksJustified = lackList.filter(o => o.justified === 'sim').length;

  const hasDateFilter = !!(filters.dateStart || filters.dateEnd);
  const startBound = filters.dateStart || today;
  const endBound = filters.dateEnd || today;

  const activeAtestPeriod = occurrences.filter(o => {
    if (o.type !== 'atestado') return false;
    if (filters.classroom && o.classroom !== filters.classroom) return false;
    if (filters.studentId && o.studentId !== filters.studentId) return false;
    return o.startDate <= endBound && o.endDate >= startBound;
  }).length;

  const outList = filtered.filter(o => o.type === 'saida');
  const amamList = filtered.filter(o => o.type === 'amamentacao');
  let totalAmamMins = 0;
  amamList.forEach(o => {
    if (o.timeIn && o.timeOut) {
      const [hIn, mIn] = o.timeIn.split(':').map(Number);
      const [hOut, mOut] = o.timeOut.split(':').map(Number);
      const diff = (hOut * 60 + mOut) - (hIn * 60 + mIn);
      if (diff > 0) totalAmamMins += diff;
    }
  });

  let attFiltered = attendanceList;
  if (filters.dateStart) attFiltered = attFiltered.filter(o => o.date >= filters.dateStart);
  if (filters.dateEnd) attFiltered = attFiltered.filter(o => o.date <= filters.dateEnd);
  if (filters.classroom) attFiltered = attFiltered.filter(o => o.classroom === filters.classroom);
  if (filters.studentId) attFiltered = attFiltered.filter(o => o.studentId === filters.studentId);

  const totalAtt = attFiltered.length;
  const presentAtt = attFiltered.filter(o => o.status === 'P').length;
  const lackAtt = attFiltered.filter(o => o.status === 'F').length;
  const justifiedAtt = attFiltered.filter(o => o.status === 'FJ').length;
  const activeAtt = attFiltered.filter(o => o.status === 'P' || o.status === 'F' || o.status === 'FJ').length;
  const assiduidadeRate = activeAtt > 0 ? Math.round((presentAtt / activeAtt) * 100) : 100;

  const metrics = {
    delaysCount: delayList.length, delaysMinutes: totalMinutes,
    lacksCount: lackList.length, lacksJustified,
    atestadosCount: filtered.filter(o => o.type === 'atestado').length,
    atestadosAtivosHoje: activeAtestPeriod,
    saidasCount: outList.length, saidasRetornos: outList.filter(o => o.hasReturn === 'sim').length,
    amamentacaoCount: amamList.length,
    amamentacaoAvg: amamList.length > 0 ? Math.round(totalAmamMins / amamList.length) : 0,
    totalAttendance: totalAtt, presentAttendance: presentAtt,
    lackAttendance: lackAtt, justifiedAttendance: justifiedAtt, assiduidadeRate
  };

  if (loading) {
    return (
      <section className="panel-section active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--slate-400)', fontSize: '14px' }}>Carregando dados do painel...</div>
      </section>
    );
  }

  return (
    <section className="panel-section active">
      {/* Filtros */}
      <div className="filter-card">
        <div className="filter-card-header">
          <div className="filter-card-title">
            <SlidersHorizontal size={18} />
            <span>Filtros do Painel Geral</span>
          </div>
          <button className="clear-filters-btn" onClick={() => setFilters({ dateStart: '', dateEnd: '', classroom: '', studentId: '' })}>
            Limpar Filtros
          </button>
        </div>
        <div className="filter-grid">
          <div className="filter-group">
            <label>Data Inicial</label>
            <input type="date" value={filters.dateStart} onChange={(e) => setFilters(f => ({ ...f, dateStart: e.target.value }))} />
          </div>
          <div className="filter-group">
            <label>Data Final</label>
            <input type="date" value={filters.dateEnd} onChange={(e) => setFilters(f => ({ ...f, dateEnd: e.target.value }))} />
          </div>
          <div className="filter-group">
            <label>Sala/Turma</label>
            <select value={filters.classroom} onChange={(e) => setFilters(f => ({ ...f, classroom: e.target.value, studentId: '' }))}>
              <option value="">Todas as salas</option>
              <option value="Alegria">Alegria</option>
              <option value="Carinho">Carinho</option>
              <option value="União">União</option>
              <option value="Amizade">Amizade</option>
              <option value="Felicidade">Felicidade</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Criança</label>
            <select value={filters.studentId} onChange={(e) => setFilters(f => ({ ...f, studentId: e.target.value }))}>
              <option value="">Todas as crianças</option>
              {activeStudents
                .filter(s => !filters.classroom || s.classroom === filters.classroom)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
              }
            </select>
          </div>
        </div>
      </div>

      {/* Visão Geral dos Alunos */}
      <div style={{ marginBottom: '32px', marginTop: '24px' }}>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Baby size={20} style={{ color: 'var(--brand-primary)' }} />
          Visão Geral: Alunos por Sala de Aula
        </h3>
        
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {/* Card Total Geral */}
          <div className="metric-card" onClick={() => setSelectedClassForModal('all')} style={{ borderLeft: '4px solid var(--brand-primary)', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}>
            <div className="metric-header">
              <span className="metric-title" style={{ fontWeight: '700' }}>Total Geral de Alunos</span>
              <div className="metric-icon-box" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}>🏫</div>
            </div>
            <div className="metric-value" style={{ fontSize: '32px', fontWeight: '800' }}>{activeStudents.length}</div>
            <div className="metric-footer text-secondary"><span>Clique para ver a listagem completa</span></div>
          </div>

          {/* Sala Amizade */}
          <div className="metric-card" onClick={() => setSelectedClassForModal('Amizade')} style={{ borderLeft: '4px solid #8b5cf6', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}>
            <div className="metric-header">
              <span className="metric-title">Sala Amizade</span>
              <div className="metric-icon-box" style={{ backgroundColor: '#f5f3ff', color: '#8b5cf6', fontSize: '16px' }}>🎨</div>
            </div>
            <div className="metric-value" style={{ color: '#4c1d95' }}>{activeStudents.filter(s => s.classroom === 'Amizade').length}</div>
            <div className="metric-footer" style={{ color: '#7c3aed' }}><span>Maternal II &middot; Clique para ver</span></div>
          </div>

          {/* Sala União */}
          <div className="metric-card" onClick={() => setSelectedClassForModal('União')} style={{ borderLeft: '4px solid #f59e0b', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}>
            <div className="metric-header">
              <span className="metric-title">Sala União</span>
              <div className="metric-icon-box" style={{ backgroundColor: '#fffbeb', color: '#f59e0b', fontSize: '16px' }}>🤝</div>
            </div>
            <div className="metric-value" style={{ color: '#78350f' }}>{activeStudents.filter(s => s.classroom === 'União').length}</div>
            <div className="metric-footer" style={{ color: '#d97706' }}><span>Maternal I &middot; Clique para ver</span></div>
          </div>

          {/* Sala Felicidade */}
          <div className="metric-card" onClick={() => setSelectedClassForModal('Felicidade')} style={{ borderLeft: '4px solid #ec4899', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}>
            <div className="metric-header">
              <span className="metric-title">Sala Felicidade</span>
              <div className="metric-icon-box" style={{ backgroundColor: '#fdf2f8', color: '#ec4899', fontSize: '16px' }}>✨</div>
            </div>
            <div className="metric-value" style={{ color: '#831843' }}>{activeStudents.filter(s => s.classroom === 'Felicidade').length}</div>
            <div className="metric-footer" style={{ color: '#db2777' }}><span>Pré-Escola &middot; Clique para ver</span></div>
          </div>

          {/* Sala Carinho */}
          <div className="metric-card" onClick={() => setSelectedClassForModal('Carinho')} style={{ borderLeft: '4px solid #10b981', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}>
            <div className="metric-header">
              <span className="metric-title">Sala Carinho</span>
              <div className="metric-icon-box" style={{ backgroundColor: '#ecfdf5', color: '#10b981', fontSize: '16px' }}>🧸</div>
            </div>
            <div className="metric-value" style={{ color: '#065f46' }}>{activeStudents.filter(s => s.classroom === 'Carinho').length}</div>
            <div className="metric-footer" style={{ color: '#059669' }}><span>Berçário II &middot; Clique para ver</span></div>
          </div>
          
          {/* Sala Alegria */}
          <div className="metric-card" onClick={() => setSelectedClassForModal('Alegria')} style={{ borderLeft: '4px solid #3b82f6', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}>
            <div className="metric-header">
              <span className="metric-title">Sala Alegria</span>
              <div className="metric-icon-box" style={{ backgroundColor: '#eff6ff', color: '#3b82f6', fontSize: '16px' }}>👶</div>
            </div>
            <div className="metric-value" style={{ color: '#1e3a8a' }}>{activeStudents.filter(s => s.classroom === 'Alegria').length}</div>
            <div className="metric-footer" style={{ color: '#2563eb' }}><span>Berçário I &middot; Clique para ver</span></div>
          </div>

        </div>
      </div>


      {/* Módulo I */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <ClipboardCheck size={20} style={{ color: 'var(--brand-primary)' }} />
          Módulo I: Controle de Frequência
        </h3>
        <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div className="metric-card metric-amamentacao" onClick={() => navigate('/chamada')} style={{ borderLeft: '4px solid #10b981', cursor: 'pointer' }}>
            <div className="metric-header">
              <span className="metric-title">Taxa de Assiduidade Geral</span>
              <div className="metric-icon-box" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}><Percent size={18} /></div>
            </div>
            <div className="metric-value" style={{ color: '#065f46' }}>{metrics.assiduidadeRate}%</div>
            <div className="metric-footer" style={{ color: '#047857' }}><span>Presença média acumulada</span></div>
          </div>
          <div className="metric-card" onClick={() => navigate('/chamada')} style={{ borderLeft: '4px solid var(--brand-primary)', cursor: 'pointer' }}>
            <div className="metric-header">
              <span className="metric-title">Chamadas Registradas</span>
              <div className="metric-icon-box" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}><ClipboardCheck size={18} /></div>
            </div>
            <div className="metric-value">{metrics.totalAttendance}</div>
            <div className="metric-footer text-secondary"><span>{metrics.presentAttendance} presenças e {metrics.lackAttendance + metrics.justifiedAttendance} faltas</span></div>
          </div>
          <div className="metric-card metric-atrasos" onClick={() => navigate('/chamada/consulta')} style={{ borderLeft: '4px solid #f59e0b', cursor: 'pointer' }}>
            <div className="metric-header">
              <span className="metric-title">Faltas Justificadas</span>
              <div className="metric-icon-box" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}><CheckSquare size={18} /></div>
            </div>
            <div className="metric-value" style={{ color: '#b45309' }}>{metrics.justifiedAttendance}</div>
            <div className="metric-footer" style={{ color: '#b45309' }}><span>Justificadas pelo Controle de Frequência</span></div>
          </div>
          <div className="metric-card metric-faltas" onClick={() => navigate('/chamada/consulta')} style={{ borderLeft: '4px solid #ef4444', cursor: 'pointer' }}>
            <div className="metric-header">
              <span className="metric-title">Faltas Não Justificadas</span>
              <div className="metric-icon-box" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}><X size={18} /></div>
            </div>
            <div className="metric-value" style={{ color: '#991b1b' }}>{metrics.lackAttendance}</div>
            <div className="metric-footer" style={{ color: '#991b1b' }}><span>Faltas em aberto na chamada</span></div>
          </div>
        </div>
      </div>

      {/* Módulo II */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <BookOpen size={20} style={{ color: '#be185d' }} />
          Módulo II: Caderno de Registros SEAMI
        </h3>
        <div className="metrics-grid">
          <div className="metric-card metric-atrasos" onClick={() => navigate('/caderno-seami/atrasos')} style={{ cursor: 'pointer' }}>
            <div className="metric-header"><span className="metric-title">Atrasos</span><div className="metric-icon-box"><Clock size={18} /></div></div>
            <div className="metric-value">{metrics.delaysCount}</div>
            <div className="metric-footer text-atrasos"><TrendingUp size={14} className="trend-icon" /><span>{metrics.delaysMinutes} min acumulados</span></div>
          </div>
          <div className="metric-card metric-faltas" onClick={() => navigate('/caderno-seami/faltas')} style={{ cursor: 'pointer' }}>
            <div className="metric-header"><span className="metric-title">Faltas no Caderno</span><div className="metric-icon-box"><CalendarX size={18} /></div></div>
            <div className="metric-value">{metrics.lacksCount}</div>
            <div className="metric-footer text-faltas"><span>{metrics.lacksJustified} justificadas no caderno</span></div>
          </div>
          <div className="metric-card metric-atestados" onClick={() => navigate('/caderno-seami/atestados')} style={{ cursor: 'pointer' }}>
            <div className="metric-header"><span className="metric-title">Atestados Médicos</span><div className="metric-icon-box"><Activity size={18} /></div></div>
            <div className="metric-value">{metrics.atestadosCount}</div>
            <div className="metric-footer text-atestados">
              <span>
                {hasDateFilter 
                  ? `${metrics.atestadosAtivosHoje} atestados ativos no período`
                  : `${metrics.atestadosAtivosHoje} atestados ativos hoje`}
              </span>
            </div>
          </div>
          <div className="metric-card metric-saidas" onClick={() => navigate('/caderno-seami/saidas')} style={{ cursor: 'pointer' }}>
            <div className="metric-header"><span className="metric-title">Saídas Antecipadas</span><div className="metric-icon-box"><LogOut size={18} /></div></div>
            <div className="metric-value">{metrics.saidasCount}</div>
            <div className="metric-footer text-saidas"><span>{metrics.saidasRetornos} com retorno programado</span></div>
          </div>
          <div className="metric-card metric-amamentacao" onClick={() => navigate('/caderno-seami/amamentacao')} style={{ cursor: 'pointer' }}>
            <div className="metric-header"><span className="metric-title">Amamentação</span><div className="metric-icon-box"><Heart size={18} /></div></div>
            <div className="metric-value">{metrics.amamentacaoCount}</div>
            <div className="metric-footer text-amamentacao"><span>Permanência média: {metrics.amamentacaoAvg} min</span></div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <DashboardCharts
        occurrences={occurrences}
        attendanceList={attendanceList}
        students={students}
        filters={filters}
        isDark={isDark}
      />

      {/* Modal de Alunos da Turma */}
      {selectedClassForModal && (() => {
        const modalStudents = selectedClassForModal === 'all'
          ? activeStudents
          : activeStudents.filter(s => s.classroom === selectedClassForModal);
          
        return (
          <div className="modal-overlay active" onClick={() => setSelectedClassForModal(null)}>
            <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ borderBottom: '1px solid var(--slate-100)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '28px' }}>
                    {selectedClassForModal === 'all' ? '🏫' : (selectedClassForModal === 'Alegria' ? '👶' : (selectedClassForModal === 'Carinho' ? '🧸' : (selectedClassForModal === 'União' ? '🤝' : (selectedClassForModal === 'Amizade' ? '🎨' : '✨'))))}
                  </span>
                  <div style={{ textAlign: 'left' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--slate-800)' }}>
                      {selectedClassForModal === 'all' ? 'Todos os Alunos' : `Sala ${selectedClassForModal}`}
                    </h2>
                    <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                      Total: <strong>{modalStudents.length}</strong> {modalStudents.length === 1 ? 'aluno ativo' : 'alunos ativos'}
                    </span>
                  </div>
                </div>
                <button className="modal-close-btn" onClick={() => setSelectedClassForModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
              </div>
              
              <div className="form-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '20px' }}>
                {modalStudents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--slate-400)' }}>Nenhum aluno matriculado nesta sala.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {modalStudents
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((student, idx) => (
                        <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--slate-50)', borderRadius: '10px', border: '1px solid var(--slate-100)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                            <span style={{ fontSize: '18px', flexShrink: 0 }}>👦</span>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                              <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {idx + 1}. {student.name}
                                </span>
                                {student.has_acompanhamento && <span title="Acompanhamento Ativo" style={{ flexShrink: 0 }}>🩺</span>}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--slate-500)', textTransform: 'capitalize' }}>
                                Turno: {student.shift || 'Integral'}
                              </span>
                              {student.has_acompanhamento && (
                                <span style={{ 
                                  fontSize: '11px', 
                                  color: '#1d4ed8', 
                                  fontWeight: 500, 
                                  marginTop: '2px',
                                  backgroundColor: '#eff6ff',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #dbeafe',
                                  wordBreak: 'break-word',
                                  display: 'inline-block'
                                }}>
                                  <strong>Acomp:</strong> {student.acompanhamento_obs || 'Sim'}
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: '700', 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            color: student.active ? '#15803d' : '#b91c1c',
                            backgroundColor: student.active ? '#f0fdf4' : '#fef2f2',
                            border: student.active ? '1px solid #bbf7d0' : '1px solid #fecaca',
                            marginLeft: '8px',
                            flexShrink: 0
                          }}>
                            {student.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
              
              <div className="modal-footer" style={{ borderTop: '1px solid var(--slate-100)', padding: '16px 20px' }}>
                <button className="secondary-btn" onClick={() => setSelectedClassForModal(null)} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px' }}>Fechar</button>
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
