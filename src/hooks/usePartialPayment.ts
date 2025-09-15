import { useState, useEffect } from 'react'
import { PartialPayment, PaymentPlan, PaymentInstallment } from '../types/sales'

export const usePartialPayment = (totalAmount: number) => {
  const [isPartialPaymentEnabled, setIsPartialPaymentEnabled] = useState(false)
  const [amountPaid, setAmountPaid] = useState(0)
  const [amountRemaining, setAmountRemaining] = useState(totalAmount)
  const [dueDate, setDueDate] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash')
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan | null>(null)

  // Calculate remaining amount when amount paid changes
  useEffect(() => {
    setAmountRemaining(Math.max(0, totalAmount - amountPaid))
  }, [totalAmount, amountPaid])

  // Reset when total amount changes
  useEffect(() => {
    setAmountRemaining(totalAmount)
    setAmountPaid(0)
  }, [totalAmount])

  const enablePartialPayment = () => {
    setIsPartialPaymentEnabled(true)
    setAmountPaid(0)
    setAmountRemaining(totalAmount)
  }

  const disablePartialPayment = () => {
    setIsPartialPaymentEnabled(false)
    setAmountPaid(totalAmount)
    setAmountRemaining(0)
  }

  const setPartialAmount = (amount: number) => {
    if (amount >= 0 && amount <= totalAmount) {
      setAmountPaid(amount)
    }
  }

  const createPaymentPlan = (installments: number, dueDate?: string) => {
    if (installments <= 0) return null

    const installmentAmount = amountRemaining / installments
    const installmentsList: PaymentInstallment[] = []
    
    for (let i = 0; i < installments; i++) {
      const installmentDate = dueDate ? new Date(dueDate) : new Date()
      installmentDate.setDate(installmentDate.getDate() + (i * 30)) // 30 days between installments
      
      installmentsList.push({
        id: `installment-${i + 1}`,
        amount: i === installments - 1 ? amountRemaining - (installmentAmount * (installments - 1)) : installmentAmount,
        dueDate: installmentDate.toISOString().split('T')[0],
        status: 'pending'
      })
    }

    const plan: PaymentPlan = {
      totalAmount,
      amountPaid,
      amountRemaining,
      installments: installmentsList,
      status: amountRemaining > 0 ? 'partial' : 'completed'
    }

    setPaymentPlan(plan)
    return plan
  }

  const getPaymentStatus = () => {
    if (!isPartialPaymentEnabled) return 'full'
    if (amountPaid === 0) return 'unpaid'
    if (amountRemaining === 0) return 'paid'
    return 'partial'
  }

  const canProcessPayment = () => {
    if (!isPartialPaymentEnabled) return true
    return amountPaid > 0
  }

  const getPaymentSummary = () => {
    return {
      totalAmount,
      amountPaid,
      amountRemaining,
      isPartial: isPartialPaymentEnabled && amountRemaining > 0,
      status: getPaymentStatus(),
      paymentMethod,
      dueDate,
      notes: paymentNotes
    }
  }

  const resetPartialPayment = () => {
    setIsPartialPaymentEnabled(false)
    setAmountPaid(0)
    setAmountRemaining(totalAmount)
    setDueDate('')
    setPaymentNotes('')
    setPaymentMethod('cash')
    setPaymentPlan(null)
  }

  return {
    // State
    isPartialPaymentEnabled,
    amountPaid,
    amountRemaining,
    dueDate,
    paymentNotes,
    paymentMethod,
    paymentPlan,
    
    // Actions
    enablePartialPayment,
    disablePartialPayment,
    setPartialAmount,
    setDueDate,
    setPaymentNotes,
    setPaymentMethod,
    createPaymentPlan,
    
    // Computed
    getPaymentStatus,
    canProcessPayment,
    getPaymentSummary,
    resetPartialPayment
  }
}
