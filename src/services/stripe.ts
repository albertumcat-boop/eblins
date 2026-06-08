import { loadStripe } from '@stripe/stripe-js'

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '')

// Genera la URL del Payment Link de Stripe con parámetros predefinidos.
// Requiere VITE_STRIPE_PAYMENT_LINK configurado en .env.local
export function getStripeCheckoutUrl(amount: number, description: string, studentName: string): string {
  const baseUrl = import.meta.env.VITE_STRIPE_PAYMENT_LINK || ''
  if (!baseUrl) return ''
  const params = new URLSearchParams({
    client_reference_id: studentName,
    // amount y description son informativos; el monto real lo define el Payment Link en Stripe
  })
  return `${baseUrl}?${params}`
}

export const stripeConfigured = !!(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
