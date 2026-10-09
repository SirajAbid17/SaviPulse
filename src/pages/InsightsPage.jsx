import { useEffect, useState } from 'react'
import { supabase, callHealthNews, callTrendingTopics, callNutritionInsights } from '../lib/supabase'
import '../styles/InsightsPage.css'
import {
  Sparkles, Activity, TrendingUp, Newspaper, Loader2,
  ExternalLink, RefreshCw, Heart, Moon, Footprints, Flame,
  Droplet, Brain, Apple, Award, Target, AlertCircle,
  ChevronRight, Flame as Fire, Lightbulb, Info, Calendar,
  Salad, Zap, BarChart3, LineChart, Star,
} from 'lucide-react'

export default function InsightsPage({ user }) {
  /* ============ LOCAL DATA ============ */
  const [vitals, setVitals] = useState([])
  const [loadingVitals, setLoadingVitals] = useState(true)

  /* ============ TAVILY DATA ============ */
  const [news, setNews] = useState([])
  const [trending, setTrending] = useState([])
  const [nutrition, setNutrition] = useState([])
  const [loadingNews, setLoadingNews] = useState(true)
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [loadingNutrition, setLoadingNutrition] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadVitals()
    loadAllTavily()
  }, [user.id])

  /* =========================================
     LOAD USER VITALS (last 30 days)
  ========================================= */
  async function loadVitals() {
    setLoadingVitals(true)
    const since = new Date()
    since.setDate(since.getDate() - 30)

    const { data } = await supabase
      .from('vitals')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', since.toISOString().split('T')[0])
      .order('date', { ascending: false })

    setVitals(data || [])
    setLoadingVitals(false)
  }

  /* =========================================
     LOAD TAVILY (parallel)
  ========================================= */
  async function loadAllTavily() {
    setRefreshing(true)
    await Promise.all([
      loadNews(),
      loadTrending(),
      loadNutrition(),
    ])
    setRefreshing(false)
  }

  async function loadNews() {
    setLoadingNews(true)
    try {
      const res = await callHealthNews('health news today')
      setNews((res?.news || []).slice(0, 6))
    } catch (err) {
      console.error('News load failed:', err)
    } finally {
      setLoadingNews(false)
    }
  }

  async function loadTrending() {
    setLoadingTrending(true)
    try {
      const res = await callTrendingTopics()
      setTrending((res?.topics || res?.news || []).slice(0, 5))
    } catch (err) {
      console.error('Trending load failed:', err)
    } finally {
      setLoadingTrending(false)
    }
  }

  async function loadNutrition() {
    setLoadingNutrition(true)
    try {
      const res = await callNutritionInsights()
      setNutrition((res?.news || []).slice(0, 4))
    } catch (err) {
      console.error('Nutrition load failed:', err)
    } finally {
      setLoadingNutrition(false)
    }
  }

  /* =========================================
     COMPUTED STATS
  ========================================= */
  const stats = computeStats(vitals)
  const healthScore = computeHealthScore(vitals[0])
  const personalizedTips = generatePersonalizedTips(vitals, stats)

  return (
    <div className="insights-page">
      {/* =========================================
          HEADER
      ========================================= */}
      <section className="insights-header-card">
        <div className="insights-header-left">
          <div className="insights-header-icon">
            <Sparkles size={22} />
          </div>
          <div>
            <h2>Health Insights</h2>
            <p>Personalized guidance + live health intelligence</p>
          </div>
        </div>

        <button
          className="insights-refresh-btn"
          onClick={loadAllTavily}
          disabled={refreshing}
        >
          <RefreshCw
            size={13}
            style={refreshing ? { animation: 'spin 1s linear infinite' } : {}}
          />
          {refreshing ? 'Refreshing…' : 'Refresh Live Data'}
        </button>
      </section>

      {/* =========================================
          SECTION 1: HEALTH SCORE + QUICK STATS
      ========================================= */}
      <section className="insights-section">
        <div className="insights-section-header">
          <div className="insights-section-icon">
            <Award size={16} />
          </div>
          <div>
            <h3>Your Health Snapshot</h3>
            <p>Based on your last 30 days</p>
          </div>
        </div>

        <div className="insights-stats-grid">
          <StatBox
            icon={Heart}
            label="Avg Heart Rate"
            value={stats.avgHR ? Math.round(stats.avgHR) : '—'}
            unit="BPM"
            color="red"
            status={getHRStatus(stats.avgHR)}
          />
          <StatBox
            icon={Moon}
            label="Avg Sleep"
            value={stats.avgSleep ? stats.avgSleep.toFixed(1) : '—'}
            unit="hrs"
            color="purple"
            status={getSleepStatus(stats.avgSleep)}
          />
          <StatBox
            icon={Footprints}
            label="Total Steps"
            value={stats.totalSteps ? (stats.totalSteps / 1000).toFixed(1) + 'k' : '—'}
            unit="30 days"
            color="green"
            status={getStepsStatus(stats.avgSteps)}
          />
          <StatBox
            icon={Flame}
            label="Total Calories"
            value={stats.totalCalories ? (stats.totalCalories / 1000).toFixed(1) + 'k' : '—'}
            unit="kcal"
            color="orange"
            status={null}
          />
          <StatBox
            icon={Droplet}
            label="Avg Water"
            value={stats.avgWater ? stats.avgWater.toFixed(1) : '—'}
            unit="L/day"
            color="blue"
            status={getWaterStatus(stats.avgWater)}
          />
          <StatBox
            icon={Activity}
            label="Days Logged"
            value={stats.daysLogged || '—'}
            unit={`of 30`}
            color="slate"
            status={getConsistencyStatus(stats.daysLogged)}
          />
        </div>
      </section>

      {/* =========================================
          SECTION 2: AI-PERSONALIZED TIPS
      ========================================= */}
      <section className="insights-section">
        <div className="insights-section-header">
          <div className="insights-section-icon" style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', color: '#8b5cf6' }}>
            <Brain size={16} />
          </div>
          <div>
            <h3>AI-Powered Tips for You</h3>
            <p>Personalized advice based on your vitals</p>
          </div>
          <span className="insights-section-badge">AI</span>
        </div>

        <div className="insights-tips-grid">
          {personalizedTips.map((tip, i) => (
            <div key={i} className="insight-tip-card">
              <div className="insight-tip-icon" style={{ background: tip.bgColor }}>
                <tip.icon size={18} style={{ color: tip.color }} />
              </div>
              <div className="insight-tip-content">
                <strong>{tip.title}</strong>
                <p>{tip.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================
          SECTION 3: LIVE HEALTH NEWS (TAVILY)
      ========================================= */}
      <section className="insights-section">
        <div className="insights-section-header">
          <div className="insights-section-icon" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#3b82f6' }}>
            <Newspaper size={16} />
          </div>
          <div>
            <h3>Today in Health</h3>
            <p>Live news from trusted sources via Tavily</p>
          </div>
          <button
            className="insights-mini-refresh"
            onClick={loadNews}
            disabled={loadingNews}
          >
            <RefreshCw
              size={11}
              style={loadingNews ? { animation: 'spin 1s linear infinite' } : {}}
            />
          </button>
        </div>

        {loadingNews && news.length === 0 ? (
          <InsightsLoading text="Loading latest health news…" />
        ) : news.length === 0 ? (
          <InsightsEmpty icon={Newspaper} text="No news available right now" />
        ) : (
          <div className="insights-news-grid">
            {news.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="insights-news-card"
              >
                <div className="insights-news-thumb">
                  <Newspaper size={22} />
                </div>
                <div className="insights-news-body">
                  <h4>{item.title}</h4>
                  <p>{item.snippet}</p>
                  <div className="insights-news-meta">
                    <span className="insights-news-source">{item.source}</span>
                    <ExternalLink size={11} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* =========================================
          SECTION 4: TRENDING HEALTH TOPICS (TAVILY)
      ========================================= */}
      <section className="insights-section">
        <div className="insights-section-header">
          <div className="insights-section-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706' }}>
            <Fire size={16} />
          </div>
          <div>
            <h3>Trending Health Topics</h3>
            <p>What the health world is talking about</p>
          </div>
        </div>

        {loadingTrending && trending.length === 0 ? (
          <InsightsLoading text="Fetching trending topics…" />
        ) : trending.length === 0 ? (
          <InsightsEmpty icon={Fire} text="No trending topics right now" />
        ) : (
          <div className="insights-trending-list">
            {trending.map((item, i) => (
              <a
                key={i}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="insights-trending-item"
              >
                <span className="insights-trending-rank">
                  #{i + 1}
                </span>
                <div className="insights-trending-body">
                  <strong>{item.title}</strong>
                  <small>{item.source}</small>
                </div>
                <ChevronRight size={14} className="insights-trending-arrow" />
              </a>
            ))}
          </div>
        )}
      </section>

      {/* =========================================
          SECTION 5: NUTRITION & DIET (TAVILY)
      ========================================= */}
      <section className="insights-section">
        <div className="insights-section-header">
          <div className="insights-section-icon" style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', color: '#059669' }}>
            <Salad size={16} />
          </div>
          <div>
            <h3>Nutrition & Diet Insights</h3>
            <p>Latest research on healthy eating</p>
          </div>
        </div>

        {loadingNutrition && nutrition.length === 0 ? (
          <InsightsLoading text="Loading nutrition insights…" />
        ) : nutrition.length === 0 ? (
          <InsightsEmpty icon={Salad} text="No nutrition insights right now" />
        ) : (
          <div className="insights-nutrition-grid">
            {nutrition.map((item, i) => (
              <div key={i} className="insights-nutrition-card">
                <div className="insights-nutrition-icon">
                  <Apple size={16} />
                </div>
                <div className="insights-nutrition-body">
                  <h4>{item.title}</h4>
                  <p>{item.snippet}</p>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="insights-nutrition-link"
                  >
                    Read more <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =========================================
          FOOTER
      ========================================= */}
      <div className="insights-footer-note">
        <Info size={12} />
        Live data is cached and refreshed periodically. AI insights are
        personalized based on your vitals.
      </div>
    </div>
  )
}

/* =========================================
   STAT BOX
========================================= */
function StatBox({ icon: Icon, label, value, unit, color, status }) {
  return (
    <div className={`insights-stat-box insights-stat-${color}`}>
      <div className="insights-stat-icon">
        <Icon size={16} />
      </div>
      <div className="insights-stat-body">
        <span className="insights-stat-label">{label}</span>
        <div className="insights-stat-value">
          {value} <small>{unit}</small>
        </div>
        {status && (
          <span className={`insights-stat-status ${status.cls}`}>
            {status.text}
          </span>
        )}
      </div>
    </div>
  )
}

/* =========================================
   LOADING & EMPTY
========================================= */
function InsightsLoading({ text }) {
  return (
    <div className="insights-loading">
      <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
      <p>{text}</p>
    </div>
  )
}

function InsightsEmpty({ icon: Icon, text }) {
  return (
    <div className="insights-empty">
      <Icon size={32} style={{ opacity: 0.3 }} />
      <p>{text}</p>
    </div>
  )
}

/* =========================================
   COMPUTE STATS
========================================= */
function computeStats(vitals) {
  if (!vitals || vitals.length === 0) {
    return {
      avgHR: 0, avgSleep: 0, avgSteps: 0, avgWater: 0,
      totalSteps: 0, totalCalories: 0, daysLogged: 0,
    }
  }

  const hr = vitals.filter((v) => v.heart_rate).map((v) => v.heart_rate)
  const sleep = vitals.filter((v) => v.sleep).map((v) => v.sleep)
  const steps = vitals.filter((v) => v.steps).map((v) => v.steps)
  const water = vitals.filter((v) => v.water).map((v) => v.water)
  const cal = vitals.filter((v) => v.calories).map((v) => v.calories)

  const avg = (arr) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  return {
    avgHR: avg(hr),
    avgSleep: avg(sleep),
    avgSteps: avg(steps),
    avgWater: avg(water),
    totalSteps: steps.reduce((a, b) => a + b, 0),
    totalCalories: cal.reduce((a, b) => a + b, 0),
    daysLogged: vitals.length,
  }
}

function computeHealthScore(v) {
  if (!v) return { score: 0, label: 'No data', color: 'slate' }
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
    else if (v.sleep >= 6) score += 15
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
    else score += 5
  }
  max += 15
  if (v.mood) {
    const map = { great: 15, good: 12, okay: 8, bad: 4, terrible: 2 }
    score += map[v.mood] || 0
  }
  const pct = max > 0 ? Math.round((score / max) * 100) : 0
  return { score: pct, label: pct >= 75 ? 'Great' : pct >= 50 ? 'Good' : 'Fair', color: pct >= 75 ? 'emerald' : pct >= 50 ? 'lime' : 'amber' }
}

/* =========================================
   STATUS HELPERS
========================================= */
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
  return { text: 'Fair', cls: 'status-ok' }
}

function getStepsStatus(s) {
  if (!s) return null
  if (s >= 10000) return { text: 'Goal!', cls: 'status-good' }
  if (s >= 7000) return { text: 'Great', cls: 'status-ok' }
  if (s >= 5000) return { text: 'Good', cls: 'status-ok' }
  return { text: 'Low', cls: 'status-warn' }
}

function getWaterStatus(w) {
  if (!w) return null
  if (w >= 3) return { text: 'Great', cls: 'status-good' }
  if (w >= 2) return { text: 'Good', cls: 'status-ok' }
  return { text: 'Low', cls: 'status-warn' }
}

function getConsistencyStatus(days) {
  if (!days) return null
  if (days >= 25) return { text: 'Excellent', cls: 'status-good' }
  if (days >= 15) return { text: 'Good', cls: 'status-ok' }
  if (days >= 7) return { text: 'Fair', cls: 'status-ok' }
  return { text: 'Low', cls: 'status-warn' }
}

/* =========================================
   PERSONALIZED TIPS (from user's vitals)
========================================= */
function generatePersonalizedTips(vitals, stats) {
  const tips = []

  // Sleep
  if (stats.avgSleep && stats.avgSleep < 7) {
    tips.push({
      icon: Moon,
      color: '#8b5cf6',
      bgColor: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
      title: 'Improve Your Sleep',
      text: `You're averaging ${stats.avgSleep.toFixed(1)}h. Aim for 7-8h — try a bedtime routine.`,
    })
  } else if (stats.avgSleep >= 7) {
    tips.push({
      icon: Moon,
      color: '#8b5cf6',
      bgColor: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
      title: 'Great Sleep Pattern',
      text: `${stats.avgSleep.toFixed(1)}h average is excellent. Keep it up!`,
    })
  }

  // Steps
  if (stats.avgSteps && stats.avgSteps < 7000) {
    tips.push({
      icon: Footprints,
      color: '#10b981',
      bgColor: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
      title: 'Increase Daily Steps',
      text: `Avg ${Math.round(stats.avgSteps)} steps. Add a 15-min walk to boost energy.`,
    })
  } else if (stats.avgSteps >= 10000) {
    tips.push({
      icon: Footprints,
      color: '#10b981',
      bgColor: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
      title: 'Excellent Activity',
      text: `10k+ steps daily! Your heart thanks you.`,
    })
  }

  // Water
  if (stats.avgWater && stats.avgWater < 2) {
    tips.push({
      icon: Droplet,
      color: '#3b82f6',
      bgColor: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
      title: 'Hydrate More',
      text: `Only ${stats.avgWater.toFixed(1)}L/day. Aim for 2-3L — set reminders.`,
    })
  }

  // Heart rate
  if (stats.avgHR && (stats.avgHR > 100 || stats.avgHR < 50)) {
    tips.push({
      icon: Heart,
      color: '#ef4444',
      bgColor: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
      title: 'Monitor Heart Rate',
      text: `Avg ${Math.round(stats.avgHR)} BPM is outside normal. Consult a doctor.`,
    })
  }

  // Consistency
  if (stats.daysLogged < 15) {
    tips.push({
      icon: Calendar,
      color: '#f59e0b',
      bgColor: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
      title: 'Log More Consistently',
      text: `Only ${stats.daysLogged} days logged. Daily logging improves insights.`,
    })
  }

  // Fallback
  if (tips.length === 0) {
    tips.push(
      {
        icon: Sparkles,
        color: '#10b981',
        bgColor: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
        title: 'Keep Going!',
        text: 'Log your vitals daily for personalized insights.',
      },
      {
        icon: Brain,
        color: '#8b5cf6',
        bgColor: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
        title: 'Mental Wellness',
        text: 'Take 5 minutes for mindful breathing today.',
      },
      {
        icon: Salad,
        color: '#059669',
        bgColor: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
        title: 'Balanced Diet',
        text: 'Half your plate — vegetables and fruits.',
      },
      {
        icon: Zap,
        color: '#f59e0b',
        bgColor: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
        title: 'Stay Active',
        text: 'Even 10 minutes of movement helps.',
      }
    )
  }

  return tips.slice(0, 4)
}