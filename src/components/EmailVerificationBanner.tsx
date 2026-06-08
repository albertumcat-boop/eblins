import React, { useState } from 'react'
import { MailWarning, X } from 'lucide-react'
import { sendEmailVerification } from 'firebase/auth'
import toast from 'react-hot-toast'
import { useAuth } from '@/context/AuthContext'

export default function EmailVerificationBanner() {
  const { firebaseUser, emailVerified } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)

  if (emailVerified || dismissed || !firebaseUser) return null

  const handleResend = async () => {
    setSending(true)
    try {
      await sendEmailVerification(firebaseUser)
      toast.success('Correo de verificación enviado. Revisa tu bandeja de entrada.')
    } catch (err: any) {
      if (err?.code === 'auth/too-many-requests') {
        toast.error('Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')
      } else {
        toast.error('No se pudo enviar el correo. Intenta más tarde.')
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <MailWarning className="w-5 h-5 text-yellow-600 flex-shrink-0" />
        <p className="text-yellow-800 text-sm">
          <span className="font-semibold">Verifica tu correo electrónico.</span>{' '}
          Hemos enviado un enlace de verificación a <span className="font-medium">{firebaseUser.email}</span>.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={handleResend}
          disabled={sending}
          className="text-sm font-medium text-yellow-700 hover:text-yellow-900 underline underline-offset-2 disabled:opacity-50 transition-colors"
        >
          {sending ? 'Enviando...' : 'Reenviar verificación'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-500 hover:text-yellow-700 transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
