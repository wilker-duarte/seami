import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { ClipboardCheck, BookOpen } from 'lucide-react';

const OCC_TYPE_OPTIONS = [
  { value: 'all',      label: 'Todos',          color: '#be185d', bg: '#fdf2f8' },
  { value: 'atraso',   label: '⏰ Atrasos',      color: '#d97706', bg: '#fffbeb' },
  { value: 'falta',    label: '📅 Faltas',       color: '#b91c1c', bg: '#fef2f2' },
  { value: 'atestado', label: '🏥 Atestados',    color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'saida',    label: '🚪 Saídas',       color: '#2563eb', bg: '#eff6ff' },
];

export default function DashboardCharts({ occurrences, attendanceList, students, filters, isDark }) {
  const [occTypeFilter, setOccTypeFilter] = useState('all');

  const chartRefs = {
    frequenciaSala:       useRef(null),
    frequenciaDiariaReal: useRef(null),
    atrasosMes:           useRef(null),
    motivos:              useRef(null),
    criancasRecorrentes:  useRef(null),
    amamentacaoDiaria:    useRef(null),
    faltasPorAluno:       useRef(null),
  };

  const chartInstances = useRef({
    frequenciaSala:       null,
    frequenciaDiariaReal: null,
    atrasosMes:           null,
    motivos:              null,
    criancasRecorrentes:  null,
    amamentacaoDiaria:    null,
    faltasPorAluno:       null,
  });

  // Estado do total de amamentação do período
  const [amamTotal, setAmamTotal] = useState(0);

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
  // Effect 3: Gráfico de Amamentação — linha diária (últimos 30 dias ou filtro)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fontColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)';

    const { dateStart, dateEnd, classroom, studentId } = filters;

    let amamOccs = (occurrences || []).filter(o => o.type === 'amamentacao');
    if (classroom)  amamOccs = amamOccs.filter(o => o.classroom === classroom);
    if (studentId)  amamOccs = amamOccs.filter(o => o.studentId === studentId);

    // Determinar range de datas: filtro ou últimos 30 dias
    const today = new Date();
    let start, end;
    if (dateStart && dateEnd) {
      start = new Date(dateStart + 'T00:00:00');
      end   = new Date(dateEnd   + 'T00:00:00');
    } else if (dateStart) {
      start = new Date(dateStart + 'T00:00:00');
      end   = today;
    } else if (dateEnd) {
      end   = new Date(dateEnd + 'T00:00:00');
      start = new Date(end);
      start.setDate(end.getDate() - 29);
    } else {
      end   = today;
      start = new Date();
      start.setDate(today.getDate() - 29);
    }

    // Gerar lista de datas no intervalo
    const dateList   = [];
    const dateLabels = [];
    const dateMap    = {};
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split('T')[0];
      dateList.push(iso);
      dateLabels.push(d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
      dateMap[iso] = 0;
    }

    // Somar o campo quantity por dia (igual a coluna Quantidade da tabela)
    const startIso = dateList[0]  || '';
    const endIso   = dateList[dateList.length - 1] || '';
    amamOccs
      .filter(o => o.date >= startIso && o.date <= endIso)
      .forEach(o => {
        if (dateMap[o.date] !== undefined) {
          dateMap[o.date] += (parseInt(o.quantity) || 0);
        }
      });

    const total = Object.values(dateMap).reduce((a, b) => a + b, 0);
    setAmamTotal(total);

    if (chartInstances.current.amamentacaoDiaria) {
      chartInstances.current.amamentacaoDiaria.destroy();
      chartInstances.current.amamentacaoDiaria = null;
    }

    const ctx = chartRefs.amamentacaoDiaria.current;
    if (ctx) {
      chartInstances.current.amamentacaoDiaria = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dateLabels,
          datasets: [{
            label: 'Registros de Amamentação',
            data: dateList.map(d => dateMap[d]),
            borderColor: '#047857',
            backgroundColor: 'rgba(4,120,87,0.08)',
            tension: 0.35,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#047857',
            fill: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ' ' + ctx.parsed.y + ' amamentacao(oes) no dia',
              },
            },
          },
          scales: {
            y: {
              grid: { color: gridColor },
              ticks: { color: fontColor, stepSize: 1 },
              min: 0,
            },
            x: {
              grid: { display: false },
              ticks: { color: fontColor, maxRotation: 45, minRotation: 0 },
            },
          },
        },
      });
    }

    return () => {
      if (chartInstances.current.amamentacaoDiaria) {
        chartInstances.current.amamentacaoDiaria.destroy();
        chartInstances.current.amamentacaoDiaria = null;
      }
    };
  }, [occurrences, filters, isDark]);

  // ──────────────────────────────────────────────────────────────────────────
  // Effect 4: Gráfico de Faltas por Aluno (barras empilhadas)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fontColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)';

    const { classroom, studentId } = filters;
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-01-01`;
    const yearEnd   = `${currentYear}-12-31`;

    // Filtrar faltas do ano atual do caderno SEAMI (occurrences type=falta)
    let faltasAno = (occurrences || []).filter(o => o.type === 'falta' && o.date >= yearStart && o.date <= yearEnd);
    if (classroom) faltasAno = faltasAno.filter(o => o.classroom === classroom);
    if (studentId) faltasAno = faltasAno.filter(o => o.studentId === studentId);

    // Também considerar faltas da chamada (attendanceList status F e FJ)
    let attFaltas = (attendanceList || []).filter(o => (o.status === 'F' || o.status === 'FJ') && o.date >= yearStart && o.date <= yearEnd);
    if (classroom) attFaltas = attFaltas.filter(o => o.classroom === classroom);
    if (studentId) attFaltas = attFaltas.filter(o => o.studentId === studentId);

    // Agrupar por aluno (usando attendanceList como base pois tem status F/FJ)
    const studentMap = {}; // id -> { name, justified: 0, unjustified: 0 }
    attFaltas.forEach(o => {
      if (!o.studentId || !o.studentName) return;
      if (!studentMap[o.studentId]) studentMap[o.studentId] = { name: o.studentName, justified: 0, unjustified: 0 };
      if (o.status === 'FJ') studentMap[o.studentId].justified++;
      else studentMap[o.studentId].unjustified++;
    });

    // Complementar com faltas do caderno SEAMI (type=falta)
    faltasAno.forEach(o => {
      if (!o.studentId || !o.studentName) return;
      if (!studentMap[o.studentId]) studentMap[o.studentId] = { name: o.studentName, justified: 0, unjustified: 0 };
      // Evitar dupla contagem se já veio da chamada
      // Usamos apenas as faltas do caderno que não se sobrepõem aos registros de chamada
    });

    // Se não há dados da chamada, usar as faltas do caderno SEAMI
    if (Object.keys(studentMap).length === 0) {
      faltasAno.forEach(o => {
        if (!o.studentId || !o.studentName) return;
        if (!studentMap[o.studentId]) studentMap[o.studentId] = { name: o.studentName, justified: 0, unjustified: 0 };
        if (o.justified === 'sim') studentMap[o.studentId].justified++;
        else studentMap[o.studentId].unjustified++;
      });
    }

    // Ordenar por total de faltas (desc), pegar top 15
    const sorted = Object.entries(studentMap)
      .map(([id, v]) => ({ ...v, total: v.justified + v.unjustified }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    if (chartInstances.current.faltasPorAluno) {
      chartInstances.current.faltasPorAluno.destroy();
      chartInstances.current.faltasPorAluno = null;
    }

    const ctx = chartRefs.faltasPorAluno.current;
    if (ctx) {
      chartInstances.current.faltasPorAluno = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sorted.length > 0 ? sorted.map(s => s.name.split(' ').slice(0, 2).join(' ')) : ['Sem dados'],
          datasets: [
            {
              label: 'Faltas Justificadas',
              data: sorted.length > 0 ? sorted.map(s => s.justified) : [0],
              backgroundColor: 'rgba(245, 158, 11, 0.82)',
              borderColor: '#f59e0b',
              borderWidth: 1,
              borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 },
            },
            {
              label: 'Faltas Não Justificadas',
              data: sorted.length > 0 ? sorted.map(s => s.unjustified) : [0],
              backgroundColor: 'rgba(239, 68, 68, 0.82)',
              borderColor: '#ef4444',
              borderWidth: 1,
              borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                color: fontColor,
                font: { family: 'Inter', size: 11, weight: 600 },
                padding: 16,
                usePointStyle: true,
                pointStyleWidth: 12,
              },
            },
            tooltip: {
              callbacks: {
                title: (items) => sorted[items[0].dataIndex]?.name ?? '',
                afterBody: (items) => {
                  const idx = items[0].dataIndex;
                  const s = sorted[idx];
                  if (!s) return [];
                  const lines = [
                    '',
                    `📊 Total de faltas: ${s.total}`,
                    `✅ Justificadas:    ${s.justified}`,
                    `❌ Não Justificadas: ${s.unjustified}`,
                  ];
                  if (s.total >= 10) lines.push('', '⚠️  Limite de 10 faltas atingido!');
                  return lines;
                },
              },
            },
            annotation: undefined,
          },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: { color: fontColor, font: { size: 11 }, maxRotation: 35, minRotation: 20 },
            },
            y: {
              stacked: true,
              grid: { color: gridColor },
              ticks: { color: fontColor, stepSize: 1 },
              min: 0,
              afterDataLimits: (scale) => {
                scale.max = Math.max(scale.max, 10);
              },
            },
          },
        },
      });
    }

    return () => {
      if (chartInstances.current.faltasPorAluno) {
        chartInstances.current.faltasPorAluno.destroy();
        chartInstances.current.faltasPorAluno = null;
      }
    };
  }, [occurrences, attendanceList, filters, isDark]);

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

        {/* Gráfico de Faltas por Aluno — Barras Empilhadas */}
        <div className="charts-grid" style={{ marginTop: '20px' }}>
          <div className="chart-card full-width-chart">
            <div className="chart-card-header" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{ margin: 0 }}>📅 Faltas por Aluno no Ano — Justificadas vs Não Justificadas</h3>
                <span style={{ fontSize: '11.5px', color: 'var(--slate-500)', fontFamily: 'Inter, sans-serif' }}>
                  Cada barra mostra o total de faltas por aluno empilhado por tipo · Máx. 15 alunos com mais faltas
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#92400e', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
                  Justificadas
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#991b1b', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
                  Não Justificadas
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#4338ca', fontWeight: 600, padding: '3px 10px', borderRadius: '20px', backgroundColor: '#eef2ff', border: '1px solid #a5b4fc' }}>
                  ⚠️ Limite: 10 faltas/ano
                </span>
              </div>
            </div>
            <div className="chart-container-large">
              <canvas ref={chartRefs.faltasPorAluno}></canvas>
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

          <div className="chart-card full-width-chart">
            <div className="chart-card-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <h3>Crianças com Mais Ocorrências no Caderno</h3>
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

          <div className="chart-card full-width-chart">
            <div className="chart-card-header" style={{ flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{ margin: 0 }}>🤱 Registros de Amamentação por Dia</h3>
                <span style={{ fontSize: '12px', color: 'var(--slate-500)', fontFamily: 'Inter, sans-serif' }}>
                  {filters.dateStart && filters.dateEnd
                    ? ('Periodo: ' + new Date(filters.dateStart + 'T00:00:00').toLocaleDateString('pt-BR') + ' a ' + new Date(filters.dateEnd + 'T00:00:00').toLocaleDateString('pt-BR'))
                    : 'Ultimos 30 dias'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 16px',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '20px',
                  border: '1.5px solid #6ee7b7',
                }}>
                  <span style={{ fontSize: '20px' }}>🤱</span>
                  <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: '#047857', fontFamily: 'Outfit, sans-serif' }}>{amamTotal}</span>
                    <span style={{ fontSize: '10px', color: '#065f46', fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>total no período</span>
                  </div>
                </div>
                <span className="chart-legend-pill" style={{ backgroundColor: '#ecfdf5', color: '#047857' }}>Amamentação</span>
              </div>
            </div>
            <div className="chart-container-large">
              <canvas ref={chartRefs.amamentacaoDiaria}></canvas>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
