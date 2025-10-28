// Stripe Checkout Component
// Handles Stripe payment processing with Elements

import React, { useState, useEffect } from 'react'
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { PaymentIntent, PaymentResult } from '../../types/multitenant'
import { confirmStripePayment } from '../../utils/paymentGateways'
import { supabase } from '../../lib/supabaseClient'
import styles from './StripeCheckout.module.css'

// Initialize Stripe dynamically with shop owner's publishable key
const getStripeKey = async (businessId: number): Promise<string | null> => {
  try {
    const { data: stripeGateway, error } = await supabase
      .from('payment_gateways')
      .select('publishable_key')
      .eq('business_id', businessId)
      .eq('gateway_type', 'stripe')
      .eq('is_enabled', true)
      .single()

    if (error || !stripeGateway?.publishable_key) {
      return null
    }

    return stripeGateway.publishable_key
  } catch (err) {
    console.error('Error fetching Stripe key:', err)
    return null
  }
}

interface StripeCheckoutProps {
  paymentIntent: PaymentIntent
  amount: number
  onSuccess: (result: PaymentResult) => void
  onError: (error: string) => void
  onCancel: () => void
}

const StripeCheckoutForm: React.FC<StripeCheckoutProps> = ({
  paymentIntent,
  amount,
  onSuccess,
  onError,
  onCancel
}) => {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Confirm payment with Stripe using Payment Element
      const { error: stripeError, paymentIntent: confirmedPaymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/payment-success', // You can customize this
        },
      })

      if (stripeError) {
        throw new Error(stripeError.message || 'Payment failed')
      }

      if (confirmedPaymentIntent?.status === 'succeeded') {
        const result: PaymentResult = {
          success: true,
          transaction_id: confirmedPaymentIntent.id,
          payment_intent_id: confirmedPaymentIntent.id,
          gateway_response: confirmedPaymentIntent
        }
        onSuccess(result)
      } else {
        throw new Error('Payment was not successful')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed'
      setError(errorMessage)
      onError(errorMessage)
    } finally {
      setLoading(false)
    }
  }


  return (
    <form onSubmit={handleSubmit} className={styles.stripeForm}>
      <div className={styles.paymentSection}>
        <h3 className={styles.sectionTitle}>Payment Information</h3>
        
        <div className={styles.paymentElementContainer}>
          <PaymentElement />
        </div>

        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        <div className={styles.paymentSummary}>
          <div className={styles.summaryRow}>
            <span>Amount:</span>
            <span className={styles.amount}>
              €{amount.toFixed(2)}
            </span>
          </div>
          <div className={styles.summaryRow}>
            <span>Processing fee:</span>
            <span>€0.00</span>
          </div>
          <div className={styles.summaryRowTotal}>
            <span>Total:</span>
            <span className={styles.totalAmount}>
              €{amount.toFixed(2)}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelButton}
            disabled={loading}
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className={styles.payButton}
            disabled={loading || !stripe}
          >
            {loading ? 'Processing...' : `Pay €${amount.toFixed(2)}`}
          </button>
        </div>

        <div className={styles.securityNote}>
          <div className={styles.securityIcon}>🔒</div>
          <span>Your payment information is secure and encrypted</span>
        </div>
      </div>
    </form>
  )
}

const StripeCheckout: React.FC<StripeCheckoutProps> = (props) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializePayment = async () => {
      try {
        setLoading(true)
        
        // Get the shop owner's configured Stripe publishable key
        const publishableKey = await getStripeKey(props.paymentIntent.business_id)
        
        console.log('Fetched publishable key:', publishableKey ? 'Found' : 'Not found')
        
        if (!publishableKey) {
          setError('Stripe is not configured. Please set up your Stripe keys in Settings → Payment Gateways.')
          return
        }

        // Initialize Stripe with the shop owner's publishable key
        const stripe = await loadStripe(publishableKey)
        setStripePromise(stripe)

        // Try to create payment intent using the Supabase Edge Function
        try {
          console.log('Calling Edge Function with:', { amount: props.amount, businessId: props.paymentIntent.business_id })
          
          const { data: paymentIntentData, error: intentError } = await supabase.functions.invoke('create-payment-intent', {
            body: {
              amount: props.amount,
              currency: 'eur',
              businessId: props.paymentIntent.business_id,
              branchId: props.paymentIntent.branch_id
            }
          })

          console.log('Edge Function response:', { data: paymentIntentData, error: intentError })

          if (intentError || !paymentIntentData?.clientSecret) {
            // Edge Function not available - show helpful error
            setError('Payment service is temporarily unavailable. Please contact support or try again later.')
            console.error('Edge Function error:', intentError)
            return
          }

          setClientSecret(paymentIntentData.clientSecret)
        } catch (edgeFunctionError) {
          // Edge Function not deployed or CORS issue
          console.error('Edge Function not available:', edgeFunctionError)
          setError('Payment processing is not yet configured. Please contact the store administrator to set up online payments.')
        }
      } catch (err) {
        console.error('Payment initialization error:', err)
        setError('Failed to initialize payment. Please try again or contact support.')
      } finally {
        setLoading(false)
      }
    }

    initializePayment()
  }, [props.amount, props.paymentIntent.business_id, props.paymentIntent.branch_id])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Initializing payment...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>❌</div>
        <p>{error}</p>
        <div className={styles.errorHelp}>
          <p><strong>To enable online payments:</strong></p>
          <ol>
            <li>Contact your store administrator</li>
            <li>Ask them to set up Stripe in Settings → Payment Gateways</li>
            <li>Ensure the payment service is properly configured</li>
          </ol>
        </div>
        <button onClick={props.onCancel} className={styles.retryButton}>
          Close
        </button>
      </div>
    )
  }

  if (!clientSecret || !stripePromise) {
    if (loading) {
      return (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Initializing payment...</p>
        </div>
      )
    }
    
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>❌</div>
        <p>Failed to initialize payment</p>
        <button onClick={props.onCancel} className={styles.retryButton}>
          Cancel
        </button>
      </div>
    )
  }

  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#ffffff',
        colorText: '#30313d',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  }

  return (
    <div className={styles.stripeCheckout}>
      <div className={styles.header}>
        <div className={styles.stripeLogo}>
          <i className="fab fa-stripe"></i>
          <span className={styles.stripeText}>Stripe</span>
        </div>
        <p className={styles.subtitle}>Secure payment processing</p>
      </div>

      <Elements 
        key={clientSecret} 
        options={options} 
        stripe={stripePromise}
      >
        <StripeCheckoutForm {...props} />
      </Elements>
    </div>
  )
}

export default StripeCheckout
