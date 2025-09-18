import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

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
  // State
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalProducts, setTotalProducts] = useState(0)
  const [distinctCategories, setDistinctCategories] = useState<string[]>([])

  // Generate UUID for new products
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Transform form data to product data with proper validation
  const transformFormToProductData = (formData: NewProduct, productId?: string) => {
    // Validate numeric inputs before parsing
    const validateNumericField = (value: string, fieldName: string) => {
      if (!value || value.trim() === '') {
        throw new Error(`${fieldName} is required`)
      }
      const parsed = parseFloat(value)
      if (isNaN(parsed)) {
        throw new Error(`${fieldName} must be a valid number`)
      }
      return parsed
    }

    const validateIntegerField = (value: string, fieldName: string) => {
      if (!value || value.trim() === '') {
        throw new Error(`${fieldName} is required`)
      }
      const parsed = parseInt(value)
      if (isNaN(parsed) || !Number.isInteger(parsed)) {
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
      price_per_unit: formData.is_weighted && formData.price_per_unit ? 
        validateNumericField(formData.price_per_unit, 'Price per unit') : null,
      description: formData.description?.trim() || '',
      sku: formData.sku?.trim() || ''
    }
    
    return productId ? { ...baseData, product_id: productId } : baseData
  }

  // Fetch products with pagination and filtering
  const fetchProducts = async (page = 1, limit = 10, search = '', category = 'all') => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })

      // Apply search filter
      if (search.trim()) {
        query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`)
      }

      // Apply category filter
      if (category !== 'all') {
        query = query.eq('category', category)
      }

      // Apply pagination
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to).order('last_updated', { ascending: false })

      const { data, error, count } = await query

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
  }

  // Fetch distinct categories from database
  const fetchDistinctCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)
        .not('category', 'eq', '')

      if (error) {
        console.error('Error fetching categories:', error)
        return
      }

      // Extract unique categories and sort them
      const uniqueCategories = Array.from(new Set(data.map(item => item.category)))
        .filter(category => category && category.trim() !== '')
        .sort()

      setDistinctCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching distinct categories:', error)
    }
  }

  // Add new product
  const addProduct = async (newProduct: NewProduct) => {
    try {
      const productId = generateUUID()
      const productData = transformFormToProductData(newProduct, productId)

      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()

      if (error) {
        throw error
      }

      // Update local state
      setProducts(prevProducts => [...prevProducts, productData])
      setTotalProducts(prevTotal => prevTotal + 1)
      
      // Refresh categories list
      fetchDistinctCategories()

      return data[0]
    } catch (error) {
      console.error('Error adding product:', error)
      throw error
    }
  }

  // Update existing product
  const updateProduct = async (productId: string, updatedProduct: NewProduct) => {
    try {
      const productData = transformFormToProductData(updatedProduct)

      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('product_id', productId)
        .select()

      if (error) {
        throw error
      }

      // Update local state
      setProducts(products.map(p => 
        p.product_id === productId ? data[0] : p
      ))
      
      // Refresh categories list
      fetchDistinctCategories()

      return data[0]
    } catch (error) {
      console.error('Error updating product:', error)
      throw error
    }
  }

  // Delete product
  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('product_id', productId)

      if (error) {
        throw error
      }

      // Update local state
      setProducts(products.filter(p => p.product_id !== productId))
      setTotalProducts(prevTotal => Math.max(0, prevTotal - 1))
    } catch (error) {
      console.error('Error deleting product:', error)
      throw error
    }
  }

  // Search handlers
  const handleSearchSubmit = () => {
    setCurrentPage(1)
    fetchProducts(1, itemsPerPage, searchTerm, selectedCategory)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit()
    }
  }

  // Pagination handlers
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

  // Category suggestions
  const getCategorySuggestions = (input: string) => {
    if (!input || input.length < 2) return []
    
    return distinctCategories.filter(category => 
      category.toLowerCase().includes(input.toLowerCase()) ||
      input.toLowerCase().includes(category.toLowerCase()) ||
      // Check for similar words (simple similarity check)
      category.toLowerCase().split(' ').some(word => 
        word.includes(input.toLowerCase()) || input.toLowerCase().includes(word)
      )
    ).slice(0, 5) // Limit to 5 suggestions
  }

  // Initialize
  useEffect(() => {
    fetchProducts()
    fetchDistinctCategories()
  }, [])

  return {
    // State
    products,
    loading,
    error,
    searchTerm,
    selectedCategory,
    currentPage,
    itemsPerPage,
    totalProducts,
    distinctCategories,
    
    // Setters
    setSearchTerm,
    setSelectedCategory,
    setError,
    
    // Functions
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
