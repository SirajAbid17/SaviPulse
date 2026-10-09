import { useEffect, useState, useRef } from 'react'
import { supabase, uploadAvatar, deleteAvatar } from '../lib/supabase'
import ConfirmModal from '../components/ConfirmModal'
import {
  User as UserIcon, Shield, LogOut, ChevronRight, Mail, Ruler,
  Calendar, Scale, Bell, Trash2, Save,
  CheckCircle2, AlertCircle, Loader2, Lock,
  FileText, Activity, Sparkles, Heart, Info, Eye, EyeOff,
  Crown, KeyRound, ShieldCheck, User, Upload, X,
} from 'lucide-react'
import '../styles/settings.css'

export default function SettingsPage({ user, profile, displayName, onLogout }) {
 
  const [freshProfile, setFreshProfile] = useState(profile)
  const [profileLoaded, setProfileLoaded] = useState(false)

  useEffect(() => {
    loadFresh()
  }, [user.id])

  async function loadFresh() {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (data) setFreshProfile(data)
    } catch (err) {
      console.warn('Profile load failed:', err)
    } finally {
      setProfileLoaded(true)
    }
  }


  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

 
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [gender, setGender] = useState('')
  const [dob, setDob] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [notifications, setNotifications] = useState(true)
  const [emailUpdates, setEmailUpdates] = useState(true)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef(null)

 
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
    if (!profileLoaded) return
    const p = freshProfile
    if (!p) return
    setFullName(p.full_name || displayName || '')
    setBio(p.bio || '')
    setGender(p.gender || '')
    setDob(p.dob || '')
    setHeight(p.height ?? '')
    setWeight(p.weight ?? '')
    setBloodGroup(p.blood_group || '')
    setNotifications(p.notifications_enabled ?? true)
    setEmailUpdates(p.email_updates ?? true)
    setAvatarUrl(p.avatar_url || '')
  }, [profileLoaded, freshProfile, displayName])

  const isAdmin = freshProfile?.role === 'admin'

 
  function flash(type, text, ms = 3500) {
    setMessage({ type, text })
    if (ms) setTimeout(() => setMessage({ type: '', text: '' }), ms)
  }

  const initials = (fullName || displayName || 'U')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')

 
  async function handleSaveProfile(e) {
    e?.preventDefault()
    if (!fullName.trim()) {
      flash('error', 'Name cannot be empty.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          bio: bio.trim(),
          gender,
          dob: dob || null,
          height: height ? Number(height) : null,
          weight: weight ? Number(weight) : null,
          blood_group: bloodGroup,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      if (error) throw error
      flash('success', 'Profile updated successfully!')
      await loadFresh()
    } catch (err) {
      console.error(err)
      flash('error', err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleSavePreferences() {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          notifications_enabled: notifications,
          email_updates: emailUpdates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      if (error) throw error
      flash('success', 'Preferences saved!')
      await loadFresh()
    } catch (err) {
      flash('error', err.message || 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

 
  async function handleAvatarSelect(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      openModal({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select an image file (JPG, PNG, WebP or GIF).',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: closeModal,
        onCancel: closeModal,
      })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      openModal({
        type: 'warning',
        title: 'File Too Large',
        message: 'Image must be smaller than 5 MB.',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: closeModal,
        onCancel: closeModal,
      })
      return
    }

    setAvatarUploading(true)
    try {
      const url = await uploadAvatar(user.id, file)

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (error) throw error

      setAvatarUrl(url)
      flash('success', 'Avatar updated!')
      await loadFresh()
    } catch (err) {
      console.error('Avatar upload error:', err)
      openModal({
        type: 'error',
        title: 'Upload Failed',
        message: err.message || 'Avatar upload failed.',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: closeModal,
        onCancel: closeModal,
      })
    } finally {
      setAvatarUploading(false)
    }
  }

  function handleAvatarRemove() {
    openModal({
      type: 'danger',
      title: 'Remove Avatar?',
      message: 'Your current avatar will be permanently deleted.',
      confirmText: 'Remove',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setModal((m) => ({ ...m, loading: true }))
        setAvatarUploading(true)
        try {
          await deleteAvatar(user.id)

          const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: null, updated_at: new Date().toISOString() })
            .eq('id', user.id)
          if (error) throw error

          setAvatarUrl('')
          flash('success', 'Avatar removed.')
          await loadFresh()
          closeModal()
        } catch (err) {
          openModal({
            type: 'error',
            title: 'Remove Failed',
            message: err.message || 'Failed to remove avatar.',
            confirmText: 'OK',
            showCancel: false,
            onConfirm: closeModal,
            onCancel: closeModal,
          })
        } finally {
          setAvatarUploading(false)
        }
      },
      onCancel: closeModal,
    })
  }

  
  async function handleChangePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

 
  function handleDeleteAccount() {
    openModal({
      type: 'danger',
      title: 'Delete Account?',
      message:
        'This will permanently delete your account and ALL associated data. This action CANNOT be undone.',
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        openModal({
          type: 'error',
          title: 'Final Confirmation',
          message:
            'Are you absolutely sure? This is your last chance to cancel.',
          confirmText: 'Delete Forever',
          cancelText: 'Cancel',
          onConfirm: performDeleteAccount,
          onCancel: closeModal,
        })
      },
      onCancel: closeModal,
    })
  }

  async function performDeleteAccount() {
    setModal((m) => ({ ...m, loading: true }))
    try {
      await supabase.from('vitals').delete().eq('user_id', user.id)
      await supabase.from('medical_records').delete().eq('user_id', user.id)
      await supabase.from('conversations').delete().eq('user_id', user.id)
      await supabase.from('reviews').delete().eq('user_id', user.id)
      await deleteAvatar(user.id)
      await supabase.from('profiles').delete().eq('id', user.id)
      await supabase.auth.signOut()
      closeModal()
    } catch (err) {
      openModal({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Failed to delete account.',
        confirmText: 'OK',
        showCancel: false,
        onConfirm: closeModal,
        onCancel: closeModal,
      })
    }
  }

  
  const bmi =
    height && weight
      ? (Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1)
      : null


  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon, desc: 'Personal info' },
    { id: 'health', label: 'Health', icon: Activity, desc: 'Health metrics' },
    { id: 'preferences', label: 'Preferences', icon: Bell, desc: 'App settings' },
    { id: 'security', label: 'Security', icon: Shield, desc: 'Account safety' },
  ]

  return (
    <div className="settings-page">
    
      <section className="settings-hero">
        <div className="settings-hero-bg" />
        <div className="settings-hero-content">
          <div className="settings-hero-left">
            <div className="settings-hero-icon">
              <Sparkles size={24} />
            </div>
            <div>
              <h2>Settings</h2>
              <p>Manage your account, health info, and preferences</p>
            </div>
          </div>
          <div className="settings-hero-badge">
            {isAdmin ? <Crown size={12} /> : <ShieldCheck size={12} />}
            {isAdmin ? 'Administrator' : 'Member'}
          </div>
        </div>
      </section>

    
      {message.text && (
        <div className={`settings-flash settings-flash-${message.type}`}>
          <div className="settings-flash-icon">
            {message.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : message.type === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <Info size={16} />
            )}
          </div>
          <span>{message.text}</span>
        </div>
      )}

    
      <div className="settings-tabs-wrap">
        <div className="settings-tabs">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                className={`settings-tab ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <div className="settings-tab-icon">
                  <Icon size={16} />
                </div>
                <div className="settings-tab-info">
                  <strong>{t.label}</strong>
                  <small>{t.desc}</small>
                </div>
              </button>
            )
          })}
        </div>
      </div>

    
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="settings-form">
         
          <section className="settings-avatar-card">
            <div className="settings-avatar-card-bg" />
            <div className="settings-avatar-card-content">
              <div className="settings-avatar-wrapper">
                <div className="settings-avatar-large">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="settings-avatar-img"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                  <span className="settings-avatar-ring" />
                </div>

                <input
                  type="file"
                  ref={avatarInputRef}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={handleAvatarSelect}
                />

               
                <div className="settings-avatar-actions">
                  <button
                    type="button"
                    className="settings-avatar-btn settings-avatar-btn-upload"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? (
                      <>
                        <Loader2
                          size={13}
                          style={{ animation: 'spin 1s linear infinite' }}
                        />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        {avatarUrl ? 'Change' : 'Upload'}
                      </>
                    )}
                  </button>

                  {avatarUrl && (
                    <button
                      type="button"
                      className="settings-avatar-btn settings-avatar-btn-remove"
                      onClick={handleAvatarRemove}
                      disabled={avatarUploading}
                      title="Remove avatar"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-avatar-info">
                <h3>{fullName || 'Your Name'}</h3>
                <p>
                  <Mail size={12} />
                  {user.email}
                </p>
                <div className="settings-avatar-tags">
                  <span className={`settings-role-tag ${isAdmin ? 'admin' : ''}`}>
                    {isAdmin ? <Crown size={10} /> : <User size={10} />}
                    {isAdmin ? 'Administrator' : 'Member'}
                  </span>
                  <span className="settings-status-tag">
                    <span className="settings-status-dot" />
                    Active
                  </span>
                </div>
              </div>
            </div>
          </section>

        
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon blue">
                <UserIcon size={18} />
              </div>
              <div>
                <h3>Basic Information</h3>
                <p>Your name, bio, and personal details</p>
              </div>
            </div>

            <div className="settings-grid">
              <div className="settings-field">
                <label>
                  <UserIcon size={11} /> Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  maxLength={80}
                  required
                />
              </div>

              <div className="settings-field">
                <label>
                  <Mail size={11} /> Email
                </label>
                <div className="settings-input-readonly">
                  <span>{user.email}</span>
                  <span className="settings-verified-badge">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                </div>
              </div>

              <div className="settings-field settings-field-full">
                <label>
                  <FileText size={11} /> Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us a little about yourself…"
                  rows={3}
                  maxLength={200}
                />
                <div className="settings-field-footer">
                  <span>Optional</span>
                  <span>{bio.length}/200</span>
                </div>
              </div>

              <div className="settings-field">
                <label>
                  <Calendar size={11} /> Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="settings-field">
                <label>
                  <UserIcon size={11} /> Gender
                </label>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </section>

          <div className="settings-save-bar">
            <button type="submit" className="settings-save-btn" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      )}

     
      {activeTab === 'health' && (
        <div className="settings-form">
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon rose">
                <Heart size={18} />
              </div>
              <div>
                <h3>Health Metrics</h3>
                <p>Used for BMI and personalized insights</p>
              </div>
            </div>

            {bmi ? (
              <div className="settings-bmi-card">
                <div className="settings-bmi-visual">
                  <div className="settings-bmi-circle">
                    <span className="settings-bmi-value">{bmi}</span>
                    <span className="settings-bmi-unit">kg/m²</span>
                  </div>
                </div>
                <div className="settings-bmi-info">
                  <strong>Your Body Mass Index</strong>
                  <p>
                    {bmi < 18.5
                      ? 'Underweight — consider a balanced diet'
                      : bmi < 25
                      ? 'Normal weight — great job!'
                      : bmi < 30
                      ? 'Overweight — a bit of exercise helps'
                      : 'Obese — consult a doctor for guidance'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="settings-empty-hint">
                <Info size={16} />
                <p>
                  Add your <strong>height</strong> and <strong>weight</strong> below to
                  see your BMI.
                </p>
              </div>
            )}

            <div className="settings-grid">
              <div className="settings-field">
                <label>
                  <Ruler size={11} /> Height (cm)
                </label>
                <input
                  type="number"
                  min={50}
                  max={250}
                  step="0.1"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="175"
                />
              </div>
              <div className="settings-field">
                <label>
                  <Scale size={11} /> Weight (kg)
                </label>
                <input
                  type="number"
                  min={10}
                  max={400}
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="70"
                />
              </div>
              <div className="settings-field settings-field-full">
                <label>
                  <Heart size={11} /> Blood Group
                </label>
                <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                  <option value="">Select…</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="settings-save-bar">
              <button
                type="button"
                className="settings-save-btn"
                onClick={handleSaveProfile}
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
                    Save Health Info
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

    
      {activeTab === 'preferences' && (
        <div className="settings-form">
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon amber">
                <Bell size={18} />
              </div>
              <div>
                <h3>Notifications</h3>
                <p>Choose what updates you receive</p>
              </div>
            </div>

            <div className="settings-toggle-list">
              <ToggleRow
                icon={Bell}
                title="In-app Notifications"
                text="Alerts for daily care, reminders, and app updates"
                checked={notifications}
                onChange={setNotifications}
              />
              <ToggleRow
                icon={Mail}
                title="Email Updates"
                text="Weekly health tips and product news"
                checked={emailUpdates}
                onChange={setEmailUpdates}
              />
            </div>

            <div className="settings-save-bar">
              <button
                type="button"
                className="settings-save-btn"
                onClick={handleSavePreferences}
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
                    Save Preferences
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}

     
      {activeTab === 'security' && (
        <div className="settings-form">
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon emerald">
                <Shield size={18} />
              </div>
              <div>
                <h3>Account & Security</h3>
                <p>Manage your login and security settings</p>
              </div>
            </div>

            <div className="settings-action-list">
              <button
                type="button"
                className="settings-action-row"
                onClick={() => setShowPasswordModal(true)}
              >
                <div className="settings-action-icon">
                  <KeyRound size={16} />
                </div>
                <div className="settings-action-body">
                  <strong>Change Password</strong>
                  <small>Update your account password</small>
                </div>
                <ChevronRight size={16} className="settings-action-arrow" />
              </button>

              <div className="settings-action-row settings-action-static">
                <div className="settings-action-icon">
                  <Mail size={16} />
                </div>
                <div className="settings-action-body">
                  <strong>Email Address</strong>
                  <small>{user.email}</small>
                </div>
                <span className="settings-verified-badge">
                  <CheckCircle2 size={10} /> Verified
                </span>
              </div>

              <div className="settings-action-row settings-action-static">
                <div className="settings-action-icon">
                  <Calendar size={16} />
                </div>
                <div className="settings-action-body">
                  <strong>Account Created</strong>
                  <small>
                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </small>
                </div>
              </div>
            </div>

            <button type="button" className="settings-logout-btn" onClick={onLogout}>
              <LogOut size={15} />
              Logout from this device
            </button>
          </section>

          <section className="settings-card settings-danger-card">
            <div className="settings-card-header">
              <div className="settings-card-icon red">
                <Trash2 size={18} />
              </div>
              <div>
                <h3>Danger Zone</h3>
                <p>Irreversible actions — proceed carefully</p>
              </div>
            </div>

            <div className="settings-danger-row">
              <div>
                <strong>Delete Account</strong>
                <small>Permanently delete your account and all associated data</small>
              </div>
              <button
                type="button"
                className="settings-danger-btn"
                onClick={handleDeleteAccount}
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </section>
        </div>
      )}

      
      {showPasswordModal && (
        <PasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSubmit={async (pwd) => {
            await handleChangePassword(pwd)
            setShowPasswordModal(false)
            flash('success', 'Password updated successfully!')
          }}
        />
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


function ToggleRow({ icon: Icon, title, text, checked, onChange }) {
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-icon">
        <Icon size={16} />
      </div>
      <div className="settings-toggle-body">
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
      <button
        type="button"
        className={`settings-switch ${checked ? 'on' : 'off'}`}
        onClick={() => onChange(!checked)}
        aria-checked={checked}
        role="switch"
      >
        <span className="settings-switch-thumb" />
      </button>
    </div>
  )
}


function PasswordModal({ onClose, onSubmit }) {
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [err, setErr] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (pwd.length < 6) {
      setErr('Password must be at least 6 characters.')
      return
    }
    if (pwd !== confirm) {
      setErr("Passwords don't match.")
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(pwd)
    } catch (error) {
      setErr(error.message || 'Failed to update password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <button className="settings-modal-close" onClick={onClose}>×</button>

        <div className="settings-modal-icon">
          <Lock size={24} />
        </div>
        <h3>Change Password</h3>
        <p>Enter a new password for your account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                placeholder="Enter new password"
                minLength={6}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPwd((s) => !s)}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <div className="input-wrap">
              <Lock size={16} className="input-icon" />
              <input
                type={showPwd ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter new password"
                minLength={6}
                required
              />
            </div>
          </div>

          {err && (
            <div className="alert alert-error" style={{ marginTop: 12 }}>
              <AlertCircle size={14} /> {err}
            </div>
          )}

          <div className="settings-modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Updating…
                </>
              ) : (
                <>
                  <Save size={14} />
                  Update
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}