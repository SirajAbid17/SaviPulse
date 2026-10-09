import { useEffect, useState } from "react";

export default function HelpScannerModal({ isOpen, onClose }) {
  const [copiedIban, setCopiedIban] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [imageError, setImageError] = useState(false);

  const IBAN = "PK58TMFB0000000077417903";
  const WALLET = "03407961055";

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setCopiedIban(false);
      setCopiedWallet(false);
      setImageError(false);
    }
  }, [isOpen]);

  const copyToClipboard = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      return true;
    } catch (err) {
      console.error("Copy failed:", err);
      return false;
    }
  };

  const handleCopyIban = async () => {
    const ok = await copyToClipboard(IBAN);
    if (ok) {
      setCopiedIban(true);
      setTimeout(() => setCopiedIban(false), 2000);
    }
  };

  const handleCopyWallet = async () => {
    const ok = await copyToClipboard(WALLET);
    if (ok) {
      setCopiedWallet(true);
      setTimeout(() => setCopiedWallet(false), 2000);
    }
  };

  if (!isOpen) return null;

  const fallbackSvg =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#fafafa"/>
        <rect x="20" y="20" width="40" height="40" fill="#18181b" rx="4"/>
        <rect x="140" y="20" width="40" height="40" fill="#18181b" rx="4"/>
        <rect x="20" y="140" width="40" height="40" fill="#18181b" rx="4"/>
        <rect x="70" y="70" width="60" height="60" fill="#18181b" rx="6"/>
        <rect x="85" y="85" width="30" height="30" fill="#fafafa" rx="3"/>
        <circle cx="100" cy="100" r="6" fill="#18181b"/>
        <text x="100" y="185" font-family="sans-serif" font-size="9" fill="#a1a1aa" text-anchor="middle">QR Code Placeholder</text>
      </svg>
    `);

  
  const keyframes = `
    @keyframes hsm-modalIn {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to   { opacity: 1; transform: scale(1)    translateY(0);   }
    }
  `;

  const CopyButton = ({ copied, onClick, label = "Copy" }) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Copy ${label}`}
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 4,
        borderRadius: 6,
        padding: "4px 8px",
        fontSize: 10,
        fontWeight: 600,
        border: "none",
        cursor: "pointer",
        transition: "background .15s ease, color .15s ease",
        background: copied ? "#d1fae5" : "#18181b",
        color: copied ? "#047857" : "#ffffff",
      }}
      onMouseEnter={(e) => {
        if (!copied) e.currentTarget.style.background = "#27272a";
      }}
      onMouseLeave={(e) => {
        if (!copied) e.currentTarget.style.background = "#18181b";
      }}
    >
      {copied ? (
        <>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          Copy
        </>
      )}
    </button>
  );

  return (
    <>
      <style>{keyframes}</style>

      <div
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Support modal"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
      
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        />

       
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 380,
            maxHeight: "92vh",
            overflowY: "auto",
            background: "#ffffff",
            borderRadius: 16,
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
            animation: "hsm-modalIn 0.25s ease-out",
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
         
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "#f4f4f5",
              color: "#52525b",
              border: "none",
              cursor: "pointer",
              transition: "background .15s ease, color .15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#e4e4e7";
              e.currentTarget.style.color = "#18181b";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#f4f4f5";
              e.currentTarget.style.color = "#52525b";
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          
          <div
            style={{
              borderBottom: "1px solid #f4f4f5",
              padding: "16px 20px 12px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                margin: "0 auto 6px",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 8,
                background: "linear-gradient(135deg, #10b981, #16a34a)",
                color: "#ffffff",
                boxShadow: "0 4px 12px -2px rgba(16,185,129,0.35)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
              </svg>
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: "#18181b",
              }}
            >
              Help Someone Today
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 10.5,
                lineHeight: 1.55,
                color: "#71717a",
              }}
            >
              If this website helped you, you&apos;re welcome to send any
              amount from your heart. 💚
            </p>
          </div>


          <div style={{ padding: "12px 20px" }}>
           
            <div
              style={{
                position: "relative",
                margin: "0 auto",
                width: "100%",
                maxWidth: 150,
              }}
            >
              <div
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 8,
                  border: "2px solid #e4e4e7",
                  background: "#ffffff",
                  padding: 6,
                }}
              >
                <img
                  src={imageError ? fallbackSvg : "/scaner.jpeg"}
                  alt="Scan to support"
                  onError={() => setImageError(true)}
                  loading="lazy"
                  style={{
                    height: "auto",
                    width: "100%",
                    borderRadius: 6,
                    objectFit: "contain",
                    display: "block",
                  }}
                />

               
                <span
                  style={{
                    position: "absolute",
                    left: 6,
                    top: 6,
                    width: 16,
                    height: 16,
                    borderLeft: "2px solid #10b981",
                    borderTop: "2px solid #10b981",
                    borderTopLeftRadius: 4,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 6,
                    top: 6,
                    width: 16,
                    height: 16,
                    borderRight: "2px solid #10b981",
                    borderTop: "2px solid #10b981",
                    borderTopRightRadius: 4,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    left: 6,
                    bottom: 6,
                    width: 16,
                    height: 16,
                    borderLeft: "2px solid #10b981",
                    borderBottom: "2px solid #10b981",
                    borderBottomLeftRadius: 4,
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 6,
                    bottom: 6,
                    width: 16,
                    height: 16,
                    borderRight: "2px solid #10b981",
                    borderBottom: "2px solid #10b981",
                    borderBottomRightRadius: 4,
                  }}
                />
              </div>
            </div>

           
            <div
              style={{
                marginTop: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 6,
                border: "1px solid #d1fae5",
                background: "linear-gradient(to right, #ecfdf5, #f0fdf4)",
                padding: "6px 10px",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 8.5,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#059669",
                  }}
                >
                  SadaPay / EasyPaisa
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    color: "#065f46",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  0340 7961055
                </p>
              </div>

              <CopyButton copied={copiedWallet} onClick={handleCopyWallet} />
            </div>

          
            <div
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 6,
                border: "1px solid #e4e4e7",
                background: "#fafafa",
                padding: "6px 10px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  minWidth: 0,
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: "-0.01em",
                  color: "#27272a",
                }}
              >
                <span
                  style={{
                    marginRight: 4,
                    fontFamily:
                      "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                    fontSize: 9,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#a1a1aa",
                  }}
                >
                  IBAN:
                </span>
                {IBAN}
              </p>

              <CopyButton copied={copiedIban} onClick={handleCopyIban} />
            </div>

           
            <div
              style={{
                marginTop: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  borderRadius: 999,
                  background: "#ecfdf5",
                  padding: "2px 8px",
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: "#047857",
                }}
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                100% Optional
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  borderRadius: 999,
                  background: "#eff6ff",
                  padding: "2px 8px",
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: "#1d4ed8",
                }}
              >
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M12 2v20" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
                Any Amount
              </span>
            </div>

           
          </div>

        
          <div
            style={{
              borderTop: "1px solid #f4f4f5",
              background: "#fafafa",
              padding: "10px 20px",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                width: "100%",
                borderRadius: 6,
                background: "#18181b",
                padding: "6px 0",
                fontSize: 11,
                fontWeight: 600,
                color: "#ffffff",
                border: "none",
                cursor: "pointer",
                transition: "background .15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#27272a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#18181b";
              }}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </>
  );
}