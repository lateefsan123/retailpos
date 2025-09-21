import { useMemo } from 'react'
import { useProductsData } from '../data/useProductsData'

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
  const { data: productsData, isLoading, error } = useProductsData()
  
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
  
  // Mock functions for compatibility - these would need to be implemented with mutations
  const restockProduct = async (productId: string, quantity: number): Promise<boolean> => {
    console.log('Restock product:', productId, 'quantity:', quantity)
    // TODO: Implement actual restock mutation
    return true
  }
  
  const quickRestock = async (productId: string): Promise<boolean> => {
    console.log('Quick restock product:', productId)
    // TODO: Implement actual quick restock mutation
    return true
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
