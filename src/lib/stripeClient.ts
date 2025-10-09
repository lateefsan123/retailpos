+import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export default stripePromise

// Helper function to get Stripe instance
export const getStripe = () => stripePromise

// Check if Apple Pay is available
export const isApplePayAvailable = async (): Promise<boolean> => {
  const stripe = await stripePromise
  if (!stripe) return false
  
  try {
    const { applePay } = await stripe.paymentRequest({
      country: 'IE',
      currency: 'eur',
      total: {
        label: 'Test',
        amount: 100, // 1.00 EUR in cents
      },
    })
    
    return await applePay.canMakePayment()
  } catch {
    return false
  }
}

// Check if Google Pay is available
export const isGooglePayAvailable = async (): Promise<boolean> => {
  const stripe = await stripePromise
  if (!stripe) return false
  
  try {
    const { googlePay } = await stripe.paymentRequest({
      country: 'IE',
      currency: 'eur',
      total: {
        label: 'Test',
        amount: 100, // 1.00 EUR in cents
      },
    })
    
    return await googlePay.canMakePayment()
  } catch {
    return false
  }
}
