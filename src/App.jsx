import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { Heart } from 'lucide-react'
import AuthScreen from './pages/AuthScreen'
import Dashboard from './pages/Dashboard'
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!mounted) return
      setSession(session)
      if (session) {
        await loadProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId) {
    try {
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
    } catch (err) {
      console.error('Profile load failed:', err)
      setProfile({ full_name: 'User', role: 'user' })
    }
  }

  if (loading) return <LoadingScreen />
  if (!session) return <AuthScreen onAuth={loadProfile} />
  return <Dashboard session={session} profile={profile} />
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-logo">
        <Heart size={36} strokeWidth={2.2} />
      </div>
      <h2>SaviPulse</h2>
      <p>Loading your health dashboard…</p>
      <div className="loading-bar">
        <div className="loading-bar-fill" />
      </div>
    </div>
  )
}