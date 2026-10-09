import { useEffect, useState, useRef } from 'react'
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
  listBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
} from '../lib/supabase'
import '../styles/AdminPage.css'
import ConfirmModal from '../components/ConfirmModal'
import {
  Shield, Users, MessageSquare, Star, Activity, FileText,
  Loader2, CheckCircle2, XCircle, Trash2, Award, UserCog,
  TrendingUp, Search, RefreshCw, Crown, BarChart3,
  Plus, Edit3, Send, Tag, Clock, Image as ImageIcon, X,
  Eye, Calendar,
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
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  /* ============ MODAL STATE ============ */
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

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [s, u, r, b] = await Promise.all([
        getAdminStats(),
        listAllUsers(100),
        listAllReviews(),
        listBlogs(100).catch(() => []),
      ])
      setStats(s)
      setUsers(u)
      setReviews(r)
      setBlogs(b)
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
    { id: 'blogs', label: 'Blogs', icon: FileText, count: blogs.length },
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
            <p>Manage users, reviews, blogs & system</p>
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
            <UsersTab
              users={users}
              currentUserId={user.id}
              onUpdate={loadAll}
              openModal={openModal}
              closeModal={closeModal}
              setModal={setModal}
            />
          )}
          {tab === 'reviews' && (
            <ReviewsTab
              reviews={reviews}
              onUpdate={loadAll}
              openModal={openModal}
              closeModal={closeModal}
              setModal={setModal}
            />
          )}
          {tab === 'blogs' && (
            <BlogsTab
              blogs={blogs}
              user={user}
              onUpdate={loadAll}
              openModal={openModal}
              closeModal={closeModal}
              setModal={setModal}
            />
          )}
        </>
      )}

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
function UsersTab({
  users,
  currentUserId,
  onUpdate,
  openModal,
  closeModal,
  setModal,
}) {
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

  function handleRoleChange(userId, newRole) {
    if (userId === currentUserId) {
      openModal({
        type: 'warning',
        title: 'Not Allowed',
        message: "You can't change your own role.",
        confirmText: 'OK',
        showCancel: false,
        onConfirm: closeModal,
        onCancel: closeModal,
      })
      return
    }

    openModal({
      type: 'confirm',
      title: 'Change Role?',
      message: `Change this user's role to "${newRole}"? They will get new permissions immediately.`,
      confirmText: 'Change',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setModal((m) => ({ ...m, loading: true }))
        setChanging(userId)
        try {
          await updateUserRole(userId, newRole)
          await onUpdate()
          closeModal()
        } catch (err) {
          openModal({
            type: 'error',
            title: 'Update Failed',
            message: err.message || 'Failed to update role.',
            confirmText: 'OK',
            showCancel: false,
            onConfirm: closeModal,
            onCancel: closeModal,
          })
        } finally {
          setChanging(null)
        }
      },
      onCancel: closeModal,
    })
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
                  <td data-label="User">
                    <div className="admin-user-cell">
                      <div className="admin-user-avatar">{initials}</div>
                      <span>{u.full_name || 'No name'}</span>
                    </div>
                  </td>
                  <td className="admin-email" data-label="Email">
                    {u.email || '—'}
                  </td>
                  <td data-label="Role">
                    <span className={`admin-role-badge role-${u.role}`}>
                      {u.role === 'admin' && <Crown size={10} />}
                      {u.role || 'user'}
                    </span>
                  </td>
                  <td className="admin-date" data-label="Joined">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td data-label="Actions">
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
function ReviewsTab({
  reviews,
  onUpdate,
  openModal,
  closeModal,
  setModal,
}) {
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
      openModal({
        type: 'error',
        title: 'Approve Failed',
        message: err.message || 'Failed to approve review.',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: closeModal,
        onCancel: closeModal,
      })
    } finally {
      setActing(null)
    }
  }

  function handleReject(id) {
    openModal({
      type: 'warning',
      title: 'Reject Review?',
      message: 'This review will be marked as rejected and hidden from users.',
      confirmText: 'Reject',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setModal((m) => ({ ...m, loading: true }))
        setActing(id)
        try {
          await rejectReview(id)
          await onUpdate()
          closeModal()
        } catch (err) {
          openModal({
            type: 'error',
            title: 'Reject Failed',
            message: err.message || 'Failed to reject review.',
            confirmText: 'OK',
            showCancel: false,
            onConfirm: closeModal,
            onCancel: closeModal,
          })
        } finally {
          setActing(null)
        }
      },
      onCancel: closeModal,
    })
  }

  async function handleFeature(id, current) {
    setActing(id)
    try {
      await toggleFeaturedReview(id, !current)
      await onUpdate()
    } catch (err) {
      openModal({
        type: 'error',
        title: 'Update Failed',
        message: err.message || 'Failed to update featured status.',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: closeModal,
        onCancel: closeModal,
      })
    } finally {
      setActing(null)
    }
  }

  function handleDelete(id) {
    openModal({
      type: 'danger',
      title: 'Delete Review?',
      message: 'This review will be permanently deleted. This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setModal((m) => ({ ...m, loading: true }))
        setActing(id)
        try {
          await deleteReview(id)
          await onUpdate()
          closeModal()
        } catch (err) {
          openModal({
            type: 'error',
            title: 'Delete Failed',
            message: err.message || 'Failed to delete review.',
            confirmText: 'OK',
            showCancel: false,
            onConfirm: closeModal,
            onCancel: closeModal,
          })
        } finally {
          setActing(null)
        }
      },
      onCancel: closeModal,
    })
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

/* =========================================
   BLOGS TAB — Admin Management
========================================= */
function BlogsTab({ blogs, user, onUpdate, openModal, closeModal, setModal }) {
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = blogs.filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.title?.toLowerCase().includes(q) ||
      b.category?.toLowerCase().includes(q)
    )
  })

  function handleNew() {
    setEditing(null)
    setShowForm(true)
  }

  function handleEdit(blog) {
    setEditing(blog)
    setShowForm(true)
  }

  function handleDelete(blog) {
    openModal({
      type: 'danger',
      title: 'Delete Blog?',
      message: `"${blog.title}" will be permanently deleted along with all its comments and likes.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setModal((m) => ({ ...m, loading: true }))
        try {
          await deleteBlog(blog)
          await onUpdate()
          closeModal()
        } catch (err) {
          openModal({
            type: 'error',
            title: 'Delete Failed',
            message: err.message || 'Could not delete blog.',
            confirmText: 'OK',
            showCancel: false,
            onConfirm: closeModal,
            onCancel: closeModal,
          })
        }
      },
      onCancel: closeModal,
    })
  }

  async function handleSaved() {
    setShowForm(false)
    setEditing(null)
    await onUpdate()
  }

  return (
    <div className="admin-blogs">
      {/* Header */}
      <div className="admin-blogs-topbar">
        <div className="admin-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search blogs by title or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="admin-blog-new-btn" onClick={handleNew}>
          <Plus size={14} />
          New Blog
        </button>
      </div>

      {/* Blog Form (inline, when open) */}
      {showForm && (
        <AdminBlogForm
          user={user}
          editingBlog={editing}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSaved={handleSaved}
        />
      )}

      {/* Blog list */}
      {filtered.length === 0 ? (
        <div className="admin-empty">
          <FileText size={32} style={{ opacity: 0.3 }} />
          <p>No blogs yet</p>
        </div>
      ) : (
        <div className="admin-blogs-grid">
          {filtered.map((b) => (
            <div key={b.id} className="admin-blog-card">
              {b.cover_url && (
                <div className="admin-blog-cover">
                  <img src={b.cover_url} alt={b.title} loading="lazy" />
                </div>
              )}

              <div className="admin-blog-body">
                <div className="admin-blog-meta">
                  <span className="admin-blog-tag">
                    <Tag size={9} />
                    {b.category || 'General'}
                  </span>
                  <span className="admin-blog-time">
                    <Clock size={9} />
                    {b.read_time || '3 min read'}
                  </span>
                </div>

                <h4 className="admin-blog-title">{b.title}</h4>
                <p className="admin-blog-excerpt">
                  {b.content?.slice(0, 100)}
                  {b.content?.length > 100 ? '…' : ''}
                </p>

                <div className="admin-blog-footer">
                  <span className="admin-blog-date">
                    <Calendar size={9} />
                    {new Date(b.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>

                  <div className="admin-blog-actions">
                    <button
                      className="admin-blog-action edit"
                      onClick={() => handleEdit(b)}
                      title="Edit"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      className="admin-blog-action delete"
                      onClick={() => handleDelete(b)}
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* =========================================
   ADMIN BLOG FORM
========================================= */
function AdminBlogForm({ user, editingBlog, onCancel, onSaved }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [readTime, setReadTime] = useState('3 min read')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const coverRef = useRef(null)

  useEffect(() => {
    if (editingBlog) {
      setTitle(editingBlog.title || '')
      setCategory(editingBlog.category || '')
      setContent(editingBlog.content || '')
      setReadTime(editingBlog.read_time || '3 min read')
      setCoverPreview(editingBlog.cover_url || '')
      setCoverFile(null)
    } else {
      setTitle('')
      setCategory('')
      setContent('')
      setReadTime('3 min read')
      setCoverPreview('')
      setCoverFile(null)
    }
    setErr('')
  }, [editingBlog])

  function handleCoverSelect(e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) {
      setErr('Cover must be an image.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setErr('Cover must be under 5 MB.')
      return
    }
    setCoverFile(f)
    setCoverPreview(URL.createObjectURL(f))
    setErr('')
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!title.trim()) {
      setErr('Title is required.')
      return
    }
    if (content.trim().length < 20) {
      setErr('Content must be at least 20 characters.')
      return
    }

    setSaving(true)
    setErr('')

    try {
      if (editingBlog) {
        const updates = {
          title: title.trim(),
          category: category.trim() || 'General',
          content: content.trim(),
          read_time: readTime,
        }

        if (coverFile) {
          const ext = (coverFile.name.split('.').pop() || 'jpg').toLowerCase()
          const path = `${user.id}/${Date.now()}-cover.${ext}`
          const { error: upErr } = await supabaseStorageUpload(path, coverFile)
          if (upErr) throw upErr

          const { data: urlData } = supabaseStorageUrl(path)
          updates.cover_url = urlData.publicUrl
        }

        await updateBlog(editingBlog.id, updates)
      } else {
        await createBlog(
          user.id,
          {
            title: title.trim(),
            category: category.trim() || 'General',
            content: content.trim(),
            read_time: readTime,
          },
          coverFile
        )
      }

      await onSaved()
    } catch (err) {
      console.error(err)
      setErr(err.message || 'Failed to save blog.')
    } finally {
      setSaving(false)
    }
  }

  /* Local helpers using supabase directly */
  async function supabaseStorageUpload(path, file) {
    const { supabase } = await import('../lib/supabase')
    return supabase.storage.from('blogs').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })
  }

  async function supabaseStorageUrl(path) {
    const { supabase } = await import('../lib/supabase')
    return supabase.storage.from('blogs').getPublicUrl(path)
  }

  return (
    <form className="admin-blog-form" onSubmit={handleSubmit}>
      <div className="admin-blog-form-header">
        <div className="admin-blog-form-icon">
          {editingBlog ? <Edit3 size={15} /> : <Plus size={15} />}
        </div>
        <div>
          <h3>{editingBlog ? 'Edit Blog' : 'Create New Blog'}</h3>
          <p>
            {editingBlog
              ? 'Update this blog post'
              : 'Fill in the details below to publish a new blog'}
          </p>
        </div>
        <button
          type="button"
          className="admin-blog-form-close"
          onClick={onCancel}
          aria-label="Close form"
        >
          <X size={14} />
        </button>
      </div>

      {err && (
        <div className="admin-blog-form-error">
          <XCircle size={13} />
          {err}
        </div>
      )}

      <div className="admin-blog-form-grid">
        {/* COVER */}
        <div className="admin-blog-field admin-blog-field-full">
          <label>
            <ImageIcon size={11} />
            Cover Image (optional)
          </label>
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleCoverSelect}
          />
          <div
            className="admin-blog-cover-drop"
            onClick={() => coverRef.current?.click()}
          >
            {coverPreview ? (
              <img src={coverPreview} alt="Cover preview" />
            ) : (
              <div className="admin-blog-cover-empty">
                <ImageIcon size={20} />
                <span>Click to upload cover</span>
                <small>JPG, PNG, WebP · Max 5 MB</small>
              </div>
            )}
          </div>
        </div>

        {/* TITLE */}
        <div className="admin-blog-field admin-blog-field-full">
          <label>
            <FileText size={11} />
            Title <span className="required">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. How AI is Changing Healthcare"
            maxLength={120}
            required
          />
        </div>

        {/* CATEGORY */}
        <div className="admin-blog-field">
          <label>
            <Tag size={11} />
            Category
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. AI Health"
            maxLength={40}
          />
        </div>

        {/* READ TIME */}
        <div className="admin-blog-field">
          <label>
            <Clock size={11} />
            Read Time
          </label>
          <input
            type="text"
            value={readTime}
            onChange={(e) => setReadTime(e.target.value)}
            placeholder="e.g. 3 min read"
            maxLength={20}
          />
        </div>

        {/* CONTENT */}
        <div className="admin-blog-field admin-blog-field-full">
          <label>
            <Edit3 size={11} />
            Content <span className="required">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your blog content here… Use double line breaks to create new paragraphs."
            rows={10}
            maxLength={8000}
            required
          />
          <div className="admin-blog-field-footer">
            <span>Min 20 characters</span>
            <span>{content.length}/8000</span>
          </div>
        </div>
      </div>

      <div className="admin-blog-form-actions">
        <button
          type="button"
          className="admin-blog-btn-outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="admin-blog-btn-primary"
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Saving…
            </>
          ) : (
            <>
              <Send size={14} />
              {editingBlog ? 'Save Changes' : 'Publish Blog'}
            </>
          )}
        </button>
      </div>
    </form>
  )
}