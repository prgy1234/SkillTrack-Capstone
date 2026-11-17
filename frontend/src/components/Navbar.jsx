import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const coordinatorLinks = [
  { to: '/dashboard', label: 'Command centre', icon: '⌂', section: 'OVERVIEW' },
  { to: '/candidates', label: 'People directory', icon: '◎', section: 'PEOPLE' },
  { to: '/activities', label: 'Course catalogue', icon: '▤', section: 'LEARNING' },
];
const learnerLinks = [
  { to: '/my-training', label: 'My workspace', icon: '⌂', section: 'MY SPACE' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  if (!user || user.mustChangePassword) return null;

  const links = user.role === 'Coordinator' ? coordinatorLinks : learnerLinks;
  const current = links.find(link => location.pathname === link.to) || links[0];
  const initials = (user.displayName || 'User').trim().split(/\\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

  const handleLogout = async () => {
    try { await logout(); } catch (err) { console.warn('Logout request failed.', err); }
    finally { navigate('/', { replace: true }); }
  };

  return <>
    <button className="mobile-menu-toggle" onClick={() => setMenuOpen(v => !v)} aria-label="Toggle navigation">{menuOpen ? '×' : '☰'}</button>
    <aside className={`app-sidebar ${menuOpen ? 'is-open' : ''}`}>
      <NavLink to="/" className="sidebar-brand" onClick={() => setMenuOpen(false)}>
        <span className="brand-symbol">N<span>+</span></span>
        <span className="brand-word">SKILLTRACK<small>LEARNING OPERATIONS</small></span>
      </NavLink>
      <div className="sidebar-workspace">
        <span className="workspace-avatar">{user.role === 'Coordinator' ? 'CO' : 'ME'}</span>
        <span><small>ACTIVE WORKSPACE</small><strong>{user.role === 'Coordinator' ? 'Programme team' : 'My learning'}</strong></span>
        <span className="workspace-chevron">⌄</span>
      </div>
      <div className="sidebar-section-label">{current.section}</div>
      <nav className="sidebar-navigation" aria-label="Main navigation">
        {links.map(link => <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)} className={({isActive}) => `sidebar-link${isActive ? ' active' : ''}`}>
          <span className="sidebar-link-icon">{link.icon}</span><span>{link.label}</span><span className="sidebar-link-arrow">↗</span>
        </NavLink>)}
      </nav>
      {user.role === 'Coordinator' && <div className="sidebar-section-label sidebar-tools-label">QUICK ACCESS</div>}
      {user.role === 'Coordinator' && <div className="sidebar-quicklinks"><NavLink to="/activities">＋ Add a learning activity</NavLink><NavLink to="/candidates">＋ Register a learner</NavLink></div>}
      <div className="sidebar-spacer" />
      <div className="sidebar-help"><span className="help-mark">?</span><div><strong>Workspace guide</strong><small>Tips for using SkillTrack</small></div><span>↗</span></div>
      <div className="sidebar-profile">
        <span className="profile-avatar">{initials}</span>
        <span className="profile-copy"><strong>{user.displayName}</strong><small>{user.role === 'Coordinator' ? 'Programme coordinator' : 'Learner account'}</small></span>
        <button className="profile-menu" onClick={() => navigate('/change-password')} title="Account settings" aria-label="Account settings">•••</button>
      </div>
      <button className="sidebar-logout" onClick={handleLogout}><span>↗</span> Sign out</button>
    </aside>
    <div className="mobile-sidebar-scrim" onClick={() => setMenuOpen(false)} />
    <header className="workspace-topbar">
      <div className="topbar-breadcrumb"><span>SkillTrack</span><b>›</b><strong>{current.label}</strong></div>
      <div className="topbar-right"><span className="topbar-date"><i /> Workspace active</span><button onClick={() => navigate('/change-password')} className="topbar-account">Account preferences <span>↗</span></button></div>
    </header>
  </>;
}
