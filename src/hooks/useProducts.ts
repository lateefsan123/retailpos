import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useBusinessId } from './useBusinessId'
import { Product, SideBusinessItem } from '../types/sales'

export const useProducts = () => {
  const { businessId, businessLoading } = useBusinessId()
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

  const fetchProducts = useCallback(async (page: number = 1, limit: number = 20, category?: string, search?: string, isLoadMore: boolean = false) => {
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

      if (businessId == null) {
        if (!isLoadMore) {
          setProducts([])
          setFilteredProducts([])
          setSideBusinessItems([])
          setFilteredSideBusinessItems([])
          setTotalProducts(0)
        }
        return
      }

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId)
        .order('name')
        .range((page - 1) * limit, page * limit - 1)

      if (category && category !== 'All') {
        query = query.eq('category', category)
      }

      if (search && search.trim()) {
        query = query.or(`name.ilike.%${search}%,category.ilike.%${search}%`)
      }

      const { data: productsData, error: productsError, count } = await query

      if (productsError) throw productsError

      const { data: sideBusinessData, error: sideBusinessError } = await supabase
        .from('side_business_items')
        .select(`
          *,
          side_businesses (name, business_type, parent_shop_id)
        `)
        .eq('parent_shop_id', businessId)
        .order('name')

      if (sideBusinessError) throw sideBusinessError

      if (page === 1 || !isLoadMore) {
        setProducts(productsData || [])
      } else {
        setProducts(prev => [...prev, ...(productsData || [])])
      }

      setSideBusinessItems(sideBusinessData || [])
      setTotalProducts(count || 0)

      if (page === 1) {
        try {
          const { data: salesData, error: salesError } = await supabase
            .from('sale_items')
            .select('product_id, quantity, sales!inner(business_id)')
            .eq('sales.business_id', businessId)
            .not('product_id', 'is', null)

          if (salesError) {
            setTopProducts((productsData || []).slice(0, 5))
          } else {
            const productSalesCount: Record<string, number> = {}
            salesData?.forEach(sale => {
              if (sale.product_id) {
                productSalesCount[sale.product_id] = (productSalesCount[sale.product_id] || 0) + sale.quantity
              }
            })

            const sortedProducts = (productsData || [])
              .map(product => ({
                product,
                count: productSalesCount[product.product_id] || 0
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
              .map(entry => entry.product)

            setTopProducts(sortedProducts)
          }
        } catch {
          setTopProducts((productsData || []).slice(0, 5))
        }
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
    if (businessLoading) {
      return
    }

    if (businessId == null) {
      setProducts([])
      setFilteredProducts([])
      setSideBusinessItems([])
      setFilteredSideBusinessItems([])
      setTotalProducts(0)
      setTopProducts([])
      return
    }

    fetchProducts(1, productsPerPage)
  }, [businessId, businessLoading, fetchProducts, productsPerPage])

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
    if (!showAllProducts || isSwitchingMode || businessLoading || businessId == null) {
      return
    }

    setCurrentPage(1)

    const timeoutId = setTimeout(() => {
      fetchProducts(1, productsPerPage, selectedCategory, searchTerm)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [selectedCategory, searchTerm, showAllProducts, isSwitchingMode, businessId, businessLoading, fetchProducts, productsPerPage])

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
