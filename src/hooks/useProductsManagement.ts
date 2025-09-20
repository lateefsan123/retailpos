import { useState, useEffect, useCallback } from 'react'
import type { KeyboardEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useBusinessId } from './useBusinessId'

interface Product {
  product_id: string
  name: string
  category: string
  price: number
  stock_quantity: number
  supplier_info: string
  reorder_level: number
  tax_rate: number
  image_url?: string
  last_updated: string
  weight_unit?: string | null
  price_per_unit?: number | null
  is_weighted?: boolean
  description?: string
  sku?: string
  business_id: number
  sales_count?: number
  total_revenue?: number
  last_sold_date?: string
}

interface NewProduct {
  product_name: string
  category: string
  price: string
  stock_quantity: string
  reorder_level: string
  supplier_info: string
  tax_rate: string
  description: string
  sku: string
  is_weighted: boolean
  weight_unit: string
  price_per_unit: string
}

export const useProductsManagement = () => {
  const { businessId, businessLoading, businessError } = useBusinessId()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalProducts, setTotalProducts] = useState(0)
  const [distinctCategories, setDistinctCategories] = useState<string[]>([])

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  const transformFormToProductData = (formData: NewProduct, productId?: string) => {
    const validateNumericField = (value: string, fieldName: string) => {
      if (!value || value.trim() === '') {
        throw new Error(`${fieldName} is required`)
      }
      const parsed = parseFloat(value)
      if (Number.isNaN(parsed)) {
        throw new Error(`${fieldName} must be a valid number`)
      }
      return parsed
    }

    const validateIntegerField = (value: string, fieldName: string) => {
      if (!value || value.trim() === '') {
        throw new Error(`${fieldName} is required`)
      }
      const parsed = parseInt(value, 10)
      if (Number.isNaN(parsed) || !Number.isInteger(parsed)) {
        throw new Error(`${fieldName} must be a valid whole number`)
      }
      return parsed
    }

    const baseData = {
      name: formData.product_name?.trim() || (() => { throw new Error('Product name is required') })(),
      category: formData.category?.trim() || (() => { throw new Error('Category is required') })(),
      price: formData.is_weighted ? 0 : validateNumericField(formData.price, 'Price'),
      stock_quantity: validateIntegerField(formData.stock_quantity, 'Stock quantity'),
      supplier_info: formData.supplier_info?.trim() || '',
      reorder_level: validateIntegerField(formData.reorder_level, 'Reorder level'),
      tax_rate: formData.tax_rate ? validateNumericField(formData.tax_rate, 'Tax rate') : 0,
      last_updated: new Date().toISOString(),
      is_weighted: formData.is_weighted || false,
      weight_unit: formData.is_weighted ? formData.weight_unit : null,
      price_per_unit: formData.is_weighted && formData.price_per_unit
        ? validateNumericField(formData.price_per_unit, 'Price per unit')
        : null,
      description: formData.description?.trim() || '',
      sku: formData.sku?.trim() || ''
    }

    return productId ? { ...baseData, product_id: productId } : baseData
  }

  const fetchProducts = useCallback(async (
    page = 1,
    limit = 10,
    search = '',
    category = 'all',
    scopedBusinessId?: number
  ) => {
    if (businessLoading) {
      setLoading(true)
      return
    }

    const effectiveBusinessId = scopedBusinessId ?? businessId
    if (effectiveBusinessId == null) {
      setProducts([])
      setTotalProducts(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('business_id', effectiveBusinessId)

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`
        )
      }

      if (category !== 'all') {
        query = query.eq('category', category)
      }

      const from = (page - 1) * limit
      const to = from + limit - 1

      const { data, error, count } = await query
        .range(from, to)
        .order('last_updated', { ascending: false })

      if (error) {
        throw error
      }

      setProducts(data || [])
      setTotalProducts(count || 0)
      setCurrentPage(page)
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    } finally {
      setLoading(false)
    }
  }, [businessId, businessLoading])

  const fetchDistinctCategories = useCallback(async (scopedBusinessId?: number) => {
    if (businessLoading) {
      return
    }

    const effectiveBusinessId = scopedBusinessId ?? businessId
    if (effectiveBusinessId == null) {
      setDistinctCategories([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('business_id', effectiveBusinessId)
        .not('category', 'is', null)
        .not('category', 'eq', '')

      if (error) {
        console.error('Error fetching categories:', error)
        return
      }

      const uniqueCategories = Array.from(new Set((data || []).map(item => item.category)))
        .filter(Boolean)
        .map(category => category!.trim())
        .filter(category => category.length > 0)
        .sort()

      setDistinctCategories(uniqueCategories)
    } catch (err) {
      console.error('Error fetching distinct categories:', err)
    }
  }, [businessId, businessLoading])

  const addProduct = async (newProduct: NewProduct, scopedBusinessId?: number) => {
    const effectiveBusinessId = scopedBusinessId ?? businessId
    if (effectiveBusinessId == null) {
      throw new Error('No business selected for creating products')
    }

    try {
      const productId = generateUUID()
      const productData = transformFormToProductData(newProduct, productId)
      const productDataWithBusiness = {
        ...productData,
        business_id: effectiveBusinessId
      }

      const { data, error: insertError } = await supabase
        .from('products')
        .insert([productDataWithBusiness])
        .select()

      if (insertError) {
        throw insertError
      }

      const insertedProduct = data?.[0]
      if (insertedProduct) {
        setProducts(prev => [...prev, insertedProduct])
        setTotalProducts(prevTotal => prevTotal + 1)
      }

      await fetchDistinctCategories(effectiveBusinessId)
      return insertedProduct
    } catch (err) {
      console.error('Error adding product:', err)
      throw err
    }
  }

  const updateProduct = async (productId: string, updatedProduct: NewProduct) => {
    if (businessId == null) {
      throw new Error('No business selected for updating products')
    }

    try {
      const productData = transformFormToProductData(updatedProduct)

      const { data, error: updateError } = await supabase
        .from('products')
        .update(productData)
        .eq('product_id', productId)
        .eq('business_id', businessId)
        .select()

      if (updateError) {
        throw updateError
      }

      const updatedRecord = data?.[0]
      if (updatedRecord) {
        setProducts(prev => prev.map(p => (p.product_id === productId ? updatedRecord : p)))
      }

      await fetchDistinctCategories(businessId)
      return updatedRecord
    } catch (err) {
      console.error('Error updating product:', err)
      throw err
    }
  }

  const deleteProduct = async (productId: string) => {
    if (businessId == null) {
      throw new Error('No business selected for deleting products')
    }

    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('product_id', productId)
        .eq('business_id', businessId)

      if (deleteError) {
        throw deleteError
      }

      setProducts(prev => prev.filter(p => p.product_id !== productId))
      setTotalProducts(prevTotal => Math.max(0, prevTotal - 1))
      await fetchDistinctCategories(businessId)
    } catch (err) {
      console.error('Error deleting product:', err)
      throw err
    }
  }

  const handleSearchSubmit = () => {
    setCurrentPage(1)
    fetchProducts(1, itemsPerPage, searchTerm, selectedCategory)
  }

  const handleSearchKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchSubmit()
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(totalProducts / itemsPerPage)) {
      fetchProducts(newPage, itemsPerPage, searchTerm, selectedCategory)
    }
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
    fetchProducts(1, newItemsPerPage, searchTerm, selectedCategory)
  }

  const getCategorySuggestions = (input: string) => {
    if (!input || input.length < 2) return []

    return distinctCategories
      .filter(category =>
        category.toLowerCase().includes(input.toLowerCase()) ||
        input.toLowerCase().includes(category.toLowerCase()) ||
        category.toLowerCase().split(' ').some(word =>
          word.includes(input.toLowerCase()) || input.toLowerCase().includes(word)
        )
      )
      .slice(0, 5)
  }

  useEffect(() => {
    fetchProducts()
    fetchDistinctCategories()
  }, [fetchProducts, fetchDistinctCategories])

  return {
    products,
    loading: businessLoading || loading,
    error: error ?? businessError ?? null,
    searchTerm,
    selectedCategory,
    currentPage,
    itemsPerPage,
    totalProducts,
    distinctCategories,
    setSearchTerm,
    setSelectedCategory,
    setError,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    handleSearchSubmit,
    handleSearchKeyPress,
    handlePageChange,
    handleItemsPerPageChange,
    getCategorySuggestions,
    transformFormToProductData
  }
}
