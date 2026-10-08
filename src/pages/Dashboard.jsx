import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Heart, Sparkles, LayoutDashboard, Activity, FileText, Settings,
  LogOut, Menu, X, Shield, Newspaper, LineChart, Stethoscope,
  Crown,
} from 'lucide-react'

import DashboardHome from './DashboardHome'
import ChatPage from './ChatPage'
import HealthPage from './HealthPage'
import RecordsPage from './RecordsPage'
import NewsPage from './NewsPage'
import InsightsPage from './InsightsPage'
import SettingsPage from './SettingsPage'
import DailyCarePage from './DailyCarePage'
import AdminPage from './AdminPage'
import ImpactPill from '../components/ImpactPill'

export default function Dashboard({ session, profile }) {
  const user = session.user
  const displayName =
    profile?.full_name || user.user_metadata?.full_name || 'User'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'AI Doctor', icon: Sparkles, badge: 'AI' },
    { id: 'daily-care', label: 'Daily Care', icon: Stethoscope, badge: 'NEW' },
    { id: 'health', label: 'My Health', icon: Activity },
    { id: 'insights', label: 'Insights', icon: LineChart },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'news', label: 'Health News', icon: Newspaper },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const workspace = navItems.slice(0, 7)
  const personal = navItems.slice(7)
  const isAdmin = profile?.role === 'admin'

  async function logout() {
    const ok = window.confirm('Are you sure you want to logout?')
    if (!ok) return
    await supabase.auth.signOut()
  }

  return (
    <div className="app-shell">
      {/* MOBILE TOPBAR */}
      <header className="mobile-topbar">
        <div className="brand-mini">
          <div className="brand-mini-icon">
            <Heart size={18} strokeWidth={2.4} />
          </div>
          <div>
            <h1>
              Savi<span>Pulse</span>
            </h1>
            <p>Health Intelligence</p>
          </div>
        </div>
        <button
          className="icon-button"
          onClick={() => setSidebarOpen((s) => !s)}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-mark">
            <Heart size={20} strokeWidth={2.4} />
            <span className="pulse-ring" />
          </div>
          <div className="logo-text">
            <h1>
              Savi<span>Pulse</span>
            </h1>
            <p>Health Intelligence</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-heading">Workspace</p>
          {workspace.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => {
                  setPage(item.id)
                  setSidebarOpen(false)
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`nav-badge ${
                      item.badge === 'NEW' ? 'nav-badge-new' : ''
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}

          <div className="sidebar-divider" />
          <p className="nav-heading">Personal</p>
          {personal.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => {
                  setPage(item.id)
                  setSidebarOpen(false)
                }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
              </button>
            )
          })}

          {/* ADMIN LINK — only for admins */}
          {isAdmin && (
            <>
              <div className="sidebar-divider" />
              <p className="nav-heading" style={{ color: '#dc2626' }}>
                Admin
              </p>
              <button
                className={`nav-item nav-item-admin ${
                  page === 'admin' ? 'active' : ''
                }`}
                onClick={() => {
                  setPage('admin')
                  setSidebarOpen(false)
                }}
              >
                <Crown size={17} />
                <span>Admin Panel</span>
                <span className="nav-badge nav-badge-admin">ADMIN</span>
              </button>
            </>
          )}
        </nav>

        {/* SIDEBAR BOTTOM */}
        <div className="sidebar-bottom">
          <div className="sidebar-user-card">
            <div className="sidebar-user-avatar">
              {initials}
              <span className="sidebar-user-status" />
            </div>
            <div className="sidebar-user-info">
              <strong className="sidebar-user-name">
                {displayName.length > 18
                  ? displayName.slice(0, 18) + '…'
                  : displayName}
              </strong>
              <small className="sidebar-user-role">
                {isAdmin ? 'Admin' : 'Member'}
              </small>
            </div>
            <button
              className="sidebar-user-logout"
              onClick={logout}
              title="Quick logout"
              aria-label="Logout"
            >
              <LogOut size={13} />
            </button>
          </div>

          <div className="sidebar-follow-card">
            <div className="sidebar-follow-header">
              <div className="sidebar-follow-icon">
                <Sparkles size={12} />
              </div>
              <div>
                <strong>Follow Us</strong>
                <small>Stay healthy with us</small>
              </div>
            </div>

            <div className="sidebar-socials">
              <a
                href="https://github.com/SirajAbid17"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-social sidebar-social-github"
                title="GitHub"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6.1-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.3 2.8.1 3.2.8.8 1.3 1.9 1.3 3.1 0 4.7-2.8 5.7-5.5 6 .4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3z" />
                </svg>
              </a>

              <a
                href="https://linkedin.com/in/sirajabid17"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-social sidebar-social-linkedin"
                title="LinkedIn"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.5 2h-17A1.5 1.5 0 0 0 2 3.5v17A1.5 1.5 0 0 0 3.5 22h17a1.5 1.5 0 0 0 1.5-1.5v-17A1.5 1.5 0 0 0 20.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 1 1 8.25 6.5 1.75 1.75 0 0 1 6.5 8.25zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0 0 13 14.19a.66.66 0 0 0 0 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 0 1 2.7-1.4c1.55 0 3.36.86 3.36 3.66z" />
                </svg>
              </a>

              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-social sidebar-social-twitter"
                title="Twitter / X"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="sidebar-social sidebar-social-youtube"
                title="YouTube"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.5 15.5v-7l6.5 3.5z" />
                </svg>
              </a>
            </div>
          </div>

          <button className="sidebar-logout-btn" onClick={logout}>
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* MAIN AREA */}
      <main className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <h2>
              {page === 'admin'
                ? 'Admin Panel'
                : navItems.find((i) => i.id === page)?.label || 'Dashboard'}
            </h2>
            <p>Welcome back, {displayName.split(' ')[0]} 👋</p>
          </div>

          <div className="topbar-right">
            <button
              className="improve-pill"
              onClick={() => setPage('health')}
            >
              <Sparkles size={13} /> Improve your Health
            </button>

            <div className="profile-chip">
              <div className="avatar">{initials}</div>
              <div className="profile-info">
                <strong>{displayName}</strong>
                <small>{isAdmin ? 'Administrator' : 'Member'}</small>
              </div>
            </div>

            <button className="icon-button" onClick={logout} title="Logout">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="page-content">
          {page === 'dashboard' && (
            <DashboardHome
              user={user}
              profile={profile}
              displayName={displayName}
            />
          )}
          {page === 'chat' && <ChatPage user={user} />}
          {page === 'daily-care' && <DailyCarePage user={user} />}
          {page === 'health' && <HealthPage user={user} />}
          {page === 'insights' && <InsightsPage user={user} />}
          {page === 'records' && <RecordsPage user={user} />}
          {page === 'news' && <NewsPage />}
          {page === 'admin' && isAdmin && <AdminPage user={user} />}
          {page === 'settings' && (
            <SettingsPage
              user={user}
              profile={profile}
              displayName={displayName}
              onLogout={logout}
            />
          )}
        </div>

        {/* GLOBAL FOOTER */}
        <footer className="global-footer">
          <div className="global-footer-left">
            <div className="global-footer-logo">
              <Heart size={10} fill="currentColor" />
            </div>
            <span>
              <strong>SaviPulse</strong> · Your Health, Our Priority.
            </span>
          </div>

          <div className="global-footer-right">
            <span className="global-footer-year">
              © {new Date().getFullYear()}
            </span>
            <span className="global-footer-dot">·</span>
            <span className="global-footer-version">v1.0.0</span>
            <span className="global-footer-dot">·</span>
            <span className="global-footer-made">
              Made with <span style={{ color: '#ef4444' }}>♥</span>
            </span>
          </div>
        </footer>
      </main>

      {/* ✅ IMPACT PILL + MODAL — appears on every page */}
      <ImpactPill />
    </div>
  )
}