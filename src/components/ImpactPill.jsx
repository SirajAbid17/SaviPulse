import { useEffect, useState, useRef } from 'react'
import { Heart, Copy, Check, X, Sparkles, Shield } from 'lucide-react'

export default function ImpactPill() {
  const [modalOpen, setModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const modalRef = useRef(null)

  const IBAN = 'PK58TMFB0000000077417903'

  /* =========================================
     OPEN / CLOSE MODAL
  ========================================= */
  function openModal() {
    setModalOpen(true)
    document.body.style.overflow = 'hidden'
  }

  function closeModal() {
    setModalOpen(false)
    document.body.style.overflow = ''
    setCopied(false)
  }

  /* =========================================
     COPY IBAN
  ========================================= */
  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(IBAN)
      } else {
        const ta = document.createElement('textarea')
        ta.value = IBAN
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  /* =========================================
     ESC TO CLOSE
  ========================================= */
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && modalOpen) closeModal()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [modalOpen])

  /* =========================================
     USAGE TIMER — 20 min → auto modal
  ========================================= */
  useEffect(() => {
    const USAGE_KEY = 'savipulse_total_usage_seconds'
    const TARGET_SECONDS = 20 * 60

    let totalUsage = parseInt(localStorage.getItem(USAGE_KEY) || '0', 10)
    if (totalUsage >= TARGET_SECONDS) {
      totalUsage = 0
      localStorage.setItem(USAGE_KEY, '0')
    }

    let lastTick = Date.now()

    function tick() {
      const now = Date.now()
      const elapsed = Math.floor((now - lastTick) / 1000)
      if (elapsed >= 1) {
        if (document.visibilityState === 'visible') {
          totalUsage += elapsed
          localStorage.setItem(USAGE_KEY, String(totalUsage))
        }
        lastTick = now
        if (totalUsage >= TARGET_SECONDS) {
          totalUsage = 0
          localStorage.setItem(USAGE_KEY, '0')
          setTimeout(() => {
            if (!modalRef.current?.classList.contains('open')) {
              openModal()
            }
          }, 2000)
        }
      }
    }

    const timer = setInterval(tick, 1000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') lastTick = Date.now()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    const handleBeforeUnload = () => tick()
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  /* =========================================
     QR IMG ERROR FALLBACK
  ========================================= */
  function handleQrError(e) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#fafafa"/>
        <rect x="20" y="20" width="40" height="40" fill="#18181b" rx="4"/>
        <rect x="140" y="20" width="40" height="40" fill="#18181b" rx="4"/>
        <rect x="20" y="140" width="40" height="40" fill="#18181b" rx="4"/>
        <rect x="70" y="70" width="60" height="60" fill="#18181b" rx="6"/>
        <rect x="85" y="85" width="30" height="30" fill="#fafafa" rx="3"/>
        <circle cx="100" cy="100" r="6" fill="#18181b"/>
        <text x="100" y="185" font-family="sans-serif" font-size="9" fill="#a1a1aa" text-anchor="middle">QR Placeholder</text>
      </svg>
    `
    e.target.src = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  }

  return (
    <>
      {/* =========================================
          IMPACT PILL (bottom-right)
      ========================================= */}
      <button
        type="button"
        className="impact-pill"
        onClick={openModal}
        aria-label="Help Us Make Impact"
      >
        <span className="impact-text-wrap">
          <span className="impact-text" data-text="1">
            Help Us Make Impact
          </span>
          <span className="impact-text" data-text="2">
      Scan & Make Impact
          </span>
        </span>

        <span className="impact-heart">
          <Heart size={14} fill="white" stroke="white" />
        </span>
      </button>

      {/* =========================================
          MODAL
      ========================================= */}
      <div
        className={`help-modal-overlay ${modalOpen ? 'open' : ''}`}
        ref={modalRef}
        aria-hidden={!modalOpen}
      >
        <div className="help-modal-backdrop" onClick={closeModal} />

        <div
          className="help-modal-card"
          role="dialog"
          aria-modal="true"
          aria-label="Support modal"
        >
          {/* Close button */}
          <button
            type="button"
            className="help-modal-close"
            onClick={closeModal}
            aria-label="Close"
          >
            <X size={13} strokeWidth={2.5} />
          </button>

          {/* HEADER */}
          <div className="help-modal-header">
            <div className="help-modal-icon">
              <Heart size={16} fill="white" stroke="white" />
            </div>
            <h2>Help Someone Today</h2>
            <p>
              If this website helped you, you're welcome to send any amount
              from your heart.
            </p>
          </div>

          {/* BODY */}
          <div className="help-modal-body">
            {/* QR CODE */}
            <div className="help-qr-wrap">
              <div className="help-qr-box">
                <img
                  src="./scaner.jpeg"
                  alt="Scan to support"
                  className="help-qr-img"
                  loading="lazy"
                  onError={handleQrError}
                />
                <div className="help-qr-scanline" />
                <span className="help-qr-corner tl" />
                <span className="help-qr-corner tr" />
                <span className="help-qr-corner bl" />
                <span className="help-qr-corner br" />
              </div>
            </div>

            {/* IBAN */}
            <div className="help-iban-row">
              <p className="help-iban-text">
                <span className="help-iban-label">IBAN:</span>
                <span id="helpIban">{IBAN}</span>
              </p>

              <button
                type="button"
                className={`help-copy-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
              >
                {copied ? <Check size={10} strokeWidth={3} /> : <Copy size={10} />}
                <span className="help-copy-label">
                  {copied ? 'Copied' : 'Copy'}
                </span>
              </button>
            </div>

            {/* BADGES */}
            <div className="help-badges">
              <span className="help-badge help-badge-green">
                <Check size={9} strokeWidth={2.5} />
                100% Optional
              </span>
              <span className="help-badge help-badge-blue">
                <Sparkles size={9} />
                Any Amount
              </span>
            </div>

            {/* MESSAGE */}
            <div className="help-message">
              <p>
                Your small support will <strong>motivate me</strong> to build
                more projects and help more people.
              </p>
            </div>
          </div>

          {/* FOOTER */}
          <div className="help-modal-footer">
            <p className="help-footer-tagline">
              Even a small support keeps this project alive
            </p>
            <button
              type="button"
              className="help-maybe-btn"
              onClick={closeModal}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </>
  )
}