import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

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
  const [lowStockItems, setLowStockItems] = useState<LowStockProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLowStockItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .lt('stock_quantity', 10) // Less than 10 items in stock
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
  }

  const restockProduct = async (productId: string, quantity: number) => {
    try {
      setError(null)

      // Update the product stock quantity
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: quantity,
          last_updated: new Date().toISOString()
        })
        .eq('product_id', productId)

      if (updateError) {
        throw updateError
      }

      // Log the inventory movement
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: productId,
          quantity_change: quantity,
          movement_type: 'Restock',
          datetime: new Date().toISOString()
        })

      if (movementError) {
        console.warn('Failed to log inventory movement:', movementError)
        // Don't throw here as the main operation succeeded
      }

      // Refresh the low stock items list
      await fetchLowStockItems()
      
      return true
    } catch (err) {
      console.error('Error restocking product:', err)
      setError(err instanceof Error ? err.message : 'Failed to restock product')
      return false
    }
  }

  const quickRestock = async (productId: string) => {
    // Find the product to get its reorder level
    const product = lowStockItems.find(item => item.product_id === productId)
    if (!product) {
      setError('Product not found')
      return false
    }

    // Restock to 2x the reorder level (or minimum 20 if reorder level is very low)
    const restockQuantity = Math.max(product.reorder_level * 2, 20)
    
    return await restockProduct(productId, restockQuantity)
  }

  useEffect(() => {
    fetchLowStockItems()
  }, [])

  return {
    lowStockItems,
    loading,
    error,
    fetchLowStockItems,
    restockProduct,
    quickRestock
  }
}
