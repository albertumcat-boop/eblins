import { useState } from 'react'
import { CreditCard, Lock, X, ExternalLink } from 'lucide-react'
import { getStripeCheckoutUrl } from '@/services/stripe'

interface StripePaymentButtonProps {
  amount: number
  currency?: string
  description: string
  studentName: string
}

export default function StripePaymentButton({ amount, currency = 'USD', description, studentName }: StripePaymentButtonProps) {
  const [showModal, setShowModal] = useState(false)

  const handleConfirm = () => {
    const url = getStripeCheckoutUrl(amount, description, studentName)
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
    setShowModal(false)
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
      >
        <CreditCard size={13} />
        Pagar con tarjeta
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <CreditCard size={16} className="text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-800">Pago con tarjeta</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Monto */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">Monto a pagar</p>
                <p className="text-3xl font-bold text-emerald-700">
                  {currency === 'VES' ? 'Bs. ' : '$ '}{amount.toFixed(2)}
                  <span className="text-sm font-normal text-emerald-500 ml-1">{currency}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">{description}</p>
              </div>

              {/* Info Stripe */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Lock size={13} className="text-slate-500 shrink-0" />
                  <p className="text-xs text-slate-600">
                    Serás redirigido a <strong>Stripe</strong>, una plataforma de pagos segura y encriptada.
                  </p>
                </div>
                <p className="text-xs text-slate-500 pl-5">
                  Estudiante: <strong>{studentName}</strong>
                </p>
              </div>

              {/* Nota transferencia */}
              <p className="text-xs text-slate-400 text-center">
                También puedes pagar por transferencia usando el botón de comprobante.
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 space-y-2">
              <button
                onClick={handleConfirm}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors"
              >
                <Lock size={14} />
                Ir a pagar con Stripe
                <ExternalLink size={13} />
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="w-full border border-slate-200 text-slate-500 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              {/* Powered by Stripe badge */}
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <Lock size={11} className="text-slate-400" />
                <span className="text-xs text-slate-400">Powered by</span>
                <span className="text-xs font-bold text-slate-500">Stripe</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
