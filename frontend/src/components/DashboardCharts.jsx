import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { ClipboardCheck, BookOpen } from 'lucide-react';

const OCC_TYPE_OPTIONS = [
  { value: 'all',         label: 'Todos',          color: '#be185d', bg: '#fdf2f8' },
  { value: 'atraso',      label: '⏰ Atrasos',      color: '#d97706', bg: '#fffbeb' },
  { value: 'falta',       label: '📅 Faltas',       color: '#b91c1c', bg: '#fef2f2' },
  { value: 'atestado',    label: '🏥 Atestados',    color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'saida',       label: '🚪 Saídas',       color: '#2563eb', bg: '#eff6ff' },
  { value: 'amamentacao', label: '🤱 Amamentação',  color: '#047857', bg: '#ecfdf5' },
];

export default function DashboardCharts({ occurrences, attendanceList, students, filters, isDark }) {
  const [occTypeFilter, setOccTypeFilter] = useState('all');

  const chartRefs = {
    frequenciaSala:       useRef(null),
    frequenciaDiariaReal: useRef(null),
    atrasosMes:           useRef(null),
    motivos:              useRef(null),
    criancasRecorrentes:  useRef(null),
  };

  const chartInstances = useRef({
    frequenciaSala:       null,
    frequenciaDiariaReal: null,
    atrasosMes:           null,
    motivos:              null,
    criancasRecorrentes:  null,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Effect 1: Gráficos 1–4 (não dependem do filtro de tipo)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fontColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)';

    const { dateStart, dateEnd, classroom, studentId } = filters;

    let filtered = occurrences || [];
    if (dateStart)  filtered = filtered.filter(o => o.date >= dateStart);
    if (dateEnd)    filtered = filtered.filter(o => o.date <= dateEnd);
    if (classroom)  filtered = filtered.filter(o => o.classroom === classroom);
    if (studentId)  filtered = filtered.filter(o => o.studentId === studentId);

    let attFiltered = attendanceList || [];
    if (dateStart)  attFiltered = attFiltered.filter(o => o.date >= dateStart);
    if (dateEnd)    attFiltered = attFiltered.filter(o => o.date <= dateEnd);
    if (classroom)  attFiltered = attFiltered.filter(o => o.classroom === classroom);
    if (studentId)  attFiltered = attFiltered.filter(o => o.studentId === studentId);

    // Destruir apenas os gráficos 1-4
    ['frequenciaSala', 'frequenciaDiariaReal', 'atrasosMes', 'motivos'].forEach(key => {
      if (chartInstances.current[key]) {
        chartInstances.current[key].destroy();
        chartInstances.current[key] = null;
      }
    });

    // ── GRÁFICO 1: Assiduidade por Sala ──────────────────────────────────────
    const ctx1 = chartRefs.frequenciaSala.current;
    if (ctx1) {
      const classroomsList = ['Alegria', 'Carinho', 'União', 'Amizade', 'Felicidade'];
      const classroomAssiduidade = {};
      classroomsList.forEach(cr => {
        if (classroom && cr !== classroom) { classroomAssiduidade[cr] = 0; return; }
        const roomAtt = attFiltered.filter(o => o.classroom === cr);
        const total   = roomAtt.length;
        const present = roomAtt.filter(o => o.status === 'P').length;
        classroomAssiduidade[cr] = total > 0 ? Math.round((present / total) * 100) : 100;
      });
      chartInstances.current.frequenciaSala = new Chart(ctx1, {
        type: 'bar',
        data: {
          labels: classroomsList,
          datasets: [{
            label: 'Assiduidade (%)',
            data: classroomsList.map(cr => classroomAssiduidade[cr]),
            backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(52,211,153,0.8)', 'rgba(5,150,105,0.8)', 'rgba(110,231,183,0.8)', 'rgba(16,185,129,0.6)'],
            borderRadius: 8,
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}% de presença média` } },
          },
          scales: {
            y: { grid: { color: gridColor }, ticks: { color: fontColor }, min: 0, max: 100 },
            x: { grid: { display: false }, ticks: { color: fontColor } },
          },
        },
      });
    }

    // ── GRÁFICO 2: Evolução Diária ────────────────────────────────────────────
    const ctx2 = chartRefs.frequenciaDiariaReal.current;
    if (ctx2) {
      const datesAttMap = {};
      const dateAttList   = [];
      const dateAttLabels = [];
      const today = new Date();
      for (let i = 14; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          const iso = d.toISOString().split('T')[0];
          dateAttList.push(iso);
          dateAttLabels.push(d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }));
          datesAttMap[iso] = { presencas: 0, faltas: 0 };
        }
      }
      attFiltered.forEach(o => {
        if (datesAttMap[o.date]) {
          if (o.status === 'P') datesAttMap[o.date].presencas++;
          else if (o.status === 'F' || o.status === 'FJ') datesAttMap[o.date].faltas++;
        }
      });
      chartInstances.current.frequenciaDiariaReal = new Chart(ctx2, {
        type: 'line',
        data: {
          labels: dateAttLabels,
          datasets: [
            { label: 'Alunos Presentes', data: dateAttList.map(d => datesAttMap[d].presencas), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.05)', tension: 0.3, borderWidth: 3, pointRadius: 4, fill: true },
            { label: 'Ausências/Faltas',  data: dateAttList.map(d => datesAttMap[d].faltas),   borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.05)',    tension: 0.3, borderWidth: 3, pointRadius: 4, fill: true },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: fontColor, font: { family: 'Inter', weight: 600, size: 11 } } } },
          scales: {
            y: { grid: { color: gridColor }, ticks: { color: fontColor, stepSize: 1 } },
            x: { grid: { display: false }, ticks: { color: fontColor } },
          },
        },
      });
    }

    // ── GRÁFICO 3: Atrasos Mensal ─────────────────────────────────────────────
    const ctx3 = chartRefs.atrasosMes.current;
    if (ctx3) {
      const monthlyDelays = {};
      const monthsName = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        monthlyDelays[monthsName[d.getMonth()]] = 0;
      }
      filtered.filter(o => o.type === 'atraso').forEach(o => {
        if (o.date) {
          const name = monthsName[parseInt(o.date.split('-')[1]) - 1];
          if (monthlyDelays[name] !== undefined) monthlyDelays[name]++;
        }
      });
      chartInstances.current.atrasosMes = new Chart(ctx3, {
        type: 'line',
        data: {
          labels: Object.keys(monthlyDelays),
          datasets: [{ label: 'Atrasos Registrados', data: Object.values(monthlyDelays), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)', tension: 0.4, fill: true, borderWidth: 3, pointRadius: 4 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: gridColor }, ticks: { color: fontColor } },
            x: { grid: { display: false }, ticks: { color: fontColor } },
          },
        },
      });
    }

    // ── GRÁFICO 4: Distribuição por Tipo ─────────────────────────────────────
    const ctx4 = chartRefs.motivos.current;
    if (ctx4) {
      const seamiTypes = { falta: 0, atestado: 0, atraso: 0, saida: 0, amamentacao: 0, outros: 0 };
      const labelsMap  = { falta: 'Faltas', atestado: 'Atestados Médicos', atraso: 'Atrasos', saida: 'Saídas Antecipadas', amamentacao: 'Amamentação', outros: 'Outras Ocorrências' };
      filtered.forEach(o => {
        if (seamiTypes[o.type] !== undefined) seamiTypes[o.type]++;
        else seamiTypes.outros++;
      });
      chartInstances.current.motivos = new Chart(ctx4, {
        type: 'doughnut',
        data: {
          labels: Object.keys(seamiTypes).map(k => labelsMap[k]),
          datasets: [{ data: Object.values(seamiTypes), backgroundColor: ['#ef4444', '#ec4899', '#f59e0b', '#3b82f6', '#10b981', '#64748b'], borderWidth: isDark ? 2 : 0, borderColor: isDark ? '#181524' : 'white' }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { color: fontColor, font: { family: 'Inter', size: 11, weight: 600 } } } },
          cutout: '60%',
        },
      });
    }

    return () => {
      ['frequenciaSala', 'frequenciaDiariaReal', 'atrasosMes', 'motivos'].forEach(key => {
        if (chartInstances.current[key]) { chartInstances.current[key].destroy(); chartInstances.current[key] = null; }
      });
    };
  }, [occurrences, attendanceList, students, filters, isDark]);

  // ──────────────────────────────────────────────────────────────────────────
  // Effect 2: Gráfico 5 — reage também ao filtro de tipo de ocorrência
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fontColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)';

    const { dateStart, dateEnd, classroom, studentId } = filters;

    let filtered = occurrences || [];
    if (dateStart)              filtered = filtered.filter(o => o.date >= dateStart);
    if (dateEnd)                filtered = filtered.filter(o => o.date <= dateEnd);
    if (classroom)              filtered = filtered.filter(o => o.classroom === classroom);
    if (studentId)              filtered = filtered.filter(o => o.studentId === studentId);
    if (occTypeFilter !== 'all') filtered = filtered.filter(o => o.type === occTypeFilter);

    if (chartInstances.current.criancasRecorrentes) {
      chartInstances.current.criancasRecorrentes.destroy();
      chartInstances.current.criancasRecorrentes = null;
    }

    const ctx5 = chartRefs.criancasRecorrentes.current;
    if (ctx5) {
      const kidOccs = {};
      filtered.forEach(o => {
        if (o.studentName) kidOccs[o.studentName] = (kidOccs[o.studentName] || 0) + 1;
      });

      const sortedKids = Object.entries(kidOccs).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const kidLabels  = sortedKids.map(item => item[0]);
      const kidData    = sortedKids.map(item => item[1]);

      const activeType = OCC_TYPE_OPTIONS.find(t => t.value === occTypeFilter);
      const barColor   = activeType?.color ?? '#be185d';

      chartInstances.current.criancasRecorrentes = new Chart(ctx5, {
        type: 'bar',
        data: {
          labels: kidLabels.length > 0 ? kidLabels : ['Sem dados'],
          datasets: [{
            data: kidData.length > 0 ? kidData : [0],
            backgroundColor: barColor + 'cc',
            borderRadius: 6,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const typeLabel = occTypeFilter === 'all'
                    ? 'ocorrência(s)'
                    : (activeType?.label.replace(/^\S+\s/, '') ?? 'ocorrência(s)');
                  return ` ${ctx.parsed.x} ${typeLabel}`;
                },
              },
            },
          },
          scales: {
            x: { grid: { color: gridColor }, ticks: { color: fontColor, stepSize: 1 } },
            y: { grid: { display: false }, ticks: { color: fontColor } },
          },
        },
      });
    }

    return () => {
      if (chartInstances.current.criancasRecorrentes) {
        chartInstances.current.criancasRecorrentes.destroy();
        chartInstances.current.criancasRecorrentes = null;
      }
    };
  }, [occurrences, filters, isDark, occTypeFilter]);

  // ──────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="dashboard-modules-charts">

      {/* ── MÓDULO I: FREQUÊNCIA ─────────────────────────────────────────────── */}
      <div className="dashboard-charts-section" style={{ marginBottom: '40px', backgroundColor: 'rgba(255,255,255,0.4)', padding: '24px', borderRadius: '16px', border: '1px solid var(--slate-100)' }}>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--slate-200)', paddingBottom: '8px' }}>
          <ClipboardCheck size={20} style={{ color: '#10b981' }} />
          Módulo I: Gráficos de Frequência &amp; Assiduidade
        </h3>
        <div className="charts-grid">
          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Taxa de Assiduidade por Sala</h3>
              <span className="chart-legend-pill" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>Frequência Média (%)</span>
            </div>
            <div className="chart-container">
              <canvas ref={chartRefs.frequenciaSala}></canvas>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Evolução Diária da Frequência</h3>
              <span className="chart-legend-pill" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>Últimos 15 Dias Letivos</span>
            </div>
            <div className="chart-container">
              <canvas ref={chartRefs.frequenciaDiariaReal}></canvas>
            </div>
          </div>
        </div>
      </div>

      {/* ── MÓDULO II: CADERNO SEAMI ──────────────────────────────────────────── */}
      <div className="dashboard-charts-section" style={{ backgroundColor: 'rgba(255,255,255,0.4)', padding: '24px', borderRadius: '16px', border: '1px solid var(--slate-100)' }}>
        <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--slate-200)', paddingBottom: '8px' }}>
          <BookOpen size={20} style={{ color: '#be185d' }} />
          Módulo II: Gráficos do Caderno de Registros SEAMI
        </h3>
        <div className="charts-grid">

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Volume de Atrasos Mensal</h3>
              <span className="chart-legend-pill" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>Chegadas Tardias</span>
            </div>
            <div className="chart-container">
              <canvas ref={chartRefs.atrasosMes}></canvas>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-card-header">
              <h3>Distribuição de Ocorrências</h3>
              <span className="chart-legend-pill" style={{ backgroundColor: '#fdf2f8', color: '#ec4899' }}>Registros do Caderno</span>
            </div>
            <div className="chart-container">
              <canvas ref={chartRefs.motivos}></canvas>
            </div>
          </div>

          {/* Chart 5 — com filtro por tipo de ocorrência */}
          <div className="chart-card full-width-chart">
            <div className="chart-card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <h3>Crianças com Mais Ocorrências no Caderno</h3>

              {/* Botões de filtro */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {OCC_TYPE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setOccTypeFilter(opt.value)}
                    style={{
                      padding: '4px 13px',
                      borderRadius: '20px',
                      border: `1.5px solid ${occTypeFilter === opt.value ? opt.color : 'transparent'}`,
                      backgroundColor: occTypeFilter === opt.value ? opt.bg : 'var(--slate-100)',
                      color: occTypeFilter === opt.value ? opt.color : 'var(--slate-500)',
                      fontWeight: occTypeFilter === opt.value ? 700 : 500,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      fontFamily: 'Inter, sans-serif',
                      whiteSpace: 'nowrap',
                      lineHeight: '1.6',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="chart-container-large">
              <canvas ref={chartRefs.criancasRecorrentes}></canvas>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
