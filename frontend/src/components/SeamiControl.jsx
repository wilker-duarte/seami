import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Calendar, 
  Paperclip, 
  Edit, 
  Trash2, 
  Eye, 
  Plus, 
  X, 
  Check, 
  AlertCircle,
  Download,
  User,
  Users,
  Clock,
  LogOut,
  Activity,
  Heart,
  HelpCircle,
  CalendarX,
  CheckSquare,
  FileSignature,
  Upload,
  Image,
  File
} from 'lucide-react';
import { getOccurrences, getStudents, saveOccurrence, deleteOccurrence, getOccurrenceAttachment, saveStudent } from '../supabaseClient';

export default function SeamiControl({ activeUser, activeModule, setActiveModule }) {
  // Categorias correspondentes às abas da planilha Controle Presença SEAMI
  const categories = [
    { id: 'falta', label: 'Faltas', icon: <CalendarX size={18} />, color: '#ef4444', bgColor: '#fef2f2' },
    { id: 'atestado', label: 'Atestados', icon: <Activity size={18} />, color: '#ec4899', bgColor: '#fdf2f8' },
    { id: 'atraso', label: 'Atrasos', icon: <Clock size={18} />, color: '#f59e0b', bgColor: '#fffbeb' },
    { id: 'saida', label: 'Saídas Antecipadas', icon: <LogOut size={18} />, color: '#3b82f6', bgColor: '#eff6ff' },
    { id: 'amamentacao', label: 'Amamentação', icon: <Heart size={18} />, color: '#10b981', bgColor: '#ecfdf5' },
    { id: 'outros', label: 'Outros / Ocorrências', icon: <FileText size={18} />, color: '#64748b', bgColor: '#f8fafc' }
  ];

  const [activeCategory, setActiveCategory] = useState(activeModule || 'falta');

  useEffect(() => {
    if (activeModule && ['falta', 'atestado', 'atraso', 'saida', 'amamentacao', 'outros'].includes(activeModule)) {
      setActiveCategory(activeModule);
    }
  }, [activeModule]);

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    if (setActiveModule) {
      setActiveModule(catId);
    }
  };

  // Estados dos Dados
  const [occurrences, setOccurrences] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterRoom, setFilterRoom] = useState('all');
  const [searchNameQuery, setSearchNameQuery] = useState('');

  // Modais
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [activeAttachment, setActiveAttachment] = useState(null); // { name, type, data }
  const [alertMsg, setAlertMsg] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // id da ocorrência aguardando confirmação de exclusão

  // Formulário (Criação / Edição)
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null); // { id, name, classroom }
  const [customStudentName, setCustomStudentName] = useState('');
  const [customClassroom, setCustomClassroom] = useState('Alegria');

  const [formType, setFormType] = useState('falta');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('');
  const [formMotive, setFormMotive] = useState('');
  const [formGuardian, setFormGuardian] = useState('');
  const [formStaff, setFormStaff] = useState('');
  const [formObs, setFormObs] = useState('');
  const [formCID, setFormCID] = useState('');
  const [formRecordedBy, setFormRecordedBy] = useState(activeUser?.name || 'Diretora');

  // Faltas específicas
  const [formJustified, setFormJustified] = useState('nao'); // sim, nao
  const [formNotified, setFormNotified] = useState('nao'); // sim, nao

  // Atestado específico
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDays, setFormDays] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  // Saídas
  const [formHasReturn, setFormHasReturn] = useState('nao');
  const [formReturnTime, setFormReturnTime] = useState('');

  // Amamentação
  const [formTimeIn, setFormTimeIn] = useState('');
  const [formTimeOut, setFormTimeOut] = useState('');

  // Anexos
  const [formAttachment, setFormAttachment] = useState(null); // { name, type, data }

  // Carregar Dados
  useEffect(() => {
    fetchOccurrences();
    fetchStudents();
  }, []);

  // Recarrega quando a aba volta a ficar visível (após salvar pelo modal do Header)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchOccurrences();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const fetchOccurrences = async () => {
    setLoading(true);
    try {
      const data = await getOccurrences();
      // Ordena por data (mais recente primeiro)
      const sorted = data.sort((a, b) => b.date.localeCompare(a.date));
      setOccurrences(sorted);
    } catch (error) {
      console.error("Erro ao carregar ocorrências do Supabase:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const data = await getStudents();
      setStudentsList(data.filter(s => s.active));
    } catch (error) {
      console.error("[SeamiControl] Erro ao obter alunos:", error);
    }
  };

  const showAlert = (type, text) => {
    setAlertMsg({ type, text });
    setTimeout(() => {
      setAlertMsg(null);
    }, 4500);
  };

  // Conversão de arquivo para Base64
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      showAlert('error', 'Arquivo muito grande. O limite máximo permitido é 15MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        data: reader.result,
        size: file.size
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    processFile(e.target.files[0]);
    // Limpa o valor para permitir selecionar o mesmo arquivo novamente
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

  // Evita flickering quando o cursor passa por elementos filhos da dropzone
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const clearAttachment = () => {
    setFormAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsDragging(false);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type) => {
    if (!type) return <File size={20} />;
    if (type.startsWith('image/')) return <Image size={20} style={{ color: '#10b981' }} />;
    if (type === 'application/pdf') return <FileText size={20} style={{ color: '#ef4444' }} />;
    if (type.includes('word') || type.includes('document')) return <FileText size={20} style={{ color: '#3b82f6' }} />;
    return <File size={20} style={{ color: '#64748b' }} />;
  };

  // Abrir Formulário - Novo Registro na Categoria Ativa
  const handleOpenNewModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setSelectedStudent(null);
    setCustomStudentName('');
    setCustomClassroom('Alegria');
    setSearchStudentQuery('');
    setFormType(activeCategory);
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime('');
    setFormMotive('');
    setFormGuardian('');
    setFormStaff('');
    setFormObs('');
    setFormCID('');
    setFormRecordedBy(activeUser?.name || 'Diretora');
    setFormJustified('nao');
    setFormNotified('nao');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormDays('');
    setFormEndDate(new Date().toISOString().split('T')[0]);
    setFormHasReturn('nao');
    setFormReturnTime('');
    setFormTimeIn('');
    setFormTimeOut('');
    // Garante reset completo do campo de arquivo
    setFormAttachment(null);
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsFormModalOpen(true);
  };

  // Abrir Formulário - Edição
  const handleOpenEditModal = async (occ) => {
    setIsEditing(true);
    setEditingId(occ.id);
    
    const stud = occ.studentId ? studentsList.find(s => s.id === occ.studentId) : null;
    if (stud) {
      setSelectedStudent(stud);
      setCustomStudentName('');
    } else if (occ.studentId) {
      setSelectedStudent({ id: occ.studentId, name: occ.studentName, classroom: occ.classroom });
      setCustomStudentName('');
    } else {
      setSelectedStudent(null);
      setCustomStudentName(occ.studentName || '');
      setCustomClassroom(occ.classroom || 'Alegria');
    }

    setFormType(occ.type);
    setFormDate(occ.date);
    setFormTime(occ.time || '');
    setFormMotive(occ.motive || '');
    setFormGuardian(occ.guardian || '');
    setFormStaff(occ.staff || '');
    setFormObs(occ.obs || '');
    setFormCID(occ.cid || '');
    setFormRecordedBy(occ.recordedBy || activeUser?.name || 'Diretora');
    setFormJustified(occ.justified || 'nao');
    setFormNotified(occ.notified || 'nao');
    setFormStartDate(occ.startDate || occ.date || new Date().toISOString().split('T')[0]);
    setFormDays(occ.days || '');
    setFormEndDate(occ.endDate || occ.date || new Date().toISOString().split('T')[0]);
    setFormHasReturn(occ.hasReturn || 'nao');
    setFormReturnTime(occ.returnTime || '');
    setFormTimeIn(occ.timeIn || '');
    setFormTimeOut(occ.timeOut || '');

    // Reseta estado do drag ao abrir edição
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (occ.attachmentName) {
      let attachmentData = occ.attachmentData;
      if (!attachmentData && occ.id) {
        try {
          attachmentData = await getOccurrenceAttachment(occ.id);
          occ.attachmentData = attachmentData; // Cache it
        } catch (err) {
          console.error("Erro ao carregar anexo para edição:", err);
        }
      }
      setFormAttachment({
        name: occ.attachmentName,
        type: occ.attachmentType,
        data: attachmentData
      });
    } else {
      setFormAttachment(null);
    }

    setIsFormModalOpen(true);
  };

  // Excluir registro — abre modal de confirmação interno (window.confirm é bloqueado por alguns ambientes)
  const handleDeleteOccurrence = (id) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteOccurrence(confirmDeleteId);
      showAlert('success', 'Registro excluído com sucesso!');
      fetchOccurrences();
    } catch (error) {
      console.error('[SeamiControl] Erro ao excluir ocorrência:', error);
      showAlert('error', `Falha ao excluir registro. ${error?.message || ''}`);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Salvar formulário
  const handleSaveOccurrence = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const finalStudentName = selectedStudent ? selectedStudent.name : customStudentName;
    if (!finalStudentName || !finalStudentName.trim()) {
      showAlert('error', 'O Nome do Aluno é de preenchimento obrigatório.');
      return;
    }

    let studentId = selectedStudent ? selectedStudent.id : null;

    // Se for entrada manual, tenta associar ou criar no banco (pessoas) para evitar erro de Foreign Key
    if (!studentId && customStudentName && customStudentName.trim()) {
      const nameNorm = customStudentName.trim().toLowerCase();
      const existingStudent = studentsList.find(s => s.name.trim().toLowerCase() === nameNorm);
      if (existingStudent) {
        studentId = existingStudent.id;
      } else {
        try {
          const newStudent = await saveStudent({
            name: customStudentName.trim(),
            classroom: customClassroom,
            active: true
          });
          studentId = newStudent.id;
          // Atualiza lista local
          setStudentsList(prev => [...prev, newStudent]);
        } catch (err) {
          console.error("Erro ao cadastrar novo aluno manual em pessoas:", err);
          showAlert('error', 'Erro ao salvar o aluno no banco de dados.');
          return;
        }
      }
    }

    // Se for edição e por algum motivo ainda não tiver studentId, tenta reaver do objeto original
    if (!studentId && isEditing) {
      const originalOcc = occurrences.find(o => o.id === editingId);
      if (originalOcc) {
        studentId = originalOcc.studentId;
      }
    }

    if (!studentId) {
      showAlert('error', 'Código de identificação do aluno ausente.');
      return;
    }

    // Validação de duplicidade para a mesma criança no mesmo dia (para qualquer tipo de ocorrência)
    if (formType) {
      const isDuplicate = occurrences.some(o => 
        o.id !== editingId && 
        o.studentId === studentId &&
        o.type === formType && 
        o.date === formDate
      );
      if (isDuplicate) {
        const typeLabels = {
          'falta': 'falta',
          'atestado': 'atestado médico',
          'atraso': 'atraso',
          'saida': 'saída antecipada',
          'amamentacao': 'amamentação'
        };
        const label = typeLabels[formType] || formType;
        showAlert('error', `Atenção: Já existe um lançamento de ${label} para a criança "${finalStudentName}" nesta data (${formDate.split('-').reverse().join('/')}).`);
        return;
      }
    }

    const payload = {
      id: isEditing ? editingId : undefined,
      type: formType,
      studentId: studentId,
      studentName: finalStudentName,
      classroom: selectedStudent ? selectedStudent.classroom : customClassroom,
      date: formDate,
      time: formTime || null,
      motive: formMotive || null,
      guardian: formGuardian || null,
      staff: formStaff || null,
      obs: formObs || null,
      cid: formType === 'atestado' ? formCID : null,
      startDate: (formType === 'atestado' || formType === 'falta') ? formStartDate : null,
      days: formType === 'atestado' && formDays ? parseInt(formDays) : (formType === 'falta' && formStartDate && formEndDate ? Math.round((new Date(formEndDate) - new Date(formStartDate)) / (1000 * 60 * 60 * 24)) + 1 : null),
      endDate: (formType === 'atestado' || formType === 'falta') ? formEndDate : null,
      justified: (formType === 'falta' || formType === 'atraso') ? formJustified : null,
      notified: (formType === 'falta' || formType === 'atraso') ? formNotified : null,
      hasReturn: formType === 'saida' ? formHasReturn : null,
      returnTime: formType === 'saida' ? formReturnTime : null,
      timeIn: formType === 'amamentacao' ? formTimeIn : null,
      timeOut: formType === 'amamentacao' ? formTimeOut : null,
      recordedBy: formRecordedBy,
      attachmentName: formAttachment ? formAttachment.name : null,
      attachmentType: formAttachment ? formAttachment.type : null,
      attachmentData: formAttachment ? formAttachment.data : null
    };

    try {
      setIsSaving(true);
      await saveOccurrence(payload);
      showAlert('success', isEditing ? 'Registro de caderno atualizado!' : 'Registro gravado no caderno!');
      setIsFormModalOpen(false);
      fetchOccurrences();
    } catch (error) {
      console.error('[SeamiControl] Erro ao salvar ocorrência:', error);
      const detail = error?.message || error?.details || '';
      showAlert('error', `Erro ao salvar informações no Supabase.${detail ? ' Detalhe: ' + detail : ''}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Abrir Visualizador
  const handleViewAttachment = async (occ) => {
    try {
      let attachmentData = occ.attachmentData;
      if (!attachmentData && occ.id) {
        attachmentData = await getOccurrenceAttachment(occ.id);
        occ.attachmentData = attachmentData; // Cache it
      }
      setActiveAttachment({
        name: occ.attachmentName,
        type: occ.attachmentType,
        data: attachmentData
      });
      setIsAttachmentModalOpen(true);
    } catch (error) {
      console.error("Erro ao carregar anexo:", error);
      showAlert('error', 'Falha ao carregar o arquivo de anexo do banco.');
    }
  };

  // Baixar Arquivo
  const downloadAttachment = (name, type, data) => {
    const link = document.createElement('a');
    link.href = data;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto calcular data fim de atestado
  useEffect(() => {
    if (formType === 'atestado' && formStartDate && formDays) {
      const dNum = parseInt(formDays);
      if (!isNaN(dNum) && dNum > 0) {
        const start = new Date(formStartDate);
        start.setDate(start.getDate() + dNum - 1);
        setFormEndDate(start.toISOString().split('T')[0]);
      }
    }
  }, [formStartDate, formDays, formType]);

  // Se o tipo no form mudar, ajusta campos padrão
  useEffect(() => {
    if (isFormModalOpen && !isEditing) {
      if (formType === 'atestado') {
        setFormStartDate(formDate);
        setFormDays('');
        setFormEndDate('');
      } else if (formType === 'amamentacao') {
        setFormTimeIn('14:30');
        setFormTimeOut('15:00');
      }
    }
  }, [formType, isFormModalOpen]);

  // Converte tipo de ocorrência para texto legível em português
  const getTypeText = (type) => {
    const typeMap = {
      'falta': 'Falta',
      'atestado': 'Atestado Médico',
      'atraso': 'Atraso',
      'saida': 'Saída Antecipada',
      'amamentacao': 'Amamentação',
      'outros': 'Outros / Ocorrências'
    };
    return typeMap[type] || type;
  };

  // Filtros aplicados na listagem
  const filteredOccurrences = occurrences.filter(occ => {
    const isCategoryMatch = occ.type === activeCategory;
    const isRoomMatch = filterRoom === 'all' || occ.classroom === filterRoom;
    const name = (occ.studentName || occ.studentname || '').toLowerCase();
    const isSearchMatch = searchNameQuery === '' || name.includes(searchNameQuery.toLowerCase());
    return isCategoryMatch && isRoomMatch && isSearchMatch;
  });

  // Filtro de alunos no Seletor Premium do modal
  const filteredStudentsForSelect = studentsList.filter(s => 
    s.name.toLowerCase().includes(searchStudentQuery.toLowerCase()) ||
    s.classroom.toLowerCase().includes(searchStudentQuery.toLowerCase())
  );

  const formatDateBR = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatReturnDateBR = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const returnDateStr = d.toISOString().split('T')[0];
    return formatDateBR(returnDateStr);
  };

  return (
    <div className="tab-fade-in">
      
      <div className="panel-header-desc" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: '24px', color: 'var(--slate-800)' }}>
          Caderno SEAMI
        </h2>
        <p style={{ color: 'var(--slate-500)', fontSize: '14px', marginTop: '4px' }}>
          Gerenciamento e controle unificado do Caderno Presença SEAMI.
        </p>
      </div>

      {alertMsg && (
        <div className={`alert-box alert-${alertMsg.type}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          backgroundColor: alertMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: alertMsg.type === 'success' ? '#065f46' : '#991b1b',
          border: `1px solid ${alertMsg.type === 'success' ? '#a7f3d0' : '#fca5a5'}`
        }}>
          <AlertCircle size={18} />
          <span style={{ fontSize: '14px', fontWeight: 500 }}>{alertMsg.text}</span>
        </div>
      )}

      {/* ABAS DO CONTROLE SEAMI (ABAS DA PLANILHA ORIGINAL) */}
      <div className="tab-scroll-hide" style={{
        display: 'flex',
        overflowX: 'auto',
        gap: '8px',
        paddingBottom: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid var(--slate-100)'
      }}>
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                borderRadius: '12px 12px 0 0',
                border: 'none',
                fontFamily: 'Outfit, sans-serif',
                fontWeight: isActive ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: isActive ? 'white' : 'transparent',
                color: isActive ? cat.color : 'var(--slate-500)',
                borderBottom: isActive ? `3px solid ${cat.color}` : 'none',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 -4px 10px -4px rgba(0,0,0,0.05)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <div style={{
                display: 'flex',
                padding: '6px',
                borderRadius: '8px',
                backgroundColor: isActive ? cat.bgColor : 'transparent',
                color: cat.color
              }}>
                {cat.icon}
              </div>
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* ÁREA DE CONSULTA DA SEÇÃO ATIVA */}
      <div className="filter-card" style={{ marginBottom: '24px' }}>
        <div className="filter-card-header" style={{ borderBottom: '1px solid var(--slate-100)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="filter-card-title">
            <Search size={16} style={{ color: 'var(--brand-primary)' }} />
            <span style={{ fontSize: '14px', fontWeight: 600 }}>Consultar e Filtrar registros de {categories.find(c => c.id === activeCategory)?.label}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={fetchOccurrences}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--slate-200)', background: 'white', fontSize: '12px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--slate-600)', opacity: loading ? 0.6 : 1 }}
            >
              <span style={{ fontSize: '14px' }}>🔄</span> Atualizar
            </button>
            <button
              onClick={handleOpenNewModal}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: 'none', background: 'var(--brand-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: 'white' }}
            >
              <Plus size={14} /> Novo Registro
            </button>
          </div>
        </div>

        <div className="filter-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', padding: '16px' }}>
          <div className="filter-group">
            <label>Filtrar por Sala/Turma</label>
            <select
              value={filterRoom}
              onChange={(e) => setFilterRoom(e.target.value)}
              className="form-control"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
            >
              <option value="all">Visualizar Todas as Salas</option>
              <option value="Alegria">Sala Alegria</option>
              <option value="Carinho">Sala Carinho</option>
              <option value="União">Sala União</option>
              <option value="Amizade">Sala Amizade</option>
              <option value="Felicidade">Sala Felicidade</option>
              <option value="Outros">Outras salas</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Pesquisar Aluno</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar por nome do aluno..."
                value={searchNameQuery}
                onChange={(e) => setSearchNameQuery(e.target.value)}
                className="form-control"
                style={{ width: '100%', padding: '10px 10px 10px 34px', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
              />
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
            </div>
          </div>
        </div>
      </div>

      {/* VISUALIZAÇÃO DOS REGISTROS DA SEÇÃO ATIVA */}
      <div className="table-card">
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div className="spinner" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '3px solid var(--slate-200)', borderTopColor: 'var(--brand-primary)', animation: 'spin 1s linear infinite' }}></div>
            <span style={{ color: 'var(--slate-500)', fontSize: '13px' }}>Buscando registros da categoria...</span>
          </div>
        ) : filteredOccurrences.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--slate-400)', fontSize: '14px' }}>
            Não há registros salvos para {categories.find(c => c.id === activeCategory)?.label} nesta sala.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="occurrences-table">
              
              {/* Renderização condicional dos cabeçalhos da Tabela por Categoria da planilha */}
              <thead>
                {activeCategory === 'falta' && (
                  <tr>
                    <th style={{ width: '12%' }}>Data Reg.</th>
                    <th style={{ width: '22%' }}>Nome do Aluno</th>
                    <th style={{ width: '13%' }}>Sala/Turma</th>
                    <th style={{ width: '20%' }}>Período Ausência</th>
                    <th style={{ width: '10%' }}>Justificada?</th>
                    <th style={{ width: '13%' }}>Avisado pelos pais?</th>
                    <th style={{ width: '5%', textAlign: 'center' }}>Doc</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                  </tr>
                )}
                {activeCategory === 'atestado' && (
                  <tr>
                    <th style={{ width: '12%' }}>Data</th>
                    <th style={{ width: '25%' }}>Nome do Aluno</th>
                    <th style={{ width: '13%' }}>Sala/Turma</th>
                    <th style={{ width: '22%' }}>Período Afastamento</th>
                    <th style={{ width: '13%' }}>CID</th>
                    <th style={{ width: '5%', textAlign: 'center' }}>Atestado</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                  </tr>
                )}
                 {activeCategory === 'atraso' && (
                   <tr>
                     <th style={{ width: '12%' }}>Data</th>
                     <th style={{ width: '20%' }}>Nome do Aluno</th>
                     <th style={{ width: '11%' }}>Sala/Turma</th>
                     <th style={{ width: '8%' }}>Horário</th>
                     <th style={{ width: '21%' }}>Motivo Declarado</th>
                     <th style={{ width: '9%' }}>Justificado?</th>
                     <th style={{ width: '10%' }}>Avisado pelos pais?</th>
                     <th style={{ width: '4%', textAlign: 'center' }}>Doc</th>
                     <th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                   </tr>
                 )}
                {activeCategory === 'saida' && (
                  <tr>
                    <th style={{ width: '12%' }}>Data</th>
                    <th style={{ width: '25%' }}>Nome do Aluno</th>
                    <th style={{ width: '13%' }}>Sala/Turma</th>
                    <th style={{ width: '10%' }}>Horário</th>
                    <th style={{ width: '13%' }}>Retorna?</th>
                    <th style={{ width: '12%' }}>Retorno</th>
                    <th style={{ width: '5%', textAlign: 'center' }}>Doc</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                  </tr>
                )}
                {activeCategory === 'amamentacao' && (
                  <tr>
                    <th style={{ width: '12%' }}>Data</th>
                    <th style={{ width: '25%' }}>Nome do Aluno</th>
                    <th style={{ width: '13%' }}>Sala/Turma</th>
                    <th style={{ width: '12%' }}>Entrada</th>
                    <th style={{ width: '12%' }}>Saída</th>
                    <th style={{ width: '11%' }}>Responsável</th>
                    <th style={{ width: '5%', textAlign: 'center' }}>Doc</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                  </tr>
                )}
                {activeCategory === 'outros' && (
                  <tr>
                    <th style={{ width: '12%' }}>Data</th>
                    <th style={{ width: '25%' }}>Nome do Aluno</th>
                    <th style={{ width: '13%' }}>Sala/Turma</th>
                    <th style={{ width: '10%' }}>Horário</th>
                    <th style={{ width: '25%' }}>Observação/Descrição</th>
                    <th style={{ width: '5%', textAlign: 'center' }}>Anexo</th>
                    <th style={{ width: '10%', textAlign: 'center' }}>Ações</th>
                  </tr>
                )}
              </thead>

              {/* Renderização condicional das linhas da Tabela */}
              <tbody>
                {filteredOccurrences.map((occ) => (
                  <tr key={occ.id}>
                    <td style={{ fontWeight: 600, color: 'var(--slate-800)' }}>
                      {formatDateBR(occ.date)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '13px' }}>{occ.studentName}</div>
                    </td>
                    <td>
                      <span className="room-badge" style={{
                        display: 'inline-flex',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#e0e7ff',
                        color: '#4338ca'
                      }}>
                        Sala {occ.classroom}
                      </span>
                    </td>

                    {/* Dados específicos de Falta */}
                    {activeCategory === 'falta' && (
                      <>
                        <td style={{ fontSize: '12px', color: 'var(--slate-600)' }}>
                          {occ.startDate && occ.endDate ? (
                            <span>{occ.days ? <strong>{occ.days} dias </strong> : ''}({formatDateBR(occ.startDate)} a {formatDateBR(occ.endDate)})</span>
                          ) : (
                            <span>{formatDateBR(occ.date)}</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${occ.justified === 'sim' ? 'badge-success' : 'badge-danger'}`}>
                            {occ.justified === 'sim' ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${occ.notified === 'sim' ? 'badge-success' : 'badge-danger'}`}>
                            {occ.notified === 'sim' ? 'Sim' : 'Não'}
                          </span>
                        </td>
                      </>
                    )}

                    {/* Dados específicos de Atestado */}
                    {activeCategory === 'atestado' && (
                      <>
                        <td style={{ fontSize: '12px', color: 'var(--slate-600)' }}>
                          <strong>{occ.days || '-'} dias</strong> ({formatDateBR(occ.startDate)} a {formatDateBR(occ.endDate)})
                        </td>
                        <td style={{ fontWeight: 700, color: '#ef4444', fontSize: '12px' }}>
                          {occ.cid || <span style={{ color: 'var(--slate-300)' }}>Sem CID</span>}
                        </td>
                      </>
                    )}

                     {/* Dados específicos de Atraso */}
                     {activeCategory === 'atraso' && (
                       <>
                         <td style={{ fontWeight: 600, color: 'var(--slate-600)' }}>
                           {occ.time || '-'}
                         </td>
                         <td style={{ fontSize: '12px', color: 'var(--slate-600)' }}>
                           {occ.motive || <span style={{ color: 'var(--slate-300)' }}>-</span>}
                         </td>
                         <td>
                           <span className={`badge ${occ.justified === 'sim' ? 'badge-success' : 'badge-danger'}`}>
                             {occ.justified === 'sim' ? 'Sim' : 'Não'}
                           </span>
                         </td>
                         <td>
                           <span className={`badge ${occ.notified === 'sim' ? 'badge-success' : 'badge-danger'}`}>
                             {occ.notified === 'sim' ? 'Sim' : 'Não'}
                           </span>
                         </td>
                       </>
                     )}

                    {/* Dados específicos de Saída */}
                    {activeCategory === 'saida' && (
                      <>
                        <td style={{ fontWeight: 600, color: 'var(--slate-600)' }}>
                          {occ.time || '-'}
                        </td>
                        <td>
                          <span className={`badge ${occ.hasReturn === 'sim' ? 'badge-success' : 'badge-danger'}`}>
                            {occ.hasReturn === 'sim' ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--slate-600)' }}>
                          {occ.hasReturn === 'sim' && occ.returnTime ? occ.returnTime : '-'}
                        </td>
                      </>
                    )}

                    {/* Dados específicos de Amamentação */}
                    {activeCategory === 'amamentacao' && (
                      <>
                        <td style={{ fontWeight: 600, color: '#10b981' }}>{occ.timeIn || '-'}</td>
                        <td style={{ fontWeight: 600, color: '#059669' }}>{occ.timeOut || '-'}</td>
                        <td style={{ fontSize: '12px', color: 'var(--slate-600)' }}>{occ.guardian || '-'}</td>
                      </>
                    )}

                    {/* Dados específicos de Outros */}
                    {activeCategory === 'outros' && (
                      <>
                        <td style={{ fontWeight: 600, color: 'var(--slate-600)' }}>{occ.time || '-'}</td>
                        <td style={{ fontSize: '12px', color: 'var(--slate-600)' }}>
                          {occ.motive || occ.obs || <span style={{ color: 'var(--slate-300)' }}>Sem descrição</span>}
                        </td>
                      </>
                    )}

                    {/* Coluna Comum de Anexo (Para Todas as Ocorrências) */}
                    <td style={{ textAlign: 'center' }}>
                      {occ.attachmentName ? (
                        <button
                          onClick={() => handleViewAttachment(occ)}
                          title={`Visualizar: ${occ.attachmentName}`}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '20px',
                            backgroundColor: '#eff6ff',
                            color: 'var(--brand-primary)',
                            border: '1px solid #bfdbfe',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                        >
                          <Eye size={12} />
                          Ver
                        </button>
                      ) : (
                        <span style={{ color: 'var(--slate-300)', fontSize: '12px' }}>—</span>
                      )}
                    </td>

                    {/* Ações Gerais do Registro */}
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleOpenEditModal(occ)}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title="Editar"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteOccurrence(occ.id)}
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            backgroundColor: '#fef2f2',
                            color: '#ef4444',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title="Excluir"
                        >
                          <Trash2 size={13} />
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

      {/* FORMULÁRIO DE REGISTRO / EDIÇÃO */}
      {isFormModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-card modal-large" style={{ maxWidth: '850px' }}>
            {/* Header */}
            <div className="modal-header">
              <div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '18px' }}>
                  {isEditing ? `Editar Registro de ${getTypeText(formType)}` : `Novo Registro de ${getTypeText(formType)}`}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Apenas <strong>Nome do Aluno</strong> e <strong>Tipo de Registro</strong> são obrigatórios no formulário.
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsFormModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveOccurrence} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="form-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                
                {/* 1. SELETOR DE ESTUDANTE SUPER EXPANDIDO E ORGANIZADO (Requisito Crítico) */}
                <div style={{ border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px', backgroundColor: '#eff6ff' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#1e3a8a', marginBottom: '8px' }}>
                    <Users size={16} />
                    Selecionar Aluno da Creche <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                  
                  {selectedStudent ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: 'white',
                      borderRadius: '10px',
                      border: '2px solid #3b82f6',
                      boxShadow: '0 2px 4px rgba(59, 130, 246, 0.05)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 700
                        }}>
                          {selectedStudent.name.charAt(0)}
                        </div>
                        <div>
                          <strong style={{ color: '#1e293b', fontSize: '15px', display: 'block' }}>{selectedStudent.name}</strong>
                          <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 600 }}>SALA / TURMA: {selectedStudent.classroom}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setSelectedStudent(null); setSearchStudentQuery(''); }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : customStudentName ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      backgroundColor: 'white',
                      borderRadius: '10px',
                      border: '2px solid #cbd5e1'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={18} style={{ color: '#64748b' }} />
                        <div>
                          <strong style={{ color: '#334155', fontSize: '14px' }}>{customStudentName}</strong>
                          <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>Sala: {customClassroom} (Informado Manualmente)</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomStudentName('')}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Busca organizada de alunos */}
                      <div style={{ position: 'relative', marginBottom: '12px' }}>
                        <input
                          type="text"
                          placeholder="Digite para buscar alunos cadastrados nas turmas..."
                          value={searchStudentQuery}
                          onChange={(e) => setSearchStudentQuery(e.target.value)}
                          className="form-control"
                          style={{
                            width: '100%',
                            padding: '10px 10px 10px 36px',
                            borderRadius: '8px',
                            border: '1px solid #93c5fd',
                            fontSize: '14px',
                            fontFamily: 'Inter, sans-serif'
                          }}
                        />
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#3b82f6' }} />
                      </div>
                      
                      {/* Lista Diretório de Seleção Expandido de Alunos (MUITO MAIS VISUAL) */}
                      <div style={{
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        backgroundColor: 'white',
                        maxHeight: '160px',
                        overflowY: 'auto',
                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
                      }}>
                        {filteredStudentsForSelect.length === 0 ? (
                          <div style={{ padding: '12px', fontSize: '13px', color: 'var(--slate-400)', textAlign: 'center' }}>
                            Nenhum aluno correspondente. Caso queira, preencha manualmente no campo abaixo.
                          </div>
                        ) : (
                          filteredStudentsForSelect.map(student => (
                            <div
                              key={student.id}
                              onClick={() => setSelectedStudent(student)}
                              style={{
                                padding: '10px 14px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #eff6ff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'background-color 0.15s ease'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#eff6ff'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  backgroundColor: '#dbeafe',
                                  color: '#1e40af',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '11px',
                                  fontWeight: 700
                                }}>
                                  {student.name.charAt(0)}
                                </div>
                                <span style={{ fontWeight: 600, color: 'var(--slate-800)', fontSize: '13px' }}>{student.name}</span>
                              </div>
                              <span style={{
                                fontSize: '10px',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                fontWeight: 700
                              }}>
                                Sala {student.classroom}
                              </span>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Digitação Manual Flexível (Opcional - Caso não esteja no banco) */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginTop: '12px',
                        borderTop: '1px dashed #bfdbfe',
                        paddingTop: '10px'
                      }}>
                        <span style={{ fontSize: '11px', color: '#1e3a8a', fontWeight: 500, minWidth: '120px' }}>Ou cadastrar manual:</span>
                        <input
                          type="text"
                          placeholder="Nome completo do aluno"
                          value={customStudentName}
                          onChange={(e) => setCustomStudentName(e.target.value)}
                          className="form-control"
                          style={{ flex: 2, padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                        <select
                          value={customClassroom}
                          onChange={(e) => setCustomClassroom(e.target.value)}
                          className="form-control"
                          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                        >
                          <option value="Alegria">Alegria</option>
                          <option value="Carinho">Carinho</option>
                          <option value="União">União</option>
                          <option value="Amizade">Amizade</option>
                          <option value="Felicidade">Felicidade</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="responsive-grid-2">
                  {/* TIPO DE REGISTRO */}
                  <div className="filter-group">
                    <label>Tipo de Registro <span style={{ color: '#ef4444' }}>*</span></label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="form-control"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                    >
                      <option value="falta">Falta</option>
                      <option value="atestado">Atestado Médico</option>
                      <option value="atraso">Atraso</option>
                      <option value="saida">Saída Antecipada</option>
                      <option value="amamentacao">Amamentação</option>
                      <option value="outros">Outros / Ocorrências</option>
                    </select>
                  </div>

                  {/* DATA */}
                  <div className="filter-group">
                    <label>Data (Opcional)</label>
                    <input
                      type="date"
                      value={formDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormDate(val);
                        setFormStartDate(val);
                        setFormEndDate(val);
                      }}
                      className="form-control"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                    />
                  </div>
                </div>

                {/* HORÁRIO & QUEM REGISTROU */}
                <div className="responsive-grid-2">
                  <div className="filter-group">
                    <label>Horário (Opcional)</label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="form-control"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                    />
                  </div>
                  <div className="filter-group">
                    <label>Responsável pelo Registro (Opcional)</label>
                    <input
                      type="text"
                      value={formRecordedBy}
                      onChange={(e) => setFormRecordedBy(e.target.value)}
                      className="form-control"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                    />
                  </div>
                </div>

                {/* CAMPOS DINÂMICOS DE ACORDO COM A ABA/CATEGORIA ATIVA */}
                
                {/* 1. Campos específicos de Faltas */}
                {formType === 'falta' && (
                  <>
                    <div className="responsive-grid-2" style={{ padding: '14px', backgroundColor: '#fcf2f2', border: '1px solid #fca5a5', borderRadius: '8px' }}>
                      <div className="filter-group">
                        <label style={{ color: '#b91c1c', fontWeight: 600 }}>A falta é Justificada?</label>
                        <select value={formJustified} onChange={(e) => setFormJustified(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #fca5a5' }}>
                          <option value="sim">Sim (Falta Justificada)</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>
                      <div className="filter-group">
                        <label style={{ color: '#b91c1c', fontWeight: 600 }}>Pais avisaram previamente?</label>
                        <select value={formNotified} onChange={(e) => setFormNotified(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #fca5a5' }}>
                          <option value="sim">Sim</option>
                          <option value="nao">Não</option>
                        </select>
                      </div>
                    </div>

                    <div className="responsive-grid-2" style={{ padding: '14px', backgroundColor: '#fcf2f2', border: '1px solid #fca5a5', borderRadius: '8px' }}>
                      <div className="filter-group">
                        <label style={{ color: '#b91c1c', fontWeight: 600 }}>Data de Início da Ausência</label>
                        <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #fca5a5' }} />
                      </div>
                      <div className="filter-group">
                        <label style={{ color: '#b91c1c', fontWeight: 600 }}>Data de Fim da Ausência</label>
                        <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #fca5a5' }} />
                      </div>
                    </div>
                  </>
                )}

                {/* 2. Campos específicos de Atestado */}
                {formType === 'atestado' && (
                  <div className="responsive-grid-3" style={{ gap: '12px', padding: '14px', backgroundColor: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '8px' }}>
                    <div className="filter-group">
                      <label style={{ color: '#be185d' }}>Início Afastamento</label>
                      <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #fbcfe8' }} />
                    </div>
                    <div className="filter-group">
                      <label style={{ color: '#be185d' }}>Dias Concedidos</label>
                      <input type="number" min="1" placeholder="Ex: 3" value={formDays} onChange={(e) => setFormDays(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #fbcfe8' }} />
                    </div>
                    <div className="filter-group">
                      <label style={{ color: '#be185d' }}>CID Médico</label>
                      <input type="text" placeholder="Ex: J11" value={formCID} onChange={(e) => setFormCID(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #fbcfe8' }} />
                    </div>
                    <div style={{ gridColumn: '1 / -1', color: '#db2777', fontSize: '11px', fontWeight: 600 }}>
                      Retorno às atividades previsto para: {formEndDate ? formatReturnDateBR(formEndDate) : '-'}
                    </div>
                  </div>
                )}

                {/* 3. Campos específicos de Atrasos ou Saídas */}
                {(formType === 'atraso' || formType === 'saida') && (
                  <>
                    <div className="responsive-grid-2" style={{ padding: '14px', backgroundColor: '#fdfbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                      <div className="filter-group">
                        <label style={{ color: '#b45309' }}>Responsável Familiar</label>
                        <input 
                          type="text" 
                          placeholder="Nome de quem trouxe/retirou" 
                          value={formGuardian} 
                          onChange={(e) => setFormGuardian(e.target.value)} 
                          className="form-control" 
                          style={{ width: '100%', padding: '8px', border: '1px solid #fde68a' }} 
                        />
                      </div>
                      
                      {formType === 'saida' ? (
                        <div className="filter-group">
                          <label style={{ color: '#b45309' }}>Retorna hoje?</label>
                          <select value={formHasReturn} onChange={(e) => setFormHasReturn(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #fde68a' }}>
                            <option value="nao">Não retorna</option>
                            <option value="sim">Sim (Retornará mais tarde)</option>
                          </select>
                        </div>
                      ) : (
                        <div className="filter-group">
                          <label style={{ color: '#b45309' }}>Auxiliar/Professor Responsável</label>
                          <input 
                            type="text" 
                            placeholder="Quem acompanhou" 
                            value={formStaff} 
                            onChange={(e) => setFormStaff(e.target.value)} 
                            className="form-control" 
                            style={{ width: '100%', padding: '8px', border: '1px solid #fde68a' }} 
                          />
                        </div>
                      )}
                    </div>

                    {formType === 'atraso' && (
                      <div className="responsive-grid-2" style={{ padding: '14px', backgroundColor: '#fdfbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                        <div className="filter-group">
                          <label style={{ color: '#b45309', fontWeight: 600 }}>O atraso é Justificado?</label>
                          <select value={formJustified} onChange={(e) => setFormJustified(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #fde68a' }}>
                            <option value="sim">Sim (Atraso Justificado)</option>
                            <option value="nao">Não</option>
                          </select>
                        </div>
                        <div className="filter-group">
                          <label style={{ color: '#b45309', fontWeight: 600 }}>Pais avisaram previamente?</label>
                          <select value={formNotified} onChange={(e) => setFormNotified(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #fde68a' }}>
                            <option value="sim">Sim</option>
                            <option value="nao">Não</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 4. Campos específicos de Amamentação */}
                {formType === 'amamentacao' && (
                  <div className="responsive-grid-2" style={{ padding: '14px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px' }}>
                    <div className="filter-group">
                      <label style={{ color: '#047857' }}>Hora Entrada</label>
                      <input type="time" value={formTimeIn} onChange={(e) => setFormTimeIn(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #a7f3d0' }} />
                    </div>
                    <div className="filter-group">
                      <label style={{ color: '#047857' }}>Hora Saída</label>
                      <input type="time" value={formTimeOut} onChange={(e) => setFormTimeOut(e.target.value)} className="form-control" style={{ width: '100%', padding: '8px', border: '1px solid #a7f3d0' }} />
                    </div>
                  </div>
                )}

                {/* MOTIVO / JUSTIFICATIVA */}
                <div className="filter-group">
                  <label>Justificativa / Motivo Declarado (Opcional)</label>
                  <input
                    type="text"
                    value={formMotive}
                    onChange={(e) => setFormMotive(e.target.value)}
                    className="form-control"
                    placeholder="Ex: Teve febre de madrugada / consulta oftalmológica"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)' }}
                  />
                </div>

                {/* OBSERVAÇÕES DETALHADAS */}
                <div className="filter-group">
                  <label>Observações Detalhas (Opcional)</label>
                  <textarea
                    value={formObs}
                    onChange={(e) => setFormObs(e.target.value)}
                    className="form-control"
                    placeholder="Descrição livre com detalhes pertinentes para o registro..."
                    rows={3}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)', resize: 'vertical' }}
                  />
                </div>

                {/* ARQUIVOS ANEXOS (Opcional) - Upload Zone com Drag & Drop */}
                <div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--slate-700)',
                    marginBottom: '10px'
                  }}>
                    <Paperclip size={15} style={{ color: 'var(--brand-primary)' }} />
                    Documento Anexo
                    <span style={{
                      fontWeight: 400,
                      fontSize: '11px',
                      color: 'var(--slate-400)',
                      marginLeft: '2px'
                    }}>(opcional — PDF, imagem, Word, e-mail · máx 15MB)</span>
                  </label>

                  {formAttachment ? (
                    /* ---- PREVIEW: arquivo já selecionado ---- */
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '12px',
                      border: '1.5px solid #86efac'
                    }}>
                      <div style={{
                        width: '40px', height: '40px',
                        borderRadius: '10px',
                        backgroundColor: 'white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {getFileIcon(formAttachment.type)}
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
                          padding: '5px 12px',
                          borderRadius: '8px',
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
                        borderRadius: '12px',
                        padding: '28px 20px',
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
                        width: '48px', height: '48px',
                        borderRadius: '14px',
                        backgroundColor: isDragging ? '#e0e7ff' : '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 12px',
                        color: isDragging ? '#6366f1' : '#94a3b8',
                        transition: 'all 0.15s ease'
                      }}>
                        <Upload size={24} />
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
                      <div style={{ pointerEvents: 'none', fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
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
                            fontSize: '10px',
                            padding: '2px 10px',
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
            </div>

              {/* Ações formulário */}
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-color)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--brand-primary)',
                    color: 'white',
                    border: 'none',
                    fontWeight: 600,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.2)'
                  }}
                >
                  {isSaving ? 'Salvando...' : (isEditing ? 'Confirmar Edição' : 'Salvar Registro')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VISUALIZADOR DE DOCUMENTOS ANEXOS */}
      {isAttachmentModalOpen && activeAttachment && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '750px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--slate-100)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h4 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--slate-800)' }}>
                  Visualizador de Documentos SEAMI
                </h4>
                <span style={{ fontSize: '11px', color: 'var(--slate-400)', display: 'block' }}>
                  Arquivo: {activeAttachment.name}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => downloadAttachment(activeAttachment.name, activeAttachment.type, activeAttachment.data)}
                  style={{
                    border: 'none',
                    backgroundColor: '#eff6ff',
                    color: 'var(--brand-primary)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Download size={14} /> Fazer Download
                </button>
                <button 
                  onClick={() => setIsAttachmentModalOpen(false)}
                  style={{
                    border: 'none',
                    backgroundColor: '#f1f5f9',
                    color: 'var(--slate-500)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div style={{ padding: '24px', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '350px' }}>
              {activeAttachment.type.startsWith('image/') ? (
                <img 
                  src={activeAttachment.data} 
                  alt={activeAttachment.name}
                  style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain', borderRadius: '8px', border: '1px solid var(--slate-200)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }} 
                />
              ) : activeAttachment.type === 'application/pdf' ? (
                <iframe 
                  src={activeAttachment.data} 
                  title={activeAttachment.name}
                  width="100%" 
                  height="450px"
                  style={{ border: '1px solid var(--slate-200)', borderRadius: '8px', backgroundColor: 'white' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '32px' }}>
                  <FileText size={64} style={{ color: 'var(--brand-primary)', marginBottom: '16px' }} />
                  <h5 style={{ fontWeight: 600, fontSize: '15px', color: 'var(--slate-800)', marginBottom: '8px' }}>
                    Documento não renderizável diretamente no navegador
                  </h5>
                  <p style={{ fontSize: '13px', color: 'var(--slate-500)', maxWidth: '320px', margin: '0 auto 20px' }}>
                    Arquivos do Word (.docx) ou arquivos de e-mail (.msg / .eml) necessitam ser baixados para visualização local.
                  </p>
                  <button
                    onClick={() => downloadAttachment(activeAttachment.name, activeAttachment.type, activeAttachment.data)}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--brand-primary)',
                      color: 'white',
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Download size={16} />
                    Fazer Download Agora
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {confirmDeleteId && (() => {
        const occ = occurrences.find(o => o.id === confirmDeleteId);
        return (
          <div className="modal-overlay active" onClick={() => setConfirmDeleteId(null)}>
            <div
              className="modal-card"
              style={{ maxWidth: '420px' }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--slate-800)' }}>
                  Confirmar Exclusão
                </h2>
                <button className="modal-close-btn" onClick={() => setConfirmDeleteId(null)}>✕</button>
              </div>
              <div className="form-body" style={{ padding: '20px' }}>
                <p style={{ fontSize: '14px', color: 'var(--slate-600)', lineHeight: '1.6', marginBottom: '0' }}>
                  Tem certeza que deseja excluir permanentemente o registro de{' '}
                  <strong style={{ color: 'var(--slate-800)' }}>
                    {getTypeText(occ?.type)} de {occ?.studentName}
                  </strong>
                  {occ?.date ? ` (${occ.date.split('-').reverse().join('/')})` : ''}?
                  <br />
                  <span style={{ fontSize: '12px', color: '#b91c1c', marginTop: '8px', display: 'block' }}>
                    ⚠️ Esta ação é irreversível e removerá o registro do banco de dados.
                  </span>
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setConfirmDeleteId(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Trash2 size={15} /> Excluir Registro
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Estilos locais */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
