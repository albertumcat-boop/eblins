import { loadStripe } from '@stripe/stripe-js'

const STRIPE_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY as string | undefined

// Only call loadStripe when a real key exists — avoids "empty string" IntegrationError
export const stripePromise = STRIPE_KEY ? loadStripe(STRIPE_KEY) : null

// Genera la URL del Payment Link de Stripe con parámetros predefinidos.
// Requiere VITE_STRIPE_PAYMENT_LINK configurado en .env.local
export function getStripeCheckoutUrl(amount: number, description: string, studentName: string): string {
  const baseUrl = import.meta.env.VITE_STRIPE_PAYMENT_LINK || ''
  if (!baseUrl) return ''
  const params = new URLSearchParams({ client_reference_id: studentName })
  return `${baseUrl}?${params}`
}

export const stripeConfigured = !!STRIPE_KEY
