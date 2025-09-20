import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Transaction, TransactionItem } from './useTransactions'
import { useBusinessId } from './useBusinessId'

export interface Customer {
  customer_id: number
  name: string
}

export const useTransactionDetails = (transactionId: number | null) => {
  const { businessId, businessLoading, businessError } = useBusinessId()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [items, setItems] = useState<TransactionItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactionDetails = useCallback(async () => {
    if (!transactionId || businessId == null || businessLoading) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data: transactionData, error: transactionError } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name),
          users (username)
        `)
        .eq('sale_id', transactionId)
        .eq('business_id', businessId)
        .single()

      if (transactionError) throw transactionError

      const transformedTransaction: Transaction = {
        ...transactionData,
        customer_name: transactionData.customers?.name || 'Walk-in Customer',
        cashier_name: transactionData.users?.username || 'Unknown'
      }

      setTransaction(transformedTransaction)

      const { data: itemsData, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          *,
          products (name, category)
        `)
        .eq('sale_id', transactionId)

      if (itemsError) throw itemsError

      const transformedItems: TransactionItem[] = (itemsData || []).map(item => ({
        ...item,
        product_name: item.products?.name || 'Unknown Product',
        product_category: item.products?.category || 'Uncategorized'
      }))

      setItems(transformedItems)
    } catch (err) {
      console.error('Failed to fetch transaction details:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction details')
    } finally {
      setLoading(false)
    }
  }, [businessId, businessLoading, transactionId])

  const fetchCustomers = useCallback(async () => {
    if (businessId == null || businessLoading) {
      return
    }

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('customer_id, name')
        .eq('business_id', businessId)
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    }
  }, [businessId, businessLoading])

  const updateTransaction = useCallback(async (updates: {
    payment_method?: string
    customer_id?: number
  }) => {
    if (!transactionId || businessId == null) {
      return false
    }

    try {
      const { error: updateError } = await supabase
        .from('sales')
        .update(updates)
        .eq('sale_id', transactionId)
        .eq('business_id', businessId)

      if (updateError) throw updateError

      await fetchTransactionDetails()
      return true
    } catch (err) {
      console.error('Failed to update transaction:', err)
      setError(err instanceof Error ? err.message : 'Failed to update transaction')
      return false
    }
  }, [businessId, fetchTransactionDetails, transactionId])

  const updateItemQuantity = useCallback(async (saleItemId: number, newQuantity: number) => {
    if (!transactionId) {
      return false
    }

    try {
      const { error } = await supabase
        .from('sale_items')
        .update({ quantity: newQuantity })
        .eq('sale_item_id', saleItemId)
        .eq('sale_id', transactionId)

      if (error) throw error

      await fetchTransactionDetails()
      return true
    } catch (err) {
      console.error('Failed to update item quantity:', err)
      setError(err instanceof Error ? err.message : 'Failed to update item quantity')
      return false
    }
  }, [fetchTransactionDetails, transactionId])

  const removeItem = useCallback(async (saleItemId: number) => {
    if (!transactionId) {
      return false
    }

    try {
      const { error } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_item_id', saleItemId)
        .eq('sale_id', transactionId)

      if (error) throw error

      await fetchTransactionDetails()
      return true
    } catch (err) {
      console.error('Failed to remove item:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove item')
      return false
    }
  }, [fetchTransactionDetails, transactionId])

  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetails()
      fetchCustomers()
    }
  }, [transactionId, fetchTransactionDetails, fetchCustomers])

  return {
    transaction,
    items,
    customers,
    loading: businessLoading || loading,
    error: error ?? businessError ?? null,
    updateTransaction,
    updateItemQuantity,
    removeItem,
    fetchTransactionDetails
  }
}
