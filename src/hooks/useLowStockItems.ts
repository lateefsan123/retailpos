import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useBusinessId } from './useBusinessId'

export interface LowStockProduct {
  product_id: string
  name: string
  category: string
  price: number
  stock_quantity: number
  reorder_level: number
  image_url?: string
}

export const useLowStockItems = () => {
  const { businessId, businessLoading, businessError } = useBusinessId()
  const [lowStockItems, setLowStockItems] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLowStockItems = useCallback(async () => {
    if (businessId == null || businessLoading) {
      setLowStockItems([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .lt('stock_quantity', 10)
        .order('stock_quantity', { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      setLowStockItems(data || [])
    } catch (err) {
      console.error('Error fetching low stock items:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch low stock items')
    } finally {
      setLoading(false)
    }
  }, [businessId, businessLoading])

  const restockProduct = useCallback(async (productId: string, quantity: number) => {
    if (businessId == null) {
      setError('No business selected to restock products')
      return false
    }

    try {
      setError(null)

      const { error: updateError } = await supabase
        .from('products')
        .update({
          stock_quantity: quantity,
          last_updated: new Date().toISOString()
        })
        .eq('product_id', productId)
        .eq('business_id', businessId)

      if (updateError) {
        throw updateError
      }

      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: productId,
          quantity_change: quantity,
          movement_type: 'Restock',
          datetime: new Date().toISOString(),
          business_id: businessId
        })

      if (movementError) {
        console.warn('Failed to log inventory movement:', movementError)
      }

      await fetchLowStockItems()
      return true
    } catch (err) {
      console.error('Error restocking product:', err)
      setError(err instanceof Error ? err.message : 'Failed to restock product')
      return false
    }
  }, [businessId, fetchLowStockItems])

  const quickRestock = useCallback(async (productId: string) => {
    const product = lowStockItems.find(item => item.product_id === productId)
    if (!product) {
      setError('Product not found')
      return false
    }

    const restockQuantity = Math.max(product.reorder_level * 2, 20)
    return restockProduct(productId, restockQuantity)
  }, [lowStockItems, restockProduct])

  useEffect(() => {
    fetchLowStockItems()
  }, [fetchLowStockItems])

  return {
    lowStockItems,
    loading: businessLoading || loading,
    error: error ?? businessError ?? null,
    fetchLowStockItems,
    restockProduct,
    quickRestock
  }
}
