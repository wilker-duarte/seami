import React from 'react';
import { 
  LayoutDashboard, 
  Baby, 
  Clock, 
  LogOut, 
  Activity, 
  CalendarX, 
  Heart, 
  FileText, 
  Sparkles, 
  Settings,
  ClipboardCheck,
  BookOpen,
  Home,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';

export default function Sidebar({ activeTab, activeModule, setActiveTab, setActiveModule, activeUser, isSidebarOpen, setIsSidebarOpen, isSidebarCollapsed, setIsSidebarCollapsed }) {
  const handleMenuClick = (tab, module = null) => {
    setActiveTab(tab);
    setActiveModule(module);
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
        <a href="#" className={getMenuClass('home')} onClick={() => handleMenuClick('home')}>
          <Home size={20} />
          <span>Início</span>
        </a>
        <a href="#" className={getMenuClass('dashboard')} onClick={() => handleMenuClick('dashboard')}>
          <LayoutDashboard size={20} />
          <span>Painel Geral</span>
        </a>
        <a href="#" className={getMenuClass('students')} onClick={() => handleMenuClick('students')}>
          <Baby size={20} />
          <span>Alunos</span>
        </a>
        
        <div className="menu-section">
          <span className="menu-section-title">Módulo I: Frequência</span>
        </div>
        
        <a href="#" className={getMenuClass('attendance', 'lancamento')} onClick={() => handleMenuClick('attendance', 'lancamento')}>
          <ClipboardCheck size={20} />
          <span>Lançar Chamada</span>
        </a>
        <a href="#" className={getMenuClass('attendance', 'consulta')} onClick={() => handleMenuClick('attendance', 'consulta')}>
          <Search size={20} />
          <span>Registros e Exportação</span>
        </a>
        
        <div className="menu-section">
          <span className="menu-section-title">Módulo II: Caderno SEAMI</span>
        </div>
        
        <a href="#" className={getMenuClass('seami_control')} onClick={() => handleMenuClick('seami_control')}>
          <BookOpen size={20} />
          <span>Caderno SEAMI</span>
        </a>
        
        <div className="sidebar-submenu" style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '8px', borderLeft: '1px solid var(--slate-200)', marginLeft: '16px', marginBottom: '8px' }}>
          <a href="#" className={getMenuClass('seami_control', 'falta')} onClick={() => handleMenuClick('seami_control', 'falta')} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px' }}>
            <CalendarX size={16} />
            <span>Faltas</span>
          </a>
          <a href="#" className={getMenuClass('seami_control', 'atestado')} onClick={() => handleMenuClick('seami_control', 'atestado')} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px' }}>
            <Activity size={16} />
            <span>Atestados</span>
          </a>
          <a href="#" className={getMenuClass('seami_control', 'atraso')} onClick={() => handleMenuClick('seami_control', 'atraso')} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px' }}>
            <Clock size={16} />
            <span>Atrasos</span>
          </a>
          <a href="#" className={getMenuClass('seami_control', 'saida')} onClick={() => handleMenuClick('seami_control', 'saida')} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px' }}>
            <LogOut size={16} />
            <span>Saídas Antecipadas</span>
          </a>
          <a href="#" className={getMenuClass('seami_control', 'amamentacao')} onClick={() => handleMenuClick('seami_control', 'amamentacao')} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px' }}>
            <Heart size={16} />
            <span>Amamentação</span>
          </a>
        </div>
        
        <a href="#" className={getMenuClass('reports')} onClick={() => handleMenuClick('reports')}>
          <FileText size={20} />
          <span>Relatórios do Caderno</span>
        </a>
        <a href="#" className={getMenuClass('insights')} onClick={() => handleMenuClick('insights')}>
          <Sparkles size={20} />
          <span>Insights & Pedagogia</span>
          <span className="badge-new">IA</span>
        </a>
        
        {/* Oculta aba Configurações se o usuário for apenas Auxiliar */}
        {activeUser.role !== 'auxiliar' && (
          <a href="#" className={getMenuClass('settings')} onClick={() => handleMenuClick('settings')}>
            <Settings size={20} />
            <span>Configurações</span>
          </a>
        )}
      </nav>
      
      {/* Rodapé da Sidebar */}
      <div className="sidebar-footer">
        <div className="user-profile-widget">
          <div className="user-avatar">{activeUser.avatar || '👩‍🏫'}</div>
          <div className="user-info">
            <span className="user-name">{activeUser.name || 'Coord. Ana Clara'}</span>
            <span className="user-role-badge">
              {activeUser.role === 'diretora' ? 'Secretaria' : activeUser.role === 'pedagoga' ? 'Pedagogia' : 'Auxiliar'}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
