import React, { useState, useEffect } from 'react';
import {
  Baby, Clock, LogOut, Activity, CalendarX, Heart,
  SlidersHorizontal, X, TrendingUp, Percent, CheckSquare,
  BookOpen, ClipboardCheck
} from 'lucide-react';
import { useAppContext, API_BASE_URL } from '../context/AppContext';
import DashboardCharts from '../components/DashboardCharts';

export default function DashboardPage({ navigate, setActiveModule }) {
  const { students, isDark } = useAppContext();

  const [occurrences, setOccurrences] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [filters, setFilters] = useState({ dateStart: '', dateEnd: '', classroom: '', studentId: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [occRes, attRes] = await Promise.all([
          fetch(`${API_BASE_URL}/occurrences`),
          fetch(`${API_BASE_URL}/attendance`)
        ]);
        setOccurrences(await occRes.json());
        setAttendanceList(await attRes.json());
      } catch (err) {
        console.error('[DashboardPage]', err);
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

  const activeAtestToday = occurrences.filter(o => {
    if (o.type !== 'atestado') return false;
    if (filters.classroom && o.classroom !== filters.classroom) return false;
    if (filters.studentId && o.studentId !== filters.studentId) return false;
    return o.startDate <= today && o.endDate >= today;
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
  const assiduidadeRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

  const metrics = {
    delaysCount: delayList.length, delaysMinutes: totalMinutes,
    lacksCount: lackList.length, lacksJustified,
    atestadosCount: filtered.filter(o => o.type === 'atestado').length,
    atestadosAtivosHoje: activeAtestToday,
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
              {students
                .filter(s => !filters.classroom || s.classroom === filters.classroom)
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
              }
            </select>
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
          <div className="metric-card metric-amamentacao" onClick={() => navigate('attendance')} style={{ borderLeft: '4px solid #10b981', cursor: 'pointer' }}>
            <div className="metric-header">
              <span className="metric-title">Taxa de Assiduidade Geral</span>
              <div className="metric-icon-box" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}><Percent size={18} /></div>
            </div>
            <div className="metric-value" style={{ color: '#065f46' }}>{metrics.assiduidadeRate}%</div>
            <div className="metric-footer" style={{ color: '#047857' }}><span>Presença média acumulada</span></div>
          </div>
          <div className="metric-card" onClick={() => navigate('attendance')} style={{ borderLeft: '4px solid var(--brand-primary)', cursor: 'pointer' }}>
            <div className="metric-header">
              <span className="metric-title">Chamadas Registradas</span>
              <div className="metric-icon-box" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}><ClipboardCheck size={18} /></div>
            </div>
            <div className="metric-value">{metrics.totalAttendance}</div>
            <div className="metric-footer text-secondary"><span>{metrics.presentAttendance} presenças e {metrics.lackAttendance + metrics.justifiedAttendance} faltas</span></div>
          </div>
          <div className="metric-card metric-atrasos" onClick={() => navigate('attendance')} style={{ borderLeft: '4px solid #f59e0b', cursor: 'pointer' }}>
            <div className="metric-header">
              <span className="metric-title">Faltas Justificadas</span>
              <div className="metric-icon-box" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}><CheckSquare size={18} /></div>
            </div>
            <div className="metric-value" style={{ color: '#b45309' }}>{metrics.justifiedAttendance}</div>
            <div className="metric-footer" style={{ color: '#b45309' }}><span>Justificadas pelo Controle de Frequência</span></div>
          </div>
          <div className="metric-card metric-faltas" onClick={() => navigate('attendance')} style={{ borderLeft: '4px solid #ef4444', cursor: 'pointer' }}>
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
          <div className="metric-card metric-atrasos" onClick={() => { navigate('seami_control'); setActiveModule('atraso'); }} style={{ cursor: 'pointer' }}>
            <div className="metric-header"><span className="metric-title">Atrasos</span><div className="metric-icon-box"><Clock size={18} /></div></div>
            <div className="metric-value">{metrics.delaysCount}</div>
            <div className="metric-footer text-atrasos"><TrendingUp size={14} className="trend-icon" /><span>{metrics.delaysMinutes} min acumulados</span></div>
          </div>
          <div className="metric-card metric-faltas" onClick={() => { navigate('seami_control'); setActiveModule('falta'); }} style={{ cursor: 'pointer' }}>
            <div className="metric-header"><span className="metric-title">Faltas no Caderno</span><div className="metric-icon-box"><CalendarX size={18} /></div></div>
            <div className="metric-value">{metrics.lacksCount}</div>
            <div className="metric-footer text-faltas"><span>{metrics.lacksJustified} justificadas no caderno</span></div>
          </div>
          <div className="metric-card metric-atestados" onClick={() => { navigate('seami_control'); setActiveModule('atestado'); }} style={{ cursor: 'pointer' }}>
            <div className="metric-header"><span className="metric-title">Atestados Médicos</span><div className="metric-icon-box"><Activity size={18} /></div></div>
            <div className="metric-value">{metrics.atestadosCount}</div>
            <div className="metric-footer text-atestados"><span>{metrics.atestadosAtivosHoje} atestados ativos hoje</span></div>
          </div>
          <div className="metric-card metric-saidas" onClick={() => { navigate('seami_control'); setActiveModule('saida'); }} style={{ cursor: 'pointer' }}>
            <div className="metric-header"><span className="metric-title">Saídas Antecipadas</span><div className="metric-icon-box"><LogOut size={18} /></div></div>
            <div className="metric-value">{metrics.saidasCount}</div>
            <div className="metric-footer text-saidas"><span>{metrics.saidasRetornos} com retorno programado</span></div>
          </div>
          <div className="metric-card metric-amamentacao" onClick={() => { navigate('seami_control'); setActiveModule('amamentacao'); }} style={{ cursor: 'pointer' }}>
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
    </section>
  );
}
