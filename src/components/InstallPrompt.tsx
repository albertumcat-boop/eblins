import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'edufinance_install_dismissed'
const DISMISS_DAYS = 7

function isDismissed() {
  try {
    const val = localStorage.getItem(DISMISSED_KEY)
    if (!val) return false
    return Date.now() - parseInt(val) < DISMISS_DAYS * 86400_000
  } catch { return false }
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Don't show if running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Don't show if dismissed within the last 7 days
    if (isDismissed()) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())) } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#0f1c35',
        borderTop: '1px solid rgba(29,111,244,0.4)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <span style={{ fontSize: '24px', flexShrink: 0 }}>📲</span>
      <p style={{ flex: 1, margin: 0, color: '#e2e8f0', fontSize: '14px', lineHeight: '1.4' }}>
        <strong style={{ color: '#ffffff' }}>Instala EduFinance</strong> en tu teléfono — acceso rápido sin abrir el navegador
      </p>
      <button
        onClick={handleInstall}
        style={{
          background: '#1d6ff4',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Instalar
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Cerrar"
        style={{
          background: 'transparent',
          color: '#94a3b8',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '4px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
