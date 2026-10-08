import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  Heart, Mail, Lock, User as UserIcon, Eye, EyeOff,
  ChevronRight, CheckCircle2, AlertCircle,
} from 'lucide-react'

export default function AuthScreen({ onAuth }) {
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