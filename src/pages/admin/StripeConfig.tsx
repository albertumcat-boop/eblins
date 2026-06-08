import { CheckCircle, AlertTriangle, ExternalLink, Copy } from 'lucide-react'
import toast from 'react-hot-toast'

const configured = !!(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
const paymentLinkConfigured = !!(import.meta.env.VITE_STRIPE_PAYMENT_LINK)

const ENV_EXAMPLE = `# .env.local — raíz del proyecto
VITE_STRIPE_PUBLIC_KEY=pk_live_XXXXXXXXXXXXXXXXXXXXXX
VITE_STRIPE_PAYMENT_LINK=https://buy.stripe.com/XXXXXXXXXXXX`

function CopyButton({ text }: { text: string }) {
  const copy = () => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado al portapapeles')
  }
  return (
    <button onClick={copy} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
      <Copy size={14} />
    </button>
  )
}

export default function StripeConfig() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Configuración de Stripe</h1>
        <p className="text-slate-500 text-sm mt-1">
          Permite a los representantes pagar mensualidades con tarjeta de crédito/débito directamente.
        </p>
      </div>

      {/* Estado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${configured ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          {configured
            ? <CheckCircle size={20} className="text-green-500 shrink-0" />
            : <AlertTriangle size={20} className="text-amber-500 shrink-0" />}
          <div>
            <p className={`text-sm font-semibold ${configured ? 'text-green-700' : 'text-amber-700'}`}>
              Clave pública
            </p>
            <p className={`text-xs ${configured ? 'text-green-600' : 'text-amber-600'}`}>
              {configured ? 'Configurada ✅' : 'No configurada ⚠️'}
            </p>
          </div>
        </div>
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${paymentLinkConfigured ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          {paymentLinkConfigured
            ? <CheckCircle size={20} className="text-green-500 shrink-0" />
            : <AlertTriangle size={20} className="text-amber-500 shrink-0" />}
          <div>
            <p className={`text-sm font-semibold ${paymentLinkConfigured ? 'text-green-700' : 'text-amber-700'}`}>
              Payment Link
            </p>
            <p className={`text-xs ${paymentLinkConfigured ? 'text-green-600' : 'text-amber-600'}`}>
              {paymentLinkConfigured ? 'Configurado ✅' : 'No configurado ⚠️'}
            </p>
          </div>
        </div>
      </div>

      {/* Pasos */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <h2 className="font-semibold text-slate-800">Pasos para activar Stripe</h2>

        <ol className="space-y-5">
          {[
            {
              n: 1,
              title: 'Crear una cuenta en Stripe',
              body: 'Regístrate gratis en stripe.com. Completa la verificación de tu negocio para activar pagos reales.',
              link: { href: 'https://stripe.com', label: 'Ir a stripe.com' },
            },
            {
              n: 2,
              title: 'Crear un Payment Link',
              body: 'En el dashboard de Stripe ve a "Payment Links" → "New" → configura el monto y descripción de la mensualidad. Copia la URL generada (ej: https://buy.stripe.com/xxx).',
              link: { href: 'https://dashboard.stripe.com/payment-links', label: 'Abrir Payment Links' },
            },
            {
              n: 3,
              title: 'Obtener la clave pública',
              body: 'En el dashboard de Stripe ve a "Developers" → "API keys". Copia la "Publishable key" (comienza con pk_live_ o pk_test_).',
              link: { href: 'https://dashboard.stripe.com/apikeys', label: 'Abrir API keys' },
            },
            {
              n: 4,
              title: 'Agregar las variables al proyecto',
              body: 'Crea o edita el archivo .env.local en la raíz del proyecto con las siguientes variables y reinicia el servidor de desarrollo.',
            },
          ].map(step => (
            <li key={step.n} className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {step.n}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-800">{step.title}</p>
                <p className="text-sm text-slate-500 mt-0.5">{step.body}</p>
                {step.link && (
                  <a
                    href={step.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                  >
                    {step.link.label}
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* Código .env */}
        <div className="rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
            <span className="text-slate-400">.env.local</span>
            <CopyButton text={ENV_EXAMPLE} />
          </div>
          <pre className="px-4 py-3 overflow-x-auto">{ENV_EXAMPLE}</pre>
        </div>
      </div>

      {/* Nota */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Nota:</strong> Con esta integración (MVP), el botón de Stripe redirige al representante a una página de pago
        predefinida en Stripe. Para pagos con montos dinámicos por cada alumno, se recomienda en el futuro implementar
        Stripe Checkout con un backend (Firebase Functions).
      </div>
    </div>
  )
}
