import { useEffect, useState } from 'react'
import {
  supabase,
  callHealthNews,
  submitReview,
  listApprovedReviews,
  listMyReviews,
} from '../lib/supabase'
import '../styles/dashboard-home.css'
import {
  Heart, Activity, Footprints, Flame, Moon, Droplet, Smile,
  Sparkles, Newspaper, ExternalLink, Loader2, TrendingUp,
  Calendar, RefreshCw, AlertCircle, Target, Award,
  Star, Send, CheckCircle2, MessageSquareHeart, ThumbsUp, Quote,
  ShieldCheck, Radio, CircleCheck,
} from 'lucide-react'
import Blogs from '../components/Blogs/Blogs'

export default function DashboardHome({
  user,
  profile,
  displayName,
  onAskQuestion,
}) {
  const [vitals, setVitals] = useState(null)
  const [recentVitals, setRecentVitals] = useState([])
  const [news, setNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [newsLoading, setNewsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const today = new Date().toISOString().split('T')[0]
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const [todayRes, historyRes] = await Promise.all([
        supabase
          .from('vitals')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', today)
          .maybeSingle(),
        supabase
          .from('vitals')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', sevenDaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: true }),
      ])

      setVitals(todayRes.data)
      setRecentVitals(historyRes.data || [])
    } catch (err) {
      console.error(err)
      setError('Failed to load health data')
    } finally {
      setLoading(false)
    }

    loadNews()
  }

  async function loadNews() {
    setNewsLoading(true)
    try {
      const res = await callHealthNews('health news today')
      setNews((res?.news || []).slice(0, 6))
    } catch (err) {
      console.error('News load failed:', err)
    } finally {
      setNewsLoading(false)
    }
  }

  async function refreshAll() {
    setRefreshing(true)
    await loadData()
    setTimeout(() => setRefreshing(false), 500)
  }

  const firstName = displayName?.split(' ')[0] || 'there'
  const healthScore = computeHealthScore(vitals)

  /* =========================================
     ASK QUESTION → OPEN CHAT WITH IT
  ========================================= */
  function askQuestion(q) {
    if (typeof onAskQuestion === 'function') {
      onAskQuestion(q)
    } else {
      // Fallback: agar parent ne prop nahi diya to localStorage use karo
      localStorage.setItem('pending_chat_question', q)
      window.location.href = '/chat'
    }
  }

  return (
    <div className="dashboard-home">
      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* HERO */}
      <section className="hero-section-react">
        <div className="hero-glow-react hero-glow-one-react" />
        <div className="hero-glow-react hero-glow-two-react" />

        <div className="hero-content-react">
          <div className="hero-left-react">
            <div className="ai-badge-react">
              <span className="pulse-dot-react" />
              AI Health Assistant
            </div>

            <h2 className="hero-title-react">
              Take care of your health
              <span>before it becomes a problem.</span>
            </h2>

            <p className="hero-description-react">
              Tell SaviPulse how you feel. Understand your symptoms,
              track your wellness, ask health questions, or connect with
              a qualified doctor when you need one.
            </p>

            <div className="hero-actions-react">
              <div className="hero-score-chip">
                <div className="hero-score-ring-small">
                  <svg viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={healthScore.color}
                      strokeWidth="3"
                      strokeDasharray={`${healthScore.score}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>{healthScore.score}</span>
                </div>
                <div className="hero-score-info">
                  <strong>{healthScore.label}</strong>
                  <small>Today's Score</small>
                </div>
              </div>

              <button
                onClick={refreshAll}
                disabled={refreshing}
                className="hero-refresh-btn-react"
              >
                <RefreshCw
                  size={13}
                  style={refreshing ? { animation: 'spin 1s linear infinite' } : {}}
                />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {/* QUICK QUESTIONS — onAskQuestion use */}
            <div className="quick-questions-react">
              <button
                className="quick-question-react"
                onClick={() => askQuestion('I have a headache')}
              >
                I have a headache
              </button>
              <button
                className="quick-question-react"
                onClick={() => askQuestion('Why am I feeling tired?')}
              >
                Why am I feeling tired?
              </button>
              <button
                className="quick-question-react"
                onClick={() => askQuestion('How can I sleep better?')}
              >
                How can I sleep better?
              </button>
              <button
                className="quick-question-react"
                onClick={() => askQuestion('Is my heart rate normal?')}
              >
                Is my heart rate normal?
              </button>
            </div>
          </div>

          {/* ORB */}
          <div className="hero-orb-wrapper-react">
            <div className="hero-orb-react">
              <div className="orb-ring-react ring-one-react" />
              <div className="orb-ring-react ring-two-react" />

              <div className="orb-core-react">
                <div className="orb-heart-react">
                  <Heart size={36} fill="rgba(255,255,255,0.2)" />
                </div>
              </div>

              <div className="orb-status-react">
                <strong>AI Online</strong>
                <span>Ready to help</span>
              </div>

              <div className="orb-health-react">
                <strong>Health First</strong>
                <span>Every single day</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="trust-grid-react">
        <TrustCard
          icon={ShieldCheck}
          title="Prevention First"
          text="Understand your health earlier"
        />
        <TrustCard
          icon={Sparkles}
          title="Smart AI"
         text="AI-Powered Healthcare Assistant"
        />
        <TrustCard
          icon={CircleCheck}
          title="Reliable Guidance"
          text="Health information made simple"
        />
        <TrustCard
          icon={Radio}
          title="Always Available"
          text="Support whenever you need it"
        />
      </section>

      {/* STATS GRID */}
      <section className="stats-grid-react">
        <StatCard
          label="Heart Rate"
          value={vitals?.heart_rate || '—'}
          unit="BPM"
          icon={Heart}
          color="red"
          status={getHRStatus(vitals?.heart_rate)}
          progress={vitals?.heart_rate ? Math.min((vitals.heart_rate / 200) * 100, 100) : 0}
        />
        <StatCard
          label="Sleep"
          value={vitals?.sleep || '—'}
          unit="hrs"
          icon={Moon}
          color="purple"
          status={getSleepStatus(vitals?.sleep)}
          progress={vitals?.sleep ? Math.min((vitals.sleep / 9) * 100, 100) : 0}
        />
        <StatCard
          label="Steps"
          value={vitals?.steps?.toLocaleString() || '—'}
          unit="steps"
          icon={Footprints}
          color="green"
          status={getStepsStatus(vitals?.steps)}
          progress={vitals?.steps ? Math.min((vitals.steps / 10000) * 100, 100) : 0}
        />
        <StatCard
          label="Calories"
          value={vitals?.calories?.toLocaleString() || '—'}
          unit="kcal"
          icon={Flame}
          color="orange"
          status={getCaloriesStatus(vitals?.calories)}
          progress={vitals?.calories ? Math.min((vitals.calories / 2400) * 100, 100) : 0}
        />
        <StatCard
          label="Water"
          value={vitals?.water || '—'}
          unit="L"
          icon={Droplet}
          color="blue"
          status={getWaterStatus(vitals?.water)}
          progress={vitals?.water ? Math.min((vitals.water / 3) * 100, 100) : 0}
        />
        <StatCard
          label="Mood"
          value={vitals?.mood ? capitalize(vitals.mood) : '—'}
          unit="today"
          icon={Smile}
          color="yellow"
          status={getMoodStatus(vitals?.mood)}
          progress={getMoodProgress(vitals?.mood)}
        />
      </section>

      {/* 7-DAY TREND */}
      {recentVitals.length > 0 && (
        <section className="section-card-react">
          <div className="section-card-header-react">
            <div className="section-icon-react">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3>Last 7 Days</h3>
              <p>Your vitals at a glance</p>
            </div>
            <span className="trend-badge-react">
              <Target size={11} /> {recentVitals.length} days logged
            </span>
          </div>

          <MiniTrendChart data={recentVitals} />
        </section>
      )}

     <Blogs user={user} profile={profile} />

      {/* HEALTH NEWS */}
      <section className="section-card-react">
        <div className="section-card-header-react">
          <div className="section-icon-react">
            <Newspaper size={18} />
          </div>
          <div>
            <h3>Today in Health</h3>
            <p>Curated news from trusted sources</p>
          </div>
          <button
            onClick={loadNews}
            disabled={newsLoading}
            className="section-action-btn-react"
          >
            <RefreshCw
              size={12}
              style={newsLoading ? { animation: 'spin 1s linear infinite' } : {}}
            />
            {newsLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>

        {newsLoading && news.length === 0 ? (
          <div className="empty-state-loading-react">
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Fetching latest health news…</p>
          </div>
        ) : news.length === 0 ? (
          <div className="empty-state-mini-react">
            <Newspaper size={32} style={{ opacity: 0.3 }} />
            <p>No news available right now</p>
          </div>
        ) : (
          <div className="news-list-react">
            {news.map((n, i) => (
              <a
                key={i}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="news-item-react"
              >
                <div className="news-item-number-react">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="news-item-content-react">
                  <strong>{n.title}</strong>
                  <div className="news-item-meta-react">
                    <span className="news-source-react">{n.source}</span>
                    {n.publishedDate && (
                      <span className="news-date-react">
                        <Calendar size={10} />
                        {formatDate(n.publishedDate)}
                      </span>
                    )}
                  </div>
                </div>
                <ExternalLink size={14} className="news-item-icon-react" />
              </a>
            ))}
          </div>
        )}
      </section>

      {/* FEEDBACK */}
      <FeedbackSection user={user} displayName={displayName} />
    </div>
  )
}

/* =========================================
   TRUST CARD
========================================= */
function TrustCard({ icon: Icon, title, text }) {
  return (
    <div className="trust-card-react">
      <div className="trust-icon-react">
        <Icon size={18} />
      </div>
      <div>
        <h4>{title}</h4>
        <p>{text}</p>
      </div>
    </div>
  )
}

/* =========================================
   STAT CARD
========================================= */
function StatCard({ label, value, unit, icon: Icon, color, status, progress = 0 }) {
  const isLogged = value !== '—'

  return (
    <div className={`stat-card-react stat-card-${color}-react ${isLogged ? 'has-data' : 'no-data'}`}>
      <div className={`stat-icon-react stat-icon-${color}-react`}>
        <Icon size={18} />
      </div>

      <div className="stat-body-react">
        <div className="stat-header-react">
          <p className="stat-label-react">{label}</p>
          {status && (
            <span className={`stat-status-react ${status.cls}`}>{status.text}</span>
          )}
        </div>

        <h3 className="stat-value-react">
          {value}
          {isLogged && <span className="stat-unit-react">{unit}</span>}
        </h3>

        {isLogged && (
          <div className="stat-progress-react">
            <div
              className={`stat-progress-bar-react stat-progress-${color}-react`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {!isLogged && <p className="stat-hint-react">Not logged yet</p>}
      </div>
    </div>
  )
}

/* =========================================
   MINI TREND CHART
========================================= */
function MiniTrendChart({ data }) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dayStr = d.toISOString().split('T')[0]
    const found = data.find((v) => v.date === dayStr)
    days.push({
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      date: dayStr,
      steps: found?.steps || 0,
      hr: found?.heart_rate || 0,
      sleep: found?.sleep || 0,
    })
  }

  const maxSteps = Math.max(...days.map((d) => d.steps), 1000)

  return (
    <div className="mini-chart-react">
      {days.map((d, i) => {
        const height = (d.steps / maxSteps) * 100
        const isToday = i === days.length - 1

        return (
          <div key={i} className="mini-chart-col-react">
            <div className="mini-chart-bar-wrap-react">
              {d.steps > 0 && (
                <div
                  className={`mini-chart-bar-react ${isToday ? 'today' : ''}`}
                  style={{ height: `${Math.max(height, 4)}%` }}
                >
                  <span className="mini-chart-tooltip-react">
                    <strong>{d.steps.toLocaleString()}</strong> steps
                    {d.hr > 0 && <> • {d.hr} BPM</>}
                    {d.sleep > 0 && <> • {d.sleep}h sleep</>}
                  </span>
                </div>
              )}
              {d.steps === 0 && <div className="mini-chart-bar-empty-react" />}
            </div>
            <span className={`mini-chart-label-react ${isToday ? 'today' : ''}`}>
              {d.day}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* =========================================
   FEEDBACK SECTION
========================================= */
function FeedbackSection({ user, displayName }) {
  const [reviews, setReviews] = useState([])
  const [myReview, setMyReview] = useState(null)
  const [loading, setLoading] = useState(true)

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadReviews()
  }, [user.id])

  async function loadReviews() {
    setLoading(true)
    try {
      const [approved, mine] = await Promise.all([
        listApprovedReviews(6),
        listMyReviews(user.id),
      ])
      setReviews(approved)
      const existing = mine.find(
        (r) => r.status === 'pending' || r.status === 'approved'
      )
      setMyReview(existing || null)
    } catch (err) {
      console.error('Reviews load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setMessage({ type: '', text: '' })

    if (rating < 1) {
      setMessage({ type: 'error', text: 'Please select a star rating.' })
      return
    }

    if (text.trim().length < 10) {
      setMessage({
        type: 'error',
        text: 'Please write at least 10 characters.',
      })
      return
    }

    setSubmitting(true)
    try {
      await submitReview(user.id, rating, text.trim())
      setMessage({
        type: 'success',
        text: 'Thank you! Your review is pending admin approval.',
      })
      setRating(0)
      setText('')
      await loadReviews()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const hasExistingReview = myReview !== null

  return (
    <section className="feedback-section">
      <div className="feedback-header">
        <div className="feedback-header-left">
          <div className="feedback-header-icon">
            <MessageSquareHeart size={18} />
          </div>
          <div>
            <h3>Share Your Experience</h3>
            <p>Your feedback helps us improve SaviPulse</p>
          </div>
        </div>
        <span className="feedback-header-count">
          <Star size={11} fill="currentColor" />
          {reviews.length} review{reviews.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="feedback-layout">
        {/* LEFT: FORM */}
        <div className="feedback-form-col">
          <div className="feedback-form-card">
            {hasExistingReview ? (
              <div className="feedback-submitted-state">
                <div className="feedback-submitted-icon">
                  <CheckCircle2 size={26} />
                </div>
                <h4>
                  {myReview.status === 'approved'
                    ? 'Review Published!'
                    : 'Review Pending'}
                </h4>
                <p>
                  {myReview.status === 'approved'
                    ? 'Thank you! Your review is live on SaviPulse.'
                    : "Your review is waiting for admin approval. It'll appear publicly soon."}
                </p>

                <div className="feedback-my-review">
                  <div className="feedback-my-review-stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={13}
                        fill={s <= myReview.rating ? '#fbbf24' : 'none'}
                        stroke={s <= myReview.rating ? '#fbbf24' : '#cbd5e1'}
                      />
                    ))}
                  </div>
                  <p className="feedback-my-review-text">"{myReview.text}"</p>
                  <span
                    className={`feedback-my-review-status status-${myReview.status}`}
                  >
                    {myReview.status}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="feedback-form-header">
                  <h4>Write a Review</h4>
                  <p>Tell us about your experience</p>
                </div>

                <form onSubmit={handleSubmit} className="feedback-form">
                  <div className="feedback-form-group">
                    <label>How would you rate SaviPulse?</label>
                    <div className="feedback-rating">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`feedback-star-btn ${
                            s <= (hoverRating || rating) ? 'active' : ''
                          }`}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(s)}
                          aria-label={`${s} stars`}
                        >
                          <Star
                            size={26}
                            fill={
                              s <= (hoverRating || rating) ? '#fbbf24' : 'none'
                            }
                            stroke={
                              s <= (hoverRating || rating)
                                ? '#fbbf24'
                                : '#cbd5e1'
                            }
                          />
                        </button>
                      ))}
                    </div>
                    <p className="feedback-rating-label">
                      {rating === 0
                        ? 'Tap a star to rate'
                        : rating === 1
                        ? '😞 Poor'
                        : rating === 2
                        ? '😐 Fair'
                        : rating === 3
                        ? '🙂 Good'
                        : rating === 4
                        ? '😊 Very Good'
                        : '🤩 Excellent'}
                    </p>
                  </div>

                  <div className="feedback-form-group">
                    <label>Your feedback</label>
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Tell us about your experience with SaviPulse…"
                      rows={4}
                      maxLength={500}
                      required
                    />
                    <div className="feedback-textarea-footer">
                      <span>Minimum 10 characters</span>
                      <span>{text.length}/500</span>
                    </div>
                  </div>

                  {message.text && (
                    <div className={`feedback-alert alert-${message.type}`}>
                      {message.type === 'success' ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <AlertCircle size={14} />
                      )}
                      {message.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="feedback-submit-btn"
                    disabled={submitting || rating === 0 || text.length < 10}
                  >
                    {submitting ? (
                      <>
                        <Loader2
                          size={14}
                          style={{ animation: 'spin 1s linear infinite' }}
                        />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        Submit Review
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* RIGHT: REVIEWS */}
        <div className="feedback-list-col">
          <div className="feedback-list-header">
            <h4>
              <ThumbsUp size={13} />
              What people say
            </h4>
            <p>Real experiences from SaviPulse users</p>
          </div>

          {loading ? (
            <div className="feedback-list-loading">
              <Loader2
                size={18}
                style={{ animation: 'spin 1s linear infinite' }}
              />
              <p>Loading reviews…</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="feedback-list-empty">
              <MessageSquareHeart size={32} style={{ opacity: 0.3 }} />
              <p>No reviews yet</p>
              <small>Be the first to share your experience!</small>
            </div>
          ) : (
            <div className="feedback-list">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* =========================================
   REVIEW CARD
========================================= */
function ReviewCard({ review }) {
  const name = review.profiles?.full_name || 'SaviPulse User'
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

  return (
    <div className="review-card">
      <div className="review-card-top">
        <div className="review-card-avatar">{initials}</div>
        <div className="review-card-user">
          <strong>{name}</strong>
          <div className="review-card-stars">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={11}
                fill={s <= review.rating ? '#fbbf24' : 'none'}
                stroke={s <= review.rating ? '#fbbf24' : '#cbd5e1'}
              />
            ))}
          </div>
        </div>
        {review.is_featured && (
          <span className="review-card-featured">
            <Award size={9} /> Featured
          </span>
        )}
      </div>

      <Quote size={14} className="review-card-quote-icon" />
      <p className="review-card-text">"{review.text}"</p>

      <div className="review-card-footer">
        <span>{formatDate(review.created_at)}</span>
      </div>
    </div>
  )
}

/* =========================================
   HELPERS
========================================= */
function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function computeHealthScore(v) {
  if (!v) return { score: 0, label: 'No data', color: '#94a3b8' }

  let score = 0
  let max = 0

  max += 25
  if (v.heart_rate) {
    if (v.heart_rate >= 60 && v.heart_rate <= 100) score += 25
    else if (v.heart_rate >= 50 && v.heart_rate <= 110) score += 15
    else score += 5
  }

  max += 25
  if (v.sleep) {
    if (v.sleep >= 7 && v.sleep <= 9) score += 25
    else if (v.sleep >= 6 && v.sleep <= 10) score += 15
    else score += 5
  }

  max += 20
  if (v.steps) {
    if (v.steps >= 10000) score += 20
    else if (v.steps >= 7000) score += 15
    else if (v.steps >= 5000) score += 10
    else score += 5
  }

  max += 15
  if (v.water) {
    if (v.water >= 3) score += 15
    else if (v.water >= 2) score += 10
    else if (v.water >= 1) score += 5
  }

  max += 15
  if (v.mood) {
    const moodMap = { great: 15, good: 12, okay: 8, bad: 4, terrible: 2 }
    score += moodMap[v.mood] || 0
  }

  const pct = max > 0 ? Math.round((score / max) * 100) : 0
  let label = 'No data'
  let color = '#94a3b8'
  if (pct >= 90) {
    label = 'Excellent'
    color = '#34d399'
  } else if (pct >= 75) {
    label = 'Great'
    color = '#6ee7b7'
  } else if (pct >= 60) {
    label = 'Good'
    color = '#a7f3d0'
  } else if (pct >= 40) {
    label = 'Fair'
    color = '#fbbf24'
  } else if (pct > 0) {
    label = 'Needs work'
    color = '#f87171'
  }

  return { score: pct, label, color }
}

function getHRStatus(hr) {
  if (!hr) return null
  if (hr < 50) return { text: 'Low', cls: 'status-warn' }
  if (hr > 100) return { text: 'High', cls: 'status-danger' }
  return { text: 'Normal', cls: 'status-good' }
}

function getSleepStatus(s) {
  if (!s) return null
  if (s < 6) return { text: 'Low', cls: 'status-warn' }
  if (s >= 7 && s <= 9) return { text: 'Great', cls: 'status-good' }
  if (s > 10) return { text: 'High', cls: 'status-warn' }
  return { text: 'Good', cls: 'status-ok' }
}

function getStepsStatus(steps) {
  if (!steps) return null
  if (steps >= 10000) return { text: 'Goal!', cls: 'status-good' }
  if (steps >= 7000) return { text: 'Great', cls: 'status-ok' }
  if (steps >= 5000) return { text: 'Good', cls: 'status-ok' }
  return { text: 'Low', cls: 'status-warn' }
}

function getCaloriesStatus(cal) {
  if (!cal) return null
  if (cal >= 2400) return { text: 'Goal!', cls: 'status-good' }
  if (cal >= 1800) return { text: 'Good', cls: 'status-ok' }
  return { text: 'Low', cls: 'status-warn' }
}

function getWaterStatus(w) {
  if (!w) return null
  if (w >= 3) return { text: 'Great', cls: 'status-good' }
  if (w >= 2) return { text: 'Good', cls: 'status-ok' }
  return { text: 'Low', cls: 'status-warn' }
}

function getMoodStatus(m) {
  if (!m) return null
  const map = {
    great: { text: '😄', cls: 'status-good' },
    good: { text: '🙂', cls: 'status-good' },
    okay: { text: '😐', cls: 'status-ok' },
    bad: { text: '😕', cls: 'status-warn' },
    terrible: { text: '😢', cls: 'status-danger' },
  }
  return map[m] || null
}

function getMoodProgress(m) {
  if (!m) return 0
  const map = { great: 100, good: 80, okay: 60, bad: 35, terrible: 15 }
  return map[m] || 0
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = Math.floor((now - d) / (1000 * 60 * 60))

    if (diff < 1) return 'Just now'
    if (diff < 24) return `${diff}h ago`
    if (diff < 48) return 'Yesterday'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}