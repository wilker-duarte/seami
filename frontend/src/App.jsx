import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { 
  X, 
  Printer 
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SignaturePad from './components/SignaturePad';
import DailyAttendance from './components/DailyAttendance';
import SeamiControl from './components/SeamiControl';
import { useAppContext } from './context/AppContext';

// Importação das Páginas Modularizadas
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import StudentsPage from './pages/StudentsPage';
import ReportsPage from './pages/ReportsPage';
import InsightsPage from './pages/InsightsPage';
import SettingsPage from './pages/SettingsPage';

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
  seedDemoData,
  getStaff,
  saveStaff,
  deleteStaff,
  deleteStudent,
  saveTurma,
  sanitizeInput
} from './supabaseClient';

export default function App() {
  const { 
    activeUser, 
    setActiveUser, 
    isDark, 
    setIsDark, 
    students, 
    setStudents, 
    turmasList, 
    setTurmasList, 
    isBootstrapping, 
    reloadAppData 
  } = useAppContext();

  // Estados de Roteamento e Menu
  const [activeTabInternal, setActiveTabState] = useState('home');
  const [activeModuleInternal, setActiveModuleState] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = activeTabInternal;
  const activeModule = activeModuleInternal;

  const setActiveModule = (mod) => {
    setActiveModuleState(mod);
  };

  // Mapeador de Abas de Rotas Reais para Estado Interno (Mantido para compatibilidade e controle do Sidebar/Header)
  useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/inicio') {
      setActiveTabState('home');
      setActiveModuleState(null);
    } else if (path === '/dashboard') {
      setActiveTabState('dashboard');
      setActiveModuleState(null);
    } else if (path === '/alunos') {
      setActiveTabState('students');
      setActiveModuleState(null);
    } else if (path === '/chamada') {
      setActiveTabState('attendance');
      setActiveModuleState('lancamento');
    } else if (path === '/chamada/consulta') {
      setActiveTabState('attendance');
      setActiveModuleState('consulta');
    } else if (path === '/caderno-seami') {
      setActiveTabState('seami_control');
      setActiveModuleState(null);
    } else if (path === '/caderno-seami/faltas') {
      setActiveTabState('seami_control');
      setActiveModuleState('falta');
    } else if (path === '/caderno-seami/atestados') {
      setActiveTabState('seami_control');
      setActiveModuleState('atestado');
    } else if (path === '/caderno-seami/atrasos') {
      setActiveTabState('seami_control');
      setActiveModuleState('atraso');
    } else if (path === '/caderno-seami/saidas') {
      setActiveTabState('seami_control');
      setActiveModuleState('saida');
    } else if (path === '/caderno-seami/amamentacao') {
      setActiveTabState('seami_control');
      setActiveModuleState('amamentacao');
    } else if (path === '/relatorios') {
      setActiveTabState('reports');
      setActiveModuleState(null);
    } else if (path === '/insights') {
      setActiveTabState('insights');
      setActiveModuleState(null);
    } else if (path === '/configuracoes') {
      if (activeUser && activeUser.role === 'auxiliar') {
        navigate('/');
      } else {
        setActiveTabState('settings');
        setActiveModuleState(null);
      }
    }
  }, [location.pathname, activeUser, navigate]);

  // Estados de Dados da API
  const [occurrences, setOccurrences] = useState([]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Modals
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [currentEditStaff, setCurrentEditStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({ name: '', role: 'diretora', avatar: '👩‍💼', desc: '' });
  
  const [isOccurrenceModalOpen, setIsOccurrenceModalOpen] = useState(false);
  const [isSavingOccurrence, setIsSavingOccurrence] = useState(false);
  const [selectedStudentForOcc, setSelectedStudentForOcc] = useState(null);
  const [occType, setOccType] = useState('atraso');
  
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState(null);

  // Estados dos Formulários de Ocorrências
  const [atrasoForm, setAtrasoForm] = useState({ date: '', time: '', reason: '', customReason: '', guardian: '', staff: 'Auxiliar Jéssica', obs: '', signature: '', justified: 'nao', notified: 'nao' });
  const [saidaForm, setSaidaForm] = useState({ date: '', time: '', reason: '', guardian: '', hasReturn: 'nao', returnTime: '', obs: '', signature: '' });
  const [atestadoForm, setAtestadoForm] = useState({ date: '', startDate: '', days: 1, endDate: '', cid: '', reason: '', filePreview: '', obs: '' });
  const [faltaForm, setFaltaForm] = useState({ date: '', startDate: '', endDate: '', reason: '', justified: 'nao', notified: 'nao', obs: '' });
  const [amamentacaoForm, setAmamentacaoForm] = useState({ date: '', timeIn: '', timeOut: '', guardian: '', obs: '' });

  // Estados de Anexos do Modal "Lançar Ocorrência"
  const [formAttachment, setFormAttachment] = useState(null);
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

  const handleSelectStudentOccurrenceFromHeader = (student) => {
    setSelectedStudentForOcc(student);
    setModalSearchQuery(student.name);
    setOccType('atraso');
    setIsOccurrenceModalOpen(true);
  };

  // ==========================================================================
  // SYNC COM O SUPABASE
  // ==========================================================================

  const loadAllData = async () => {
    try {
      setIsLoading(true);
      const [occurrencesData, attendanceData, staffData] = await Promise.all([
        getOccurrences(),
        getAttendance(),
        getStaff()
      ]);

      setOccurrences(occurrencesData || []);
      setAttendanceList(attendanceData || []);
      if (staffData && staffData.length > 0) {
        setStaffList(staffData);
      }
    } catch (error) {
      console.error('Erro ao sincronizar dados com Supabase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeUser) {
      loadAllData();
    }
  }, [activeUser]);

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
  }, [isDark]);

  // ==========================================================================
  // CRUD EQUIPE / FUNCIONÁRIOS (Supabase)
  // ==========================================================================

  const handleOpenStaffModal = (member = null) => {
    setCurrentEditStaff(member);
    if (member) {
      setStaffForm({
        name: member.name,
        role: member.role,
        avatar: member.avatar || '👩‍💼',
        desc: member.desc || ''
      });
    } else {
      setStaffForm({ name: '', role: 'diretora', avatar: '👩‍💼', desc: '' });
    }
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.role) {
      alert('Nome e nível de acesso são obrigatórios.');
      return;
    }

    try {
      const payload = {
        id: currentEditStaff ? currentEditStaff.id : undefined,
        name: staffForm.name.trim(),
        role: staffForm.role,
        avatar: staffForm.avatar || '👩‍💼',
        desc: staffForm.desc.trim()
      };
      
      const saved = await saveStaff(payload);
      if (currentEditStaff) {
        setStaffList(staffList.map(s => s.id === saved.id ? saved : s));
        alert('Cadastro de funcionário atualizado!');
      } else {
        setStaffList([...staffList, saved]);
        alert('Novo funcionário adicionado com sucesso!');
      }
      setIsStaffModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar funcionário:', err);
      alert('Erro ao salvar registro de funcionário.');
    }
  };

  const handleDeleteStaffMember = async (staffId) => {
    if (!window.confirm('Tem certeza que deseja remover este funcionário?')) return;
    try {
      await deleteStaff(staffId);
      setStaffList(staffList.filter(s => s.id !== staffId));
      alert('Funcionário removido com sucesso!');
    } catch (err) {
      console.error('Erro ao remover funcionário:', err);
      alert('Erro ao remover funcionário.');
    }
  };

  // ==========================================================================
  // REGISTRO DE OCORRÊNCIAS
  // ==========================================================================

  const handleOpenOccurrenceModal = (student = null, forceType = 'atraso') => {
    setSelectedStudentForOcc(student);
    setOccType(forceType);

    const todayStr = new Date().toISOString().split("T")[0];
    const nowTimeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    setAtrasoForm({ date: todayStr, time: nowTimeStr, reason: '', customReason: '', guardian: '', staff: 'Auxiliar Jéssica', obs: '', signature: '', justified: 'nao', notified: 'nao' });
    setSaidaForm({ date: todayStr, time: nowTimeStr, reason: '', guardian: '', hasReturn: 'nao', returnTime: '', obs: '', signature: '' });
    setAtestadoForm({ date: todayStr, startDate: todayStr, days: 1, endDate: todayStr, cid: '', reason: '', filePreview: '', obs: '' });
    setFaltaForm({ date: todayStr, startDate: todayStr, endDate: todayStr, reason: '', justified: 'nao', notified: 'nao', obs: '' });
    setAmamentacaoForm({ date: todayStr, timeIn: nowTimeStr, timeOut: '', guardian: '', obs: '' });

    setFormAttachment(null);
    setIsDragging(false);
    setIsOccurrenceModalOpen(true);
  };

  const handleSaveOccurrence = async (e) => {
    e.preventDefault();
    if (isSavingOccurrence) return;
    if (!selectedStudentForOcc) {
      alert('Por favor, selecione um aluno ativo para registrar a ocorrência.');
      return;
    }

    // Resolvendo a data com base no tipo de ocorrência
    let targetDate = '';
    if (occType === 'atraso') targetDate = atrasoForm.date;
    else if (occType === 'saida') targetDate = saidaForm.date;
    else if (occType === 'atestado') targetDate = atestadoForm.date;
    else if (occType === 'falta') targetDate = faltaForm.date;
    else if (occType === 'amamentacao') targetDate = amamentacaoForm.date;

    // Validação geral de duplicidade de ocorrência do mesmo tipo na mesma data
    if (targetDate) {
      const isDuplicate = occurrences.some(o => 
        o.studentId === selectedStudentForOcc.id && 
        o.type === occType && 
        o.date === targetDate
      );
      if (isDuplicate) {
        const typeLabels = {
          'atraso': 'atraso',
          'saida': 'saída antecipada',
          'atestado': 'atestado médico',
          'falta': 'falta',
          'amamentacao': 'amamentação'
        };
        const label = typeLabels[occType] || occType;
        alert(`Atenção: Já existe um lançamento de ${label} para esta criança nesta data (${targetDate.split('-').reverse().join('/')}).`);
        return;
      }
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
        justified: atrasoForm.justified,
        notified: atrasoForm.notified,
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
        startDate: faltaForm.startDate || faltaForm.date,
        endDate: faltaForm.endDate || faltaForm.date,
        days: faltaForm.startDate && faltaForm.endDate ? Math.round((new Date(faltaForm.endDate) - new Date(faltaForm.startDate)) / (1000 * 60 * 60 * 24)) + 1 : null,
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

    fullOccData.attachmentName = formAttachment ? formAttachment.name : null;
    fullOccData.attachmentType = formAttachment ? formAttachment.type : null;
    fullOccData.attachmentData = formAttachment ? formAttachment.data : null;

    try {
      setIsSavingOccurrence(true);
      const createdOcc = await saveOccurrence(fullOccData);
      setOccurrences([createdOcc, ...occurrences]);
      setIsOccurrenceModalOpen(false);
      alert('Ocorrência registrada com sucesso no Supabase!');
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar ocorrência no Supabase.');
    } finally {
      setIsSavingOccurrence(false);
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
    if (!window.confirm('ATENÇÃO: Deseja redefinir todo o banco de dados? Todos os alunos cadastrados manualmente e histórico serão deletados, e os alunos originais serão recarregados.')) return;
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

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      
      {/* SIDEBAR */}
      <Sidebar 
        activeTab={activeTab} 
        activeModule={activeModule}
        activeUser={activeUser}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />
      
      {/* MAIN CONTENT CONTAINER */}
      <main className="app-main">
        {/* HEADER */}
        <Header 
          activeTab={activeTab}
          activeModule={activeModule}
          students={students}
          isDark={isDark}
          setIsDark={setIsDark}
          activeUser={activeUser}
          setIsSidebarOpen={setIsSidebarOpen}
          onQuickAction={() => handleOpenOccurrenceModal(null, 'atraso')}
          onSelectStudentOccurrence={handleSelectStudentOccurrenceFromHeader}
        />
        
        {/* REACT ROUTER ROUTING */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage setActiveModule={setActiveModule} />} />
          <Route path="/alunos" element={<StudentsPage />} />
          <Route 
            path="/chamada" 
            element={
              <DailyAttendance 
                activeUser={activeUser} 
                initialTab="lancamento" 
                setActiveModule={setActiveModule} 
              />
            } 
          />
          <Route 
            path="/chamada/consulta" 
            element={
              <DailyAttendance 
                activeUser={activeUser} 
                initialTab="consulta" 
                setActiveModule={setActiveModule} 
              />
            } 
          />
          <Route 
            path="/caderno-seami" 
            element={
              <SeamiControl 
                activeUser={activeUser} 
                activeModule={null} 
                setActiveModule={setActiveModule} 
              />
            } 
          />
          <Route 
            path="/caderno-seami/faltas" 
            element={
              <SeamiControl 
                activeUser={activeUser} 
                activeModule="falta" 
                setActiveModule={setActiveModule} 
              />
            } 
          />
          <Route 
            path="/caderno-seami/atestados" 
            element={
              <SeamiControl 
                activeUser={activeUser} 
                activeModule="atestado" 
                setActiveModule={setActiveModule} 
              />
            } 
          />
          <Route 
            path="/caderno-seami/atrasos" 
            element={
              <SeamiControl 
                activeUser={activeUser} 
                activeModule="atraso" 
                setActiveModule={setActiveModule} 
              />
            } 
          />
          <Route 
            path="/caderno-seami/saidas" 
            element={
              <SeamiControl 
                activeUser={activeUser} 
                activeModule="saida" 
                setActiveModule={setActiveModule} 
              />
            } 
          />
          <Route 
            path="/caderno-seami/amamentacao" 
            element={
              <SeamiControl 
                activeUser={activeUser} 
                activeModule="amamentacao" 
                setActiveModule={setActiveModule} 
              />
            } 
          />
          <Route path="/relatorios" element={<ReportsPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          {activeUser?.role !== 'auxiliar' && (
            <Route 
              path="/configuracoes" 
              element={
                <SettingsPage 
                  staffList={staffList} 
                  handleOpenStaffModal={handleOpenStaffModal} 
                  handleDeleteStaffMember={handleDeleteStaffMember} 
                  handleSeedDemoData={handleSeedDemoData} 
                  handleWipeHistory={handleWipeHistory} 
                  handleResetEntireApp={handleResetEntireApp} 
                />
              } 
            />
          )}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* ==================================================================
          MODAL: CADASTRAR/EDITAR INTEGRANTE DA EQUIPE
          ================================================================== */}
      {isStaffModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{currentEditStaff ? 'Editar Integrante da Equipe' : 'Adicionar Novo Funcionário'}</h2>
              <button className="modal-close-btn" onClick={() => setIsStaffModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveStaff}>
              <div className="form-body">
                <div className="form-group">
                  <label>Nome Completo*</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ex: Secretário João Silva"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  />
                </div>
                
                <div className="form-group">
                  <label>Nível de Acesso (Cargo)*</label>
                  <select 
                    required
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  >
                    <option value="diretora">Secretária (Acesso administrativo total)</option>
                    <option value="pedagoga">Pedagogia (Acesso a relatórios e IA)</option>
                    <option value="auxiliar">Auxiliar (Lançamento rápido e simplificado)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Avatar / Ícone Emoji*</label>
                  <select 
                    required
                    value={staffForm.avatar}
                    onChange={(e) => setStaffForm({ ...staffForm, avatar: e.target.value })}
                  >
                    <option value="👩‍💼">👩‍💼 Secretária (Feminino)</option>
                    <option value="👨‍💼">👨‍💼 Secretário (Masculino)</option>
                    <option value="👩‍🏫">👩‍🏫 Pedagoga / Professora</option>
                    <option value="👨‍🏫">👨‍🏫 Pedagogo / Professor</option>
                    <option value="👩">👩 Auxiliar / Tia</option>
                    <option value="👨">👨 Auxiliar / Tio</option>
                    <option value="🧸">🧸 Mascote</option>
                    <option value="✨">✨ Estrela</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Descrição Curta (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Acesso total e configurações"
                    value={staffForm.desc}
                    onChange={(e) => setStaffForm({ ...staffForm, desc: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setIsStaffModalOpen(false)}>Cancelar</button>
                <button type="submit" className="primary-btn">Salvar Integrante</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================
          MODAL: LANÇAR OCORRÊNCIA (CADERNO SEAMI)
          ================================================================== */}
      {isOccurrenceModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-card modal-large" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>📝</span>
                <div style={{ textAlign: 'left' }}>
                  <h2 style={{ margin: 0, fontSize: '18px' }}>Lançar Ocorrência Individual</h2>
                  {selectedStudentForOcc ? (
                    <span style={{ fontSize: '12px', color: 'var(--slate-500)' }}>Criança: <strong>{selectedStudentForOcc.name}</strong> &middot; Sala {selectedStudentForOcc.classroom}</span>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--slate-400)' }}>Selecione um aluno abaixo para continuar</span>
                  )}
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsOccurrenceModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="module-tabs" style={{ padding: '8px 24px 0', borderBottom: '1px solid var(--slate-100)', display: 'flex', gap: '8px' }}>
              {[
                { type: 'atraso', label: '🕒 Atraso' },
                { type: 'saida', label: '🚪 Saída Antecipada' },
                { type: 'atestado', label: '🩺 Atestado Médico' },
                { type: 'falta', label: '❌ Falta Justificada' },
                { type: 'amamentacao', label: '🍼 Amamentação' }
              ].map(tab => (
                <button
                  key={tab.type}
                  type="button"
                  onClick={() => setOccType(tab.type)}
                  className={`module-tab-btn ${occType === tab.type ? 'active' : ''}`}
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    borderBottom: occType === tab.type ? '2.5px solid var(--color-primary)' : '2.5px solid transparent',
                    backgroundColor: 'transparent',
                    color: occType === tab.type ? 'var(--color-primary)' : 'var(--slate-500)',
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <form onSubmit={handleSaveOccurrence}>
              <div className="form-body" style={{ maxHeight: '460px', overflowY: 'auto', padding: '20px 24px' }}>

                {/* BUSCA DE ALUNO (quando não há pré-selecionado) */}
                <div className="form-group" style={{ marginBottom: '16px', padding: '12px 14px', background: selectedStudentForOcc ? '#ecfdf5' : '#fffbeb', borderRadius: '10px', border: `1px solid ${selectedStudentForOcc ? '#a7f3d0' : '#fde68a'}` }}>
                  <label style={{ fontWeight: 700, color: selectedStudentForOcc ? '#065f46' : '#92400e', fontSize: '13px' }}>
                    {selectedStudentForOcc ? `✅ Aluno: ${selectedStudentForOcc.name} — Sala ${selectedStudentForOcc.classroom}` : '⚠️ Selecione o aluno para continuar'}
                  </label>
                  {!selectedStudentForOcc && (
                    <div style={{ position: 'relative', marginTop: '8px' }}>
                      <input
                        type="text"
                        placeholder="Buscar aluno por nome..."
                        value={modalSearchQuery}
                        onChange={(e) => setModalSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #fcd34d', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                      {modalSearchResults.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999, maxHeight: '200px', overflowY: 'auto' }}>
                          {modalSearchResults.map(s => (
                            <div
                              key={s.id}
                              onClick={() => { setSelectedStudentForOcc(s); setModalSearchQuery(s.name); setModalSearchResults([]); }}
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background = 'white'}
                            >
                              <span style={{ fontWeight: 600 }}>{s.name}</span>
                              <span style={{ color: '#64748b', fontSize: '12px' }}>Sala {s.classroom}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {selectedStudentForOcc && (
                    <button type="button" onClick={() => { setSelectedStudentForOcc(null); setModalSearchQuery(''); }} style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Trocar aluno</button>
                  )}
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
                        <label>Horário de Entrada*</label>
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
                          <option value="Consulta médica">Consulta médica / Tratamento</option>
                          <option value="Trânsito">Problemas com trânsito</option>
                          <option value="Chuvas / Condições Climáticas">Chuvas / Condições Climáticas</option>
                          <option value="Dormiu pouco / Cansaço">Dormiu pouco / Cansaço</option>
                          <option value="Não se alimentou em casa">Demorou a se alimentar</option>
                          <option value="Informado por e-mail dos pais">Informado por e-mail/aviso prévio</option>
                          <option value="Outros">Outros motivos</option>
                        </select>
                      </div>
                      <div className="form-group col-6">
                        <label>Entregue por (Responsável)*</label>
                        <input 
                          type="text" 
                          required
                          placeholder="Ex: Cláudio Nogueira (Pai)"
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
                          placeholder="Justificativa da família..."
                          value={atrasoForm.customReason}
                          onChange={(e) => setAtrasoForm({ ...atrasoForm, customReason: e.target.value })}
                        />
                      </div>
                    )}

                    <div className="form-row">
                      <div className="form-group col-6">
                        <label>Atraso Justificado por Escrito?*</label>
                        <div className="module-radio-buttons" style={{ marginTop: '4px' }}>
                          <label className={`radio-btn ${atrasoForm.justified === 'sim' ? 'active' : ''}`}>
                            <input 
                              type="radio" 
                              name="atraso-just" 
                              value="sim" 
                              checked={atrasoForm.justified === 'sim'}
                              onChange={() => setAtrasoForm({ ...atrasoForm, justified: 'sim' })}
                            />
                            <span>Sim</span>
                          </label>
                          <label className={`radio-btn ${atrasoForm.justified === 'nao' ? 'active' : ''}`}>
                            <input 
                              type="radio" 
                              name="atraso-just" 
                              value="nao" 
                              checked={atrasoForm.justified === 'nao'}
                              onChange={() => setAtrasoForm({ ...atrasoForm, justified: 'nao' })}
                            />
                            <span>Não</span>
                          </label>
                        </div>
                      </div>
                      
                      <div className="form-group col-6">
                        <label>Houve Aviso Prévio dos Pais?*</label>
                        <div className="module-radio-buttons" style={{ marginTop: '4px' }}>
                          <label className={`radio-btn ${atrasoForm.notified === 'sim' ? 'active' : ''}`}>
                            <input 
                              type="radio" 
                              name="atraso-not" 
                              value="sim" 
                              checked={atrasoForm.notified === 'sim'}
                              onChange={() => setAtrasoForm({ ...atrasoForm, notified: 'sim' })}
                            />
                            <span>Sim</span>
                          </label>
                          <label className={`radio-btn ${atrasoForm.notified === 'nao' ? 'active' : ''}`}>
                            <input 
                              type="radio" 
                              name="atraso-not" 
                              value="nao" 
                              checked={atrasoForm.notified === 'nao'}
                              onChange={() => setAtrasoForm({ ...atrasoForm, notified: 'nao' })}
                            />
                            <span>Não</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Observações Adicionais</label>
                      <textarea 
                        rows={2}
                        placeholder="Recomendações, anotações de agenda ou avisos..."
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
                        <label>Data Reg. Ausência*</label>
                        <input 
                          type="date" 
                          required
                          value={faltaForm.date}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFaltaForm(prev => ({ ...prev, date: val, startDate: val, endDate: val }));
                          }}
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
                        <label>Data de Início da Ausência*</label>
                        <input 
                          type="date" 
                          required
                          value={faltaForm.startDate}
                          onChange={(e) => setFaltaForm(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                      </div>
                      <div className="form-group col-6">
                        <label>Data de Fim da Ausência*</label>
                        <input 
                          type="date" 
                          required
                          value={faltaForm.endDate}
                          onChange={(e) => setFaltaForm(prev => ({ ...prev, endDate: e.target.value }))}
                        />
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

                {/* ARQUIVOS ANEXOS (Opcional) */}
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
                      <div style={{
                        pointerEvents: 'none',
                        fontSize: '24px',
                        marginBottom: '8px',
                        color: isDragging ? '#6366f1' : '#94a3b8'
                      }}>
                        📤
                      </div>

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

                      <div style={{ pointerEvents: 'none', fontSize: '11px', color: '#94a3b8', marginBottom: '10px' }}>
                        PDF · PNG · JPG · DOCX · MSG · EML &mdash; máx 15MB
                      </div>
                    </div>
                  )}

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
                <button type="submit" className="primary-btn" disabled={isSavingOccurrence}>
                  {isSavingOccurrence ? 'Salvando...' : 'Salvar Ocorrência'}
                </button>
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
                    <p style={{ margin: '6px 0' }}><strong>Atraso Justificado?</strong> {activeReceipt.justified === 'sim' ? 'Sim' : 'Não'}</p>
                    <p style={{ margin: '6px 0' }}><strong>Aviso Prévio?</strong> {activeReceipt.notified === 'sim' ? 'Sim' : 'Não'}</p>
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
                Imprimir Comprovante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
