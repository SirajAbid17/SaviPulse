import { useState, useEffect } from 'react'
import {
  FileText, Tag, Calendar, Clock, Trash2, Eye,
  Loader2, Heart, MessageCircle, X, RefreshCw,
  Send, AlertCircle,
} from 'lucide-react'

import {
  listBlogs,
  deleteBlog,
  toggleBlogLike,
  listBlogLikes,
  listBlogComments,
  createBlogComment,
  deleteBlogComment,
  incrementBlogViews,
} from '../../lib/supabase'
import './Blog.css'
import ConfirmModal from '../ConfirmModal'

/* =========================================
   HELPERS
========================================= */
function timeAgo(dateStr) {
  try {
    const d = new Date(dateStr)
    const diff = Math.floor((Date.now() - d) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

function getInitials(name) {
  if (!name) return 'U'
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
}

/* =========================================
   ✨ BLOG CONTENT FORMATTER
   Converts markdown-like syntax → rich HTML
========================================= */
function formatBlogContent(text) {
  if (!text) return ''

  let html = String(text)

  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  html = html.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^#\s+(.+)$/gm, '<h2>$1</h2>')

  html = html.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>')
  html = html.replace(/__([^_\n]+?)__/g, '<u>$1</u>')
  html = html.replace(/`([^`\n]+?)`/g, '<code>$1</code>')
  html = html.replace(/~~([^~\n]+?)~~/g, '<del>$1</del>')

  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )

  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote>$1</blockquote>')
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>')
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')

  html = html.replace(
    /(<li>[\s\S]*?<\/li>)(?!\s*<li>)/g,
    (match) => `<ul>${match}</ul>`
  )

  html = html.replace(/^\s*---\s*$/gm, '<hr />')

  const blocks = html.split(/\n{2,}/)

  const finalHtml = blocks
    .map((block) => {
      const trimmed = block.trim()
      if (!trimmed) return ''

      if (/^<(h[1-6]|ul|ol|blockquote|hr|pre|div)/i.test(trimmed)) {
        return trimmed
      }
      if (trimmed.includes('<li>')) return trimmed

      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`
    })
    .filter(Boolean)
    .join('')

  return finalHtml
    .replace(/(<p>)\s*[#*_~`>]+\s*/g, '$1')
    .replace(/\s*[#*_~`]+\s*(<\/p>)/g, '$1')
    .replace(/<p>\s*<\/p>/g, '')
}

/* =========================================
   MAIN COMPONENT
========================================= */
export default function Blogs({ user, profile }) {
  const isAdmin = profile?.role === 'admin'
  const userId = user?.id

  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeBlog, setActiveBlog] = useState(null)

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
    loadBlogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadBlogs() {
    setLoading(true)
    try {
      const data = await listBlogs(50)
      setBlogs(data)
    } catch (err) {
      console.error('Load blogs failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadBlogs()
    setRefreshing(false)
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
          setBlogs((prev) => prev.filter((b) => b.id !== blog.id))
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

  async function handleOpenBlog(blog) {
    setActiveBlog(blog)
    const newViews = await incrementBlogViews(blog.id)
    if (newViews !== null) {
      setBlogs((prev) =>
        prev.map((b) => (b.id === blog.id ? { ...b, views: newViews } : b))
      )
      setActiveBlog((prev) => (prev ? { ...prev, views: newViews } : prev))
    }
  }

  const stats = {
    total: blogs.length,
    views: blogs.reduce((sum, b) => sum + (b.views || 0), 0),
    likes: blogs.reduce((sum, b) => sum + (b.likes_count || 0), 0),
    comments: blogs.reduce((sum, b) => sum + (b.comments_count || 0), 0),
  }

  return (
    <div className="blogs-page">
      {/* HEADER */}
      <section className="blogs-header">
        <div className="blogs-header-left">
          <div className="blogs-header-icon">
            <FileText size={22} />
          </div>
          <div>
            <h2>Health Blog</h2>
            <p>
              {isAdmin
                ? 'Manage blogs from Admin Panel · Blogs tab'
                : 'Insights, tips and stories from SaviPulse'}
            </p>
          </div>
        </div>

        <div className="blogs-header-actions">
          <button
            className="blogs-refresh-btn"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={13}
              style={refreshing ? { animation: 'spin 1s linear infinite' } : {}}
            />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </section>

      {/* LAYOUT — single column (no form) */}
      <div className="blogs-layout no-form">
        <div className="blogs-right-col">
          {/* STATS */}
          <div className="blogs-stats-div">
            <div className="blogs-stat">
              <div className="blogs-stat-icon green">
                <FileText size={14} />
              </div>
              <div>
                <strong>{stats.total}</strong>
                <small>Total Blogs</small>
              </div>
            </div>

            <div className="blogs-stat">
              <div className="blogs-stat-icon blue">
                <Eye size={14} />
              </div>
              <div>
                <strong>{stats.views}</strong>
                <small>Total Views</small>
              </div>
            </div>

            <div className="blogs-stat">
              <div className="blogs-stat-icon rose">
                <Heart size={14} />
              </div>
              <div>
                <strong>{stats.likes}</strong>
                <small>Total Likes</small>
              </div>
            </div>

            <div className="blogs-stat">
              <div className="blogs-stat-icon amber">
                <MessageCircle size={14} />
              </div>
              <div>
                <strong>{stats.comments}</strong>
                <small>Comments</small>
              </div>
            </div>
          </div>

          {/* LIST */}
          <div className="blogs-list-div">
            <div className="blogs-list-header">
              <div className="blogs-list-header-left">
                <div className="blogs-list-header-icon">
                  <FileText size={14} />
                </div>
                <div>
                  <h3>Recent Posts</h3>
                  <p>{blogs.length} published</p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="blogs-loading">
                <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
                <p>Loading blogs…</p>
              </div>
            ) : blogs.length === 0 ? (
              <div className="blogs-empty">
                <FileText size={32} style={{ opacity: 0.3 }} />
                <p>No blogs yet</p>
                <small>
                  {isAdmin
                    ? 'Publish blogs from Admin Panel → Blogs tab.'
                    : 'Check back soon for new articles.'}
                </small>
              </div>
            ) : (
              <div className="blogs-list">
                {blogs.map((b) => (
                  <BlogCard
                    key={b.id}
                    blog={b}
                    isAdmin={isAdmin}
                    currentUserId={userId}
                    onOpen={() => handleOpenBlog(b)}
                    onDelete={() => handleDelete(b)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {activeBlog && (
        <BlogModal
          blog={activeBlog}
          user={user}
          profile={profile}
          onClose={() => setActiveBlog(null)}
          onStatsChange={(stats) => {
            setBlogs((prev) =>
              prev.map((b) =>
                b.id === activeBlog.id
                  ? {
                      ...b,
                      likes_count: stats.likes,
                      comments_count: stats.comments,
                    }
                  : b
              )
            )
          }}
        />
      )}

      {/* CONFIRM MODAL */}
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
   BLOG CARD — Compact (thumbnail + text)
========================================= */
function BlogCard({ blog, isAdmin, currentUserId, onOpen, onDelete }) {
  const authorName = blog.profiles?.full_name || 'SaviPulse'
  const authorAvatar = blog.profiles?.avatar_url
  const authorInitials = getInitials(authorName)
  const isOwner = blog.author_id === currentUserId
  const canDelete = isAdmin || isOwner

  const cleanExcerpt = (blog.content || '')
    .replace(/[#*_~`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)

  return (
    <article
      className="blog-card"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
    >
      {blog.cover_url && (
        <div className="blog-card-cover">
          <img src={blog.cover_url} alt={blog.title} loading="lazy" />
        </div>
      )}

      <div className="blog-card-content">
        <div className="blog-card-top">
          <span className="blog-tag blog-tag-purple">
            <Tag size={8} />
            {blog.category || 'General'}
          </span>
          <span className="blog-card-readtime">
            <Clock size={9} />
            {blog.read_time || '3 min read'}
          </span>
        </div>

        <h4 className="blog-card-title">{blog.title}</h4>

        <p className="blog-card-excerpt">
          {cleanExcerpt}
          {blog.content?.length > 80 ? '…' : ''}
        </p>

        <div className="blog-card-stats">
          <span className="blog-card-stat">
            <Eye size={9} />
            {blog.views || 0}
          </span>
          <span className="blog-card-stat">
            <Heart size={9} />
            {blog.likes_count || 0}
          </span>
          <span className="blog-card-stat">
            <MessageCircle size={9} />
            {blog.comments_count || 0}
          </span>
        </div>

        <div className="blog-card-footer">
          <div className="blog-card-author">
            <div className="blog-card-author-avatar">
              {authorAvatar ? (
                <img src={authorAvatar} alt={authorName} />
              ) : (
                <span>{authorInitials}</span>
              )}
            </div>
            <div className="blog-card-author-info">
              <strong>{authorName}</strong>
              <small>{formatDate(blog.created_at)}</small>
            </div>
          </div>

          {canDelete && (
            <div className="blog-card-actions">
              <button
                className="blog-card-action blog-card-action-danger"
                title="Delete"
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

/* =========================================
   BLOG MODAL — WITH RICH TEXT
========================================= */
function BlogModal({ blog, user, profile, onClose, onStatsChange }) {
  const isAdmin = profile?.role === 'admin'
  const userId = user?.id

  const [comments, setComments] = useState([])
  const [likesCount, setLikesCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const [loadingComments, setLoadingComments] = useState(true)
  const [viewsCount, setViewsCount] = useState(blog.views || 0)
  const [likeError, setLikeError] = useState('')
  const [commentError, setCommentError] = useState('')

  const authorName = blog.profiles?.full_name || 'SaviPulse'
  const authorAvatar = blog.profiles?.avatar_url
  const authorInitials = getInitials(authorName)

  const myName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'You'
  const myAvatar = profile?.avatar_url
  const myInitials = getInitials(myName)

  const formattedContent = formatBlogContent(blog.content)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    loadCommentsAndLikes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blog.id])

  async function loadCommentsAndLikes() {
    setLoadingComments(true)
    try {
      const [cmts, likes] = await Promise.all([
        listBlogComments(blog.id),
        listBlogLikes(blog.id),
      ])
      setComments(cmts)
      setLikesCount(likes.length)
      setLiked(userId ? likes.some((l) => l.user_id === userId) : false)
      onStatsChange?.({
        likes: likes.length,
        comments: cmts.length,
      })
    } catch (err) {
      console.error('Load comments failed:', err)
    } finally {
      setLoadingComments(false)
    }
  }

  async function handleLike() {
    setLikeError('')
    if (!userId) {
      setLikeError('Please log in to like this post.')
      setTimeout(() => setLikeError(''), 3000)
      return
    }
    try {
      const newState = await toggleBlogLike(blog.id, userId, liked)
      setLiked(newState)
      const newCount = likesCount + (newState ? 1 : -1)
      setLikesCount(newCount)
      onStatsChange?.({ likes: newCount, comments: comments.length })
    } catch (err) {
      console.error('Like failed:', err)
      setLikeError(err.message || 'Could not update like.')
      setTimeout(() => setLikeError(''), 3000)
    }
  }

  async function handlePostComment(e) {
    e?.preventDefault()
    setCommentError('')

    if (!userId) {
      setCommentError('Please log in to comment.')
      setTimeout(() => setCommentError(''), 3000)
      return
    }

    const text = commentText.trim()
    if (!text || posting) return

    setPosting(true)
    try {
      await createBlogComment(blog.id, userId, text)
      setCommentText('')
      await loadCommentsAndLikes()
    } catch (err) {
      console.error('Comment failed:', err)
      setCommentError(err.message || 'Could not post comment.')
      setTimeout(() => setCommentError(''), 3000)
    } finally {
      setPosting(false)
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await deleteBlogComment(commentId)
      await loadCommentsAndLikes()
    } catch (err) {
      console.error('Delete comment failed:', err)
    }
  }

  return (
    <div
      className="blog-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={blog.title}
    >
      <div className="blog-modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="blog-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={15} />
        </button>

        <div className="blog-modal-scroll">
          {blog.cover_url && (
            <div className="blog-modal-cover">
              <img src={blog.cover_url} alt={blog.title} />
            </div>
          )}

          <div className="blog-modal-top">
            <span className="blog-tag blog-tag-purple">
              <Tag size={9} />
              {blog.category || 'General'}
            </span>
            <span className="blog-modal-readtime">
              <Clock size={10} />
              {blog.read_time || '3 min read'}
            </span>
          </div>

          <h2 className="blog-modal-title">{blog.title}</h2>

          <div className="blog-modal-author-row">
            <div className="blog-modal-author-avatar">
              {authorAvatar ? (
                <img src={authorAvatar} alt={authorName} />
              ) : (
                <span>{authorInitials}</span>
              )}
            </div>
            <div className="blog-modal-author-info">
              <strong>{authorName}</strong>
              <small>
                <Calendar size={9} />
                {formatDate(blog.created_at)}
              </small>
            </div>
          </div>

          <div className="blog-modal-stats-bar">
            <span className="blog-modal-stat-item">
              <Eye size={11} />
              {viewsCount} views
            </span>
            <span className="blog-modal-stat-item">
              <Heart size={11} />
              {likesCount} likes
            </span>
            <span className="blog-modal-stat-item">
              <MessageCircle size={11} />
              {comments.length} comments
            </span>
          </div>

          <div className="blog-modal-divider" />

          <div
            className="blog-modal-content"
            dangerouslySetInnerHTML={{ __html: formattedContent }}
          />

          <div className="blog-modal-divider" />

          {/* COMMENTS */}
          <div className="blog-comments-section">
            <div className="blog-comments-header">
              <div className="blog-comments-header-icon">
                <MessageCircle size={13} />
              </div>
              <div>
                <h4>Comments</h4>
                <p>
                  {comments.length}{' '}
                  {comments.length === 1 ? 'comment' : 'comments'}
                </p>
              </div>
            </div>

            <form onSubmit={handlePostComment} className="blog-comment-form">
              <div className="blog-comment-form-avatar">
                {myAvatar ? (
                  <img src={myAvatar} alt={myName} />
                ) : (
                  <span>{myInitials}</span>
                )}
              </div>
              <div className="blog-comment-form-body">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handlePostComment(e)
                    }
                  }}
                  placeholder="Write a comment…"
                  rows={2}
                  maxLength={500}
                />
                <div className="blog-comment-form-footer">
                  <span className="blog-comment-form-hint">
                    {commentText.length}/500
                  </span>
                  <button
                    type="submit"
                    className="blog-comment-submit"
                    disabled={posting || !commentText.trim()}
                  >
                    {posting ? (
                      <>
                        <Loader2
                          size={11}
                          style={{ animation: 'spin 1s linear infinite' }}
                        />
                        Posting…
                      </>
                    ) : (
                      <>
                        <Send size={11} />
                        Post
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {commentError && (
              <div className="blog-comment-error">
                <AlertCircle size={12} />
                {commentError}
              </div>
            )}

            <div className="blog-comments-list">
              {loadingComments ? (
                <div className="blog-comments-empty">
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <p>Loading comments…</p>
                </div>
              ) : comments.length === 0 ? (
                <div className="blog-comments-empty">
                  <MessageCircle size={22} style={{ opacity: 0.3 }} />
                  <p>No comments yet</p>
                  <small>Be the first to share your thoughts!</small>
                </div>
              ) : (
                comments.map((c) => {
                  const commentAuthorName = c.profiles?.full_name || 'User'
                  const commentAuthorAvatar = c.profiles?.avatar_url
                  const commentInitials = getInitials(commentAuthorName)
                  const canDelete =
                    (userId && c.user_id === userId) || isAdmin

                  return (
                    <div key={c.id} className="blog-comment-item">
                      <div className="blog-comment-avatar">
                        {commentAuthorAvatar ? (
                          <img
                            src={commentAuthorAvatar}
                            alt={commentAuthorName}
                          />
                        ) : (
                          <span>{commentInitials}</span>
                        )}
                      </div>
                      <div className="blog-comment-body">
                        <div className="blog-comment-meta">
                          <strong>{commentAuthorName}</strong>
                          <small>{timeAgo(c.created_at)}</small>
                          {canDelete && (
                            <button
                              className="blog-comment-delete"
                              onClick={() => handleDeleteComment(c.id)}
                              title="Delete comment"
                              type="button"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                        <p className="blog-comment-text">{c.text}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="blog-modal-footer">
          <div className="blog-modal-stats">
            <button
              className={`blog-modal-action ${liked ? 'active' : ''}`}
              type="button"
              onClick={handleLike}
            >
              <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
              <span>
                {likesCount} {likesCount === 1 ? 'like' : 'likes'}
              </span>
            </button>
            <button className="blog-modal-action" type="button">
              <MessageCircle size={13} />
              <span>
                {comments.length}{' '}
                {comments.length === 1 ? 'comment' : 'comments'}
              </span>
            </button>
          </div>

          <button className="blog-modal-done" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {likeError && (
          <div className="blog-modal-error">
            <AlertCircle size={12} />
            {likeError}
          </div>
        )}
      </div>
    </div>
  )
}