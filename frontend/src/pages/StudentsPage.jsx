import React, { useState } from 'react';
import { Plus, Search, Trash2, Undo } from 'lucide-react';
import { useAppContext, API_BASE_URL } from '../context/AppContext';

const CLASSROOMS = ['Alegria', 'Carinho', 'União', 'Amizade', 'Felicidade'];

export default function StudentsPage() {
  const { students, setStudents, activeUser } = useAppContext();

  const [search, setSearch] = useState('');
  const [classroomFilter, setClassroomFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState({ name: '', classroom: '', active: 'active' });

  const openModal = (student = null) => {
    setEditingStudent(student);
    if (student) {
      setForm({ name: student.name, classroom: student.classroom, active: student.active ? 'active' : 'inactive' });
    } else {
      setForm({ name: '', classroom: '', active: 'active' });
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
      if (editingStudent) {
        const res = await fetch(`${API_BASE_URL}/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name.trim(), classroom: form.classroom, active: form.active === 'active' })
        });
        const updated = await res.json();
        setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
        alert('Cadastro atualizado!');
      } else {
        const res = await fetch(`${API_BASE_URL}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name.trim(), classroom: form.classroom })
        });
        const created = await res.json();
        setStudents(prev => [...prev, created]);
        alert('Novo aluno cadastrado!');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar.');
    }
  };

  const handleToggleActive = async (studentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/students/${studentId}/toggle`, { method: 'PATCH' });
      const updated = await res.json();
      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
    } catch (err) {
      console.error(err);
    }
  };

  const displayed = students
    .filter(st => {
      const matchSearch = st.name.toLowerCase().includes(search.toLowerCase());
      const matchClass = !classroomFilter || st.classroom === classroomFilter;
      return matchSearch && matchClass;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

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
        </div>
        <button className="primary-btn" onClick={() => openModal(null)}>
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
                <th className="actions-column">Ações</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map(st => (
                <tr key={st.id}>
                  <td>
                    <div className="student-row-name-wrapper">
                      <span className="student-row-avatar">👦</span>
                      <span style={{ fontWeight: 600 }}>{st.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="occ-type-pill amamentacao" style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      {st.classroom}
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
                      {activeUser.role === 'diretora' && (
                        <button
                          className="row-action-btn delete"
                          onClick={() => handleToggleActive(st.id)}
                          title={st.active ? 'Inativar' : 'Reativar'}
                        >
                          {st.active ? <Trash2 size={16} /> : <Undo size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
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
                {editingStudent && (
                  <div className="form-group">
                    <label>Status do Aluno</label>
                    <select value={form.active} onChange={(e) => setForm(f => ({ ...f, active: e.target.value }))}>
                      <option value="active">Ativo</option>
                      <option value="inactive">Inativo</option>
                    </select>
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
    </section>
  );
}
