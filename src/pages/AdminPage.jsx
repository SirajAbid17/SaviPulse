import { useEffect, useState } from 'react'
import {
  checkIsAdmin,
  getAdminStats,
  listAllUsers,
  listAllReviews,
  approveReview,
  rejectReview,
  toggleFeaturedReview,
  deleteReview,
  updateUserRole,
} from '../lib/supabase'
import {
  Shield, Users, MessageSquare, Star, Activity, FileText,
  Loader2, CheckCircle2, XCircle, Trash2, Award, UserCog,
  TrendingUp, Search, RefreshCw, Crown, BarChart3,
} from 'lucide-react'

export default function AdminPage({ user }) {
  const [isAdmin, setIsAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    verifyAdmin()
  }, [user.id])

  async function verifyAdmin() {
    setLoading(true)
    const adminStatus = await checkIsAdmin(user.id)
    setIsAdmin(adminStatus)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite' }} />
        <p>Verifying admin access…</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="admin-denied">
        <div className="admin-denied-icon">
          <Shield size={36} />
        </div>
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
        <small>Admin access required.</small>
      </div>
    )
  }

  return <AdminDashboard user={user} />
}

/* =========================================
   ADMIN DASHBOARD
========================================= */
function AdminDashboard({ user }) {
  const [tab, setTab] = useState('overview')
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [s, u, r] = await Promise.all([
        getAdminStats(),
        listAllUsers(100),
        listAllReviews(),
      ])
      setStats(s)
      setUsers(u)
      setReviews(r)
    } catch (err) {
      console.error('Load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadAll()
    setRefreshing(false)
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users, count: users.length },
    {
      id: 'reviews',
      label: 'Reviews',
      icon: Star,
      count: reviews.filter((r) => r.status === 'pending').length,
    },
  ]

  return (
    <div className="admin-page">
      <section className="admin-header">
        <div className="admin-header-left">
          <div className="admin-header-icon">
            <Crown size={22} />
          </div>
          <div>
            <h2>Admin Panel</h2>
            <p>Manage users, reviews & system</p>
          </div>
        </div>

        <button
          className="admin-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            size={13}
            style={refreshing ? { animation: 'spin 1s linear infinite' } : {}}
          />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </section>

      <div className="admin-tabs">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              className={`admin-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={14} />
              <span>{t.label}</span>
              {t.count > 0 && (
                <span
                  className={`admin-tab-badge ${
                    t.id === 'reviews' ? 'badge-amber' : ''
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="admin-loading">
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <p>Loading data…</p>
        </div>
      ) : (
        <>
          {tab === 'overview' && <OverviewTab stats={stats} />}
          {tab === 'users' && (
            <UsersTab users={users} currentUserId={user.id} onUpdate={loadAll} />
          )}
          {tab === 'reviews' && (
            <ReviewsTab reviews={reviews} onUpdate={loadAll} />
          )}
        </>
      )}
    </div>
  )
}

/* =========================================
   OVERVIEW TAB
========================================= */
function OverviewTab({ stats }) {
  if (!stats) return null

  const items = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'blue' },
    { label: 'Total Chats', value: stats.totalChats, icon: MessageSquare, color: 'purple' },
    { label: 'Total Messages', value: stats.totalMessages, icon: TrendingUp, color: 'emerald' },
    { label: 'Reviews', value: stats.totalReviews, icon: Star, color: 'amber' },
    { label: 'Vitals Logged', value: stats.totalVitals, icon: Activity, color: 'red' },
    { label: 'Records', value: stats.totalRecords, icon: FileText, color: 'slate' },
  ]

  return (
    <div className="admin-overview">
      <div className="admin-stats-grid">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className={`admin-stat admin-stat-${item.color}`}>
              <div className="admin-stat-icon">
                <Icon size={18} />
              </div>
              <div className="admin-stat-body">
                <span className="admin-stat-label">{item.label}</span>
                <strong className="admin-stat-value">
                  {item.value.toLocaleString()}
                </strong>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* =========================================
   USERS TAB
========================================= */
function UsersTab({ users, currentUserId, onUpdate }) {
  const [search, setSearch] = useState('')
  const [changing, setChanging] = useState(null)

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    )
  })

  async function handleRoleChange(userId, newRole) {
    if (userId === currentUserId) {
      alert("You can't change your own role.")
      return
    }

    const ok = window.confirm(
      `Change role to "${newRole}"? User will get new permissions.`
    )
    if (!ok) return

    setChanging(userId)
    try {
      await updateUserRole(userId, newRole)
      await onUpdate()
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setChanging(null)
    }
  }

  return (
    <div className="admin-users">
      <div className="admin-search">
        <Search size={14} />
        <input
          type="text"
          placeholder="Search users by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const initials = (u.full_name || 'U')
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0]?.toUpperCase())
                .join('')

              return (
                <tr key={u.id}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="admin-user-avatar">{initials}</div>
                      <span>{u.full_name || 'No name'}</span>
                    </div>
                  </td>
                  <td className="admin-email">{u.email || '—'}</td>
                  <td>
                    <span className={`admin-role-badge role-${u.role}`}>
                      {u.role === 'admin' && <Crown size={10} />}
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td className="admin-date">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td>
                    {u.id === currentUserId ? (
                      <span className="admin-you">You</span>
                    ) : (
                      <div className="admin-role-actions">
                        {u.role !== 'admin' ? (
                          <button
                            className="admin-role-btn promote"
                            onClick={() => handleRoleChange(u.id, 'admin')}
                            disabled={changing === u.id}
                          >
                            {changing === u.id ? (
                              <Loader2
                                size={11}
                                style={{ animation: 'spin 1s linear infinite' }}
                              />
                            ) : (
                              <>
                                <Crown size={11} /> Make Admin
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            className="admin-role-btn demote"
                            onClick={() => handleRoleChange(u.id, 'user')}
                            disabled={changing === u.id}
                          >
                            {changing === u.id ? (
                              <Loader2
                                size={11}
                                style={{ animation: 'spin 1s linear infinite' }}
                              />
                            ) : (
                              <>
                                <UserCog size={11} /> Remove Admin
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="admin-empty">
            <Users size={32} style={{ opacity: 0.3 }} />
            <p>No users found</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================================
   REVIEWS TAB
========================================= */
function ReviewsTab({ reviews, onUpdate }) {
  const [filter, setFilter] = useState('all')
  const [acting, setActing] = useState(null)

  const filtered = reviews.filter((r) => {
    if (filter === 'all') return true
    return r.status === filter
  })

  async function handleApprove(id) {
    setActing(id)
    try {
      await approveReview(id)
      await onUpdate()
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setActing(null)
    }
  }

  async function handleReject(id) {
    if (!window.confirm('Reject this review?')) return
    setActing(id)
    try {
      await rejectReview(id)
      await onUpdate()
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setActing(null)
    }
  }

  async function handleFeature(id, current) {
    setActing(id)
    try {
      await toggleFeaturedReview(id, !current)
      await onUpdate()
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setActing(null)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this review permanently?')) return
    setActing(id)
    try {
      await deleteReview(id)
      await onUpdate()
    } catch (err) {
      alert('Failed: ' + err.message)
    } finally {
      setActing(null)
    }
  }

  const filters = [
    { id: 'all', label: 'All', count: reviews.length },
    {
      id: 'pending',
      label: 'Pending',
      count: reviews.filter((r) => r.status === 'pending').length,
    },
    {
      id: 'approved',
      label: 'Approved',
      count: reviews.filter((r) => r.status === 'approved').length,
    },
    {
      id: 'rejected',
      label: 'Rejected',
      count: reviews.filter((r) => r.status === 'rejected').length,
    },
  ]

  return (
    <div className="admin-reviews">
      <div className="admin-review-filters">
        {filters.map((f) => (
          <button
            key={f.id}
            className={`admin-filter-btn ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.count > 0 && <span className="admin-filter-count">{f.count}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <Star size={32} style={{ opacity: 0.3 }} />
          <p>No reviews found</p>
        </div>
      ) : (
        <div className="admin-reviews-grid">
          {filtered.map((r) => (
            <div key={r.id} className={`admin-review-card status-${r.status}`}>
              <div className="admin-review-head">
                <div className="admin-review-user">
                  <div className="admin-review-avatar">
                    {(r.profiles?.full_name || 'U')
                      .split(' ')
                      .slice(0, 2)
                      .map((w) => w[0]?.toUpperCase())
                      .join('')}
                  </div>
                  <div>
                    <strong>{r.profiles?.full_name || 'Anonymous'}</strong>
                    <small>{r.profiles?.email || ''}</small>
                  </div>
                </div>
                <div className="admin-review-stars">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={13}
                      fill={s <= r.rating ? '#fbbf24' : 'none'}
                      stroke={s <= r.rating ? '#fbbf24' : '#cbd5e1'}
                    />
                  ))}
                </div>
              </div>

              <p className="admin-review-text">"{r.text}"</p>

              <div className="admin-review-meta">
                <span className={`admin-review-status-badge status-${r.status}`}>
                  {r.status}
                </span>
                {r.is_featured && (
                  <span className="admin-review-featured">
                    <Award size={9} /> Featured
                  </span>
                )}
                <span className="admin-review-date">
                  {new Date(r.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>

              <div className="admin-review-actions">
                {r.status !== 'approved' && (
                  <button
                    className="admin-action-btn approve"
                    onClick={() => handleApprove(r.id)}
                    disabled={acting === r.id}
                  >
                    {acting === r.id ? (
                      <Loader2
                        size={11}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                    ) : (
                      <>
                        <CheckCircle2 size={12} /> Approve
                      </>
                    )}
                  </button>
                )}

                {r.status !== 'rejected' && (
                  <button
                    className="admin-action-btn reject"
                    onClick={() => handleReject(r.id)}
                    disabled={acting === r.id}
                  >
                    <XCircle size={12} /> Reject
                  </button>
                )}

                {r.status === 'approved' && (
                  <button
                    className={`admin-action-btn feature ${
                      r.is_featured ? 'active' : ''
                    }`}
                    onClick={() => handleFeature(r.id, r.is_featured)}
                    disabled={acting === r.id}
                  >
                    <Award size={12} />
                    {r.is_featured ? 'Unfeature' : 'Feature'}
                  </button>
                )}

                <button
                  className="admin-action-btn delete"
                  onClick={() => handleDelete(r.id)}
                  disabled={acting === r.id}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}