import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Product, SideBusinessItem } from '../types/sales'

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [sideBusinessItems, setSideBusinessItems] = useState<SideBusinessItem[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [filteredSideBusinessItems, setFilteredSideBusinessItems] = useState<SideBusinessItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [topProducts, setTopProducts] = useState<Product[]>([])
  const [showAllProducts, setShowAllProducts] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [productsPerPage] = useState(20)
  const [totalProducts, setTotalProducts] = useState(0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSwitchingMode, setIsSwitchingMode] = useState(false)
  const [isFiltering, setIsFiltering] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchProducts = async (page: number = 1, limit: number = 20, category?: string, search?: string, isLoadMore: boolean = false) => {
    try {
      if (!isLoadMore) {
        if (page === 1 && showAllProducts) {
          setIsFiltering(true)
        } else {
          setLoading(true)
        }
      } else {
        setIsLoadingMore(true)
      }
      
      // Build query with pagination
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .order('name')
        .range((page - 1) * limit, page * limit - 1)

      // Add category filter if not 'All'
      if (category && category !== 'All') {
        query = query.eq('category', category)
      }

      // Add search filter if provided
      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`)
      }

      const { data: productsData, error: productsError, count } = await query

      if (productsError) throw productsError

      // Fetch side business items (these are typically fewer, so we can load all)
      const { data: sideBusinessData, error: sideBusinessError } = await supabase
        .from('side_business_items')
        .select(`
          *,
          side_businesses (name, business_type)
        `)
        .order('name')

      if (sideBusinessError) throw sideBusinessError

      if (page === 1 || !isLoadMore) {
        // First page or not loading more - replace products
        setProducts(productsData || [])
      } else {
        // Subsequent pages - append products
        setProducts(prev => [...prev, ...(productsData || [])])
      }
      
      setSideBusinessItems(sideBusinessData || [])
      setTotalProducts(count || 0)
      
      // Fetch top 5 most sold products only once
      if (page === 1) {
        await fetchTopProducts(productsData || [])
      }
      
      // Extract unique categories for products (only on first load)
      if (page === 1) {
        const productCategories = productsData?.map(p => p.category).filter(Boolean) || []
        
        // Extract unique categories for side business items
        const sideBusinessCategories = sideBusinessData?.map(item => item.side_businesses?.name).filter(Boolean) || []
        
        // Combine all categories
        const allCategories = ['All', ...new Set([...productCategories, ...sideBusinessCategories])]
        setCategories(allCategories)
      }
    } catch (error) {
      // Error fetching products - handled silently per user preference
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
      setIsFiltering(false)
    }
  }

  const fetchTopProducts = async (allProducts: Product[]) => {
    try {
      // Get sales data to find most sold products
      const { data: salesData, error: salesError } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .not('product_id', 'is', null)

      if (salesError) {
        // Error fetching sales data - handled silently per user preference
        // If we can't get sales data, just use the first 5 products
        setTopProducts(allProducts.slice(0, 5))
        return
      }

      // Count total quantity sold for each product
      const productSalesCount: { [key: string]: number } = {}
      salesData?.forEach(sale => {
        if (sale.product_id) {
          productSalesCount[sale.product_id] = (productSalesCount[sale.product_id] || 0) + sale.quantity
        }
      })

      // Sort products by sales count and get top 5
      const sortedProducts = allProducts
        .map(product => ({
          ...product,
          salesCount: productSalesCount[product.product_id] || 0
        }))
        .sort((a, b) => b.salesCount - a.salesCount)
        .slice(0, 5)

      setTopProducts(sortedProducts)
    } catch (error) {
      // Error fetching top products - handled silently per user preference
      // Fallback to first 5 products
      setTopProducts(allProducts.slice(0, 5))
    }
  }

  const filterProducts = () => {
    if (!showAllProducts) {
      // For "Top Products" mode, filter the cached top products client-side
      let filteredProducts = topProducts

      if (selectedCategory !== 'All') {
        filteredProducts = filteredProducts.filter(p => p.category === selectedCategory)
      }

      if (searchTerm) {
        filteredProducts = filteredProducts.filter(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      setFilteredProducts(filteredProducts)
    } else {
      // For "Show All" mode, use the products from server-side filtering
      setFilteredProducts(products)
    }

    // Filter side business items (client-side since there are typically fewer)
    let filteredSideBusiness = sideBusinessItems

    if (selectedCategory !== 'All') {
      filteredSideBusiness = filteredSideBusiness.filter(item => 
        item.side_businesses?.name === selectedCategory
      )
    }

    if (searchTerm) {
      filteredSideBusiness = filteredSideBusiness.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredSideBusinessItems(filteredSideBusiness)
  }

  const loadMoreProducts = () => {
    if (!isLoadingMore && showAllProducts && (currentPage * productsPerPage) < totalProducts) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      fetchProducts(nextPage, productsPerPage, selectedCategory, searchTerm, true)
    }
  }

  const handleShowAllToggle = () => {
    const newShowAll = !showAllProducts
    setIsSwitchingMode(true)
    setShowAllProducts(newShowAll)
    
    if (newShowAll) {
      // Switching to "Show All" mode - fetch first page with current filters
      setCurrentPage(1)
      fetchProducts(1, productsPerPage, selectedCategory, searchTerm).finally(() => {
        setIsSwitchingMode(false)
      })
    } else {
      // Switching to "Top Products" mode - show cached top products
      setFilteredProducts(topProducts)
      setIsSwitchingMode(false)
    }
  }

  // Effects
  useEffect(() => {
    // Load initial products - only top products by default
    fetchProducts(1, productsPerPage)
  }, [])

  useEffect(() => {
    // Always filter products based on current mode
    filterProducts()
  }, [products, sideBusinessItems, selectedCategory, searchTerm, showAllProducts, topProducts])

  // Initial setup effect
  useEffect(() => {
    if (topProducts.length > 0 && filteredProducts.length === 0) {
      setFilteredProducts(topProducts)
    }
  }, [topProducts, filteredProducts.length])

  // Separate effect for handling category/search changes in "Show All" mode with debounce
  useEffect(() => {
    if (showAllProducts && !isSwitchingMode) {
      setCurrentPage(1)
      
      // Debounce the API call to prevent too many requests
      const timeoutId = setTimeout(() => {
        fetchProducts(1, productsPerPage, selectedCategory, searchTerm)
      }, 300) // 300ms debounce

      return () => clearTimeout(timeoutId)
    }
  }, [selectedCategory, searchTerm, showAllProducts, isSwitchingMode])

  return {
    // State
    products,
    sideBusinessItems,
    filteredProducts,
    filteredSideBusinessItems,
    categories,
    selectedCategory,
    searchTerm,
    topProducts,
    showAllProducts,
    currentPage,
    productsPerPage,
    totalProducts,
    isLoadingMore,
    isSwitchingMode,
    isFiltering,
    loading,
    
    // Actions
    setSelectedCategory,
    setSearchTerm,
    handleShowAllToggle,
    loadMoreProducts,
    fetchProducts
  }
}
