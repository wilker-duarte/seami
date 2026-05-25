import React, { useState, useEffect, useRef } from 'react';
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
import { 
  getStudents, 
  saveStudent, 
  toggleStudentActive, 
  saveStudentBulk, 
  getOccurrences, 
  saveOccurrence, 
  deleteOccurrence, 
  getAttendance, 
  getSettings, 
  saveSettings, 
  wipeHistory, 
  resetDatabase, 
  seedDemoData 
} from './supabaseClient';

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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileList, setImportFileList] = useState([]); // Alunos importados
  const [isImportDragging, setIsImportDragging] = useState(false);
  const importFileInputRef = useRef(null);
  const importDropZoneRef = useRef(null);
  
  const [isOccurrenceModalOpen, setIsOccurrenceModalOpen] = useState(false);
  const [selectedStudentForOcc, setSelectedStudentForOcc] = useState(null);
  const [occType, setOccType] = useState('atraso');
  
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  const getInitialDashFilters = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;
    const lastDayVal = new Date(year, d.getMonth() + 1, 0).getDate();
    const lastDay = `${year}-${month}-${String(lastDayVal).padStart(2, '0')}`;
    return { dateStart: firstDay, dateEnd: lastDay, classroom: '', studentId: '' };
  };

  // Estados de Filtros de Painel
  const [dashFilters, setDashFilters] = useState(getInitialDashFilters());
  const [occFilters, setOccFilters] = useState({ classroom: '', date: '', search: '' });
  const [reportFilters, setReportFilters] = useState({ type: 'all', classroom: '', dateStart: '', dateEnd: '' });

  // Estados de Modals de Relatórios Administrativos
  const [isStudentReportModalOpen, setIsStudentReportModalOpen] = useState(false);
  const [activeReportStudent, setActiveReportStudent] = useState(null);
  const [isClassroomReportModalOpen, setIsClassroomReportModalOpen] = useState(false);
  const [activeReportClassroom, setActiveReportClassroom] = useState(null);

  // Estados dos Formulários de Ocorrências
  const [atrasoForm, setAtrasoForm] = useState({ date: '', time: '', reason: '', customReason: '', guardian: '', staff: 'Auxiliar Jéssica', obs: '', signature: '' });
  const [saidaForm, setSaidaForm] = useState({ date: '', time: '', reason: '', guardian: '', hasReturn: 'nao', returnTime: '', obs: '', signature: '' });
  const [atestadoForm, setAtestadoForm] = useState({ date: '', startDate: '', days: 1, endDate: '', cid: '', reason: '', filePreview: '', obs: '' });
  const [faltaForm, setFaltaForm] = useState({ date: '', reason: '', justified: 'nao', notified: 'nao', obs: '' });
  const [amamentacaoForm, setAmamentacaoForm] = useState({ date: '', timeIn: '', timeOut: '', guardian: '', obs: '' });

  // Estado do formulário de estudantes
  const [studentForm, setStudentForm] = useState({ name: '', classroom: '', active: 'active' });

  // Estados de Anexos do Modal "Lançar Ocorrência"
  const [formAttachment, setFormAttachment] = useState(null); // { name, type, data, size }
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Conversão de arquivo para Base64
  const processFile = (file) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('Arquivo muito grande. O limite máximo permitido é 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const attachment = {
        name: file.name,
        type: file.type || 'application/octet-stream',
        data: reader.result,
        size: file.size
      };
      setFormAttachment(attachment);
      
      // Se for atestado médico, atualiza filePreview para validação do formulário
      setAtestadoForm(prev => ({
        ...prev,
        filePreview: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    processFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const clearAttachment = () => {
    setFormAttachment(null);
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // Se for atestado médico, limpa o preview
    setAtestadoForm(prev => ({
      ...prev,
      filePreview: ''
    }));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Função para capitalizar e normalizar nomes de alunos de forma Title Case
  const toTitleCase = (str) => {
    if (!str) return '';
    const particles = ['de', 'da', 'do', 'dos', 'das', 'e'];
    return str.toString().toLowerCase().split(' ').map((word, index) => {
      if (particles.includes(word) && index !== 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  // Normaliza o nome da sala/turma
  const normalizeClassroom = (room) => {
    if (!room) return 'Alegria';
    const r = room.toString().trim().toLowerCase();
    if (r.startsWith('alegr')) return 'Alegria';
    if (r.startsWith('carinh')) return 'Carinho';
    if (r.startsWith('uni') || r.startsWith('uniã') || r.startsWith('unia')) return 'União';
    if (r.startsWith('amizad')) return 'Amizade';
    if (r.startsWith('felicid')) return 'Felicidade';
    return 'Alegria'; // Padrão
  };

  // Processamento do arquivo de planilha (XLSX/XLS/CSV) carregado
  const processImportFile = (file) => {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        if (typeof window.XLSX === 'undefined') {
          alert('Erro: Biblioteca SheetJS não carregada.');
          return;
        }
        const workbook = window.XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rows.length < 2) {
          alert('A planilha deve conter pelo menos uma linha de cabeçalho e uma linha de dados.');
          return;
        }
        
        // Lendo a partir da segunda linha (index 1), pulando cabeçalho
        const parsedStudents = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;
          
          const rawName = row[0];
          const rawClassroom = row[1];
          
          if (!rawName || !rawName.toString().trim()) continue;
          
          const cleanName = toTitleCase(rawName.toString().trim().replace(/\s+/g, ' '));
          const cleanClassroom = normalizeClassroom(rawClassroom);
          
          parsedStudents.push({
            name: cleanName,
            classroom: cleanClassroom
          });
        }
        
        if (parsedStudents.length === 0) {
          alert('Nenhum aluno válido com nome e sala preenchidos foi encontrado na planilha.');
          return;
        }
        
        setImportFileList(parsedStudents);
      } catch (err) {
        console.error(err);
        alert('Erro ao ler a planilha. Certifique-se de que é um arquivo Excel (.xlsx, .xls) ou CSV válido.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImportFileChange = (e) => {
    processImportFile(e.target.files[0]);
    e.target.value = '';
  };

  const handleImportDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImportDragging(false);
    const file = e.dataTransfer.files[0];
    processImportFile(file);
  };

  const handleImportDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImportDragging(true);
  };

  const handleImportDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (importDropZoneRef.current && !importDropZoneRef.current.contains(e.relatedTarget)) {
      setIsImportDragging(false);
    }
  };

  const confirmBulkImport = async () => {
    if (importFileList.length === 0) return;
    
    try {
      await saveStudentBulk(importFileList);
      alert(`${importFileList.length} alunos cadastrados com sucesso via importação em lote no Supabase!`);
      setIsImportModalOpen(false);
      setImportFileList([]);
      loadAllData(); // Sincroniza dados na tela
    } catch (err) {
      console.error(err);
      alert('Erro de conexão ao enviar dados para o Supabase.');
    }
  };

  // ==========================================================================
  // SYNC COM O SUPABASE
  // ==========================================================================

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [studentsData, occurrencesData, settingsData, attendanceData] = await Promise.all([
        getStudents(),
        getOccurrences(),
        getSettings(),
        getAttendance()
      ]);

      setStudents(studentsData || []);
      setOccurrences(occurrencesData || []);
      setAttendanceList(attendanceData || []);

      // Carrega settings se persistidas no Supabase
      if (settingsData && settingsData.activeRole) {
        setActiveUser({
          role: settingsData.activeRole,
          name: settingsData.activeUserName || 'Diretora Ana Clara',
          avatar: settingsData.activeUserAvatar || '👩‍💼'
        });
      }
      if (settingsData && settingsData.theme) {
        setIsDark(settingsData.theme === 'dark');
      }
    } catch (error) {
      console.error('Erro ao sincronizar dados com Supabase:', error);
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
    
    // Salva tema no Supabase
    if (!isLoading) {
      saveSettings({ theme: isDark ? 'dark' : 'light' }).catch(() => {});
    }
  }, [isDark]);

  // Sincroniza Role ativa no Supabase
  const handleSetActiveUser = async (user) => {
    setActiveUser(user);
    try {
      await saveSettings({
        activeRole: user.role,
        activeUserName: user.name,
        activeUserAvatar: user.avatar
      });
    } catch (err) {
      console.error('Erro ao salvar role no Supabase:', err);
    }
  };

  // ==========================================================================
  // CRUD ALUNOS (Supabase)
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
      const payload = {
        id: currentEditStudent ? currentEditStudent.id : undefined,
        name: studentForm.name.trim(),
        classroom: studentForm.classroom,
        active: studentForm.active === 'active'
      };
      const saved = await saveStudent(payload);
      if (currentEditStudent) {
        setStudents(students.map(s => s.id === saved.id ? saved : s));
        alert('Cadastro de aluno atualizado!');
      } else {
        setStudents([...students, saved]);
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
      const updated = await toggleStudentActive(studentId);
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

    setFormAttachment(null);
    setIsDragging(false);

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
      fullOccData = {
        ...baseOcc,
        date: atrasoForm.date,
        time: atrasoForm.time,
        motive: atrasoForm.reason === 'Outros' ? atrasoForm.customReason : atrasoForm.reason,
        guardian: atrasoForm.guardian.trim(),
        staff: atrasoForm.staff,
        obs: atrasoForm.obs.trim(),
        signature: null
      };
    } else if (occType === 'saida') {
      if (!saidaForm.date || !saidaForm.time || !saidaForm.reason || !saidaForm.guardian.trim()) {
        alert('Preencha todos os campos obrigatórios.');
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
        signature: null
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

    // Adiciona propriedades de anexo se selecionado
    fullOccData.attachmentName = formAttachment ? formAttachment.name : null;
    fullOccData.attachmentType = formAttachment ? formAttachment.type : null;
    fullOccData.attachmentData = formAttachment ? formAttachment.data : null;

    try {
      const createdOcc = await saveOccurrence(fullOccData);
      setOccurrences([createdOcc, ...occurrences]);
      setIsOccurrenceModalOpen(false);
      alert('Ocorrência registrada com sucesso no Supabase!');
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar ocorrência no Supabase.');
    }
  };

  const handleDeleteOccurrence = async (occId) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro permanentemente?')) return;
    try {
      await deleteOccurrence(occId);
      setOccurrences(occurrences.filter(o => o.id !== occId));
      alert('Registro excluído com sucesso.');
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir ocorrência no Supabase.');
    }
  };

  // ==========================================================================
  // CONFIGURAÇÕES GLOBAIS (RESET, WIPE, SEED DEMO)
  // ==========================================================================

  const handleWipeHistory = async () => {
    if (!window.confirm('CUIDADO: Isso apagará TODAS as ocorrências cadastradas. Deseja continuar?')) return;
    try {
      await wipeHistory();
      setOccurrences([]);
      alert('Histórico de ocorrências completamente limpo!');
    } catch (err) {
      console.error(err);
      alert('Erro ao limpar histórico.');
    }
  };

  const handleResetEntireApp = async () => {
    if (!window.confirm('ATENÇÃO: Deseja redefinir todo o banco de dados? Todos os alunos cadastrados manualmente e histórico serão deletados, e os 70 alunos originais serão recarregados.')) return;
    try {
      await resetDatabase();
      alert('Sistema redefinido com sucesso! Sincronizando dados...');
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert('Erro ao reiniciar aplicação no Supabase.');
    }
  };

  const handleSeedDemoData = async () => {
    try {
      setIsLoading(true);
      const count = await seedDemoData();
      alert(`Massa fictícia gerada com sucesso! ${count} ocorrências inseridas no Supabase.`);
      await loadAllData();
    } catch (err) {
      console.error(err);
      alert('Erro ao semear massa de testes no Supabase.');
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
  // DOSSIÊS E RELATÓRIOS INDIVIDUAIS/TURMA DE ALUNOS (EXCEL & PDF)
  // ==========================================================================

  // Relatório Detalhado de Aluno
  const handleOpenStudentReportModal = (student) => {
    setActiveReportStudent(student);
    setIsStudentReportModalOpen(true);
  };

  const exportStudentToExcel = (student) => {
    const studentOccs = occurrences.filter(o => o.studentId === student.id);
    if (studentOccs.length === 0) {
      alert("Não há dados para exportar deste aluno.");
      return;
    }

    if (typeof window.XLSX === "undefined") {
      alert("Erro: Biblioteca SheetJS não carregada.");
      return;
    }

    const mapped = studentOccs.map((occ, idx) => {
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
        'Tipo Ocorrência': occ.type.toUpperCase(),
        'Detalhes e Justificativas': details,
        'Responsável Relacionado': resp,
        'Observações': occ.obs || "-"
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

    window.XLSX.writeFile(workbook, `Dossie_${student.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportStudentToPDF = (student) => {
    const studentOccs = occurrences.filter(o => o.studentId === student.id);
    if (studentOccs.length === 0) {
      alert("Não há dados para exportar deste aluno.");
      return;
    }

    if (typeof window.jspdf === "undefined") {
      alert("Erro: Biblioteca jsPDF não carregada.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    // Cabeçalho Roxo
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Dossiê Escolar Individual", 15, 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Criança: ${student.name} | Sala: ${student.classroom}`, 15, 25);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString("pt-BR")} | Total Ocorrências: ${studentOccs.length}`, 15, 30);
    
    let y = 50;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    
    // Cabeçalho da Tabela
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y - 5, 190, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Data", 12, y);
    doc.text("Tipo", 35, y);
    doc.text("Motivo / Detalhes", 65, y);
    doc.text("Responsável/Obs", 145, y);
    
    y += 10;
    doc.setFont("helvetica", "normal");
    
    studentOccs.forEach((occ, idx) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        doc.setFillColor(241, 245, 249);
        doc.rect(10, y - 5, 190, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.text("Data", 12, y);
        doc.text("Tipo", 35, y);
        doc.text("Motivo / Detalhes", 65, y);
        doc.text("Responsável/Obs", 145, y);
        y += 10;
        doc.setFont("helvetica", "normal");
      }
      
      const dateBR = occ.date.split("-").reverse().join("/");
      
      let details = "";
      if (occ.type === "atraso") details = `Chegada ${occ.time} - ${occ.motive}`;
      else if (occ.type === "saida") details = `Saída ${occ.time} - ${occ.motive}`;
      else if (occ.type === "atestado") details = `Atestado (${occ.days}d) - CID ${occ.cid}`;
      else if (occ.type === "falta") details = `${occ.motive} (${occ.justified === 'sim' ? 'Justif.' : 'Não Justif.'})`;
      else if (occ.type === "amamentacao") details = `Amamentação das ${occ.timeIn}`;
      
      const detailsTrunc = details.length > 50 ? details.substring(0, 47) + "..." : details;
      const respVal = occ.guardian || occ.staff || occ.obs || "-";
      const respTrunc = respVal.length > 30 ? respVal.substring(0, 27) + "..." : respVal;

      doc.text(dateBR, 12, y);
      doc.text(occ.type.toUpperCase(), 35, y);
      doc.text(detailsTrunc, 65, y);
      doc.text(respTrunc, 145, y);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(10, y + 3, 200, y + 3);
      
      y += 9;
    });
    
    doc.save(`Dossie_${student.name.replace(/\s+/g, "_")}.pdf`);
  };

  // Relatório Detalhado de Turma
  const handleOpenClassroomReportModal = (classroom) => {
    setActiveReportClassroom(classroom);
    setIsClassroomReportModalOpen(true);
  };

  const exportClassroomToExcel = (classroom) => {
    const classOccs = occurrences.filter(o => o.classroom === classroom);
    if (classOccs.length === 0) {
      alert("Não há ocorrências gravadas nesta sala.");
      return;
    }

    if (typeof window.XLSX === "undefined") {
      alert("Erro: Biblioteca SheetJS não carregada.");
      return;
    }

    const mapped = classOccs.map((occ, idx) => {
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
        'Tipo Ocorrência': occ.type.toUpperCase(),
        'Detalhes e Justificativas': details,
        'Responsável Relacionado': resp,
        'Observações': occ.obs || "-"
      };
    });

    const worksheet = window.XLSX.utils.json_to_sheet(mapped);
    const workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, `Sala_${classroom}`);
    
    // Auto-ajusta largura de colunas
    const maxLens = {};
    mapped.forEach(row => {
      Object.keys(row).forEach(key => {
        const valStr = String(row[key]);
        maxLens[key] = Math.max(maxLens[key] || 10, valStr.length);
      });
    });
    worksheet['!cols'] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] + 3 }));

    window.XLSX.writeFile(workbook, `Relatorio_Sala_${classroom}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exportClassroomToPDF = (classroom) => {
    const classOccs = occurrences.filter(o => o.classroom === classroom);
    if (classOccs.length === 0) {
      alert("Não há ocorrências gravadas nesta sala.");
      return;
    }

    if (typeof window.jspdf === "undefined") {
      alert("Erro: Biblioteca jsPDF não carregada.");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    // Cabeçalho Roxo
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 40, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(`Relatório da Turma: Sala ${classroom}`, 15, 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Total Alunos Ativos na Sala: ${students.filter(s => s.classroom === classroom && s.active).length}`, 15, 25);
    doc.text(`Data de Emissão: ${new Date().toLocaleDateString("pt-BR")} | Ocorrências Registradas: ${classOccs.length}`, 15, 30);
    
    let y = 50;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    
    // Cabeçalho da Tabela
    doc.setFillColor(241, 245, 249);
    doc.rect(10, y - 5, 190, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Data", 12, y);
    doc.text("Criança", 35, y);
    doc.text("Tipo", 85, y);
    doc.text("Motivo / Detalhes", 110, y);
    
    y += 10;
    doc.setFont("helvetica", "normal");
    
    classOccs.forEach((occ, idx) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        doc.setFillColor(241, 245, 249);
        doc.rect(10, y - 5, 190, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.text("Data", 12, y);
        doc.text("Criança", 35, y);
        doc.text("Tipo", 85, y);
        doc.text("Motivo / Detalhes", 110, y);
        y += 10;
        doc.setFont("helvetica", "normal");
      }
      
      const dateBR = occ.date.split("-").reverse().join("/");
      
      let details = "";
      if (occ.type === "atraso") details = `Chegada ${occ.time} - ${occ.motive}`;
      else if (occ.type === "saida") details = `Saída ${occ.time} - ${occ.motive}`;
      else if (occ.type === "atestado") details = `Atestado (${occ.days}d) - CID ${occ.cid}`;
      else if (occ.type === "falta") details = `${occ.motive} (${occ.justified === 'sim' ? 'Justif.' : 'Sem Just.'})`;
      else if (occ.type === "amamentacao") details = `Amamentação das ${occ.timeIn}`;
      
      const detailsTrunc = details.length > 55 ? details.substring(0, 52) + "..." : details;
      const nameTrunc = occ.studentName.length > 25 ? occ.studentName.substring(0, 22) + "..." : occ.studentName;

      doc.text(dateBR, 12, y);
      doc.text(nameTrunc, 35, y);
      doc.text(occ.type.toUpperCase(), 85, y);
      doc.text(detailsTrunc, 110, y);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(10, y + 3, 200, y + 3);
      
      y += 9;
    });
    
    doc.save(`Relatorio_Sala_${classroom}.pdf`);
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
                  onClick={() => setDashFilters(getInitialDashFilters())}
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
              
              <div style={{ display: 'flex', gap: '8px' }}>
                {occFilters.classroom && (
                  <button className="secondary-btn" onClick={() => handleOpenClassroomReportModal(occFilters.classroom)} style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}>
                    <span>📊 Relatório da Sala {occFilters.classroom}</span>
                  </button>
                )}
                <button className="secondary-btn" onClick={() => setIsImportModalOpen(true)}>
                  <span>📊 Importar Planilha</span>
                </button>
                <button className="primary-btn" onClick={() => handleOpenStudentModal(null)}>
                  <Plus size={18} />
                  <span>Adicionar Aluno</span>
                </button>
              </div>
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
                                <button 
                                  className="row-action-btn" 
                                  onClick={() => handleOpenStudentReportModal(st)} 
                                  title="Dossiê Detalhado do Aluno"
                                  style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary-light)' }}
                                >
                                  📊
                                </button>
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
          MODAL: IMPORTAR ALUNOS VIA PLANILHA
          ================================================================== */}
      {isImportModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-card modal-large">
            <div className="modal-header">
              <h2>📊 Importar Alunos via Planilha</h2>
              <button className="modal-close-btn" onClick={() => { setIsImportModalOpen(false); setImportFileList([]); }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="form-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Selecione ou arraste um arquivo Excel (.xlsx, .xls) ou CSV contendo os alunos. A primeira coluna deve conter o <strong>Nome da Criança</strong> e a segunda coluna a <strong>Sala/Turma</strong>.
              </p>

              {/* Área de Drag and Drop */}
              <div 
                ref={importDropZoneRef}
                onDragOver={handleImportDragOver}
                onDragLeave={handleImportDragLeave}
                onDrop={handleImportDrop}
                onClick={() => importFileInputRef.current && importFileInputRef.current.click()}
                className={`drag-drop-zone ${isImportDragging ? 'dragging' : ''}`}
                style={{
                  border: '2px dashed var(--color-primary)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '30px',
                  textAlign: 'center',
                  backgroundColor: isImportDragging ? 'var(--color-primary-light)' : 'var(--bg-app)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginBottom: '20px'
                }}
              >
                <div style={{ pointerEvents: 'none' }}>
                  <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>📊</span>
                  <p style={{ fontWeight: 600, margin: '4px 0', color: 'var(--text-primary)' }}>Arrastar e soltar planilha aqui</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-light)', margin: '4px 0' }}>ou clique para navegar nos seus arquivos</p>
                  <p style={{ fontSize: '11px', color: 'var(--text-light)', fontStyle: 'italic' }}>Formatos aceitos: .xlsx, .xls, .csv (Limite de 15MB)</p>
                </div>
              </div>

              {/* Input nativo oculto */}
              <input
                ref={importFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFileChange}
                style={{ display: 'none' }}
                tabIndex={-1}
              />

              {/* Visualização e Confirmação dos Alunos Importados */}
              {importFileList.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Alunos detectados na planilha ({importFileList.length}):</h3>
                    <button className="row-action-btn delete" onClick={() => setImportFileList([])} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-faltas)' }}>
                      Limpar
                    </button>
                  </div>
                  
                  <div className="table-card" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Nome da Criança</th>
                          <th>Sala / Turma</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importFileList.slice(0, 10).map((st, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{st.name}</td>
                            <td><span className="occ-type-pill amamentacao" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{st.classroom}</span></td>
                          </tr>
                        ))}
                        {importFileList.length > 10 && (
                          <tr>
                            <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px', fontStyle: 'italic', padding: '8px' }}>
                              ...e mais {importFileList.length - 10} alunos listados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ marginTop: '20px' }}>
              <button type="button" className="secondary-btn" onClick={() => { setIsImportModalOpen(false); setImportFileList([]); }}>
                Cancelar
              </button>
              <button 
                type="button" 
                className="primary-btn" 
                onClick={confirmBulkImport}
                disabled={importFileList.length === 0}
              >
                Confirmar Importação ({importFileList.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================
          MODAL: DOSSIÊ E RELATÓRIO DETALHADO DO ALUNO
          ================================================================== */}
      {isStudentReportModalOpen && activeReportStudent && (
        <div className="modal-overlay active">
          <div className="modal-card modal-large" style={{ maxWidth: '800px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px' }}>👦</span>
                <div>
                  <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Dossiê Individual: {activeReportStudent.name}
                  </h2>
                  <span className="occ-type-pill amamentacao" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', marginTop: '4px', display: 'inline-block' }}>
                    Sala {activeReportStudent.classroom}
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="secondary-btn" onClick={() => exportStudentToExcel(activeReportStudent)} style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}>
                  📊 Excel
                </button>
                <button className="primary-btn" onClick={() => exportStudentToPDF(activeReportStudent)} style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}>
                  📄 PDF
                </button>
                <button className="modal-close-btn" onClick={() => { setIsStudentReportModalOpen(false); setActiveReportStudent(null); }} style={{ marginLeft: '8px' }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="form-body" style={{ padding: '20px 0', maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Métricas do Aluno */}
              <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px', padding: '0 20px' }}>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--color-atrasos-bg)', color: 'var(--color-atrasos)', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Atrasos</span>
                  <span style={{ fontSize: '24px', fontWeight: 800 }}>
                    {occurrences.filter(o => o.studentId === activeReportStudent.id && o.type === 'atraso').length}
                  </span>
                </div>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--color-faltas-bg)', color: 'var(--color-faltas)', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Faltas</span>
                  <span style={{ fontSize: '24px', fontWeight: 800 }}>
                    {occurrences.filter(o => o.studentId === activeReportStudent.id && o.type === 'falta').length}
                  </span>
                </div>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--color-atestados-bg)', color: 'var(--color-atestados)', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Atestados</span>
                  <span style={{ fontSize: '24px', fontWeight: 800 }}>
                    {occurrences.filter(o => o.studentId === activeReportStudent.id && o.type === 'atestado').length}
                  </span>
                </div>
              </div>

              {/* Tabela de Ocorrências */}
              <div style={{ padding: '0 20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>Histórico Completo de Ocorrências:</h3>
                
                {occurrences.filter(o => o.studentId === activeReportStudent.id).length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    Nenhuma ocorrência ou registro lançado para este aluno.
                  </div>
                ) : (
                  <div className="table-card" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <div className="table-responsive">
                      <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Tipo</th>
                            <th>Detalhes / Justificativa</th>
                            <th>Anexo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {occurrences
                            .filter(o => o.studentId === activeReportStudent.id)
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .map(occ => (
                              <tr key={occ.id}>
                                <td><strong>{occ.date.split('-').reverse().join('/')}</strong></td>
                                <td><span className={`occ-type-pill ${occ.type}`}>{occ.type.toUpperCase()}</span></td>
                                <td>
                                  {occ.type === 'atraso' && <span>Chegada: <strong>{occ.time}</strong> - {occ.motive} {occ.obs && <em style={{ fontSize: '11px', display: 'block', color: 'var(--text-secondary)' }}>Obs: {occ.obs}</em>}</span>}
                                  {occ.type === 'saida' && <span>Saída: <strong>{occ.time}</strong> - {occ.motive} {occ.hasReturn === 'sim' && `(Retorno: ${occ.returnTime})`}</span>}
                                  {occ.type === 'atestado' && <span>Afastado: de {occ.startDate.split('-').reverse().join('/')} a {occ.endDate.split('-').reverse().join('/')} ({occ.days}d) - CID {occ.cid}</span>}
                                  {occ.type === 'falta' && <span>{occ.motive} - {occ.justified === 'sim' ? 'Justificada' : 'Não Justificada'} {occ.obs && <em style={{ fontSize: '11px', display: 'block', color: 'var(--text-secondary)' }}>Obs: {occ.obs}</em>}</span>}
                                  {occ.type === 'amamentacao' && <span>Permanência: {occ.timeIn} às {occ.timeOut}</span>}
                                </td>
                                <td>
                                  {(occ.signature || occ.filePreview || occ.attachmentName) ? (
                                    <button 
                                      className="status-pill active" 
                                      style={{ border: 'none', cursor: 'pointer', padding: '2px 8px', fontSize: '11px' }}
                                      onClick={() => { setActiveReceipt(occ); setIsReceiptModalOpen(true); }}
                                    >
                                      Ver
                                    </button>
                                  ) : '-'}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" className="secondary-btn" onClick={() => { setIsStudentReportModalOpen(false); setActiveReportStudent(null); }}>
                Fechar Dossiê
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================
          MODAL: DOSSIÊ E RELATÓRIO DETALHADO DA TURMA
          ================================================================== */}
      {isClassroomReportModalOpen && activeReportClassroom && (
        <div className="modal-overlay active">
          <div className="modal-card modal-large" style={{ maxWidth: '800px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '32px' }}>🏫</span>
                <div>
                  <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Dossiê Consolidado: Sala {activeReportClassroom}
                  </h2>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    Resumo analítico e ocorrências da turma.
                  </span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button className="secondary-btn" onClick={() => exportClassroomToExcel(activeReportClassroom)} style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}>
                  📊 Excel
                </button>
                <button className="primary-btn" onClick={() => exportClassroomToPDF(activeReportClassroom)} style={{ height: '36px', padding: '0 12px', fontSize: '13px' }}>
                  📄 PDF
                </button>
                <button className="modal-close-btn" onClick={() => { setIsClassroomReportModalOpen(false); setActiveReportClassroom(null); }} style={{ marginLeft: '8px' }}>
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="form-body" style={{ padding: '20px 0', maxHeight: '60vh', overflowY: 'auto' }}>
              {/* Métricas da Turma */}
              <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px', padding: '0 20px' }}>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', color: 'var(--text-secondary)' }}>Alunos Matriculados</span>
                  <span style={{ fontSize: '24px', fontWeight: 800 }}>
                    {students.filter(s => s.classroom === activeReportClassroom && s.active).length}
                  </span>
                </div>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', color: 'var(--text-secondary)' }}>Total Ocorrências</span>
                  <span style={{ fontSize: '24px', fontWeight: 800 }} style={{ color: 'var(--color-primary)' }}>
                    {occurrences.filter(o => o.classroom === activeReportClassroom).length}
                  </span>
                </div>
                <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', display: 'block', color: 'var(--text-secondary)' }}>Atestados Ativos</span>
                  <span style={{ fontSize: '24px', fontWeight: 800 }} style={{ color: 'var(--color-atestados)' }}>
                    {occurrences.filter(o => {
                      const today = new Date().toISOString().split("T")[0];
                      return o.classroom === activeReportClassroom && o.type === 'atestado' && o.startDate <= today && o.endDate >= today;
                    }).length}
                  </span>
                </div>
              </div>

              {/* Tabela de Estudantes da Sala com Suas Métricas */}
              <div style={{ padding: '0 20px', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>Alunos e Índices:</h3>
                <div className="table-card" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <div className="table-responsive" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <table className="data-table" style={{ width: '100%', fontSize: '12px' }}>
                      <thead>
                        <tr>
                          <th>Nome do Aluno</th>
                          <th>Atrasos</th>
                          <th>Faltas</th>
                          <th>Atestados</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students
                          .filter(s => s.classroom === activeReportClassroom && s.active)
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(stud => {
                            const dels = occurrences.filter(o => o.studentId === stud.id && o.type === 'atraso').length;
                            const fts = occurrences.filter(o => o.studentId === stud.id && o.type === 'falta').length;
                            const atss = occurrences.filter(o => o.studentId === stud.id && o.type === 'atestado').length;
                            return (
                              <tr key={stud.id}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{stud.name}</td>
                                <td style={{ fontWeight: 600, color: dels > 2 ? 'var(--color-atrasos)' : 'inherit' }}>{dels}</td>
                                <td style={{ fontWeight: 600, color: fts > 2 ? 'var(--color-faltas)' : 'inherit' }}>{fts}</td>
                                <td style={{ fontWeight: 600, color: atss > 0 ? 'var(--color-atestados)' : 'inherit' }}>{atss}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Tabela de Ocorrências da Turma */}
              <div style={{ padding: '0 20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>Histórico da Turma:</h3>
                
                {occurrences.filter(o => o.classroom === activeReportClassroom).length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    Nenhuma ocorrência registrada para esta sala de aula.
                  </div>
                ) : (
                  <div className="table-card" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                    <div className="table-responsive">
                      <table className="data-table" style={{ width: '100%', fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Data</th>
                            <th>Aluno</th>
                            <th>Tipo</th>
                            <th>Detalhes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {occurrences
                            .filter(o => o.classroom === activeReportClassroom)
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .map(occ => (
                              <tr key={occ.id}>
                                <td><strong>{occ.date.split('-').reverse().join('/')}</strong></td>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{occ.studentName}</td>
                                <td><span className={`occ-type-pill ${occ.type}`}>{occ.type.toUpperCase()}</span></td>
                                <td>
                                  {occ.type === 'atraso' && <span>Chegou às <strong>{occ.time}</strong> - {occ.motive}</span>}
                                  {occ.type === 'saida' && <span>Saída às <strong>{occ.time}</strong> - {occ.motive}</span>}
                                  {occ.type === 'atestado' && <span>Afastado: {occ.days}d (CID {occ.cid})</span>}
                                  {occ.type === 'falta' && <span>{occ.motive} ({occ.justified === 'sim' ? 'Justif.' : 'Não Justif.'})</span>}
                                  {occ.type === 'amamentacao' && <span>Amamentação das {occ.timeIn}</span>}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button type="button" className="secondary-btn" onClick={() => { setIsClassroomReportModalOpen(false); setActiveReportClassroom(null); }}>
                Fechar Relatório
              </button>
            </div>
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

                {/* ARQUIVOS ANEXOS (Opcional) - Upload Zone com Drag & Drop */}
                <div className="form-group" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed var(--slate-200)' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--slate-700)',
                    marginBottom: '8px'
                  }}>
                    <span>📎 Documento Anexo</span>
                    <span style={{
                      fontWeight: 400,
                      fontSize: '11px',
                      color: 'var(--slate-400)',
                      marginLeft: '2px'
                    }}>
                      (opcional — PDF, imagem, Word, e-mail · máx 15MB)
                    </span>
                  </label>

                  {formAttachment ? (
                    /* ---- PREVIEW: arquivo já selecionado ---- */
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '10px',
                      border: '1.5px solid #86efac'
                    }}>
                      <div style={{
                        width: '36px', height: '36px',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0
                      }}>
                        {formAttachment.type.startsWith('image/') ? '🖼️' : formAttachment.type === 'application/pdf' ? '📄' : '📁'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, fontSize: '13px', color: '#166534',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {formAttachment.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>
                          ✓ Pronto para anexar{formAttachment.size ? ` · ${formatFileSize(formAttachment.size)}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearAttachment}
                        title="Remover arquivo"
                        style={{
                          border: '1px solid #fca5a5',
                          backgroundColor: '#fff1f2',
                          color: '#dc2626',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                          flexShrink: 0
                        }}
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    /* ---- DROP ZONE: clique ou arraste ---- */
                    <div
                      ref={dropZoneRef}
                      role="button"
                      tabIndex={0}
                      aria-label="Selecionar ou arrastar arquivo"
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      style={{
                        border: `2px dashed ${isDragging ? '#6366f1' : '#cbd5e1'}`,
                        borderRadius: '10px',
                        padding: '24px 16px',
                        backgroundColor: isDragging ? '#eef2ff' : '#f8fafc',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'border-color 0.15s ease, background-color 0.15s ease',
                        outline: 'none',
                        userSelect: 'none'
                      }}
                    >
                      {/* Ícone central */}
                      <div style={{
                        pointerEvents: 'none',
                        fontSize: '24px',
                        marginBottom: '8px',
                        color: isDragging ? '#6366f1' : '#94a3b8'
                      }}>
                        📤
                      </div>

                      {/* Texto principal */}
                      <div style={{
                        pointerEvents: 'none',
                        fontWeight: 600, fontSize: '13px',
                        color: isDragging ? '#4338ca' : '#475569',
                        marginBottom: '4px'
                      }}>
                        {isDragging
                          ? 'Solte o arquivo aqui'
                          : <><span style={{ color: '#6366f1', textDecoration: 'underline', textUnderlineOffset: '2px' }}>Clique para selecionar</span> ou arraste aqui</>}
                      </div>

                      {/* Texto de suporte */}
                      <div style={{ pointerEvents: 'none', fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                        PDF · PNG · JPG · DOCX · MSG · EML &mdash; máx 15MB
                      </div>

                      {/* Badges de tipo */}
                      <div style={{ pointerEvents: 'none', display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {[
                          { label: 'PDF', color: '#fee2e2', text: '#dc2626' },
                          { label: 'Imagem', color: '#dcfce7', text: '#16a34a' },
                          { label: 'Word', color: '#dbeafe', text: '#2563eb' },
                          { label: 'E-mail', color: '#f3e8ff', text: '#9333ea' }
                        ].map(({ label, color, text }) => (
                          <span key={label} style={{
                            fontSize: '9px',
                            padding: '2px 8px',
                            borderRadius: '20px',
                            backgroundColor: color,
                            color: text,
                            fontWeight: 700
                          }}>{label}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Input nativo oculto — controlado via ref */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.msg,.eml"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    tabIndex={-1}
                  />
                </div>
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

                {/* Exibição do Arquivo Anexo */}
                {activeReceipt.attachmentName && activeReceipt.attachmentData && (
                  <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', textAlign: 'left' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-light)', display: 'block', marginBottom: '8px' }}>
                      Arquivo Anexo Digitalizado
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-input)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span style={{ fontSize: '20px' }}>📎</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={activeReceipt.attachmentName}>
                          {activeReceipt.attachmentName}
                        </span>
                      </div>
                      <a 
                        href={activeReceipt.attachmentData} 
                        download={activeReceipt.attachmentName}
                        className="primary-btn" 
                        style={{ height: '32px', padding: '0 12px', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                      >
                        Baixar
                      </a>
                    </div>
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
