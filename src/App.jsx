import { useEffect, useState } from 'react'
import { supabase, callChatAI, callHealthNews } from './lib/supabase'
import {
  Heart, Sparkles, LayoutDashboard, Activity, FileText, Settings,
  LogOut, Menu, X, Mail, Lock, User as UserIcon, Eye, EyeOff,
  ChevronRight, Shield, CheckCircle2, AlertCircle, Send, Plus,
  Trash2, Newspaper, Loader2, MessageSquare, Star, ExternalLink,
} from 'lucide-react'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return
      setSession(data.session)
      if (data.session) await loadProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_e, session) => {
        if (!mounted) return
        setSession(session)
        if (session) await loadProfile(session.user.id)
        else setProfile(null)
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (!data) {
      const user = (await supabase.auth.getUser()).data.user
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          full_name: user?.user_metadata?.full_name || 'User',
          role: 'user',
          status: 'active',
        })
        .select()
        .single()
      setProfile(newProfile || { full_name: 'User', role: 'user' })
    } else {
      setProfile(data)
    }
  }

  if (loading) return <LoadingScreen />
  if (!session) return <AuthScreen onAuth={loadProfile} />
  return <Dashboard session={session} profile={profile} />
}

/* =========================================
   LOADING
========================================= */
function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo">
        <Heart size={36} strokeWidth={2.2} />
      </div>
      <h2>SaviPulse</h2>
      <p>Loading your health dashboard…</p>
      <div className="loading-bar"><div className="loading-bar-fill" /></div>
    </div>
  )
}

/* =========================================
   AUTH
========================================= */
function AuthScreen({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleAuth(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      if (!isLogin) {
        if (!name.trim()) throw new Error('Please enter your name.')
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() } },
        })
        if (error) throw error
        if (data.session) {
          setMessage('Account created successfully.')
          await onAuth(data.session.user.id)
        } else {
          setMessage('Check your email to verify your account.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
        await onAuth(data.user.id)
        setMessage('Login successful.')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-glow auth-bg-glow-1" />
      <div className="auth-bg-glow auth-bg-glow-2" />

      <div className="auth-wrapper">
        <div className="auth-brand">
          <div className="auth-logo"><Heart size={24} strokeWidth={2.4} /></div>
          <h1>Savi<span>Pulse</span></h1>
          <p>Your Health, Our Priority.</p>
        </div>

        <div className="auth-card">
          <div className="auth-header">
            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{isLogin ? 'Log in to continue' : 'Start your health journey'}</p>
          </div>

          <form onSubmit={handleAuth} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label>Name</label>
                <div className="input-wrap">
                  <UserIcon size={16} className="input-icon" />
                  <input type="text" placeholder="Enter your name"
                    value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Email</label>
              <div className="input-wrap">
                <Mail size={16} className="input-icon" />
                <input type="email" placeholder="Enter your email"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrap">
                <Lock size={16} className="input-icon" />
                <input type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6} required />
                <button type="button" className="password-toggle"
                  onClick={() => setShowPassword((s) => !s)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div className="alert alert-error">
              <AlertCircle size={16} />{error}</div>}
            {message && <div className="alert alert-success">
              <CheckCircle2 size={16} />{message}</div>}

            <button type="submit" className="btn-auth" disabled={submitting}>
              {submitting ? <><span className="spinner" />Please wait…</> :
                <>{isLogin ? 'Login' : 'Create Account'}<ChevronRight size={15} /></>}
            </button>
          </form>

          <div className="auth-switch">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button type="button" className="link-button"
              onClick={() => { setIsLogin(!isLogin); setError(''); setMessage('') }}>
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================
   DASHBOARD
========================================= */
function Dashboard({ session, profile }) {
  const user = session.user
  const displayName = profile?.full_name || user.user_metadata?.full_name || 'User'
  const initials = displayName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'AI Doctor', icon: Sparkles, badge: 'AI' },
    { id: 'health', label: 'My Health', icon: Activity },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'news', label: 'Health News', icon: Newspaper },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  async function logout() {
    await supabase.auth.signOut()
  }

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <div className="brand-mini">
          <div className="brand-mini-icon"><Heart size={18} strokeWidth={2.4} /></div>
          <div><h1>Savi<span>Pulse</span></h1><p>Health Intelligence</p></div>
        </div>
        <button className="icon-button" onClick={() => setSidebarOpen(s => !s)}>
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
            <h1>Savi<span>Pulse</span></h1>
            <p>Health Intelligence</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <p className="nav-heading">Workspace</p>
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                onClick={() => { setPage(item.id); setSidebarOpen(false) }}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {item.badge && <span className="nav-badge">{item.badge}</span>}
              </button>
            )
          })}

          <div className="sidebar-divider" />
          <p className="nav-heading">Personal</p>
          <button
            className={`nav-item ${page === 'settings' ? 'active' : ''}`}
            onClick={() => { setPage('settings'); setSidebarOpen(false) }}
          >
            <Settings size={17} />
            <span>Settings</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="bottom-icon"><Shield size={16} /></div>
          <p className="bottom-title">Your health matters.</p>
          <p className="bottom-description">
            Small healthy choices today create a stronger tomorrow.
          </p>
          <div className="ai-ready">
            <span className="dot" /><span className="dot" /><span className="dot" />
            SaviPulse AI · Ready
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <h2>{navItems.find(i => i.id === page)?.label || 'Settings'}</h2>
            <p>Welcome back, {displayName.split(' ')[0]} 👋</p>
          </div>
          <div className="topbar-right">
            <div className="profile-chip">
              <div className="avatar">{initials}</div>
              <div className="profile-info">
                <strong>{displayName}</strong>
                <small>{profile?.role === 'admin' ? 'Administrator' : 'Member'}</small>
              </div>
            </div>
            <button className="icon-button" onClick={logout} title="Logout">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {page === 'dashboard' && <DashboardHome user={user} profile={profile} displayName={displayName} />}
        {page === 'chat' && <ChatPage user={user} />}
        {page === 'health' && <HealthPage user={user} />}
        {page === 'news' && <NewsPage />}
        {page === 'records' && <RecordsPage user={user} />}
        {page === 'settings' && <SettingsPage user={user} profile={profile} displayName={displayName} onLogout={logout} />}
      </main>
    </div>
  )
}

/* =========================================
   DASHBOARD HOME
========================================= */
function DashboardHome({ user, profile, displayName }) {
  const [vitals, setVitals] = useState(null)
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: vitalsData } = await supabase
        .from('vitals')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle()
      setVitals(vitalsData)

      const newsRes = await callHealthNews('health news today')
      setNews((newsRes?.news || []).slice(0, 4))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className="hero-card">
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-badge">
            <span className="pulse-dot" />
            AI Health Assistant
          </div>
          <h1>Take care of your health<span>before it becomes a problem.</span></h1>
          <p>Tell SaviPulse how you feel. Understand your symptoms, track your wellness, and get personalized health insights.</p>
        </div>
      </section>

      <section className="stats-grid">
        <StatCard label="Heart Rate" value={vitals?.heart_rate || '—'} unit="BPM" icon={Heart} color="red" />
        <StatCard label="Sleep" value={vitals?.sleep || '—'} unit="hrs" icon={Activity} color="purple" />
        <StatCard label="Steps" value={vitals?.steps?.toLocaleString() || '—'} unit="steps" icon={Sparkles} color="green" />
        <StatCard label="Calories" value={vitals?.calories?.toLocaleString() || '—'} unit="kcal" icon={Activity} color="orange" />
      </section>

      <section className="info-card">
        <div className="info-card-header">
          <div className="info-icon"><CheckCircle2 size={20} /></div>
          <div>
            <h3>Welcome to SaviPulse, {displayName.split(' ')[0]}!</h3>
            <p>Your health journey starts here</p>
          </div>
        </div>
        <div className="info-grid">
          <div className="info-item"><span>Name</span><strong>{displayName}</strong></div>
          <div className="info-item"><span>Email</span><strong>{user.email}</strong></div>
          <div className="info-item"><span>Role</span><strong>{profile?.role || 'user'}</strong></div>
          <div className="info-item"><span>Status</span><strong style={{ color: '#047857' }}>Active ✅</strong></div>
        </div>
      </section>

      {news.length > 0 && (
        <section className="info-card" style={{ marginTop: 22 }}>
          <div className="info-card-header">
            <div className="info-icon"><Newspaper size={20} /></div>
            <div><h3>Today in Health</h3><p>Latest health news</p></div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {news.map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <strong style={{ display: 'block', fontSize: 13, marginBottom: 4, color: '#0f172a' }}>{n.title}</strong>
                <small style={{ fontSize: 11, color: '#64748b' }}>{n.source}</small>
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function StatCard({ label, value, unit, icon: Icon, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon stat-icon-${color}`}><Icon size={18} /></div>
      <div>
        <p className="stat-label">{label}</p>
        <h3>{value} <span>{unit}</span></h3>
      </div>
    </div>
  )
}

/* =========================================
   CHAT PAGE
========================================= */
function ChatPage({ user }) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSend(e) {
    e?.preventDefault()
    const text = message.trim()
    if (!text || loading) return

    setMessage('')
    setError('')
    setMessages(prev => [...prev, { sender: 'user', text }])
    setLoading(true)

    try {
      const history = messages.slice(-10)
      const res = await callChatAI(text, history)

      if (res?.error) throw new Error(res.error)

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: res?.text || 'No response',
        emergency: res?.emergency,
      }])
    } catch (err) {
      setError(err.message || 'Chat failed')
      setMessages(prev => [...prev, { sender: 'ai', text: `⚠️ ${err.message}`, error: true }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="info-card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="info-card-header" style={{ padding: '18px 22px', marginBottom: 0 }}>
        <div className="info-icon"><Sparkles size={20} /></div>
        <div>
          <h3>AI Doctor</h3>
          <p>Ask anything about your health</p>
        </div>
      </div>

      <div style={{ height: 500, overflowY: 'auto', padding: 22, background: '#f8fafc' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <MessageSquare size={48} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, fontWeight: 500 }}>Start a conversation with SaviPulse</p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Try asking: "I have a headache"</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '75%',
                  padding: '12px 16px',
                  borderRadius: 14,
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  background: m.sender === 'user'
                    ? 'linear-gradient(135deg, #10b981, #059669)'
                    : m.error ? '#fef2f2' : 'white',
                  color: m.sender === 'user' ? 'white' : m.error ? '#b91c1c' : '#334155',
                  border: m.sender === 'ai' && !m.error ? '1px solid #e2e8f0' : 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '8px 14px', background: 'white', borderRadius: 14, width: 'fit-content', border: '1px solid #e2e8f0' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 12, color: '#64748b' }}>SaviPulse is typing…</span>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSend} style={{ padding: 16, borderTop: '1px solid #e2e8f0', display: 'flex', gap: 10 }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your health question…"
          style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13.5, background: '#f8fafc' }}
        />
        <button type="submit" disabled={loading || !message.trim()}
          style={{
            padding: '12px 20px', borderRadius: 12,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white', fontWeight: 700, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 6,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading || !message.trim() ? 0.6 : 1,
          }}>
          <Send size={15} /> Send
        </button>
      </form>
    </section>
  )
}

/* =========================================
   HEALTH PAGE
========================================= */
function HealthPage({ user }) {
  const [vitals, setVitals] = useState({
    heart_rate: '', sleep: '', steps: '', calories: '',
    water: '', weight: '', mood: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { loadToday() }, [])

  async function loadToday() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('vitals')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()
    if (data) setVitals(data)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const today = new Date().toISOString().split('T')[0]
    const patch = { user_id: user.id, date: today }
    for (const [k, v] of Object.entries(vitals)) {
      if (k === 'mood' || k === 'notes') patch[k] = v || null
      else if (v !== '' && v !== null) patch[k] = Number(v)
      else patch[k] = null
    }

    const { error } = await supabase
      .from('vitals')
      .upsert(patch, { onConflict: 'user_id,date' })

    if (error) setMessage(`❌ ${error.message}`)
    else {
      setMessage('✅ Vitals saved!')
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
  }

  const fields = [
    { key: 'heart_rate', label: 'Heart Rate', unit: 'BPM', icon: Heart, color: '#ef4444' },
    { key: 'sleep', label: 'Sleep', unit: 'hours', icon: Activity, color: '#8b5cf6' },
    { key: 'steps', label: 'Steps', unit: 'steps', icon: Sparkles, color: '#10b981' },
    { key: 'calories', label: 'Calories', unit: 'kcal', icon: Activity, color: '#f97316' },
    { key: 'water', label: 'Water', unit: 'L', icon: Activity, color: '#3b82f6' },
    { key: 'weight', label: 'Weight', unit: 'kg', icon: Activity, color: '#64748b' },
  ]

  return (
    <section className="info-card">
      <div className="info-card-header">
        <div className="info-icon"><Activity size={20} /></div>
        <div><h3>Today's Vitals</h3><p>Keep your health log up to date</p></div>
      </div>

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {fields.map(f => {
            const Icon = f.icon
            return (
              <div key={f.key} className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={13} style={{ color: f.color }} />
                  {f.label} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({f.unit})</span>
                </label>
                <input
                  type="number" step="0.1"
                  value={vitals[f.key] || ''}
                  onChange={(e) => setVitals({ ...vitals, [f.key]: e.target.value })}
                  placeholder={`Enter ${f.label.toLowerCase()}`}
                />
              </div>
            )
          })}
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label>Mood</label>
          <select value={vitals.mood || ''} onChange={(e) => setVitals({ ...vitals, mood: e.target.value })}
            style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 13.5 }}>
            <option value="">Select mood</option>
            <option value="great">😄 Great</option>
            <option value="good">🙂 Good</option>
            <option value="okay">😐 Okay</option>
            <option value="bad">😕 Bad</option>
            <option value="terrible">😢 Terrible</option>
          </select>
        </div>

        <div className="form-group" style={{ marginTop: 14 }}>
          <label>Notes (optional)</label>
          <textarea value={vitals.notes || ''} onChange={(e) => setVitals({ ...vitals, notes: e.target.value })}
            rows="2" placeholder="Anything noteworthy about today?"
            style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 13.5, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>

        {message && <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-error'}`} style={{ marginTop: 14 }}>{message}</div>}

        <button type="submit" className="btn-auth" disabled={saving} style={{ marginTop: 16, width: 'auto', padding: '0 24px' }}>
          {saving ? <><span className="spinner" />Saving…</> : <>Save Vitals <ChevronRight size={15} /></>}
        </button>
      </form>
    </section>
  )
}

/* =========================================
   NEWS PAGE
========================================= */
function NewsPage() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await callHealthNews('health news today')
      setNews(res?.news || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="info-card">
      <div className="info-card-header">
        <div className="info-icon"><Newspaper size={20} /></div>
        <div><h3>Health News</h3><p>Latest from trusted sources</p></div>
        <button onClick={load} className="improve-pill" style={{ marginLeft: 'auto' }} disabled={loading}>
          {loading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : '↻'} Refresh
        </button>
      </div>

      {error && <div className="alert alert-error"><AlertCircle size={16} />{error}</div>}

      {loading && news.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p>Loading news…</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {news.map((n, i) => (
          <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
            style={{
              padding: 18, background: 'white', borderRadius: 14,
              border: '1px solid #e2e8f0', transition: 'all 0.2s',
              textDecoration: 'none',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <strong style={{ fontSize: 14, color: '#0f172a', lineHeight: 1.4 }}>{n.title}</strong>
              <ExternalLink size={14} style={{ color: '#10b981', flexShrink: 0 }} />
            </div>
            <p style={{ marginTop: 8, fontSize: 12.5, color: '#64748b', lineHeight: 1.6 }}>{n.snippet}</p>
            <small style={{ display: 'block', marginTop: 8, fontSize: 10.5, color: '#94a3b8', fontWeight: 600 }}>
              {n.source}
            </small>
          </a>
        ))}
      </div>
    </section>
  )
}

/* =========================================
   RECORDS PAGE
   (Simplified — file uploads via Storage)
========================================= */
function RecordsPage({ user }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('medical_records')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const title = prompt('Enter record title:', file.name)
    if (!title) return

    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('records')
        .upload(path, file)
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('records').getPublicUrl(path)

      const { error: dbErr } = await supabase.from('medical_records').insert({
        user_id: user.id,
        title,
        type: 'other',
        file_url: urlData.publicUrl,
        file_path: path,
        file_size: file.size,
        file_type: file.type,
      })
      if (dbErr) throw dbErr

      await load()
      alert('✅ Record uploaded!')
    } catch (err) {
      alert(`❌ ${err.message}`)
    }
  }

  async function deleteRecord(r) {
    if (!confirm('Delete this record?')) return
    if (r.file_path) await supabase.storage.from('records').remove([r.file_path])
    await supabase.from('medical_records').delete().eq('id', r.id)
    await load()
  }

  return (
    <section className="info-card">
      <div className="info-card-header">
        <div className="info-icon"><FileText size={20} /></div>
        <div><h3>Medical Records</h3><p>Keep your health records organized</p></div>
        <label className="improve-pill" style={{ marginLeft: 'auto', cursor: 'pointer' }}>
          <Plus size={13} /> Upload
          <input type="file" hidden onChange={handleUpload} accept="image/*,application/pdf" />
        </label>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p>Loading records…</p>
        </div>
      ) : records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <FileText size={48} style={{ opacity: 0.4, margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 500 }}>No records yet</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Upload your first medical record</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {records.map(r => (
            <div key={r.id} style={{
              padding: 14, background: 'white', borderRadius: 14,
              border: '1px solid #e2e8f0',
            }}>
              <strong style={{ display: 'block', fontSize: 13, marginBottom: 6, color: '#0f172a' }}>{r.title}</strong>
              <small style={{ display: 'block', fontSize: 10.5, color: '#94a3b8', marginBottom: 10 }}>
                {new Date(r.created_at).toLocaleDateString()}
              </small>
              <div style={{ display: 'flex', gap: 6 }}>
                <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, padding: '7px 10px', textAlign: 'center', background: '#ecfdf5', color: '#059669', borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>
                  View
                </a>
                <button onClick={() => deleteRecord(r)}
                  style={{ padding: '7px 10px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* =========================================
   SETTINGS PAGE
========================================= */
function SettingsPage({ user, profile, displayName, onLogout }) {
  const [fullName, setFullName] = useState(profile?.full_name || displayName)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) setMessage(`❌ ${error.message}`)
    else {
      setMessage('✅ Profile updated!')
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
  }

  return (
    <>
      <section className="info-card">
        <div className="info-card-header">
          <div className="info-icon"><UserIcon size={20} /></div>
          <div><h3>Profile</h3><p>Your personal information</p></div>
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          {message && <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-error'}`} style={{ marginTop: 14 }}>{message}</div>}
          <button type="submit" className="btn-auth" disabled={saving} style={{ marginTop: 16, width: 'auto', padding: '0 24px' }}>
            {saving ? <><span className="spinner" />Saving…</> : <>Save Changes <ChevronRight size={15} /></>}
          </button>
        </form>
      </section>

      <section className="info-card" style={{ marginTop: 22 }}>
        <div className="info-card-header">
          <div className="info-icon"><Shield size={20} /></div>
          <div><h3>Account</h3><p>Session management</p></div>
        </div>
        <button className="btn-logout" onClick={onLogout}>
          <LogOut size={15} /> Logout from this device
        </button>
      </section>
    </>
  )
}