import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Transaction, TransactionItem } from './useTransactions'

export interface Customer {
  customer_id: number
  name: string
}

export const useTransactionDetails = (transactionId: number | null) => {
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [items, setItems] = useState<TransactionItem[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactionDetails = async () => {
    if (!transactionId) return

    try {
      setLoading(true)
      setError(null)

      // Fetch transaction details
      const { data: transactionData, error: transactionError } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name),
          users (username)
        `)
        .eq('sale_id', transactionId)
        .single()

      if (transactionError) throw transactionError

      const transformedTransaction = {
        ...transactionData,
        customer_name: transactionData.customers?.name || 'Walk-in Customer',
        cashier_name: transactionData.users?.username || 'Unknown'
      }

      setTransaction(transformedTransaction)

      // Fetch transaction items
      const { data: itemsData, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          *,
          products (name, category)
        `)
        .eq('sale_id', transactionId)

      if (itemsError) throw itemsError

      const transformedItems = itemsData?.map(item => ({
        ...item,
        product_name: item.products?.name || 'Unknown Product',
        product_category: item.products?.category || 'Uncategorized'
      })) || []

      setItems(transformedItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch transaction details')
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('customer_id, name')
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    }
  }

  const updateTransaction = async (updates: {
    payment_method?: string
    customer_id?: number
  }) => {
    if (!transactionId) return false

    try {
      const { error } = await supabase
        .from('sales')
        .update(updates)
        .eq('sale_id', transactionId)

      if (error) throw error

      await fetchTransactionDetails()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction')
      return false
    }
  }

  const updateItemQuantity = async (saleItemId: number, newQuantity: number) => {
    try {
      const { error } = await supabase
        .from('sale_items')
        .update({
          quantity: newQuantity
        })
        .eq('sale_item_id', saleItemId)

      if (error) throw error

      await fetchTransactionDetails()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item quantity')
      return false
    }
  }

  const removeItem = async (saleItemId: number) => {
    try {
      const { error } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_item_id', saleItemId)

      if (error) throw error

      await fetchTransactionDetails()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item')
      return false
    }
  }

  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetails()
      fetchCustomers()
    }
  }, [transactionId])

  return {
    transaction,
    items,
    customers,
    loading,
    error,
    updateTransaction,
    updateItemQuantity,
    removeItem,
    fetchTransactionDetails
  }
}
