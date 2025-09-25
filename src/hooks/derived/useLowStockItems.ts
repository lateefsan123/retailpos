import { useMemo } from 'react'
import { useProductsData } from '../data/useProductsData'
import { supabase } from '../../lib/supabaseClient'
import { useBusinessId } from '../useBusinessId'
import { useBranch } from '../../contexts/BranchContext'
import { useAuth } from '../../contexts/AuthContext'

export interface LowStockProduct {
  product_id: string
  name: string
  stock_quantity: number
  reorder_level: number
  category?: string
  supplier_info?: string
  is_low_stock: boolean
}

export const useLowStockItems = () => {
  const { data: productsData, isLoading, error, refetch } = useProductsData()
  const { businessId } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const { user } = useAuth()
  
  const lowStockProducts = useMemo(() => {
    if (!productsData?.products) return []
    
    return productsData.products
      .filter(product => product.stock_quantity <= product.reorder_level)
      .map(product => ({
        product_id: product.product_id,
        name: product.name,
        stock_quantity: product.stock_quantity,
        reorder_level: product.reorder_level,
        category: product.category,
        supplier_info: product.supplier_info,
        is_low_stock: true
      }))
      .sort((a, b) => a.stock_quantity - b.stock_quantity)
  }, [productsData])
  
  // Helper function to get current date/time in local format
  const getLocalDateTime = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
  }
  
  // Restock product with custom quantity
  const restockProduct = async (productId: string, quantity: number): Promise<boolean> => {
    if (!businessId || quantity <= 0) {
      console.error('Invalid business ID or quantity for restock')
      return false
    }

    try {
      console.log('Restocking product:', productId, 'with quantity:', quantity)
      
      // Get current product data
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity, reorder_level')
        .eq('product_id', productId)
        .eq('business_id', businessId)
        .single()

      if (fetchError || !product) {
        console.error('Error fetching product for restock:', fetchError)
        return false
      }

      const newStockQuantity = product.stock_quantity + quantity

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newStockQuantity,
          last_updated: getLocalDateTime()
        })
        .eq('product_id', productId)
        .eq('business_id', businessId)

      if (updateError) {
        console.error('Error updating product stock:', updateError)
        return false
      }

      // Record inventory movement (if table exists)
      try {
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert({
            product_id: productId,
            quantity_change: quantity,
            movement_type: 'Restock',
            reference_id: null, // Manual restock doesn't have a reference
            business_id: businessId,
            branch_id: selectedBranchId,
            notes: `Manual restock: +${quantity} units`,
            created_by: user?.user_id
          })

        if (movementError) {
          console.error('Error recording inventory movement:', movementError)
          // Don't fail the operation if movement recording fails
        }
      } catch (movementErr) {
        console.warn('Inventory movements table may not exist yet:', movementErr)
        // Don't fail the operation if table doesn't exist
      }

      // Refresh products data
      await refetch()
      
      console.log('Successfully restocked product:', productId)
      return true
    } catch (err) {
      console.error('Error in restockProduct:', err)
      return false
    }
  }
  
  // Quick restock - add 30 quantity
  const quickRestock = async (productId: string): Promise<boolean> => {
    if (!businessId) {
      console.error('Invalid business ID for quick restock')
      return false
    }

    try {
      console.log('Quick restocking product:', productId, 'adding 30 units')
      
      // Get current product data
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity')
        .eq('product_id', productId)
        .eq('business_id', businessId)
        .single()

      if (fetchError || !product) {
        console.error('Error fetching product for quick restock:', fetchError)
        return false
      }

      const quantityToAdd = 30
      const newStockQuantity = product.stock_quantity + quantityToAdd

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newStockQuantity,
          last_updated: getLocalDateTime()
        })
        .eq('product_id', productId)
        .eq('business_id', businessId)

      if (updateError) {
        console.error('Error updating product stock:', updateError)
        return false
      }

      // Record inventory movement (if table exists)
      try {
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert({
            product_id: productId,
            quantity_change: quantityToAdd,
            movement_type: 'Quick Restock',
            reference_id: null, // Quick restock doesn't have a reference
            business_id: businessId,
            branch_id: selectedBranchId,
            notes: `Quick restock: +${quantityToAdd} units`,
            created_by: user?.user_id
          })

        if (movementError) {
          console.error('Error recording inventory movement:', movementError)
          // Don't fail the operation if movement recording fails
        }
      } catch (movementErr) {
        console.warn('Inventory movements table may not exist yet:', movementErr)
        // Don't fail the operation if table doesn't exist
      }

      // Refresh products data
      await refetch()
      
      console.log('Successfully quick restocked product:', productId, 'added:', quantityToAdd)
      return true
    } catch (err) {
      console.error('Error in quickRestock:', err)
      return false
    }
  }
  
  return {
    lowStockProducts,
    lowStockItems: lowStockProducts, // For backward compatibility
    loading: isLoading,
    error: error?.message || null,
    restockProduct,
    quickRestock
  }
}
