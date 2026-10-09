import { useEffect, useState, useMemo } from 'react'
import { callHealthNews } from '../lib/supabase'
import {
  Newspaper, Loader2, ExternalLink, AlertCircle, RefreshCw,
  Search, Bookmark, BookmarkCheck, LayoutGrid, List,
  TrendingUp, Clock, Filter, X, Calendar, Sparkles,
  ChevronRight, Share2, Heart, Flame, Brain, Salad,
  Activity, Moon, Droplet, Shield, Stethoscope, Award,
  CheckCircle2,
} from 'lucide-react'
import '../styles/NewsPage.css'

/* =========================================
   CATEGORY DEFINITIONS
========================================= */
const CATEGORIES = [
  { id: 'all', label: 'All', icon: LayoutGrid, color: '#64748b' },
  { id: 'heart', label: 'Heart', icon: Heart, color: '#ef4444' },
  { id: 'brain', label: 'Mental Health', icon: Brain, color: '#8b5cf6' },
  { id: 'nutrition', label: 'Nutrition', icon: Salad, color: '#10b981' },
  { id: 'fitness', label: 'Fitness', icon: Activity, color: '#f97316' },
  { id: 'sleep', label: 'Sleep', icon: Moon, color: '#6366f1' },
  { id: 'disease', label: 'Disease', icon: Stethoscope, color: '#dc2626' },
  { id: 'wellness', label: 'Wellness', icon: Sparkles, color: '#f59e0b' },
]

/* =========================================
   CATEGORIZE ARTICLE FROM TITLE/SNIPPET
========================================= */
function categorizeArticle(item) {
  const text = `${item.title} ${item.snippet || ''}`.toLowerCase()

  if (/(heart|cardio|blood pressure|cholesterol|stroke)/.test(text)) return 'heart'
  if (/(mental|depress|anxiety|stress|brain|alzheimer|dementia)/.test(text)) return 'brain'
  if (/(nutrition|diet|food|vitamin|eat|meal|protein|carb)/.test(text)) return 'nutrition'
  if (/(exercise|fitness|workout|run|walk|muscle|gym)/.test(text)) return 'fitness'
  if (/(sleep|insomnia|rest|circadian)/.test(text)) return 'sleep'
  if (/(cancer|diabetes|disease|virus|covid|flu|infection|disease)/.test(text)) return 'disease'
  if (/(wellness|meditation|yoga|mindful|selfcare)/.test(text)) return 'wellness'

  return 'wellness'
}

/* =========================================
   TIME AGO HELPER
========================================= */
function timeAgo(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - d) / (1000 * 60))

    if (diff < 1) return 'Just now'
    if (diff < 60) return `${diff}m ago`
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
    if (diff < 10080) return `${Math.floor(diff / 1440)}d ago`
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

export default function NewsPage() {
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const saved = localStorage.getItem('savipulse_news_bookmarks')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false)

  /* =========================================
     LOAD NEWS
  ========================================= */
  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await callHealthNews('health news today')
      const raw = res?.news || []

      // Add category + id
      const enriched = raw.map((n, i) => ({
        ...n,
        id: `news-${i}-${n.url}`,
        category: categorizeArticle(n),
      }))

      setNews(enriched)
    } catch (err) {
      setError(err.message || 'Failed to load news')
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  /* =========================================
     BOOKMARKS
  ========================================= */
  function toggleBookmark(id) {
    setBookmarks((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
      try {
        localStorage.setItem('savipulse_news_bookmarks', JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  /* =========================================
     FILTER
  ========================================= */
  const filtered = useMemo(() => {
    return news.filter((n) => {
      // Category filter
      if (activeCategory !== 'all' && n.category !== activeCategory) return false

      // Bookmarks filter
      if (showBookmarksOnly && !bookmarks.includes(n.id)) return false

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matches =
          n.title?.toLowerCase().includes(q) ||
          n.snippet?.toLowerCase().includes(q) ||
          n.source?.toLowerCase().includes(q)
        if (!matches) return false
      }

      return true
    })
  }, [news, activeCategory, searchQuery, showBookmarksOnly, bookmarks])

  /* =========================================
     CATEGORY COUNTS
  ========================================= */
  const categoryCounts = useMemo(() => {
    const counts = { all: news.length }
    news.forEach((n) => {
      counts[n.category] = (counts[n.category] || 0) + 1
    })
    return counts
  }, [news])

  /* =========================================
     RENDER
  ========================================= */
  return (
    <div className="news-page">
      {/* =========================================
          HEADER
      ========================================= */}
      <section className="news-header-card">
        <div className="news-header-left">
          <div className="news-header-icon">
            <Newspaper size={22} />
          </div>
          <div>
            <h2>Health News</h2>
            <p>Live from trusted sources · Powered by Tavily</p>
          </div>
        </div>

        <div className="news-header-actions">
          <button
            className="news-view-toggle"
            onClick={() => setViewMode((v) => (v === 'grid' ? 'list' : 'grid'))}
            title={viewMode === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
          >
            {viewMode === 'grid' ? <List size={14} /> : <LayoutGrid size={14} />}
          </button>

          <button
            className="news-refresh-btn"
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

      {/* =========================================
          STATS BAR
      ========================================= */}
      {!loading && news.length > 0 && (
        <section className="news-stats-bar">
          <div className="news-stat">
            <span className="news-stat-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <Newspaper size={14} />
            </span>
            <div>
              <strong>{news.length}</strong>
              <small>Articles</small>
            </div>
          </div>

          <div className="news-stat">
            <span className="news-stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
              <Award size={14} />
            </span>
            <div>
              <strong>{new Set(news.map((n) => n.source)).size}</strong>
              <small>Sources</small>
            </div>
          </div>

          <div className="news-stat">
            <span className="news-stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>
              <Bookmark size={14} />
            </span>
            <div>
              <strong>{bookmarks.length}</strong>
              <small>Bookmarked</small>
            </div>
          </div>

          <div className="news-stat">
            <span className="news-stat-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
              <TrendingUp size={14} />
            </span>
            <div>
              <strong>{categoryCounts[activeCategory] || news.length}</strong>
              <small>Showing</small>
            </div>
          </div>
        </section>
      )}

      {/* =========================================
          SEARCH + FILTERS
      ========================================= */}
      <section className="news-filters">
        <div className="news-search">
          <Search size={14} />
          <input
            type="text"
            placeholder="Search news by title, source, or content…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="news-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <button
          className={`news-bookmarks-filter ${showBookmarksOnly ? 'active' : ''}`}
          onClick={() => setShowBookmarksOnly((s) => !s)}
          title={showBookmarksOnly ? 'Show all' : 'Show bookmarked only'}
        >
          {showBookmarksOnly ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          {showBookmarksOnly ? 'Bookmarked' : 'Bookmarks'}
          {bookmarks.length > 0 && (
            <span className="news-bookmark-count">{bookmarks.length}</span>
          )}
        </button>
      </section>

      {/* =========================================
          CATEGORY TABS
      ========================================= */}
      {!loading && news.length > 0 && (
        <section className="news-categories">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const count = categoryCounts[cat.id] || 0
            const isActive = activeCategory === cat.id

            return (
              <button
                key={cat.id}
                className={`news-category-chip ${isActive ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  '--cat-color': cat.color,
                }}
                disabled={count === 0 && cat.id !== 'all'}
              >
                <Icon size={13} />
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className="news-category-count">{count}</span>
                )}
              </button>
            )
          })}
        </section>
      )}

      {/* =========================================
          ERROR
      ========================================= */}
      {error && (
        <div className="news-alert news-alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* =========================================
          LOADING STATE
      ========================================= */}
      {loading && news.length === 0 && (
        <div className="news-loading">
          <Loader2 size={26} style={{ animation: 'spin 1s linear infinite' }} />
          <p>Fetching latest health news…</p>
          <small>This usually takes 3-5 seconds</small>
        </div>
      )}

      {/* =========================================
          EMPTY STATE
      ========================================= */}
      {!loading && filtered.length === 0 && news.length > 0 && (
        <div className="news-empty">
          <Filter size={40} style={{ opacity: 0.3 }} />
          <h4>No articles found</h4>
          <p>
            {showBookmarksOnly
              ? "You haven't bookmarked any articles yet."
              : searchQuery
              ? `No results for "${searchQuery}"`
              : 'No articles in this category.'}
          </p>
          {(searchQuery || showBookmarksOnly || activeCategory !== 'all') && (
            <button
              className="news-empty-reset"
              onClick={() => {
                setSearchQuery('')
                setShowBookmarksOnly(false)
                setActiveCategory('all')
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* =========================================
          NEWS GRID / LIST
      ========================================= */}
      {filtered.length > 0 && (
        <section className={`news-container news-${viewMode}`}>
          {filtered.map((item, i) => (
            <NewsCard
              key={item.id}
              item={item}
              index={i}
              bookmarked={bookmarks.includes(item.id)}
              onToggleBookmark={() => toggleBookmark(item.id)}
              viewMode={viewMode}
            />
          ))}
        </section>
      )}

      {/* =========================================
          FOOTER NOTE
      ========================================= */}
      {filtered.length > 0 && (
        <div className="news-footer-note">
          <Sparkles size={12} />
          Showing {filtered.length} of {news.length} articles
          {activeCategory !== 'all' && ` in ${CATEGORIES.find((c) => c.id === activeCategory)?.label}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}
    </div>
  )
}

/* =========================================
   NEWS CARD
========================================= */
function NewsCard({ item, index, bookmarked, onToggleBookmark, viewMode }) {
  const category = CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[0]
  const CategoryIcon = category.icon

  const handleCopyLink = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(item.url)
    } catch {}
  }

  if (viewMode === 'list') {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="news-list-item"
      >
        <div
          className="news-list-cat"
          style={{ background: `${category.color}15`, color: category.color }}
        >
          <CategoryIcon size={16} />
        </div>

        <div className="news-list-body">
          <div className="news-list-meta-top">
            <span className="news-list-number">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="news-list-cat-label" style={{ color: category.color }}>
              {category.label}
            </span>
            <span className="news-list-dot">·</span>
            <span className="news-list-source">{item.source}</span>
            {item.publishedDate && (
              <>
                <span className="news-list-dot">·</span>
                <span className="news-list-time">
                  <Clock size={10} />
                  {timeAgo(item.publishedDate)}
                </span>
              </>
            )}
          </div>

          <strong className="news-list-title">{item.title}</strong>
          <p className="news-list-snippet">{item.snippet}</p>
        </div>

        <div className="news-list-actions">
          <button
            type="button"
            className={`news-action-btn ${bookmarked ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleBookmark()
            }}
            title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            {bookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
          <ExternalLink size={13} className="news-list-external" />
        </div>
      </a>
    )
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="news-card"
    >
      <div
        className="news-card-header"
        style={{
          background: `linear-gradient(135deg, ${category.color}12, ${category.color}05)`,
        }}
      >
        <div
          className="news-card-icon"
          style={{ background: 'white', color: category.color }}
        >
          <CategoryIcon size={20} />
        </div>

        <span
          className="news-card-cat"
          style={{
            background: 'white',
            color: category.color,
          }}
        >
          {category.label}
        </span>

        <button
          type="button"
          className={`news-card-bookmark ${bookmarked ? 'active' : ''}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggleBookmark()
          }}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          {bookmarked ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
        </button>
      </div>

      <div className="news-card-body">
        <h3>{item.title}</h3>
        <p>{item.snippet}</p>
      </div>

      <div className="news-card-footer">
        <div className="news-card-source">
          <span className="news-card-source-dot" style={{ background: category.color }} />
          <strong>{item.source}</strong>
        </div>
        <div className="news-card-time">
          <Clock size={10} />
          {timeAgo(item.publishedDate)}
        </div>
      </div>

      <div className="news-card-hover">
        <span>Read article</span>
        <ExternalLink size={12} />
      </div>
    </a>
  )
}