import { useMemo } from 'react'
import { useProductsData } from '../data/useProductsData'

export const useProducts = () => {
  const { data: productsData, isLoading, error } = useProductsData()
  
  const products = useMemo(() => productsData?.products || [], [productsData])
  const sideBusinessItems = useMemo(() => productsData?.sideBusinessItems || [], [productsData])
  const categories = useMemo(() => productsData?.categories || [], [productsData])
  
  return {
    products,
    sideBusinessItems,
    categories,
    loading: isLoading,
    error: error?.message || null
  }
}
