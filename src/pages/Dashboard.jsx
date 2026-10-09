import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Heart, Sparkles, LayoutDashboard, Activity, FileText, Settings,
  LogOut, Menu, X, Shield, Newspaper, LineChart, Stethoscope,
  Crown,
} from 'lucide-react'
import '../styles/dashboard.css'
import DashboardHome from './DashboardHome'
import ChatPage from './ChatPage'
import HealthPage from './HealthPage'
import RecordsPage from './RecordsPage'
import NewsPage from './NewsPage'
import InsightsPage from './InsightsPage'
import SettingsPage from './SettingsPage'
import DailyCarePage from './DailyCarePage'
import AdminPage from './AdminPage'

import ConfirmModal from '../components/ConfirmModal'
import HelpScannerModal from '../components/HelpScannerModal'


function RightHeartBadge({ onClick }) {
  const supportText =
    "I’m Siraj, creator of SaviPulse. Scan to support and inspire my next project!"
  const shortText = "Support"

  const qrSrc = "/scaner.jpeg"

  return (
    <div
      className="right-heart-badge"
      title="Support SaviPulse"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
    
      <div className="heart-scroll-line">
        <div className="heart-scroll-marquee">
          <img
            src={qrSrc}
            alt="Support QR"
            className="heart-scroll-qr"
            draggable="false"
          />
          <span className="heart-scroll-text">{supportText}</span>

          <img
            src={qrSrc}
            alt=""
            aria-hidden="true"
            className="heart-scroll-qr"
            draggable="false"
          />
          <span className="heart-scroll-text" aria-hidden="true">
            {supportText}
          </span>
        </div>
      </div>

    
      <span className="heart-short-text">{shortText}</span>

      
      <Heart size={24} strokeWidth={2.4} fill="currentColor" />
    </div>
  )
}

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
  const [pendingChatQuestion, setPendingChatQuestion] = useState(null)
  const [helpModalOpen, setHelpModalOpen] = useState(false)


  const [modal, setModal] = useState({
    open: false,
    type: 'confirm',
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: true,
    loading: false,
    onConfirm: null,
    onCancel: null,
  })

  function openModal(config) {
    setModal({
      open: true,
      type: 'confirm',
      title: '',
      message: '',
      confirmText: 'OK',
      cancelText: 'Cancel',
      showCancel: true,
      loading: false,
      onConfirm: null,
      onCancel: null,
      ...config,
    })
  }

  function closeModal() {
    setModal((m) => ({ ...m, open: false, loading: false }))
  }

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

  
  function handleLogout() {
    openModal({
      type: 'confirm',
      title: 'Logout?',
      message: 'Are you sure you want to logout from SaviPulse?',
      confirmText: 'Logout',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setModal((m) => ({ ...m, loading: true }))
        try {
          await supabase.auth.signOut()
          closeModal()
        } catch (err) {
          console.error('Logout failed:', err)
          closeModal()
        }
      },
      onCancel: closeModal,
    })
  }

  function openChatWithQuestion(question) {
    setPendingChatQuestion(question)
    setPage('chat')
    setSidebarOpen(false)
  }

  return (
    <div className="app-shell">
    
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
                  if (item.id !== 'chat') setPendingChatQuestion(null)
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
              onClick={handleLogout}
              title="Quick logout"
              aria-label="Logout"
            >
              <LogOut size={13} />
            </button>
          </div>

          <button className="sidebar-logout-btn" onClick={handleLogout}>
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
              title="Improve your Health"
            >
              <Sparkles size={13} />
              <span>Improve your Health</span>
            </button>

            <div className="profile-chip" title={displayName}>
              <div className="avatar">{initials}</div>
              <div className="profile-info">
                <strong>{displayName}</strong>
                <small>{isAdmin ? 'Administrator' : 'Member'}</small>
              </div>
            </div>

            <button
              className="icon-button topbar-logout"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

       
        <div className="page-content">
          {page === 'dashboard' && (
            <DashboardHome
              user={user}
              profile={profile}
              displayName={displayName}
              onAskQuestion={openChatWithQuestion}
            />
          )}
          {page === 'chat' && (
            <ChatPage
              user={user}
              pendingQuestion={pendingChatQuestion}
              onPendingConsumed={() => setPendingChatQuestion(null)}
            />
          )}
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
              onLogout={handleLogout}
            />
          )}
        </div>

       
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

     
      <RightHeartBadge onClick={() => setHelpModalOpen(true)} />

    
      <HelpScannerModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

     
      <ConfirmModal
        open={modal.open}
        type={modal.type}
        title={modal.title}
        message={modal.message}
        confirmText={modal.confirmText}
        cancelText={modal.cancelText}
        showCancel={modal.showCancel}
        loading={modal.loading}
        onConfirm={modal.onConfirm || closeModal}
        onCancel={modal.onCancel || closeModal}
      />
    </div>
  )
}