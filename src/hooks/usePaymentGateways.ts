// Payment Gateway Hooks
// React hooks for managing payment gateway operations

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient';
import { PaymentGateway, PaymentIntent, PaymentResult, PaymentStatus } from '../types/multitenant'
import { 
  getEnabledGateways, 
  initializeStripePayment, 
  initializeRevolutPayment, 
  initializePayPalPayment,
  confirmStripePayment,
  handlePaymentSuccess,
  handlePaymentFailure,
  verifyPaymentStatus,
  calculateOrderTotal
} from '../utils/paymentGateways'

// =====================================================
// USE PAYMENT GATEWAYS HOOK
// =====================================================

export const usePaymentGateways = (businessId: number) => {
  const [gateways, setGateways] = useState<PaymentGateway[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGateways = useCallback(async () => {
    // Payment processing temporarily disabled
    setLoading(false)
    setGateways([])
    setError(null)
  }, [businessId])

  useEffect(() => {
    fetchGateways()
  }, [fetchGateways])

  return {
    gateways,
    loading,
    error,
    refetch: fetchGateways
  }
}

// =====================================================
// USE PAYMENT INTENT HOOK
// =====================================================

export const usePaymentIntent = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createPaymentIntent = useCallback(async (
    paymentIntent: PaymentIntent
  ): Promise<PaymentResult | null> => {
    try {
      setLoading(true)
      setError(null)

      let result: PaymentResult

      switch (paymentIntent.gateway_type) {
        case 'stripe':
          result = await initializeStripePayment(paymentIntent)
          break
        case 'revolut':
          result = await initializeRevolutPayment(paymentIntent)
          break
        case 'paypal':
          result = await initializePayPalPayment(paymentIntent)
          break
        default:
          throw new Error(`Unsupported gateway type: ${paymentIntent.gateway_type}`)
      }

      if (!result.success) {
        setError(result.error || 'Payment initialization failed')
        return null
      }

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment initialization failed'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    createPaymentIntent,
    loading,
    error
  }
}

// =====================================================
// USE PAYMENT STATUS HOOK
// =====================================================

export const usePaymentStatus = (transactionId?: string) => {
  const [status, setStatus] = useState<PaymentStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = useCallback(async (txId: string) => {
    try {
      setLoading(true)
      setError(null)
      const paymentStatus = await verifyPaymentStatus(txId)
      setStatus(paymentStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check payment status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (transactionId) {
      checkStatus(transactionId)
    }
  }, [transactionId, checkStatus])

  return {
    status,
    loading,
    error,
    checkStatus
  }
}

// =====================================================
// USE PAYMENT PROCESSING HOOK
// =====================================================

export const usePaymentProcessing = () => {
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const processPayment = useCallback(async (
    gatewayType: string,
    paymentIntentId: string,
    amount: number,
    customerId: number,
    businessId: number
  ): Promise<boolean> => {
    try {
      setProcessing(true)
      setError(null)

      let result: PaymentResult

      // Confirm payment based on gateway type
      switch (gatewayType) {
        case 'stripe':
          result = await confirmStripePayment(paymentIntentId)
          break
        case 'revolut':
        case 'paypal':
          // For now, simulate success for other gateways
          result = { success: true, transaction_id: `txn_${Date.now()}` }
          break
        default:
          throw new Error(`Unsupported gateway type: ${gatewayType}`)
      }

      if (!result.success) {
        await handlePaymentFailure(
          result.payment_intent_id || paymentIntentId,
          gatewayType,
          result.error || 'Payment processing failed'
        )
        setError(result.error || 'Payment processing failed')
        return false
      }

      // Handle successful payment
      const success = await handlePaymentSuccess(
        result.transaction_id || paymentIntentId,
        gatewayType,
        amount,
        customerId,
        businessId
      )

      if (!success) {
        setError('Failed to process payment completion')
        return false
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed'
      setError(errorMessage)
      return false
    } finally {
      setProcessing(false)
    }
  }, [])

  return {
    processPayment,
    processing,
    error
  }
}

// =====================================================
// USE ORDER CALCULATION HOOK
// =====================================================

export const useOrderCalculation = (items: any[]) => {
  const [total, setTotal] = useState(0)
  const [itemCount, setItemCount] = useState(0)

  useEffect(() => {
    const calculatedTotal = calculateOrderTotal(items)
    const count = items.reduce((sum, item) => sum + (item.quantity || 1), 0)
    
    setTotal(calculatedTotal)
    setItemCount(count)
  }, [items])

  return {
    total,
    itemCount,
    formattedTotal: new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(total)
  }
}

// =====================================================
// USE PAYMENT MODAL HOOK
// =====================================================

export const usePaymentModal = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null)
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [customerId, setCustomerId] = useState<number | null>(null)

  const openModal = useCallback((items: any[], customer: number, gateway?: string) => {
    setOrderItems(items)
    setCustomerId(customer)
    setSelectedGateway(gateway || null)
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
    setSelectedGateway(null)
    setOrderItems([])
    setCustomerId(null)
  }, [])

  const selectGateway = useCallback((gatewayType: string) => {
    setSelectedGateway(gatewayType)
  }, [])

  return {
    isOpen,
    selectedGateway,
    orderItems,
    customerId,
    openModal,
    closeModal,
    selectGateway
  }
}
