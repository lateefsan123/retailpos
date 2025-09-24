import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRole } from '../contexts/RoleContext'
import { useAuth } from '../contexts/AuthContext'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'

async function uploadProductImage(file: File, productId: string, businessId: number | null) {
  console.log("?? Starting image upload for product:", productId)
  console.log("?? File details:", {
    name: file.name,
    size: file.size,
    type: file.type
  })
  
  if (businessId == null) {
    console.error('Cannot upload product image without an active business')
    return null
  }

  try {
    // Upload original file directly to Supabase Storage
    const fileName = `product-images/${productId}.${file.name.split('.').pop()}`
    console.log("?? Uploading to Supabase Storage:", fileName)
    
    const { error: uploadError } = await supabase.storage
      .from('products')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      })
    
    if (uploadError) {
      console.error("? Upload failed:", uploadError)
      return null
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('products')
      .getPublicUrl(fileName)
    
    console.log("? Image uploaded successfully:", publicUrl)
    
    // Update database with public URL
    console.log("?? Updating database with public URL...")
    const { error: dbError } = await supabase
      .from('products')
      .update({ image_url: publicUrl })
      .eq('product_id', productId)
      .eq('business_id', businessId)

    if (dbError) {
      console.error("? DB update failed:", dbError)
      return null
    } else {
      console.log("? Database updated with public URL")
    }

    return publicUrl
  } catch (error) {
    console.error("?? Unexpected error during upload:", error)
    return null
  }
}

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
  weight_unit?: string | null // e.g., 'kg', 'g', 'lb', 'oz'
  price_per_unit?: number | null // price per weight unit (e.g., 3.00 for ?3 per kg)
  is_weighted?: boolean // true if item is sold by weight
  description?: string
  sku?: string
  barcode?: string | null
  sales_count?: number // number of times this product has been sold
  total_revenue?: number // total revenue generated from this product
  last_sold_date?: string // when this product was last sold
}

const Products = () => {
  const { hasPermission } = useRole()
  const { user } = useAuth()
  const { businessId, businessLoading } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Summary statistics for all products (not just current page)
  const [summaryStats, setSummaryStats] = useState({
    totalProducts: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0
  })
  
  // Track which summary filter is active
  const [activeSummaryFilter, setActiveSummaryFilter] = useState<string | null>(null)
  
  // Product insights modal state
  const [showInsightsModal, setShowInsightsModal] = useState(false)
  const [selectedProductForInsights, setSelectedProductForInsights] = useState<Product | null>(null)
  const [productInsights, setProductInsights] = useState<any>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [activeChart, setActiveChart] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{type: 'product', product: Product} | {type: 'category', name: string}>>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newProduct, setNewProduct] = useState({
    product_name: '',
    category: '',
    price: '',
    stock_quantity: '100',
    reorder_level: '10',
    supplier_info: '',
    tax_rate: '',
    description: '',
    sku: '',
    barcode: '',
    is_weighted: false,
    weight_unit: '',
    price_per_unit: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showLilyMessage, setShowLilyMessage] = useState(false)
  const [lilyMessage, setLilyMessage] = useState("Hi! I'm Lily, your inventory assistant! I can help you understand your stock levels and manage your products. Hover over the stats cards to see what they mean!")
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [fullSizeImage, setFullSizeImage] = useState<string | null>(null)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [totalProducts, setTotalProducts] = useState(0)
  
  // Categories state
  const [distinctCategories, setDistinctCategories] = useState<string[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])

  // Cache state for optimization
  const [suggestionsCache, setSuggestionsCache] = useState<{data: {product_id: any, name: any, category: any}[], timestamp: number, businessId: number, branchId?: number} | null>(null)
  const [summaryStatsCache, setSummaryStatsCache] = useState<{data: any, timestamp: number, businessId: number, branchId?: number} | null>(null)
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  // Fetch all products for search suggestions (not paginated)
  const fetchAllProductsForSuggestions = async (forceRefresh = false) => {
    if (businessId == null) {
      setAllProducts([])
      return
    }

    if (
      !forceRefresh &&
      suggestionsCache &&
      suggestionsCache.businessId === businessId &&
      suggestionsCache.branchId === selectedBranchId &&
      (Date.now() - suggestionsCache.timestamp) < CACHE_DURATION
    ) {
      const fullProducts = suggestionsCache.data.map(item => ({
        ...item,
        price: 0,
        stock_quantity: 0,
        supplier_info: '',
        reorder_level: 0,
        image_url: null,
        created_at: '',
        updated_at: ''
      })) as Product[]
      setAllProducts(fullProducts)
      return
    }

    try {
      let query = supabase
        .from('products')
        .select('product_id, name, category')
        .eq('business_id', businessId)

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query.order('name', { ascending: true })

      if (error) {
        console.error('Error fetching all products for suggestions:', error)
        return
      }

      const products = data || []
      const fullProducts = products.map(item => ({
        ...item,
        price: 0,
        stock_quantity: 0,
        supplier_info: '',
        reorder_level: 0,
        image_url: null,
        created_at: '',
        updated_at: ''
      })) as Product[]

      setAllProducts(fullProducts)
      setSuggestionsCache({ data: products, timestamp: Date.now(), businessId, branchId: selectedBranchId })
    } catch (error) {
      console.error('Error fetching all products for suggestions:', error)
    }
  }


  // Fetch distinct categories from database
  const fetchDistinctCategories = async () => {
    if (businessId == null) {
      setDistinctCategories([])
      return
    }

    try {
      let query = supabase
        .from('products')
        .select('category')
        .eq('business_id', businessId)

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query
        .not('category', 'is', null)
        .not('category', 'eq', '')

      if (error) {
        console.error('Error fetching categories:', error)
        return
      }

      const uniqueCategories = Array.from(new Set(data.map(item => item.category)))
        .filter(category => category && category.trim() !== '')
        .sort()

      setDistinctCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching distinct categories:', error)
    }
  }

  useEffect(() => {
    if (businessLoading) {
      return
    }

    if (businessId == null) {
      setProducts([])
      setAllProducts([])
      setDistinctCategories([])
      setSummaryStats({ totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 })
      setTotalProducts(0)
      return
    }

    fetchProducts(1, itemsPerPage, searchTerm, selectedCategory, activeSummaryFilter)
    fetchDistinctCategories()
    fetchAllProductsForSuggestions(true)
    fetchSummaryStats(true)
  }, [businessId, businessLoading, selectedBranchId])

  // Debug modal state
  useEffect(() => {
    console.log('Modal state changed:', { showEditModal, editingProduct: editingProduct?.name })
  }, [showEditModal, editingProduct])

  // Search handlers
  const handleSearchSubmit = () => {
    setCurrentPage(1) // Reset to first page
    fetchProducts(1, itemsPerPage, searchTerm, selectedCategory)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit()
      setShowSearchSuggestions(false)
    }
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    
    // Show suggestions if input is long enough
    if (value.length >= 2) {
      const suggestions = getSearchSuggestions(value)
      setSearchSuggestions(suggestions)
      setShowSearchSuggestions(suggestions.length > 0)
    } else {
      setShowSearchSuggestions(false)
      setSearchSuggestions([])
    }
  }

  const handleSuggestionSelect = (suggestion: any) => {
    const searchValue = suggestion.type === 'product' ? suggestion.product.name : suggestion.name
    setSearchTerm(searchValue)
    setShowSearchSuggestions(false)
    setSearchSuggestions([])
    // Automatically search when suggestion is selected
    setCurrentPage(1)
    fetchProducts(1, itemsPerPage, searchValue, selectedCategory)
  }

  const handleClearSearch = () => {
    setSearchTerm('')
    setShowSearchSuggestions(false)
    setSearchSuggestions([])
    setCurrentPage(1)
    fetchProducts(1, itemsPerPage, '', selectedCategory)
  }

  // Only fetch when category changes (not on every search keystroke)
  useEffect(() => {
    if (businessLoading || businessId == null) {
      return
    }

    setCurrentPage(1) // Reset to first page
    fetchProducts(1, itemsPerPage, searchTerm, selectedCategory, activeSummaryFilter)
  }, [selectedCategory, businessId, businessLoading, selectedBranchId])

  const fetchProducts = async (page: number = currentPage, perPage: number = itemsPerPage, search: string = searchTerm, category: string = selectedCategory, summaryFilter: string | null = null) => {
    if (businessLoading) {
      return
    }

    if (businessId == null) {
      setProducts([])
      setTotalProducts(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      if (summaryFilter && summaryFilter !== 'totalProducts') {
        let allDataQuery = supabase
          .from('products')
          .select('*')
          .eq('business_id', businessId)

        if (selectedBranchId) {
          allDataQuery = allDataQuery.eq('branch_id', selectedBranchId)
        }

        allDataQuery = allDataQuery.order('product_id', { ascending: true })

        if (search && search.trim()) {
          const searchFilter = `name.ilike.%${search.trim()}%,category.ilike.%${search.trim()}%`
          allDataQuery = allDataQuery.or(searchFilter)
        }

        if (category && category !== 'all') {
          allDataQuery = allDataQuery.eq('category', category)
        }

        if (summaryFilter === 'outOfStock') {
          allDataQuery = allDataQuery.eq('stock_quantity', 0)
        }

        const { data: allData, error: fetchError } = await allDataQuery

        if (fetchError) {
          throw fetchError
        }

        let filteredData = allData || []

        if (summaryFilter === 'inStock') {
          filteredData = filteredData.filter(p => p.stock_quantity > p.reorder_level)
        } else if (summaryFilter === 'lowStock') {
          filteredData = filteredData.filter(p => p.stock_quantity <= p.reorder_level && p.stock_quantity > 0)
        }

        setTotalProducts(filteredData.length)

        const offset = (page - 1) * perPage
        const paginatedData = filteredData.slice(offset, offset + perPage)

        setProducts(paginatedData)
      } else {
        let countQuery = supabase
          .from('products')
          .select('product_id', { count: 'exact', head: true })
          .eq('business_id', businessId)

        let dataQuery = supabase
          .from('products')
          .select('*')
          .eq('business_id', businessId)

        if (selectedBranchId) {
          countQuery = countQuery.eq('branch_id', selectedBranchId)
          dataQuery = dataQuery.eq('branch_id', selectedBranchId)
        }

        dataQuery = dataQuery.order('product_id', { ascending: true })

        if (search && search.trim()) {
          const searchFilter = `name.ilike.%${search.trim()}%,category.ilike.%${search.trim()}%`
          countQuery = countQuery.or(searchFilter)
          dataQuery = dataQuery.or(searchFilter)
        }

        if (category && category !== 'all') {
          countQuery = countQuery.eq('category', category)
          dataQuery = dataQuery.eq('category', category)
        }

        const { count, error: countError } = await countQuery

        if (countError) {
          throw countError
        }

        setTotalProducts(count || 0)

        const offset = (page - 1) * perPage

        const { data, error: fetchError } = await dataQuery.range(offset, offset + perPage - 1)

        if (fetchError) {
          throw fetchError
        }

        setProducts(data || [])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products'
      setError(errorMessage)
      console.error('Error fetching products:', err)
      alert(`Products loading error: ${errorMessage}. Please check your database permissions.`)
    } finally {
      setLoading(false)
    }
  }


  // Fetch summary statistics for all products (not filtered by search/category)
  const fetchSummaryStats = async (forceRefresh = false) => {
    if (businessId == null) {
      setSummaryStats({ totalProducts: 0, inStock: 0, lowStock: 0, outOfStock: 0 })
      return
    }

    if (
      !forceRefresh &&
      summaryStatsCache &&
      summaryStatsCache.businessId === businessId &&
      summaryStatsCache.branchId === selectedBranchId &&
      (Date.now() - summaryStatsCache.timestamp) < CACHE_DURATION
    ) {
      setSummaryStats(summaryStatsCache.data)
      return
    }

    try {
      let query = supabase
        .from('products')
        .select('stock_quantity, reorder_level')
        .eq('business_id', businessId)

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query

      if (error) {
        throw error
      }

      if (data) {
        const totalProducts = data.length
        const inStock = data.filter(p => p.stock_quantity > p.reorder_level).length
        const lowStock = data.filter(p => p.stock_quantity <= p.reorder_level && p.stock_quantity > 0).length
        const outOfStock = data.filter(p => p.stock_quantity === 0).length

        const stats = {
          totalProducts,
          inStock,
          lowStock,
          outOfStock
        }

        setSummaryStats(stats)
        setSummaryStatsCache({ data: stats, timestamp: Date.now(), businessId, branchId: selectedBranchId })
      }
    } catch (err) {
      console.error('Error fetching summary stats:', err)
    }
  }


  // Handle summary card clicks to filter the table
  const handleSummaryCardClick = (filterType: string) => {
    if (activeSummaryFilter === filterType) {
      // If clicking the same filter, clear it
      setActiveSummaryFilter(null)
      setSearchTerm('')
      setSelectedCategory('all')
      setCurrentPage(1)
      fetchProducts(1, itemsPerPage, '', 'all')
    } else {
      // Set the new filter
      setActiveSummaryFilter(filterType)
      setSearchTerm('')
      setSelectedCategory('all')
      setCurrentPage(1)
      fetchProducts(1, itemsPerPage, '', 'all', filterType)
    }
  }

  // Process sales data for charts
  const processChartData = (salesData: any[]) => {
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Filter sales from last 30 days
    const recentSales = salesData.filter(item => 
      item.sales && new Date(item.sales.datetime) >= last30Days
    )

    // Daily data for last 30 days
    const dailyData = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]
      
      const daySales = recentSales.filter(item => 
        item.sales && item.sales.datetime.startsWith(dateStr)
      )
      
      const totalSales = daySales.length
      const totalRevenue = daySales.reduce((sum, item) => 
        sum + (item.calculated_price || (item.price_each * item.quantity)), 0
      )
      
      dailyData.push({
        date: dateStr,
        day: date.getDate(),
        month: date.getMonth() + 1,
        sales: totalSales,
        revenue: totalRevenue
      })
    }

    // Weekly data for last 4 weeks
    const weeklyData = []
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      
      const weekSales = recentSales.filter(item => {
        if (!item.sales) return false
        const saleDate = new Date(item.sales.datetime)
        return saleDate >= weekStart && saleDate < weekEnd
      })
      
      const totalSales = weekSales.length
      const totalRevenue = weekSales.reduce((sum, item) => 
        sum + (item.calculated_price || (item.price_each * item.quantity)), 0
      )
      
      weeklyData.push({
        week: `Week ${4 - i}`,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
        sales: totalSales,
        revenue: totalRevenue
      })
    }

    // Monthly data for last 6 months
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const monthSales = salesData.filter(item => {
        if (!item.sales) return false
        const saleDate = new Date(item.sales.datetime)
        return saleDate >= monthStart && saleDate <= monthEnd
      })
      
      const totalSales = monthSales.length
      const totalRevenue = monthSales.reduce((sum, item) => 
        sum + (item.calculated_price || (item.price_each * item.quantity)), 0
      )
      
      monthlyData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        sales: totalSales,
        revenue: totalRevenue
      })
    }

    return {
      daily: dailyData,
      weekly: weeklyData,
      monthly: monthlyData
    }
  }

  // Fetch product insights/sales analytics
  const fetchProductInsights = async (product: Product) => {
    if (businessId == null) {
      setProductInsights(null)
      return
    }

    try {
      setInsightsLoading(true)
      setError(null)

      console.log('Fetching insights for product:', product.product_id, product.name)

      const totalSales = product.sales_count || 0
      const totalRevenue = product.total_revenue || 0
      const lastSoldDate = product.last_sold_date
      const averageSalesPerDay = totalSales > 0 ? (totalSales / 30).toFixed(1) : 0
      const estimatedCost = totalRevenue * 0.6
      const estimatedProfit = totalRevenue - estimatedCost
      const profitMargin = totalRevenue > 0 ? (estimatedProfit / totalRevenue) * 100 : 0

      const { data: allSalesData, error: allSalesError } = await supabase
        .from('sale_items')
        .select(`
          *,
          sales (
            sale_id,
            datetime,
            total_amount,
            payment_method,
            customers (name),
            users (username),
            business_id
          )
        `)
        .eq('product_id', product.product_id)
        .eq('sales.business_id', businessId)
        .order('sales.datetime', { ascending: false })

      if (allSalesError) {
        throw allSalesError
      }

      console.log('All sales query result:', { data: allSalesData })

      const recentSalesData = allSalesData?.slice(0, 10) || []

      const recentSalesList = recentSalesData?.map(item => ({
        date: item.sales ? new Date(item.sales.datetime).toLocaleDateString() : 'Unknown',
        time: item.sales ? new Date(item.sales.datetime).toLocaleTimeString() : 'Unknown',
        quantity: item.weight || item.quantity,
        unit: item.weight ? (product.weight_unit || 'kg') : 'units',
        price: item.calculated_price || (item.price_each * item.quantity),
        customer: item.sales?.customers?.name || 'Walk-in Customer',
        cashier: item.sales?.users?.username || 'Unknown'
      })) || []

      const totalQuantitySold = recentSalesData?.reduce((sum, item) => sum + (item.weight || item.quantity), 0) || 0

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recentSales = recentSalesData?.filter(item =>
        item.sales && new Date(item.sales.datetime) >= thirtyDaysAgo
      ) || []

      const salesByDay = recentSales.reduce((acc, item) => {
        if (item.sales && item.sales.datetime) {
          const date = new Date(item.sales.datetime).toDateString()
          acc[date] = (acc[date] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)

      const topSellingDays = Object.entries(salesByDay)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([date, count]) => ({ date, count }))

      const chartData = processChartData(allSalesData || [])

      console.log('Calculated insights:', {
        totalSales,
        totalRevenue,
        totalQuantitySold,
        averageSalesPerDay,
        topSellingDays,
        estimatedProfit,
        profitMargin,
        recentSalesList,
        lastSoldDate,
        chartData
      })

      setProductInsights({
        product,
        totalSales,
        totalRevenue,
        totalQuantitySold,
        averageSalesPerDay: parseFloat(averageSalesPerDay),
        topSellingDays,
        estimatedProfit,
        profitMargin,
        recentSalesList,
        lastSoldDate,
        chartData,
        salesData: allSalesData || []
      })

    } catch (err) {
      console.error('Error fetching product insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch product insights')
    } finally {
      setInsightsLoading(false)
    }
  }


  // Handle product row click to show insights
  const handleProductClick = (product: Product) => {
    setSelectedProductForInsights(product)
    setShowInsightsModal(true)
    fetchProductInsights(product)
  }

  // Since we're now doing server-side filtering, we use products directly
  const filteredProducts = products

  // Calculate pagination values
  const totalPages = Math.ceil(totalProducts / itemsPerPage)
  const startItem = totalProducts > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endItem = Math.min(currentPage * itemsPerPage, totalProducts)

  // Use distinct categories from database instead of current page products
  const categories = ['all', ...distinctCategories]

  const getCategorySuggestions = (input: string) => {
    if (!input || input.length < 2) return []
    
    const suggestions = distinctCategories.filter(category => 
      category.toLowerCase().includes(input.toLowerCase()) ||
      input.toLowerCase().includes(category.toLowerCase()) ||
      // Check for similar words (simple similarity check)
      category.toLowerCase().split(' ').some(word => 
        word.includes(input.toLowerCase()) || input.toLowerCase().includes(word)
      )
    )
    
    return suggestions.slice(0, 5) // Limit to 5 suggestions
  }

  // Generate search suggestions based on all products
  const getSearchSuggestions = (input: string) => {
    if (!input || input.length < 2) return []
    
    const searchLower = input.toLowerCase()
    const productSuggestions: Array<{type: 'product', product: Product}> = []
    const categorySuggestions: Array<{type: 'category', name: string}> = []
    
    // Search through ALL products (not just current page)
    allProducts.forEach(product => {
      // Check product name
      if (product.name.toLowerCase().includes(searchLower)) {
        productSuggestions.push({type: 'product', product})
      }
      
      // Check category
      if (product.category.toLowerCase().includes(searchLower)) {
        productSuggestions.push({type: 'product', product})
      }
      
      // Check description
      if (product.description && product.description.toLowerCase().includes(searchLower)) {
        productSuggestions.push({type: 'product', product})
      }
      
      // Check SKU
      if (product.sku && product.sku.toLowerCase().includes(searchLower)) {
        productSuggestions.push({type: 'product', product})
      }
    })
    
    // Also include distinct categories that match
    distinctCategories.forEach(category => {
      if (category.toLowerCase().includes(searchLower)) {
        categorySuggestions.push({type: 'category', name: category})
      }
    })
    
    // Remove duplicate products and limit
    const uniqueProducts = productSuggestions
      .filter((item, index, self) => 
        item.type === 'product' && 
        self.findIndex(s => s.type === 'product' && s.product.product_id === item.product.product_id) === index
      )
      .slice(0, 6) // Limit to 6 product suggestions
    
    const uniqueCategories = categorySuggestions
      .filter((item, index, self) => 
        item.type === 'category' && 
        self.findIndex(s => s.type === 'category' && s.name === item.name) === index
      )
      .slice(0, 2) // Limit to 2 category suggestions
    
    return [...uniqueProducts, ...uniqueCategories]
  }

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      fetchProducts(newPage, itemsPerPage, searchTerm, selectedCategory)
    }
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset to first page
    fetchProducts(1, newItemsPerPage, searchTerm, selectedCategory)
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      handlePageChange(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      handlePageChange(currentPage + 1)
    }
  }


  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Transform form data to product data with proper validation
  const transformFormToProductData = (formData: any, productId?: string, isEdit: boolean = false) => {
    // Validate numeric inputs before parsing
    const validateNumericField = (value: string, fieldName: string, required: boolean = true) => {
      if (!value || value.trim() === '') {
        if (required) {
          throw new Error(`${fieldName} is required`)
        }
        return 0
      }
      const parsed = parseFloat(value)
      if (isNaN(parsed)) {
        throw new Error(`${fieldName} must be a valid number`)
      }
      return parsed
    }

    const validateIntegerField = (value: string, fieldName: string, required: boolean = true) => {
      if (!value || value.trim() === '') {
        if (required) {
          throw new Error(`${fieldName} is required`)
        }
        return 0
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
      price: formData.is_weighted ? 0 : validateNumericField(formData.price, 'Price', !isEdit),
      stock_quantity: validateIntegerField(formData.stock_quantity, 'Stock quantity', !isEdit),
      supplier_info: formData.supplier_info?.trim() || '',
      reorder_level: validateIntegerField(formData.reorder_level, 'Reorder level', !isEdit),
      tax_rate: formData.tax_rate ? validateNumericField(formData.tax_rate, 'Tax rate', false) : 0,
      last_updated: new Date().toISOString(),
      is_weighted: formData.is_weighted || false,
      weight_unit: formData.is_weighted ? formData.weight_unit : null,
      price_per_unit: formData.is_weighted && formData.price_per_unit ? 
        validateNumericField(formData.price_per_unit, 'Price per unit', false) : null,
      description: formData.description?.trim() || '',
      sku: formData.sku?.trim() || '',
      barcode: (() => {
        const trimmed = formData.barcode?.trim()
        return trimmed && trimmed.length > 0 ? trimmed : null
      })()
    }
    
    return productId ? { ...baseData, product_id: productId } : baseData
  }

  // Prevent barcode scanners (Enter) from submitting the form prematurely
  const handleModalFormKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter') return

    const target = event.target as HTMLElement | null
    if (!target) return

    if (target instanceof HTMLTextAreaElement) return

    if (
      target instanceof HTMLButtonElement ||
      (target instanceof HTMLInputElement && target.type === 'submit')
    ) {
      return
    }

    const shouldBlock = (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement
    )

    if (!shouldBlock) return

    event.preventDefault()
    event.stopPropagation()
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted, newProduct:', newProduct)
    setIsSubmitting(true)

    if (businessId == null) {
      setError('Please select a business before adding products')
      setIsSubmitting(false)
      return
    }

    try {
      const productId = generateUUID()
      console.log('Generated product ID:', productId)

      const productData = transformFormToProductData(newProduct, productId)
      const productPayload = { ...productData, business_id: businessId, branch_id: selectedBranchId }
      console.log('Inserting product data:', productPayload)

      const { data, error } = await supabase
        .from('products')
        .insert([productPayload])
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      const insertedProduct = data?.[0] ? { ...data[0], barcode: productData.barcode ?? null } : null
      if (!insertedProduct) {
        throw new Error('Product insertion returned no data')
      }

      console.log('Product added successfully!')

      if (selectedImage) {
        const imageUrl = await handleImageUpload(productId)
        if (imageUrl) {
          const updatedProduct = { ...insertedProduct, image_url: imageUrl }
          setProducts(prevProducts => [...prevProducts, updatedProduct])
        } else {
          setProducts(prevProducts => [...prevProducts, insertedProduct])
        }
      } else {
        setProducts(prevProducts => [...prevProducts, insertedProduct])
      }

      setTotalProducts(prevTotal => prevTotal + 1)

      setNewProduct({
        product_name: '',
        category: '',
        price: '',
        stock_quantity: '100',
        reorder_level: '10',
        supplier_info: '',
        tax_rate: '',
        description: '',
        sku: '',
        barcode: '',
        is_weighted: false,
        weight_unit: '',
        price_per_unit: ''
      })
      setSelectedImage(null)
      setImagePreview(null)
      setShowAddModal(false)

      fetchDistinctCategories()
      fetchAllProductsForSuggestions(true)
      fetchSummaryStats(true)
    } catch (error) {
      console.error('Error adding product:', error)

      let errorMessage = 'Failed to add product'
      if (error instanceof Error && error.message) {
        if (error.message.includes('is required') || error.message.includes('must be a valid')) {
          errorMessage = error.message
        } else if (error.message.includes('duplicate key value violates unique constraint')) {
          errorMessage = 'A product with this ID already exists. Please try again.'
        } else if (error.message.includes('violates check constraint')) {
          errorMessage = 'Invalid data provided. Please check your input values.'
        } else if (error.message.includes('not-null constraint')) {
          errorMessage = 'Required fields are missing. Please fill in all required fields.'
        } else {
          errorMessage = `Failed to add product: ${error.message}`
        }
      }

      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }


  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return

    if (businessId == null) {
      setError('Please select a business before updating products')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      console.log('Editing product data:', newProduct)
      const productData = transformFormToProductData(newProduct, undefined, true)
      console.log('Transformed product data:', productData)

      const { data, error } = await supabase
        .from('products')
        .update({ ...productData, branch_id: selectedBranchId })
        .eq('product_id', editingProduct.product_id)
        .eq('business_id', businessId)
        .select()

      if (error) {
        console.error('Supabase error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        throw error
      }

      let updatedProduct = data?.[0] ? { ...data[0], barcode: productData.barcode ?? null } : null
      if (!updatedProduct) {
        throw new Error('Product update returned no data')
      }

      if (selectedImage) {
        const imageUrl = await handleImageUpload(editingProduct.product_id)
        if (imageUrl) {
          updatedProduct = { ...updatedProduct, image_url: imageUrl }
        }
      }

      setProducts(products.map(p =>
        p.product_id === editingProduct.product_id ? updatedProduct : p
      ))

      resetForm()
      setShowEditModal(false)
      setEditingProduct(null)

      fetchDistinctCategories()
      fetchAllProductsForSuggestions(true)
      fetchSummaryStats(true)
    } catch (err) {
      console.error('Failed to update product:', err)

      let errorMessage = 'Failed to update product'
      if (err instanceof Error && err.message) {
        if (err.message.includes('is required') || err.message.includes('must be a valid')) {
          errorMessage = err.message
        } else if (err.message.includes('violates check constraint')) {
          errorMessage = 'Invalid data provided. Please check your input values.'
        } else if (err.message.includes('not-null constraint')) {
          errorMessage = 'Required fields are missing. Please fill in all required fields.'
        } else {
          errorMessage = `Failed to update product: ${err.message}`
        }
      }

      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }


  const handleDeleteProduct = async (productId: string) => {
    if (businessId == null) {
      setError('Please select a business before deleting products')
      return
    }

    try {
      console.log("??? Starting delete for product:", productId)

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('product_id', productId)
        .eq('business_id', businessId)

      if (error) {
        console.error("?? Error deleting product:", error)
        throw error
      }
      console.log("? Product deleted successfully")

      setProducts(products.filter(p => p.product_id !== productId))
      setProductToDelete(null)

      setTotalProducts(prevTotal => Math.max(0, prevTotal - 1))

      fetchAllProductsForSuggestions(true)
      fetchSummaryStats(true)
    } catch (err) {
      console.error("? Delete failed:", err)
      setError(err instanceof Error ? err.message : 'Failed to delete product')
    }
  }


  const resetForm = () => {
    setNewProduct({
      product_name: '',
      category: '',
      price: '',
      stock_quantity: '100',
      reorder_level: '10',
      supplier_info: '',
      tax_rate: '',
      description: '',
      sku: '',
      barcode: '',
      is_weighted: false,
      weight_unit: '',
      price_per_unit: ''
    })
    setSelectedImage(null)
    setImagePreview(null)
    setShowAddModal(false)
    setShowEditModal(false)
    setEditingProduct(null)
  }

  const startEditProduct = (product: Product) => {
    console.log('Starting edit for product:', product)
    setEditingProduct(product)
    setNewProduct({
      product_name: product.name,
      category: product.category,
      price: product.is_weighted ? (product.price_per_unit?.toString() || '') : product.price.toString(),
      stock_quantity: product.stock_quantity.toString(),
      reorder_level: product.reorder_level.toString(),
      supplier_info: product.supplier_info || '',
      tax_rate: product.tax_rate?.toString() || '',
      description: product.description || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      is_weighted: product.is_weighted || false,
      weight_unit: product.weight_unit || '',
      price_per_unit: product.price_per_unit?.toString() || ''
    })
    setImagePreview(product.image_url || null)
    setSelectedImage(null)
    setShowEditModal(true)
    console.log('Edit modal should be open now')
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUpload = async (productId: string) => {
    if (!selectedImage) return null
    if (businessId == null) {
      console.error('Cannot upload image without selecting a business')
      return null
    }

    try {
      const imageUrl = await uploadProductImage(selectedImage, productId, businessId)
      return imageUrl
    } catch (error) {
      console.error('Image upload failed:', error)
      return null
    }
  }

  const openFullSizeImage = (imageUrl: string) => {
    setFullSizeImage(imageUrl)
    setShowImageModal(true)
  }

  const closeImageModal = () => {
    setShowImageModal(false)
    setFullSizeImage(null)
  }

  const getStockStatus = (stock: number, reorderLevel: number) => {
    if (stock === 0) return { status: 'out', color: '#ef4444', bgColor: '#fef2f2', textColor: '#dc2626' }
    if (stock <= reorderLevel) return { status: 'low', color: '#f59e0b', bgColor: '#fffbeb', textColor: '#d97706' }
    return { status: 'good', color: '#10b981', bgColor: '#f0fdf4', textColor: '#059669' }
  }

  const getCategoryColor = (category: string) => {
    const lowerCategory = category.toLowerCase()
    if (lowerCategory.includes('small')) return '#3b82f6' // Blue
    if (lowerCategory.includes('large')) return '#ef4444' // Red
    if (lowerCategory.includes('medium')) return '#f59e0b' // Orange/Yellow
    return '#7d8d86' // Default color
  }

  const highlightSizeKeywords = (text: string) => {
    const words = text.split(' ')
    return words.map((word, index) => {
      const lowerWord = word.toLowerCase()
      let color = '#1a1a1a' // Default color
      
      if (lowerWord === 'small') color = '#3b82f6' // Blue
      else if (lowerWord === 'large') color = '#ef4444' // Red
      else if (lowerWord === 'medium') color = '#f59e0b' // Orange/Yellow
      
      return (
        <span key={index} style={{ color }}>
          {word}
          {index < words.length - 1 ? ' ' : ''}
        </span>
      )
    })
  }

  const LilyMascot = () => (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'flex-end',
      gap: '12px'
    }}>
      {/* Speech Bubble */}
      {showLilyMessage && (
        <div style={{
          background: '#f8fafc',
          border: '2px solid #7d8d86',
          borderRadius: '16px',
          padding: '12px 16px',
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
          maxWidth: '250px',
          fontSize: '14px',
          color: '#3e3f29',
          position: 'relative',
          marginBottom: '8px'
        }}>
          <p style={{ margin: 0, fontWeight: '500' }}>
            {lilyMessage}
          </p>
          {/* Speech bubble tail */}
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            right: '20px',
            width: '0',
            height: '0',
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid #7d8d86'
          }}></div>
        </div>
      )}
      
      {/* Lily Image */}
      <div 
        style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: '#f8fafc',
          border: '3px solid #7d8d86',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
          transition: 'transform 0.2s ease'
        }}
        onClick={() => setShowLilyMessage(!showLilyMessage)}
        onMouseEnter={(e) => {
          const img = e.target as HTMLImageElement;
          img.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          const img = e.target as HTMLImageElement;
          img.style.transform = 'scale(1)';
        }}
      >
        <img 
          src={user?.icon ? `/retailpos/images/icons/${user.icon}.png` : "/retailpos/images/backgrounds/lily.png"} 
          alt={user?.icon || "Lily"} 
          style={{ width: '50px', height: '50px', borderRadius: '50%' }}
        />
      </div>
    </div>
  )

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <div style={{ 
          fontSize: '20px', 
          color: '#7d8d86',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fa-solid fa-spinner" style={{ 
            animation: 'spin 1s linear infinite',
            fontSize: '24px'
          }}></i>
          Loading inventory...
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '24px',
      background: '#f8fafc',
      minHeight: '100vh',
      border: '1px solid rgba(125, 141, 134, 0.1)',
      borderRadius: '16px'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '32px',
        padding: '20px',
        background: '#f8fafc',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
        border: '1px solid rgba(125, 141, 134, 0.2)'
      }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: '#3e3f29',
            margin: '0 0 8px 0'
          }}>
            Inventory Management
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#7d8d86',
            margin: 0
          }}>
            Manage your product inventory, stock levels, and suppliers.
          </p>
        </div>
        
        {hasPermission('canManageProducts') && (
          <button
            onClick={() => {
              console.log('Add Product button clicked')
              setShowAddModal(true)
              console.log('showAddModal set to true')
            }}
            style={{
              background: '#7d8d86',
              color: '#f1f0e4',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#bca88d'
              setLilyMessage("Click this button to add a new product to your inventory! You'll need to fill in details like name, price, stock quantity, and reorder level.")
              setShowLilyMessage(true)
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = '#7d8d86'
              setShowLilyMessage(false)
            }}
          >
            <i className="fa-solid fa-plus" style={{ fontSize: '16px' }}></i>
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        marginBottom: '32px',
        padding: '20px',
        background: '#f8fafc',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
        border: '1px solid rgba(125, 141, 134, 0.2)'
      }}>
        <div 
          onClick={() => handleSummaryCardClick('totalProducts')}
          style={{
            background: activeSummaryFilter === 'totalProducts' ? '#f0f8f0' : '#f8fafc',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: activeSummaryFilter === 'totalProducts' ? '2px solid #7d8d86' : '2px solid transparent'
          }}
          onMouseEnter={(e) => {
            if (activeSummaryFilter !== 'totalProducts') {
                (e.target as HTMLDivElement).style.background = '#f1f5f9'
            }
          }}
          onMouseLeave={(e) => {
            if (activeSummaryFilter !== 'totalProducts') {
                (e.target as HTMLDivElement).style.background = '#f8fafc'
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#7d8d86',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fa-solid fa-boxes-stacked" style={{ fontSize: '18px', color: '#f1f0e4' }}></i>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3e3f29', margin: '0 0 4px 0' }}>
                {summaryStats.totalProducts}
              </p>
              <p style={{ fontSize: '12px', color: '#7d8d86', margin: 0 }}>Total Products</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => handleSummaryCardClick('inStock')}
          style={{
            background: activeSummaryFilter === 'inStock' ? '#f0fdf4' : '#f8fafc',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: activeSummaryFilter === 'inStock' ? '2px solid #10b981' : '2px solid transparent'
          }}
          onMouseEnter={(e) => {
            if (activeSummaryFilter !== 'inStock') {
                (e.target as HTMLDivElement).style.background = '#f1f5f9'
            }
          }}
          onMouseLeave={(e) => {
            if (activeSummaryFilter !== 'inStock') {
                (e.target as HTMLDivElement).style.background = '#f8fafc'
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: '18px', color: 'white' }}></i>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3e3f29', margin: '0 0 4px 0' }}>
                {summaryStats.inStock}
              </p>
              <p style={{ fontSize: '12px', color: '#7d8d86', margin: 0 }}>In Stock</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => handleSummaryCardClick('lowStock')}
          style={{
            background: activeSummaryFilter === 'lowStock' ? '#fffbeb' : '#f8fafc',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: activeSummaryFilter === 'lowStock' ? '2px solid #f59e0b' : '2px solid transparent'
          }}
          onMouseEnter={(e) => {
            if (activeSummaryFilter !== 'lowStock') {
                (e.target as HTMLDivElement).style.background = '#f1f5f9'
            }
          }}
          onMouseLeave={(e) => {
            if (activeSummaryFilter !== 'lowStock') {
                (e.target as HTMLDivElement).style.background = '#f8fafc'
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '18px', color: 'white' }}></i>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3e3f29', margin: '0 0 4px 0' }}>
                {summaryStats.lowStock}
              </p>
              <p style={{ fontSize: '12px', color: '#7d8d86', margin: 0 }}>Low Stock</p>
            </div>
          </div>
        </div>

        <div 
          onClick={() => handleSummaryCardClick('outOfStock')}
          style={{
            background: activeSummaryFilter === 'outOfStock' ? '#fef2f2' : '#f8fafc',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: activeSummaryFilter === 'outOfStock' ? '2px solid #ef4444' : '2px solid transparent'
          }}
          onMouseEnter={(e) => {
            if (activeSummaryFilter !== 'outOfStock') {
                (e.target as HTMLDivElement).style.background = '#f1f5f9'
            }
          }}
          onMouseLeave={(e) => {
            if (activeSummaryFilter !== 'outOfStock') {
                (e.target as HTMLDivElement).style.background = '#f8fafc'
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <i className="fa-solid fa-circle-xmark" style={{ fontSize: '18px', color: 'white' }}></i>
            </div>
            <div>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3e3f29', margin: '0 0 4px 0' }}>
                {summaryStats.outOfStock}
              </p>
              <p style={{ fontSize: '12px', color: '#7d8d86', margin: 0 }}>Out of Stock</p>
            </div>
          </div>
        </div>
      </div>

        {/* Filters */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
          border: '2px solid rgba(125, 141, 134, 0.3)'
        }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '250px', maxWidth: '400px' }}>
            <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="fa-solid fa-search" style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#7d8d86',
                  fontSize: '14px',
                  zIndex: 1
                }}></i>
                <input
                  type="text"
                  placeholder="Search products... (Press Enter to search)"
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  onKeyPress={handleSearchKeyPress}
                  onBlur={() => {
                    // Delay hiding suggestions to allow clicking on them
                    setTimeout(() => setShowSearchSuggestions(false), 200)
                  }}
                  onFocus={() => {
                    if (searchTerm.length >= 2 && searchSuggestions.length > 0) {
                      setShowSearchSuggestions(true)
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    border: '2px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#f8fafc',
                    color: '#3e3f29',
                    boxSizing: 'border-box'
                  }}
                />
                {searchTerm && (
                  <button
                    onClick={handleClearSearch}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#7d8d86',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => (e.target as HTMLButtonElement).style.color = '#ef4444'}
                    onMouseLeave={(e) => (e.target as HTMLButtonElement).style.color = '#7d8d86'}
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                )}
                
                {/* Search Suggestions Dropdown */}
                {showSearchSuggestions && searchSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 50,
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}>
                    {searchSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        onClick={() => handleSuggestionSelect(suggestion)}
                        style={{
                          padding: '12px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          color: '#3e3f29',
                          borderBottom: index < searchSuggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                          transition: 'background 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                        onMouseEnter={(e) => (e.target as HTMLDivElement).style.background = '#f9fafb'}
                        onMouseLeave={(e) => (e.target as HTMLDivElement).style.background = '#f8fafc'}
                      >
                        {suggestion.type === 'product' ? (
                          <>
                            {/* Product Image */}
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '6px',
                              overflow: 'hidden',
                              flexShrink: 0,
                              backgroundColor: '#f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {suggestion.product.image_url ? (
                                <img
                                  src={suggestion.product.image_url}
                                  alt={suggestion.product.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                />
                              ) : (
                                <i className="fa-solid fa-box" style={{
                                  color: '#9ca3af',
                                  fontSize: '16px'
                                }}></i>
                              )}
                            </div>
                            
                            {/* Product Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: '500',
                                marginBottom: '2px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {suggestion.product.name}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <span>{suggestion.product.category}</span>
                                <span>?</span>
                                <span style={{ fontWeight: '500', color: '#059669' }}>
                                  {suggestion.product.is_weighted 
                                    ? `?${suggestion.product.price_per_unit}/${suggestion.product.weight_unit}`
                                    : `?${suggestion.product.price}`
                                  }
                                </span>
                                {suggestion.product.sku && (
                                  <>
                                    <span>?</span>
                                    <span>SKU: {suggestion.product.sku}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* Product Icon */}
                            <i className="fa-solid fa-box" style={{
                              color: '#7d8d86',
                              fontSize: '14px',
                              flexShrink: 0
                            }}></i>
                          </>
                        ) : (
                          <>
                            {/* Category Icon */}
                            <i className="fa-solid fa-tags" style={{
                              color: '#7d8d86',
                              fontSize: '16px',
                              width: '16px',
                              flexShrink: 0
                            }}></i>
                            
                            {/* Category Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: '500',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {suggestion.name}
                              </div>
                              <div style={{
                                fontSize: '12px',
                                color: '#6b7280'
                              }}>
                                Category
                              </div>
                            </div>
                            
                            {/* Category Icon */}
                            <i className="fa-solid fa-arrow-right" style={{
                              color: '#7d8d86',
                              fontSize: '12px',
                              flexShrink: 0
                            }}></i>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleSearchSubmit}
                style={{
                  padding: '10px 16px',
                  background: '#7d8d86',
                  color: '#f1f0e4',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = '#bca88d'}
                onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = '#7d8d86'}
              >
                <i className="fa-solid fa-search" style={{ fontSize: '12px' }}></i>
                Search
              </button>
            </div>
          </div>
          
          <div style={{ minWidth: '180px' }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '2px solid #bca88d',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#f8fafc',
                color: '#3e3f29',
                cursor: 'pointer'
              }}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

        {/* Products Table */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
          border: '2px solid rgba(125, 141, 134, 0.3)'
        }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
             <thead style={{ 
               background: '#3e3f29',
               borderBottom: '4px solid #7d8d86'
             }}>
               <tr>
                 <th style={{ 
                   padding: '16px', 
                   textAlign: 'left', 
                   color: '#f1f0e4', 
                   fontSize: '12px', 
                   fontWeight: '600', 
                   textTransform: 'uppercase',
                   borderBottom: '4px solid #7d8d86',
                   borderRight: '2px solid #7d8d86'
                 }}>
                   Product
                 </th>
                 <th style={{ 
                   padding: '16px', 
                   textAlign: 'left', 
                   color: '#f1f0e4', 
                   fontSize: '12px', 
                   fontWeight: '600', 
                   textTransform: 'uppercase',
                   borderBottom: '4px solid #7d8d86',
                   borderRight: '2px solid #7d8d86'
                 }}>
                   Category
                 </th>
                 <th style={{ 
                   padding: '16px', 
                   textAlign: 'left', 
                   color: '#f1f0e4', 
                   fontSize: '12px', 
                   fontWeight: '600', 
                   textTransform: 'uppercase',
                   borderBottom: '4px solid #7d8d86',
                   borderRight: '2px solid #7d8d86'
                 }}>
                   Price
                 </th>
                 <th style={{ 
                   padding: '16px', 
                   textAlign: 'left', 
                   color: '#f1f0e4', 
                   fontSize: '12px', 
                   fontWeight: '600', 
                   textTransform: 'uppercase',
                   borderBottom: '4px solid #7d8d86',
                   borderRight: '2px solid #7d8d86'
                 }}>
                   Stock
                 </th>
                 <th style={{ 
                   padding: '16px', 
                   textAlign: 'left', 
                   color: '#f1f0e4', 
                   fontSize: '12px', 
                   fontWeight: '600', 
                   textTransform: 'uppercase',
                   borderBottom: '4px solid #7d8d86',
                   borderRight: '2px solid #7d8d86'
                 }}>
                   Status
                 </th>
                 <th style={{ 
                   padding: '16px', 
                   textAlign: 'left', 
                   color: '#f1f0e4', 
                   fontSize: '12px', 
                   fontWeight: '600', 
                   textTransform: 'uppercase',
                   borderBottom: '4px solid #7d8d86'
                 }}>
                   Actions
                 </th>
               </tr>
             </thead>
            <tbody style={{ border: '1px solid rgba(125, 141, 134, 0.2)' }}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#7d8d86' }}>
                    <i className="fa-solid fa-boxes-stacked" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}></i>
                    <p style={{ fontSize: '16px', margin: 0 }}>No products found</p>
                    <p style={{ fontSize: '14px', margin: '8px 0 0 0' }}>Add your first product to get started!</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const stockStatus = getStockStatus(product.stock_quantity, product.reorder_level)
                  return (
                    <tr key={product.product_id} style={{ 
                      borderBottom: '2px solid rgba(125, 141, 134, 0.3)',
                      borderLeft: '1px solid rgba(125, 141, 134, 0.2)',
                      borderRight: '1px solid rgba(125, 141, 134, 0.2)',
                      transition: 'background 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleProductClick(product)}
                    onMouseEnter={(e) => (e.target as HTMLTableRowElement).style.background = 'rgba(125, 141, 134, 0.05)'}
                    onMouseLeave={(e) => (e.target as HTMLTableRowElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px', borderRight: '2px solid rgba(125, 141, 134, 0.25)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              onClick={(e) => {
                                e.stopPropagation()
                                product.image_url && openFullSizeImage(product.image_url)
                              }}
                              style={{
                                width: '48px',
                                height: '48px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '2px solid #bca88d',
                                background: '#f3f4f6',
                                cursor: 'pointer',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.style.transform = 'scale(1.05)';
                                img.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                                setLilyMessage("Click on the image to see it in full size! This helps you get a better look at the product.");
                                setShowLilyMessage(true);
                              }}
                              onMouseLeave={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.style.transform = 'scale(1)';
                                img.style.boxShadow = 'none';
                                setShowLilyMessage(false);
                              }}
                            />
                          )}
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px 0' }}>
                              {highlightSizeKeywords(product.name)}
                            </p>
                            <p style={{ fontSize: '12px', color: '#7d8d86', margin: 0 }}>
                              ID: {product.product_id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px', borderRight: '2px solid rgba(125, 141, 134, 0.25)' }}>
                        <span style={{
                          background: '#f3f4f6',
                          color: getCategoryColor(product.category),
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          border: `1px solid ${getCategoryColor(product.category)}`
                        }}>
                          {product.category}
                        </span>
                      </td>
                      <td style={{ padding: '16px', borderRight: '2px solid rgba(125, 141, 134, 0.25)' }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#3e3f29', margin: 0 }}>
                          {product.is_weighted && product.price_per_unit && product.weight_unit ? (
                            `?${product.price_per_unit.toFixed(2)}/${product.weight_unit}`
                          ) : (
                            `?${product.price.toFixed(2)}`
                          )}
                        </p>
                        {product.is_weighted && (
                          <p style={{ fontSize: '12px', color: '#7d8d86', margin: '4px 0 0 0' }}>
                            Sold by weight
                          </p>
                        )}
                      </td>
                      <td style={{ padding: '16px', borderRight: '2px solid rgba(125, 141, 134, 0.25)' }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#3e3f29', margin: 0 }}>
                          {product.stock_quantity}
                        </p>
                        <p style={{ fontSize: '12px', color: '#7d8d86', margin: 0 }}>
                          Reorder: {product.reorder_level}
                        </p>
                      </td>
                      <td style={{ padding: '16px', borderRight: '2px solid rgba(125, 141, 134, 0.25)' }}>
                        <span style={{
                          background: stockStatus.bgColor,
                          color: stockStatus.textColor,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          textTransform: 'capitalize'
                        }}>
                          {stockStatus.status === 'good' ? 'In Stock' : 
                           stockStatus.status === 'low' ? 'Low Stock' : 'Out of Stock'}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {hasPermission('canManageProducts') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('Edit button clicked for product:', product.name)
                                startEditProduct(product)
                              }}
                              style={{
                                background: '#7d8d86',
                                color: '#f1f0e4',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                transition: 'background 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = '#bca88d'
                                setLilyMessage(`Click to edit "${product.name}". You can update the price, stock quantity, reorder level, and other details!`)
                                setShowLilyMessage(true)
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = '#7d8d86'
                                setShowLilyMessage(false)
                              }}
                            >
                              <i className="fa-solid fa-pen-to-square" style={{ marginRight: '4px' }}></i>
                              Edit
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setProductToDelete(product)
                            }}
                            style={{
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              transition: 'background 0.2s ease'
                            }}
                            onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = '#dc2626'}
                            onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = '#ef4444'}
                          >
                            <i className="fa-solid fa-trash-can" style={{ marginRight: '4px' }}></i>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Info */}
      <div style={{ 
        marginTop: '16px', 
        fontSize: '14px', 
        color: '#7d8d86',
        textAlign: 'center',
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid rgba(125, 141, 134, 0.2)',
        marginBottom: '16px'
      }}>
        {totalProducts > 0 ? (
          <>
            Showing {startItem}-{endItem} of {totalProducts} products
            {totalPages > 1 && (
              <span style={{ marginLeft: '16px' }}>
                (Page {currentPage} of {totalPages})
              </span>
            )}
          </>
        ) : (
          'No products found'
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          background: '#f8fafc',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(62, 63, 41, 0.1)',
          border: '1px solid rgba(125, 141, 134, 0.2)',
          marginBottom: '24px'
        }}>
          {/* Items per page selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: '#3e3f29', fontWeight: '500' }}>
              Show:
            </label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
              style={{
                padding: '6px 12px',
                border: '2px solid #bca88d',
                borderRadius: '6px',
                fontSize: '14px',
                background: '#f8fafc',
                color: '#3e3f29',
                cursor: 'pointer'
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span style={{ fontSize: '14px', color: '#7d8d86' }}>per page</span>
          </div>

          {/* Page navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                border: '2px solid #bca88d',
                borderRadius: '6px',
                background: currentPage === 1 ? '#f3f4f6' : 'white',
                color: currentPage === 1 ? '#9ca3af' : '#3e3f29',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== 1) {
                  (e.target as HTMLButtonElement).style.background = '#f8f9fa'
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== 1) {
                  (e.target as HTMLButtonElement).style.background = '#f8fafc'
                }
              }}
            >
              <i className="fa-solid fa-chevron-left" style={{ marginRight: '4px' }}></i>
              Previous
            </button>

            {/* Page numbers */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    style={{
                      padding: '8px 12px',
                      border: '2px solid #bca88d',
                      borderRadius: '6px',
                      background: currentPage === pageNum ? '#7d8d86' : 'white',
                      color: currentPage === pageNum ? '#f1f0e4' : '#3e3f29',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: currentPage === pageNum ? '600' : '400',
                      transition: 'all 0.2s ease',
                      minWidth: '40px'
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== pageNum) {
                        (e.target as HTMLButtonElement).style.background = '#f8f9fa'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== pageNum) {
                        (e.target as HTMLButtonElement).style.background = '#f8fafc'
                      }
                    }}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                border: '2px solid #bca88d',
                borderRadius: '6px',
                background: currentPage === totalPages ? '#f3f4f6' : 'white',
                color: currentPage === totalPages ? '#9ca3af' : '#3e3f29',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== totalPages) {
                  (e.target as HTMLButtonElement).style.background = '#f8f9fa'
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== totalPages) {
                  (e.target as HTMLButtonElement).style.background = '#f8fafc'
                }
              }}
            >
              Next
              <i className="fa-solid fa-chevron-right" style={{ marginLeft: '4px' }}></i>
            </button>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#f8fafc',
            borderRadius: '16px',
            padding: '32px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#3e3f29', margin: 0 }}>
                Add New Product
              </h2>
              <button
                onClick={resetForm}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#7d8d86',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { 
                  e.target.style.background = '#f3f4f6'; 
                  e.target.style.color = '#3e3f29';
                  setLilyMessage("Click this X button to close the form without saving. It's the same as clicking Cancel!")
                  setShowLilyMessage(true)
                }}
                onMouseLeave={(e) => { 
                  e.target.style.background = 'none'; 
                  e.target.style.color = '#7d8d86';
                  setShowLilyMessage(false)
                }}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleAddProduct} onKeyDown={handleModalFormKeyDown}>
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.product_name}
                    onChange={(e) => setNewProduct({...newProduct, product_name: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f8fafc',
                      color: '#3e3f29'
                    }}
                    placeholder="e.g., Plantain Chips, Jollof Rice Mix"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      value={newProduct.category}
                      onChange={(e) => {
                        setNewProduct({...newProduct, category: e.target.value})
                        setShowCategorySuggestions(e.target.value.length >= 2)
                      }}
                      onFocus={() => {
                        setShowCategorySuggestions(newProduct.category.length >= 2)
                        setLilyMessage("Start typing a category name and I'll suggest similar ones you've used before! This helps keep your categories consistent.")
                        setShowLilyMessage(true)
                      }}
                      onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #bca88d',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: '#f8fafc',
                        color: '#3e3f29'
                      }}
                      placeholder="e.g., Grains, Spices, Beverages"
                    />
                    
                    {/* Category Suggestions */}
                    {showCategorySuggestions && getCategorySuggestions(newProduct.category).length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#f8fafc',
                        border: '2px solid #bca88d',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}>
                        {getCategorySuggestions(newProduct.category).map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              setNewProduct({...newProduct, category: suggestion})
                              setShowCategorySuggestions(false)
                              setLilyMessage(`Great choice! I've selected "${suggestion}" for you. This helps keep your categories organized!`)
                              setShowLilyMessage(true)
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#3e3f29',
                              borderBottom: index < getCategorySuggestions(newProduct.category).length - 1 ? '1px solid #f3f4f6' : 'none',
                              transition: 'background 0.2s ease'
                            }}
                            onMouseEnter={(e) => (e.target as HTMLElement).style.background = '#f8f9fa'}
                            onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'transparent'}
                          >
                            <i className="fa-solid fa-tag" style={{ marginRight: '8px', color: '#7d8d86', fontSize: '12px' }}></i>
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Weight Configuration Section */}
              <div style={{ marginBottom: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    id="is_weighted"
                    checked={newProduct.is_weighted}
                    onChange={(e) => setNewProduct({...newProduct, is_weighted: e.target.checked})}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="is_weighted" style={{ fontSize: '14px', fontWeight: '500', color: '#3e3f29', cursor: 'pointer' }}>
                    This product is sold by weight (e.g., fruits, vegetables, meat)
                  </label>
                </div>
                
                {newProduct.is_weighted && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                        Weight Unit *
                      </label>
                      <select
                        value={newProduct.weight_unit}
                        onChange={(e) => setNewProduct({...newProduct, weight_unit: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '2px solid #bca88d',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#f8fafc',
                          color: '#3e3f29'
                        }}
                      >
                        <option value="">Select unit</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="g">Gram (g)</option>
                        <option value="lb">Pound (lb)</option>
                        <option value="oz">Ounce (oz)</option>
                        <option value="l">Liter (l)</option>
                        <option value="ml">Milliliter (ml)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                        Price per {newProduct.weight_unit || 'unit'} *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required={newProduct.is_weighted}
                        value={newProduct.price_per_unit}
                        onChange={(e) => setNewProduct({...newProduct, price_per_unit: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '2px solid #bca88d',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#f8fafc',
                          color: '#3e3f29'
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Price {newProduct.is_weighted ? '(Auto-set to 0 for weighted items)' : '*'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!newProduct.is_weighted}
                    value={newProduct.is_weighted ? '0' : newProduct.price}
                    onChange={(e) => {
                      if (!newProduct.is_weighted) {
                        setNewProduct({...newProduct, price: e.target.value})
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: newProduct.is_weighted ? '#f9fafb' : 'white',
                      color: newProduct.is_weighted ? '#6b7280' : '#3e3f29',
                      cursor: newProduct.is_weighted ? 'not-allowed' : 'text'
                    }}
                    placeholder={newProduct.is_weighted ? "0.00 (auto-set for weighted items)" : "0.00"}
                    disabled={newProduct.is_weighted}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.stock_quantity}
                    onChange={(e) => setNewProduct({...newProduct, stock_quantity: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f8fafc',
                      color: '#3e3f29'
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Reorder Level *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.reorder_level}
                    onChange={(e) => setNewProduct({...newProduct, reorder_level: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f8fafc',
                      color: '#3e3f29'
                    }}
                    placeholder="10"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.tax_rate}
                    onChange={(e) => setNewProduct({...newProduct, tax_rate: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f8fafc',
                      color: '#3e3f29'
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Supplier Information
                </label>
                <input
                  type="text"
                  value={newProduct.supplier_info}
                  onChange={(e) => setNewProduct({...newProduct, supplier_info: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#f8fafc',
                    color: '#3e3f29'
                  }}
                  placeholder="e.g., African Foods Ltd, +234-xxx-xxxx"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  SKU (Auto-generated if empty)
                </label>
                <input
                  type="text"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#f8fafc',
                    color: '#3e3f29'
                  }}
                  placeholder="Leave empty for auto-generation"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Barcode
                </label>
                <input
                  type="text"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#f8fafc',
                    color: '#3e3f29'
                  }}
                  placeholder="Scan or enter barcode"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Product Image
                </label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    style={{
                      padding: '10px 16px',
                      border: '2px dashed #bca88d',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#7d8d86',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      minWidth: '120px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = '#7d8d86'
                      e.target.style.color = '#3e3f29'
                      setLilyMessage("Click here to upload a product image! This helps customers see what they're buying.")
                      setShowLilyMessage(true)
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = '#bca88d'
                      e.target.style.color = '#7d8d86'
                      setShowLilyMessage(false)
                    }}
                  >
                    <i className="fa-solid fa-camera" style={{ marginRight: '8px' }}></i>
                    Choose Image
                  </label>
                  {(imagePreview || editingProduct?.image_url) && (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={imagePreview || editingProduct?.image_url}
                        alt="Preview"
                        onClick={() => {
                          const imageUrl = imagePreview || editingProduct?.image_url
                          if (imageUrl) openFullSizeImage(imageUrl)
                        }}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '2px solid #bca88d',
                          background: '#f3f4f6',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.transform = 'scale(1.05)';
                          img.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.transform = 'scale(1)';
                          img.style.boxShadow = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          setSelectedImage(null)
                        }}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#f8fafc',
                    color: '#3e3f29',
                    resize: 'vertical'
                  }}
                  placeholder="e.g., Crispy plantain chips made from fresh plantains, perfect for snacking"
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    background: '#f3f4f6',
                    color: '#3e3f29',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e5e7eb'
                    setLilyMessage("This will close the form and clear all the information you've entered. Don't worry, you can always start over!")
                    setShowLilyMessage(true)
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f3f4f6'
                    setShowLilyMessage(false)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: isSubmitting ? '#9ca3af' : '#7d8d86',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      setLilyMessage("This will save your new product to the inventory! Make sure all required fields are filled out before clicking.")
                      setShowLilyMessage(true)
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      setShowLilyMessage(false)
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-plus"></i>
                      Add Product
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && editingProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#3e3f29', margin: 0 }}>
                Edit Product
              </h2>
              <button
                onClick={resetForm}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#7d8d86',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => { 
                  e.target.style.background = '#f3f4f6'; 
                  e.target.style.color = '#3e3f29';
                  setLilyMessage("Click this X button to close the edit form without saving. It's the same as clicking Cancel!")
                  setShowLilyMessage(true)
                }}
                onMouseLeave={(e) => { 
                  e.target.style.background = 'none'; 
                  e.target.style.color = '#7d8d86';
                  setShowLilyMessage(false)
                }}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleEditProduct} onKeyDown={handleModalFormKeyDown}>
              {error && (
                <div style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '14px'
                }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProduct.product_name}
                    onChange={(e) => setNewProduct({...newProduct, product_name: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f8fafc',
                      color: '#3e3f29'
                    }}
                    placeholder="e.g., Plantain Chips, Jollof Rice Mix"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Category *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      value={newProduct.category}
                      onChange={(e) => {
                        setNewProduct({...newProduct, category: e.target.value})
                        setShowCategorySuggestions(e.target.value.length >= 2)
                      }}
                      onFocus={() => {
                        setShowCategorySuggestions(newProduct.category.length >= 2)
                        setLilyMessage("Start typing a category name and I'll suggest similar ones you've used before! This helps keep your categories consistent.")
                        setShowLilyMessage(true)
                      }}
                      onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '2px solid #bca88d',
                        borderRadius: '8px',
                        fontSize: '14px',
                        background: '#f8fafc',
                        color: '#3e3f29'
                      }}
                      placeholder="e.g., Grains, Spices, Beverages"
                    />
                    
                    {/* Category Suggestions */}
                    {showCategorySuggestions && getCategorySuggestions(newProduct.category).length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#f8fafc',
                        border: '2px solid #bca88d',
                        borderTop: 'none',
                        borderRadius: '0 0 8px 8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflow: 'auto'
                      }}>
                        {getCategorySuggestions(newProduct.category).map((suggestion, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              setNewProduct({...newProduct, category: suggestion})
                              setShowCategorySuggestions(false)
                              setLilyMessage(`Great choice! I've selected "${suggestion}" for you. This helps keep your categories organized!`)
                              setShowLilyMessage(true)
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#3e3f29',
                              borderBottom: index < getCategorySuggestions(newProduct.category).length - 1 ? '1px solid #f3f4f6' : 'none',
                              transition: 'background 0.2s ease'
                            }}
                            onMouseEnter={(e) => (e.target as HTMLElement).style.background = '#f8f9fa'}
                            onMouseLeave={(e) => (e.target as HTMLElement).style.background = 'transparent'}
                          >
                            <i className="fa-solid fa-tag" style={{ marginRight: '8px', color: '#7d8d86', fontSize: '12px' }}></i>
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Weight Configuration Section */}
              <div style={{ marginBottom: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <input
                    type="checkbox"
                    id="is_weighted_edit"
                    checked={newProduct.is_weighted}
                    onChange={(e) => setNewProduct({...newProduct, is_weighted: e.target.checked})}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <label htmlFor="is_weighted_edit" style={{ fontSize: '14px', fontWeight: '500', color: '#3e3f29', cursor: 'pointer' }}>
                    This product is sold by weight (e.g., fruits, vegetables, meat)
                  </label>
                </div>
                
                {newProduct.is_weighted && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                        Weight Unit *
                      </label>
                      <select
                        value={newProduct.weight_unit}
                        onChange={(e) => setNewProduct({...newProduct, weight_unit: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '2px solid #bca88d',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#f8fafc',
                          color: '#3e3f29'
                        }}
                      >
                        <option value="">Select unit</option>
                        <option value="kg">Kilogram (kg)</option>
                        <option value="g">Gram (g)</option>
                        <option value="lb">Pound (lb)</option>
                        <option value="oz">Ounce (oz)</option>
                        <option value="l">Liter (l)</option>
                        <option value="ml">Milliliter (ml)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                        Price per {newProduct.weight_unit || 'unit'} *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required={newProduct.is_weighted}
                        value={newProduct.price_per_unit}
                        onChange={(e) => setNewProduct({...newProduct, price_per_unit: e.target.value})}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '2px solid #bca88d',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: '#f8fafc',
                          color: '#3e3f29'
                        }}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Price {newProduct.is_weighted ? '(Auto-set to 0 for weighted items)' : '*'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!newProduct.is_weighted}
                    value={newProduct.is_weighted ? '0' : newProduct.price}
                    onChange={(e) => {
                      if (!newProduct.is_weighted) {
                        setNewProduct({...newProduct, price: e.target.value})
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: newProduct.is_weighted ? '#f9fafb' : 'white',
                      color: newProduct.is_weighted ? '#6b7280' : '#3e3f29',
                      cursor: newProduct.is_weighted ? 'not-allowed' : 'text'
                    }}
                    placeholder={newProduct.is_weighted ? "0.00 (auto-set for weighted items)" : "0.00"}
                    disabled={newProduct.is_weighted}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.stock_quantity}
                    onChange={(e) => setNewProduct({...newProduct, stock_quantity: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f8fafc',
                      color: '#3e3f29'
                    }}
                    placeholder="0"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Reorder Level *
                  </label>
                  <input
                    type="number"
                    required
                    value={newProduct.reorder_level}
                    onChange={(e) => setNewProduct({...newProduct, reorder_level: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f8fafc',
                      color: '#3e3f29'
                    }}
                    placeholder="10"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProduct.tax_rate}
                    onChange={(e) => setNewProduct({...newProduct, tax_rate: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #bca88d',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f8fafc',
                      color: '#3e3f29'
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Supplier Information
                </label>
                <input
                  type="text"
                  value={newProduct.supplier_info}
                  onChange={(e) => setNewProduct({...newProduct, supplier_info: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#f8fafc',
                    color: '#3e3f29'
                  }}
                  placeholder="e.g., African Foods Ltd, +234-xxx-xxxx"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  SKU
                </label>
                <input
                  type="text"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#f8fafc',
                    color: '#3e3f29'
                  }}
                  placeholder="Update SKU"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Barcode
                </label>
                <input
                  type="text"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#f8fafc',
                    color: '#3e3f29'
                  }}
                  placeholder="Scan or enter barcode"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Product Image
                </label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: 'none' }}
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    style={{
                      padding: '10px 16px',
                      border: '2px dashed #bca88d',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#7d8d86',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                      minWidth: '120px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = '#7d8d86'
                      e.target.style.color = '#3e3f29'
                      setLilyMessage("Click here to upload a product image! This helps customers see what they're buying.")
                      setShowLilyMessage(true)
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = '#bca88d'
                      e.target.style.color = '#7d8d86'
                      setShowLilyMessage(false)
                    }}
                  >
                    <i className="fa-solid fa-camera" style={{ marginRight: '8px' }}></i>
                    Choose Image
                  </label>
                  {(imagePreview || editingProduct?.image_url) && (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={imagePreview || editingProduct?.image_url}
                        alt="Preview"
                        onClick={() => {
                          const imageUrl = imagePreview || editingProduct?.image_url
                          if (imageUrl) openFullSizeImage(imageUrl)
                        }}
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '2px solid #bca88d',
                          background: '#f3f4f6',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.transform = 'scale(1.05)';
                          img.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        }}
                        onMouseLeave={(e) => {
                          const img = e.target as HTMLImageElement;
                          img.style.transform = 'scale(1)';
                          img.style.boxShadow = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null)
                          setSelectedImage(null)
                        }}
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#ef4444',
                          border: 'none',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#3e3f29', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #bca88d',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#f8fafc',
                    color: '#3e3f29',
                    resize: 'vertical'
                  }}
                  placeholder="e.g., Crispy plantain chips made from fresh plantains, perfect for snacking"
                />
              </div>

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    background: '#f3f4f6',
                    color: '#3e3f29',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e5e7eb'
                    setLilyMessage("This will close the edit form and discard any changes you've made. Don't worry, you can always edit again!")
                    setShowLilyMessage(true)
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f3f4f6'
                    setShowLilyMessage(false)
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: isSubmitting ? '#9ca3af' : '#7d8d86',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'background 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSubmitting) {
                      setLilyMessage("This will save your changes to the product! Make sure all required fields are filled out before clicking.")
                      setShowLilyMessage(true)
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSubmitting) {
                      setShowLilyMessage(false)
                    }
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fa-solid fa-spinner" style={{ animation: 'spin 1s linear infinite' }}></i>
                      Updating...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-save"></i>
                      Update Product
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Size Image Modal */}
      {showImageModal && fullSizeImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}
        onClick={closeImageModal}
        >
          <div style={{
            position: 'relative',
            width: '400px',
            height: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundImage: `url(${fullSizeImage})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            borderRadius: '8px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            backgroundColor: '#ffffff'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeImageModal}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '-40px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                color: '#3e3f29',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 1)'}
              onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = 'rgba(255, 255, 255, 0.9)'}
            >
              <i className="fa-solid fa-times"></i>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              Delete Product
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#1a1a1a',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              Are you sure you want to delete <strong>{productToDelete.name}</strong>?
            </p>
            <p style={{
              fontSize: '14px',
              color: '#ef4444',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              This action cannot be undone.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setProductToDelete(null)}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = '#4b5563'}
                onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = '#6b7280'}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProduct(productToDelete.product_id)}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = '#dc2626'}
                onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = '#ef4444'}
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Lily Mascot */}
      {/* Product Insights Modal */}
      {showInsightsModal && selectedProductForInsights && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}
        onClick={() => setShowInsightsModal(false)}
        >
          <div style={{
            background: '#f8fafc',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', paddingBottom: '20px', borderBottom: '2px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {selectedProductForInsights.image_url && (
                  <div style={{ position: 'relative' }}>
                    <img
                      src={selectedProductForInsights.image_url}
                      alt={selectedProductForInsights.name}
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '16px',
                        objectFit: 'cover',
                        border: '3px solid #e5e7eb',
                        background: '#f3f4f6',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      background: '#10b981',
                      color: 'white',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      <i className="fas fa-chart-line"></i>
                    </div>
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <i className="fas fa-analytics" style={{ color: '#7d8d86', fontSize: '20px' }}></i>
                    <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '700', color: '#1e293b', letterSpacing: '-0.025em' }}>
                      Product Insights
                    </h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                    <i className="fas fa-box" style={{ color: '#7d8d86', fontSize: '16px' }}></i>
                    <p style={{ margin: 0, fontSize: '18px', color: '#374151', fontWeight: '600' }}>
                      {selectedProductForInsights.name}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <i className="fas fa-tags" style={{ color: '#9ca3af', fontSize: '14px' }}></i>
                    <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                      {selectedProductForInsights.category}
                    </p>
                    {selectedProductForInsights.sku && (
                      <>
                        <i className="fas fa-barcode" style={{ color: '#9ca3af', fontSize: '14px', marginLeft: '16px' }}></i>
                        <span style={{ fontSize: '14px', color: '#6b7280' }}>SKU: {selectedProductForInsights.sku}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowInsightsModal(false)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#f8fafc',
                  border: '2px solid #e2e8f0',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#ef4444'
                  e.currentTarget.style.color = 'white'
                  e.currentTarget.style.borderColor = '#ef4444'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc'
                  e.currentTarget.style.color = '#6b7280'
                  e.currentTarget.style.borderColor = '#e2e8f0'
                }}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {insightsLoading ? (
              <div style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  fontSize: '18px', 
                  color: '#7d8d86',
                  background: '#f8fafc',
                  padding: '20px 32px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0'
                }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '20px', color: '#3b82f6' }}></i>
                  Loading insights...
                </div>
                <div style={{ fontSize: '14px', color: '#9ca3af', marginTop: '12px' }}>
                  Analyzing sales data and trends
                </div>
              </div>
            ) : productInsights ? (
              <div>
                {/* Key Metrics */}
                <div style={{ marginBottom: '40px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <i className="fas fa-chart-bar" style={{ color: '#7d8d86', fontSize: '20px' }}></i>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>
                      Performance Overview
                    </h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)', 
                      padding: '24px', 
                      borderRadius: '16px', 
                      textAlign: 'center',
                      border: '1px solid #93c5fd',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        color: '#3b82f6',
                        fontSize: '16px'
                      }}>
                        <i className="fas fa-shopping-cart"></i>
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e40af', marginBottom: '8px' }}>
                        {productInsights.totalSales}
                      </div>
                      <div style={{ fontSize: '14px', color: '#1e40af', fontWeight: '500' }}>Total Sales</div>
                    </div>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', 
                      padding: '24px', 
                      borderRadius: '16px', 
                      textAlign: 'center',
                      border: '1px solid #86efac',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        color: '#10b981',
                        fontSize: '16px'
                      }}>
                        <i className="fas fa-euro-sign"></i>
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: '#166534', marginBottom: '8px' }}>
                        ?{productInsights.totalRevenue.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '14px', color: '#166534', fontWeight: '500' }}>Total Revenue</div>
                    </div>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                      padding: '24px', 
                      borderRadius: '16px', 
                      textAlign: 'center',
                      border: '1px solid #fbbf24',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        color: '#f59e0b',
                        fontSize: '16px'
                      }}>
                        <i className="fas fa-weight"></i>
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: '#92400e', marginBottom: '8px' }}>
                        {productInsights.totalQuantitySold.toFixed(1)}
                      </div>
                      <div style={{ fontSize: '14px', color: '#92400e', fontWeight: '500' }}>
                        {selectedProductForInsights.is_weighted ? (selectedProductForInsights.weight_unit || 'kg') : 'Units'} Sold
                      </div>
                    </div>
                    <div style={{ 
                      background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)', 
                      padding: '24px', 
                      borderRadius: '16px', 
                      textAlign: 'center',
                      border: '1px solid #f9a8d4',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        color: '#ec4899',
                        fontSize: '16px'
                      }}>
                        <i className="fas fa-percentage"></i>
                      </div>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: '#be185d', marginBottom: '8px' }}>
                        {productInsights.profitMargin.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '14px', color: '#be185d', fontWeight: '500' }}>Est. Profit Margin</div>
                    </div>
                  </div>
                </div>

                {/* Sales Charts Section */}
                {productInsights.chartData && (
                  <div style={{ marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                      <i className="fas fa-chart-line" style={{ color: '#7d8d86', fontSize: '20px' }}></i>
                      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1e293b' }}>
                        Sales Trends & Analytics
                      </h3>
                    </div>
                    
                    {/* Chart Tabs */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                      <button
                        onClick={() => setActiveChart('daily')}
                        style={{
                          padding: '12px 20px',
                          borderRadius: '12px',
                          border: 'none',
                          background: activeChart === 'daily' ? '#3b82f6' : '#f8fafc',
                          color: activeChart === 'daily' ? 'white' : '#6b7280',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease',
                          boxShadow: activeChart === 'daily' ? '0 4px 6px rgba(59, 130, 246, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <i className="fas fa-calendar-day"></i>
                        Daily (30 days)
                      </button>
                      <button
                        onClick={() => setActiveChart('weekly')}
                        style={{
                          padding: '12px 20px',
                          borderRadius: '12px',
                          border: 'none',
                          background: activeChart === 'weekly' ? '#10b981' : '#f8fafc',
                          color: activeChart === 'weekly' ? 'white' : '#6b7280',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease',
                          boxShadow: activeChart === 'weekly' ? '0 4px 6px rgba(16, 185, 129, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <i className="fas fa-calendar-week"></i>
                        Weekly (4 weeks)
                      </button>
                      <button
                        onClick={() => setActiveChart('monthly')}
                        style={{
                          padding: '12px 20px',
                          borderRadius: '12px',
                          border: 'none',
                          background: activeChart === 'monthly' ? '#f59e0b' : '#f8fafc',
                          color: activeChart === 'monthly' ? 'white' : '#6b7280',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease',
                          boxShadow: activeChart === 'monthly' ? '0 4px 6px rgba(245, 158, 11, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <i className="fas fa-calendar-alt"></i>
                        Monthly (6 months)
                      </button>
                    </div>

                    {/* Chart Display */}
                    <div style={{ 
                      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                      padding: '24px', 
                      borderRadius: '16px', 
                      minHeight: '220px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                    }}>
                      {activeChart === 'daily' && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <i className="fas fa-chart-bar" style={{ color: '#3b82f6', fontSize: '16px' }}></i>
                            <h4 style={{ margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: '600' }}>
                              Daily Sales (Last 30 Days)
                            </h4>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'end', gap: '4px', height: '150px' }}>
                            {productInsights.chartData.daily.map((day, index) => {
                              const maxSales = Math.max(...productInsights.chartData.daily.map(d => d.sales))
                              const height = maxSales > 0 ? (day.sales / maxSales) * 120 : 0
                              return (
                                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                  <div
                                    style={{
                                      width: '100%',
                                      height: `${height}px`,
                                      background: day.sales > 0 ? '#7d8d86' : '#e5e7eb',
                                      borderRadius: '2px 2px 0 0',
                                      minHeight: '2px'
                                    }}
                                    title={`${day.date}: ${day.sales} sales, ?${day.revenue.toFixed(2)}`}
                                  />
                                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>
                                    {day.day}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {activeChart === 'weekly' && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <i className="fas fa-chart-area" style={{ color: '#10b981', fontSize: '16px' }}></i>
                            <h4 style={{ margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: '600' }}>
                              Weekly Sales (Last 4 Weeks)
                            </h4>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'end', gap: '8px', height: '150px' }}>
                            {productInsights.chartData.weekly.map((week, index) => {
                              const maxSales = Math.max(...productInsights.chartData.weekly.map(w => w.sales))
                              const height = maxSales > 0 ? (week.sales / maxSales) * 120 : 0
                              return (
                                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                  <div
                                    style={{
                                      width: '100%',
                                      height: `${height}px`,
                                      background: week.sales > 0 ? '#10b981' : '#e5e7eb',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: '2px'
                                    }}
                                    title={`${week.week}: ${week.sales} sales, ?${week.revenue.toFixed(2)}`}
                                  />
                                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>
                                    {week.week}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {activeChart === 'monthly' && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                            <i className="fas fa-chart-pie" style={{ color: '#f59e0b', fontSize: '16px' }}></i>
                            <h4 style={{ margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: '600' }}>
                              Monthly Sales (Last 6 Months)
                            </h4>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'end', gap: '8px', height: '150px' }}>
                            {productInsights.chartData.monthly.map((month, index) => {
                              const maxSales = Math.max(...productInsights.chartData.monthly.map(m => m.sales))
                              const height = maxSales > 0 ? (month.sales / maxSales) * 120 : 0
                              return (
                                <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                  <div
                                    style={{
                                      width: '100%',
                                      height: `${height}px`,
                                      background: month.sales > 0 ? '#f59e0b' : '#e5e7eb',
                                      borderRadius: '4px 4px 0 0',
                                      minHeight: '2px'
                                    }}
                                    title={`${month.month}: ${month.sales} sales, ?${month.revenue.toFixed(2)}`}
                                  />
                                  <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '4px', textAlign: 'center' }}>
                                    {month.month.split(' ')[0]}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Product Info Section */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                  padding: '24px', 
                  borderRadius: '16px', 
                  marginBottom: '32px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <i className="fas fa-info-circle" style={{ color: '#7d8d86', fontSize: '20px' }}></i>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                      Product Information
                    </h3>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <i className="fas fa-barcode" style={{ color: '#6b7280', fontSize: '16px' }}></i>
                      <div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>Product ID</div>
                        <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>{selectedProductForInsights.product_id}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <i className="fas fa-tags" style={{ color: '#6b7280', fontSize: '16px' }}></i>
                      <div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>Category</div>
                        <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>{selectedProductForInsights.category}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <i className="fas fa-boxes" style={{ color: '#6b7280', fontSize: '16px' }}></i>
                      <div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>Current Stock</div>
                        <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>{selectedProductForInsights.stock_quantity}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <i className="fas fa-exclamation-triangle" style={{ color: '#6b7280', fontSize: '16px' }}></i>
                      <div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>Reorder Level</div>
                        <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>{selectedProductForInsights.reorder_level}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <i className="fas fa-euro-sign" style={{ color: '#6b7280', fontSize: '16px' }}></i>
                      <div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>Price</div>
                        <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                          ?{selectedProductForInsights.is_weighted 
                            ? `${selectedProductForInsights.price_per_unit}/${selectedProductForInsights.weight_unit}`
                            : selectedProductForInsights.price.toFixed(2)
                          }
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      <i className="fas fa-weight" style={{ color: '#6b7280', fontSize: '16px' }}></i>
                      <div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>Type</div>
                        <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>{selectedProductForInsights.is_weighted ? 'Weighted Product' : 'Regular Product'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '32px' }}>
                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#3e3f29' }}>
                      Sales Performance
                    </h3>
                    <div style={{ fontSize: '14px', color: '#7d8d86', lineHeight: '1.6' }}>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Average sales per day:</strong> {productInsights.averageSalesPerDay.toFixed(1)}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Estimated profit:</strong> ?{productInsights.estimatedProfit.toFixed(2)}
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Last sold:</strong> {productInsights.lastSoldDate 
                          ? new Date(productInsights.lastSoldDate).toLocaleDateString()
                          : 'Never'
                        }
                      </div>
                      <div>
                        <strong>Price per unit:</strong> ?{selectedProductForInsights.is_weighted 
                          ? `${selectedProductForInsights.price_per_unit}/${selectedProductForInsights.weight_unit}`
                          : selectedProductForInsights.price.toFixed(2)
                        }
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#3e3f29' }}>
                      Top Selling Days (Last 30 Days)
                    </h3>
                    {productInsights.topSellingDays.length > 0 ? (
                      <div style={{ fontSize: '14px', color: '#7d8d86' }}>
                        {productInsights.topSellingDays.map((day, index) => (
                          <div key={index} style={{ marginBottom: '4px' }}>
                            {new Date(day.date).toLocaleDateString()}: {day.count} sales
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '14px', color: '#7d8d86' }}>No sales in the last 30 days</div>
                    )}
                  </div>
                </div>

                {/* Recent Sales */}
                <div style={{ 
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
                  padding: '24px', 
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <i className="fas fa-receipt" style={{ color: '#7d8d86', fontSize: '20px' }}></i>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
                      Recent Sales
                    </h3>
                  </div>
                  {productInsights.recentSalesList.length > 0 ? (
                    <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                      <table style={{ width: '100%', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                            <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-calendar" style={{ fontSize: '12px', color: '#6b7280' }}></i>
                              Date
                            </th>
                            <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-hashtag" style={{ fontSize: '12px', color: '#6b7280' }}></i>
                              Quantity
                            </th>
                            <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-euro-sign" style={{ fontSize: '12px', color: '#6b7280' }}></i>
                              Price
                            </th>
                            <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-user" style={{ fontSize: '12px', color: '#6b7280' }}></i>
                              Customer
                            </th>
                            <th style={{ textAlign: 'left', padding: '12px 8px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-user-tie" style={{ fontSize: '12px', color: '#6b7280' }}></i>
                              Cashier
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {productInsights.recentSalesList.map((sale, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '8px 0', color: '#3e3f29' }}>
                                {sale.date} {sale.time}
                              </td>
                              <td style={{ padding: '8px 0', color: '#3e3f29' }}>
                                {sale.quantity} {sale.unit}
                              </td>
                              <td style={{ padding: '8px 0', color: '#3e3f29' }}>
                                ?{sale.price.toFixed(2)}
                              </td>
                              <td style={{ padding: '8px 0', color: '#3e3f29' }}>
                                {sale.customer}
                              </td>
                              <td style={{ padding: '8px 0', color: '#3e3f29' }}>
                                {sale.cashier}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ fontSize: '14px', color: '#7d8d86', textAlign: 'center', padding: '20px' }}>
                      No sales recorded for this product
                    </div>
                  )}
                </div>
              </div>
              ) : (
                <div>
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px', 
                    marginBottom: '32px',
                    background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    borderRadius: '16px',
                    border: '1px solid #fecaca'
                  }}>
                    <div style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      fontSize: '20px', 
                      color: '#dc2626', 
                      marginBottom: '12px', 
                      fontWeight: '600' 
                    }}>
                      <i className="fas fa-chart-line" style={{ fontSize: '24px' }}></i>
                      No Sales Data Available
                    </div>
                    <div style={{ fontSize: '14px', color: '#991b1b' }}>
                      This product hasn't been sold yet
                    </div>
                  </div>
                
                {/* Product Info Section */}
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#3e3f29' }}>
                    Product Information
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', fontSize: '14px', color: '#7d8d86' }}>
                    <div>
                      <strong>Product ID:</strong> {selectedProductForInsights.product_id}
                    </div>
                    <div>
                      <strong>Category:</strong> {selectedProductForInsights.category}
                    </div>
                    <div>
                      <strong>Current Stock:</strong> {selectedProductForInsights.stock_quantity}
                    </div>
                    <div>
                      <strong>Reorder Level:</strong> {selectedProductForInsights.reorder_level}
                    </div>
                    <div>
                      <strong>Price:</strong> ?{selectedProductForInsights.is_weighted 
                        ? `${selectedProductForInsights.price_per_unit}/${selectedProductForInsights.weight_unit}`
                        : selectedProductForInsights.price.toFixed(2)
                      }
                    </div>
                    <div>
                      <strong>Type:</strong> {selectedProductForInsights.is_weighted ? 'Weighted Product' : 'Regular Product'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <LilyMascot />
    </div>
  )
}

export default Products
