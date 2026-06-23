import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { ClipboardCheck, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const OCC_TYPE_OPTIONS = [
  { value: 'all',      label: 'Todos',          color: '#be185d', bg: '#fdf2f8' },
  { value: 'falta',    label: '📅 Faltas',       color: '#b91c1c', bg: '#fef2f2' },
  { value: 'atestado', label: '🏥 Atestados',    color: '#7c3aed', bg: '#f5f3ff' },
  { value: 'saida',    label: '🚪 Saídas',       color: '#2563eb', bg: '#eff6ff' },
];

export default function DashboardCharts({ occurrences, attendanceList, students, filters, isDark }) {
  const navigate = useNavigate();
  const [occTypeFilter, setOccTypeFilter] = useState('all');

  // Estados de controle das séries dos gráficos interativos
  const [showFaltasJustified, setShowFaltasJustified] = useState(false);
  const [showFaltasUnjustified, setShowFaltasUnjustified] = useState(true);
  const [showAtrasosJustified, setShowAtrasosJustified] = useState(false);
  const [showAtrasosUnjustified, setShowAtrasosUnjustified] = useState(true);
  
  // Estado para abrir a modal de detalhamento do aluno
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);

  const chartRefs = {
    frequenciaSala:       useRef(null),
    frequenciaDiariaReal: useRef(null),
    atrasosMes:           useRef(null),
    motivos:              useRef(null),
    criancasRecorrentes:  useRef(null),
    amamentacaoDiaria:    useRef(null),
    faltasPorAluno:       useRef(null),
    atrasosPorAluno:      useRef(null),
  };

  const chartInstances = useRef({
    frequenciaSala:       null,
    frequenciaDiariaReal: null,
    atrasosMes:           null,
    motivos:              null,
    criancasRecorrentes:  null,
    amamentacaoDiaria:    null,
    faltasPorAluno:       null,
    atrasosPorAluno:      null,
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
      
      let start, end;
      if (dateStart && dateEnd) {
        start = new Date(dateStart + 'T00:00:00');
        end   = new Date(dateEnd + 'T00:00:00');
      } else if (dateStart) {
        start = new Date(dateStart + 'T00:00:00');
        end   = today;
      } else if (dateEnd) {
        end   = new Date(dateEnd + 'T00:00:00');
        start = new Date(end);
        start.setDate(end.getDate() - 14);
      } else {
        end   = today;
        start = new Date();
        start.setDate(today.getDate() - 14);
      }

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
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
      
      let start, end;
      if (dateStart && dateEnd) {
        start = new Date(dateStart + 'T00:00:00');
        end   = new Date(dateEnd + 'T00:00:00');
      } else if (dateStart) {
        start = new Date(dateStart + 'T00:00:00');
        end   = today;
      } else if (dateEnd) {
        end   = new Date(dateEnd + 'T00:00:00');
        start = new Date(end.getFullYear(), end.getMonth() - 5, 1);
      } else {
        end   = today;
        start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      }

      // Gerar todos os meses no intervalo
      const temp = new Date(start.getFullYear(), start.getMonth(), 1);
      while (temp <= end || (temp.getFullYear() === end.getFullYear() && temp.getMonth() === end.getMonth())) {
        const monthKey = `${monthsName[temp.getMonth()]}/${String(temp.getFullYear()).slice(-2)}`;
        monthlyDelays[monthKey] = 0;
        temp.setMonth(temp.getMonth() + 1);
      }

      filtered.filter(o => o.type === 'atraso').forEach(o => {
        if (o.date) {
          const parts = o.date.split('-');
          const year = parseInt(parts[0]);
          const monthIndex = parseInt(parts[1]) - 1;
          const monthKey = `${monthsName[monthIndex]}/${String(year).slice(-2)}`;
          if (monthlyDelays[monthKey] !== undefined) {
            monthlyDelays[monthKey]++;
          }
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
  // Effect 5: Gráfico de Atrasos por Aluno (barras empilhadas)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fontColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.05)';

    const { dateStart, dateEnd, classroom, studentId } = filters;
    const currentYear = new Date().getFullYear();
    const start = dateStart || `${currentYear}-01-01`;
    const end   = dateEnd || `${currentYear}-12-31`;

    // Filtrar atrasos do período do caderno SEAMI (occurrences type=atraso)
    let atrasosAno = (occurrences || []).filter(o => o.type === 'atraso' && o.date >= start && o.date <= end);
    if (classroom) atrasosAno = atrasosAno.filter(o => o.classroom === classroom);
    if (studentId) atrasosAno = atrasosAno.filter(o => o.studentId === studentId);

    // Agrupar por aluno
    const studentMap = {}; // id -> { name, classroom, justified: 0, unjustified: 0, records: [] }
    atrasosAno.forEach(o => {
      if (!o.studentId || !o.studentName) return;
      if (!studentMap[o.studentId]) {
        const studentInfo = (students || []).find(s => s.id === o.studentId);
        studentMap[o.studentId] = { 
          id: o.studentId, 
          name: o.studentName, 
          classroom: o.classroom || 'Alegria', 
          justified: 0, 
          unjustified: 0, 
          records: [],
          has_acompanhamento: studentInfo?.has_acompanhamento || false,
          acompanhamento_obs: studentInfo?.acompanhamento_obs || ''
        };
      }
      studentMap[o.studentId].records.push({
        date: o.date,
        justified: o.justified, // 'sim' | 'nao'
        motive: o.motive || 'Sem justificativa declarada',
        classroom: o.classroom || 'Alegria',
        type: 'atraso'
      });
      if (o.justified === 'sim') studentMap[o.studentId].justified++;
      else studentMap[o.studentId].unjustified++;
    });

    // Ordenar por total ativo (desc), pegar top 15
    const sorted = Object.entries(studentMap)
      .map(([id, v]) => {
        let activeTotal = 0;
        if (showAtrasosJustified) activeTotal += v.justified;
        if (showAtrasosUnjustified) activeTotal += v.unjustified;
        return { ...v, id, total: activeTotal };
      })
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    if (chartInstances.current.atrasosPorAluno) {
      chartInstances.current.atrasosPorAluno.destroy();
      chartInstances.current.atrasosPorAluno = null;
    }

    const ctx = chartRefs.atrasosPorAluno.current;
    if (ctx) {
      const datasets = [];
      if (showAtrasosJustified) {
        datasets.push({
          label: 'Atrasos Justificados',
          data: sorted.length > 0 ? sorted.map(s => s.justified) : [0],
          backgroundColor: 'rgba(16, 185, 129, 0.82)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: showAtrasosUnjustified ? { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 } : 6,
        });
      }
      if (showAtrasosUnjustified) {
        datasets.push({
          label: 'Atrasos Não Justificados',
          data: sorted.length > 0 ? sorted.map(s => s.unjustified) : [0],
          backgroundColor: 'rgba(245, 158, 11, 0.82)',
          borderColor: '#f59e0b',
          borderWidth: 1,
          borderRadius: showAtrasosJustified ? { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 } : 6,
        });
      }

      chartInstances.current.atrasosPorAluno = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sorted.length > 0 ? sorted.map(s => {
            const shortName = s.name.split(' ').slice(0, 2).join(' ');
            return s.has_acompanhamento ? `${shortName} 🩺` : shortName;
          }) : ['Sem dados'],
          datasets: datasets.length > 0 ? datasets : [{ label: 'Sem dados selecionados', data: sorted.map(() => 0), backgroundColor: 'rgba(0,0,0,0.05)' }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const elementIndex = elements[0].index;
              const student = sorted[elementIndex];
              if (student) {
                setSelectedStudentDetails({
                  id: student.id,
                  name: student.name,
                  classroom: student.classroom,
                  chartType: 'atraso',
                  records: student.records || [],
                  has_acompanhamento: student.has_acompanhamento || false,
                  acompanhamento_obs: student.acompanhamento_obs || ''
                });
              }
            }
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                title: (items) => {
                  const s = sorted[items[0].dataIndex];
                  if (!s) return '';
                  return s.has_acompanhamento ? `${s.name} (🩺 Acomp.)` : s.name;
                },
                afterBody: (items) => {
                  const idx = items[0].dataIndex;
                  const s = sorted[idx];
                  if (!s) return [];
                  const lines = [
                    '',
                    `📊 Total exibido:    ${s.total}`,
                    `✅ Justificados:     ${s.justified}`,
                    `❌ Não Justificados: ${s.unjustified}`,
                  ];
                  if (s.has_acompanhamento) {
                    lines.push('', `🩺 Acompanhamento: ${s.acompanhamento_obs || 'Sim'}`);
                  }
                  return lines;
                },
              },
            },
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
            },
          },
        },
      });
    }

    return () => {
      if (chartInstances.current.atrasosPorAluno) {
        chartInstances.current.atrasosPorAluno.destroy();
        chartInstances.current.atrasosPorAluno = null;
      }
    };
  }, [occurrences, filters, isDark, showAtrasosJustified, showAtrasosUnjustified, students]);

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

    const { dateStart, dateEnd, classroom, studentId } = filters;
    const currentYear = new Date().getFullYear();
    const start = dateStart || `${currentYear}-01-01`;
    const end   = dateEnd || `${currentYear}-12-31`;

    // Filtrar faltas do período do caderno SEAMI (occurrences type=falta)
    let faltasAno = (occurrences || []).filter(o => o.type === 'falta' && o.date >= start && o.date <= end);
    if (classroom) faltasAno = faltasAno.filter(o => o.classroom === classroom);
    if (studentId) faltasAno = faltasAno.filter(o => o.studentId === studentId);

    // Também considerar faltas da chamada (attendanceList status F e FJ)
    let attFaltas = (attendanceList || []).filter(o => (o.status === 'F' || o.status === 'FJ') && o.date >= start && o.date <= end);
    if (classroom) attFaltas = attFaltas.filter(o => o.classroom === classroom);
    if (studentId) attFaltas = attFaltas.filter(o => o.studentId === studentId);

    // Agrupar por aluno (usando attendanceList como base pois tem status F/FJ)
    const studentMap = {}; // id -> { name, classroom, justified: 0, unjustified: 0, records: [] }
    attFaltas.forEach(o => {
      if (!o.studentId || !o.studentName) return;
      if (!studentMap[o.studentId]) {
        const studentInfo = (students || []).find(s => s.id === o.studentId);
        studentMap[o.studentId] = { 
          id: o.studentId, 
          name: o.studentName, 
          classroom: o.classroom || 'Alegria', 
          justified: 0, 
          unjustified: 0, 
          records: [],
          has_acompanhamento: studentInfo?.has_acompanhamento || false,
          acompanhamento_obs: studentInfo?.acompanhamento_obs || ''
        };
      }
      studentMap[o.studentId].records.push({
        date: o.date,
        justified: o.status === 'FJ' ? 'sim' : 'nao',
        motive: o.status === 'FJ' ? 'Falta justificada na chamada' : 'Falta lançada na chamada',
        classroom: o.classroom || 'Alegria',
        type: 'chamada'
      });
      if (o.status === 'FJ') studentMap[o.studentId].justified++;
      else studentMap[o.studentId].unjustified++;
    });

    // Complementar com faltas do caderno SEAMI (type=falta)
    faltasAno.forEach(o => {
      if (!o.studentId || !o.studentName) return;
      if (!studentMap[o.studentId]) {
        const studentInfo = (students || []).find(s => s.id === o.studentId);
        studentMap[o.studentId] = { 
          id: o.studentId, 
          name: o.studentName, 
          classroom: o.classroom || 'Alegria', 
          justified: 0, 
          unjustified: 0, 
          records: [],
          has_acompanhamento: studentInfo?.has_acompanhamento || false,
          acompanhamento_obs: studentInfo?.acompanhamento_obs || ''
        };
      }
      // Evitar dupla contagem se já veio da chamada
      const alreadyHas = studentMap[o.studentId].records.some(r => r.date === o.date);
      if (!alreadyHas) {
        studentMap[o.studentId].records.push({
          date: o.date,
          justified: o.justified, // 'sim' | 'nao'
          motive: o.motive || 'Sem justificativa declarada',
          classroom: o.classroom || 'Alegria',
          type: 'caderno'
        });
        if (o.justified === 'sim') studentMap[o.studentId].justified++;
        else studentMap[o.studentId].unjustified++;
      }
    });

    // Se não há dados da chamada, usar as faltas do caderno SEAMI
    if (Object.keys(studentMap).length === 0) {
      faltasAno.forEach(o => {
        if (!o.studentId || !o.studentName) return;
        if (!studentMap[o.studentId]) {
          const studentInfo = (students || []).find(s => s.id === o.studentId);
          studentMap[o.studentId] = { 
            id: o.studentId, 
            name: o.studentName, 
            classroom: o.classroom || 'Alegria', 
            justified: 0, 
            unjustified: 0, 
            records: [],
            has_acompanhamento: studentInfo?.has_acompanhamento || false,
            acompanhamento_obs: studentInfo?.acompanhamento_obs || ''
          };
        }
        studentMap[o.studentId].records.push({
          date: o.date,
          justified: o.justified,
          motive: o.motive || 'Sem justificativa declarada',
          classroom: o.classroom || 'Alegria',
          type: 'caderno'
        });
        if (o.justified === 'sim') studentMap[o.studentId].justified++;
        else studentMap[o.studentId].unjustified++;
      });
    }

    // Ordenar por total ativo (desc), pegar top 15
    const sorted = Object.entries(studentMap)
      .map(([id, v]) => {
        let activeTotal = 0;
        if (showFaltasJustified) activeTotal += v.justified;
        if (showFaltasUnjustified) activeTotal += v.unjustified;
        return { ...v, id, total: activeTotal };
      })
      .filter(s => s.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);

    if (chartInstances.current.faltasPorAluno) {
      chartInstances.current.faltasPorAluno.destroy();
      chartInstances.current.faltasPorAluno = null;
    }

    const ctx = chartRefs.faltasPorAluno.current;
    if (ctx) {
      const datasets = [];
      if (showFaltasJustified) {
        datasets.push({
          label: 'Faltas Justificadas',
          data: sorted.length > 0 ? sorted.map(s => s.justified) : [0],
          backgroundColor: 'rgba(59, 130, 246, 0.82)',
          borderColor: '#3b82f6',
          borderWidth: 1,
          borderRadius: showFaltasUnjustified ? { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 } : 6,
        });
      }
      if (showFaltasUnjustified) {
        datasets.push({
          label: 'Faltas Não Justificadas',
          data: sorted.length > 0 ? sorted.map(s => s.unjustified) : [0],
          backgroundColor: 'rgba(239, 68, 68, 0.82)',
          borderColor: '#ef4444',
          borderWidth: 1,
          borderRadius: showFaltasJustified ? { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 } : 6,
        });
      }

      chartInstances.current.faltasPorAluno = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sorted.length > 0 ? sorted.map(s => s.name.split(' ').slice(0, 2).join(' ')) : ['Sem dados'],
          datasets: datasets.length > 0 ? datasets : [{ label: 'Sem dados selecionados', data: sorted.map(() => 0), backgroundColor: 'rgba(0,0,0,0.05)' }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const elementIndex = elements[0].index;
              const student = sorted[elementIndex];
              if (student) {
                setSelectedStudentDetails({
                  id: student.id,
                  name: student.name,
                  classroom: student.classroom,
                  chartType: 'falta',
                  records: student.records || [],
                  has_acompanhamento: student.has_acompanhamento || false,
                  acompanhamento_obs: student.acompanhamento_obs || ''
                });
              }
            }
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                title: (items) => {
                  const s = sorted[items[0].dataIndex];
                  if (!s) return '';
                  return s.has_acompanhamento ? `${s.name} (🩺 Acomp.)` : s.name;
                },
                afterBody: (items) => {
                  const idx = items[0].dataIndex;
                  const s = sorted[idx];
                  if (!s) return [];
                  const lines = [
                    '',
                    `📊 Total exibido:    ${s.total}`,
                    `✅ Justificadas:    ${s.justified}`,
                    `❌ Não Justificadas: ${s.unjustified}`,
                  ];
                  if (s.has_acompanhamento) {
                    lines.push('', `🩺 Acompanhamento: ${s.acompanhamento_obs || 'Sim'}`);
                  }
                  if (s.unjustified >= 10) lines.push('', '⚠️  Limite de 10 faltas não justificadas atingido!');
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
  }, [occurrences, attendanceList, filters, isDark, showFaltasJustified, showFaltasUnjustified, students]);

  // Auxiliar para filtrar os registros a serem mostrados na modal
  const getFilteredRecords = (details) => {
    if (!details) return [];
    if (details.chartType === 'falta') {
      return details.records.filter(r => {
        if (r.justified === 'sim' && showFaltasJustified) return true;
        if (r.justified !== 'sim' && showFaltasUnjustified) return true;
        return false;
      });
    } else {
      return details.records.filter(r => {
        if (r.justified === 'sim' && showAtrasosJustified) return true;
        if (r.justified !== 'sim' && showAtrasosUnjustified) return true;
        return false;
      });
    }
  };

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
              <span className="chart-legend-pill" style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                {filters.dateStart || filters.dateEnd ? 'Intervalo Selecionado' : 'Últimos 15 Dias Letivos'}
              </span>
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
                <h3 style={{ margin: 0 }}>
                  📅 Faltas por Aluno {filters.dateStart || filters.dateEnd ? 'no Período' : 'no Ano'} — Justificadas vs Não Justificadas
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--slate-500)', fontFamily: 'Inter, sans-serif' }}>
                  Cada barra mostra o total de faltas por aluno empilhado por tipo · Máx. 15 alunos com mais faltas
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setShowFaltasJustified(!showFaltasJustified)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px', 
                    fontSize: '11px', 
                    color: '#1e3a8a', 
                    fontWeight: 600, 
                    padding: '5px 12px', 
                    borderRadius: '20px', 
                    backgroundColor: showFaltasJustified ? '#eff6ff' : 'var(--slate-100)', 
                    border: showFaltasJustified ? '1px solid #3b82f6' : '1px solid transparent',
                    opacity: showFaltasJustified ? 1 : 0.5,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#3b82f6', display: 'inline-block' }}></span>
                  Justificadas
                </button>
                <button 
                  onClick={() => setShowFaltasUnjustified(!showFaltasUnjustified)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px', 
                    fontSize: '11px', 
                    color: '#991b1b', 
                    fontWeight: 600, 
                    padding: '5px 12px', 
                    borderRadius: '20px', 
                    backgroundColor: showFaltasUnjustified ? '#fef2f2' : 'var(--slate-100)', 
                    border: showFaltasUnjustified ? '1px solid #ef4444' : '1px solid transparent',
                    opacity: showFaltasUnjustified ? 1 : 0.5,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#ef4444', display: 'inline-block' }}></span>
                  Não Justificadas
                </button>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#4338ca', fontWeight: 600, padding: '5px 12px', borderRadius: '20px', backgroundColor: '#eef2ff', border: '1px solid #a5b4fc' }}>
                  ⚠️ Limite: 10 faltas não justificadas/ano
                </span>
              </div>
            </div>
            <div className="chart-container-large">
              <canvas ref={chartRefs.faltasPorAluno}></canvas>
            </div>
          </div>
        </div>

        {/* Gráfico de Atrasos por Aluno — Barras Empilhadas */}
        <div className="charts-grid" style={{ marginTop: '20px' }}>
          <div className="chart-card full-width-chart">
            <div className="chart-card-header" style={{ flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{ margin: 0 }}>
                  ⏰ Atrasos por Aluno {filters.dateStart || filters.dateEnd ? 'no Período' : 'no Ano'} — Justificados vs Não Justificados
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--slate-500)', fontFamily: 'Inter, sans-serif' }}>
                  Cada barra mostra o total de atrasos por aluno empilhado por tipo · Máx. 15 alunos com mais atrasos
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setShowAtrasosJustified(!showAtrasosJustified)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px', 
                    fontSize: '11px', 
                    color: '#065f46', 
                    fontWeight: 600, 
                    padding: '5px 12px', 
                    borderRadius: '20px', 
                    backgroundColor: showAtrasosJustified ? '#ecfdf5' : 'var(--slate-100)', 
                    border: showAtrasosJustified ? '1px solid #10b981' : '1px solid transparent',
                    opacity: showAtrasosJustified ? 1 : 0.5,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  Justificados
                </button>
                <button 
                  onClick={() => setShowAtrasosUnjustified(!showAtrasosUnjustified)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '5px', 
                    fontSize: '11px', 
                    color: '#92400e', 
                    fontWeight: 600, 
                    padding: '5px 12px', 
                    borderRadius: '20px', 
                    backgroundColor: showAtrasosUnjustified ? '#fffbeb' : 'var(--slate-100)', 
                    border: showAtrasosUnjustified ? '1px solid #f59e0b' : '1px solid transparent',
                    opacity: showAtrasosUnjustified ? 1 : 0.5,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#f59e0b', display: 'inline-block' }}></span>
                  Não Justificados
                </button>
              </div>
            </div>
            <div className="chart-container-large">
              <canvas ref={chartRefs.atrasosPorAluno}></canvas>
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

      {/* MODAL DE DETALHES DE FALTAS/ATRASOS DO ALUNO */}
      {selectedStudentDetails && (() => {
        const filteredRecords = getFilteredRecords(selectedStudentDetails);
        const isFalta = selectedStudentDetails.chartType === 'falta';
        return (
          <div className="modal-overlay active" onClick={() => setSelectedStudentDetails(null)} style={{ zIndex: 1000 }}>
            <div className="modal-card" style={{ maxWidth: '600px', width: '95%', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header" style={{ borderBottom: '1px solid var(--slate-100)', padding: '16px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '26px' }}>{isFalta ? '📅' : '⏰'}</span>
                  <div style={{ textAlign: 'left' }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--slate-800)', fontFamily: 'Outfit, sans-serif' }}>
                      Detalhamento de {isFalta ? 'Faltas' : 'Atrasos'}
                    </h2>
                    <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                      Estudante: <strong>{selectedStudentDetails.name}</strong> &middot; Sala {selectedStudentDetails.classroom}
                    </span>
                  </div>
                </div>
                <button className="modal-close-btn" onClick={() => setSelectedStudentDetails(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--slate-400)' }}>✕</button>
              </div>
              
              <div className="form-body" style={{ maxHeight: '55vh', overflowY: 'auto', padding: '20px 24px' }}>
                {selectedStudentDetails.has_acompanhamento && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '10px', 
                    padding: '12px 16px', 
                    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : '#eff6ff', 
                    border: '1px solid rgba(59, 130, 246, 0.3)', 
                    borderRadius: '12px', 
                    marginBottom: '16px',
                    color: isDark ? '#93c5fd' : '#1e40af',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>🩺</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ display: 'block', marginBottom: '2px', color: isDark ? '#60a5fa' : '#1d4ed8' }}>Acompanhamento Ativo</strong>
                      <span>{selectedStudentDetails.acompanhamento_obs || 'Este aluno possui acompanhamento/atraso justificado registrado.'}</span>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--slate-700)' }}>
                    Registros no Ano ({filteredRecords.length})
                  </span>
                </div>
                
                {filteredRecords.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--slate-400)', fontSize: '13px' }}>
                    Nenhum registro correspondente ao filtro ativo.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredRecords
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .map((record, index) => {
                        const dateBR = record.date.split('-').reverse().join('/');
                        const isJustified = record.justified === 'sim';
                        return (
                          <div 
                            key={index} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              padding: '12px 16px', 
                              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc', 
                              borderRadius: '12px', 
                              border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}`,
                              gap: '12px'
                            }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0, flex: 1 }}>
                              <span style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--slate-800)' }}>
                                {dateBR}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--slate-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <strong>Motivo:</strong> {record.motive}
                              </span>
                              <span style={{ fontSize: '10px', color: 'var(--slate-400)', textTransform: 'capitalize' }}>
                                Origem: {record.type === 'chamada' ? 'Chamada de Classe' : record.type === 'caderno' ? 'Caderno SEAMI' : 'Atraso Caderno'}
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                              <span style={{ 
                                fontSize: '10px', 
                                fontWeight: '700', 
                                padding: '3px 8px', 
                                borderRadius: '6px', 
                                color: isJustified ? '#047857' : '#991b1b',
                                backgroundColor: isJustified ? '#ecfdf5' : '#fef2f2',
                                border: `1px solid ${isJustified ? '#a7f3d0' : '#fca5a5'}`
                              }}>
                                {isJustified ? 'Justificado' : 'Não Justif.'}
                              </span>
                              <button 
                                onClick={() => {
                                  setSelectedStudentDetails(null);
                                  navigate(`/chamada?date=${record.date}&classroom=${record.classroom}`, { state: { date: record.date, classroom: record.classroom } });
                                }}
                                className="primary-btn" 
                                style={{ 
                                  padding: '6px 12px', 
                                  fontSize: '11px', 
                                  borderRadius: '8px',
                                  backgroundColor: 'var(--brand-primary)',
                                  color: 'white',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                Ir para Chamada
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
              
              <div className="modal-footer" style={{ borderTop: '1px solid var(--slate-100)', padding: '16px 24px' }}>
                <button className="secondary-btn" onClick={() => setSelectedStudentDetails(null)} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px' }}>Fechar</button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
