import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Search, UserCheck, UserX, Users, Calendar, Shield, MapPin } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { 
  saveTurma, 
  deleteTurma, 
  getPessoas, 
  saveStaff, 
  deleteStaff, 
  saveStudent, 
  deleteStudent,
  toggleStudentActive,
  saveSettings
} from '../supabaseClient';

export default function SettingsPage({
  staffList: initialStaffList, // compatibility prop
  handleOpenStaffModal: dummyOpenStaff, // compatibility prop
  handleDeleteStaffMember: dummyDeleteStaff, // compatibility prop
  handleSeedDemoData,
  handleWipeHistory,
  handleResetEntireApp
}) {
  const { activeUser, turmasList, setTurmasList, reloadAppData, recessPeriods, historicalData, setHistoricalData } = useAppContext();

  // Estados locais para dados de pessoas
  const [pessoas, setPessoas] = useState([]);
  const [loadingPessoas, setLoadingPessoas] = useState(true);

  // Estados para Filtros e Busca de Pessoas
  const [filterType, setFilterType] = useState('all'); // 'all' | 'equipe' | 'aluno'
  const [searchQuery, setSearchQuery] = useState('');

  // Estados dos Modais
  const [isTurmaModalOpen, setIsTurmaModalOpen] = useState(false);
  const [isPessoaModalOpen, setIsPessoaModalOpen] = useState(false);
  const [isRecessModalOpen, setIsRecessModalOpen] = useState(false);
  const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);

  // Instâncias atuais em edição (null = Criação)
  const [editingTurma, setEditingTurma] = useState(null);
  const [editingPessoa, setEditingPessoa] = useState(null);

  const [deactivatingStudent, setDeactivatingStudent] = useState(null);
  const [deactivationDateInput, setDeactivationDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [historicalForm, setHistoricalForm] = useState({ id: null, month: '', enrolled: '', present: '' });

  // Estados para Recessos e Feriados
  const [recessForm, setRecessForm] = useState({
    name: '',
    type: 'recesso',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Estados dos Formulários
  const [turmaForm, setTurmaForm] = useState({ name: '', age_group: '' });
  const [pessoaForm, setPessoaForm] = useState({
    name: '',
    type: 'aluno', // 'aluno' | 'secretaria' | 'pedagoga' | 'auxiliar'
    active: true,
    avatar: '👦',
    description: '',
    email: '',
    turma_id: '',
    shift: 'integral', // 'matutino' | 'vespertino' | 'integral'
    has_acompanhamento: false,
    acompanhamento_obs: '',
    acompanhamento_dias: []
  });

  // Carrega todas as pessoas do banco de dados na inicialização
  const loadPessoasData = async () => {
    try {
      setLoadingPessoas(true);
      const data = await getPessoas();
      setPessoas(data || []);
    } catch (err) {
      console.error('Erro ao carregar pessoas:', err);
    } finally {
      setLoadingPessoas(false);
    }
  };

  useEffect(() => {
    loadPessoasData();
  }, []);

  // Handler para recarregar tudo de forma unificada
  const refreshAll = async () => {
    await Promise.all([
      loadPessoasData(),
      reloadAppData()
    ]);
  };

  // ==========================================
  // OPERAÇÕES CRUD DE TURMAS
  // ==========================================
  const handleOpenTurmaModal = (turma = null) => {
    setEditingTurma(turma);
    if (turma) {
      setTurmaForm({
        name: turma.name,
        age_group: turma.age_group
      });
    } else {
      setTurmaForm({ name: '', age_group: '' });
    }
    setIsTurmaModalOpen(true);
  };

  const handleSaveTurma = async (e) => {
    e.preventDefault();
    if (!turmaForm.name.trim() || !turmaForm.age_group.trim()) {
      alert('Por favor, preencha o nome e a faixa etária da turma.');
      return;
    }

    try {
      const payload = {
        id: editingTurma ? editingTurma.id : undefined,
        name: turmaForm.name.trim(),
        age_group: turmaForm.age_group.trim()
      };

      await saveTurma(payload);
      alert(editingTurma ? 'Turma atualizada com sucesso!' : 'Nova turma cadastrada com sucesso!');
      setIsTurmaModalOpen(false);
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar turma no banco de dados.');
    }
  };

  const handleDeleteTurma = async (turmaId, turmaName) => {
    // Verifica se existem alunos vinculados a essa turma antes de deletar
    const pupilsInClass = pessoas.filter(p => p.type === 'aluno' && p.turma_id === turmaId);
    if (pupilsInClass.length > 0) {
      alert(`Não é possível excluir a Turma "${turmaName}" pois existem ${pupilsInClass.length} alunos vinculados a ela. Remova ou transfira os alunos primeiro.`);
      return;
    }

    if (!window.confirm(`Tem certeza absoluta que deseja excluir a Turma "${turmaName}" permanentemente?`)) return;

    try {
      await deleteTurma(turmaId);
      alert('Turma excluída com sucesso!');
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir turma no banco de dados.');
    }
  };

  // ==========================================
  // OPERAÇÕES CRUD DE RECESSOS E FERIADOS
  // ==========================================
  const handleSaveRecess = async (e) => {
    e.preventDefault();
    if (!recessForm.name.trim() || !recessForm.startDate) {
      alert('Por favor, preencha o nome/descrição e a data de início.');
      return;
    }

    const start = recessForm.startDate;
    const end = recessForm.type === 'feriado' ? recessForm.startDate : recessForm.endDate;

    if (start > end) {
      alert('A data de término não pode ser anterior à data de início.');
      return;
    }

    try {
      const newPeriod = {
        id: 'recess_' + Date.now(),
        name: recessForm.name.trim(),
        type: recessForm.type,
        startDate: start,
        endDate: end
      };

      const updatedList = [...(recessPeriods || []), newPeriod];
      await saveSettings({ recess_periods: JSON.stringify(updatedList) });
      alert(recessForm.type === 'feriado' ? 'Feriado adicionado com sucesso!' : 'Recesso adicionado com sucesso!');
      setIsRecessModalOpen(false);
      setRecessForm({
        name: '',
        type: 'recesso',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar período de recesso/feriado.');
    }
  };

  const handleDeleteRecess = async (id, name) => {
    if (!window.confirm(`Tem certeza que deseja excluir o período "${name}"?`)) return;
    try {
      const updatedList = (recessPeriods || []).filter(p => p.id !== id);
      await saveSettings({ recess_periods: JSON.stringify(updatedList) });
      alert('Período excluído com sucesso!');
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir período.');
    }
  };

  // ==========================================
  // OPERAÇÕES CRUD DE PESSOAS
  // ==========================================
  const handleOpenPessoaModal = (pessoa = null) => {
    setEditingPessoa(pessoa);
    if (pessoa) {
      const isStudent = pessoa.type === 'aluno';
      let hasAcompanhamento = false;
      let acompanhamentoObs = '';
      let acompanhamentoDias = [];
      if (isStudent && pessoa.description) {
        try {
          const parsed = JSON.parse(pessoa.description);
          hasAcompanhamento = parsed.has_acompanhamento || false;
          acompanhamentoObs = parsed.acompanhamento_obs || '';
          acompanhamentoDias = parsed.acompanhamento_dias || [];
        } catch (e) {}
      }

      setPessoaForm({
        name: pessoa.name,
        type: pessoa.type,
        active: pessoa.active ?? true,
        avatar: pessoa.avatar || '👦',
        description: pessoa.description || '',
        email: pessoa.email || '',
        turma_id: pessoa.turma_id || '',
        shift: pessoa.shift || 'integral',
        has_acompanhamento: hasAcompanhamento,
        acompanhamento_obs: acompanhamentoObs,
        acompanhamento_dias: acompanhamentoDias
      });
    } else {
      setPessoaForm({
        name: '',
        type: 'aluno',
        active: true,
        avatar: '👦',
        description: '',
        email: '',
        turma_id: turmasList[0]?.id || '',
        shift: 'integral',
        has_acompanhamento: false,
        acompanhamento_obs: '',
        acompanhamento_dias: []
      });
    }
    setIsPessoaModalOpen(true);
  };

  const handleSavePessoa = async (e) => {
    e.preventDefault();
    if (!pessoaForm.name.trim()) {
      alert('O nome completo é obrigatório.');
      return;
    }

    try {
      const isStudent = pessoaForm.type === 'aluno';
      const id = editingPessoa ? editingPessoa.id : undefined;

      if (isStudent) {
        // Fluxo de Aluno
        const payload = {
          id,
          name: pessoaForm.name.trim(),
          active: pessoaForm.active,
          turma_id: pessoaForm.turma_id || turmasList[0]?.id || '1',
          shift: pessoaForm.shift,
          has_acompanhamento: pessoaForm.has_acompanhamento,
          acompanhamento_obs: pessoaForm.has_acompanhamento ? pessoaForm.acompanhamento_obs.trim() : '',
          acompanhamento_dias: pessoaForm.has_acompanhamento ? pessoaForm.acompanhamento_dias : []
        };
        await saveStudent(payload);
      } else {
        // Fluxo de Funcionário (Equipe)
        const payload = {
          id,
          name: pessoaForm.name.trim(),
          role: pessoaForm.type, // Map type para role esperado no backend
          avatar: pessoaForm.avatar,
          desc: pessoaForm.description.trim(),
          email: pessoaForm.email.trim() || null
        };
        await saveStaff(payload);
      }

      alert(editingPessoa ? 'Perfil de pessoa atualizado com sucesso!' : 'Nova pessoa cadastrada com sucesso!');
      setIsPessoaModalOpen(false);
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar dados da pessoa no banco de dados.');
    }
  };

  const handleDeletePessoa = async (pessoa) => {
    const isStudent = pessoa.type === 'aluno';
    const confirmMsg = isStudent 
      ? `Tem certeza que deseja excluir o cadastro do aluno "${pessoa.name}"? Isso removerá também o histórico de presença e ocorrências associados!`
      : `Tem certeza que deseja remover "${pessoa.name}" da equipe?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isStudent) {
        await deleteStudent(pessoa.id);
      } else {
        await deleteStaff(pessoa.id);
      }
      alert('Cadastro excluído com sucesso!');
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir pessoa.');
    }
  };

  const handleTogglePessoaActive = async (pessoa) => {
    if (pessoa.type !== 'aluno') return; // Apenas alunos possuem toggle direto de ativo/inativo nesta tela
    if (pessoa.active) {
      setDeactivatingStudent(pessoa);
      setDeactivationDateInput(new Date().toISOString().split('T')[0]);
    } else {
      try {
        await toggleStudentActive(pessoa.id);
        alert('Aluno reativado com sucesso!');
        await refreshAll();
      } catch (err) {
        console.error(err);
        alert('Erro ao reativar aluno.');
      }
    }
  };

  const confirmDeactivation = async () => {
    if (!deactivatingStudent) return;
    try {
      await toggleStudentActive(deactivatingStudent.id, deactivationDateInput);
      setDeactivatingStudent(null);
      alert('Aluno desativado com sucesso!');
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert('Erro ao desativar aluno.');
    }
  };

  // ==========================================
  // OPERAÇÕES CRUD DE DADOS HISTÓRICOS
  // ==========================================
  const handleOpenHistoricalModal = (item = null) => {
    if (item) {
      setHistoricalForm({
        id: item.id,
        month: item.month,
        enrolled: item.enrolled,
        present: item.present
      });
    } else {
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const y = lastMonthDate.getFullYear();
      const m = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
      setHistoricalForm({
        id: null,
        month: `${y}-${m}`,
        enrolled: '',
        present: ''
      });
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
      alert(`Já existe um registro histórico para o mês ${historicalForm.month.split('-').reverse().join('/')}.`);
      return;
    }

    try {
      let updatedList;
      if (historicalForm.id) {
        updatedList = (historicalData || []).map(h => 
          h.id === historicalForm.id ? { ...h, month: historicalForm.month, enrolled, present } : h
        );
      } else {
        const newItem = {
          id: 'hist_' + Date.now(),
          month: historicalForm.month,
          enrolled,
          present
        };
        updatedList = [...(historicalData || []), newItem];
      }

      updatedList.sort((a, b) => b.month.localeCompare(a.month));

      await saveSettings({ historical_data: JSON.stringify(updatedList) });
      setHistoricalData(updatedList);
      alert('Dados históricos salvos com sucesso!');
      setIsHistoricalModalOpen(false);
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar dados históricos.');
    }
  };

  const handleDeleteHistorical = async (id, month) => {
    const formattedMonth = month.split('-').reverse().join('/');
    if (!window.confirm(`Tem certeza que deseja excluir os dados históricos de ${formattedMonth}?`)) return;
    
    try {
      const updatedList = (historicalData || []).filter(h => h.id !== id);
      await saveSettings({ historical_data: JSON.stringify(updatedList) });
      setHistoricalData(updatedList);
      alert('Dados históricos excluídos com sucesso!');
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir dados históricos.');
    }
  };

  // Filtragem de Pessoas com base nas abas e busca
  const filteredPessoas = pessoas.filter(pessoa => {
    const matchesSearch = pessoa.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (pessoa.email && pessoa.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filterType === 'equipe') {
      return matchesSearch && pessoa.type !== 'aluno';
    }
    if (filterType === 'aluno') {
      return matchesSearch && pessoa.type === 'aluno';
    }
    return matchesSearch;
  });

  return (
    <section className="panel-section active" style={{ fontFamily: 'Outfit, sans-serif' }}>
      
      {/* 1. GRID PRINCIPAL DE CONFIGURAÇÕES GLOBAIS */}
      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        
        {/* CARD DO BANCO DE DADOS */}
        <div className="settings-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--slate-100)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--slate-800)', margin: '0 0 8px 0' }}>Banco de Dados Supabase (Nuvem)</h3>
          <p className="settings-desc" style={{ fontSize: '13px', color: 'var(--slate-500)', margin: '0 0 20px 0' }}>Controle a persistência das ocorrências e do simulador na nuvem do Supabase.</p>
          
          <div className="settings-actions" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="settings-action-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--slate-50)', paddingBottom: '12px' }}>
              <div className="action-info">
                <span className="action-title" style={{ display: 'block', fontWeight: '700', fontSize: '14px', color: 'var(--slate-700)' }}>Gerar Dados Fictícios de Demonstração</span>
                <span className="action-desc" style={{ display: 'block', fontSize: '11px', color: 'var(--slate-400)', marginTop: '2px' }}>Semeia 95 ocorrências nos últimos 30 dias para testes dos gráficos e IA.</span>
              </div>
              <button className="secondary-btn" onClick={handleSeedDemoData} style={{ padding: '8px 16px', fontSize: '12px', flexShrink: 0 }}>Gerar Demo</button>
            </div>
            
            <div className="settings-action-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--slate-50)', paddingBottom: '12px' }}>
              <div className="action-info">
                <span className="action-title" style={{ display: 'block', fontWeight: '700', fontSize: '14px', color: 'var(--slate-700)' }}>Limpar Histórico de Ocorrências</span>
                <span className="action-desc text-danger" style={{ display: 'block', fontSize: '11px', color: 'var(--slate-400)', marginTop: '2px' }}>Remove os lançamentos do Caderno SEAMI, mantendo cadastros.</span>
              </div>
              <button className="danger-btn" onClick={handleWipeHistory} style={{ padding: '8px 16px', fontSize: '12px', flexShrink: 0 }}>Limpar Histórico</button>
            </div>
            
            <div className="settings-action-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
              <div className="action-info">
                <span className="action-title" style={{ display: 'block', fontWeight: '700', fontSize: '14px', color: 'var(--slate-700)' }}>Reiniciar Todo o Banco Supabase</span>
                <span className="action-desc text-danger" style={{ display: 'block', fontSize: '11px', color: 'var(--slate-400)', marginTop: '2px' }}>Deleta alunos, ocorrências e equipe, restaurando os padrões de semente.</span>
              </div>
              <button className="danger-btn" onClick={handleResetEntireApp} style={{ padding: '8px 16px', fontSize: '12px', flexShrink: 0 }}>Zerar Sistema</button>
            </div>
          </div>
        </div>
        
        {/* CARD DO SIMULADOR E PERFIS */}
        <div className="settings-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--slate-100)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--slate-800)', margin: '0 0 8px 0' }}>Níveis de Acesso e Permissões</h3>
            <p className="settings-desc" style={{ fontSize: '13px', color: 'var(--slate-500)', margin: '0 0 16px 0' }}>A estrutura de segurança do sistema está baseada nos seguintes cargos:</p>
            
            <div className="settings-info-box" style={{ backgroundColor: 'var(--slate-50)', padding: '16px', borderRadius: '12px', border: '1px solid var(--slate-100)' }}>
              <ul className="permissions-list" style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: 'var(--slate-600)', margin: 0 }}>
                <li><strong>Secretária / Diretora:</strong> Controle administrativo irrestrito (CRUD total de turmas, alunos, funcionários, exclusão de ocorrências e redefinições de banco).</li>
                <li><strong>Pedagogia:</strong> Acesso aos relatórios pedagógicos, gráficos e abas de IA. Não pode alterar a equipe ou reiniciar a base.</li>
                <li><strong>Auxiliar:</strong> Foco em rapidez. Apenas dashboard simplificado, listagem de ocorrências e lançamento rápido. Aba de configurações oculta.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CARD DE DADOS HISTÓRICOS */}
        <div className="settings-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--slate-100)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--slate-800)', margin: 0 }}>📅 Dados Históricos de Frequência</h3>
              <button className="primary-btn" onClick={() => handleOpenHistoricalModal()} style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}>
                + Adicionar
              </button>
            </div>
            <p className="settings-desc" style={{ fontSize: '13px', color: 'var(--slate-500)', margin: '0 0 16px 0' }}>
              Insira a quantidade de matriculados e presentes de meses anteriores aos registros no app.
            </p>
            
            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {historicalData && historicalData.length > 0 ? (
                historicalData.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: 'var(--slate-50)', borderRadius: '8px', border: '1px solid var(--slate-100)', fontSize: '12px' }}>
                    <div>
                      <strong style={{ color: 'var(--slate-700)' }}>{item.month.split('-').reverse().join('/')}</strong>
                      <span style={{ marginLeft: '8px', color: 'var(--slate-500)' }}>
                        {item.enrolled} Alunos / {item.present} Pres. ({item.enrolled > 0 ? Math.round((item.present / item.enrolled) * 100) : 100}%)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleOpenHistoricalModal(item)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '2px' }} title="Editar"><Edit size={14} /></button>
                      <button onClick={() => handleDeleteHistorical(item.id, item.month)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '2px' }} title="Excluir"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--slate-400)', fontSize: '12px', border: '1px dashed var(--slate-200)', borderRadius: '8px' }}>
                  Nenhum dado histórico registrado.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {activeUser?.role === 'diretora' && (
        <>
          {/* ==================================================================
              2. SEÇÃO: GESTÃO DE TURMAS (Salas)
              ================================================================== */}
          <div className="settings-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--slate-100)', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--slate-100)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--slate-800)', margin: 0 }}>Gestão de Turmas (Salas)</h3>
                <p className="settings-desc" style={{ fontSize: '13px', color: 'var(--slate-500)', margin: '2px 0 0 0' }}>Cadastre e gerencie as turmas e faixas etárias de atendimento da creche.</p>
              </div>
              <button className="primary-btn" onClick={() => handleOpenTurmaModal()} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '10px 16px' }}>
                <Plus size={16} />
                <span>Adicionar Turma</span>
              </button>
            </div>
            
            <div className="staff-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {turmasList.map(turma => {
                const enrolledCount = pessoas.filter(p => p.type === 'aluno' && p.turma_id === turma.id).length;
                return (
                  <div key={turma.id} className="staff-member-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--slate-50)', borderRadius: '12px', border: '1px solid var(--slate-200)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '20px' }}>🏫</span>
                          <span style={{ fontWeight: '800', color: 'var(--slate-800)', fontSize: '15px' }}>{turma.name}</span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={10} />
                          <span>{enrolledCount} {enrolledCount === 1 ? 'aluno' : 'alunos'}</span>
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--slate-500)', margin: '4px 0 0 0' }}>
                        <strong>Faixa Etária:</strong> {turma.age_group}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--slate-200)/10', paddingTop: '12px', marginTop: '16px' }}>
                      <button className="secondary-btn" onClick={() => handleOpenTurmaModal(turma)} style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Edit size={12} />
                        <span>Editar</span>
                      </button>
                      <button className="danger-btn" onClick={() => handleDeleteTurma(turma.id, turma.name)} style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Trash2 size={12} />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ==================================================================
              NOVA SEÇÃO: GESTÃO DE RECESSOS E FERIADOS
              ================================================================== */}
          <div className="settings-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--slate-100)', marginBottom: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--slate-100)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--slate-800)', margin: 0 }}>Calendário de Recessos e Feriados</h3>
                <p className="settings-desc" style={{ fontSize: '13px', color: 'var(--slate-500)', margin: '2px 0 0 0' }}>Configure os períodos de recesso e feriados em que não haverá aplicação de faltas para os alunos.</p>
              </div>
              <button className="primary-btn" onClick={() => {
                setRecessForm({
                  name: '',
                  type: 'recesso',
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0]
                });
                setIsRecessModalOpen(true);
              }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '10px 16px' }}>
                <Plus size={16} />
                <span>Configurar Período</span>
              </button>
            </div>
            
            {recessPeriods && recessPeriods.length > 0 ? (
              <div className="staff-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {recessPeriods.map(period => {
                  const isFeriado = period.type === 'feriado';
                  return (
                    <div key={period.id} className="staff-member-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px', backgroundColor: 'var(--slate-50)', borderRadius: '12px', border: '1px solid var(--slate-200)' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '20px' }}>{isFeriado ? '🎉' : '🏖️'}</span>
                            <span style={{ fontWeight: '800', color: 'var(--slate-800)', fontSize: '15px' }}>{period.name}</span>
                          </div>
                          <span style={{ 
                            fontSize: '10px', 
                            fontWeight: '700', 
                            backgroundColor: isFeriado ? '#ecfdf5' : '#fffbeb', 
                            color: isFeriado ? '#047857' : '#b45309', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            textTransform: 'uppercase' 
                          }}>
                            {isFeriado ? 'Feriado' : 'Recesso'}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--slate-500)', margin: '4px 0 0 0' }}>
                          <strong>Período:</strong> {isFeriado 
                            ? period.startDate.split('-').reverse().join('/') 
                            : `${period.startDate.split('-').reverse().join('/')} até ${period.endDate.split('-').reverse().join('/')}`}
                        </p>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--slate-200)/10', paddingTop: '12px', marginTop: '16px' }}>
                        <button className="danger-btn" onClick={() => handleDeleteRecess(period.id, period.name)} style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', height: '30px' }}>
                          <Trash2 size={12} />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--slate-400)', border: '1px dashed var(--slate-200)', borderRadius: '12px', fontSize: '13px' }}>
                Nenhum recesso ou feriado configurado no momento.
              </div>
            )}
          </div>

          {/* ==================================================================
              3. SEÇÃO: GESTÃO DE PESSOAS (Equipe e Alunos Unificado)
              ================================================================== */}
          <div className="settings-card" style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--slate-100)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--slate-100)', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--slate-800)', margin: 0 }}>Gestão Unificada de Pessoas</h3>
                <p className="settings-desc" style={{ fontSize: '13px', color: 'var(--slate-500)', margin: '2px 0 0 0' }}>Cadastre e gerencie perfis, cargos e permissões de funcionários ou edite as fichas de matrícula dos alunos.</p>
              </div>
              <button className="primary-btn" onClick={() => handleOpenPessoaModal()} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '10px 16px' }}>
                <Plus size={16} />
                <span>Adicionar Pessoa</span>
              </button>
            </div>

            {/* FILTROS E BUSCA INTERNA */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div className="module-tabs" style={{ display: 'flex', gap: '6px', padding: 0, border: 'none', backgroundColor: 'transparent' }}>
                {[
                  { id: 'all', label: '👥 Ver Todos' },
                  { id: 'equipe', label: '👩‍💼 Equipe' },
                  { id: 'aluno', label: '👦 Alunos' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterType(tab.id)}
                    className={`module-tab-btn ${filterType === tab.id ? 'active' : ''}`}
                    style={{
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: filterType === tab.id ? 'var(--color-primary)' : 'var(--slate-100)',
                      color: filterType === tab.id ? 'white' : 'var(--slate-600)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* BARRA DE PESQUISA */}
              <div style={{ position: 'relative', minWidth: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome ou e-mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    fontSize: '13px',
                    borderRadius: '8px',
                    border: '1px solid var(--slate-200)',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            {loadingPessoas ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--slate-400)' }}>Carregando listagem de pessoas...</div>
            ) : filteredPessoas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--slate-400)', border: '1px dashed var(--slate-200)', borderRadius: '12px' }}>
                Nenhuma pessoa encontrada com os filtros atuais.
              </div>
            ) : (
              <div className="table-card" style={{ marginTop: '8px' }}>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'center' }}>Avatar</th>
                        <th>Nome Completo</th>
                        <th>Tipo / Perfil</th>
                        <th>Informações de Vínculo</th>
                        <th>Status</th>
                        <th className="actions-column" style={{ width: '120px' }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPessoas.map(pessoa => {
                        const isStudent = pessoa.type === 'aluno';
                        const turma = turmasList.find(t => t.id === pessoa.turma_id);
                        
                        return (
                          <tr key={pessoa.id} style={{ opacity: pessoa.active === false ? 0.6 : 1 }}>
                            <td style={{ fontSize: '22px', textAlign: 'center', padding: '12px 8px' }}>
                              {isStudent ? '👦' : (pessoa.avatar || '👩‍💼')}
                            </td>
                            <td style={{ fontWeight: '700', color: 'var(--slate-800)', fontSize: '13.5px' }}>
                              {pessoa.name}
                            </td>
                            <td>
                              <span className={`role-badge badge-${pessoa.type === 'aluno' ? 'aluno' : (pessoa.type === 'secretaria' ? 'diretora' : (pessoa.type === 'pedagoga' ? 'pedagoga' : 'auxiliar'))}`} style={{ fontSize: '9px', padding: '3px 8px', borderRadius: '4px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                {pessoa.type === 'aluno' ? 'Aluno' : (pessoa.type === 'secretaria' ? 'Secretária' : (pessoa.type === 'pedagoga' ? 'Pedagogia' : 'Auxiliar'))}
                              </span>
                            </td>
                            <td style={{ fontSize: '12.5px', color: 'var(--slate-600)' }}>
                              {isStudent ? (() => {
                                let hasAcompanhamento = false;
                                let acompanhamentoObs = '';
                                let acompanhamentoDias = [];
                                if (pessoa.description) {
                                  try {
                                    const parsed = JSON.parse(pessoa.description);
                                    hasAcompanhamento = parsed.has_acompanhamento || false;
                                    acompanhamentoObs = parsed.acompanhamento_obs || '';
                                    acompanhamentoDias = parsed.acompanhamento_dias || [];
                                  } catch (e) {}
                                }
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px' }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ color: 'var(--slate-400)' }}>Sala:</span> <strong>{turma ? turma.name : 'Sem sala'}</strong>
                                      </span>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <span style={{ color: 'var(--slate-400)' }}>Turno:</span> <strong style={{ textTransform: 'capitalize' }}>{pessoa.shift || 'Integral'}</strong>
                                      </span>
                                    </div>
                                    {hasAcompanhamento && (
                                      <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
                                        🩺 Acomp.: {acompanhamentoObs} {acompanhamentoDias && acompanhamentoDias.length > 0 && `(${acompanhamentoDias.map(d => ({ seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex' }[d])).join(', ')})`}
                                      </span>
                                    )}
                                  </div>
                                );
                              })() : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {pessoa.email && (
                                    <span style={{ wordBreak: 'break-all' }}>
                                      <strong>{pessoa.email}</strong>
                                    </span>
                                  )}
                                  {pessoa.description && (
                                    <span style={{ fontStyle: 'italic', color: 'var(--slate-500)', fontSize: '11px' }}>
                                      "{pessoa.description}"
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td>
                              {isStudent ? (
                                <button 
                                  type="button" 
                                  onClick={() => handleTogglePessoaActive(pessoa)} 
                                  title={pessoa.active ? "Desativar matrícula" : "Ativar matrícula"}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: pessoa.active ? '#16a34a' : '#dc2626',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: pessoa.active ? '#f0fdf4' : '#fef2f2',
                                    border: pessoa.active ? '1px solid #bbf7d0' : '1px solid #fecaca'
                                  }}
                                >
                                  {pessoa.active ? <UserCheck size={13} /> : <UserX size={13} />}
                                  <span>{pessoa.active ? 'Ativo' : 'Inativo'}</span>
                                </button>
                              ) : (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#0284c7', fontWeight: 700, padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd' }}>
                                  <Shield size={12} />
                                  <span>EQUIPE</span>
                                </div>
                              )}
                            </td>
                            <td className="actions-column">
                              <div className="action-row-buttons" style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button 
                                  className="row-action-btn" 
                                  onClick={() => handleOpenPessoaModal(pessoa)} 
                                  title="Editar cadastro"
                                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  className="row-action-btn delete" 
                                  onClick={() => handleDeletePessoa(pessoa)} 
                                  title="Excluir permanentemente"
                                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                  <Trash2 size={14} />
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
          </div>

          {/* ==================================================================
              4. MODAL: CADASTRAR/EDITAR TURMA
              ================================================================== */}
          {isTurmaModalOpen && (
            <div className="modal-overlay active">
              <div className="modal-card">
                <div className="modal-header">
                  <h2>{editingTurma ? 'Editar Sala/Turma' : 'Cadastrar Nova Turma'}</h2>
                  <button className="modal-close-btn" onClick={() => setIsTurmaModalOpen(false)}>×</button>
                </div>
                
                <form onSubmit={handleSaveTurma}>
                  <div className="form-body">
                    <div className="form-group">
                      <label>Nome da Sala*</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ex: União, Alegria, Estrela"
                        value={turmaForm.name}
                        onChange={(e) => setTurmaForm({ ...turmaForm, name: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Faixa Etária / Grupo de Idade*</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ex: 2 a 3 anos (Maternal I)"
                        value={turmaForm.age_group}
                        onChange={(e) => setTurmaForm({ ...turmaForm, age_group: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="secondary-btn" onClick={() => setIsTurmaModalOpen(false)}>Cancelar</button>
                    <button type="submit" className="primary-btn">Salvar Turma</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ==================================================================
              5. MODAL: CADASTRAR/EDITAR PESSOA (UNIFICADO)
              ================================================================== */}
          {isPessoaModalOpen && (
            <div className="modal-overlay active">
              <div className="modal-card" style={{ maxWidth: '480px' }}>
                <div className="modal-header">
                  <h2>{editingPessoa ? 'Editar Cadastro de Pessoa' : 'Cadastrar Nova Pessoa'}</h2>
                  <button className="modal-close-btn" onClick={() => setIsPessoaModalOpen(false)}>×</button>
                </div>
                
                <form onSubmit={handleSavePessoa}>
                  <div className="form-body">
                    {/* Seletor do Tipo de Pessoa (Apenas na criação) */}
                    <div className="form-group">
                      <label>Classificação / Tipo de Registro*</label>
                      <select 
                        required
                        disabled={!!editingPessoa}
                        value={pessoaForm.type}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPessoaForm({
                            ...pessoaForm,
                            type: val,
                            // Define o avatar padrão dependendo do cargo
                            avatar: val === 'aluno' ? '👦' : (val === 'secretaria' ? '👩‍💼' : (val === 'pedagoga' ? '👩‍🏫' : '👩'))
                          });
                        }}
                      >
                        <option value="aluno">👦 Aluno (Criança Matriculada)</option>
                        <option value="auxiliar">👩 Auxiliar / Professor(a) (Equipe)</option>
                        <option value="pedagoga">👩‍🏫 Pedagogia / Coordenação (Equipe)</option>
                        <option value="secretaria">👩‍💼 Secretaria / Administração (Equipe)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Nome Completo*</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Nome completo da pessoa"
                        value={pessoaForm.name}
                        onChange={(e) => setPessoaForm({ ...pessoaForm, name: e.target.value })}
                      />
                    </div>

                    {/* DADOS DINÂMICOS SE FOR ALUNO */}
                    {pessoaForm.type === 'aluno' ? (
                      <>
                        <div className="form-group">
                          <label>Sala / Turma*</label>
                          <select 
                            required
                            value={pessoaForm.turma_id}
                            onChange={(e) => setPessoaForm({ ...pessoaForm, turma_id: e.target.value })}
                          >
                            <option value="">Selecione uma turma</option>
                            {turmasList.map(t => (
                              <option key={t.id} value={t.id}>{t.name} ({t.age_group})</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Turno de Matrícula*</label>
                          <select 
                            required
                            value={pessoaForm.shift}
                            onChange={(e) => setPessoaForm({ ...pessoaForm, shift: e.target.value })}
                          >
                            <option value="integral">Integral (Matutino + Vespertino)</option>
                            <option value="matutino">Matutino (Manhã)</option>
                            <option value="vespertino">Vespertino (Tarde)</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0 12px 0' }}>
                          <input
                            type="checkbox"
                            id="pessoa_has_acompanhamento"
                            checked={pessoaForm.has_acompanhamento}
                            onChange={(e) => setPessoaForm(f => ({ ...f, has_acompanhamento: e.target.checked, acompanhamento_dias: e.target.checked ? f.acompanhamento_dias || [] : [] }))}
                            style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                          />
                          <label htmlFor="pessoa_has_acompanhamento" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--slate-700)', cursor: 'pointer', userSelect: 'none' }}>
                            Possui acompanhamento (psicólogo, fono ou justificativa de atraso)
                          </label>
                        </div>
                        {pessoaForm.has_acompanhamento && (
                          <>
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', color: 'var(--slate-600)' }}>
                                Dias da semana programados para o acompanhamento/atraso:*
                              </label>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                {['seg', 'ter', 'qua', 'qui', 'sex'].map(day => {
                                  const isSelected = pessoaForm.acompanhamento_dias?.includes(day);
                                  const dayLabels = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta' };
                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => {
                                        const current = pessoaForm.acompanhamento_dias || [];
                                        const updated = current.includes(day)
                                          ? current.filter(d => d !== day)
                                          : [...current, day];
                                        setPessoaForm(f => ({ ...f, acompanhamento_dias: updated }));
                                      }}
                                      style={{
                                        padding: '5px 12px',
                                        borderRadius: '20px',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        border: isSelected ? '1px solid var(--brand-primary)' : '1px solid var(--slate-200)',
                                        backgroundColor: isSelected ? '#f5f3ff' : 'white',
                                        color: isSelected ? 'var(--brand-primary)' : 'var(--slate-500)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                      }}
                                    >
                                      {dayLabels[day]}
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allDays = ['seg', 'ter', 'qua', 'qui', 'sex'];
                                    const isAllSelected = pessoaForm.acompanhamento_dias?.length === 5;
                                    setPessoaForm(f => ({ ...f, acompanhamento_dias: isAllSelected ? [] : allDays }));
                                  }}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    fontSize: '11.5px',
                                    fontWeight: 600,
                                    border: '1px dashed var(--slate-300)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--slate-500)',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {pessoaForm.acompanhamento_dias?.length === 5 ? 'Limpar Todos' : 'Todos os Dias'}
                                </button>
                              </div>
                            </div>
                            <div className="form-group">
                              <label>Orientação / Observação do Acompanhamento*</label>
                              <textarea
                                required
                                placeholder="Ex: Chega atrasado segundas e quartas por fazer fonoaudiólogo às 08h."
                                value={pessoaForm.acompanhamento_obs}
                                onChange={(e) => setPessoaForm(f => ({ ...f, acompanhamento_obs: e.target.value }))}
                                rows={2}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)', resize: 'vertical' }}
                              />
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      /* DADOS DINÂMICOS SE FOR EQUIPE (FUNCIONÁRIO) */
                      <>
                        <div className="form-group">
                          <label>Endereço de E-mail (Opcional)</label>
                          <input 
                            type="email" 
                            placeholder="exemplo@seami.com"
                            value={pessoaForm.email}
                            onChange={(e) => setPessoaForm({ ...pessoaForm, email: e.target.value })}
                          />
                        </div>

                        <div className="form-group">
                          <label>Avatar / Ícone Emoji*</label>
                          <select 
                            required
                            value={pessoaForm.avatar}
                            onChange={(e) => setPessoaForm({ ...pessoaForm, avatar: e.target.value })}
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
                          <label>Descrição de Atribuição (Opcional)</label>
                          <input 
                            type="text" 
                            placeholder="Ex: Responsável pela Sala Alegria"
                            value={pessoaForm.description}
                            onChange={(e) => setPessoaForm({ ...pessoaForm, description: e.target.value })}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="secondary-btn" onClick={() => setIsPessoaModalOpen(false)}>Cancelar</button>
                    <button type="submit" className="primary-btn">Salvar Cadastro</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal Confirmar Desativação de Aluno */}
          {deactivatingStudent && (
            <div className="modal-overlay active">
              <div className="modal-card" style={{ maxWidth: '420px' }}>
                <div className="modal-header">
                  <h2>Confirmar Desligamento</h2>
                  <button className="modal-close-btn" onClick={() => setDeactivatingStudent(null)}>✕</button>
                </div>
                <div className="form-body">
                  <p style={{ marginBottom: '16px', color: 'var(--slate-600)', fontSize: '14px', lineHeight: '1.5' }}>
                    Tem certeza que deseja desativar o aluno <strong>{deactivatingStudent.name}</strong>?
                  </p>
                  <div className="form-group">
                    <label>Data do Desligamento*</label>
                    <input
                      type="date"
                      required
                      value={deactivationDateInput}
                      onChange={(e) => setDeactivationDateInput(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="secondary-btn" onClick={() => setDeactivatingStudent(null)}>Cancelar</button>
                  <button type="button" className="primary-btn" onClick={confirmDeactivation}>Confirmar Desativação</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal: Configurar Recesso ou Feriado */}
          {isRecessModalOpen && (
            <div className="modal-overlay active">
              <div className="modal-card" style={{ maxWidth: '440px' }}>
                <div className="modal-header">
                  <h2>Configurar Recesso ou Feriado</h2>
                  <button className="modal-close-btn" onClick={() => setIsRecessModalOpen(false)}>×</button>
                </div>
                
                <form onSubmit={handleSaveRecess}>
                  <div className="form-body">
                    <div className="form-group">
                      <label>Tipo de Evento*</label>
                      <select 
                        required
                        value={recessForm.type}
                        onChange={(e) => {
                          const type = e.target.value;
                          setRecessForm({ ...recessForm, type });
                        }}
                      >
                        <option value="recesso">🏖️ Recesso Escolar (Período de férias/pausa)</option>
                        <option value="feriado">🎉 Feriado (Único dia ou emendado)</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Descrição / Nome*</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Ex: Recesso de Fim de Ano, Sexta-feira Santa"
                        value={recessForm.name}
                        onChange={(e) => setRecessForm({ ...recessForm, name: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label>Data de Início*</label>
                      <input 
                        type="date" 
                        required
                        value={recessForm.startDate}
                        onChange={(e) => {
                          const startDate = e.target.value;
                          setRecessForm(prev => ({
                            ...prev,
                            startDate,
                            endDate: prev.type === 'feriado' ? startDate : prev.endDate
                          }));
                        }}
                      />
                    </div>

                    {recessForm.type === 'recesso' && (
                      <div className="form-group">
                        <label>Data de Término*</label>
                        <input 
                          type="date" 
                          required
                          value={recessForm.endDate}
                          onChange={(e) => setRecessForm({ ...recessForm, endDate: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="secondary-btn" onClick={() => setIsRecessModalOpen(false)}>Cancelar</button>
                    <button type="submit" className="primary-btn">Salvar Configuração</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Modal: Adicionar/Editar Dados Históricos */}
          {isHistoricalModalOpen && (
            <div className="modal-overlay active">
              <div className="modal-card" style={{ maxWidth: '440px' }}>
                <div className="modal-header">
                  <h2>{historicalForm.id ? 'Editar Dados Históricos' : 'Adicionar Dados Históricos'}</h2>
                  <button className="modal-close-btn" onClick={() => setIsHistoricalModalOpen(false)}>✕</button>
                </div>
                <form onSubmit={handleSaveHistorical}>
                  <div className="form-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                    <div className="form-group">
                      <label>Mês / Ano*</label>
                      <input 
                        type="month" 
                        required 
                        disabled={!!historicalForm.id}
                        value={historicalForm.month}
                        onChange={(e) => setHistoricalForm({ ...historicalForm, month: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: historicalForm.id ? 'var(--bg-input)' : 'inherit' }}
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
                        onChange={(e) => setHistoricalForm({ ...historicalForm, enrolled: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
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
                        onChange={(e) => setHistoricalForm({ ...historicalForm, present: e.target.value })}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                      />
                    </div>
                  </div>
                  <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button type="button" className="secondary-btn" onClick={() => setIsHistoricalModalOpen(false)} style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px' }}>Cancelar</button>
                    <button type="submit" className="primary-btn" style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px' }}>Salvar Dados</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
