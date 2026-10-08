import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { User as UserIcon, Shield, LogOut, ChevronRight } from 'lucide-react'

export default function SettingsPage({ user, profile, displayName, onLogout }) {
  const [fullName, setFullName] = useState(profile?.full_name || displayName)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (error) setMessage(`❌ ${error.message}`)
    else {
      setMessage('✅ Profile updated!')
      setTimeout(() => setMessage(''), 3000)
    }
    setSaving(false)
  }

  return (
    <>
      <section className="info-card">
        <div className="info-card-header">
          <div className="info-icon"><UserIcon size={20} /></div>
          <div><h3>Profile</h3><p>Your personal information</p></div>
        </div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>
          {message && (
            <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-error'}`} style={{ marginTop: 14 }}>
              {message}
            </div>
          )}
          <button type="submit" className="btn-auth" disabled={saving}
            style={{ marginTop: 16, width: 'auto', padding: '0 24px' }}>
            {saving ? <><span className="spinner" />Saving…</> : <>Save Changes <ChevronRight size={15} /></>}
          </button>
        </form>
      </section>

      <section className="info-card" style={{ marginTop: 22 }}>
        <div className="info-card-header">
          <div className="info-icon"><Shield size={20} /></div>
          <div><h3>Account</h3><p>Session management</p></div>
        </div>
        <button className="btn-logout" onClick={onLogout}>
          <LogOut size={15} /> Logout from this device
        </button>
      </section>
    </>
  )
}