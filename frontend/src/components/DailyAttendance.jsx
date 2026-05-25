import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  Search, 
  Calendar, 
  Download, 
  Check, 
  X, 
  AlertCircle, 
  Filter, 
  ChevronRight, 
  FileSpreadsheet, 
  FileText,
  User,
  Users,
  BarChart3,
  BookOpen,
  PieChart,
  UserCheck,
  Percent
} from 'lucide-react';
import { getStudents, getAttendance, saveAttendanceBulk } from '../supabaseClient';

export default function DailyAttendance({ activeUser, initialTab, setActiveModule }) {
  const [classrooms] = useState(['Alegria', 'Carinho', 'União', 'Amizade', 'Felicidade']);
  const [selectedClassroom, setSelectedClassroom] = useState('Alegria');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // { studentId: 'P' | 'F' | 'FJ' }
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Auxiliares visuais para o design de alta fidelidade
  const getInitials = (name) => {
    if (!name) return 'A';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  const getAvatarGradient = (name) => {
    const colors = [
      'linear-gradient(135deg, #6366f1, #a855f7)', // Indigo-Purple
      'linear-gradient(135deg, #3b82f6, #06b6d4)', // Blue-Cyan
      'linear-gradient(135deg, #10b981, #059669)', // Emerald-Green
      'linear-gradient(135deg, #f43f5e, #fb7185)', // Rose-LightRose
      'linear-gradient(135deg, #f59e0b, #eab308)', // Amber-Yellow
      'linear-gradient(135deg, #ec4899, #f472b6)', // Pink-LightPink
    ];
    let sum = 0;
    if (name) {
      for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    }
    return colors[sum % colors.length];
  };

  const getClassroomStyles = (room) => {
    const styles = {
      Alegria: { bg: '#ede9fe', color: '#7c3aed' },   // Violet
      Carinho: { bg: '#fce7f3', color: '#db2777' }, // Pink
      União: { bg: '#e0e7ff', color: '#4338ca' }, // Indigo
      Amizade: { bg: '#ccfbf1', color: '#0d9488' }, // Teal
      Felicidade: { bg: '#fef3c7', color: '#d97706' } // Amber
    };
    return styles[room] || { bg: '#f1f5f9', color: '#475569' };
  };

  const renderStatusBadge = (status) => {
    const configs = {
      P: {
        bg: '#ecfdf5',
        color: '#047857',
        text: 'Presente',
        iconColor: '#10b981',
        dot: true
      },
      F: {
        bg: '#fef2f2',
        color: '#b91c1c',
        text: 'Falta',
        iconColor: '#ef4444',
        dot: true
      },
      FJ: {
        bg: '#fffbeb',
        color: '#b45309',
        text: 'Justificada',
        iconColor: '#f59e0b',
        dot: true
      }
    };
    const cfg = configs[status] || { bg: '#f1f5f9', color: '#475569', text: status };
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 12px',
        borderRadius: '20px',
        fontSize: '11.5px',
        fontWeight: 700,
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: '1px solid rgba(0,0,0,0.02)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.01)'
      }}>
        {cfg.dot && (
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: cfg.iconColor,
            display: 'inline-block'
          }} />
        )}
        {cfg.text}
      </span>
    );
  };

  // Controle de Sub-Abas do Módulo de Frequência
  // 'lancamento' (Lançar Chamada), 'consulta' (Histórico & Exportação), 'relatorios' (Estatísticas & Situação Aluno)
  const [frequencyTab, setFrequencyTab] = useState(initialTab || 'lancamento');

  // Sincroniza a aba ativa quando a prop initialTab mudar
  useEffect(() => {
    if (initialTab) {
      setFrequencyTab(initialTab);
    }
  }, [initialTab]);

  // Sincroniza a aba ativa de volta para o estado do App
  useEffect(() => {
    if (setActiveModule && frequencyTab) {
      setActiveModule(frequencyTab);
    }
  }, [frequencyTab, setActiveModule]);

  // Estados da área de consulta
  const get30DaysAgoStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  };

  const [consultClassroom, setConsultClassroom] = useState('all');
  const [consultStartDate, setConsultStartDate] = useState(get30DaysAgoStr());
  const [consultEndDate, setConsultEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // Novos controles de Busca, Ordenação e Paginação (UI-UX Pro)
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // 1. Filtragem por busca textual
  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return log.studentName.toLowerCase().includes(term) ||
           log.classroom.toLowerCase().includes(term);
  });

  // 2. Ordenação por diferentes critérios (nome, turma, data)
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.studentName.localeCompare(b.studentName);
      case 'name-desc':
        return b.studentName.localeCompare(a.studentName);
      case 'classroom-asc':
        return a.classroom.localeCompare(b.classroom);
      case 'classroom-desc':
        return b.classroom.localeCompare(a.classroom);
      case 'date-asc':
        return a.date.localeCompare(b.date);
      case 'date-desc':
      default:
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.studentName.localeCompare(b.studentName);
    }
  });

  // Reset da página quando os filtros ou busca mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, consultClassroom, consultStartDate, consultEndDate]);

  // 3. Paginação
  const totalRecords = sortedLogs.length;
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = sortedLogs.slice(indexOfFirstRecord, indexOfLastRecord);

  // Filtros Avançados de Período e Mês
  const [dateFilterType, setDateFilterType] = useState('range'); // 'range' | 'month'
  const [selectedExportMonth, setSelectedExportMonth] = useState(new Date().toISOString().split('-')[1]);
  const [selectedExportYear, setSelectedExportYear] = useState(new Date().toISOString().split('-')[0]);

  const handleMonthChange = (monthVal, yearVal = selectedExportYear) => {
    setSelectedExportMonth(monthVal);
    const start = `${yearVal}-${monthVal}-01`;
    const lastDay = new Date(parseInt(yearVal), parseInt(monthVal), 0).getDate();
    const end = `${yearVal}-${monthVal}-${lastDay < 10 ? '0' + lastDay : lastDay}`;
    setConsultStartDate(start);
    setConsultEndDate(end);
  };

  const handleYearChange = (yearVal, monthVal = selectedExportMonth) => {
    setSelectedExportYear(yearVal);
    const start = `${yearVal}-${monthVal}-01`;
    const lastDay = new Date(parseInt(yearVal), parseInt(monthVal), 0).getDate();
    const end = `${yearVal}-${monthVal}-${lastDay < 10 ? '0' + lastDay : lastDay}`;
    setConsultStartDate(start);
    setConsultEndDate(end);
  };

  const handleDateFilterTypeChange = (type) => {
    setDateFilterType(type);
    if (type === 'month') {
      handleMonthChange(selectedExportMonth, selectedExportYear);
    } else {
      setConsultStartDate(new Date().toISOString().split('T')[0]);
      setConsultEndDate(new Date().toISOString().split('T')[0]);
    }
  };

  // Estados da área de Relatórios Consolidados
  const [allAttendanceData, setAllAttendanceData] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  
  // Relatório Diário
  const [reportDailyDate, setReportDailyDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Relatórios Semanal/Mensal
  const [reportRoom, setReportRoom] = useState('all');
  
  // Situação Individual
  const [studentsDirectory, setStudentsDirectory] = useState([]);
  const [selectedReportStudent, setSelectedReportStudent] = useState(''); // studentId
  const [individualStats, setIndividualStats] = useState(null);

  // Carrega alunos da sala selecionada
  useEffect(() => {
    fetchStudents();
  }, [selectedClassroom]);

  // Carrega histórico geral no início e recarrega de forma reativa quando os filtros mudam
  useEffect(() => {
    fetchLogs();
  }, [consultClassroom, consultStartDate, consultEndDate]);

  useEffect(() => {
    fetchStudentsDirectory();
    fetchAllAttendanceForReports();
  }, []);

  // Quando mudar para a aba de relatórios, recarrega todos os dados
  useEffect(() => {
    if (frequencyTab === 'relatorios') {
      fetchAllAttendanceForReports();
    }
  }, [frequencyTab]);

  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const data = await getStudents();
      const filtered = data.filter(s => (selectedClassroom === 'all' || s.classroom === selectedClassroom) && s.active);
      setStudents(filtered);
      
      const map = {};
      filtered.forEach(s => {
        map[s.id] = 'P';
      });
      
      // Verifica se já existe chamada salva no Supabase
      const attendanceData = await getAttendance({
        classroom: selectedClassroom,
        date: attendanceDate
      });
      
      if (attendanceData && attendanceData.length > 0) {
        attendanceData.forEach(record => {
          if (map[record.studentId] !== undefined) {
            map[record.studentId] = record.status;
          }
        });
      }
      
      setAttendanceMap(map);
    } catch (error) {
      console.error("[DailyAttendance] Erro ao obter alunos/chamadas:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const fetchStudentsDirectory = async () => {
    try {
      const data = await getStudents();
      setStudentsDirectory(data.filter(s => s.active));
    } catch (error) {
      console.error("[DailyAttendance] Erro ao obter diretório de alunos:", error);
    }
  };

  // Carrega todas as chamadas para processar relatórios locais de frequência
  const fetchAllAttendanceForReports = async () => {
    setLoadingReports(true);
    try {
      const data = await getAttendance();
      setAllAttendanceData(data || []);
    } catch (error) {
      console.error("[DailyAttendance] Erro ao obter chamadas para relatórios:", error);
    } finally {
      setLoadingReports(false);
    }
  };

  // Buscar chamada salva quando a data muda
  useEffect(() => {
    if (students.length > 0) {
      checkExistingAttendance();
    }
  }, [attendanceDate, selectedClassroom]);

  const checkExistingAttendance = async () => {
    try {
      const data = await getAttendance({
        classroom: selectedClassroom,
        date: attendanceDate
      });
      
      if (data && data.length > 0) {
        const map = { ...attendanceMap };
        data.forEach(record => {
          map[record.studentId] = record.status;
        });
        setAttendanceMap(map);
        showAlert('info', 'Dados de chamada existentes carregados para edição.');
      } else {
        const map = {};
        students.forEach(s => {
          map[s.id] = 'P';
        });
        setAttendanceMap(map);
      }
    } catch (error) {
      console.error("[DailyAttendance] Erro ao checar chamada existente:", error);
    }
  };

  const showAlert = (type, text) => {
    setAlertMsg({ type, text });
    setTimeout(() => {
      setAlertMsg(null);
    }, 4500);
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSaveAttendance = async () => {
    if (students.length === 0) {
      showAlert('error', 'Sem alunos matriculados nesta sala.');
      return;
    }

    setSaving(true);
    const records = students.map(s => ({
      studentId: s.id,
      studentName: s.name,
      classroom: s.classroom,
      status: attendanceMap[s.id] || 'P'
    }));

    try {
      await saveAttendanceBulk({
        date: attendanceDate,
        classroom: selectedClassroom,
        recordedBy: activeUser.name,
        records
      });

      showAlert('success', 'Chamada salva com sucesso!');
      fetchLogs(); 
      fetchAllAttendanceForReports();
    } catch (error) {
      console.error(error);
      showAlert('error', 'Erro ao salvar chamada no Supabase.');
    } finally {
      setSaving(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await getAttendance({
        classroom: consultClassroom,
        startDate: consultStartDate,
        endDate: consultEndDate
      });
      
      const sorted = data.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.studentName.localeCompare(b.studentName);
      });
      setLogs(sorted);
    } catch (error) {
      console.error("[DailyAttendance] Erro ao buscar logs de presença:", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const formatDateBR = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'P': return 'Presente';
      case 'F': return 'Falta';
      case 'FJ': return 'Falta Justificada';
      default: return status;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'P': return 'badge badge-success';
      case 'F': return 'badge badge-danger';
      case 'FJ': return 'badge badge-warning';
      default: return 'badge';
    }
  };

  // EXPORT EXCEL
  const exportToExcel = () => {
    if (logs.length === 0) {
      showAlert('error', 'Sem registros para exportação.');
      return;
    }
    if (typeof window.XLSX === "undefined") {
      showAlert('error', 'Erro ao carregar o SheetJS.');
      return;
    }

    const mapped = logs.map((log, index) => ({
      'Nº': index + 1,
      'Data': formatDateBR(log.date),
      'Nome do Aluno': log.studentName,
      'Sala/Turma': log.classroom,
      'Frequência': getStatusText(log.status),
      'Quem Registrou': log.recordedBy
    }));

    const worksheet = window.XLSX.utils.json_to_sheet(mapped);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Chamada Diária");
    const fileSuffix = dateFilterType === 'month' ? `Mes_${selectedExportMonth}_${selectedExportYear}` : `${consultStartDate}_a_${consultEndDate}`;
    const filename = `Frequencia_SEAMI_${consultClassroom === 'all' ? 'Todas_Salas' : 'Sala_' + consultClassroom}_${fileSuffix}.xlsx`;
    window.XLSX.writeFile(workbook, filename);
    showAlert('success', 'Planilha Excel exportada!');
  };

  // EXPORT PDF
  const exportToPDF = () => {
    if (logs.length === 0) {
      showAlert('error', 'Sem dados para exportação.');
      return;
    }
    if (typeof window.jspdf === "undefined") {
      showAlert('error', 'jsPDF não disponível.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text("CRECHE ESCOLA SEAMI - PAINEL DE FREQUÊNCIA", 15, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Filtro Período: ${formatDateBR(consultStartDate)} a ${formatDateBR(consultEndDate)} | Sala: ${consultClassroom === 'all' ? 'Todas' : consultClassroom}`, 15, 26);
    
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 30, 195, 30);
    
    let y = 38;
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y - 5, 180, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Data", 17, y);
    doc.text("Aluno", 42, y);
    doc.text("Sala", 118, y);
    doc.text("Status", 145, y);
    doc.text("Registrado por", 170, y);
    
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 41, 59);

    logs.forEach((log) => {
      if (y > 280) {
        doc.addPage();
        y = 25;
        doc.setFillColor(241, 245, 249);
        doc.rect(15, y - 5, 180, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.text("Data", 17, y);
        doc.text("Aluno", 42, y);
        doc.text("Sala", 118, y);
        doc.text("Status", 145, y);
        doc.text("Registrado por", 170, y);
        y += 8;
        doc.setFont("helvetica", "normal");
      }
      
      doc.setDrawColor(248, 250, 252);
      doc.line(15, y + 2, 195, y + 2);
      
      doc.text(formatDateBR(log.date), 17, y);
      const limitName = log.studentName.length > 30 ? log.studentName.substring(0, 28) + "..." : log.studentName;
      doc.text(limitName, 42, y);
      doc.text(log.classroom, 118, y);
      doc.text(getStatusText(log.status), 145, y);
      doc.text(log.recordedBy || 'Professor', 170, y);
      
      y += 7.5;
    });

    const fileSuffix = dateFilterType === 'month' ? `Mes_${selectedExportMonth}_${selectedExportYear}` : `${consultStartDate}_a_${consultEndDate}`;
    const filename = `Chamada_Diaria_SEAMI_${consultClassroom === 'all' ? 'Todas_Salas' : 'Sala_' + consultClassroom}_${fileSuffix}.pdf`;
    doc.save(filename);
    showAlert('success', 'Relatório PDF exportado!');
  };

  // ==========================================
  // PROCESSAMENTO DE RELATÓRIOS CONSOLIDADOS
  // ==========================================

  // 1. Relatório Diário de Frequência
  const getDailyReportData = () => {
    const dailyRecords = allAttendanceData.filter(r => r.date === reportDailyDate);
    const total = dailyRecords.length;
    if (total === 0) return null;

    const present = dailyRecords.filter(r => r.status === 'P').length;
    const lack = dailyRecords.filter(r => r.status === 'F').length;
    const justified = dailyRecords.filter(r => r.status === 'FJ').length;
    const rate = Math.round((present / total) * 100);

    return { total, present, lack, justified, rate };
  };

  // 2. Relatório Semanal
  const getWeeklyReportData = () => {
    // Filtra pela sala
    const filtered = reportRoom === 'all' 
      ? allAttendanceData 
      : allAttendanceData.filter(r => r.classroom === reportRoom);

    // Agrupa por semana do ano (representada simplificadamente por data da semana)
    const weeksGroup = {};
    filtered.forEach(record => {
      const date = new Date(record.date);
      // Pega o domingo correspondente à semana da data
      const Sunday = new Date(date);
      Sunday.setDate(date.getDate() - date.getDay());
      const weekKey = Sunday.toISOString().split('T')[0];

      if (!weeksGroup[weekKey]) {
        weeksGroup[weekKey] = { weekStart: weekKey, total: 0, present: 0 };
      }
      weeksGroup[weekKey].total += 1;
      if (record.status === 'P') {
        weeksGroup[weekKey].present += 1;
      }
    });

    // Converte em array e calcula porcentagens
    return Object.values(weeksGroup).map(w => ({
      week: `Semana de ${formatDateBR(w.weekStart)}`,
      total: w.total,
      present: w.present,
      rate: Math.round((w.present / w.total) * 100)
    })).sort((a, b) => b.week.localeCompare(a.week)).slice(0, 8); // Pega as últimas 8 semanas
  };

  // 3. Relatório Mensal
  const getMonthlyReportData = () => {
    const filtered = reportRoom === 'all'
      ? allAttendanceData
      : allAttendanceData.filter(r => r.classroom === reportRoom);

    const monthsGroup = {};
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    filtered.forEach(record => {
      const [year, month, day] = record.date.split('-');
      const monthKey = `${year}-${month}`;
      const monthName = `${monthNames[parseInt(month) - 1]} / ${year}`;

      if (!monthsGroup[monthKey]) {
        monthsGroup[monthKey] = { label: monthName, key: monthKey, total: 0, present: 0 };
      }
      monthsGroup[monthKey].total += 1;
      if (record.status === 'P') {
        monthsGroup[monthKey].present += 1;
      }
    });

    return Object.values(monthsGroup).map(m => ({
      month: m.label,
      total: m.total,
      present: m.present,
      rate: Math.round((m.present / m.total) * 100)
    })).sort((a, b) => b.month.localeCompare(a.month));
  };

  // 4. Situação Individual do Aluno
  const handleCalculateIndividualStats = (studentId) => {
    setSelectedReportStudent(studentId);
    if (!studentId) {
      setIndividualStats(null);
      return;
    }

    const studentRecords = allAttendanceData.filter(r => r.studentId === studentId);
    const total = studentRecords.length;
    if (total === 0) {
      setIndividualStats({ total: 0, present: 0, lack: 0, justified: 0, rate: 0, missedDates: [] });
      return;
    }

    const present = studentRecords.filter(r => r.status === 'P').length;
    const lack = studentRecords.filter(r => r.status === 'F').length;
    const justified = studentRecords.filter(r => r.status === 'FJ').length;
    const rate = Math.round((present / total) * 100);

    // Listagem das datas que faltou
    const missedDates = studentRecords
      .filter(r => r.status === 'F' || r.status === 'FJ')
      .map(r => ({ date: r.date, status: r.status }))
      .sort((a, b) => b.date.localeCompare(a.date));

    setIndividualStats({ total, present, lack, justified, rate, missedDates });
  };

  const dailyStats = getDailyReportData();
  const weeklyStatsList = getWeeklyReportData();
  const monthlyStatsList = getMonthlyReportData();

  return (
    <div className="tab-fade-in">
      
      {/* Header do Módulo */}
      <div className="panel-header-desc" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '24px', color: 'var(--slate-800)' }}>
            Controle de Frequência
          </h2>
          <p style={{ color: 'var(--slate-500)', fontSize: '14px', marginTop: '4px' }}>
            Aba exclusiva para o controle e relatórios consolidados de presenças e faltas dos alunos.
          </p>
        </div>
      </div>

      {alertMsg && (
        <div className={`alert-box alert-${alertMsg.type}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: alertMsg.type === 'success' ? '#ecfdf5' : '#eff6ff',
          color: alertMsg.type === 'success' ? '#065f46' : '#1e40af',
          border: `1px solid ${alertMsg.type === 'success' ? '#a7f3d0' : '#bfdbfe'}`
        }}>
          {alertMsg.type === 'error' ? <AlertCircle size={18} /> : <Check size={18} />}
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{alertMsg.text}</span>
        </div>
      )}

      {/* SUB-MENU DO MÓDULO DE FREQUÊNCIA */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        borderBottom: '1px solid var(--slate-100)',
        paddingBottom: '10px'
      }}>
        <button
          onClick={() => setFrequencyTab('lancamento')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: frequencyTab === 'lancamento' ? 'var(--brand-primary)' : '#f1f5f9',
            color: frequencyTab === 'lancamento' ? 'white' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s'
          }}
        >
          <ClipboardCheck size={16} />
          Lançar Chamada Diária
        </button>

        <button
          onClick={() => setFrequencyTab('consulta')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: frequencyTab === 'consulta' ? 'var(--brand-primary)' : '#f1f5f9',
            color: frequencyTab === 'consulta' ? 'white' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s'
          }}
        >
          <Search size={16} />
          Histórico & Exportação
        </button>

        <button
          onClick={() => setFrequencyTab('relatorios')}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            backgroundColor: frequencyTab === 'relatorios' ? 'var(--brand-primary)' : '#f1f5f9',
            color: frequencyTab === 'relatorios' ? 'white' : '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s'
          }}
        >
          <BarChart3 size={16} />
          Relatórios & Situação do Aluno
        </button>
      </div>

      {/* ==========================================
          TELA: LANÇAR CHAMADA
          ========================================== */}
      {frequencyTab === 'lancamento' && (
        <>
          <div className="filter-card" style={{ marginBottom: '24px' }}>
            <div className="filter-card-header">
              <div className="filter-card-title">
                <ClipboardCheck size={18} style={{ color: 'var(--brand-primary)' }} />
                <span>Registrar Chamada</span>
              </div>
            </div>
            
            <div className="responsive-grid-3" style={{ padding: '20px' }}>
              <div className="filter-group">
                <label>Turma / Sala</label>
                <select 
                  value={selectedClassroom} 
                  onChange={(e) => setSelectedClassroom(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                >
                  <option value="all">Todas as Salas</option>
                  {classrooms.map(room => (
                    <option key={room} value={room}>Sala {room}</option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Data da Chamada</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="date" 
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                  />
                  <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button 
                  onClick={handleSaveAttendance}
                  disabled={saving || loadingStudents || students.length === 0}
                  className="primary-btn"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--brand-primary)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                    opacity: (saving || loadingStudents || students.length === 0) ? 0.7 : 1
                  }}
                >
                  <Check size={18} />
                  {saving ? 'Gravando...' : 'Salvar Chamada'}
                </button>
              </div>
            </div>
          </div>

          {/* Lista para chamada */}
          <div className="table-card">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--slate-800)' }}>
                Alunos da Turma ({students.length})
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>
                Autor do registro: <strong>{activeUser.name}</strong>
              </span>
            </div>

            {loadingStudents ? (
              <div style={{ padding: '40px', textAlignment: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div className="spinner" style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid var(--slate-200)', borderTopColor: 'var(--brand-primary)', animation: 'spin 1s linear infinite' }}></div>
                <span style={{ color: 'var(--slate-500)', fontSize: '13px' }}>Carregando chamada da sala...</span>
              </div>
            ) : students.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--slate-400)', fontSize: '13px' }}>
                Sem alunos matriculados ativos nesta sala.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="occurrences-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>Nome do Aluno</th>
                      <th style={{ width: '15%' }}>Sala</th>
                      <th style={{ width: '40%', textAlign: 'center' }}>Chamada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--brand-light)',
                              color: 'var(--brand-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '12px'
                            }}>
                              {student.name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{student.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="room-badge" style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, backgroundColor: '#e0e7ff', color: '#4338ca' }}>
                            Sala {student.classroom}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'P')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: '1px solid #10b981',
                                backgroundColor: attendanceMap[student.id] === 'P' ? '#10b981' : 'transparent',
                                color: attendanceMap[student.id] === 'P' ? 'white' : '#10b981',
                                transition: 'all 0.1s'
                              }}
                            >
                              Presente
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'F')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: '1px solid #ef4444',
                                backgroundColor: attendanceMap[student.id] === 'F' ? '#ef4444' : 'transparent',
                                color: attendanceMap[student.id] === 'F' ? 'white' : '#ef4444',
                                transition: 'all 0.1s'
                              }}
                            >
                              Falta
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.id, 'FJ')}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: '1px solid #f59e0b',
                                backgroundColor: attendanceMap[student.id] === 'FJ' ? '#f59e0b' : 'transparent',
                                color: attendanceMap[student.id] === 'FJ' ? 'white' : '#f59e0b',
                                transition: 'all 0.1s'
                              }}
                            >
                              Justificada
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ==========================================
          TELA: CONSULTA HISTÓRICA & EXPORTAÇÃO
          ========================================== */}
      {frequencyTab === 'consulta' && (
        <>
          <div className="filter-card" style={{ marginBottom: '24px' }}>
            <div className="filter-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="filter-card-title">
                <Search size={16} style={{ color: 'var(--brand-primary)' }} />
                <span>Consultar & Exportar Presenças</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={exportToExcel} disabled={logs.length === 0} className="primary-btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileSpreadsheet size={14} /> Excel
                </button>
                <button onClick={exportToPDF} disabled={logs.length === 0} className="primary-btn" style={{ padding: '6px 12px', fontSize: '12px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={14} /> PDF
                </button>
              </div>
            </div>

            <div className="responsive-grid-4" style={{ padding: '16px', gap: '16px' }}>
              <div className="filter-group">
                <label>Filtrar por Sala</label>
                <select value={consultClassroom} onChange={(e) => setConsultClassroom(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--slate-200)' }}>
                  <option value="all">Todas as salas juntas</option>
                  {classrooms.map(room => (
                    <option key={room} value={room}>Sala {room}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Tipo de Filtro</label>
                <select value={dateFilterType} onChange={(e) => handleDateFilterTypeChange(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--slate-200)' }}>
                  <option value="range">Intervalo Customizado (De/Para)</option>
                  <option value="month">Mês de Referência</option>
                </select>
              </div>

              {dateFilterType === 'month' ? (
                <>
                  <div className="filter-group">
                    <label>Mês</label>
                    <select value={selectedExportMonth} onChange={(e) => handleMonthChange(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--slate-200)' }}>
                      <option value="01">Janeiro</option>
                      <option value="02">Fevereiro</option>
                      <option value="03">Março</option>
                      <option value="04">Abril</option>
                      <option value="05">Maio</option>
                      <option value="06">Junho</option>
                      <option value="07">Julho</option>
                      <option value="08">Agosto</option>
                      <option value="09">Setembro</option>
                      <option value="10">Outubro</option>
                      <option value="11">Novembro</option>
                      <option value="12">Dezembro</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label>Ano</label>
                    <select value={selectedExportYear} onChange={(e) => handleYearChange(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--slate-200)' }}>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div className="filter-group">
                    <label>Data Inicial</label>
                    <input type="date" value={consultStartDate} onChange={(e) => setConsultStartDate(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--slate-200)' }} />
                  </div>
                  <div className="filter-group">
                    <label>Data Final</label>
                    <input type="date" value={consultEndDate} onChange={(e) => setConsultEndDate(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--slate-200)' }} />
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '0 16px 16px 16px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--slate-50)', paddingTop: '12px' }}>
              <button onClick={fetchLogs} disabled={loadingLogs} className="primary-btn" style={{ padding: '10px 24px', borderRadius: '6px', backgroundColor: 'var(--brand-primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={16} />
                {loadingLogs ? 'Buscando...' : 'Consultar e Filtrar Frequência'}
              </button>
            </div>
          </div>

          <div className="table-card" style={{ border: '1px solid var(--slate-100)', borderRadius: '12px', boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.02)', overflow: 'hidden' }}>
            {/* Barra de Ferramentas: Busca, Ordenação e Paginação */}
            {logs.length > 0 && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '16px 20px',
                borderBottom: '1px solid var(--slate-100)',
                backgroundColor: '#fafbfc',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                {/* Barra de busca por texto */}
                <div style={{ position: 'relative', flex: '1 1 250px', minWidth: '200px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                  <input
                    type="text"
                    placeholder="Pesquisar por nome do aluno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-control"
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      borderRadius: '8px',
                      border: '1px solid var(--slate-200)',
                      fontSize: '13px',
                      backgroundColor: 'white'
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--slate-400)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: 0
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Controles de ordenação e quantidade por página */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--slate-500)', fontWeight: 600 }}>Ordenar por:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--slate-200)',
                        fontSize: '12.5px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      <option value="date-desc">📅 Mais Recentes Primeiro</option>
                      <option value="date-asc">📅 Mais Antigos Primeiro</option>
                      <option value="name-asc">🔤 Aluno (A-Z)</option>
                      <option value="name-desc">🔤 Aluno (Z-A)</option>
                      <option value="classroom-asc">🏫 Turma (A-Z)</option>
                      <option value="classroom-desc">🏫 Turma (Z-A)</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--slate-500)', fontWeight: 600 }}>Exibir:</span>
                    <select
                      value={recordsPerPage}
                      onChange={(e) => setRecordsPerPage(parseInt(e.target.value))}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--slate-200)',
                        fontSize: '12.5px',
                        backgroundColor: 'white',
                        cursor: 'pointer',
                        fontWeight: 500
                      }}
                    >
                      <option value={10}>10 por página</option>
                      <option value={25}>25 por página</option>
                      <option value={50}>50 por página</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {loadingLogs ? (
              <div style={{ padding: '64px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
                <div className="spinner" style={{ 
                  width: '32px', 
                  height: '32px', 
                  borderRadius: '50%', 
                  border: '3px solid var(--slate-200)', 
                  borderTopColor: 'var(--brand-primary)', 
                  animation: 'spin 1s linear infinite' 
                }}></div>
                <span style={{ color: 'var(--slate-500)', fontSize: '13px', fontWeight: 600 }}>
                  Buscando registros históricos no SQLite...
                </span>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ 
                padding: '64px 32px', 
                textAlign: 'center', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: 'var(--bg-card)',
                borderRadius: '12px'
              }}>
                <div style={{ 
                  backgroundColor: '#f8fafc', 
                  color: 'var(--slate-400)', 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  border: '1px solid var(--slate-50)'
                }}>
                  <Search size={26} style={{ color: 'var(--slate-400)' }} />
                </div>
                <h4 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '6px' }}>
                  Nenhum registro encontrado
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--slate-400)', maxWidth: '320px', lineHeight: 1.5, margin: 0 }}>
                  Ajuste os filtros de período, tipo ou sala de aula e clique em "Consultar" para buscar no histórico.
                </p>
              </div>
            ) : totalRecords === 0 ? (
              <div style={{ 
                padding: '64px 32px', 
                textAlign: 'center', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: 'var(--bg-card)',
                borderRadius: '12px'
              }}>
                <div style={{ 
                  backgroundColor: '#fef3c7', 
                  color: '#d97706', 
                  width: '64px', 
                  height: '64px', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  marginBottom: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  border: '1px solid #fde68a'
                }}>
                  <AlertCircle size={26} />
                </div>
                <h4 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '6px' }}>
                  Nenhum resultado para "{searchTerm}"
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--slate-400)', maxWidth: '320px', lineHeight: 1.5, marginBottom: '16px' }}>
                  Não encontramos nenhum aluno chamado "{searchTerm}" nos registros deste período. Tente outro nome ou limpe a busca.
                </p>
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="secondary-btn" 
                  style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, border: '1px solid var(--slate-200)' }}
                >
                  Limpar Pesquisa
                </button>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '150px' }}>Data</th>
                        <th>Nome do Aluno</th>
                        <th style={{ width: '180px' }}>Sala / Turma</th>
                        <th style={{ width: '180px' }}>Status Frequência</th>
                        <th>Registrado por</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRecords.map((log) => {
                        const { bg, color } = getClassroomStyles(log.classroom);
                        return (
                          <tr key={log.id} style={{ transition: 'all 0.15s' }}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--slate-600)' }}>
                                <Calendar size={14} style={{ color: 'var(--slate-400)' }} />
                                <span>{formatDateBR(log.date)}</span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  background: getAvatarGradient(log.studentName),
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  fontFamily: 'Outfit, sans-serif',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}>
                                  {getInitials(log.studentName)}
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '13.5px' }}>
                                  {log.studentName}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="room-badge" style={{ 
                                padding: '4px 10px', 
                                borderRadius: '12px', 
                                fontSize: '11px', 
                                fontWeight: 700, 
                                backgroundColor: bg, 
                                color: color, 
                                boxShadow: '0 1px 2px rgba(0,0,0,0.02)' 
                              }}>
                                Sala {log.classroom}
                              </span>
                            </td>
                            <td>
                              {renderStatusBadge(log.status)}
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '14px' }}>
                                  {log.recordedBy?.includes('Diretora') ? '👩‍💼' : log.recordedBy?.includes('Pedagoga') ? '👩‍🏫' : '👩'}
                                </span>
                                <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--slate-600)' }}>
                                  {log.recordedBy || 'Professor'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Paginação inferior */}
                {totalPages > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    backgroundColor: '#fafbfc',
                    borderTop: '1px solid var(--slate-100)',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--slate-500)', fontWeight: 500 }}>
                      Exibindo <strong>{indexOfFirstRecord + 1}</strong> a <strong>{Math.min(indexOfLastRecord, totalRecords)}</strong> de <strong>{totalRecords}</strong> registros
                    </span>
                    
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--slate-200)',
                          backgroundColor: 'white',
                          color: 'var(--slate-600)',
                          fontSize: '12px',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          opacity: currentPage === 1 ? 0.5 : 1,
                          fontWeight: 600
                        }}
                      >
                        ⏮️
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--slate-200)',
                          backgroundColor: 'white',
                          color: 'var(--slate-600)',
                          fontSize: '12px',
                          cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                          opacity: currentPage === 1 ? 0.5 : 1,
                          fontWeight: 600
                        }}
                      >
                        Anterior
                      </button>
                      
                      {/* Números de páginas intermediárias */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                        // Calcula páginas a exibir em torno da atual
                        let pageNum = currentPage;
                        if (currentPage <= 3) {
                          pageNum = idx + 1;
                        } else if (currentPage > totalPages - 2) {
                          pageNum = totalPages - 4 + idx;
                        } else {
                          pageNum = currentPage - 2 + idx;
                        }
                        
                        // Garante que a página calculada seja válida
                        if (pageNum < 1 || pageNum > totalPages) return null;

                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: pageNum === currentPage ? 'none' : '1px solid var(--slate-200)',
                              backgroundColor: pageNum === currentPage ? 'var(--brand-primary)' : 'white',
                              color: pageNum === currentPage ? 'white' : 'var(--slate-600)',
                              fontSize: '12px',
                              cursor: 'pointer',
                              fontWeight: 700,
                              transition: 'all 0.15s'
                            }}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--slate-200)',
                          backgroundColor: 'white',
                          color: 'var(--slate-600)',
                          fontSize: '12px',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          opacity: currentPage === totalPages ? 0.5 : 1,
                          fontWeight: 600
                        }}
                      >
                        Próximo
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--slate-200)',
                          backgroundColor: 'white',
                          color: 'var(--slate-600)',
                          fontSize: '12px',
                          cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                          opacity: currentPage === totalPages ? 0.5 : 1,
                          fontWeight: 600
                        }}
                      >
                        ⏭️
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ==========================================
          TELA: RELATÓRIOS CONSOLIDADOS (EXCLUSIVO)
          ========================================== */}
      {frequencyTab === 'relatorios' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 1. RELATÓRIO DIÁRIO */}
          <div className="filter-card">
            <div className="filter-card-header" style={{ borderBottom: '1px solid var(--slate-100)', padding: '12px 20px' }}>
              <div className="filter-card-title">
                <Calendar size={16} style={{ color: 'var(--brand-primary)' }} />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>Frequência Diária Geral</span>
              </div>
            </div>
            
            <div style={{ padding: '20px' }}>
              <div className="responsive-grid-2" style={{ alignItems: 'center', marginBottom: '20px' }}>
                <div className="filter-group">
                  <label>Selecione a Data para Estatísticas</label>
                  <input type="date" value={reportDailyDate} onChange={(e) => setReportDailyDate(e.target.value)} className="form-control" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)' }} />
                </div>
                
                {dailyStats ? (
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ padding: '12px 20px', borderRadius: '10px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', flex: 1, minWidth: '130px', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#047857', textTransform: 'uppercase' }}>Taxa Presença</span>
                      <strong style={{ fontSize: '24px', color: '#065f46', fontFamily: 'Outfit, sans-serif' }}>{dailyStats.rate}%</strong>
                    </div>
                    <div style={{ padding: '12px 20px', borderRadius: '10px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', flex: 1, minWidth: '100px', textAlign: 'center' }}>
                      <span style={{ display: 'block', fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Total Chamadas</span>
                      <strong style={{ fontSize: '24px', color: '#1e293b', fontFamily: 'Outfit, sans-serif' }}>{dailyStats.total}</strong>
                    </div>
                  </div>
                ) : null}
              </div>

              {dailyStats ? (
                <div className="responsive-grid-3" style={{ gap: '12px' }}>
                  <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#065f46' }}>Presentes (P)</span>
                    <strong style={{ fontSize: '18px', color: '#047857' }}>{dailyStats.present}</strong>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b' }}>Faltas (F)</span>
                    <strong style={{ fontSize: '18px', color: '#ef4444' }}>{dailyStats.lack}</strong>
                  </div>
                  <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fcd34d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400e' }}>Justificadas (FJ)</span>
                    <strong style={{ fontSize: '18px', color: '#f59e0b' }}>{dailyStats.justified}</strong>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--slate-400)', fontSize: '13px', border: '1px dashed var(--slate-200)', borderRadius: '8px' }}>
                  Nenhuma chamada realizada na data selecionada.
                </div>
              )}
            </div>
          </div>

          {/* 2. FREQUÊNCIA SEMANAL E MENSAL */}
          <div className="responsive-grid-2">
            
            {/* Relatório Semanal */}
            <div className="table-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--slate-100)', paddingBottom: '10px' }}>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PieChart size={16} style={{ color: 'var(--brand-primary)' }} />
                  Frequência Semanal
                </h3>
                <select value={reportRoom} onChange={(e) => setReportRoom(e.target.value)} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', border: '1px solid var(--slate-200)' }}>
                  <option value="all">Todas as salas</option>
                  {classrooms.map(room => (
                    <option key={room} value={room}>Sala {room}</option>
                  ))}
                </select>
              </div>

              {weeklyStatsList.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--slate-400)', fontSize: '12px' }}>
                  Sem chamadas registradas.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="occurrences-table">
                    <thead>
                      <tr>
                        <th>Período Semanal</th>
                        <th style={{ textAlign: 'center' }}>Presenças</th>
                        <th style={{ textAlign: 'center' }}>Frequência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyStatsList.map((w, index) => (
                        <tr key={index}>
                          <td style={{ fontWeight: 600, fontSize: '12px' }}>{w.week}</td>
                          <td style={{ textAlign: 'center', fontSize: '12px' }}>{w.present} de {w.total}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${w.rate >= 90 ? 'badge-success' : w.rate >= 75 ? 'badge-warning' : 'badge-danger'}`} style={{ fontWeight: 700 }}>
                              {w.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Relatório Mensal */}
            <div className="table-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--slate-100)', paddingBottom: '10px' }}>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <BarChart3 size={16} style={{ color: 'var(--brand-primary)' }} />
                  Frequência Mensal
                </h3>
              </div>

              {monthlyStatsList.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--slate-400)', fontSize: '12px' }}>
                  Sem chamadas registradas.
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="occurrences-table">
                    <thead>
                      <tr>
                        <th>Mês / Período</th>
                        <th style={{ textAlign: 'center' }}>Presenças</th>
                        <th style={{ textAlign: 'center' }}>Frequência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyStatsList.map((m, index) => (
                        <tr key={index}>
                          <td style={{ fontWeight: 600, fontSize: '12px' }}>{m.month}</td>
                          <td style={{ textAlign: 'center', fontSize: '12px' }}>{m.present} de {m.total}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${m.rate >= 90 ? 'badge-success' : m.rate >= 75 ? 'badge-warning' : 'badge-danger'}`} style={{ fontWeight: 700 }}>
                              {m.rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* 3. SITUAÇÃO INDIVIDUAL DO ALUNO */}
          <div className="table-card" style={{ padding: '24px' }}>
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '16px', fontWeight: 600, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--slate-100)', paddingBottom: '12px', marginBottom: '20px' }}>
              <UserCheck size={18} style={{ color: 'var(--brand-primary)' }} />
              Situação Frequência Individual do Aluno
            </h3>
            
            <div className="responsive-grid-2" style={{ alignItems: 'flex-start', gap: '24px' }}>
              
              {/* Seletor do Aluno */}
              <div className="filter-group" style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid var(--slate-200)' }}>
                <label style={{ fontWeight: 600, color: 'var(--slate-700)', display: 'block', marginBottom: '8px' }}>Selecione o Aluno para análise individual:</label>
                <select
                  value={selectedReportStudent}
                  onChange={(e) => handleCalculateIndividualStats(e.target.value)}
                  className="form-control"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                >
                  <option value="">-- Selecione o Aluno --</option>
                  {studentsDirectory.map(student => (
                    <option key={student.id} value={student.id}>{student.name} (Sala {student.classroom})</option>
                  ))}
                </select>
                <span style={{ fontSize: '11px', color: 'var(--slate-400)', display: 'block', marginTop: '6px' }}>
                  Calcula em tempo real a taxa de assiduidade do aluno com base no SQLite.
                </span>
              </div>

              {/* Informações consolidadas do Aluno */}
              {individualStats ? (
                <div style={{ flex: 1 }}>
                  {individualStats.total === 0 ? (
                    <div style={{ padding: '20px', color: 'var(--slate-400)', fontSize: '13px', textAlign: 'center', border: '1px dashed var(--slate-200)', borderRadius: '8px' }}>
                      Nenhum registro de chamada encontrado para este aluno na base.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      
                      {/* Badge Principal */}
                      <div style={{
                        padding: '16px',
                        borderRadius: '12px',
                        backgroundColor: individualStats.rate >= 90 ? '#ecfdf5' : individualStats.rate >= 75 ? '#fffbeb' : '#fef2f2',
                        border: `1px solid ${individualStats.rate >= 90 ? '#a7f3d0' : individualStats.rate >= 75 ? '#fcd34d' : '#fca5a5'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-400)', textTransform: 'uppercase' }}>Frequência Global</span>
                          <h4 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '26px', fontWeight: 800, color: individualStats.rate >= 90 ? '#065f46' : individualStats.rate >= 75 ? '#92400e' : '#991b1b', marginTop: '4px' }}>
                            {individualStats.rate}%
                          </h4>
                        </div>
                        <span className={`badge ${individualStats.rate >= 90 ? 'badge-success' : individualStats.rate >= 75 ? 'badge-warning' : 'badge-danger'}`} style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                          {individualStats.rate >= 90 ? 'Excelente Assiduidade' : individualStats.rate >= 75 ? 'Atenção Necessária' : 'Situação Crítica'}
                        </span>
                      </div>

                      {/* Métricas simples */}
                      <div className="responsive-grid-3" style={{ gap: '10px' }}>
                        <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)', textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '10px', color: 'var(--slate-400)', fontWeight: 600 }}>DIAS AVALIADOS</span>
                          <strong style={{ fontSize: '16px', color: 'var(--slate-800)' }}>{individualStats.total}</strong>
                        </div>
                        <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)', textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '10px', color: '#10b981', fontWeight: 600 }}>PRESENÇAS (P)</span>
                          <strong style={{ fontSize: '16px', color: '#047857' }}>{individualStats.present}</strong>
                        </div>
                        <div style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)', textAlign: 'center' }}>
                          <span style={{ display: 'block', fontSize: '10px', color: '#ef4444', fontWeight: 600 }}>FALTAS (F/FJ)</span>
                          <strong style={{ fontSize: '16px', color: '#b91c1c' }}>{individualStats.lack + individualStats.justified}</strong>
                        </div>
                      </div>

                      {/* Tabela de Datas Ausente */}
                      {individualStats.missedDates.length > 0 && (
                        <div>
                          <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '8px' }}>
                            Detalhamento de Faltas Registradas ({individualStats.missedDates.length}):
                          </span>
                          <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--slate-100)', borderRadius: '8px' }}>
                            <table className="occurrences-table" style={{ margin: 0 }}>
                              <tbody>
                                {individualStats.missedDates.map((item, index) => (
                                  <tr key={index}>
                                    <td style={{ fontSize: '12px', fontWeight: 600 }}>{formatDateBR(item.date)}</td>
                                    <td style={{ textAlign: 'right' }}>
                                      <span className={item.status === 'FJ' ? 'badge badge-warning' : 'badge badge-danger'} style={{ fontSize: '10px' }}>
                                        {item.status === 'FJ' ? 'Falta Justificada' : 'Falta Sem Justificativa'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              ) : (
                <div style={{ flex: 1, padding: '30px', textAlign: 'center', border: '1px dashed var(--slate-200)', borderRadius: '8px', color: 'var(--slate-400)', fontSize: '13px' }}>
                  Escolha um aluno na lista ao lado para ver o balanço estatístico.
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* Spinner local styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />

    </div>
  );
}
