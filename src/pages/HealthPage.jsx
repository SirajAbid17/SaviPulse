import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  Heart, Moon, Footprints, Flame, Droplet, Scale, Smile,
  Activity, Save, Loader2, CheckCircle2, AlertCircle,
  TrendingUp, Calendar, Target, Award, ChevronRight,
  Sparkles, Info, RefreshCw, BarChart3, Zap,
} from 'lucide-react'

/* =========================================
   VITAL FIELD DEFINITIONS
========================================= */
const VITAL_FIELDS = [
  {
    key: 'heart_rate',
    label: 'Heart Rate',
    unit: 'BPM',
    icon: Heart,
    color: '#ef4444',
    colorName: 'red',
    placeholder: '72',
    min: 30, max: 250,
    goal: null,
    ranges: { normalMin: 60, normalMax: 100 },
  },
  {
    key: 'sleep',
    label: 'Sleep',
    unit: 'hours',
    icon: Moon,
    color: '#8b5cf6',
    colorName: 'purple',
    placeholder: '7.5',
    min: 0, max: 24,
    goal: 8,
    ranges: { normalMin: 7, normalMax: 9 },
  },
  {
    key: 'steps',
    label: 'Steps',
    unit: 'steps',
    icon: Footprints,
    color: '#10b981',
    colorName: 'green',
    placeholder: '5000',
    min: 0, max: 100000,
    goal: 10000,
  },
  {
    key: 'calories',
    label: 'Calories',
    unit: 'kcal',
    icon: Flame,
    color: '#f97316',
    colorName: 'orange',
    placeholder: '1800',
    min: 0, max: 20000,
    goal: 2400,
  },
  {
    key: 'water',
    label: 'Water',
    unit: 'L',
    icon: Droplet,
    color: '#3b82f6',
    colorName: 'blue',
    placeholder: '2.5',
    min: 0, max: 20,
    goal: 3,
  },
  {
    key: 'weight',
    label: 'Weight',
    unit: 'kg',
    icon: Scale,
    color: '#64748b',
    colorName: 'slate',
    placeholder: '70',
    min: 0, max: 500,
    goal: null,
  },
]

const MOODS = [
  { key: 'great',    label: 'Great',    emoji: '😄', color: '#10b981', score: 100 },
  { key: 'good',     label: 'Good',     emoji: '🙂', color: '#34d399', score: 80 },
  { key: 'okay',     label: 'Okay',     emoji: '😐', color: '#fbbf24', score: 60 },
  { key: 'bad',      label: 'Bad',      emoji: '😕', color: '#f97316', score: 35 },
  { key: 'terrible', label: 'Terrible', emoji: '😢', color: '#ef4444', score: 15 },
]

export default function HealthPage({ user }) {
  const [vitals, setVitals] = useState({
    heart_rate: '', sleep: '', steps: '', calories: '',
    water: '', weight: '', mood: '', notes: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })

  const [recentVitals, setRecentVitals] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)

  /* =========================================
     LOAD TODAY + RECENT HISTORY
  ========================================= */
  useEffect(() => {
    loadAll()
  }, [user.id])

  async function loadAll() {
    setLoading(true)
    setHistoryLoading(true)

    const today = new Date().toISOString().split('T')[0]
    const since = new Date()
    since.setDate(since.getDate() - 30)

    try {
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
          .gte('date', since.toISOString().split('T')[0])
          .order('date', { ascending: false })
          .limit(30),
      ])

      if (todayRes.data) {
        setVitals({
          heart_rate: todayRes.data.heart_rate ?? '',
          sleep: todayRes.data.sleep ?? '',
          steps: todayRes.data.steps ?? '',
          calories: todayRes.data.calories ?? '',
          water: todayRes.data.water ?? '',
          weight: todayRes.data.weight ?? '',
          mood: todayRes.data.mood ?? '',
          notes: todayRes.data.notes ?? '',
        })
      }

      setRecentVitals(historyRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setHistoryLoading(false)
    }
  }

  /* =========================================
     SAVE VITALS
  ========================================= */
  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage({ type: '', text: '' })

    const today = new Date().toISOString().split('T')[0]

    // Build clean patch
    const patch = { user_id: user.id, date: today }
    for (const [k, v] of Object.entries(vitals)) {
      if (v === '' || v === null || v === undefined) {
        patch[k] = null
      } else if (k === 'mood' || k === 'notes') {
        patch[k] = String(v)
      } else {
        patch[k] = Number(v)
      }
    }

    const { error } = await supabase
      .from('vitals')
      .upsert(patch, { onConflict: 'user_id,date' })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Vitals saved successfully!' })
      setSavedAt(new Date())
      // Refresh history
      await loadAll()
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
    }
    setSaving(false)
  }

  /* =========================================
     COMPUTED: HEALTH SCORE
  ========================================= */
  const healthScore = useMemo(() => computeHealthScore(vitals), [vitals])

  /* =========================================
     COMPUTED: BMI
  ========================================= */
  const bmi = useMemo(() => {
    const weight = Number(vitals.weight)
    if (!weight) return null

    // Try to get height from profile (user_metadata)
    const height = Number(user.user_metadata?.height)
    if (!height) return null

    const h = height / 100
    const value = Number((weight / (h * h)).toFixed(1))

    let category = 'Normal'
    let color = 'emerald'
    if (value < 18.5) { category = 'Underweight'; color = 'blue' }
    else if (value < 25) { category = 'Normal'; color = 'emerald' }
    else if (value < 30) { category = 'Overweight'; color = 'amber' }
    else { category = 'Obese'; color = 'red' }

    return { value, category, color }
  }, [vitals.weight, user.user_metadata?.height])

  /* =========================================
     RENDER
  ========================================= */
  return (
    <div className="health-page">
      {/* =========================================
          HEADER — Health Score + Today badge
      ========================================= */}
      <section className="health-header">
        <div className="health-header-left">
          <div className="health-header-icon">
            <Activity size={22} />
          </div>
          <div>
            <h2>My Health</h2>
            <p>
              <Calendar size={12} />
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
        </div>

        <div className={`health-score-ring health-score-${healthScore.color}`}>
          <svg viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${healthScore.score}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="health-score-text">
            <span className="health-score-value">{healthScore.score}</span>
            <small>{healthScore.label}</small>
          </div>
        </div>
      </section>

      {/* =========================================
          VITALS FORM
      ========================================= */}
      <section className="health-form-card">
        <div className="health-form-header">
          <div>
            <h3>Today's Vitals</h3>
            <p>Update your health metrics — auto-saved to your profile</p>
          </div>
          {savedAt && (
            <span className="health-saved-badge">
              <CheckCircle2 size={11} />
              Saved {formatTimeAgo(savedAt)}
            </span>
          )}
        </div>

        {loading ? (
          <div className="health-loading">
            <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Loading today's vitals…</p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            {/* Vitals Grid */}
            <div className="health-vitals-grid">
              {VITAL_FIELDS.map((f) => (
                <VitalInput
                  key={f.key}
                  field={f}
                  value={vitals[f.key]}
                  onChange={(val) => setVitals((prev) => ({ ...prev, [f.key]: val }))}
                />
              ))}
            </div>

            {/* Mood Selector */}
            <div className="health-mood-section">
              <label className="health-section-label">
                <Smile size={13} />
                How are you feeling today?
              </label>
              <div className="health-mood-grid">
                {MOODS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    className={`health-mood-btn ${
                      vitals.mood === m.key ? 'active' : ''
                    }`}
                    onClick={() =>
                      setVitals((prev) => ({
                        ...prev,
                        mood: prev.mood === m.key ? '' : m.key,
                      }))
                    }
                    style={{
                      '--mood-color': m.color,
                    }}
                  >
                    <span className="health-mood-emoji">{m.emoji}</span>
                    <span className="health-mood-label">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="health-notes-section">
              <label className="health-section-label">
                <Info size={13} />
                Notes <span style={{ opacity: 0.6 }}>(optional)</span>
              </label>
              <textarea
                value={vitals.notes || ''}
                onChange={(e) =>
                  setVitals((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows="3"
                maxLength={500}
                placeholder="Anything noteworthy about today? e.g., feeling stressed, exercised more, skipped breakfast…"
                className="health-notes-input"
              />
              <div className="health-notes-footer">
                <span>{(vitals.notes || '').length}/500</span>
              </div>
            </div>

            {/* Message */}
            {message.text && (
              <div className={`health-alert health-alert-${message.type}`}>
                {message.type === 'success' ? (
                  <CheckCircle2 size={15} />
                ) : (
                  <AlertCircle size={15} />
                )}
                {message.text}
              </div>
            )}

            {/* Actions */}
            <div className="health-form-actions">
              <button
                type="button"
                className="health-btn-secondary"
                onClick={loadAll}
                disabled={saving}
              >
                <RefreshCw size={14} />
                Reset
              </button>
              <button
                type="submit"
                className="health-btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Save Vitals
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* =========================================
          TRENDS + BMI
      ========================================= */}
      <div className="health-bottom-grid">
        {/* 7-day trend chart */}
        <section className="health-card">
          <div className="health-card-header">
            <div className="health-card-icon">
              <TrendingUp size={16} />
            </div>
            <div>
              <h3>7-Day Trend</h3>
              <p>Your steps over the week</p>
            </div>
          </div>
          <MiniStepsChart data={recentVitals} />
        </section>

        {/* BMI Card */}
        <section className="health-card">
          <div className="health-card-header">
            <div className="health-card-icon">
              <Target size={16} />
            </div>
            <div>
              <h3>Body Mass Index</h3>
              <p>Based on your weight & profile height</p>
            </div>
          </div>

          {bmi ? (
            <div className="bmi-display">
              <div className={`bmi-value bmi-${bmi.color}`}>
                <span className="bmi-number">{bmi.value}</span>
                <span className="bmi-unit">kg/m²</span>
              </div>
              <div className={`bmi-category bmi-cat-${bmi.color}`}>
                {bmi.category}
              </div>
              <div className="bmi-scale-track">
                <div
                  className="bmi-scale-marker"
                  style={{
                    left: `${Math.min(Math.max((bmi.value / 40) * 100, 0), 100)}%`,
                  }}
                />
              </div>
              <div className="bmi-scale-labels">
                <span>Under</span>
                <span>Normal</span>
                <span>Over</span>
                <span>Obese</span>
              </div>
            </div>
          ) : (
            <div className="health-empty-small">
              <Info size={16} />
              <p>
                Add your <strong>height</strong> in profile settings to see your BMI.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* =========================================
          30-DAY HISTORY
      ========================================= */}
      <section className="health-card">
        <div className="health-card-header">
          <div className="health-card-icon">
            <BarChart3 size={16} />
          </div>
          <div>
            <h3>Recent History</h3>
            <p>Your last 30 days</p>
          </div>
          <span className="health-history-count">
            {recentVitals.length} entries
          </span>
        </div>

        {historyLoading ? (
          <div className="health-loading">
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <p>Loading history…</p>
          </div>
        ) : recentVitals.length === 0 ? (
          <div className="health-empty-small">
            <Calendar size={16} />
            <p>No history yet. Log your vitals to see trends.</p>
          </div>
        ) : (
          <div className="health-history-list">
            {recentVitals.map((v) => (
              <HistoryRow key={v.id} vitals={v} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

/* =========================================
   VITAL INPUT — Reusable, with status
========================================= */
function VitalInput({ field, value, onChange }) {
  const Icon = field.icon
  const numValue = Number(value)
  const hasValue = value !== '' && value !== null && value !== undefined

  const status = getVitalStatus(field, numValue, hasValue)

  return (
    <div className={`health-vital-input health-vital-${field.colorName} ${status.cls}`}>
      <div className="health-vital-header">
        <label className="health-vital-label">
          <Icon size={14} style={{ color: field.color }} />
          <span>{field.label}</span>
        </label>
        {status.text && (
          <span className={`health-vital-status ${status.cls}`}>
            {status.text}
          </span>
        )}
      </div>

      <div className="health-vital-input-wrap">
        <input
          type="number"
          step="0.1"
          min={field.min}
          max={field.max}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="health-vital-field"
        />
        <span className="health-vital-unit">{field.unit}</span>
      </div>

      {field.goal && hasValue && (
        <div className="health-vital-progress">
          <div
            className={`health-vital-progress-bar health-progress-${field.colorName}`}
            style={{
              width: `${Math.min((numValue / field.goal) * 100, 100)}%`,
            }}
          />
        </div>
      )}

      {field.goal && (
        <div className="health-vital-goal">
          <Target size={10} />
          Goal: {field.goal.toLocaleString()} {field.unit}
        </div>
      )}
    </div>
  )
}

/* =========================================
   MINI STEPS CHART
========================================= */
function MiniStepsChart({ data }) {
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
      isToday: i === 0,
    })
  }

  const max = Math.max(...days.map((d) => d.steps), 5000)

  return (
    <div className="mini-chart">
      {days.map((d, i) => (
        <div key={i} className="mini-chart-col">
          <div className="mini-chart-bar-wrap">
            {d.steps > 0 ? (
              <div
                className={`mini-chart-bar ${d.isToday ? 'today' : ''}`}
                style={{ height: `${Math.max((d.steps / max) * 100, 4)}%` }}
                title={`${d.steps.toLocaleString()} steps`}
              >
                <span className="mini-chart-tooltip">
                  <strong>{d.steps.toLocaleString()}</strong> steps
                </span>
              </div>
            ) : (
              <div className="mini-chart-bar-empty" />
            )}
          </div>
          <span className={`mini-chart-label ${d.isToday ? 'today' : ''}`}>
            {d.day}
          </span>
        </div>
      ))}
    </div>
  )
}

/* =========================================
   HISTORY ROW
========================================= */
function HistoryRow({ vitals }) {
  const date = new Date(vitals.date)
  const today = new Date().toISOString().split('T')[0]
  const isToday = vitals.date === today

  return (
    <div className={`health-history-row ${isToday ? 'today' : ''}`}>
      <div className="health-history-date">
        <strong>
          {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </strong>
        <small>
          {isToday
            ? 'Today'
            : date.toLocaleDateString('en-GB', { weekday: 'short' })}
        </small>
      </div>

      <div className="health-history-vitals">
        {vitals.heart_rate && (
          <span className="health-history-vital hr">
            <Heart size={10} /> {vitals.heart_rate}
          </span>
        )}
        {vitals.sleep && (
          <span className="health-history-vital sleep">
            <Moon size={10} /> {vitals.sleep}h
          </span>
        )}
        {vitals.steps && (
          <span className="health-history-vital steps">
            <Footprints size={10} /> {vitals.steps.toLocaleString()}
          </span>
        )}
        {vitals.calories && (
          <span className="health-history-vital cal">
            <Flame size={10} /> {vitals.calories}
          </span>
        )}
        {vitals.water && (
          <span className="health-history-vital water">
            <Droplet size={10} /> {vitals.water}L
          </span>
        )}
        {vitals.mood && (
          <span className="health-history-vital mood">
            {MOODS.find((m) => m.key === vitals.mood)?.emoji || '🙂'}
          </span>
        )}
      </div>
    </div>
  )
}

/* =========================================
   HELPERS
========================================= */
function getVitalStatus(field, value, hasValue) {
  if (!hasValue) return { text: '', cls: '' }
  if (!field.ranges) return { text: '', cls: '' }

  const { normalMin, normalMax } = field.ranges
  if (value < normalMin) return { text: 'Low', cls: 'status-warn' }
  if (value > normalMax) return { text: 'High', cls: 'status-danger' }
  return { text: 'Normal', cls: 'status-good' }
}

function computeHealthScore(v) {
  let score = 0
  let max = 0

  max += 25
  if (v.heart_rate) {
    const hr = Number(v.heart_rate)
    if (hr >= 60 && hr <= 100) score += 25
    else if (hr >= 50 && hr <= 110) score += 15
    else score += 5
  }

  max += 25
  if (v.sleep) {
    const s = Number(v.sleep)
    if (s >= 7 && s <= 9) score += 25
    else if (s >= 6 && s <= 10) score += 15
    else score += 5
  }

  max += 20
  if (v.steps) {
    const st = Number(v.steps)
    if (st >= 10000) score += 20
    else if (st >= 7000) score += 15
    else if (st >= 5000) score += 10
    else score += 5
  }

  max += 15
  if (v.water) {
    const w = Number(v.water)
    if (w >= 3) score += 15
    else if (w >= 2) score += 10
    else if (w >= 1) score += 5
  }

  max += 15
  if (v.mood) {
    const map = { great: 15, good: 12, okay: 8, bad: 4, terrible: 2 }
    score += map[v.mood] || 0
  }

  const pct = max > 0 ? Math.round((score / max) * 100) : 0
  let label = 'No data'
  let color = 'slate'
  if (pct >= 90) { label = 'Excellent'; color = 'emerald' }
  else if (pct >= 75) { label = 'Great'; color = 'green' }
  else if (pct >= 60) { label = 'Good'; color = 'lime' }
  else if (pct >= 40) { label = 'Fair'; color = 'amber' }
  else if (pct > 0) { label = 'Needs work'; color = 'red' }

  return { score: pct, label, color }
}

function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const min = Math.floor(seconds / 60)
  if (min < 60) return `${min}m ago`
  return `${Math.floor(min / 60)}h ago`
}