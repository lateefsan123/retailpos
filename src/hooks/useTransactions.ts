import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = async () => {
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
        .order('datetime', { ascending: false })

      if (error) throw error

      const transformedData = data?.map(sale => {
        // Check if this is a partial payment by looking for partial payment indicators in notes
        const isPartialPayment = sale.notes && (
          sale.notes.includes('PARTIAL PAYMENT') || 
          sale.notes.includes('Amount Paid Today') ||
          sale.notes.includes('Remaining Balance')
        )
        
        let partialAmount = 0
        let remainingAmount = 0
        let partialNotes = ''
        
        if (isPartialPayment && sale.notes) {
          // Parse partial payment information from notes
          const notes = sale.notes
          
          // Extract amount paid (matches format: "Amount Paid Today: €X.XX")
          const paidMatch = notes.match(/Amount Paid Today:\s*€(\d+\.?\d*)/i)
          if (paidMatch) {
            partialAmount = parseFloat(paidMatch[1])
          }
          
          // Extract remaining balance (matches format: "Remaining Balance: €X.XX")
          const remainingMatch = notes.match(/Remaining Balance:\s*€(\d+\.?\d*)/i)
          if (remainingMatch) {
            remainingAmount = parseFloat(remainingMatch[1])
          }
          
          // Extract partial payment notes (look for "Partial Payment Notes:" section)
          const partialNotesMatch = notes.match(/Partial Payment Notes:\s*(.+?)(?:\n\n|\n---|$)/is)
          if (partialNotesMatch) {
            partialNotes = partialNotesMatch[1].trim()
          }
        }
        
        // For partial payments, the total_amount in database is the amount paid
        // We need to calculate the full order total from partial + remaining
        const fullOrderTotal = isPartialPayment ? 
          (partialAmount + remainingAmount) : 
          sale.total_amount
        
        return {
          ...sale,
          total_amount: fullOrderTotal, // Use the full order total for display
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
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setLoading(false)
    }
  }

  const resolvePartialPayment = async (saleId: number) => {
    try {
      // First, get the current transaction to understand its structure
      const { data: currentSale, error: fetchError } = await supabase
        .from('sales')
        .select('*')
        .eq('sale_id', saleId)
        .single()

      if (fetchError) throw fetchError

      if (!currentSale) {
        throw new Error('Transaction not found')
      }

      // Check if this is actually a partial payment
      const isPartialPayment = currentSale.notes && (
        currentSale.notes.includes('PARTIAL PAYMENT') || 
        currentSale.notes.includes('Amount Paid Today') ||
        currentSale.notes.includes('Remaining Balance')
      )

      if (!isPartialPayment) {
        throw new Error('This transaction is not a partial payment')
      }

      // Parse the current notes to get the full order total
      let fullOrderTotal = currentSale.total_amount
      if (currentSale.notes) {
        const paidMatch = currentSale.notes.match(/Amount Paid Today:\s*€(\d+\.?\d*)/i)
        const remainingMatch = currentSale.notes.match(/Remaining Balance:\s*€(\d+\.?\d*)/i)
        
        if (paidMatch && remainingMatch) {
          const paidAmount = parseFloat(paidMatch[1])
          const remainingAmount = parseFloat(remainingMatch[1])
          fullOrderTotal = paidAmount + remainingAmount
        }
      }

      // Update the transaction to mark it as fully paid
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

      if (updateError) throw updateError

      // Refresh transactions
      await fetchTransactions()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve partial payment')
      return false
    }
  }

  const deleteTransaction = async (saleId: number) => {
    try {
      // Fetch sale items to restore stock
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          *,
          products (stock_quantity)
        `)
        .eq('sale_id', saleId)

      if (itemsError) throw itemsError

      // Restore stock for each item
      for (const item of saleItems || []) {
        const newStock = (item.products?.stock_quantity || 0) + item.quantity
        
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock_quantity: newStock })
          .eq('product_id', item.product_id)

        if (stockError) throw stockError

        // Log inventory movement
        await supabase
          .from('inventory_movements')
          .insert({
            product_id: item.product_id,
            quantity_change: item.quantity,
            movement_type: 'Restock',
            reference_id: saleId
          })
      }

      // Delete sale items
      const { error: deleteItemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId)

      if (deleteItemsError) throw deleteItemsError

      // Delete sale
      const { error: deleteSaleError } = await supabase
        .from('sales')
        .delete()
        .eq('sale_id', saleId)

      if (deleteSaleError) throw deleteSaleError

      // Refresh transactions
      await fetchTransactions()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction')
      return false
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    deleteTransaction,
    resolvePartialPayment
  }
}
