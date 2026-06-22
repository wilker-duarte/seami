import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Undo, HelpCircle, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getStudents, saveStudent, toggleStudentActive, deleteStudent } from '../supabaseClient';

const CLASSROOMS = ['Alegria', 'Carinho', 'União', 'Amizade', 'Felicidade'];

const formatDateBR = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

export default function StudentsPage() {
  const { activeUser, students, setStudents } = useAppContext();

  const [search, setSearch] = useState('');
  const [classroomFilter, setClassroomFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('name'); // 'name' | 'classroom' | 'shift' | 'active'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' | 'desc'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState({ name: '', classroom: '', active: 'active', shift: 'integral', entry_date: new Date().toISOString().split('T')[0], deactivation_date: new Date().toISOString().split('T')[0], has_acompanhamento: false, acompanhamento_obs: '', acompanhamento_dias: [] });
  const [deactivatingStudent, setDeactivatingStudent] = useState(null);
  const [deactivationDateInput, setDeactivationDateInput] = useState(new Date().toISOString().split('T')[0]);

  const openModal = (student = null) => {
    setEditingStudent(student);
    if (student) {
      setForm({
        name: student.name,
        classroom: student.classroom,
        active: student.active ? 'active' : 'inactive',
        shift: student.shift || 'integral',
        entry_date: student.entry_date || new Date().toISOString().split('T')[0],
        deactivation_date: student.deactivation_date || new Date().toISOString().split('T')[0],
        has_acompanhamento: student.has_acompanhamento || false,
        acompanhamento_obs: student.acompanhamento_obs || '',
        acompanhamento_dias: student.acompanhamento_dias || []
      });
    } else {
      setForm({ name: '', classroom: '', active: 'active', shift: 'integral', entry_date: new Date().toISOString().split('T')[0], deactivation_date: new Date().toISOString().split('T')[0], has_acompanhamento: false, acompanhamento_obs: '', acompanhamento_dias: [] });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.classroom) {
      alert('Preencha os campos obrigatórios.');
      return;
    }
    try {
      const payload = {
        id: editingStudent ? editingStudent.id : undefined,
        name: form.name.trim(),
        classroom: form.classroom,
        active: form.active === 'active',
        shift: form.shift || 'integral',
        entry_date: form.entry_date,
        deactivation_date: form.active === 'active' ? null : form.deactivation_date,
        has_acompanhamento: form.has_acompanhamento,
        acompanhamento_obs: form.has_acompanhamento ? form.acompanhamento_obs.trim() : '',
        acompanhamento_dias: form.has_acompanhamento ? form.acompanhamento_dias : []
      };
      
      const saved = await saveStudent(payload);
      if (editingStudent) {
        setStudents(prev => prev.map(s => s.id === saved.id ? saved : s));
        alert('Cadastro de aluno atualizado!');
      } else {
        setStudents(prev => [...prev, saved]);
        alert('Novo aluno cadastrado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar registro de aluno no Supabase.');
    }
  };

  const handleToggleActive = async (student) => {
    if (student.active) {
      setDeactivatingStudent(student);
      setDeactivationDateInput(new Date().toISOString().split('T')[0]);
    } else {
      try {
        const updated = await toggleStudentActive(student.id);
        setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
        alert('Aluno reativado com sucesso!');
      } catch (err) {
        console.error(err);
        alert('Erro ao reativar aluno.');
      }
    }
  };

  const confirmDeactivation = async () => {
    if (!deactivatingStudent) return;
    try {
      const updated = await toggleStudentActive(deactivatingStudent.id, deactivationDateInput);
      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
      setDeactivatingStudent(null);
      alert('Aluno desativado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao desativar aluno.');
    }
  };

  const handleDelete = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    if (!window.confirm(`PERIGO: Tem certeza que deseja DELETAR permanentemente o aluno "${student.name}"? Isso removerá o cadastro e todas as presenças/ocorrências associadas. Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteStudent(studentId);
      setStudents(prev => prev.filter(s => s.id !== studentId));
      alert('Aluno excluído com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir aluno do Supabase.');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={12} style={{ marginLeft: '6px', color: 'var(--slate-400)', verticalAlign: 'middle' }} />;
    }
    return sortDirection === 'asc'
      ? <ChevronUp size={12} style={{ marginLeft: '6px', color: 'var(--color-primary)', verticalAlign: 'middle' }} />
      : <ChevronDown size={12} style={{ marginLeft: '6px', color: 'var(--color-primary)', verticalAlign: 'middle' }} />;
  };

  const displayed = students
    .filter(st => {
      const matchSearch = st.name.toLowerCase().includes(search.toLowerCase());
      const matchClass = !classroomFilter || st.classroom === classroomFilter;
      const matchShift = !shiftFilter || (st.shift || 'integral').toLowerCase() === shiftFilter.toLowerCase();
      const matchStatus = !statusFilter || (statusFilter === 'active' ? st.active : !st.active);
      return matchSearch && matchClass && matchShift && matchStatus;
    })
    .sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortField === 'name') {
        valA = a.name || '';
        valB = b.name || '';
      } else if (sortField === 'classroom') {
        valA = a.classroom || '';
        valB = b.classroom || '';
      } else if (sortField === 'shift') {
        valA = a.shift || '';
        valB = b.shift || '';
      } else if (sortField === 'active') {
        valA = a.active ? 'ativo' : 'inativo';
        valB = b.active ? 'ativo' : 'inativo';
      }
      const comparison = valA.localeCompare(valB, 'pt', { sensitivity: 'base' });
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const getShiftBadgeClass = (shift) => {
    if (shift === 'matutino') return 'status-pill active';
    if (shift === 'vespertino') return 'status-pill active';
    return 'status-pill inactive';
  };

  return (
    <section className="panel-section active">
      <div className="action-bar">
        <div className="search-filter-students">
          <div className="input-icon-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Pesquisar por nome do aluno..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={classroomFilter} onChange={(e) => setClassroomFilter(e.target.value)}>
            <option value="">Todas as Salas</option>
            {CLASSROOMS.map(c => <option key={c} value={c}>Sala {c}</option>)}
          </select>
          <select value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)}>
            <option value="">Todos os Turnos</option>
            <option value="integral">Turno Integral</option>
            <option value="matutino">Turno Matutino</option>
            <option value="vespertino">Turno Vespertino</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos os Status</option>
            <option value="active">Alunos Ativos</option>
            <option value="inactive">Alunos Inativos</option>
          </select>
        </div>
        
        {activeUser?.role === 'diretora' && (
          <button className="primary-btn" onClick={() => openModal(null)}>
            <Plus size={18} />
            <span>Adicionar Aluno</span>
          </button>
        )}
      </div>

      <div className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.06)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                  Criança {renderSortIcon('name')}
                </th>
                <th onClick={() => handleSort('classroom')} style={{ cursor: 'pointer', userSelect: 'none', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.06)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                  Sala / Turma {renderSortIcon('classroom')}
                </th>
                <th onClick={() => handleSort('shift')} style={{ cursor: 'pointer', userSelect: 'none', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.06)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                  Turno {renderSortIcon('shift')}
                </th>
                <th onClick={() => handleSort('active')} style={{ cursor: 'pointer', userSelect: 'none', transition: 'background-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.06)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                  Status {renderSortIcon('active')}
                </th>
                <th className="actions-column">Ações</th>
              </tr>
            </thead>
            <tbody>
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-400)' }}>
                    Nenhum aluno cadastrado correspondente aos filtros.
                  </td>
                </tr>
              ) : (
                displayed.map(st => (
                  <tr key={st.id}>
                    <td>
                      <div className="student-row-name-wrapper">
                        <span className="student-row-avatar">👦</span>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{st.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--slate-400)' }}>
                            Entrada: {st.entry_date ? formatDateBR(st.entry_date) : 'Não informada'}
                            {!st.active && st.deactivation_date && ` • Desativação: ${formatDateBR(st.deactivation_date)}`}
                          </span>
                          {st.has_acompanhamento && (
                            <span style={{ fontSize: '11.5px', color: '#0369a1', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
                              🩺 Acomp.: {st.acompanhamento_obs} {st.acompanhamento_dias && st.acompanhamento_dias.length > 0 && `(${st.acompanhamento_dias.map(d => ({ seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex' }[d])).join(', ')})`}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="occ-type-pill amamentacao" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', textTransform: 'capitalize' }}>
                        {st.classroom}
                      </span>
                    </td>
                    <td>
                      <span className={getShiftBadgeClass(st.shift)} style={{ textTransform: 'capitalize', fontSize: '12px' }}>
                        {st.shift || 'Integral'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${st.active ? 'active' : 'inactive'}`}>
                        {st.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="actions-column">
                      <div className="action-row-buttons">
                        <button className="row-action-btn" onClick={() => openModal(st)} title="Editar">✏️</button>
                        {activeUser?.role === 'diretora' && (
                          <>
                            <button
                              className="row-action-btn"
                              style={{ color: st.active ? 'var(--slate-400)' : 'var(--brand-primary)' }}
                              onClick={() => handleToggleActive(st)}
                              title={st.active ? 'Inativar' : 'Reativar'}
                            >
                              {st.active ? '⏸️' : '▶️'}
                            </button>
                            <button
                              className="row-action-btn delete"
                              onClick={() => handleDelete(st.id)}
                              title="Excluir Permanentemente"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay active">
          <div className="modal-card">
            <div className="modal-header">
              <h2>{editingStudent ? 'Editar Aluno' : 'Cadastrar Novo Aluno'}</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-body">
                <div className="form-group">
                  <label>Nome da Criança*</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bernardo Costa"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label>Sala / Turma*</label>
                  <select required value={form.classroom} onChange={(e) => setForm(f => ({ ...f, classroom: e.target.value }))}>
                    <option value="">Selecione uma sala</option>
                    {CLASSROOMS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Turno / Período*</label>
                  <select required value={form.shift} onChange={(e) => setForm(f => ({ ...f, shift: e.target.value }))}>
                    <option value="integral">Integral</option>
                    <option value="matutino">Matutino</option>
                    <option value="vespertino">Vespertino</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Data de Entrada*</label>
                  <input
                    type="date"
                    required
                    value={form.entry_date}
                    onChange={(e) => setForm(f => ({ ...f, entry_date: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px 0 12px 0' }}>
                  <input
                    type="checkbox"
                    id="has_acompanhamento"
                    checked={form.has_acompanhamento}
                    onChange={(e) => setForm(f => ({ ...f, has_acompanhamento: e.target.checked, acompanhamento_dias: e.target.checked ? f.acompanhamento_dias || [] : [] }))}
                    style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                  />
                  <label htmlFor="has_acompanhamento" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--slate-700)', cursor: 'pointer', userSelect: 'none' }}>
                    Possui acompanhamento (psicólogo, fono ou justificativa de atraso)
                  </label>
                </div>
                {form.has_acompanhamento && (
                  <>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', marginBottom: '6px', fontSize: '12.5px', color: 'var(--slate-600)' }}>
                        Dias da semana programados para o acompanhamento/atraso:*
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {['seg', 'ter', 'qua', 'qui', 'sex'].map(day => {
                          const isSelected = form.acompanhamento_dias?.includes(day);
                          const dayLabels = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta' };
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                const current = form.acompanhamento_dias || [];
                                const updated = current.includes(day)
                                  ? current.filter(d => d !== day)
                                  : [...current, day];
                                setForm(f => ({ ...f, acompanhamento_dias: updated }));
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
                            const isAllSelected = form.acompanhamento_dias?.length === 5;
                            setForm(f => ({ ...f, acompanhamento_dias: isAllSelected ? [] : allDays }));
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
                          {form.acompanhamento_dias?.length === 5 ? 'Limpar Todos' : 'Todos os Dias'}
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Orientação / Observação do Acompanhamento*</label>
                      <textarea
                        required
                        placeholder="Ex: Chega atrasado segundas e quartas por fazer fonoaudiólogo às 08h."
                        value={form.acompanhamento_obs}
                        onChange={(e) => setForm(f => ({ ...f, acompanhamento_obs: e.target.value }))}
                        rows={2}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--slate-200)', resize: 'vertical' }}
                      />
                    </div>
                  </>
                )}
                {editingStudent && (
                  <div className="form-group">
                    <label>Status do Aluno</label>
                    <select value={form.active} onChange={(e) => setForm(f => ({ ...f, active: e.target.value }))}>
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
                  </div>
                )}
                {form.active === 'inactive' && (
                  <div className="form-group">
                    <label>Data de Desligamento*</label>
                    <input
                      type="date"
                      required
                      value={form.deactivation_date}
                      onChange={(e) => setForm(f => ({ ...f, deactivation_date: e.target.value }))}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="secondary-btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="primary-btn">Salvar Aluno</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmar Desativação */}
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
    </section>
  );
}
