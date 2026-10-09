import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import '../styles/DailyCare.css'
import {
  Stethoscope, Sparkles, Heart, Moon, Footprints, Flame,
  Droplet, Smile, Activity, CheckCircle2, AlertCircle,
  Info, Target, TrendingUp, Loader2, RefreshCw, Calendar,
  Award, Zap, Brain, Salad, Shield, Clock, ChevronRight,
  Sun, Coffee, Dumbbell, Apple, Waves, Wind, BookOpen,
  ThumbsUp, TrendingDown, BarChart3, Eye,
} from 'lucide-react'

/* =========================================
   MOODS
========================================= */
const MOODS = {
  great: { emoji: '😄', label: 'Great', color: '#10b981', score: 100 },
  good: { emoji: '🙂', label: 'Good', color: '#34d399', score: 80 },
  okay: { emoji: '😐', label: 'Okay', color: '#fbbf24', score: 60 },
  bad: { emoji: '😕', label: 'Bad', color: '#f97316', score: 35 },
  terrible: { emoji: '😢', label: 'Terrible', color: '#ef4444', score: 15 },
}

export default function DailyCarePage({ user }) {
  const [vitals, setVitals] = useState(null)
  const [recentVitals, setRecentVitals] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadData()
  }, [user.id])

  async function loadData() {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const since = new Date()
      since.setDate(since.getDate() - 7)

      const [todayRes, recentRes] = await Promise.all([
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
          .order('date', { ascending: false }),
      ])

      setVitals(todayRes.data)
      setRecentVitals(recentRes.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  /* =========================================
     COMPUTED VALUES
  ========================================= */
  const careItems = useMemo(
    () => generateCareItems(vitals, recentVitals),
    [vitals, recentVitals]
  )

  const stats = useMemo(() => computeStats(vitals, recentVitals), [
    vitals,
    recentVitals,
  ])

  const overallMood = useMemo(
    () => getOverallMood(vitals, recentVitals),
    [vitals, recentVitals]
  )

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="daily-care-page">
      {/* =========================================
          HERO
      ========================================= */}
      <section className="daily-care-hero">
        <div className="daily-care-hero-glow" />
        <div className="daily-care-hero-content">
          <div className="daily-care-hero-badge">
            <span className="pulse-dot" />
            <Sparkles size={11} />
            AI-Powered Care
          </div>

          <h1>
            {greeting}
            <span>Here's your personalized care plan.</span>
          </h1>

          <p>
            Real-time health advice based on your vitals, mood, and daily
            patterns. Updated every time you log.
          </p>

          <button
            className="daily-care-refresh"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              size={13}
              style={refreshing ? { animation: 'spin 1s linear infinite' } : {}}
            />
            {refreshing ? 'Refreshing…' : 'Refresh Care Plan'}
          </button>
        </div>
      </section>

      {/* =========================================
          OVERVIEW STATS
      ========================================= */}
      <section className="daily-care-stats">
        <StatBox
          icon={CheckCircle2}
          label="Vitals Logged"
          value={`${stats.loggedToday}/6`}
          color="green"
          sub={stats.loggedToday >= 5 ? 'Complete!' : `${6 - stats.loggedToday} remaining`}
        />
        <StatBox
          icon={Flame}
          label="Current Streak"
          value={stats.streak}
          color="orange"
          sub={stats.streak === 0 ? 'Start today' : stats.streak === 1 ? 'Just started' : 'Keep going!'}
        />
        <StatBox
          icon={Smile}
          label="Overall Mood"
          value={overallMood.label}
          color={overallMood.colorName}
          sub={vitals?.mood ? 'Logged today' : 'Not logged'}
        />
        <StatBox
          icon={Activity}
          label="Health Score"
          value={stats.healthScore}
          color={stats.healthScore >= 75 ? 'green' : stats.healthScore >= 50 ? 'amber' : 'red'}
          sub={getScoreLabel(stats.healthScore)}
        />
      </section>

      {/* =========================================
          PRIORITY ALERTS
      ========================================= */}
      {careItems.high.length > 0 && (
        <section className="daily-care-alerts">
          <div className="daily-care-alerts-header">
            <AlertCircle size={16} />
            <div>
              <h3>Needs Attention</h3>
              <p>{careItems.high.length} item{careItems.high.length > 1 ? 's' : ''} require your focus</p>
            </div>
          </div>

          <div className="daily-care-alerts-list">
            {careItems.high.map((item, i) => (
              <CareItem key={i} item={item} priority="high" />
            ))}
          </div>
        </section>
      )}

      {/* =========================================
          SUGGESTIONS
      ========================================= */}
      {careItems.medium.length > 0 && (
        <section className="daily-care-suggestions">
          <div className="daily-care-section-header">
            <div className="daily-care-section-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#d97706' }}>
              <Target size={16} />
            </div>
            <div>
              <h3>Suggestions</h3>
              <p>Small improvements worth trying</p>
            </div>
          </div>

          <div className="daily-care-suggestions-list">
            {careItems.medium.map((item, i) => (
              <CareItem key={i} item={item} priority="medium" />
            ))}
          </div>
        </section>
      )}

      {/* =========================================
          WINS (Positive Feedback)
      ========================================= */}
      {careItems.low.length > 0 && (
        <section className="daily-care-wins">
          <div className="daily-care-section-header">
            <div className="daily-care-section-icon" style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', color: '#059669' }}>
              <ThumbsUp size={16} />
            </div>
            <div>
              <h3>You're Doing Great!</h3>
              <p>Celebrate these wins</p>
            </div>
          </div>

          <div className="daily-care-wins-list">
            {careItems.low.map((item, i) => (
              <CareItem key={i} item={item} priority="low" />
            ))}
          </div>
        </section>
      )}

      {/* =========================================
          ROUTINE RECOMMENDATIONS
      ========================================= */}
      <section className="daily-care-routine">
        <div className="daily-care-section-header">
          <div className="daily-care-section-icon" style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', color: '#8b5cf6' }}>
            <Clock size={16} />
          </div>
          <div>
            <h3>Suggested Daily Routine</h3>
            <p>Simple habits for a healthy day</p>
          </div>
          <span className="daily-care-section-badge">AI</span>
        </div>

        <div className="daily-care-routine-grid">
          <RoutineCard
            icon={Sun}
            time="Morning"
            title="Wake-up Routine"
            items={[
              'Drink 1 glass of water',
              '10 min stretching or walk',
              'Eat a balanced breakfast',
              'Log your sleep hours',
            ]}
            color="orange"
          />
          <RoutineCard
            icon={Coffee}
            time="Midday"
            title="Energy Boost"
            items={[
              'Take a 5-min walk every 2h',
              'Hydrate — 1L by noon',
              'Eat fruits or nuts as snack',
              'Practice 4-7-8 breathing',
            ]}
            color="amber"
          />
          <RoutineCard
            icon={Dumbbell}
            time="Evening"
            title="Stay Active"
            items={[
              'Log your daily steps',
              '30 min exercise or walk',
              'Eat a light dinner',
              'Avoid screens 30 min before bed',
            ]}
            color="blue"
          />
          <RoutineCard
            icon={Moon}
            time="Night"
            title="Wind Down"
            items={[
              'Log your mood & notes',
              'Read or meditate',
              'Prepare tomorrow\'s plan',
              'Target 7-8h of sleep',
            ]}
            color="purple"
          />
        </div>
      </section>

      {/* =========================================
          RECENT ACTIVITY
      ========================================= */}
      {recentVitals.length > 0 && (
        <section className="daily-care-recent">
          <div className="daily-care-section-header">
            <div className="daily-care-section-icon" style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', color: '#3b82f6' }}>
              <BarChart3 size={16} />
            </div>
            <div>
              <h3>Recent Activity</h3>
              <p>Your last 7 days at a glance</p>
            </div>
          </div>

          <div className="daily-care-recent-list">
            {recentVitals.slice(0, 7).map((v) => (
              <RecentRow key={v.id} vitals={v} />
            ))}
          </div>
        </section>
      )}

      {/* =========================================
          FOOTER NOTE
      ========================================= */}
      <div className="daily-care-footer-note">
        <Info size={12} />
        These tips are personalized based on your data. For medical concerns,
        always consult a qualified doctor.
      </div>
    </div>
  )
}

/* =========================================
   STAT BOX
========================================= */
function StatBox({ icon: Icon, label, value, color, sub }) {
  return (
    <div className={`daily-care-stat daily-care-stat-${color}`}>
      <div className="daily-care-stat-icon">
        <Icon size={18} />
      </div>
      <div className="daily-care-stat-body">
        <span className="daily-care-stat-label">{label}</span>
        <strong className="daily-care-stat-value">{value}</strong>
        {sub && <small className="daily-care-stat-sub">{sub}</small>}
      </div>
    </div>
  )
}

/* =========================================
   CARE ITEM
========================================= */
function CareItem({ item, priority }) {
  const Icon = item.icon

  return (
    <div className={`care-item care-item-${priority}`}>
      <div
        className="care-item-icon"
        style={{ background: item.bgColor, color: item.color }}
      >
        <Icon size={18} />
      </div>

      <div className="care-item-body">
        <div className="care-item-header">
          <strong>{item.title}</strong>
          <span className={`care-item-badge care-badge-${priority}`}>
            {priority === 'high' && 'Action'}
            {priority === 'medium' && 'Suggestion'}
            {priority === 'low' && 'Great'}
          </span>
        </div>

        <p>{item.text}</p>

        {item.action && (
          <div className="care-item-action">
            <Target size={11} />
            {item.action}
          </div>
        )}
      </div>
    </div>
  )
}

/* =========================================
   ROUTINE CARD
========================================= */
function RoutineCard({ icon: Icon, time, title, items, color }) {
  return (
    <div className={`routine-card routine-${color}`}>
      <div className="routine-header">
        <div className="routine-icon">
          <Icon size={16} />
        </div>
        <div>
          <span className="routine-time">{time}</span>
          <h4>{title}</h4>
        </div>
      </div>

      <ul className="routine-items">
        {items.map((item, i) => (
          <li key={i}>
            <CheckCircle2 size={11} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* =========================================
   RECENT ROW
========================================= */
function RecentRow({ vitals }) {
  const date = new Date(vitals.date)
  const today = new Date().toISOString().split('T')[0]
  const isToday = vitals.date === today
  const mood = MOODS[vitals.mood]

  return (
    <div className={`recent-row ${isToday ? 'today' : ''}`}>
      <div className="recent-row-date">
        <strong>
          {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </strong>
        <small>
          {isToday
            ? 'Today'
            : date.toLocaleDateString('en-GB', { weekday: 'short' })}
        </small>
      </div>

      <div className="recent-row-vitals">
        {vitals.heart_rate && (
          <span className="recent-vital hr">
            <Heart size={10} /> {vitals.heart_rate}
          </span>
        )}
        {vitals.sleep && (
          <span className="recent-vital sleep">
            <Moon size={10} /> {vitals.sleep}h
          </span>
        )}
        {vitals.steps && (
          <span className="recent-vital steps">
            <Footprints size={10} /> {vitals.steps.toLocaleString()}
          </span>
        )}
        {vitals.calories && (
          <span className="recent-vital cal">
            <Flame size={10} /> {vitals.calories}
          </span>
        )}
        {vitals.water && (
          <span className="recent-vital water">
            <Droplet size={10} /> {vitals.water}L
          </span>
        )}
        {mood && (
          <span className="recent-vital mood">{mood.emoji}</span>
        )}
      </div>
    </div>
  )
}

/* =========================================
   GENERATE CARE ITEMS (Priority-based)
========================================= */
function generateCareItems(vitals, recentVitals) {
  const high = []
  const medium = []
  const low = []

  if (!vitals) {
    return {
      high: [],
      medium: [
        {
          icon: Activity,
          color: '#94a3b8',
          bgColor: '#f1f5f9',
          title: 'Start Logging Your Vitals',
          text: 'Log your vitals to get personalized daily care. It takes just 30 seconds.',
          action: 'Log now',
        },
      ],
      low: [],
    }
  }

  const hr = Number(vitals.heart_rate)
  const sleep = Number(vitals.sleep)
  const steps = Number(vitals.steps)
  const water = Number(vitals.water)
  const mood = vitals.mood

  /* ---------- HEART RATE ---------- */
  if (hr) {
    if (hr > 100) {
      high.push({
        icon: Heart,
        color: '#dc2626',
        bgColor: '#fee2e2',
        title: 'Heart Rate Elevated',
        text: `Your heart rate of ${hr} BPM is above the normal range (60-100). Rest, hydrate, avoid caffeine and stress. If this continues or you feel chest pain, shortness of breath, or dizziness — consult a doctor immediately.`,
        action: 'Monitor for next 2 hours',
      })
    } else if (hr < 50) {
      medium.push({
        icon: Heart,
        color: '#d97706',
        bgColor: '#fef3c7',
        title: 'Low Heart Rate',
        text: `Your heart rate is ${hr} BPM — lower than the typical 60-100 range. Athletes often have lower resting rates. If you feel dizzy, tired, or faint, consult a doctor.`,
        action: 'Note any unusual symptoms',
      })
    } else {
      low.push({
        icon: Heart,
        color: '#10b981',
        bgColor: '#d1fae5',
        title: 'Heart Rate Looks Great',
        text: `${hr} BPM — perfectly within the healthy range. Your cardiovascular system is functioning well. Keep up your active habits!`,
      })
    }
  }

  /* ---------- SLEEP ---------- */
  if (sleep) {
    if (sleep < 6) {
      high.push({
        icon: Moon,
        color: '#8b5cf6',
        bgColor: '#ede9fe',
        title: 'You Need More Sleep',
        text: `Only ${sleep}h last night — adults need 7-9 hours. Chronic short sleep weakens immunity, memory, and mood. Try going to bed 1 hour earlier tonight and avoid screens 30 min before bed.`,
        action: 'Target 7-8h tonight',
      })
    } else if (sleep >= 7 && sleep <= 9) {
      low.push({
        icon: Moon,
        color: '#8b5cf6',
        bgColor: '#ede9fe',
        title: 'Excellent Sleep',
        text: `${sleep}h of quality sleep — exactly what your brain and body need. You're likely to feel focused and energized today.`,
      })
    } else if (sleep > 9) {
      medium.push({
        icon: Moon,
        color: '#f59e0b',
        bgColor: '#fef3c7',
        title: 'Sleeping Longer Than Usual',
        text: `${sleep}h is above the recommended range. Oversleeping occasionally is fine but regular long sleep can indicate fatigue or other issues. Check if you feel truly rested.`,
      })
    }
  }

  /* ---------- STEPS ---------- */
  if (steps) {
    if (steps >= 10000) {
      low.push({
        icon: Footprints,
        color: '#10b981',
        bgColor: '#d1fae5',
        title: 'Daily Step Goal Achieved!',
        text: `${steps.toLocaleString()} steps — you crushed your 10,000 goal! Regular walking reduces heart disease risk, strengthens bones, and boosts mood.`,
      })
    } else if (steps >= 5000) {
      const rem = 10000 - steps
      medium.push({
        icon: Footprints,
        color: '#10b981',
        bgColor: '#ecfdf5',
        title: 'Almost at Your Step Goal',
        text: `${steps.toLocaleString()} steps — nice progress! Just ${rem.toLocaleString()} more to reach 10,000. A 15-minute walk adds about 2,000 steps.`,
        action: `Walk ${rem.toLocaleString()} more steps`,
      })
    } else {
      high.push({
        icon: Footprints,
        color: '#f97316',
        bgColor: '#ffedd5',
        title: 'Time to Move More',
        text: `Only ${steps.toLocaleString()} steps so far. Sedentary days increase fatigue and long-term health risks. Even a 10-minute walk improves energy, mood, and heart health.`,
        action: 'Take a 10-min walk now',
      })
    }
  }

  /* ---------- WATER ---------- */
  if (water) {
    if (water < 1.5) {
      high.push({
        icon: Droplet,
        color: '#3b82f6',
        bgColor: '#dbeafe',
        title: 'Drink More Water',
        text: `Only ${water}L today — you're likely dehydrated. Even mild dehydration causes fatigue, headaches, and poor concentration. Drink a glass right now and aim for 2-3L by day's end.`,
        action: 'Drink 1-2 glasses now',
      })
    } else if (water < 3) {
      const rem = (3 - water).toFixed(1)
      medium.push({
        icon: Droplet,
        color: '#3b82f6',
        bgColor: '#dbeafe',
        title: 'Hydration on Track',
        text: `${water}L logged — good progress! Just ${rem}L more to hit your 3L goal. Keep a water bottle on your desk to remind yourself.`,
        action: `Drink ${rem}L more`,
      })
    } else {
      low.push({
        icon: Droplet,
        color: '#10b981',
        bgColor: '#d1fae5',
        title: 'Hydration Champion',
        text: `${water}L — excellent! Your cells, skin, joints, and brain are all benefiting. Water supports nearly every body function.`,
      })
    }
  }

  /* ---------- MOOD ---------- */
  const moodMap = {
    great: {
      icon: Smile,
      color: '#10b981',
      bgColor: '#d1fae5',
      title: 'Fantastic Mood!',
      text: 'Feeling great today — this positive state boosts immunity, heart health, and productivity. Take a moment to note what made today special so you can repeat it.',
      priority: 'low',
    },
    good: {
      icon: Smile,
      color: '#10b981',
      bgColor: '#ecfdf5',
      title: 'Good Mood',
      text: 'Feeling good is a win! Reflect on what contributed — a walk, good food, or quality time. Small habits create long-term wellbeing.',
      priority: 'low',
    },
    okay: {
      icon: Smile,
      color: '#f59e0b',
      bgColor: '#fef3c7',
      title: 'Neutral Day',
      text: 'Okay days are completely normal. Quick mood boosters: 10-min outdoor walk, favorite music, quick chat with a friend, or a warm cup of tea.',
      priority: 'medium',
    },
    bad: {
      icon: Smile,
      color: '#f97316',
      bgColor: '#ffedd5',
      title: 'Rough Day — Take Care',
      text: 'Sorry you\'re feeling off. Try the 4-7-8 breathing method (inhale 4s, hold 7s, exhale 8s) for 4 cycles. A warm drink, gentle walk, or talking to someone you trust can help. Tomorrow is a fresh start.',
      priority: 'high',
      action: 'Try 4-7-8 breathing exercise',
    },
    terrible: {
      icon: Smile,
      color: '#dc2626',
      bgColor: '#fee2e2',
      title: 'Please Be Kind to Yourself',
      text: 'It sounds like a really tough day. Be gentle with yourself — rest, hydrate, and reach out to someone who cares. If these feelings persist for more than 2 weeks, please talk to a mental health professional.',
      priority: 'high',
      action: 'Reach out to someone you trust',
    },
  }

  if (mood && moodMap[mood]) {
    const m = moodMap[mood]
    const item = {
      icon: m.icon,
      color: m.color,
      bgColor: m.bgColor,
      title: m.title,
      text: m.text,
      action: m.action,
    }
    if (m.priority === 'high') high.push(item)
    else if (m.priority === 'medium') medium.push(item)
    else low.push(item)
  }

  /* ---------- CONSISTENCY ---------- */
  const logged = [
    vitals.heart_rate,
    vitals.sleep,
    vitals.steps,
    vitals.calories,
    vitals.water,
    vitals.mood,
  ].filter((v) => v !== '' && v !== null && v !== undefined).length

  if (logged > 0 && logged < 4) {
    medium.push({
      icon: Target,
      color: '#8b5cf6',
      bgColor: '#f5f3ff',
      title: 'Complete Your Health Log',
      text: `You've logged ${logged} of 6 vitals today. The more you log, the more accurate your health score and personalized insights become.`,
      action: 'Log remaining vitals',
    })
  }

  return { high, medium, low }
}

/* =========================================
   HELPERS
========================================= */
function computeStats(vitals, recentVitals) {
  const loggedToday = vitals
    ? [
        vitals.heart_rate,
        vitals.sleep,
        vitals.steps,
        vitals.calories,
        vitals.water,
        vitals.mood,
      ].filter((v) => v !== '' && v !== null && v !== undefined).length
    : 0

  const streak = computeStreak(recentVitals)
  const healthScore = computeHealthScore(vitals)

  return { loggedToday, streak, healthScore }
}

function computeStreak(recentVitals) {
  if (!recentVitals || recentVitals.length === 0) return 0

  const today = new Date().toISOString().split('T')[0]
  let streak = 0
  let checkDate = new Date()

  for (let i = 0; i < 365; i++) {
    const dayStr = checkDate.toISOString().split('T')[0]
    const hasEntry = recentVitals.some((v) => v.date === dayStr)

    if (hasEntry) {
      streak++
    } else if (dayStr === today) {
      // Don't break streak for today
    } else {
      break
    }

    checkDate.setDate(checkDate.getDate() - 1)
  }

  return streak
}

function computeHealthScore(v) {
  if (!v) return 0

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

  return max > 0 ? Math.round((score / max) * 100) : 0
}

function getScoreLabel(score) {
  if (score === 0) return 'No data'
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Great'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs work'
}

function getOverallMood(vitals, recentVitals) {
  const m = vitals?.mood
  if (m === 'great') return { label: 'Great', color: '#10b981', colorName: 'green' }
  if (m === 'good') return { label: 'Good', color: '#34d399', colorName: 'green' }
  if (m === 'okay') return { label: 'Okay', color: '#f59e0b', colorName: 'amber' }
  if (m === 'bad') return { label: 'Low', color: '#f97316', colorName: 'orange' }
  if (m === 'terrible') return { label: 'Rough', color: '#dc2626', colorName: 'red' }

  if (recentVitals.length === 0) return { label: 'No data', color: '#94a3b8', colorName: 'slate' }
  return { label: 'Tracking', color: '#8b5cf6', colorName: 'purple' }
}