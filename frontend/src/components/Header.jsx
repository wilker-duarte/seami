import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  Search, 
  PlusCircle, 
  Moon, 
  Sun, 
  ChevronDown 
} from 'lucide-react';

export default function Header({ 
  activeTab, 
  activeModule, 
  students, 
  isDark, 
  setIsDark, 
  activeUser, 
  setActiveUser, 
  setIsSidebarOpen, 
  onQuickAction,
  onSelectStudentOccurrence,
  onLogout
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  
  const searchDropdownRef = useRef(null);
  const roleDropdownRef = useRef(null);

  // Mapeia títulos e subtítulos
  const getHeaderInfo = () => {
    const headers = {
      dashboard: { title: "Dashboard Geral", sub: "Visão geral e inteligência de frequência hoje." },
      students: { title: "Cadastro de Alunos", sub: "Adicione, edite e acompanhe os alunos matriculados." },
      reports: { title: "Relatórios de Gestão", sub: "Gere pesquisas complexas e exporte em Excel ou PDF." },
      settings: { title: "Configurações", sub: "Ajuste as opções do portal escolar e simule bases." },
      attendance: { title: "Lançar Chamada", sub: "Lançamento de frequência e presenças por sala de aula." },
      seami_control: { title: "Caderno SEAMI", sub: "Acompanhamento e registro de faltas, atestados, atrasos e amamentação." }
    };
    
    if (activeTab === 'attendance') {
      if (activeModule === 'consulta') {
        return { title: "Registros e Exportação", sub: "Consulta histórica e exportação consolidada de presenças." };
      }
      return headers.attendance;
    }
    
    if (activeTab === 'seami_control' && activeModule) {
      const modNames = {
        atraso: { title: "Módulo de Atrasos", sub: "Controle diário de chegada de crianças atrasadas e justificativas." },
        saida: { title: "Saídas Antecipadas", sub: "Registros de retiradas de crianças antes do horário e assinaturas." },
        atestado: { title: "Atestados Médicos", sub: "Controle automático de afastamentos, atestados e retornos escolares." },
        falta: { title: "Registro de Faltas", sub: "Frequência mensal, justificação e alertas de evasão escolar." },
        amamentacao: { title: "Sala de Amamentação", sub: "Uso do espaço para lactantes e controle de permanência." }
      };
      return modNames[activeModule] || headers[activeTab];
    }
    
    return headers[activeTab] || { title: "EducaGestão", sub: "Portal de gestão escolar." };
  };

  const headerInfo = getHeaderInfo();

  // Fecha dropdowns se clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target)) {
        setSearchResults([]);
      }
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler de Busca Global
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      const results = students
        .filter(s => s.active && s.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, students]);

  const handleRoleSelect = (role, name, avatar) => {
    setActiveUser({ role, name, avatar });
    setIsRoleDropdownOpen(false);
  };

  const handleStudentSelect = (student) => {
    setSearchQuery('');
    setSearchResults([]);
    if (onSelectStudentOccurrence) {
      onSelectStudentOccurrence(student);
    }
  };

  const roleBadgeClass = {
    diretora: 'role-badge badge-diretora',
    pedagoga: 'role-badge badge-pedagoga',
    auxiliar: 'role-badge badge-auxiliar'
  };

  const roleLabels = {
    diretora: 'Secretaria',
    pedagoga: 'Pedagogia',
    auxiliar: 'Auxiliar'
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="menu-toggle-btn" id="menu-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
          <Menu size={20} />
        </button>
        <div className="header-title-wrapper">
          <h1 className="page-title">{headerInfo.title}</h1>
          <p className="page-subtitle">{headerInfo.sub}</p>
        </div>
      </div>
      
      <div className="header-right">
        {/* Busca Inteligente de Aluno */}
        <div className="search-bar-wrapper" ref={searchDropdownRef}>
          <Search className="search-icon" size={16} />
          <input 
            type="text" 
            placeholder="Buscar aluno ativo..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="search-results-dropdown active">
              {searchResults.map(student => (
                <div 
                  key={student.id} 
                  className="search-result-item"
                  onClick={() => handleStudentSelect(student)}
                >
                  <div className="search-result-info">
                    <span className="search-result-name">{student.name}</span>
                    <span className="search-result-class">Sala {student.classroom}</span>
                  </div>
                  <span className="search-result-action">Lançar</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Botão de Atalho Rápido */}
        <button className="quick-action-btn" onClick={onQuickAction}>
          <PlusCircle size={20} />
          <span>Novo Registro</span>
        </button>
        
        {/* Alternador de Tema */}
        <button 
          className="theme-toggle-btn" 
          onClick={() => setIsDark(!isDark)}
          title="Alternar Modo Escuro/Claro"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        {/* Seletor de Perfil / Login Fictício */}
        <div className="role-selector-wrapper" ref={roleDropdownRef}>
          <button className="role-dropdown-trigger" onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}>
            <span className={roleBadgeClass[activeUser.role]}>{roleLabels[activeUser.role]}</span>
            <ChevronDown size={14} />
          </button>
          
          {isRoleDropdownOpen && (
            <div className="role-dropdown-menu active" style={{ minWidth: '220px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '32px' }}>{activeUser.avatar || '👩‍💼'}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--slate-800)', lineHeight: '1.2' }}>{activeUser.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--slate-500)', wordBreak: 'break-all' }}>{activeUser.email || 'Secretaria SEAMI'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
