import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Info, Printer, AlertTriangle, Plus, Edit, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getOccurrences, getAttendance, saveSettings } from '../supabaseClient';

const CLASSROOMS = ['Alegria', 'Carinho', 'União', 'Amizade', 'Felicidade'];
const ABSENCE_LIMIT = 10;

export default function ReportsPage() {
  const { isDark, students, historicalData, setHistoricalData } = useAppContext();
  const activeStudents = students.filter(s => s.active !== false);

  const [occurrences, setOccurrences] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [activeTab, setActiveTab] = useState('faltas'); // 'faltas' | 'frequencia'
  const [groupByClassroom, setGroupByClassroom] = useState(false);
  const [filters, setFilters] = useState({
    justified: 'all',  // 'all' | 'sim' | 'nao'
    classroom: '',
    studentId: '',
    dateStart: '',
    dateEnd: ''
  });
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  // ── ESTADOS DE DADOS HISTÓRICOS ─────────────────────────────────────────
  const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);
  const [historicalForm, setHistoricalForm] = useState({ id: null, month: '', enrolled: '', present: '' });
  const [historicalSaving, setHistoricalSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [occData, attData] = await Promise.all([
          getOccurrences(),
          getAttendance()
        ]);
        setOccurrences(occData || []);
        setAttendanceList(attData || []);
      } catch (err) {
        console.error('[ReportsPage] Erro ao carregar dados:', err);
      }
    };
    load();
  }, []);

  // ── FUNÇÕES DE DADOS HISTÓRICOS ────────────────────────────────────────
  const handleOpenHistoricalModal = (item = null) => {
    if (item) {
      setHistoricalForm({ id: item.id, month: item.month, enrolled: String(item.enrolled), present: String(item.present) });
    } else {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      setHistoricalForm({ id: null, month: `${y}-${m}`, enrolled: '', present: '' });
    }
    setIsHistoricalModalOpen(true);
  };

  const handleSaveHistorical = async (e) => {
    e.preventDefault();
    if (!historicalForm.month || historicalForm.enrolled === '' || historicalForm.present === '') {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    const enrolled = parseInt(historicalForm.enrolled, 10);
    const present = parseInt(historicalForm.present, 10);
    if (isNaN(enrolled) || enrolled < 0) {
      alert('A quantidade de matriculados deve ser um número maior ou igual a 0.');
      return;
    }
    if (isNaN(present) || present < 0) {
      alert('A quantidade de presentes deve ser um número maior ou igual a 0.');
      return;
    }
    if (present > enrolled) {
      alert('A quantidade de presentes não pode ser maior que a de matriculados.');
      return;
    }
    const dup = (historicalData || []).find(h => h.month === historicalForm.month && h.id !== historicalForm.id);
    if (dup) {
      alert(`Já existe um registro histórico para ${historicalForm.month.split('-').reverse().join('/')}.`);
      return;
    }
    try {
      setHistoricalSaving(true);
      let updatedList;
      if (historicalForm.id) {
        updatedList = (historicalData || []).map(h =>
          h.id === historicalForm.id ? { ...h, month: historicalForm.month, enrolled, present } : h
        );
      } else {
        const newItem = { id: 'hist_' + Date.now(), month: historicalForm.month, enrolled, present };
        updatedList = [...(historicalData || []), newItem];
      }
      updatedList.sort((a, b) => b.month.localeCompare(a.month));
      await saveSettings({ historical_data: JSON.stringify(updatedList) });
      setHistoricalData(updatedList);
      setIsHistoricalModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar dados históricos.');
    } finally {
      setHistoricalSaving(false);
    }
  };

  const handleDeleteHistorical = async (id, month) => {
    const formattedMonth = month.split('-').reverse().join('/');
    if (!window.confirm(`Excluir os dados históricos de ${formattedMonth}?`)) return;
    try {
      const updatedList = (historicalData || []).filter(h => h.id !== id);
      await saveSettings({ historical_data: JSON.stringify(updatedList) });
      setHistoricalData(updatedList);
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir dados históricos.');
    }
  };

  const setPreset = (days) => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - days);
    setFilters(f => ({
      ...f,
      dateStart: past.toISOString().split('T')[0],
      dateEnd: today.toISOString().split('T')[0]
    }));
  };

  // Apenas faltas do caderno SEAMI (type === 'falta')
  const allAbsences = useMemo(() =>
    occurrences.filter(o => o.type === 'falta'),
    [occurrences]
  );

  // Lista filtrada
  const list = useMemo(() => {
    return allAbsences
      .filter(o => {
        const { justified, classroom, studentId, dateStart, dateEnd } = filters;
        if (justified === 'sim' && o.justified !== 'sim') return false;
        if (justified === 'nao' && o.justified === 'sim') return false;
        if (classroom && o.classroom !== classroom) return false;
        if (studentId && o.studentId !== studentId) return false;
        if (dateStart && o.date < dateStart) return false;
        if (dateEnd && o.date > dateEnd) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allAbsences, filters]);

  // Estatísticas da lista filtrada
  const justifiedCount = list.filter(o => o.justified === 'sim').length;
  const unjustifiedCount = list.filter(o => o.justified !== 'sim').length;

  // Total de faltas no ano atual (ignorando filtros de data/justificativa, mantendo sala/aluno)
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;
  const annualAbsences = useMemo(() => {
    return allAbsences.filter(o => {
      if (o.date < yearStart || o.date > yearEnd) return false;
      if (filters.classroom && o.classroom !== filters.classroom) return false;
      if (filters.studentId && o.studentId !== filters.studentId) return false;
      return true;
    });
  }, [allAbsences, filters.classroom, filters.studentId, yearStart, yearEnd]);

  const annualJustified = annualAbsences.filter(o => o.justified === 'sim').length;
  const annualUnjustified = annualAbsences.filter(o => o.justified !== 'sim').length;
  const annualTotal = annualAbsences.length;

  // Calcula faltas anuais por aluno (para alertas de limite)
  const studentAnnualMap = useMemo(() => {
    const map = {};
    allAbsences.forEach(o => {
      if (o.date >= yearStart && o.date <= yearEnd && o.studentId) {
        if (!map[o.studentId]) map[o.studentId] = { name: o.studentName, total: 0 };
        map[o.studentId].total++;
      }
    });
    return map;
  }, [allAbsences, yearStart, yearEnd]);

  const studentsOverLimit = Object.values(studentAnnualMap).filter(s => s.total >= ABSENCE_LIMIT);

  // Alunos filtrados pela sala selecionada
  const filteredStudents = useMemo(() =>
    activeStudents
      .filter(s => !filters.classroom || s.classroom === filters.classroom)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [activeStudents, filters.classroom]
  );

  // ── EXPORTAR EXCEL ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (list.length === 0) { alert('Não há dados para exportar.'); return; }
    if (typeof window.XLSX === 'undefined') { alert('Biblioteca SheetJS não carregada.'); return; }
    const mapped = list.map((occ, idx) => ({
      'Data Reg. Ausência': occ.date ? occ.date.split('-').reverse().join('/') : '-',
      'Criança': occ.studentName || '-',
      'Sala': occ.classroom || '-',
      'Motivo Declarado': occ.motive || '-',
      'Data de Início da Ausência': occ.startDate ? occ.startDate.split('-').reverse().join('/') : '-',
      'Data de Fim da Ausência': occ.endDate ? occ.endDate.split('-').reverse().join('/') : '-',
      'Dias': occ.days || '-',
      'Falta Justificada por Escrito?': occ.justified === 'sim' ? 'Sim' : 'Não',
      'Houve Aviso Prévio dos Pais?': occ.notified === 'sim' ? 'Sim' : 'Não',
      'Mensagem/Justificativa da Família': occ.obs || '-',
      'Responsável': occ.guardian || 'N/A',
      'Registrado por': occ.recordedBy || '-'
    }));
    const ws = window.XLSX.utils.json_to_sheet(mapped);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Faltas');
    const maxLens = {};
    mapped.forEach(row => Object.keys(row).forEach(k => { maxLens[k] = Math.max(maxLens[k] || 10, String(row[k]).length); }));
    ws['!cols'] = Object.keys(maxLens).map(k => ({ wch: maxLens[k] + 3 }));
    const dateSuffix = new Date().toISOString().split('T')[0];
    window.XLSX.writeFile(wb, `Relatorio_Faltas_${dateSuffix}.xlsx`);
  };

  // ── EXPORTAR PDF ────────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (list.length === 0) { alert('Não há dados para exportar.'); return; }
    if (typeof window.jspdf === 'undefined') { alert('Biblioteca jsPDF não carregada.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Cabeçalho
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 297, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('EducaGestão Portal Creche', 12, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Relatório de Gestão de Faltas (Justificadas e Não Justificadas)', 12, 24);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} | Total filtrado: ${list.length} | Justificadas: ${justifiedCount} | Não justificadas: ${unjustifiedCount}`, 12, 31);

    let y = 50;
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);

    const drawHeader = () => {
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 5, 277, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Data', 12, y);
      doc.text('Criança', 31, y);
      doc.text('Sala', 79, y);
      doc.text('Tipo de Falta', 99, y);
      doc.text('Justificativa / Motivo', 129, y);
      doc.text('Detalhes', 185, y);
      doc.text('Responsável', 241, y);
      y += 10;
      doc.setFont('helvetica', 'normal');
    };
    drawHeader();

    list.forEach(occ => {
      if (y > 188) { doc.addPage(); y = 20; drawHeader(); }
      const dateBR = occ.date ? occ.date.split('-').reverse().join('/') : '-';
      const tipoFalta = occ.justified === 'sim' ? 'Justificada' : 'Não Justificada';
      const nameTrunc = occ.studentName && occ.studentName.length > 22 ? occ.studentName.substring(0, 20) + '...' : (occ.studentName || '-');
      const justificativa = occ.motive ? (occ.motive.length > 26 ? occ.motive.substring(0, 24) + '...' : occ.motive) : '-';
      const detalhes = occ.obs ? (occ.obs.length > 26 ? occ.obs.substring(0, 24) + '...' : occ.obs) : '-';
      const guardian = occ.guardian ? (occ.guardian.length > 20 ? occ.guardian.substring(0, 18) + '...' : occ.guardian) : '-';

      // Cor por tipo
      if (occ.justified === 'sim') {
        doc.setTextColor(146, 64, 14); // âmbar
      } else {
        doc.setTextColor(153, 27, 27); // vermelho
      }
      doc.text(dateBR, 12, y);
      doc.setTextColor(30, 41, 59);
      doc.text(nameTrunc, 31, y);
      doc.text(occ.classroom || '-', 79, y);
      if (occ.justified === 'sim') {
        doc.setTextColor(146, 64, 14);
      } else {
        doc.setTextColor(153, 27, 27);
      }
      doc.text(tipoFalta, 99, y);
      doc.setTextColor(30, 41, 59);
      doc.text(justificativa, 129, y);
      doc.text(detalhes, 185, y);
      doc.text(guardian, 241, y);
      doc.setDrawColor(226, 232, 240);
      doc.line(10, y + 3, 287, y + 3);
      y += 9;
    });

    const dateSuffix = new Date().toISOString().split('T')[0];
    doc.save(`Relatorio_Faltas_${dateSuffix}.pdf`);
  };

  // ── LÓGICA DE FREQUÊNCIA ──────────────────────────────────────────────────
  const frequencyRows = useMemo(() => {
    const { dateStart, dateEnd, classroom } = filters;
    
    let startStr = dateStart;
    let endStr = dateEnd;
    
    if (!startStr || !endStr) {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
      if (!startStr) startStr = `${currentYear}-${currentMonth}-01`;
      if (!endStr) {
        const lastDayVal = new Date(currentYear, today.getMonth() + 1, 0).getDate();
        endStr = `${currentYear}-${currentMonth}-${String(lastDayVal).padStart(2, '0')}`;
      }
    }

    const startDate = new Date(startStr + 'T00:00:00');
    const endDate = new Date(endStr + 'T00:00:00');
    const rows = [];
    const roomsList = classroom ? [classroom] : ['Alegria', 'Carinho', 'União', 'Amizade', 'Felicidade'];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      if (isWeekend) continue;

      const currentDateStr = d.toISOString().split('T')[0];
      const dayAttRecords = (attendanceList || []).filter(a => a.date === currentDateStr);
      if (dayAttRecords.length === 0) continue;

      if (groupByClassroom && !classroom) {
        roomsList.forEach(room => {
          const roomAttRecords = dayAttRecords.filter(a => a.classroom === room);
          if (roomAttRecords.length === 0) return;

          const present = roomAttRecords.filter(a => a.status === 'P').length;
          const enrolled = (students || []).filter(s => {
            if (s.classroom !== room) return false;
            const entry = s.entry_date || '2026-01-01';
            if (entry > currentDateStr) return false;
            if (s.deactivation_date && s.deactivation_date < currentDateStr) return false;
            return true;
          }).length;

          const absences = Math.max(0, enrolled - present);
          const denominator = enrolled > 0 ? enrolled : roomAttRecords.length;
          const percentage = denominator > 0 ? Math.min(100, Math.round((present / denominator) * 100)) : 100;

          rows.push({
            date: currentDateStr,
            classroom: room,
            enrolled,
            present,
            absences,
            percentage
          });
        });
      } else {
        const targetAttRecords = classroom 
          ? dayAttRecords.filter(a => a.classroom === classroom)
          : dayAttRecords;
          
        if (targetAttRecords.length === 0) continue;

        const present = targetAttRecords.filter(a => a.status === 'P').length;
        const enrolled = (students || []).filter(s => {
          if (classroom && s.classroom !== classroom) return false;
          const entry = s.entry_date || '2026-01-01';
          if (entry > currentDateStr) return false;
          if (s.deactivation_date && s.deactivation_date < currentDateStr) return false;
          return true;
        }).length;

        const absences = Math.max(0, enrolled - present);
        const denominator = enrolled > 0 ? enrolled : targetAttRecords.length;
        const percentage = denominator > 0 ? Math.min(100, Math.round((present / denominator) * 100)) : 100;

        rows.push({
          date: currentDateStr,
          classroom: classroom || 'Geral (Todas as Salas)',
          enrolled,
          present,
          absences,
          percentage
        });
      }
    }

    // Adiciona registros históricos que se sobrepõem ao intervalo selecionado
    (historicalData || []).forEach(item => {
      const [y, m] = item.month.split('-');
      const lastDayVal = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
      const monthStartStr = `${item.month}-01`;
      const monthEndStr = `${item.month}-${String(lastDayVal).padStart(2, '0')}`;

      if (monthStartStr <= endStr && monthEndStr >= startStr) {
        if (classroom) return; 

        const enrolled = item.enrolled;
        const present = item.present;
        const absences = Math.max(0, enrolled - present);
        const percentage = enrolled > 0 ? Math.min(100, Math.round((present / enrolled) * 100)) : 100;

        rows.push({
          date: item.month, 
          classroom: 'Geral (Dados Históricos)',
          enrolled,
          present,
          absences,
          percentage,
          isHistorical: true
        });
      }
    });

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  }, [filters, attendanceList, students, groupByClassroom, historicalData]);

  const frequencyStats = useMemo(() => {
    if (frequencyRows.length === 0) return { days: 0, avgEnrolled: 0, avgPresent: 0, avgRate: 100 };
    const totalEnrolled = frequencyRows.reduce((a, b) => a + b.enrolled, 0);
    const totalPresent = frequencyRows.reduce((a, b) => a + b.present, 0);
    const avgEnrolled = Math.round(totalEnrolled / frequencyRows.length);
    const avgPresent = Math.round(totalPresent / frequencyRows.length);
    const avgRate = totalEnrolled > 0 ? Math.round((totalPresent / totalEnrolled) * 100) : 100;
    
    const realDays = frequencyRows.filter(r => !r.isHistorical).length;
    
    return {
      days: realDays,
      avgEnrolled,
      avgPresent,
      avgRate
    };
  }, [frequencyRows]);

  const exportFrequencyExcel = () => {
    if (frequencyRows.length === 0) { alert('Não há dados de frequência para exportar.'); return; }
    if (typeof window.XLSX === 'undefined') { alert('Biblioteca SheetJS não carregada.'); return; }
    
    const mapped = frequencyRows.map(row => ({
      'Data': row.date ? row.date.split('-').reverse().join('/') : '-',
      'Turma/Sala': row.classroom || '-',
      'Quantidade de Matriculados': row.enrolled || 0,
      'Quantidade de Presentes': row.present || 0,
      'Quantidade de Faltas/Ausentes': row.absences || 0,
      'Taxa de Frequência (%)': `${row.percentage}%`
    }));

    const ws = window.XLSX.utils.json_to_sheet(mapped);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, 'Frequência Diária');
    
    const maxLens = {};
    mapped.forEach(row => Object.keys(row).forEach(k => { 
      maxLens[k] = Math.max(maxLens[k] || 10, String(row[k]).length); 
    }));
    ws['!cols'] = Object.keys(maxLens).map(k => ({ wch: maxLens[k] + 3 }));
    
    const startIso = (filters.dateStart || 'Inicio').replace(/[^a-zA-Z0-9-]/g, '');
    const endIso = (filters.dateEnd || 'Fim').replace(/[^a-zA-Z0-9-]/g, '');
    window.XLSX.writeFile(wb, `Relatorio_Frequencia_${startIso}_a_${endIso}.xlsx`);
  };

  const exportFrequencyPDF = () => {
    if (frequencyRows.length === 0) { alert('Não há dados para exportar.'); return; }
    if (typeof window.jspdf === 'undefined') { alert('Biblioteca jsPDF não carregada.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('EducaGestão Portal Creche', 12, 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Relatório de Frequência Diária vs Alunos Matriculados', 12, 18);
    
    const startLabel = filters.dateStart ? filters.dateStart.split('-').reverse().join('/') : 'Início';
    const endLabel = filters.dateEnd ? filters.dateEnd.split('-').reverse().join('/') : 'Fim';
    doc.text(`Intervalo: ${startLabel} a ${endLabel} | Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 12, 24);

    let y = 45;
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);

    const drawHeader = () => {
      doc.setFillColor(241, 245, 249);
      doc.rect(10, y - 5, 190, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Data', 12, y);
      doc.text('Turma', 42, y);
      doc.text('Matriculados', 85, y);
      doc.text('Presentes', 115, y);
      doc.text('Ausentes', 145, y);
      doc.text('Frequência (%)', 175, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
    };
    drawHeader();

    frequencyRows.forEach(row => {
      if (y > 275) { doc.addPage(); y = 20; drawHeader(); }
      const dateBR = row.date ? row.date.split('-').reverse().join('/') : '-';
      
      doc.text(dateBR, 12, y);
      doc.text(row.classroom || '-', 42, y);
      doc.text(String(row.enrolled), 85, y);
      doc.text(String(row.present), 115, y);
      doc.text(String(row.absences), 145, y);
      
      if (row.percentage >= 90) {
        doc.setTextColor(16, 185, 129);
      } else if (row.percentage >= 75) {
        doc.setTextColor(245, 158, 11);
      } else {
        doc.setTextColor(239, 68, 68);
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${row.percentage}%`, 175, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);

      doc.setDrawColor(226, 232, 240);
      doc.line(10, y + 2, 200, y + 2);
      y += 8;
    });

    const startIso = (filters.dateStart || 'Inicio').replace(/[^a-zA-Z0-9-]/g, '');
    const endIso = (filters.dateEnd || 'Fim').replace(/[^a-zA-Z0-9-]/g, '');
    doc.save(`Relatorio_Frequencia_${startIso}_a_${endIso}.pdf`);
  };

  return (
    <section className="panel-section active">
      {/* Abas do Relatório */}
      <div className="report-tabs">
        <button 
          className={`report-tab-btn ${activeTab === 'faltas' ? 'active' : ''}`}
          onClick={() => setActiveTab('faltas')}
        >
          📅 Relatório de Faltas
        </button>
        <button 
          className={`report-tab-btn ${activeTab === 'frequencia' ? 'active' : ''}`}
          onClick={() => setActiveTab('frequencia')}
        >
          📊 Frequência vs Matriculados
        </button>
      </div>

      {/* ── FILTROS ──────────────────────────────────────────────────── */}
      <div className="filter-card">
        <div className="filter-card-header">
          <div className="filter-card-title">
            <Filter size={18} />
            <span>{activeTab === 'faltas' ? 'Relatório de Gestão de Faltas' : 'Relatório de Frequência vs Matriculados'}</span>
          </div>
          <div className="export-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {activeTab === 'faltas' ? (
              <>
                <button className="export-btn excel-btn" onClick={exportExcel}>📊 Exportar Excel</button>
                <button className="export-btn pdf-btn" onClick={exportPDF}>📄 Exportar PDF</button>
              </>
            ) : (
              <>
                <button
                  className="primary-btn"
                  onClick={() => handleOpenHistoricalModal()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '7px 13px', borderRadius: '8px' }}
                >
                  <Plus size={14} /> Dados Históricos
                </button>
                <button className="export-btn excel-btn" onClick={exportFrequencyExcel}>📊 Exportar Excel</button>
                <button className="export-btn pdf-btn" onClick={exportFrequencyPDF}>📄 Exportar PDF</button>
              </>
            )}
          </div>
        </div>

        <div className="filter-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {activeTab === 'faltas' && (
            <div className="filter-group">
              <label>Tipo de Falta</label>
              <select value={filters.justified} onChange={e => setFilters(f => ({ ...f, justified: e.target.value }))}>
                <option value="all">Todas as faltas</option>
                <option value="sim">Apenas Justificadas</option>
                <option value="nao">Apenas Não Justificadas</option>
              </select>
            </div>
          )}

          {/* Sala */}
          <div className="filter-group">
            <label>Sala / Turma</label>
            <select value={filters.classroom} onChange={e => setFilters(f => ({ ...f, classroom: e.target.value, studentId: '' }))}>
              <option value="">Todas as salas</option>
              {CLASSROOMS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Criança */}
          {activeTab === 'faltas' && (
            <div className="filter-group">
              <label>Criança</label>
              <select value={filters.studentId} onChange={e => setFilters(f => ({ ...f, studentId: e.target.value }))}>
                <option value="">Todas as crianças</option>
                {filteredStudents.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Agrupar por Turma */}
          {activeTab === 'frequencia' && !filters.classroom && (
            <div className="filter-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '40px', marginTop: '16px' }}>
                <input 
                  type="checkbox" 
                  checked={groupByClassroom} 
                  onChange={e => setGroupByClassroom(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Agrupar por Turma</span>
              </label>
            </div>
          )}

          {/* Data inicial */}
          <div className="filter-group">
            <label>Data Inicial</label>
            <input type="date" value={filters.dateStart} onChange={e => setFilters(f => ({ ...f, dateStart: e.target.value }))} />
          </div>

          {/* Data final */}
          <div className="filter-group">
            <label>Data Final</label>
            <input type="date" value={filters.dateEnd} onChange={e => setFilters(f => ({ ...f, dateEnd: e.target.value }))} />
          </div>
        </div>

        <div className="report-quick-presets">
          <span className="presets-title">Períodos Rápidos:</span>
          <button className="preset-btn" onClick={() => setPreset(7)}>Últimos 7 dias</button>
          <button className="preset-btn" onClick={() => setPreset(30)}>Últimos 30 dias</button>
          <button className="preset-btn" onClick={() => setPreset(90)}>Último Trimestre</button>
          <button className="preset-btn" onClick={() => setFilters(f => ({ ...f, dateStart: `${currentYear}-01-01`, dateEnd: `${currentYear}-12-31` }))}>Este Ano</button>
          <button className="preset-btn" style={{ color: 'var(--text-secondary)' }} onClick={() => setFilters({ justified: 'all', classroom: '', studentId: '', dateStart: '', dateEnd: '' })}>Limpar Filtros</button>
        </div>
      </div>

      {/* ── SEÇÃO DE ABAS CONDICIONAIS ───────────────────────────────── */}
      {activeTab === 'faltas' ? (
        <>
          {/* ── BANNER DE ESTATÍSTICAS (FALTAS) ─────────────────────────── */}
          <div className="report-stats-banner" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div className="report-stat-item" style={{ borderLeft: '4px solid #ef4444' }}>
              <span className="report-stat-label">Faltas no Filtro</span>
              <span className="report-stat-val" style={{ color: '#b91c1c' }}>{list.length}</span>
            </div>
            <div className="report-stat-item" style={{ borderLeft: '4px solid #f59e0b' }}>
              <span className="report-stat-label">✅ Justificadas</span>
              <span className="report-stat-val" style={{ color: '#92400e' }}>{justifiedCount}</span>
            </div>
            <div className="report-stat-item" style={{ borderLeft: '4px solid #ef4444' }}>
              <span className="report-stat-label">❌ Não Justificadas</span>
              <span className="report-stat-val" style={{ color: '#991b1b' }}>{unjustifiedCount}</span>
            </div>
            <div className="report-stat-item" style={{ borderLeft: '4px solid #6366f1', backgroundColor: 'rgba(99,102,241,0.05)' }}>
              <span className="report-stat-label">📅 Total Ano {currentYear}</span>
              <span className="report-stat-val" style={{ color: '#4338ca' }}>{annualTotal}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {annualJustified} just. · {annualUnjustified} n/just.
              </span>
            </div>
            <div className="report-stat-item" style={{ borderLeft: '4px solid #10b981' }}>
              <span className="report-stat-label">Crianças Impactadas</span>
              <span className="report-stat-val text-primary">{new Set(list.map(o => o.studentId)).size}</span>
            </div>

            {studentsOverLimit.length > 0 && (
              <div className="report-stat-item" style={{ borderLeft: '4px solid #dc2626', backgroundColor: 'rgba(239,68,68,0.07)', gridColumn: 'span 1' }}>
                <span className="report-stat-label" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertTriangle size={13} /> Limite de {ABSENCE_LIMIT} Faltas/Ano
                </span>
                <span className="report-stat-val" style={{ color: '#991b1b', fontSize: '22px' }}>{studentsOverLimit.length}</span>
                <span style={{ fontSize: '11px', color: '#b91c1c' }}>
                  {studentsOverLimit.map(s => s.name).join(', ').length > 40
                    ? studentsOverLimit.map(s => s.name).join(', ').substring(0, 38) + '...'
                    : studentsOverLimit.map(s => s.name).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* ── TABELA (FALTAS) ─────────────────────────────────────────── */}
          <div className="table-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Criança</th>
                    <th>Sala</th>
                    <th>Tipo de Falta</th>
                    <th>Justificativa / Motivo</th>
                    <th>Responsável</th>
                    <th>Faltas no Ano</th>
                    <th>Comprovante</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                        <Info size={32} style={{ margin: '0 auto 8px', color: 'var(--text-light)' }} />
                        Nenhuma falta encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    list.map(occ => {
                      const annualCount = studentAnnualMap[occ.studentId]?.total ?? 0;
                      const isOver = annualCount >= ABSENCE_LIMIT;
                      return (
                        <tr key={occ.id}>
                          <td><strong>{occ.date.split('-').reverse().join('/')}</strong></td>
                          <td style={{ fontWeight: 600 }}>{occ.studentName}</td>
                          <td>
                            <span className="occ-type-pill saida" style={{ backgroundColor: 'var(--color-saidas-bg)', color: 'var(--color-saidas)' }}>
                              {occ.classroom}
                            </span>
                          </td>
                          <td>
                            {occ.justified === 'sim' ? (
                              <span className="occ-type-pill" style={{ backgroundColor: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }}>
                                ✅ Justificada
                              </span>
                            ) : (
                              <span className="occ-type-pill" style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                                ❌ Não Justificada
                              </span>
                            )}
                          </td>
                          <td style={{ maxWidth: '220px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {occ.motive || <em style={{ color: 'var(--text-light)' }}>Sem justificativa</em>}
                          </td>
                          <td>{occ.guardian || '-'}</td>
                          <td>
                            <span style={{
                              fontWeight: 700,
                              fontSize: '13px',
                              padding: '2px 10px',
                              borderRadius: '20px',
                              backgroundColor: isOver ? '#fef2f2' : (annualCount >= 7 ? '#fffbeb' : '#f0fdf4'),
                              color: isOver ? '#991b1b' : (annualCount >= 7 ? '#92400e' : '#166534'),
                              border: `1px solid ${isOver ? '#fca5a5' : (annualCount >= 7 ? '#fcd34d' : '#bbf7d0')}`
                            }}>
                              {annualCount}/{ABSENCE_LIMIT} {isOver ? '⚠️' : ''}
                            </span>
                          </td>
                          <td>
                            {(occ.signature || occ.filePreview) ? (
                              <button
                                className="status-pill active"
                                style={{ border: 'none', cursor: 'pointer' }}
                                onClick={() => { setActiveReceipt(occ); setIsReceiptModalOpen(true); }}
                              >
                                Ver
                              </button>
                            ) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* ── BANNER DE ESTATÍSTICAS (FREQUÊNCIA) ───────────────────────── */}
          <div className="report-stats-banner" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
            <div className="report-stat-item" style={{ borderLeft: '4px solid var(--color-primary)' }}>
              <span className="report-stat-label">Dias com Chamada</span>
              <span className="report-stat-val" style={{ color: 'var(--color-primary)' }}>{frequencyStats.days}</span>
            </div>
            <div className="report-stat-item" style={{ borderLeft: '4px solid #10b981' }}>
              <span className="report-stat-label">Média de Matriculados</span>
              <span className="report-stat-val text-primary">{frequencyStats.avgEnrolled}</span>
            </div>
            <div className="report-stat-item" style={{ borderLeft: '4px solid #0284c7' }}>
              <span className="report-stat-label">Média de Presentes</span>
              <span className="report-stat-val text-primary">{frequencyStats.avgPresent}</span>
            </div>
            <div className="report-stat-item" style={{ borderLeft: '4px solid #10b981', backgroundColor: 'rgba(16,185,129,0.05)' }}>
              <span className="report-stat-label">Frequência Média</span>
              <span className="report-stat-val" style={{ color: frequencyStats.avgRate >= 90 ? '#047857' : frequencyStats.avgRate >= 75 ? '#d97706' : '#b91c1c' }}>
                {frequencyStats.avgRate}%
              </span>
            </div>
          </div>

          {/* ── TABELA (FREQUÊNCIA) ────────────────────────────────────────── */}
          <div className="table-card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Turma / Sala</th>
                    <th>Alunos Matriculados</th>
                    <th>Alunos Presentes</th>
                    <th>Faltas / Ausentes</th>
                    <th>Frequência (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {frequencyRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                        <Info size={32} style={{ margin: '0 auto 8px', color: 'var(--text-light)' }} />
                        Nenhum registro de frequência encontrado com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    frequencyRows.map((row, idx) => {
                      const statusColor = row.percentage >= 90 ? '#10b981' : row.percentage >= 75 ? '#f59e0b' : '#ef4444';
                      const statusBg = row.percentage >= 90 ? '#ecfdf5' : row.percentage >= 75 ? '#fffbeb' : '#fef2f2';
                      const statusBorder = row.percentage >= 90 ? '#a7f3d0' : row.percentage >= 75 ? '#fcd34d' : '#fca5a5';

                      return (
                        <tr key={idx}>
                          <td><strong>{row.date.split('-').reverse().join('/')}</strong></td>
                          <td>
                            <span className="occ-type-pill saida" style={{ backgroundColor: 'var(--color-saidas-bg)', color: 'var(--color-saidas)' }}>
                              {row.classroom}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{row.enrolled}</td>
                          <td style={{ fontWeight: 600, color: '#047857' }}>{row.present}</td>
                          <td style={{ fontWeight: 600, color: '#991b1b' }}>{row.absences}</td>
                          <td>
                            <span style={{
                              fontWeight: 700,
                              fontSize: '13px',
                              padding: '2px 10px',
                              borderRadius: '20px',
                              backgroundColor: statusBg,
                              color: statusColor,
                              border: `1px solid ${statusBorder}`
                            }}>
                              {row.percentage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── TABELA DE DADOS HISTÓRICOS ─────────────────────────────────── */}
          {(historicalData && historicalData.length > 0) && (
            <div className="table-card" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>📅 Dados Históricos Lançados</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                    {historicalData.length} {historicalData.length === 1 ? 'registro' : 'registros'}
                  </span>
                </div>
                <button
                  className="primary-btn"
                  onClick={() => handleOpenHistoricalModal()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '6px 12px', borderRadius: '8px' }}
                >
                  <Plus size={13} /> Novo
                </button>
              </div>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mês / Ano</th>
                      <th>Total Matriculados</th>
                      <th>Total Presentes</th>
                      <th>Ausências</th>
                      <th>Frequência (%)</th>
                      <th style={{ width: '80px' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicalData.map(item => {
                      const pct = item.enrolled > 0 ? Math.round((item.present / item.enrolled) * 100) : 100;
                      const abs = Math.max(0, item.enrolled - item.present);
                      const statusColor = pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';
                      const statusBg   = pct >= 90 ? '#ecfdf5' : pct >= 75 ? '#fffbeb' : '#fef2f2';
                      const statusBorder = pct >= 90 ? '#a7f3d0' : pct >= 75 ? '#fcd34d' : '#fca5a5';
                      return (
                        <tr key={item.id}>
                          <td><strong>{item.month.split('-').reverse().join('/')}</strong></td>
                          <td style={{ fontWeight: 600 }}>{item.enrolled}</td>
                          <td style={{ fontWeight: 600, color: '#047857' }}>{item.present}</td>
                          <td style={{ fontWeight: 600, color: '#991b1b' }}>{abs}</td>
                          <td>
                            <span style={{ fontWeight: 700, fontSize: '13px', padding: '2px 10px', borderRadius: '20px', backgroundColor: statusBg, color: statusColor, border: `1px solid ${statusBorder}` }}>
                              {pct}%
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleOpenHistoricalModal(item)}
                                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                                title="Editar"
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() => handleDeleteHistorical(item.id, item.month)}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                                title="Excluir"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botão de adicionar quando não há dados históricos */}
          {(!historicalData || historicalData.length === 0) && (
            <div style={{ marginTop: '16px', padding: '24px', border: '1px dashed var(--border-color)', borderRadius: '12px', textAlign: 'center', backgroundColor: 'var(--bg-app)' }}>
              <p style={{ margin: '0 0 12px', color: 'var(--text-secondary)', fontSize: '13px' }}>Nenhum dado histórico cadastrado. Adicione registros de meses anteriores ao uso do app.</p>
              <button
                className="primary-btn"
                onClick={() => handleOpenHistoricalModal()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px', borderRadius: '8px' }}
              >
                <Plus size={14} /> Adicionar Dados Históricos
              </button>
            </div>
          )}
        </>
      )}

      {/* ── MODAL DE DADOS HISTÓRICOS ────────────────────────────────── */}
      {isHistoricalModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h2>{historicalForm.id ? 'Editar Dados Históricos' : 'Adicionar Dados Históricos'}</h2>
              <button className="modal-close-btn" onClick={() => setIsHistoricalModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveHistorical}>
              <div className="form-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', background: 'var(--bg-input)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  📌 Insira a quantidade de alunos matriculados e presentes de <strong>meses anteriores</strong> aos registros no app.
                </p>
                <div className="form-group">
                  <label>Mês / Ano*</label>
                  <input
                    type="month"
                    required
                    disabled={!!historicalForm.id}
                    value={historicalForm.month}
                    onChange={e => setHistoricalForm({ ...historicalForm, month: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: historicalForm.id ? 'var(--bg-input)' : 'inherit', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="form-group">
                  <label>Total de Alunos Matriculados*</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Ex: 50"
                    value={historicalForm.enrolled}
                    onChange={e => setHistoricalForm({ ...historicalForm, enrolled: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div className="form-group">
                  <label>Total de Alunos Presentes*</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="Ex: 45"
                    value={historicalForm.present}
                    onChange={e => setHistoricalForm({ ...historicalForm, present: e.target.value })}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="secondary-btn" onClick={() => setIsHistoricalModalOpen(false)} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px' }}>Cancelar</button>
                <button type="submit" className="primary-btn" disabled={historicalSaving} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px' }}>
                  {historicalSaving ? 'Salvando...' : 'Salvar Dados'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL COMPROVANTE ────────────────────────────────────────── */}
      {isReceiptModalOpen && activeReceipt && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Visualizar Comprovante Escolar</h2>
              <button className="modal-close-btn" onClick={() => setIsReceiptModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', backgroundColor: 'var(--bg-app)' }}>
                <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <h3>🧸 EducaGestão Creche</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Comprovante de Registro de Falta</span>
                </div>
                <p style={{ margin: '6px 0' }}><strong>Tipo:</strong> {activeReceipt.justified === 'sim' ? '✅ Falta Justificada' : '❌ Falta Não Justificada'}</p>
                <p style={{ margin: '6px 0' }}><strong>Criança:</strong> {activeReceipt.studentName}</p>
                <p style={{ margin: '6px 0' }}><strong>Sala:</strong> {activeReceipt.classroom}</p>
                <p style={{ margin: '6px 0' }}><strong>Data:</strong> {activeReceipt.date?.split('-').reverse().join('/')}</p>
                {activeReceipt.motive && (
                  <p style={{ margin: '6px 0' }}><strong>Justificativa:</strong> {activeReceipt.motive}</p>
                )}
                {(activeReceipt.signature || activeReceipt.filePreview) && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', textAlign: 'center' }}>
                     <img
                      src={activeReceipt.signature || activeReceipt.filePreview}
                      alt="Comprovante"
                      style={{ maxWidth: '100%', maxHeight: '120px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', backgroundColor: 'white' }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="secondary-btn" onClick={() => setIsReceiptModalOpen(false)}>Fechar</button>
              <button type="button" className="primary-btn" onClick={() => window.print()}>
                <Printer size={16} /> Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
