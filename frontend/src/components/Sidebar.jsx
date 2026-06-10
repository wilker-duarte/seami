import React from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Baby, 
  Clock, 
  LogOut, 
  Activity, 
  CalendarX, 
  Heart, 
  FileText, 
  Settings,
  ClipboardCheck,
  BookOpen,
  Home,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  activeModule, 
  activeUser, 
  isSidebarOpen, 
  setIsSidebarOpen, 
  isSidebarCollapsed, 
  setIsSidebarCollapsed 
}) {
  const handleMenuClick = () => {
    setIsSidebarOpen(false); // Fecha no mobile ao clicar
  };

  const getMenuClass = (tab, module = null) => {
    if (tab === 'attendance') {
      if (module === 'lancamento') {
        return activeTab === 'attendance' && (activeModule === 'lancamento' || !activeModule) ? 'menu-item active' : 'menu-item';
      }
      if (module === 'consulta') {
        return activeTab === 'attendance' && activeModule === 'consulta' ? 'menu-item active' : 'menu-item';
      }
    }
    if (module) {
      return activeTab === tab && activeModule === module ? 'menu-item active' : 'menu-item';
    }
    return activeTab === tab && !activeModule ? 'menu-item active' : 'menu-item';
  };

  return (
    <aside className={`app-sidebar ${isSidebarOpen ? 'active' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`} id="sidebar">
      {/* Floating Toggle Collapse Button */}
      <button 
        className="sidebar-toggle-btn" 
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
        aria-label={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
      >
        {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="sidebar-header">
        <div className="logo-container">
          <span className="logo-emoji">🧸</span>
          <div className="logo-text">
            <span className="brand-title">EducaGestão</span>
            <span className="brand-subtitle">Portal Creche</span>
          </div>
        </div>
        <button className="sidebar-close-btn" id="close-sidebar-btn" onClick={() => setIsSidebarOpen(false)}>
          <span style={{ fontSize: '24px' }}>×</span>
        </button>
      </div>
      
      <nav className="sidebar-menu">
        <Link to="/" className={getMenuClass('home')} onClick={handleMenuClick}>
          <Home size={20} />
          <span>Início</span>
        </Link>
        <Link to="/dashboard" className={getMenuClass('dashboard')} onClick={handleMenuClick}>
          <LayoutDashboard size={20} />
          <span>Painel Geral</span>
        </Link>
        <Link to="/alunos" className={getMenuClass('students')} onClick={handleMenuClick}>
          <Baby size={20} />
          <span>Alunos</span>
        </Link>
        
        <div className="menu-section">
          <span className="menu-section-title">Módulo I: Frequência</span>
        </div>
        
        <Link to="/chamada" className={getMenuClass('attendance', 'lancamento')} onClick={handleMenuClick}>
          <ClipboardCheck size={20} />
          <span>Lançar Chamada</span>
        </Link>
        <Link to="/chamada/consulta" className={getMenuClass('attendance', 'consulta')} onClick={handleMenuClick}>
          <Search size={20} />
          <span>Registros e Exportação</span>
        </Link>
        
        <div className="menu-section">
          <span className="menu-section-title">Módulo II: Caderno SEAMI</span>
        </div>
        
        <Link to="/caderno-seami" className={getMenuClass('seami_control')} onClick={handleMenuClick}>
          <BookOpen size={20} />
          <span>Caderno SEAMI</span>
        </Link>
        
        <div className="sidebar-submenu" style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', borderLeft: '1px solid var(--slate-200)', marginLeft: '16px', marginBottom: '8px' }}>
          <Link to="/caderno-seami/faltas" className={getMenuClass('seami_control', 'falta')} onClick={handleMenuClick} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px' }}>
            <CalendarX size={16} />
            <span>Faltas</span>
          </Link>
          <Link to="/caderno-seami/atestados" className={getMenuClass('seami_control', 'atestado')} onClick={handleMenuClick} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px' }}>
            <Activity size={16} />
            <span>Atestados</span>
          </Link>
          <Link to="/caderno-seami/atrasos" className={getMenuClass('seami_control', 'atraso')} onClick={handleMenuClick} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px' }}>
            <Clock size={16} />
            <span>Atrasos</span>
          </Link>
          <Link to="/caderno-seami/saidas" className={getMenuClass('seami_control', 'saida')} onClick={handleMenuClick} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px' }}>
            <LogOut size={16} />
            <span>Saídas Antecipadas</span>
          </Link>
          <Link to="/caderno-seami/amamentacao" className={getMenuClass('seami_control', 'amamentacao')} onClick={handleMenuClick} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px' }}>
            <Heart size={16} />
            <span>Amamentação</span>
          </Link>
        </div>
        
        <Link to="/relatorios" className={getMenuClass('reports')} onClick={handleMenuClick}>
          <FileText size={20} />
          <span>Relatórios do Caderno</span>
        </Link>
        
        {/* Oculta aba Configurações se o usuário for apenas Auxiliar
        {activeUser?.role !== 'auxiliar' && (
          <Link to="/configuracoes" className={getMenuClass('settings')} onClick={handleMenuClick}>
            <Settings size={20} />
            <span>Configurações</span>
          </Link>
        )} */}
      </nav>
      
      {/* Rodapé da Sidebar */}
      <div className="sidebar-footer">
        <div className="user-profile-widget">
          <div className="user-avatar">{activeUser?.avatar || '👩‍🏫'}</div>
          <div className="user-info">
            <span className="user-name">{activeUser?.name || 'Coord. Ana Clara'}</span>
            <span className="user-role-badge">
              {activeUser?.role === 'diretora' ? 'Secretaria' : activeUser?.role === 'pedagoga' ? 'Pedagogia' : 'Auxiliar'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
