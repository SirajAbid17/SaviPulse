import { useEffect, useState } from 'react'
import {
  AlertTriangle, CheckCircle2, Info, XCircle, Loader2, X,
} from 'lucide-react'
import "../styles/Scan.css";

export default function ConfirmModal({
  open,
  type = 'confirm',
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  showCancel = true,
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape' && !loading) onCancel?.()
      if (e.key === 'Enter' && !loading) onConfirm?.()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, loading, onConfirm, onCancel])

  if (!open) return null

  const config = {
    confirm: {
      icon: Info,
      iconBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      shadow: '0 12px 32px -8px rgba(59, 130, 246, 0.5)',
    },
    alert: {
      icon: Info,
      iconBg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
      shadow: '0 12px 32px -8px rgba(139, 92, 246, 0.5)',
    },
    info: {
      icon: Info,
      iconBg: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
      shadow: '0 12px 32px -8px rgba(14, 165, 233, 0.5)',
    },
    success: {
      icon: CheckCircle2,
      iconBg: 'linear-gradient(135deg, #10b981, #059669)',
      shadow: '0 12px 32px -8px rgba(16, 185, 129, 0.5)',
    },
    danger: {
      icon: AlertTriangle,
      iconBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
      shadow: '0 12px 32px -8px rgba(220, 38, 38, 0.5)',
    },
    error: {
      icon: XCircle,
      iconBg: 'linear-gradient(135deg, #ef4444, #b91c1c)',
      shadow: '0 12px 32px -8px rgba(220, 38, 38, 0.5)',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)',
      shadow: '0 12px 32px -8px rgba(217, 119, 6, 0.5)',
    },
  }

  const c = config[type] || config.confirm
  const Icon = c.icon

  function handleBackdrop(e) {
    if (e.target === e.currentTarget && !loading) onCancel?.()
  }

  return (
    <div
      className={`cm-overlay ${visible ? 'cm-visible' : ''}`}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
    >
      <div className={`cm-card cm-card-${type}`}>
        {!loading && (
          <button
            className="cm-close"
            onClick={onCancel}
            aria-label="Close"
            type="button"
          >
            <X size={16} />
          </button>
        )}

        <div
          className="cm-icon"
          style={{ background: c.iconBg, boxShadow: c.shadow }}
        >
          <Icon size={30} />
        </div>

        <h3 className="cm-title">{title}</h3>
        {message && <p className="cm-message">{message}</p>}

        <div className={`cm-actions ${!showCancel ? 'cm-single' : ''}`}>
          {showCancel && (
            <button
              type="button"
              className="cm-btn cm-btn-cancel"
              onClick={onCancel}
              disabled={loading}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            className={`cm-btn cm-btn-confirm cm-btn-${type}`}
            onClick={onConfirm}
            disabled={loading}
            style={{ background: c.iconBg, boxShadow: c.shadow }}
          >
            {loading ? (
              <>
                <Loader2
                  size={14}
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                Please wait…
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}