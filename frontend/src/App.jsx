import React, { useState, useEffect } from 'react';
import { 
  Baby, 
  Clock, 
  LogOut, 
  Activity, 
  CalendarX, 
  Heart, 
  Plus, 
  SlidersHorizontal, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  ChevronDown, 
  X, 
  AlertTriangle,
  HeartHandshake,
  GraduationCap,
  Sparkles,
  Info,
  TrendingUp,
  Trash2,
  Undo,
  Percent,
  CheckSquare,
  BookOpen,
  ClipboardCheck,
  LayoutDashboard
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardCharts from './components/DashboardCharts';
import SignaturePad from './components/SignaturePad';
import DailyAttendance from './components/DailyAttendance';
import SeamiControl from './components/SeamiControl';

const API_BASE_URL = 'http://localhost:5000/api';

export default function App() {
  // Estados de Roteamento e Menu
  const [activeTab, setActiveTab] = useState('home');
  const [activeModule, setActiveModule] = useState(null); // 'atrasos', 'saidas', 'atestados', 'faltas', 'amamentacao'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Estados de Dados da API
  const [students, setStudents] = useState([]);
  const [occurrences, setOccurrences] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [activeUser, setActiveUser] = useState({ role: 'diretora', name: 'Diretora Ana Clara', avatar: '👩‍💼' });
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Modals
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [currentEditStudent, setCurrentEditStudent] = useState(null); // null para cadastro, objeto do aluno para edição
  
  const [isOccurrenceModalOpen, setIsOccurrenceModalOpen] = useState(false);
  const [selectedStudentForOcc, setSelectedStudentForOcc] = useState(null);
  const [occType, setOccType] = useState('atraso');
  
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Estados de Filtros de Painel
  const [dashFilters, setDashFilters] = useState({ dateStart: '', dateEnd: '', classroom: '', studentId: '' });
  const [occFilters, setOccFilters] = useState({ classroom: '', date: '', search: '' });
  const [reportFilters, setReportFilters] = useState({ type: 'all', classroom: '', dateStart: '', dateEnd: '' });

  // Estados dos Formulários de Ocorrências
  const [atrasoForm, setAtrasoForm] = useState({ date: '', time: '', reason: '', customReason: '', guardian: '', staff: 'Auxiliar Jéssica', obs: '', signature: '' });
  const [saidaForm, setSaidaForm] = useState({ date: '', time: '', reason: '', guardian: '', hasReturn: 'nao', returnTime: '', obs: '', signature: '' });
  const [atestadoForm, setAtestadoForm] = useState({ date: '', startDate: '', days: 1, endDate: '', cid: '', reason: '', filePreview: '', obs: '' });
  const [faltaForm, setFaltaForm] = useState({ date: '', reason: '', justified: 'nao', notified: 'nao', obs: '' });
  const [amamentacaoForm, setAmamentacaoForm] = useState({ date: '', timeIn: '', timeOut: '', guardian: '', obs: '' });

  // Estado do formulário de estudantes
  const [studentForm, setStudentForm] = useState({ name: '', classroom: '', active: 'active' });

  // ==========================================================================
  // SYNC COM A API / SQLite
  // ==========================================================================

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [studentsRes, occurrencesRes, settingsRes, attendanceRes] = await Promise.all([
        fetch(`${API_BASE_URL}/students`),
        fetch(`${API_BASE_URL}/occurrences`),
        fetch(`${API_BASE_URL}/settings`),
        fetch(`${API_BASE_URL}/attendance`)
      ]);

      const studentsData = await studentsRes.json();
      const occurrencesData = await occurrencesRes.json();
      const settingsData = await settingsRes.json();
      const attendanceData = await attendanceRes.json();

      setStudents(studentsData);
      setOccurrences(occurrencesData);
      setAttendanceList(attendanceData);

      // Carrega settings se persistidas no SQLite
      if (settingsData.activeRole) {
        setActiveUser({
          role: settingsData.activeRole,
          name: settingsData.activeUserName || 'Diretora Ana Clara',
          avatar: settingsData.activeUserAvatar || '👩‍💼'
        });
      }
      if (settingsData.theme) {
        setIsDark(settingsData.theme === 'dark');
      }
    } catch (error) {
      console.error('Erro ao sincronizar dados com SQLite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Sincroniza Tema e Classe CSS no body
  useEffect(() => {
    const body = document.body;
    if (isDark) {
      body.classList.remove('light-mode');
      body.classList.add('dark-mode');
    } else {
      body.classList.remove('dark-mode');
      body.classList.add('light-mode');
    }
    
    // Salva tema no back-end
    if (!isLoading) {
      fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: isDark ? 'dark' : 'light' })
      });
    }
  }, [isDark]);

  // Sincroniza Role ativa no back-end
  const handleSetActiveUser = async (user) => {
    setActiveUser(user);
    try {
      await fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeRole: user.role,
          activeUserName: user.name,
          activeUserAvatar: user.avatar
        })
      });
    } catch (err) {
      console.error('Erro ao salvar role no servidor:', err);
    }
  };

  // ==========================================================================
  // CRUD ALUNOS (SQLite)
  // ==========================================================================

  const handleOpenStudentModal = (student = null) => {
    setCurrentEditStudent(student);
    if (student) {
      setStudentForm({
        name: student.name,
        classroom: student.classroom,
        active: student.active ? 'active' : 'inactive'
      });
    } else {
      setStudentForm({ name: '', classroom: '', active: 'active' });
    }
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    if (!studentForm.name.trim() || !studentForm.classroom) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      if (currentEditStudent) {
        // UPDATE
        const res = await fetch(`${API_BASE_URL}/students/${currentEditStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: studentForm.name.trim(),
            classroom: studentForm.classroom,
            active: studentForm.active === 'active'
          })
        });
        const updated = await res.json();
        setStudents(students.map(s => s.id === updated.id ? updated : s));
        alert('Cadastro de aluno atualizado!');
      } else {
        // CREATE
        const res = await fetch(`${API_BASE_URL}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: studentForm.name.trim(),
            classroom: studentForm.classroom
          })
        });
        const created = await res.json();
        setStudents([...students, created]);
        alert('Novo aluno cadastrado com sucesso!');
      }
      setIsStudentModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar aluno:', err);
      alert('Erro ao salvar registro de aluno.');
    }
  };

  const handleToggleStudentActive = async (studentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/students/${studentId}/toggle`, {
        method: 'PATCH'
      });
      const updated = await res.json();
      setStudents(students.map(s => s.id === updated.id ? updated : s));
    } catch (err) {
      console.error('Erro ao alterar status do aluno:', err);
    }
  };

  // ==========================================================================
  // REGISTRO DE OCORRÊNCIAS (SQLite)
  // ==========================================================================

  const handleOpenOccurrenceModal = (student = null, forceType = 'atraso') => {
    setSelectedStudentForOcc(student);
    setOccType(forceType);

    // Reseta datas para datas atuais do dia local
    const todayStr = new Date().toISOString().split("T")[0];
    const nowTimeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    setAtrasoForm({ date: todayStr, time: nowTimeStr, reason: '', customReason: '', guardian: '', staff: 'Auxiliar Jéssica', obs: '', signature: '' });
    setSaidaForm({ date: todayStr, time: nowTimeStr, reason: '', guardian: '', hasReturn: 'nao', returnTime: '', obs: '', signature: '' });
    setAtestadoForm({ date: todayStr, startDate: todayStr, days: 1, endDate: todayStr, cid: '', reason: '', filePreview: '', obs: '' });
    setFaltaForm({ date: todayStr, reason: '', justified: 'nao', notified: 'nao', obs: '' });
    setAmamentacaoForm({ date: todayStr, timeIn: nowTimeStr, timeOut: '', guardian: '', obs: '' });

    setIsOccurrenceModalOpen(true);
  };

  const handleSaveOccurrence = async (e) => {
    e.preventDefault();
    if (!selectedStudentForOcc) {
      alert('Por favor, selecione um aluno ativo para registrar a ocorrência.');
      return;
    }

    const baseOcc = {
      type: occType,
      studentId: selectedStudentForOcc.id,
      studentName: selectedStudentForOcc.name,
      classroom: selectedStudentForOcc.classroom
    };

    let fullOccData = {};

    if (occType === 'atraso') {
      if (!atrasoForm.date || !atrasoForm.time || !atrasoForm.reason || !atrasoForm.guardian.trim()) {
        alert('Preencha todos os campos obrigatórios.');
        return;
      }
      if (!atrasoForm.signature) {
        alert('A assinatura do responsável de entrega é obrigatória.');
        return;
      }
      fullOccData = {
        ...baseOcc,
        date: atrasoForm.date,
        time: atrasoForm.time,
        motive: atrasoForm.reason === 'Outros' ? atrasoForm.customReason : atrasoForm.reason,
        guardian: atrasoForm.guardian.trim(),
        staff: atrasoForm.staff,
        obs: atrasoForm.obs.trim(),
        signature: atrasoForm.signature
      };
    } else if (occType === 'saida') {
      if (!saidaForm.date || !saidaForm.time || !saidaForm.reason || !saidaForm.guardian.trim()) {
        alert('Preencha todos os campos obrigatórios.');
        return;
      }
      if (!saidaForm.signature) {
        alert('A assinatura do responsável de retirada é obrigatória.');
        return;
      }
      fullOccData = {
        ...baseOcc,
        date: saidaForm.date,
        time: saidaForm.time,
        motive: saidaForm.reason,
        guardian: saidaForm.guardian.trim(),
        hasReturn: saidaForm.hasReturn,
        returnTime: saidaForm.hasReturn === 'sim' ? saidaForm.returnTime : '',
        obs: saidaForm.obs.trim(),
        signature: saidaForm.signature
      };
    } else if (occType === 'atestado') {
      if (!atestadoForm.date || !atestadoForm.startDate || !atestadoForm.reason || !atestadoForm.cid.trim()) {
        alert('Preencha todos os campos obrigatórios.');
        return;
      }
      if (!atestadoForm.filePreview) {
        alert('O upload ou digitalização do atestado médico é obrigatório.');
        return;
      }
      fullOccData = {
        ...baseOcc,
        date: atestadoForm.date,
        startDate: atestadoForm.startDate,
        days: parseInt(atestadoForm.days),
        endDate: atestadoForm.endDate,
        cid: atestadoForm.cid.trim().toUpperCase(),
        motive: atestadoForm.reason,
        filePreview: atestadoForm.filePreview,
        obs: atestadoForm.obs.trim()
      };
    } else if (occType === 'falta') {
      if (!faltaForm.date || !faltaForm.reason) {
        alert('Preencha todos os campos obrigatórios.');
        return;
      }
      fullOccData = {
        ...baseOcc,
        date: faltaForm.date,
        motive: faltaForm.reason,
        justified: faltaForm.justified,
        notified: faltaForm.notified,
        obs: faltaForm.obs.trim()
      };
    } else if (occType === 'amamentacao') {
      if (!amamentacaoForm.date || !amamentacaoForm.timeIn || !amamentacaoForm.timeOut || !amamentacaoForm.guardian.trim()) {
        alert('Preencha todos os campos obrigatórios.');
        return;
      }
      fullOccData = {
        ...baseOcc,
        date: amamentacaoForm.date,
        timeIn: amamentacaoForm.timeIn,
        timeOut: amamentacaoForm.timeOut,
        guardian: amamentacaoForm.guardian.trim(),
        obs: amamentacaoForm.obs.trim()
      };
    }

    try {
      const res = await fetch(`${API_BASE_URL}/occurrences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullOccData)
      });
      
      if (res.ok) {
        const createdOcc = await res.json();
        setOccurrences([createdOcc, ...occurrences]);
        setIsOccurrenceModalOpen(false);
        alert('Ocorrência registrada com sucesso no SQLite!');
      } else {
        alert('Erro ao salvar ocorrência no servidor.');
      }
    } catch (err) {
      console.error(err);
      alert('Erro na requisição para registrar ocorrência.');
    }
  };

  const handleDeleteOccurrence = async (occId) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro permanentemente?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/occurrences/${occId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setOccurrences(occurrences.filter(o => o.id !== occId));
        alert('Registro excluído com sucesso.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================================================
  // CONFIGURAÇÕES GLOBAIS (RESET, WIPE, SEED DEMO)
  // ==========================================================================

  const handleWipeHistory = async () => {
    if (!window.confirm('CUIDADO: Isso apagará TODAS as ocorrências cadastradas. Deseja continuar?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/settings/wipe`, { method: 'POST' });
      if (res.ok) {
        setOccurrences([]);
        alert('Histórico de ocorrências completamente limpo!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetEntireApp = async () => {
    if (!window.confirm('ATENÇÃO: Deseja redefinir todo o banco de dados? Todos os alunos cadastrados manualmente e histórico serão deletados, e os 70 alunos originais serão recarregados.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/settings/reset`, { method: 'POST' });
      if (res.ok) {
        alert('Sistema reiniciado com sucesso! Sincronizando dados...');
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedDemoData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE_URL}/settings/seed`, { method: 'POST' });
      if (res.ok) {
        const body = await res.json();
        alert(body.message);
        await loadAllData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler de Atestado File Upload (Simula digitalização gerando um SVG base64 médico)
  const handleAtestadoFileChange = () => {
    const randomCID = ["J11", "A09", "H10", "B01", "J20"][Math.floor(Math.random() * 5)];
    const svgBase64 = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='300' height='200' fill='%23f8fafc' stroke='%23cbd5e1' stroke-width='2'/><text x='150' y='60' font-family='sans-serif' font-size='14' font-weight='bold' text-anchor='middle' fill='%23475569'>ATESTADO MÉDICO DIGITAL</text><text x='150' y='100' font-family='sans-serif' font-size='11' text-anchor='middle' fill='%2364748b'>Afastamento Escolar CID ${randomCID}</text><line x1='50' y1='150' x2='250' y2='150' stroke='%2394a3b8' stroke-width='1'/><text x='150' y='165' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%2394a3b8'>Validado via CRM Online 7749</text></svg>`;
    setAtestadoForm({
      ...atestadoForm,
      cid: randomCID,
      filePreview: svgBase64
    });
  };

  // Auto-calculo da data de retorno do Atestado Médico
  useEffect(() => {
    if (atestadoForm.startDate && atestadoForm.days > 0) {
      const d = new Date(atestadoForm.startDate);
      d.setDate(d.getDate() + parseInt(atestadoForm.days) - 1);
      setAtestadoForm(prev => ({
        ...prev,
        endDate: d.toISOString().split("T")[0]
      }));
    }
  }, [atestadoForm.startDate, atestadoForm.days]);

  // Autocomplete de Busca no Modal de Ocorrências
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalSearchResults, setModalSearchResults] = useState([]);

  useEffect(() => {
    if (modalSearchQuery.trim().length > 1) {
      const filtered = students.filter(s => s.active && s.name.toLowerCase().includes(modalSearchQuery.toLowerCase()));
      setModalSearchResults(filtered);
    } else {
      setModalSearchResults([]);
    }
  }, [modalSearchQuery, students]);

  // Se o aluno for selecionado pelo cabeçalho
  const handleSelectStudentOccurrenceFromHeader = (student) => {
    setSelectedStudentForOcc(student);
    setModalSearchQuery(student.name);
    setOccType('atraso');
    setIsOccurrenceModalOpen(true);
  };

  // ==========================================================================
  // FILTRAGENS E CÁLCULOS DOS GRÁFICOS/DASHBOARD LOCAIS
  // ==========================================================================

  // Filtra ocorrências do Dashboard
  const getFilteredOccurrencesForDash = () => {
    let list = occurrences;
    const { dateStart, dateEnd, classroom, studentId } = dashFilters;
    if (dateStart) list = list.filter(o => o.date >= dateStart);
    if (dateEnd) list = list.filter(o => o.date <= dateEnd);
    if (classroom) list = list.filter(o => o.classroom === classroom);
    if (studentId) list = list.filter(o => o.studentId === studentId);
    return list;
  };

  const dashFilteredList = getFilteredOccurrencesForDash();

  // Cálculos de Métricas
  const getDashboardMetrics = () => {
    const today = new Date().toISOString().split("T")[0];
    
    // Atrasos
    const delayList = dashFilteredList.filter(o => o.type === 'atraso');
    let totalMinutes = 0;
    delayList.forEach(occ => {
      if (occ.time) {
        const [h, m] = occ.time.split(":").map(Number);
        const lateMin = (h * 60 + m) - (8 * 60);
        if (lateMin > 0) totalMinutes += lateMin;
      }
    });

    // Faltas
    const lackList = dashFilteredList.filter(o => o.type === 'falta');
    const lacksJustified = lackList.filter(o => o.justified === 'sim').length;

    // Atestados Ativos Hoje
    const { classroom, studentId } = dashFilters;
    const activeAtestToday = occurrences.filter(o => {
      if (o.type !== 'atestado') return false;
      if (classroom && o.classroom !== classroom) return false;
      if (studentId && o.studentId !== studentId) return false;
      return o.startDate <= today && o.endDate >= today;
    }).length;

    // Saídas
    const outList = dashFilteredList.filter(o => o.type === 'saida');
    const retsToday = outList.filter(o => o.hasReturn === 'sim').length;

    // Amamentação
    const amamList = dashFilteredList.filter(o => o.type === 'amamentacao');
    let totalAmamMins = 0;
    amamList.forEach(o => {
      if (o.timeIn && o.timeOut) {
        const [hIn, mIn] = o.timeIn.split(":").map(Number);
        const [hOut, mOut] = o.timeOut.split(":").map(Number);
        const diff = (hOut * 60 + mOut) - (hIn * 60 + mIn);
        if (diff > 0) totalAmamMins += diff;
      }
    });
    const avgAmam = amamList.length > 0 ? Math.round(totalAmamMins / amamList.length) : 0;

    // Frequência
    let attFiltered = attendanceList;
    const { dateStart, dateEnd } = dashFilters;
    if (dateStart) attFiltered = attFiltered.filter(o => o.date >= dateStart);
    if (dateEnd) attFiltered = attFiltered.filter(o => o.date <= dateEnd);
    if (classroom) attFiltered = attFiltered.filter(o => o.classroom === classroom);
    if (studentId) attFiltered = attFiltered.filter(o => o.studentId === studentId);

    const totalAtt = attFiltered.length;
    const presentAtt = attFiltered.filter(o => o.status === 'P').length;
    const lackAtt = attFiltered.filter(o => o.status === 'F').length;
    const justifiedAtt = attFiltered.filter(o => o.status === 'FJ').length;
    const assiduidadeRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100;

    return {
      delaysCount: delayList.length,
      delaysMinutes: totalMinutes,
      lacksCount: lackList.length,
      lacksJustified,
      atestadosCount: dashFilteredList.filter(o => o.type === 'atestado').length,
      atestadosAtivosHoje: activeAtestToday,
      saidasCount: outList.length,
      saidasRetornos: retsToday,
      amamentacaoCount: amamList.length,
      amamentacaoAvg: avgAmam,
      // Frequência
      totalAttendance: totalAtt,
      presentAttendance: presentAtt,
      lackAttendance: lackAtt,
      justifiedAttendance: justifiedAtt,
      assiduidadeRate
    };
  };

  const metrics = getDashboardMetrics();

  // ==========================================================================
  // FILTRAGEM DO MÓDULO DE LISTAGEM DE OCORRÊNCIAS
  // ==========================================================================
  const getFilteredOccList = () => {
    let list = occurrences.filter(o => o.type === (activeModule || 'atrasos'));
    const { classroom, date, search } = occFilters;

    if (classroom) list = list.filter(o => o.classroom === classroom);
    if (date) list = list.filter(o => o.date === date);
    if (search) list = list.filter(o => o.studentName.toLowerCase().includes(search.toLowerCase()));

    // Ordenação (mais recentes primeiro)
    return list.sort((a,b) => b.date.localeCompare(a.date));
  };

  const filteredOccList = getFilteredOccList();

  // ==========================================================================
  // FILTRAGEM DO PAINEL DE RELATÓRIOS
  // ==========================================================================
  const getFilteredReportsList = () => {
    let list = occurrences;
    const { type, classroom, dateStart, dateEnd } = reportFilters;

    if (type !== 'all') list = list.filter(o => o.type === type);
    if (classroom) list = list.filter(o => o.classroom === classroom);
    if (dateStart) list = list.filter(o => o.date >= dateStart);
    if (dateEnd) list = list.filter(o => o.date <= dateEnd);

    return list.sort((a,b) => b.date.localeCompare(a.date));
  };

  const reportsList = getFilteredReportsList();

  // Presets rápidos de período para o Relatório
  const handleReportPreset = (days) => {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - days);
    
    setReportFilters({
      ...reportFilters,
      dateStart: past.toISOString().split("T")[0],
      dateEnd: today.toISOString().split("T")[0]
    });
  };

  // EXPORT EXCEL (Tab-separated values CSV formatado com UTF-8 BOM para Excel)
  const exportReportsToExcel = () => {
    if (reportsList.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    if (typeof window.XLSX === "undefined") {
      alert("Erro: Biblioteca SheetJS não carregada.");
      return;
    }

    const mapped = reportsList.map((occ, idx) => {
      let details = "";
      let resp = occ.guardian || "N/A";
      
      if (occ.type === "atraso") {
        details = `Chegada: ${occ.time} - Motivo: ${occ.motive}`;
      } else if (occ.type === "saida") {
        details = `Saída: ${occ.time} - Motivo: ${occ.motive} (Retorna: ${occ.hasReturn === 'sim' ? 'Sim' : 'Não'})`;
      } else if (occ.type === "atestado") {
        details = `Afastado de ${occ.startDate} a ${occ.endDate} (${occ.days} dias) - Diagnóstico: ${occ.motive} (CID: ${occ.cid || 'N/A'})`;
        resp = "Médico CRM";
      } else if (occ.type === "falta") {
        details = `Falta por: ${occ.motive} (Justificada: ${occ.justified === 'sim' ? 'Sim' : 'Não'})`;
      } else if (occ.type === "amamentacao") {
        details = `Espaço Lactante: ${occ.timeIn} às ${occ.timeOut}`;
      }
      
      return {
        'Nº': idx + 1,
        'Data Registro': occ.date.split("-").reverse().join("/"),
        'Nome Criança': occ.studentName,
        'Sala / Turma': occ.classroom,
        'Tipo Ocorrência': occ.type.toUpperCase(),
        'Detalhes e Justificativas': details,
        'Responsável Relacionado': resp
      };
    });

    const worksheet = window.XLSX.utils.json_to_sheet(mapped);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Ocorrências");
    
    // Auto-ajusta largura de colunas
    const maxLens = {};
    mapped.forEach(row => {
      Object.keys(row).forEach(key => {
        const valStr = String(row[key]);
        maxLens[key] = Math.max(maxLens[key] || 10, valStr.length);
      });
    });
    worksheet['!cols'] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] + 3 }));

    window.XLSX.writeFile(workbook, `Relatorio_Ocorrencias_Creche_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  // EXPORT PDF (Usa jsPDF nativo injetado pelo CDN)
  const exportReportsToPDF = () => {
    if (reportsList.length === 0) {
      alert("Não há dados para exportar.");
      return;
    }

    if (typeof window.jspdf === "undefined") {
      alert("Erro: Biblioteca jsPDF não carregada.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    // Layout Layout Elegante de Cabeçalho do PDF
    doc.setFillColor(99, 102, 241); // Roxo principal
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("EducaGestão Portal Creche", 15, 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Relatório Geral Consolidado de Frequência e Ocorrências", 15, 25);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString("pt-BR")} | Registros Encontrados: ${reportsList.length}`, 15, 30);
    
    // Desenha tabela
    let y = 50;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59); // text-primary
    
    // Cabeçalho da Tabela
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y - 5, 190, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Data", 12, y);
    doc.text("Criança", 35, y);
    doc.text("Sala", 85, y);
    doc.text("Ocorrência", 115, y);
    doc.text("Detalhes", 145, y);
    
    y += 10;
    doc.setFont("helvetica", "normal");
    
    reportsList.forEach((occ, idx) => {
      if (y > 275) { // Insere nova página se estourar margem
        doc.addPage();
        y = 20;
        
        // Novo cabeçalho de tabela para páginas subsequentes
        doc.setFillColor(241, 245, 249);
        doc.rect(10, y - 5, 190, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.text("Data", 12, y);
        doc.text("Criança", 35, y);
        doc.text("Sala", 85, y);
        doc.text("Ocorrência", 115, y);
        doc.text("Detalhes", 145, y);
        y += 10;
        doc.setFont("helvetica", "normal");
      }
      
      const dateBR = occ.date.split("-").reverse().join("/");
      
      let details = "";
      if (occ.type === "atraso") details = `Chegada ${occ.time}`;
      else if (occ.type === "saida") details = `Saída ${occ.time}`;
      else if (occ.type === "atestado") details = `Atestado (${occ.days}d) - CID ${occ.cid}`;
      else if (occ.type === "falta") details = `Falta - ${occ.justified === 'sim' ? 'Justificada' : 'Sem Justif.'}`;
      else if (occ.type === "amamentacao") details = `Amamentação das ${occ.timeIn}`;
      
      // Limita caracteres do nome para caber na coluna
      const nameTrunc = occ.studentName.length > 22 ? occ.studentName.substring(0, 20) + "..." : occ.studentName;
      
      doc.text(dateBR, 12, y);
      doc.text(nameTrunc, 35, y);
      doc.text(occ.classroom, 85, y);
      doc.text(occ.type.toUpperCase(), 115, y);
      doc.text(details, 145, y);
      
      // Linha separadora discreta
      doc.setDrawColor(226, 232, 240);
      doc.line(10, y + 3, 200, y + 3);
      
      y += 9;
    });
    
    doc.save(`Relatorio_Frequencia_Creche_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // ==========================================================================
  // INSIGHTS INTELIGENTES & ALERTAS PEDAGÓGICOS (ALGORITMO LOCAL)
  // ==========================================================================
  const getInsightsData = () => {
    const today = new Date().toISOString().split("T")[0];
    const urgentList = [];
    const medicalList = [];
    const delayPatterns = [];
    const absencePatterns = [];
    
    // Contagem de ocorrências por criança
    const kidStats = {};
    students.forEach(s => {
      kidStats[s.id] = { student: s, atrasos: 0, faltas: 0, atestados: [], total: 0 };
    });

    occurrences.forEach(o => {
      if (kidStats[o.studentId]) {
        kidStats[o.studentId].total++;
        if (o.type === 'atraso') kidStats[o.studentId].atrasos++;
        else if (o.type === 'falta') kidStats[o.studentId].faltas++;
        else if (o.type === 'atestado') kidStats[o.studentId].atestados.push(o);
      }
    });

    // 1. Alertas Urgentes / Risco de Abandono (crianças com mais de 3 faltas ou ocorrências excessivas)
    Object.values(kidStats).forEach(stat => {
      if (stat.faltas >= 3) {
        urgentList.push({
          studentName: stat.student.name,
          classroom: stat.student.classroom,
          reason: `Acumulou ${stat.faltas} faltas este mês. Recomendado contato preventivo da diretoria.`,
          avatar: '🚨'
        });
      } else if (stat.atrasos >= 4) {
        urgentList.push({
          studentName: stat.student.name,
          classroom: stat.student.classroom,
          reason: `Acumulou ${stat.atrasos} atrasos consecutivos. Risco de impacto na rotina pedagógica matinal.`,
          avatar: '⚠️'
        });
      }
    });

    // 2. Acompanhamento de Saúde / Retornos de Atestado
    occurrences.filter(o => o.type === 'atestado').forEach(atest => {
      // Se o atestado está ativo HOJE
      if (atest.startDate <= today && atest.endDate >= today) {
        medicalList.push({
          studentName: atest.studentName,
          classroom: atest.classroom,
          cid: atest.cid,
          endDate: atest.endDate.split("-").reverse().join("/"),
          reason: `Afastado por ${atest.motive}. Retorno previsto em ${atest.endDate.split("-").reverse().join("/")}.`
        });
      }
    });

    // 3. Padrões de Atraso e Faltas (Simulação inteligente baseada em dados reais e seeded)
    Object.values(kidStats).forEach(stat => {
      if (stat.atrasos > 2) {
        delayPatterns.push({
          studentName: stat.student.name,
          classroom: stat.student.classroom,
          motive: `Padrão detectado: Frequência elevada de atrasos. Dias preferenciais: Terças e Quintas.`
        });
      }
      if (stat.faltas > 2) {
        absencePatterns.push({
          studentName: stat.student.name,
          classroom: stat.student.classroom,
          motive: stat.student.name === 'Gabriel Nogueira' 
            ? 'Padrão de faltas sistemáticas nas Segundas-Feiras (Padrão Fim-de-Semana Prolongado).'
            : 'Faltas recorrentes sem justificativa médica declarada.'
        });
      }
    });

    // Diretrizes Pedagógicas
    const classroomFocus = [
      { room: 'Sala Alegria', issue: 'Nível elevado de faltas nas sextas-feiras por viagem familiar. Ação: Enviar comunicado de sensibilização sobre assiduidade.' },
      { room: 'Sala Carinho', issue: 'Uso crescente da sala de amamentação pelas lactantes. Ação: Manter higienização diária no intervalo da tarde.' }
    ];

    const pedagogicalSuggestions = [
      { title: 'Reunião de Escuta Ativa', desc: 'Agendar conversa humanizada com as famílias das crianças com risco de evasão escolar (3+ faltas) para entender dificuldades.' },
      { title: 'Flexibilização na Acolhida matinal', desc: 'Para turmas com atrasos concentrados por trânsito, abrir rodada musical de recepção estendida de 15 minutos.' }
    ];

    return {
      urgentList,
      medicalList,
      delayPatterns,
      absencePatterns,
      classroomFocus,
      pedagogicalSuggestions
    };
  };

  const insights = getInsightsData();

  // Imprimir Comprovante de Registro Único
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      
      {/* SIDEBAR */}
      <Sidebar 
        activeTab={activeTab} 
        activeModule={activeModule}
        setActiveTab={setActiveTab} 
        setActiveModule={setActiveModule}
        activeUser={activeUser}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />
      
      {/* MAIN CONTENT */}
      <main className="app-main">
        {/* HEADER */}
        <Header 
          activeTab={activeTab}
          activeModule={activeModule}
          students={students}
          isDark={isDark}
          setIsDark={setIsDark}
          activeUser={activeUser}
          setActiveUser={handleSetActiveUser}
          setIsSidebarOpen={setIsSidebarOpen}
          onQuickAction={() => handleOpenOccurrenceModal(null, 'atraso')}
          onSelectStudentOccurrence={handleSelectStudentOccurrenceFromHeader}
        />
        
        {/* ==================================================================
            PANEL: PÁGINA INICIAL / BOAS-VINDAS
            ================================================================== */}
        {activeTab === 'home' && (
          <section className="panel-section active" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '24px', textAlign: 'center' }}>
            <div className="welcome-banner" style={{ marginBottom: '40px', maxWidth: '700px' }}>
              <span className="welcome-emoji" style={{ fontSize: '48px', marginBottom: '16px', display: 'inline-block' }}>🧸</span>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '32px', fontWeight: 800, color: 'var(--slate-800)', marginBottom: '12px' }}>
                EducaGestão Creche & SEAMI
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--slate-500)', lineHeight: 1.6 }}>
                Bem-vindo ao portal integrado de gestão escolar. Selecione uma das duas áreas de trabalho abaixo para iniciar ou acesse os relatórios analíticos gerais.
              </p>
            </div>

            <div className="modules-selection-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', width: '100%', maxWidth: '850px', marginBottom: '48px' }}>
              
              {/* Card Módulo I: Controle de Frequência */}
              <div 
                className="module-landing-card animate-fade-in" 
                onClick={() => setActiveTab('attendance')}
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
                  gap: '16px',
                  position: 'relative',
                  overflow: 'hidden'
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
                  onClick={(e) => { e.stopPropagation(); setActiveTab('attendance'); }}
                >
                  Entrar no Módulo I
                </button>
              </div>

              {/* Card Módulo II: Caderno SEAMI */}
              <div 
                className="module-landing-card animate-fade-in" 
                onClick={() => setActiveTab('seami_control')}
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
                  gap: '16px',
                  position: 'relative',
                  overflow: 'hidden'
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
                  onClick={(e) => { e.stopPropagation(); setActiveTab('seami_control'); }}
                >
                  Entrar no Módulo II
                </button>
              </div>

            </div>

            {/* Botão menor abaixo para acessar o Dashboard */}
            <button 
              className="secondary-btn" 
              onClick={() => setActiveTab('dashboard')}
              style={{ 
                gap: '8px', 
                padding: '10px 24px', 
                borderRadius: '50px', 
                border: '1px dashed var(--slate-300)',
                backgroundColor: 'rgba(255, 255, 255, 0.6)', 
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
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.6)';
                e.currentTarget.style.borderColor = 'var(--slate-300)';
                e.currentTarget.style.color = 'var(--slate-600)';
              }}
            >
              <LayoutDashboard size={16} />
              Acessar Painel Analítico & Dashboard Geral
            </button>
          </section>
        )}

        {/* ==================================================================
            PANEL: DASHBOARD
            ================================================================== */}
        {activeTab === 'dashboard' && (
          <section className="panel-section active">
            {/* Filtros Globais do Dashboard */}
            <div className="filter-card">
              <div className="filter-card-header">
                <div className="filter-card-title">
                  <SlidersHorizontal size={18} />
                  <span>Filtros do Painel Geral</span>
                </div>
                <button 
                  className="clear-filters-btn" 
                  onClick={() => setDashFilters({ dateStart: '', dateEnd: '', classroom: '', studentId: '' })}
                >
                  Limpar Filtros
                </button>
              </div>
              <div className="filter-grid">
                <div className="filter-group">
                  <label>Data Inicial</label>
                  <input 
                    type="date" 
                    value={dashFilters.dateStart}
                    onChange={(e) => setDashFilters({ ...dashFilters, dateStart: e.target.value })}
                  />
                </div>
                <div className="filter-group">
                  <label>Data Final</label>
                  <input 
                    type="date" 
                    value={dashFilters.dateEnd}
                    onChange={(e) => setDashFilters({ ...dashFilters, dateEnd: e.target.value })}
                  />
                </div>
                <div className="filter-group">
                  <label>Sala/Turma</label>
                  <select 
                    value={dashFilters.classroom}
                    onChange={(e) => setDashFilters({ ...dashFilters, classroom: e.target.value, studentId: '' })}
                  >
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
                  <select 
                    value={dashFilters.studentId}
                    onChange={(e) => setDashFilters({ ...dashFilters, studentId: e.target.value })}
                  >
                    <option value="">Todas as crianças</option>
                    {students
                      .filter(s => !dashFilters.classroom || s.classroom === dashFilters.classroom)
                      .sort((a,b) => a.name.localeCompare(b.name))
                      .map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                    }
                  </select>
                </div>
              </div>
            </div>
            
            {/* MÓDULO I: CONTROLE DE FREQUÊNCIA */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <ClipboardCheck size={20} style={{ color: 'var(--brand-primary)' }} />
                Módulo I: Controle de Frequência
              </h3>
              
              <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="metric-card metric-amamentacao" onClick={() => setActiveTab('attendance')} style={{ borderLeft: '4px solid #10b981' }}>
                  <div className="metric-header">
                    <span className="metric-title">Taxa de Assiduidade Geral</span>
                    <div className="metric-icon-box" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}><Percent size={18} /></div>
                  </div>
                  <div className="metric-value" style={{ color: '#065f46' }}>{metrics.assiduidadeRate}%</div>
                  <div className="metric-footer" style={{ color: '#047857' }}>
                    <span>Presença média acumulada</span>
                  </div>
                </div>

                <div className="metric-card" onClick={() => setActiveTab('attendance')} style={{ borderLeft: '4px solid var(--brand-primary)' }}>
                  <div className="metric-header">
                    <span className="metric-title">Chamadas Registradas</span>
                    <div className="metric-icon-box" style={{ backgroundColor: 'var(--brand-light)', color: 'var(--brand-primary)' }}><ClipboardCheck size={18} /></div>
                  </div>
                  <div className="metric-value">{metrics.totalAttendance}</div>
                  <div className="metric-footer text-secondary">
                    <span>{metrics.presentAttendance} presenças e {metrics.lackAttendance + metrics.justifiedAttendance} faltas</span>
                  </div>
                </div>

                <div className="metric-card metric-atrasos" onClick={() => setActiveTab('attendance')} style={{ borderLeft: '4px solid #f59e0b' }}>
                  <div className="metric-header">
                    <span className="metric-title">Faltas Justificadas</span>
                    <div className="metric-icon-box" style={{ backgroundColor: '#fffbeb', color: '#f59e0b' }}><CheckSquare size={18} /></div>
                  </div>
                  <div className="metric-value" style={{ color: '#b45309' }}>{metrics.justifiedAttendance}</div>
                  <div className="metric-footer" style={{ color: '#b45309' }}>
                    <span>Justificadas pelo Controle de Frequência</span>
                  </div>
                </div>

                <div className="metric-card metric-faltas" onClick={() => setActiveTab('attendance')} style={{ borderLeft: '4px solid #ef4444' }}>
                  <div className="metric-header">
                    <span className="metric-title">Faltas Não Justificadas</span>
                    <div className="metric-icon-box" style={{ backgroundColor: '#fef2f2', color: '#ef4444' }}><X size={18} /></div>
                  </div>
                  <div className="metric-value" style={{ color: '#991b1b' }}>{metrics.lackAttendance}</div>
                  <div className="metric-footer" style={{ color: '#991b1b' }}>
                    <span>Faltas em aberto na chamada</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MÓDULO II: CADERNO DE REGISTROS SEAMI */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '18px', fontWeight: 700, color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <BookOpen size={20} style={{ color: '#be185d' }} />
                Módulo II: Caderno de Registros SEAMI
              </h3>
              
              <div className="metrics-grid">
                <div className="metric-card metric-atrasos" onClick={() => { setActiveTab('seami_control'); setActiveModule('atraso'); }}>
                  <div className="metric-header">
                    <span className="metric-title">Atrasos</span>
                    <div className="metric-icon-box"><Clock size={18} /></div>
                  </div>
                  <div className="metric-value">{metrics.delaysCount}</div>
                  <div className="metric-footer text-atrasos">
                    <TrendingUp size={14} className="trend-icon" />
                    <span>{metrics.delaysMinutes} min acumulados</span>
                  </div>
                </div>
                
                <div className="metric-card metric-faltas" onClick={() => { setActiveTab('seami_control'); setActiveModule('falta'); }}>
                  <div className="metric-header">
                    <span className="metric-title">Faltas no Caderno</span>
                    <div className="metric-icon-box"><CalendarX size={18} /></div>
                  </div>
                  <div className="metric-value">{metrics.lacksCount}</div>
                  <div className="metric-footer text-faltas">
                    <span>{metrics.lacksJustified} justificadas no caderno</span>
                  </div>
                </div>
                
                <div className="metric-card metric-atestados" onClick={() => { setActiveTab('seami_control'); setActiveModule('atestado'); }}>
                  <div className="metric-header">
                    <span className="metric-title">Atestados Médicos</span>
                    <div className="metric-icon-box"><Activity size={18} /></div>
                  </div>
                  <div className="metric-value">{metrics.atestadosCount}</div>
                  <div className="metric-footer text-atestados">
                    <span>{metrics.atestadosAtivosHoje} atestados ativos hoje</span>
                  </div>
                </div>
                
                <div className="metric-card metric-saidas" onClick={() => { setActiveTab('seami_control'); setActiveModule('saida'); }}>
                  <div className="metric-header">
                    <span className="metric-title">Saídas Antecipadas</span>
                    <div className="metric-icon-box"><LogOut size={18} /></div>
                  </div>
                  <div className="metric-value">{metrics.saidasCount}</div>
                  <div className="metric-footer text-saidas">
                    <span>{metrics.saidasRetornos} com retorno programado</span>
                  </div>
                </div>
                
                <div className="metric-card metric-amamentacao" onClick={() => { setActiveTab('seami_control'); setActiveModule('amamentacao'); }}>
                  <div className="metric-header">
                    <span className="metric-title">Amamentação</span>
                    <div className="metric-icon-box"><Heart size={18} /></div>
                  </div>
                  <div className="metric-value">{metrics.amamentacaoCount}</div>
                  <div className="metric-footer text-amamentacao">
                    <span>Permanência média: {metrics.amamentacaoAvg} min</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Dashboard Charts */}
            <DashboardCharts 
              occurrences={occurrences}
              attendanceList={attendanceList}
              students={students}
              filters={dashFilters}
              isDark={isDark}
            />
          </section>
        )}

        {/* ==================================================================
            PANEL: ALUNOS
            ================================================================== */}
        {activeTab === 'students' && (
          <section className="panel-section active">
            <div className="action-bar">
              <div className="search-filter-students">
                <div className="input-icon-wrapper">
                  <Search size={16} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar por nome do aluno..." 
                    value={occFilters.search}
                    onChange={(e) => setOccFilters({ ...occFilters, search: e.target.value })}
                  />
                </div>
                <select 
                  value={occFilters.classroom}
                  onChange={(e) => setOccFilters({ ...occFilters, classroom: e.target.value })}
                >
                  <option value="">Todas as Salas</option>
                  <option value="Alegria">Sala Alegria</option>
                  <option value="Carinho">Sala Carinho</option>
                  <option value="União">Sala União</option>
                  <option value="Amizade">Sala Amizade</option>
                  <option value="Felicidade">Sala Felicidade</option>
                </select>
              </div>
              
              <button className="primary-btn" onClick={() => handleOpenStudentModal(null)}>
                <Plus size={18} />
                <span>Adicionar Aluno</span>
              </button>
            </div>
            
            <div className="table-card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Criança</th>
                      <th>Sala / Turma</th>
                      <th>Status</th>
                      <th>Total Atrasos</th>
                      <th>Total Faltas</th>
                      <th>Atestados Ativos</th>
                      <th className="actions-column">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students
                      .filter(st => {
                        const matchSearch = st.name.toLowerCase().includes(occFilters.search.toLowerCase());
                        const matchClass = !occFilters.classroom || st.classroom === occFilters.classroom;
                        return matchSearch && matchClass;
                      })
                      .sort((a,b) => a.name.localeCompare(b.name))
                      .map(st => {
                        const delays = occurrences.filter(o => o.studentId === st.id && o.type === 'atraso').length;
                        const lacks = occurrences.filter(o => o.studentId === st.id && o.type === 'falta').length;
                        const activeAtest = occurrences.filter(o => {
                          const today = new Date().toISOString().split("T")[0];
                          return o.studentId === st.id && o.type === 'atestado' && o.startDate <= today && o.endDate >= today;
                        }).length;

                        return (
                          <tr key={st.id}>
                            <td>
                              <div className="student-row-name-wrapper">
                                <span className="student-row-avatar">👦</span>
                                <span style={{ fontWeight: 600 }}>{st.name}</span>
                              </div>
                            </td>
                            <td><span className="occ-type-pill amamentacao" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{st.classroom}</span></td>
                            <td>
                              <span className={`status-pill ${st.active ? 'active' : 'inactive'}`}>
                                {st.active ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, color: delays > 3 ? 'var(--color-atrasos)' : 'inherit' }}>{delays}</td>
                            <td style={{ fontWeight: 600, color: lacks > 3 ? 'var(--color-faltas)' : 'inherit' }}>{lacks}</td>
                            <td>{activeAtest > 0 ? <span className="occ-type-pill atestado">Ativo</span> : <span className="text-light">-</span>}</td>
                            <td className="actions-column">
                              <div className="action-row-buttons">
                                <button className="row-action-btn" onClick={() => handleOpenStudentModal(st)} title="Editar">✏️</button>
                                {activeUser.role === 'diretora' && (
                                  <button className="row-action-btn delete" onClick={() => handleToggleStudentActive(st.id)} title={st.active ? 'Inativar' : 'Reativar'}>
                                    {st.active ? <Trash2 size={16} /> : <Undo size={16} />}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            PANEL: OCORRÊNCIAS LISTAGEM
            ================================================================== */}
        {activeTab === 'occurrences' && activeModule && (
          <section className="panel-section active">
            <div className="action-bar">
              <div className="occurrence-module-info">
                <div className={`module-badge occ-type-pill ${activeModule}`}>{activeModule.charAt(0).toUpperCase() + activeModule.slice(1)}</div>
                <p className="module-description">
                  {activeModule === 'atrasos' && "Controle diário de chegadas tardias e assinatura dos pais."}
                  {activeModule === 'saidas' && "Registro de retiradas autorizadas antes do encerramento das aulas."}
                  {activeModule === 'atestados' && "Lançamentos e acompanhamento de saúde física de crianças afastadas."}
                  {activeModule === 'faltas' && "Ausências escolares informadas previamente ou não justificadas."}
                  {activeModule === 'amamentacao' && "Controle do espaço privativo de amamentação e cuidados infantis."}
                </p>
              </div>
              
              <button className="primary-btn" onClick={() => handleOpenOccurrenceModal(null, activeModule)}>
                <Plus size={18} />
                <span>Lançar {activeModule.charAt(0).toUpperCase() + activeModule.slice(1)}</span>
              </button>
            </div>
            
            {/* Filtros da Listagem */}
            <div className="filter-card">
              <div className="filter-grid-three">
                <div className="filter-group">
                  <label>Pesquisar Aluno</label>
                  <input 
                    type="text" 
                    placeholder="Nome da criança..." 
                    value={occFilters.search}
                    onChange={(e) => setOccFilters({ ...occFilters, search: e.target.value })}
                  />
                </div>
                <div className="filter-group">
                  <label>Filtrar por Sala</label>
                  <select 
                    value={occFilters.classroom}
                    onChange={(e) => setOccFilters({ ...occFilters, classroom: e.target.value })}
                  >
                    <option value="">Todas as salas</option>
                    <option value="Alegria">Alegria</option>
                    <option value="Carinho">Carinho</option>
                    <option value="União">União</option>
                    <option value="Amizade">Amizade</option>
                    <option value="Felicidade">Felicidade</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Filtrar por Data</label>
                  <input 
                    type="date" 
                    value={occFilters.date}
                    onChange={(e) => setOccFilters({ ...occFilters, date: e.target.value })}
                  />
                </div>
              </div>
            </div>
            
            <div className="table-card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Criança</th>
                      <th>Sala / Turma</th>
                      <th>Detalhes</th>
                      <th>Responsável</th>
                      <th>Assinatura / Comprovante</th>
                      {activeUser.role === 'diretora' && <th>Excluir</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOccList.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                          <Info size={32} style={{ margin: '0 auto 8px', color: 'var(--text-light)' }} />
                          Nenhuma ocorrência registrada com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredOccList.map(occ => (
                        <tr key={occ.id}>
                          <td><strong>{occ.date.split('-').reverse().join('/')}</strong></td>
                          <td style={{ fontWeight: 600 }}>{occ.studentName}</td>
                          <td><span className="occ-type-pill amamentacao" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{occ.classroom}</span></td>
                          <td>
                            {occ.type === 'atraso' && <span>Chegada: <strong>{occ.time}</strong> - {occ.motive}</span>}
                            {occ.type === 'saida' && <span>Saída: <strong>{occ.time}</strong> - {occ.motive} {occ.hasReturn === 'sim' && `(Retorno: ${occ.returnTime})`}</span>}
                            {occ.type === 'atestado' && <span>Afastado: de {occ.startDate.split('-').reverse().join('/')} a {occ.endDate.split('-').reverse().join('/')} ({occ.days}d) - CID {occ.cid}</span>}
                            {occ.type === 'falta' && <span>{occ.motive} - {occ.justified === 'sim' ? 'Justificada' : 'Não Justificada'}</span>}
                            {occ.type === 'amamentacao' && <span>Permanência: {occ.timeIn} às {occ.timeOut}</span>}
                          </td>
                          <td>{occ.guardian || '-'}</td>
                          <td>
                            {(occ.signature || occ.filePreview) ? (
                              <button 
                                className="status-pill active" 
                                style={{ border: 'none', cursor: 'pointer' }}
                                onClick={() => { setActiveReceipt(occ); setIsReceiptModalOpen(true); }}
                              >
                                Ver Comprovante
                              </button>
                            ) : '-'}
                          </td>
                          {activeUser.role === 'diretora' && (
                            <td>
                              <button className="row-action-btn delete" onClick={() => handleDeleteOccurrence(occ.id)}>🗑️</button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            PANEL: RELATÓRIOS
            ================================================================== */}
        {activeTab === 'reports' && (
          <section className="panel-section active">
            <div className="filter-card">
              <div className="filter-card-header">
                <div className="filter-card-title">
                  <Filter size={18} />
                  <span>Gerador de Relatórios Consolidados</span>
                </div>
                <div className="export-actions" style={{ display: 'flex', gap: '8px' }}>
                  <button className="export-btn excel-btn" onClick={exportReportsToExcel}>
                    📊 Exportar Excel
                  </button>
                  <button className="export-btn pdf-btn" onClick={exportReportsToPDF}>
                    📄 Exportar PDF
                  </button>
                </div>
              </div>
              <div className="filter-grid">
                <div className="filter-group">
                  <label>Tipo de Ocorrência</label>
                  <select 
                    value={reportFilters.type}
                    onChange={(e) => setReportFilters({ ...reportFilters, type: e.target.value })}
                  >
                    <option value="all">Todas as ocorrências</option>
                    <option value="atraso">Atrasos</option>
                    <option value="saida">Saídas Antecipadas</option>
                    <option value="atestado">Atestados Médicos</option>
                    <option value="falta">Faltas</option>
                    <option value="amamentacao">Sala de Amamentação</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Sala / Turma</label>
                  <select 
                    value={reportFilters.classroom}
                    onChange={(e) => setReportFilters({ ...reportFilters, classroom: e.target.value })}
                  >
                    <option value="">Todas as salas</option>
                    <option value="Alegria">Alegria</option>
                    <option value="Carinho">Carinho</option>
                    <option value="União">União</option>
                    <option value="Amizade">Amizade</option>
                    <option value="Felicidade">Felicidade</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Data Inicial</label>
                  <input 
                    type="date" 
                    value={reportFilters.dateStart}
                    onChange={(e) => setReportFilters({ ...reportFilters, dateStart: e.target.value })}
                  />
                </div>
                <div className="filter-group">
                  <label>Data Final</label>
                  <input 
                    type="date" 
                    value={reportFilters.dateEnd}
                    onChange={(e) => setReportFilters({ ...reportFilters, dateEnd: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="report-quick-presets">
                <span className="presets-title">Períodos Rápidos:</span>
                <button className="preset-btn" onClick={() => handleReportPreset(7)}>Últimos 7 dias</button>
                <button className="preset-btn" onClick={() => handleReportPreset(30)}>Últimos 30 dias</button>
                <button className="preset-btn" onClick={() => handleReportPreset(90)}>Último Trimestre</button>
                <button className="preset-btn" onClick={() => handleReportPreset(365)}>Este Ano</button>
              </div>
            </div>
            
            {/* Banner de Estatísticas do Relatório */}
            <div className="report-stats-banner">
              <div className="report-stat-item">
                <span className="report-stat-label">Total de Ocorrências</span>
                <span className="report-stat-val">{reportsList.length}</span>
              </div>
              <div className="report-stat-item">
                <span className="report-stat-label">Crianças Impactadas</span>
                <span className="report-stat-val text-primary">
                  {new Set(reportsList.map(o => o.studentId)).size}
                </span>
              </div>
              <div className="report-stat-item">
                <span className="report-stat-label">Média Diária</span>
                <span className="report-stat-val text-warning">
                  {(reportsList.length / 30).toFixed(1)}
                </span>
              </div>
            </div>
            
            <div className="table-card">
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Criança</th>
                      <th>Sala</th>
                      <th>Tipo</th>
                      <th>Detalhes</th>
                      <th>Responsável</th>
                      <th>Comprovante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportsList.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '40px' }}>
                          <Info size={32} style={{ margin: '0 auto 8px', color: 'var(--text-light)' }} />
                          Nenhuma ocorrência correspondente aos filtros.
                        </td>
                      </tr>
                    ) : (
                      reportsList.map(occ => (
                        <tr key={occ.id}>
                          <td><strong>{occ.date.split('-').reverse().join('/')}</strong></td>
                          <td style={{ fontWeight: 600 }}>{occ.studentName}</td>
                          <td><span className="occ-type-pill saida" style={{ backgroundColor: 'var(--color-saidas-bg)', color: 'var(--color-saidas)' }}>{occ.classroom}</span></td>
                          <td><span className={`occ-type-pill ${occ.type}`}>{occ.type.toUpperCase()}</span></td>
                          <td>
                            {occ.type === 'atraso' && `Chegou às ${occ.time} - ${occ.motive}`}
                            {occ.type === 'saida' && `Saída às ${occ.time} - ${occ.motive}`}
                            {occ.type === 'atestado' && `Afastado de ${occ.startDate.split('-').reverse().join('/')} a ${occ.endDate.split('-').reverse().join('/')} (${occ.days}d)`}
                            {occ.type === 'falta' && `${occ.motive} - ${occ.justified === 'sim' ? 'Justificada' : 'Sem Justif.'}`}
                            {occ.type === 'amamentacao' && `Permanência: ${occ.timeIn} - ${occ.timeOut}`}
                          </td>
                          <td>{occ.guardian || '-'}</td>
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            PANEL: INSIGHTS
            ================================================================== */}
        {activeTab === 'insights' && (
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
                    {insights.urgentList.length === 0 ? (
                      <p className="no-data-text">Nenhum alerta crítico ativo hoje.</p>
                    ) : (
                      insights.urgentList.map((item, idx) => (
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
                    {insights.delayPatterns.length === 0 ? (
                      <p className="no-data-text">Nenhum padrão sistêmico de atraso encontrado.</p>
                    ) : (
                      insights.delayPatterns.slice(0, 3).map((item, idx) => (
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
                    {insights.absencePatterns.length === 0 ? (
                      <p className="no-data-text">Nenhum padrão de falta identificado.</p>
                    ) : (
                      insights.absencePatterns.slice(0, 3).map((item, idx) => (
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
                    {insights.medicalList.length === 0 ? (
                      <p className="no-data-text">Nenhum acompanhamento clínico ativo hoje.</p>
                    ) : (
                      insights.medicalList.map((item, idx) => (
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
                    {insights.classroomFocus.map((item, idx) => (
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
                    {insights.pedagogicalSuggestions.map((item, idx) => (
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
        )}

        {/* ==================================================================
            PANEL: SETTINGS
            ================================================================== */}
        {activeTab === 'settings' && activeUser.role !== 'auxiliar' && (
          <section className="panel-section active">
            <div className="settings-grid">
              <div className="settings-card">
                <h3>Banco de Dados & Persistência Local SQLite</h3>
                <p className="settings-desc">Controle a persistência das ocorrências e do simulador no servidor local.</p>
                
                <div className="settings-actions">
                  <div className="settings-action-row">
                    <div className="action-info">
                      <span className="action-title">Gerar Dados Fictícios de Demonstração</span>
                      <span className="action-desc">Semeia automaticamente 95 ocorrências aleatórias distribuídas nos últimos 30 dias para testes instantâneos dos gráficos e inteligência IA.</span>
                    </div>
                    <button className="secondary-btn" onClick={handleSeedDemoData}>Gerar Demo</button>
                  </div>
                  
                  <div className="settings-action-row">
                    <div className="action-info">
                      <span className="action-title">Limpar Histórico de Ocorrências</span>
                      <span className="action-desc text-danger">Remove todos os lançamentos (atrasos, faltas, etc.) mantendo intacto apenas o cadastro de alunos do SQLite.</span>
                    </div>
                    <button className="danger-btn" onClick={handleWipeHistory}>Limpar Histórico</button>
                  </div>
                  
                  <div className="settings-action-row">
                    <div className="action-info">
                      <span className="action-title">Reiniciar Todo o Banco SQLite</span>
                      <span className="action-desc text-danger">Zera todas as tabelas e re-semeia a base inicial limpa de 70 alunos originais.</span>
                    </div>
                    <button className="danger-btn" onClick={handleResetEntireApp}>Zerar Sistema</button>
                  </div>
                </div>
              </div>
              
              <div className="settings-card">
                <h3>Níveis de Acesso e Permissões Simuladas</h3>
                <p className="settings-desc">Mude de perfil no seletor do cabeçalho para ver o comportamento do sistema:</p>
                
                <div className="settings-info-box">
                  <ul className="permissions-list">
                    <li><strong>Diretora:</strong> Controle administrativo irrestrito (CRUD total de alunos, exclusão de histórico de ocorrências e redefinições de SQLite).</li>
                    <li><strong>Pedagogia:</strong> Visualização de relatórios, gráficos e abas pedagógicas de IA. Pode lançar ocorrências diárias. Não pode inativar alunos ou redefinir a base.</li>
                    <li><strong>Auxiliar:</strong> Foco em rapidez. Apenas tela de Dashboard simplificada, listagem de ocorrências e adição rápida. Aba de configurações administrativa oculta.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ==================================================================
            PANEL: CHAMADA DIÁRIA (ATTENDANCE)
            ================================================================== */}
        {activeTab === 'attendance' && (
          <section className="panel-section active">
            <DailyAttendance 
              activeUser={activeUser} 
              initialTab={activeModule || 'lancamento'}
              setActiveModule={setActiveModule}
            />
          </section>
        )}

        {/* ==================================================================
            PANEL: CADERNO SEAMI (SEAMI_CONTROL)
            ================================================================== */}
        {activeTab === 'seami_control' && (
          <section className="panel-section active">
            <SeamiControl 
              activeUser={activeUser} 
              activeModule={activeModule}
              setActiveModule={setActiveModule}
            />
          </section>
        )}
      </main>

      {/* ==================================================================
          MODAL: CADASTRAR/EDITAR ALUNO
          ================================================================== */}
      {isStudentModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{currentEditStudent ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}</h2>
              <button className="modal-close-btn" onClick={() => setIsStudentModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveStudent}>
              <div className="form-body">
                <div className="form-group">
                  <label>Nome da Criança*</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Bernardo Costa"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  />
                </div>
                
                <div className="form-group">
                  <label>Sala / Turma*</label>
                  <select 
                    required
                    value={studentForm.classroom}
                    onChange={(e) => setStudentForm({ ...studentForm, classroom: e.target.value })}
                  >
                    <option value="">Selecione uma sala</option>
                    <option value="Alegria">Alegria</option>
                    <option value="Carinho">Carinho</option>
                    <option value="União">União</option>
                    <option value="Amizade">Amizade</option>
                    <option value="Felicidade">Felicidade</option>
                  </select>
                </div>
                
                {currentEditStudent && (
                  <div className="form-group">
                    <label>Status do Aluno</label>
                    <select 
                      value={studentForm.active}
                      onChange={(e) => setStudentForm({ ...studentForm, active: e.target.value })}
                    >
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setIsStudentModalOpen(false)}>Cancelar</button>
                <button type="submit" className="primary-btn">Salvar Aluno</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================
          MODAL: LANÇAR OCORRÊNCIA MULTI-MÓDULO
          ================================================================== */}
      {isOccurrenceModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-card modal-large">
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="modal-emoji-header">⏰</span>
                <h2>Lançar Ocorrência</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setIsOccurrenceModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            {/* Seletor de Tipo */}
            <div className="modal-module-selector">
              <label>Tipo de Ocorrência:</label>
              <div className="module-radio-buttons">
                {['atraso', 'saida', 'atestado', 'falta', 'amamentacao'].map(type => (
                  <label key={type} className={`radio-btn ${occType === type ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="modal-occ-type" 
                      value={type}
                      checked={occType === type}
                      onChange={() => setOccType(type)}
                    />
                    <span>{type === 'saida' ? 'Saída Ant.' : type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <form onSubmit={handleSaveOccurrence}>
              <div className="form-body">
                {/* Seleção do Aluno (Autocomplete se não houver um predefinido) */}
                <div className="form-row">
                  <div className="form-group col-8">
                    <label>Nome da Criança*</label>
                    <div className="autocomplete-wrapper">
                      <input 
                        type="text" 
                        placeholder="Digite o nome da criança para buscar..."
                        value={modalSearchQuery}
                        onChange={(e) => {
                          setModalSearchQuery(e.target.value);
                          if (selectedStudentForOcc) {
                            setSelectedStudentForOcc(null);
                          }
                        }}
                        disabled={!!selectedStudentForOcc}
                        required
                      />
                      {modalSearchResults.length > 0 && (
                        <div className="autocomplete-dropdown active">
                          {modalSearchResults.map(student => (
                            <div 
                              key={student.id} 
                              className="autocomplete-item"
                              onClick={() => {
                                setSelectedStudentForOcc(student);
                                setModalSearchQuery(student.name);
                                setModalSearchResults([]);
                              }}
                            >
                              <strong>{student.name}</strong> - Sala {student.classroom}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="form-group col-4">
                    <label>Sala / Turma</label>
                    <input 
                      type="text" 
                      className="readonly-input" 
                      value={selectedStudentForOcc ? selectedStudentForOcc.classroom : 'Autopreenchimento'}
                      readOnly 
                    />
                  </div>
                </div>

                {/* DADOS DINÂMICOS: ATRASO */}
                {occType === 'atraso' && (
                  <div className="dynamic-fields-section">
                    <div className="form-row">
                      <div className="form-group col-6">
                        <label>Data do Atraso*</label>
                        <input 
                          type="date" 
                          required
                          value={atrasoForm.date}
                          onChange={(e) => setAtrasoForm({ ...atrasoForm, date: e.target.value })}
                        />
                      </div>
                      <div className="form-group col-6">
                        <label>Hora de Chegada*</label>
                        <input 
                          type="time" 
                          required
                          value={atrasoForm.time}
                          onChange={(e) => setAtrasoForm({ ...atrasoForm, time: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group col-6">
                        <label>Motivo do Atraso*</label>
                        <select 
                          required
                          value={atrasoForm.reason}
                          onChange={(e) => setAtrasoForm({ ...atrasoForm, reason: e.target.value })}
                        >
                          <option value="">Selecione um motivo</option>
                          <option value="Consulta médica">Consulta médica</option>
                          <option value="Trânsito">Trânsito</option>
                          <option value="Chuvas / Condições Climáticas">Chuvas / Condições Climáticas</option>
                          <option value="Dormiu pouco / Cansaço">Dormiu pouco / Cansaço</option>
                          <option value="Não se alimentou em casa">Não se alimentou em casa</option>
                          <option value="Informado por e-mail dos pais">Informado por e-mail dos pais</option>
                          <option value="Outros">Outros motivos</option>
                        </select>
                      </div>
                      <div className="form-group col-6">
                        <label>Nome do Responsável de Entrega*</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: Cláudia Santos (Mãe)"
                          value={atrasoForm.guardian}
                          onChange={(e) => setAtrasoForm({ ...atrasoForm, guardian: e.target.value })}
                        />
                      </div>
                    </div>

                    {atrasoForm.reason === 'Outros' && (
                      <div className="form-group">
                        <label>Especifique o Motivo Extraordinário*</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Digite o motivo..."
                          value={atrasoForm.customReason}
                          onChange={(e) => setAtrasoForm({ ...atrasoForm, customReason: e.target.value })}
                        />
                      </div>
                    )}
                    
                    <div className="form-group">
                      <label>Funcionário Responsável pela Acolhida</label>
                      <select 
                        value={atrasoForm.staff}
                        onChange={(e) => setAtrasoForm({ ...atrasoForm, staff: e.target.value })}
                      >
                        <option value="Auxiliar Jéssica">Auxiliar Jéssica</option>
                        <option value="Tia Solange">Tia Solange</option>
                        <option value="Coord. Ana Clara">Coord. Ana Clara</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Observações Adicionais</label>
                      <textarea 
                        rows={2}
                        placeholder="Observações importantes..."
                        value={atrasoForm.obs}
                        onChange={(e) => setAtrasoForm({ ...atrasoForm, obs: e.target.value })}
                      />
                    </div>

                    <SignaturePad 
                      id="atraso-signature"
                      label="Assinatura Digital do Responsável de Entrega*"
                      onSave={(dataUrl) => setAtrasoForm({ ...atrasoForm, signature: dataUrl })}
                      onClear={() => setAtrasoForm({ ...atrasoForm, signature: '' })}
                    />
                  </div>
                )}

                {/* DADOS DINÂMICOS: SAÍDA ANTECIPADA */}
                {occType === 'saida' && (
                  <div className="dynamic-fields-section">
                    <div className="form-row">
                      <div className="form-group col-6">
                        <label>Data da Saída*</label>
                        <input 
                          type="date" 
                          required
                          value={saidaForm.date}
                          onChange={(e) => setSaidaForm({ ...saidaForm, date: e.target.value })}
                        />
                      </div>
                      <div className="form-group col-6">
                        <label>Horário de Retirada*</label>
                        <input 
                          type="time" 
                          required
                          value={saidaForm.time}
                          onChange={(e) => setSaidaForm({ ...saidaForm, time: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group col-6">
                        <label>Motivo da Saída Antecipada*</label>
                        <select 
                          required
                          value={saidaForm.reason}
                          onChange={(e) => setSaidaForm({ ...saidaForm, reason: e.target.value })}
                        >
                          <option value="">Selecione um motivo</option>
                          <option value="Consulta médica / Tratamento">Consulta médica / Tratamento</option>
                          <option value="Viagem / Compromisso familiar">Viagem / Compromisso familiar</option>
                          <option value="Criança indisposta / Mal-estar na escola">Criança indisposta / Mal-estar na escola</option>
                          <option value="Recomendação psicológica/terapêutica">Recomendação psicológica/terapêutica</option>
                          <option value="Outros">Outros motivos autorizados</option>
                        </select>
                      </div>
                      <div className="form-group col-6">
                        <label>Retirado por (Responsável Autorizado)*</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: Cláudio Nogueira (Pai)"
                          value={saidaForm.guardian}
                          onChange={(e) => setSaidaForm({ ...saidaForm, guardian: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group col-6">
                        <label>Criança Retornará Hoje?*</label>
                        <div className="module-radio-buttons" style={{ marginTop: '4px' }}>
                          <label className={`radio-btn ${saidaForm.hasReturn === 'sim' ? 'active' : ''}`}>
                            <input 
                              type="radio" 
                              name="has-return" 
                              value="sim" 
                              checked={saidaForm.hasReturn === 'sim'}
                              onChange={() => setSaidaForm({ ...saidaForm, hasReturn: 'sim' })}
                            />
                            <span>Sim</span>
                          </label>
                          <label className={`radio-btn ${saidaForm.hasReturn === 'nao' ? 'active' : ''}`}>
                            <input 
                              type="radio" 
                              name="has-return" 
                              value="nao" 
                              checked={saidaForm.hasReturn === 'nao'}
                              onChange={() => setSaidaForm({ ...saidaForm, hasReturn: 'nao' })}
                            />
                            <span>Não</span>
                          </label>
                        </div>
                      </div>
                      {saidaForm.hasReturn === 'sim' && (
                        <div className="form-group col-6">
                          <label>Horário Previsto de Retorno*</label>
                          <input 
                            type="time" 
                            required
                            value={saidaForm.returnTime}
                            onChange={(e) => setSaidaForm({ ...saidaForm, returnTime: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Observações Importantes</label>
                      <textarea 
                        rows={2}
                        placeholder="Quaisquer observações ou recomendações..."
                        value={saidaForm.obs}
                        onChange={(e) => setSaidaForm({ ...saidaForm, obs: e.target.value })}
                      />
                    </div>

                    <SignaturePad 
                      id="saida-signature"
                      label="Assinatura Digital do Responsável pela Retirada*"
                      onSave={(dataUrl) => setSaidaForm({ ...saidaForm, signature: dataUrl })}
                      onClear={() => setSaidaForm({ ...saidaForm, signature: '' })}
                    />
                  </div>
                )}

                {/* DADOS DINÂMICOS: ATESTADO MÉDICO */}
                {occType === 'atestado' && (
                  <div className="dynamic-fields-section">
                    <div className="form-row">
                      <div className="form-group col-6">
                        <label>Data de Apresentação*</label>
                        <input 
                          type="date" 
                          required
                          value={atestadoForm.date}
                          onChange={(e) => setAtestadoForm({ ...atestadoForm, date: e.target.value })}
                        />
                      </div>
                      <div className="form-group col-6">
                        <label>Data de Início do Afastamento*</label>
                        <input 
                          type="date" 
                          required
                          value={atestadoForm.startDate}
                          onChange={(e) => setAtestadoForm({ ...atestadoForm, startDate: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group col-6">
                        <label>Quantidade de Dias de Licença*</label>
                        <input 
                          type="number" 
                          required 
                          min={1} 
                          max={30}
                          value={atestadoForm.days}
                          onChange={(e) => setAtestadoForm({ ...atestadoForm, days: e.target.value })}
                        />
                      </div>
                      <div className="form-group col-6">
                        <label>Data Final Prevista (Calculada)</label>
                        <input 
                          type="date" 
                          className="readonly-input"
                          value={atestadoForm.endDate}
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group col-6">
                        <label>Diagnóstico Declarado (Causa)*</label>
                        <select 
                          required
                          value={atestadoForm.reason}
                          onChange={(e) => setAtestadoForm({ ...atestadoForm, reason: e.target.value })}
                        >
                          <option value="">Selecione a enfermidade</option>
                          <option value="Gripe / Resfriado comum">Gripe / Resfriado comum</option>
                          <option value="Gastroenterite / Vômito / Diarreia">Gastroenterite / Vômito / Diarreia</option>
                          <option value="Febre em investigação">Febre em investigação</option>
                          <option value="Conjuntivite infecciosa">Conjuntivite infecciosa</option>
                          <option value="Catapora / Varicela">Catapora / Varicela</option>
                          <option value="Bronquite / Crise Respiratória">Bronquite / Crise Respiratória</option>
                          <option value="Otite média aguda">Otite média aguda</option>
                          <option value="Outros">Outras causas clínicas</option>
                        </select>
                      </div>
                      <div className="form-group col-6">
                        <label>Código CID-10 Informado*</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="Ex: J11"
                          value={atestadoForm.cid}
                          onChange={(e) => setAtestadoForm({ ...atestadoForm, cid: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Observações Clínicas/Cuidados Especiais</label>
                      <textarea 
                        rows={2}
                        placeholder="Cuidados, medicamentos ou observações médicas..."
                        value={atestadoForm.obs}
                        onChange={(e) => setAtestadoForm({ ...atestadoForm, obs: e.target.value })}
                      />
                    </div>

                    {/* Simulação Premium de Upload/Digitalização de Arquivo */}
                    <div className="form-group">
                      <label>Digitalizar Atestado Médico Comprovante*</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                        <button 
                          type="button" 
                          className="secondary-btn" 
                          onClick={handleAtestadoFileChange}
                          style={{ border: '1px dashed var(--color-primary)' }}
                        >
                          📸 Digitalizar Atestado
                        </button>
                        {atestadoForm.filePreview && <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Atestado Carregado e Validado</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* DADOS DINÂMICOS: FALTA */}
                {occType === 'falta' && (
                  <div className="dynamic-fields-section">
                    <div className="form-row">
                      <div className="form-group col-6">
                        <label>Data da Ausência*</label>
                        <input 
                          type="date" 
                          required
                          value={faltaForm.date}
                          onChange={(e) => setFaltaForm({ ...faltaForm, date: e.target.value })}
                        />
                      </div>
                      <div className="form-group col-6">
                        <label>Motivo Declarado*</label>
                        <select 
                          required
                          value={faltaForm.reason}
                          onChange={(e) => setFaltaForm({ ...faltaForm, reason: e.target.value })}
                        >
                          <option value="">Selecione um motivo</option>
                          <option value="Doença / Indisposição física">Doença / Indisposição física</option>
                          <option value="Compromisso familiar / Viagem">Compromisso familiar / Viagem</option>
                          <option value="Dificuldade de transporte / Logística">Dificuldade de transporte / Logística</option>
                          <option value="Condições climáticas / Chuva forte">Condições climáticas / Chuva forte</option>
                          <option value="Sem justificativa declarada">Sem justificativa declarada</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group col-6">
                        <label>Falta Justificada por Escrito?*</label>
                        <div className="module-radio-buttons" style={{ marginTop: '4px' }}>
                          <label className={`radio-btn ${faltaForm.justified === 'sim' ? 'active' : ''}`}>
                            <input 
                              type="radio" 
                              name="falta-just" 
                              value="sim" 
                              checked={faltaForm.justified === 'sim'}
                              onChange={() => setFaltaForm({ ...faltaForm, justified: 'sim' })}
                            />
                            <span>Sim</span>
                          </label>
                          <label className={`radio-btn ${faltaForm.justified === 'nao' ? 'active' : ''}`}>
                            <input 
                              type="radio" 
                              name="falta-just" 
                              value="nao" 
                              checked={faltaForm.justified === 'nao'}
                              onChange={() => setFaltaForm({ ...faltaForm, justified: 'nao' })}
                            />
                            <span>Não</span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="form-group col-6">
                        <label>Houve Aviso Prévio dos Pais?*</label>
                        <div className="module-radio-buttons" style={{ marginTop: '4px' }}>
                          <label className={`radio-btn ${faltaForm.notified === 'sim' ? 'active' : ''}`}>
                            <input 
                              type="radio" 
                              name="falta-not" 
                              value="sim" 
                              checked={faltaForm.notified === 'sim'}
                              onChange={() => setFaltaForm({ ...faltaForm, notified: 'sim' })}
                            />
                            <span>Sim</span>
                          </label>
                          <label className={`radio-btn ${faltaForm.notified === 'nao' ? 'active' : ''}`}>
                            <input 
                              type="radio" 
                              name="falta-not" 
                              value="nao" 
                              checked={faltaForm.notified === 'nao'}
                              onChange={() => setFaltaForm({ ...faltaForm, notified: 'nao' })}
                            />
                            <span>Não</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Mensagem/Justificativa da Família</label>
                      <textarea 
                        rows={3}
                        placeholder="Copie aqui a mensagem recebida ou justificativa dos pais..."
                        value={faltaForm.obs}
                        onChange={(e) => setFaltaForm({ ...faltaForm, obs: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* DADOS DINÂMICOS: AMAMENTAÇÃO */}
                {occType === 'amamentacao' && (
                  <div className="dynamic-fields-section">
                    <div className="form-row">
                      <div className="form-group col-4">
                        <label>Data de Uso*</label>
                        <input 
                          type="date" 
                          required
                          value={amamentacaoForm.date}
                          onChange={(e) => setAmamentacaoForm({ ...amamentacaoForm, date: e.target.value })}
                        />
                      </div>
                      <div className="form-group col-4">
                        <label>Hora de Entrada*</label>
                        <input 
                          type="time" 
                          required
                          value={amamentacaoForm.timeIn}
                          onChange={(e) => setAmamentacaoForm({ ...amamentacaoForm, timeIn: e.target.value })}
                        />
                      </div>
                      <div className="form-group col-4">
                        <label>Hora de Saída*</label>
                        <input 
                          type="time" 
                          required
                          value={amamentacaoForm.timeOut}
                          onChange={(e) => setAmamentacaoForm({ ...amamentacaoForm, timeOut: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Nome da Mãe Acompanhante*</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ex: Cláudia Nogueira"
                        value={amamentacaoForm.guardian}
                        onChange={(e) => setAmamentacaoForm({ ...amamentacaoForm, guardian: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Notas Clínicas / Condições do Bebê</label>
                      <textarea 
                        rows={3}
                        placeholder="Ex: Mamou super bem. Apresentou sonolência natural pós-alimentação."
                        value={amamentacaoForm.obs}
                        onChange={(e) => setAmamentacaoForm({ ...amamentacaoForm, obs: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setIsOccurrenceModalOpen(false)}>Cancelar</button>
                <button type="submit" className="primary-btn">Salvar Ocorrência</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================
          MODAL: VISUALIZAR COMPROVANTE / RECEIPT
          ================================================================== */}
      {isReceiptModalOpen && activeReceipt && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h2>Visualizar Comprovante Escolar</h2>
              <button className="modal-close-btn" onClick={() => setIsReceiptModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" id="view-record-modal-body" style={{ padding: '20px' }}>
              <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '16px', backgroundColor: 'var(--bg-app)' }}>
                <div style={{ textAlign: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '12px' }}>
                  <h3>🧸 EducaGestão Creche</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Comprovante de Registro Único de Ocorrência</span>
                </div>
                
                <p style={{ margin: '6px 0' }}><strong>Tipo de Ocorrência:</strong> {activeReceipt.type.toUpperCase()}</p>
                <p style={{ margin: '6px 0' }}><strong>Criança:</strong> {activeReceipt.studentName}</p>
                <p style={{ margin: '6px 0' }}><strong>Sala / Turma:</strong> {activeReceipt.classroom}</p>
                <p style={{ margin: '6px 0' }}><strong>Data de Registro:</strong> {activeReceipt.date.split('-').reverse().join('/')}</p>
                
                {activeReceipt.type === 'atraso' && (
                  <>
                    <p style={{ margin: '6px 0' }}><strong>Horário de Chegada:</strong> {activeReceipt.time}</p>
                    <p style={{ margin: '6px 0' }}><strong>Responsável de Entrega:</strong> {activeReceipt.guardian}</p>
                    <p style={{ margin: '6px 0' }}><strong>Motivo Informado:</strong> {activeReceipt.motive}</p>
                    {activeReceipt.obs && <p style={{ margin: '6px 0' }}><strong>Observações:</strong> {activeReceipt.obs}</p>}
                  </>
                )}

                {activeReceipt.type === 'saida' && (
                  <>
                    <p style={{ margin: '6px 0' }}><strong>Horário de Retirada:</strong> {activeReceipt.time}</p>
                    <p style={{ margin: '6px 0' }}><strong>Retirado Por:</strong> {activeReceipt.guardian}</p>
                    <p style={{ margin: '6px 0' }}><strong>Motivo da Saída:</strong> {activeReceipt.motive}</p>
                    <p style={{ margin: '6px 0' }}><strong>Retornará Hoje?</strong> {activeReceipt.hasReturn === 'sim' ? `Sim (Horário: ${activeReceipt.returnTime})` : 'Não'}</p>
                    {activeReceipt.obs && <p style={{ margin: '6px 0' }}><strong>Observações:</strong> {activeReceipt.obs}</p>}
                  </>
                )}

                {activeReceipt.type === 'atestado' && (
                  <>
                    <p style={{ margin: '6px 0' }}><strong>Diagnóstico Clínico:</strong> {activeReceipt.motive}</p>
                    <p style={{ margin: '6px 0' }}><strong>Código CID-10:</strong> {activeReceipt.cid}</p>
                    <p style={{ margin: '6px 0' }}><strong>Afastamento Múltiplo:</strong> {activeReceipt.days} dias ({activeReceipt.startDate.split('-').reverse().join('/')} a {activeReceipt.endDate.split('-').reverse().join('/')})</p>
                    {activeReceipt.obs && <p style={{ margin: '6px 0' }}><strong>Prescrições de Cuidado:</strong> {activeReceipt.obs}</p>}
                  </>
                )}

                {/* Exibição da Assinatura ou Arquivo Preview */}
                {(activeReceipt.signature || activeReceipt.filePreview) && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', marginBottom: '8px' }}>
                      {activeReceipt.type === 'atestado' ? 'Atestado Médico Digitalizado' : 'Assinatura Digital Autorizada'}
                    </span>
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
              <button type="button" className="primary-btn" onClick={handlePrintReceipt}>
                <Printer size={16} /> Imprimir Comprovante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
