import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useBusinessId } from './useBusinessId'

export interface Transaction {
  sale_id: number
  total_amount: number
  payment_method: string
  datetime: string
  customer_id: number | null
  cashier_id: number
  discount_applied: number
  customer_name?: string
  cashier_name?: string
  partial_payment?: boolean
  partial_amount?: number
  remaining_amount?: number
  partial_notes?: string
}

export interface TransactionItem {
  sale_item_id: number
  sale_id: number
  product_id: string
  quantity: number
  price_each: number
  product_name?: string
  product_category?: string
}

export const useTransactions = () => {
  const { businessId, businessLoading, businessError } = useBusinessId()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    if (businessLoading) {
      return
    }

    if (businessId == null) {
      setTransactions([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name),
          users (username)
        `)
        .eq('business_id', businessId)
        .order('datetime', { ascending: false })

      if (error) throw error

      const transformedData = data?.map(sale => {
        const isPartialPayment = sale.notes && (
          sale.notes.includes('PARTIAL PAYMENT') ||
          sale.notes.includes('Amount Paid Today') ||
          sale.notes.includes('Remaining Balance')
        )

        let partialAmount = 0
        let remainingAmount = 0
        let partialNotes = ''

        if (isPartialPayment && sale.notes) {
          const notes = sale.notes
          const paidMatch = notes.match(/Amount Paid Today:\s*[^0-9]*(\d+\.?\d*)/i)
          if (paidMatch) {
            partialAmount = parseFloat(paidMatch[1])
          }

          const remainingMatch = notes.match(/Remaining Balance:\s*[^0-9]*(\d+\.?\d*)/i)
          if (remainingMatch) {
            remainingAmount = parseFloat(remainingMatch[1])
          }

          const partialNotesMatch = notes.match(/Partial Payment Notes:\s*(.+?)(?:\n\n|\n---|$)/is)
          if (partialNotesMatch) {
            partialNotes = partialNotesMatch[1].trim()
          }
        }

        const fullOrderTotal = isPartialPayment ? (partialAmount + remainingAmount) : sale.total_amount

        return {
          ...sale,
          total_amount: fullOrderTotal,
          customer_name: sale.customers?.name || 'Walk-in Customer',
          cashier_name: sale.users?.username || 'Unknown',
          partial_payment: isPartialPayment,
          partial_amount: partialAmount,
          remaining_amount: remainingAmount,
          partial_notes: partialNotes
        }
      }) || []

      setTransactions(transformedData)
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }, [businessId, businessLoading])

  const resolvePartialPayment = useCallback(async (saleId: number) => {
    if (businessId == null) {
      setError('No business selected to resolve payments')
      return false
    }

    try {
      const { data: currentSale, error: fetchError } = await supabase
        .from('sales')
        .select('*')
        .eq('sale_id', saleId)
        .eq('business_id', businessId)
        .single()

      if (fetchError) throw fetchError

      if (!currentSale) {
        throw new Error('Transaction not found')
      }

      const isPartialPayment = currentSale.notes && (
        currentSale.notes.includes('PARTIAL PAYMENT') ||
        currentSale.notes.includes('Amount Paid Today') ||
        currentSale.notes.includes('Remaining Balance')
      )

      if (!isPartialPayment) {
        throw new Error('This transaction is not a partial payment')
      }

      let fullOrderTotal = currentSale.total_amount
      if (currentSale.notes) {
        const paidMatch = currentSale.notes.match(/Amount Paid Today:\s*[^0-9]*(\d+\.?\d*)/i)
        const remainingMatch = currentSale.notes.match(/Remaining Balance:\s*[^0-9]*(\d+\.?\d*)/i)

        if (paidMatch && remainingMatch) {
          const paidAmount = parseFloat(paidMatch[1])
          const remainingAmount = parseFloat(remainingMatch[1])
          fullOrderTotal = paidAmount + remainingAmount
        }
      }

      const updatedNotes = currentSale.notes
        ? currentSale.notes.replace(
            /PARTIAL PAYMENT.*$/s,
            'PAYMENT COMPLETED - Full amount paid'
          )
        : 'PAYMENT COMPLETED - Full amount paid'

      const { error: updateError } = await supabase
        .from('sales')
        .update({
          total_amount: fullOrderTotal,
          notes: updatedNotes
        })
        .eq('sale_id', saleId)
        .eq('business_id', businessId)

      if (updateError) throw updateError

      await fetchTransactions()
      return true
    } catch (err) {
      console.error('Error resolving partial payment:', err)
      setError(err instanceof Error ? err.message : 'Failed to resolve partial payment')
      return false
    }
  }, [businessId, fetchTransactions])

  const deleteTransaction = useCallback(async (saleId: number) => {
    if (businessId == null) {
      setError('No business selected to delete transactions')
      return false
    }

    try {
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          *,
          products (stock_quantity)
        `)
        .eq('sale_id', saleId)

      if (itemsError) throw itemsError

      for (const item of saleItems || []) {
        const newStock = (item.products?.stock_quantity || 0) + item.quantity

        const { error: stockError } = await supabase
          .from('products')
          .update({ stock_quantity: newStock })
          .eq('product_id', item.product_id)
          .eq('business_id', businessId)

        if (stockError) throw stockError

        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert({
            product_id: item.product_id,
            quantity_change: item.quantity,
            movement_type: 'Restock',
            reference_id: saleId,
            business_id: businessId
          })

        if (movementError) throw movementError
      }

      const { error: deleteItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId)

      if (deleteItemsError) throw deleteItemsError

      const { error: deleteSaleError } = await supabase
        .from('sales')
        .delete()
        .eq('sale_id', saleId)
        .eq('business_id', businessId)

      if (deleteSaleError) throw deleteSaleError

      await fetchTransactions()
      return true
    } catch (err) {
      console.error('Error deleting transaction:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete transaction')
      return false
    }
  }, [businessId, fetchTransactions])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  return {
    transactions,
    loading: businessLoading || loading,
    error: error ?? businessError ?? null,
    fetchTransactions,
    deleteTransaction,
    resolvePartialPayment
  }
}
