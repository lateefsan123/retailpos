// Payment Gateway Utilities
// Handles payment processing for different gateways (Stripe, Revolut, PayPal)

import { supabase } from '../lib/supabaseClient';
import { PaymentGateway, PaymentIntent, PaymentResult, PaymentStatus } from '../types/multitenant'

// =====================================================
// PAYMENT GATEWAY MANAGEMENT
// =====================================================

export const getEnabledGateways = async (businessId: number): Promise<PaymentGateway[]> => {
  try {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_enabled', true)
      .order('gateway_type')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching enabled gateways:', error)
    return []
  }
}

export const getGatewayByType = async (businessId: number, gatewayType: string): Promise<PaymentGateway | null> => {
  try {
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('business_id', businessId)
      .eq('gateway_type', gatewayType)
      .eq('is_enabled', true)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching gateway:', error)
    return null
  }
}

// =====================================================
// STRIPE PAYMENT PROCESSING
// =====================================================

export const initializeStripePayment = async (paymentIntent: PaymentIntent): Promise<PaymentResult> => {
  return {
    success: false,
    error: 'Payment processing temporarily disabled'
  }
}

export const confirmStripePayment = async (paymentIntentId: string): Promise<PaymentResult> => {
  try {
    // This would confirm the payment with Stripe
    // For now, simulate success
    return {
      success: true,
      transaction_id: `txn_${Date.now()}`,
      payment_intent_id: paymentIntentId
    }
  } catch (error) {
    console.error('Error confirming Stripe payment:', error)
    return { success: false, error: 'Payment confirmation failed' }
  }
}

// =====================================================
// REVOLUT PAYMENT PROCESSING
// =====================================================

export const initializeRevolutPayment = async (paymentIntent: PaymentIntent): Promise<PaymentResult> => {
  return {
    success: false,
    error: 'Payment processing temporarily disabled'
  }
}

// =====================================================
// PAYPAL PAYMENT PROCESSING
// =====================================================

export const initializePayPalPayment = async (paymentIntent: PaymentIntent): Promise<PaymentResult> => {
  return {
    success: false,
    error: 'Payment processing temporarily disabled'
  }
}

// =====================================================
// PAYMENT STATUS MANAGEMENT
// =====================================================

export const updatePaymentStatus = async (
  transactionId: string,
  status: PaymentStatus['status'],
  gatewayType: string,
  metadata?: any
): Promise<boolean> => {
  try {
    // Update customer_shopping_lists payment status
    const { error: listError } = await supabase
      .from('customer_shopping_lists')
      .update({
        payment_status: status,
        payment_transaction_id: transactionId,
        paid_at: status === 'completed' ? new Date().toISOString() : null
      })
      .eq('payment_transaction_id', transactionId)

    if (listError) throw listError

    // Update sales table if it exists
    const { error: salesError } = await supabase
      .from('sales')
      .update({
        payment_status: status,
        payment_gateway: gatewayType,
        payment_metadata: metadata
      })
      .eq('payment_transaction_id', transactionId)

    if (salesError) {
      console.warn('Sales table update failed:', salesError)
      // Don't throw here as the main update succeeded
    }

    return true
  } catch (error) {
    console.error('Error updating payment status:', error)
    return false
  }
}

export const verifyPaymentStatus = async (transactionId: string): Promise<PaymentStatus | null> => {
  try {
    const { data, error } = await supabase
      .from('customer_shopping_lists')
      .select('payment_status, payment_transaction_id, order_total')
      .eq('payment_transaction_id', transactionId)
      .single()

    if (error) throw error

    return {
      status: data.payment_status as PaymentStatus['status'],
      transaction_id: data.payment_transaction_id,
      amount: data.order_total
    }
  } catch (error) {
    console.error('Error verifying payment status:', error)
    return null
  }
}

// =====================================================
// PAYMENT SUCCESS HANDLING
// =====================================================

export const handlePaymentSuccess = async (
  transactionId: string,
  gatewayType: string,
  amount: number,
  customerId: number,
  businessId: number
): Promise<boolean> => {
  try {
    // Update payment status for click & collect items
    await updatePaymentStatus(transactionId, 'completed', gatewayType)

    // Award loyalty points (1 point per euro spent) for online orders
    const pointsToAward = Math.floor(amount)
    if (pointsToAward > 0) {
      const { error: pointsError } = await supabase.rpc('award_loyalty_points', {
        p_customer_id: customerId,
        p_points: pointsToAward
      })

      if (pointsError) {
        console.error('Error awarding loyalty points:', pointsError)
      }
    }

    // Create sale record specifically for click & collect orders
    // This is separate from regular in-store sales which use cash/card/tap
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert({
        datetime: new Date().toISOString(),
        total_amount: amount,
        payment_method: 'online', // Distinguishes from in-store payment methods
        payment_gateway: gatewayType, // Which gateway was used (stripe/revolut/paypal)
        payment_transaction_id: transactionId,
        payment_status: 'completed',
        customer_id: customerId,
        business_id: businessId,
        discount_applied: 0,
        partial_payment: false,
        notes: 'Click & Collect - Online Payment' // Clear identifier
      })
      .select('sale_id')
      .single()

    if (saleError) {
      console.error('Error creating click & collect sale record:', saleError)
    }

    return true
  } catch (error) {
    console.error('Error handling click & collect payment success:', error)
    return false
  }
}

export const handlePaymentFailure = async (
  transactionId: string,
  gatewayType: string,
  errorMessage: string
): Promise<boolean> => {
  try {
    await updatePaymentStatus(transactionId, 'failed', gatewayType, { error: errorMessage })
    return true
  } catch (error) {
    console.error('Error handling payment failure:', error)
    return false
  }
}

// =====================================================
// REFUND PROCESSING
// =====================================================

export const processRefund = async (
  transactionId: string,
  amount: number,
  gatewayType: string,
  reason?: string
): Promise<PaymentResult> => {
  try {
    // This would call the specific gateway's refund API
    // For now, simulate refund processing
    
    await updatePaymentStatus(transactionId, 'refunded', gatewayType, { 
      refund_amount: amount, 
      refund_reason: reason 
    })

    return {
      success: true,
      transaction_id: `refund_${transactionId}`,
      gateway_response: { refund_id: `ref_${Date.now()}` }
    }
  } catch (error) {
    console.error('Error processing refund:', error)
    return { success: false, error: 'Refund processing failed' }
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

export const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

export const calculateOrderTotal = (items: any[]): number => {
  return items.reduce((total, item) => {
    const price = item.calculated_price || (item.products?.price || 0) * (item.quantity || 1)
    return total + price
  }, 0)
}

export const validatePaymentAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 10000 // Max €10,000 per transaction
}
