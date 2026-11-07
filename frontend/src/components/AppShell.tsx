import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Command, FolderKanban, LayoutDashboard, LogOut, Menu, Plus, X } from 'lucide-react';
import { Brand } from './Brand';
import { useAuth } from '../auth';

export function AppShell() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const pageLabel = location.pathname.endsWith('/projects') ? 'Projects' : location.pathname.includes('/projects/') ? 'Project workspace' : 'Overview';
  const initials = user?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  function logout() { signOut(); navigate('/login'); }
  return <div className="app-shell">
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top"><Brand /><button className="icon-button mobile-close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={19} /></button></div>
      <div className="workspace-switch"><span className="workspace-switch-icon"><Command size={17} /></span><span className="workspace-switch-copy"><b>My workspace</b><small>Personal workspace</small></span></div>
      <div className="nav-label">WORKSPACE</div>
      <nav className="primary-nav">
        <NavLink onClick={() => setOpen(false)} to="/app" end><LayoutDashboard size={18} />Overview</NavLink>
        <NavLink onClick={() => setOpen(false)} to="/app/projects"><FolderKanban size={18} />Projects</NavLink>
      </nav>
      <div className="nav-label nav-label-spaced">YOUR SPACE</div>
      <div className="sidebar-empty"><span className="sidebar-empty-icon"><Activity size={16} /></span><span>Insights and reports<br />will show up here</span></div>
      <div className="sidebar-bottom">
        <Link to="/app/projects" className="sidebar-create"><Plus size={16} />New project</Link>
        <button className="profile-button" onClick={logout}><span className="avatar">{initials || 'IF'}</span><span className="profile-copy"><b>{user?.name}</b><small>{user?.email}</small></span><LogOut size={16} className="profile-logout" /></button>
      </div>
    </aside>
    {open && <button className="mobile-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
    <main className="main-area"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><b>{pageLabel}</b></div><div className="topbar-right"><span className="status-dot" />Private workspace</div></header><div className="page-content"><Outlet /></div></main>
  </div>;
}
