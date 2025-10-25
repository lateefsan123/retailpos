import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useBusiness } from '../contexts/BusinessContext'
import { usePromotions } from '../hooks/usePromotions'
import { useNav } from '../contexts/NavContext'
import { useBarcodeScanner, setModalOpen } from '../hooks/useBarcodeScanner'
import { generateReceiptHTML as generateReceiptHTMLUtil, printReceipt as printReceiptUtil, openCashDrawer } from '../utils/receiptUtils'
import { ttsService, TTSSettings } from '../lib/ttsService'
import { calculateChangeBreakdown } from '../utils/changeBreakdown'
import { getRandomCustomerIcon } from '../utils/customerIcons'
import { RetroButton } from '../components/ui/RetroButton'
import { Button } from '../components/ui/Button'
import { Separator } from '../components/ui/separator'
import BranchSelector from '../components/BranchSelector'
import Calculator from '../components/Calculator'
import CustomerAutocomplete from '../components/CustomerAutocomplete'
import StockAlertModal from '../components/sales/StockAlertModal'
import AddProductModal from '../components/modals/AddProductModal'
import styles from '../components/sales/SalesSummaryModal.module.css'
import { ProductVariation } from '../types/productVariation'

// Helper function to get local time in database format
const getLocalDateTime = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

const generateOrderDetailNumber = () => Math.floor(Math.random() * 10000000)

// Local storage functions for cart persistence
const getCartStorageKey = (branchId: number | null) => {
  return branchId ? `sales_cart_branch_${branchId}` : 'sales_cart_no_branch'
}

const saveCartToStorage = (order: Order, branchId: number | null) => {
  try {
    const storageKey = getCartStorageKey(branchId)
    localStorage.setItem(storageKey, JSON.stringify(order))
  } catch (error) {
    console.error('Error saving cart to localStorage:', error)
  }
}

const loadCartFromStorage = (branchId: number | null): Order | null => {
  try {
    const storageKey = getCartStorageKey(branchId)
    const savedCart = localStorage.getItem(storageKey)
    if (savedCart) {
      return JSON.parse(savedCart)
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error)
  }
  return null
}

const clearCartFromStorage = (branchId: number | null) => {
  try {
    const storageKey = getCartStorageKey(branchId)
    localStorage.removeItem(storageKey)
  } catch (error) {
    console.error('Error clearing cart from localStorage:', error)
  }
}

// TTS functionality now handled by ttsService

// TTS Helper functions - Onyx voice with Nigerian food-themed endings
const orderEndMessages = [
  "Order confirmed! Your jollof rice dreams are one step closer.",
  "Thanks for shopping! Even suya is jealous of your taste.",
  "Your order is secured tighter than plantain at a party.",
  "Order complete! Somewhere, egusi soup just smiled at you.",
  "Confirmed! Your basket was blessed by the spirit of fufu.",
  "You did it! May your order arrive faster than puff-puff disappears.",
  "Order locked! Your kitchen is about to smell like victory.",
  "Thanks for shopping! Even aunties will approve of this order.",
  "Your order is in! We'll protect it like Nigerians protect their jollof recipe.",
  "Success! Your food is coming with more flavor than a pepper soup challenge.",
  "Confirmed — your taste is hotter than shito pepper.",
  "Order complete! Don't worry, we didn't forget the Maggi cubes.",
  "Transaction approved! Time to prepare for a feast fit for ancestors.",
  "Done! May your meals be as sweet as ripe plantain.",
  "Your order is confirmed — better hide it before the neighbors smell it!"
]

const speakOrderItems = async (items: OrderItem[]) => {
  if (items.length === 0) {
    await ttsService.speak("No items in order yet.")
    return
  }

  let speechText = `Order contains ${items.length} item${items.length === 1 ? '' : 's'}. `
  let runningTotal = 0
  
  items.forEach((item, index) => {
    const itemName = item.product?.name || item.sideBusinessItem?.name || 'Unknown Item'
    const quantity = item.quantity
    
    // Better price calculation for both products and side business items
    let price = 0
    if (item.customPrice) {
      price = item.customPrice
    } else if (item.calculatedPrice) {
      price = item.calculatedPrice / quantity // Convert total back to per-item price
    } else if (item.product?.price) {
      price = item.product.price
    } else if (item.sideBusinessItem?.price) {
      price = item.sideBusinessItem.price
    }
    
    let itemTotal = 0
    if (item.weight && item.calculatedPrice) {
      // Weighted item (products only)
      itemTotal = item.calculatedPrice
      speechText += `Item ${index + 1}: ${itemName}, ${item.weight} units at €${item.product?.price_per_unit?.toFixed(2) || '0.00'} per unit, `
    } else {
      // Regular item (products or side business items)
      itemTotal = price * quantity
      speechText += `Item ${index + 1}: ${itemName}, quantity ${quantity}, €${price.toFixed(2)} each, `
    }
    
    runningTotal += itemTotal
    
    // Randomly vary the phrasing to sound more natural, but always say the total
    const phrases = [
      `making this €${runningTotal.toFixed(2)}. `,
      `total so far €${runningTotal.toFixed(2)}. `,
      `€${runningTotal.toFixed(2)} total. `,
      `running total €${runningTotal.toFixed(2)}. `,
      `€${runningTotal.toFixed(2)}. `,
      `now at €${runningTotal.toFixed(2)}. `
    ]
    
    // Always say the total, but with varied phrasing
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)]
    speechText += randomPhrase
  })

  await ttsService.speak(speechText)
  
  // Wait a moment, then add the Nigerian food-themed ending message
  setTimeout(async () => {
    const randomMessage = orderEndMessages[Math.floor(Math.random() * orderEndMessages.length)]
    await ttsService.speak(randomMessage)
  }, 500)
}

const speakOrderTotal = async (total: number) => {
  const totalMessages = [
    `Your total is €${total.toFixed(2)}. Time to feast!`,
    `Total: €${total.toFixed(2)}. Your taste buds are about to dance!`,
    `€${total.toFixed(2)} total. May your meals be blessed!`,
    `Order total: €${total.toFixed(2)}. Even jollof rice approves!`
  ]
  const randomTotalMessage = totalMessages[Math.floor(Math.random() * totalMessages.length)]
  await ttsService.speak(randomTotalMessage)
}

const speakItemAdded = async (itemName: string, price: number) => {
  await ttsService.speak(`${itemName} added to order for €${price.toFixed(2)}.`)
}

interface Product {
  product_id: string
  name: string
  price: number
  category: string
  stock_quantity: number
  image_url?: string
  weight_unit?: string // e.g., 'kg', 'g', 'lb', 'oz'
  price_per_unit?: number // price per weight unit (e.g., 3.00 per kg)
  is_weighted?: boolean // true if item is sold by weight
  variations?: ProductVariation[] | null
}

interface SideBusinessItem {
  item_id: number
  business_id: number
  name: string
  price: number | null
  stock_quantity: number | null
  side_businesses?: {
    name: string
    business_type: string
  }
}

interface OrderItem {
  product?: Product
  sideBusinessItem?: SideBusinessItem
  quantity: number
  customPrice?: number // For service items with custom pricing
  weight?: number // Weight/quantity for weighted items
  calculatedPrice?: number // Calculated price for weighted items
  originalQuantity?: number
  originalWeight?: number
  originalCalculatedPrice?: number
}

interface Order {
  items: OrderItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
}

const Sales = () => {
  const { user } = useAuth()
  const { businessId, businessLoading } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const { currentBusiness } = useBusiness()
  const { isCollapsed } = useNav()
  const { calculatePromotions, activePromotions } = usePromotions(businessId || null, selectedBranchId || null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [sideBusinessItems, setSideBusinessItems] = useState<SideBusinessItem[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [filteredSideBusinessItems, setFilteredSideBusinessItems] = useState<SideBusinessItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('Quick Access')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<(Product | SideBusinessItem)[]>([])
  const [topProducts, setTopProducts] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isFiltering, setIsFiltering] = useState(false)
  const [orderDetailNumber, setOrderDetailNumber] = useState(() => generateOrderDetailNumber())
  const [order, setOrder] = useState<Order>({
    items: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0
  })
  const [promotionsEnabled, setPromotionsEnabled] = useState(false)
  const [hasUserToggledPromotions, setHasUserToggledPromotions] = useState(false)
  const [selectedPromotionId, setSelectedPromotionId] = useState<number | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerGender, setCustomerGender] = useState<'male' | 'female' | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showSalesSummary, setShowSalesSummary] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountEntered, setAmountEntered] = useState('')
  const [change, setChange] = useState(0)
  const changeBreakdown = useMemo(() => calculateChangeBreakdown(change), [change])
  const [receiptNotes, setReceiptNotes] = useState('')
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [showCustomPriceModal, setShowCustomPriceModal] = useState(false)
  const [pendingSideBusinessItem, setPendingSideBusinessItem] = useState<SideBusinessItem | null>(null)
  const [customPriceInput, setCustomPriceInput] = useState('')
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [pendingWeightedProduct, setPendingWeightedProduct] = useState<Product | null>(null)
  const [weightInput, setWeightInput] = useState('')
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)
  
  // Quick Access states
  const [quickAccessProductIds, setQuickAccessProductIds] = useState<Set<string>>(new Set())
  const [quickAccessSideBusinessIds, setQuickAccessSideBusinessIds] = useState<Set<string>>(new Set())
  const [isLoadingQuickAccess, setIsLoadingQuickAccess] = useState(false)
  
  // Category display states
  const [showAllCategories, setShowAllCategories] = useState(false)
  
  // Multiply mode states
  const [multiplyMode, setMultiplyMode] = useState(false)
  const [showQuantityModal, setShowQuantityModal] = useState(false)
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null)
  const [quantityInput, setQuantityInput] = useState('1')
  
  // Quick Service states
  const [showQuickServiceModal, setShowQuickServiceModal] = useState(false)
  const [quickServiceName, setQuickServiceName] = useState('')
  const [quickServicePrice, setQuickServicePrice] = useState('')
  const [quickServiceBusiness, setQuickServiceBusiness] = useState('')
  const [serviceBusinesses, setServiceBusinesses] = useState<{business_id: number, name: string}[]>([])
  
  // Add Product modal states
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  
  
  // TTS states - using the new TTS service
  const [, setTtsSettings] = useState<TTSSettings>(ttsService.getSettings())
  const [isTtsPlaying, setIsTtsPlaying] = useState(false)
  
  // Barcode scanner states
  const [barcodeScannerActive, setBarcodeScannerActive] = useState(false) // Start as inactive
  const [barcodeStatus, setBarcodeStatus] = useState<'idle' | 'listening' | 'scanned' | 'not_found'>('idle') // Start as idle
  const [lastScannedBarcode, setLastScannedBarcode] = useState('')
  
  // Partial payment state
  const [allowPartialPayment, setAllowPartialPayment] = useState(false)
  
  // Calculator modal state
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false)
  const [partialAmount, setPartialAmount] = useState('')
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [partialPaymentNotes, setPartialPaymentNotes] = useState('')
  
  // Transaction context state
  const [existingTransactionId, setExistingTransactionId] = useState<string | null>(null)
  const [existingTransaction, setExistingTransaction] = useState<any>(null)
  const [isAddingToTransaction, setIsAddingToTransaction] = useState(false)
  
  // Stock alert modal state
  const [showStockAlert, setShowStockAlert] = useState(false)
  const [stockAlertProduct, setStockAlertProduct] = useState<Product | null>(null)
  const [stockAlertCurrentStock, setStockAlertCurrentStock] = useState(0)
  const [stockAlertRequestedQuantity, setStockAlertRequestedQuantity] = useState(0)

  useEffect(() => {
    if (businessLoading) {
      return
    }

        if (businessId == null) {
      setProducts([])
      setSideBusinessItems([])
      setTopProducts([])
      setCategories(['Quick Access'])
      setServiceBusinesses([])
      setExistingTransaction(null)
      setExistingTransactionId(null)
      setIsAddingToTransaction(false)
      return
    }

    // Load initial products and categories
    fetchAllProductsAndCategories()
    fetchServiceBusinesses()
    fetchQuickAccessItems()

    const transactionParam = searchParams.get('transaction')
    if (transactionParam) {
      setExistingTransactionId(transactionParam)
      setIsAddingToTransaction(true)
      fetchExistingTransaction(transactionParam)
    }
  }, [searchParams, businessId, businessLoading])

  // Filter products function
  const filterProducts = useCallback(() => {
    // Check if selected category is a side business category
    const isSideBusinessCategory = selectedCategory !== 'Quick Access' &&
      sideBusinessItems.some(item => item.side_businesses?.name === selectedCategory)
    
    // Debug logging removed per user preference
    
    // Filter the cached top products client-side
    let filteredProducts = topProducts

    // If there's a search term, search across ALL products regardless of category
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase().trim()
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchTermLower) ||
        p.category?.toLowerCase().includes(searchTermLower) ||
        p.description?.toLowerCase().includes(searchTermLower) ||
        p.sku?.toLowerCase().includes(searchTermLower)
      )
    } else {
      // Only apply category filtering when there's no search term
      if (selectedCategory === 'Quick Access') {
        // Show only products that are in quick access
        filteredProducts = filteredProducts.filter(p => quickAccessProductIds.has(p.product_id))
      } else if (isSideBusinessCategory) {
        // If it's a side business category, show no regular products
        filteredProducts = []
      } else {
        // If it's a regular product category, filter by category
        filteredProducts = filteredProducts.filter(p => p.category === selectedCategory)
      }
    }

    setFilteredProducts(filteredProducts)

    // Filter side business items (client-side since there are typically fewer)
    let filteredSideBusiness = sideBusinessItems

    // If there's a search term, search across ALL side business items regardless of category
    if (searchTerm) {
      filteredSideBusiness = filteredSideBusiness.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    } else {
      // Only apply category filtering when there's no search term
      if (selectedCategory === 'Quick Access') {
        // Show only side business items that are in quick access
        filteredSideBusiness = filteredSideBusiness.filter(item => 
          quickAccessSideBusinessIds.has(item.item_id.toString())
        )
      } else if (isSideBusinessCategory) {
        // If it's a side business category, show only items from that side business
        filteredSideBusiness = filteredSideBusiness.filter(item => 
          item.side_businesses?.name === selectedCategory
        )
      } else {
        // If it's a regular product category, show no side business items
        filteredSideBusiness = []
      }
    }

    setFilteredSideBusinessItems(filteredSideBusiness)
    
    // Debug logging removed per user preference
  }, [selectedCategory, searchTerm, sideBusinessItems, topProducts, quickAccessProductIds, quickAccessSideBusinessIds])

  // Separate effect for filtering products when category or search changes
  useEffect(() => {
    if (businessId && !businessLoading && topProducts.length > 0) {
      // Use client-side filtering for instant response
      filterProducts()
    } else if (businessId && !businessLoading && !topProducts.length) {
      // Only fetch from server if we don't have products cached
      fetchProducts(selectedCategory, searchTerm)
    }
  }, [filterProducts, businessId, businessLoading, topProducts.length, selectedCategory, searchTerm])

  // Note: TTS will only be triggered manually by the cashier when they want to announce the order
  // This ensures TTS is only used when the cashier has finished adding items

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Enter key to open sales summary
      if (e.key === 'Enter' && e.ctrlKey && order.items.length > 0) {
        e.preventDefault()
        setShowSalesSummary(true)
      }
      // Escape key to clear search
      if (e.key === 'Escape') {
        setSearchTerm('')
        setShowSuggestions(false)
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [order.items])


  useEffect(() => {
    // Always filter products based on current mode
    filterProducts()
  }, [products, sideBusinessItems, selectedCategory, searchTerm, topProducts])

  // Initial setup effect
  useEffect(() => {
    if (topProducts.length > 0 && filteredProducts.length === 0) {
      setFilteredProducts(topProducts)
    }
  }, [topProducts, filteredProducts.length])


  useEffect(() => {
    calculateOrderTotal()
  }, [order.items])

  // Recalculate totals when promotions state changes or active promos update
  useEffect(() => {
    calculateOrderTotal()
  }, [promotionsEnabled, selectedPromotionId])

  // Save cart to localStorage whenever order changes
  useEffect(() => {
    if (order.items.length > 0) {
      saveCartToStorage(order, selectedBranchId || null)
    }
  }, [order, selectedBranchId])

  // Load cart from localStorage on component mount and when branch changes
  useEffect(() => {
    const savedCart = loadCartFromStorage(selectedBranchId || null)
    if (savedCart && savedCart.items.length > 0) {
      setOrder(savedCart)
    } else {
      // Clear cart if no saved cart for this branch
      setOrder({
        items: [],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0
      })
    }
  }, [selectedBranchId])

  useEffect(() => {
    const amount = parseFloat(amountEntered) || 0
    const totalToPay = allowPartialPayment ? (parseFloat(partialAmount) || 0) : order.total
    const calculatedChange = amount - totalToPay
    setChange(calculatedChange > 0 ? calculatedChange : 0)
  }, [amountEntered, order.total, allowPartialPayment, partialAmount])

  // Calculate remaining amount for partial payments
  useEffect(() => {
    if (allowPartialPayment) {
      const partial = parseFloat(partialAmount) || 0
      const remaining = Math.max(0, order.total - partial)
      setRemainingAmount(remaining)
    } else {
      setRemainingAmount(0)
    }
  }, [allowPartialPayment, partialAmount, order.total])

  useEffect(() => {
    // Automatically set amount entered to total when order changes
    if (allowPartialPayment) {
      setAmountEntered(partialAmount || order.total.toString())
    } else {
      setAmountEntered(order.total.toString())
    }
  }, [order.total, allowPartialPayment, partialAmount])


  const fetchAllProductsAndCategories = async () => {
    if (businessLoading) {
      return
    }

    if (businessId == null) {
      setProducts([])
      setSideBusinessItems([])
      setTopProducts([])
      setCategories(['Quick Access'])
      setLoading(false)
      setIsFiltering(false)
      return
    }

    try {
      setLoading(true)

      // Fetch all products without category filter to get all categories
      const { data: allProductsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('sales_count', { ascending: false })
        .limit(100)

      if (productsError) throw productsError

      const { data: sideBusinessData, error: sideBusinessError } = await supabase
        .from('side_business_items')
        .select(`
          *,
          side_businesses (name, business_type)
        `)
        .eq('parent_shop_id', businessId)
        .order('name')

      if (sideBusinessError) throw sideBusinessError

      const safeProducts = allProductsData || []
      const safeSideBusinessItems = sideBusinessData || []

      // Set all products as top products (for filtering)
      setTopProducts(safeProducts)
      setSideBusinessItems(safeSideBusinessItems)

      // Build categories from all products
      const productCategories = safeProducts.map(p => p.category).filter(Boolean)
      const sideBusinessCategories = safeSideBusinessItems.map(item => item.side_businesses?.name).filter(Boolean)
      const allCategories = ['Quick Access', ...new Set([...productCategories, ...sideBusinessCategories])]
      setCategories(allCategories)

      setLoading(false)
      setIsFiltering(false)
    } catch (error) {
      console.error('Error fetching products:', error)
      setProducts([])
      setSideBusinessItems([])
      setTopProducts([])
      setCategories(['Quick Access'])
      setLoading(false)
      setIsFiltering(false)
    }
  }

  const fetchQuickAccessItems = async () => {
    if (!user || !businessId) {
      return
    }

    try {
      setIsLoadingQuickAccess(true)

      // Fetch quick access products
      const { data: quickAccessProducts, error: productsError } = await supabase
        .from('product_quick_access')
        .select('product_id')
        .eq('user_id', user.user_id)
        .eq('business_id', businessId)

      if (productsError) throw productsError

      // Fetch quick access side business items
      const { data: quickAccessSideBusiness, error: sideBusinessError } = await supabase
        .from('side_business_quick_access')
        .select('item_id')
        .eq('user_id', user.user_id)
        .eq('business_id', businessId)

      if (sideBusinessError) throw sideBusinessError

      // Update state with quick access IDs
      const productIds = new Set(quickAccessProducts?.map(item => item.product_id) || [])
      const sideBusinessIds = new Set(quickAccessSideBusiness?.map(item => item.item_id) || [])
      
      setQuickAccessProductIds(productIds)
      setQuickAccessSideBusinessIds(sideBusinessIds)
    } catch (error) {
      console.error('Error fetching quick access items:', error)
    } finally {
      setIsLoadingQuickAccess(false)
    }
  }

  const toggleQuickAccess = async (itemId: string, isProduct: boolean) => {
    if (!user || !businessId) {
      return
    }

    try {
      const tableName = isProduct ? 'product_quick_access' : 'side_business_quick_access'
      const idField = isProduct ? 'product_id' : 'item_id'
      const setIdState = isProduct ? setQuickAccessProductIds : setQuickAccessSideBusinessIds
      const currentIds = isProduct ? quickAccessProductIds : quickAccessSideBusinessIds

      const isCurrentlyQuickAccess = currentIds.has(itemId)

      if (isCurrentlyQuickAccess) {
        // Remove from quick access
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('user_id', user.user_id)
          .eq('business_id', businessId)
          .eq(idField, itemId)

        if (error) throw error

        // Update local state
        setIdState(prev => {
          const newSet = new Set(prev)
          newSet.delete(itemId)
          return newSet
        })
      } else {
        // Add to quick access
        const { error } = await supabase
          .from(tableName)
          .insert({
            user_id: user.user_id,
            business_id: businessId,
            [idField]: itemId
          })

        if (error) throw error

        // Update local state
        setIdState(prev => new Set([...prev, itemId]))
      }
    } catch (error) {
      console.error('Error toggling quick access:', error)
      // Could add toast notification here for user feedback
    }
  }

  const fetchProducts = async (category?: string, search?: string) => {
    if (businessLoading) {
      return
    }

    if (businessId == null) {
      setProducts([])
      setIsFiltering(false)
      return
    }

    try {
      // Only show loading for initial load, not for category switches
      if (!topProducts.length) {
        setLoading(true)
      }

      let query = supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('sales_count', { ascending: false })
        .limit(50)

      if (category && category !== 'All') {
        query = query.eq('category', category)
      }

      if (search && search.trim()) {
        const searchTerm = search.trim()
        query = query.or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
      }

      const { data: productsData, error: productsError } = await query
      if (productsError) throw productsError

      const safeProducts = productsData || []
      setProducts(safeProducts)
    } catch (error) {
      // Error fetching products - handled silently per user preference
    } finally {
      setLoading(false)
      setIsFiltering(false)
    }
  }


  const fetchServiceBusinesses = async () => {
    if (businessLoading || businessId == null) {
      setServiceBusinesses([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('side_businesses')
        .select('business_id, name')
        .eq('business_type', 'service')
        .eq('parent_shop_id', businessId)
        .order('name')

      if (error) throw error
      setServiceBusinesses(data || [])
    } catch (error) {
      console.error('Error fetching service businesses:', error)
      setServiceBusinesses([])
    }
  }

  const fetchExistingTransaction = async (transactionId: string) => {
    if (businessLoading || businessId == null) {
      return
    }

    try {
      const saleId = parseInt(transactionId.replace('TXN-', ''))

      const { data: transactionData, error: transactionError } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name)
        `)
        .eq('sale_id', saleId)
        .eq('business_id', businessId)
        .single()

      if (transactionError || !transactionData) {
        console.error('Error fetching transaction:', transactionError)
        return
      }
      setExistingTransaction(transactionData)

      const { data: itemsData, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          *,
          products (
            name,
            category,
            price,
            stock_quantity,
            image_url,
            is_weighted,
            weight_unit,
            price_per_unit
          )
        `)
        .eq('sale_id', saleId)

      if (itemsError) {
        console.error('Error fetching sale items:', itemsError)
        return
      }

      const existingItems: OrderItem[] = (itemsData || []).map(item => {
        const product: Product = {
          product_id: item.product_id.toString(),
          name: item.products?.name || 'Unknown Product',
          price: item.price_each,
          category: item.products?.category || 'Unknown',
          stock_quantity: item.products?.stock_quantity || 0,
          image_url: item.products?.image_url,
          is_weighted: item.products?.is_weighted || false,
          weight_unit: item.products?.weight_unit,
          price_per_unit: item.products?.price_per_unit
        }

        const orderItem: OrderItem = {
          product,
          quantity: item.quantity,
          originalQuantity: item.quantity
        }

        if (item.products?.is_weighted && item.weight && item.calculated_price) {
          orderItem.weight = item.weight
          orderItem.calculatedPrice = item.calculated_price
          orderItem.originalWeight = item.weight
          orderItem.originalCalculatedPrice = item.calculated_price
        }

        return orderItem
      })

      const { data: sideSalesData, error: sideSalesError } = await supabase
        .from('side_business_sales')
        .select(`
          sale_id,
          quantity,
          total_amount,
          item_id,
          parent_shop_id,
          side_business_items (
            item_id,
            business_id,
            name,
            price,
            stock_qty,
            side_businesses (
              name,
              business_type
            )
          )
        `)
        .eq('sale_id', saleId)
        .eq('parent_shop_id', businessId)

      if (sideSalesError) {
        console.error('Error fetching side business items:', sideSalesError)
      }

      const existingServiceItems: OrderItem[] = (sideSalesData || [])
        .map(serviceItem => {
          const sideItemData = serviceItem.side_business_items
          if (!sideItemData) {
            return null
          }

          const quantity = serviceItem.quantity ?? 0
          const totalAmount = Number(serviceItem.total_amount ?? 0)
          const unitPrice = quantity > 0
            ? totalAmount / quantity
            : (sideItemData.price ?? 0)

          const sideBusinessItem: SideBusinessItem = {
            item_id: sideItemData.item_id,
            business_id: sideItemData.business_id,
            name: sideItemData.name,
            price: sideItemData.price,
            stock_qty: sideItemData.stock_qty,
            side_businesses: sideItemData.side_businesses
              ? {
                  name: sideItemData.side_businesses.name,
                  business_type: sideItemData.side_businesses.business_type
                }
              : undefined
          }

          const orderItem: OrderItem = {
            sideBusinessItem,
            quantity: quantity || 1,
            originalQuantity: quantity || 0
          }

          const referencePrice = Number.isFinite(unitPrice) ? unitPrice : 0
          const basePrice = sideBusinessItem.price ?? 0
          const hasCustomPrice =
            sideBusinessItem.price == null ||
            (quantity > 0 && Math.abs(basePrice * quantity - totalAmount) > 0.01)

          if (hasCustomPrice) {
            orderItem.customPrice = referencePrice
          }

          return orderItem
        })
        .filter((item): item is OrderItem => item !== null)

      const combinedItems = [...existingItems, ...existingServiceItems]

      // Set the order with items first, then let calculateOrderTotal handle the totals
      setOrder({
        items: combinedItems,
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0
      })
      
      setOrderDetailNumber(Number.isFinite(saleId) ? saleId : generateOrderDetailNumber())

      if (transactionData.customers?.name) {
        setCustomerName(transactionData.customers.name)
      }

    } catch (error) {
      // Error fetching existing transaction - handled silently per user preference
    }
  }

  const generateSearchSuggestions = (term: string) => {
    if (term.length < 2) {
      setSearchSuggestions([])
      setShowSuggestions(false)
      return
    }

    const searchTerm = term.toLowerCase().trim()

    // Search through regular products with improved matching
    const productSuggestions = products
      .filter(p => {
        const nameMatch = p.name.toLowerCase().includes(searchTerm)
        const categoryMatch = p.category?.toLowerCase().includes(searchTerm)
        const descriptionMatch = p.description?.toLowerCase().includes(searchTerm)
        const skuMatch = p.sku?.toLowerCase().includes(searchTerm)
        
        return nameMatch || categoryMatch || descriptionMatch || skuMatch
      })
      .slice(0, 3) // Limit to 3 product suggestions

    // Search through side business items
    const sideBusinessSuggestions = sideBusinessItems
      .filter(item => {
        const nameMatch = item.name.toLowerCase().includes(searchTerm)
        const businessMatch = item.side_businesses?.name.toLowerCase().includes(searchTerm)
        
        return nameMatch || businessMatch
      })
      .slice(0, 2) // Limit to 2 side business suggestions

    // Combine suggestions (products first, then side business items)
    const allSuggestions = [...productSuggestions, ...sideBusinessSuggestions]
      .slice(0, 5) // Total limit of 5 suggestions

    setSearchSuggestions(allSuggestions)
    setShowSuggestions(allSuggestions.length > 0)
  }


  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    
    // Check if it looks like a barcode (8-20 digits) and auto-detect
    if (value.trim() && /^\d{8,20}$/.test(value.trim())) {
      // Small delay to ensure it's a complete barcode scan, not typing
      setTimeout(() => {
        if (searchTerm === value && value.trim() && /^\d{8,20}$/.test(value.trim())) {
          handleBarcodeScanned(value.trim())
          setSearchTerm('')
          return
        }
      }, 100)
    }
    
    generateSearchSuggestions(value)
  }


  const selectSuggestion = (item: Product | SideBusinessItem) => {
    setSearchTerm(item.name)
    setShowSuggestions(false)
    setSearchSuggestions([])
    
    // Check if it's a product or side business item and add accordingly
    if ('product_id' in item) {
      // It's a Product
      addToOrder(item as Product)
    } else {
      // It's a SideBusinessItem
      addSideBusinessItemToOrder(item as SideBusinessItem)
    }
  }

  const calculateOrderTotal = () => {
    const subtotal = order.items.reduce((sum, item) => {
      if (item.product) {
        // Check if this is a weighted item
        if (item.weight && item.calculatedPrice) {
          return sum + item.calculatedPrice
        }
        // Regular product
        return sum + (item.product.price * item.quantity)
      } else if (item.sideBusinessItem) {
        // Use custom price if available, otherwise use item price
        const price = item.customPrice || item.sideBusinessItem.price || 0
        return sum + (price * item.quantity)
      }
      return sum
    }, 0)
    
    const tax = 0 // No tax
    
    // Calculate promotion discounts (only if promotions are enabled or there are active promos)
    let totalDiscount = 0
    if (calculatePromotions && order.items.length > 0) {
      // Convert order items to the format expected by calculatePromotions
      const itemsForPromotion = order.items
        .filter(item => item.product) // Only include products, not side business items
        .map(item => ({
          product_id: item.product!.product_id,
          quantity: item.quantity,
          price: item.weight && item.calculatedPrice 
            ? item.calculatedPrice / item.quantity 
            : item.product!.price,
          category: item.product!.category
        }))
      
      if (itemsForPromotion.length > 0) {
        const applicablePromotions = calculatePromotions(itemsForPromotion, subtotal)
        const hasActivePromotions = applicablePromotions && applicablePromotions.length > 0
        // Enable promos automatically only if there is at least one active promo and the user hasn't toggled manually
        if (hasActivePromotions && !hasUserToggledPromotions && !promotionsEnabled) {
          setPromotionsEnabled(true)
        }
        if (promotionsEnabled && hasActivePromotions) {
          // If user selected a specific promotion, apply only that one
          if (selectedPromotionId) {
            const chosen = applicablePromotions.find(p => p.promotion.promotion_id === selectedPromotionId)
            if (chosen) {
              totalDiscount = chosen.discount
            }
          } else {
            // Otherwise apply the best discount by default
            totalDiscount = applicablePromotions.reduce((max, p) => Math.max(max, p.discount), 0)
          }
        }
      }
    }
    
    const total = subtotal - totalDiscount

    setOrder(prev => ({
      ...prev,
      subtotal,
      tax,
      discount: totalDiscount,
      total
    }))
  }

  const addToOrder = (product: Product) => {
    // Check if this is a weighted product
    if (product.is_weighted && product.price_per_unit && product.weight_unit) {
      // Show weight input modal for weighted products
      setPendingWeightedProduct(product)
      setWeightInput('')
      setShowWeightModal(true)
      return
    }

    // If multiply mode is enabled, show quantity modal
    if (multiplyMode) {
      setPendingProduct(product)
      setQuantityInput('1')
      setShowQuantityModal(true)
      return
    }

    // Check stock availability for regular products
    const existingItem = order.items.find(item => 
      item.product?.product_id === product.product_id && !item.weight
    )
    
    const requestedQuantity = existingItem ? existingItem.quantity + 1 : 1
    
    // If stock would go below 0, show stock alert modal
    if (product.stock_quantity < requestedQuantity) {
      setStockAlertProduct(product)
      setStockAlertCurrentStock(product.stock_quantity)
      setStockAlertRequestedQuantity(requestedQuantity)
      setShowStockAlert(true)
      return
    }

    // Regular product handling - stock is sufficient
    setOrder(prev => {
      const existingItem = prev.items.find(item => 
        item.product?.product_id === product.product_id && !item.weight // Only match non-weighted items
      )
      
      if (existingItem) {
        return {
          ...prev,
          items: prev.items.map(item =>
            item.product?.product_id === product.product_id && !item.weight
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
      } else {
        return {
          ...prev,
          items: [...prev.items, { product, quantity: 1, originalQuantity: 0 }]
        }
      }
    })
  }

  const addToOrderWithQuantity = (product: Product, quantity: number) => {
    // Find existing item in cart (non-weighted products only)
    const existingItem = order.items.find(item => 
      item.product?.product_id === product.product_id && !item.weight
    )
    
    // Calculate total quantity after adding
    const currentQuantity = existingItem ? existingItem.quantity : 0
    const newTotalQuantity = currentQuantity + quantity
    
    // Check stock availability
    if (product.stock_quantity < newTotalQuantity) {
      setStockAlertProduct(product)
      setStockAlertCurrentStock(product.stock_quantity)
      setStockAlertRequestedQuantity(newTotalQuantity)
      setShowStockAlert(true)
      return
    }

    // Add or update product in cart
    setOrder(prev => {
      if (existingItem) {
        // Update existing item quantity
        return {
          ...prev,
          items: prev.items.map(item =>
            item.product?.product_id === product.product_id && !item.weight
              ? { ...item, quantity: newTotalQuantity }
              : item
          )
        }
      } else {
        // Add new item to cart
        return {
          ...prev,
          items: [...prev.items, { 
            product, 
            quantity, 
            originalQuantity: 0 
          }]
        }
      }
    })
  }

  const handleQuickRestock = async (product: Product, newStock: number) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newStock,
          last_updated: getLocalDateTime()
        })
        .eq('product_id', product.product_id)
        .eq('business_id', businessId)

      if (error) throw error

      // Update local products state
      setProducts(prev => 
        prev.map(p => 
          p.product_id === product.product_id 
            ? { ...p, stock_quantity: newStock }
            : p
        )
      )

      // Now add the product to the order since stock is updated
      addToOrder({ ...product, stock_quantity: newStock })
      
    } catch (error) {
      console.error('Error updating stock:', error)
      throw error
    }
  }

  const addWeightedProductToOrder = (product: Product, weight: number) => {
    const calculatedPrice = weight * (product.price_per_unit || 0)
    
    if (pendingItemId) {
      // Update existing weighted item
      setOrder(prev => ({
        ...prev,
        items: prev.items.map(item => {
          if (item.product?.product_id === pendingItemId && item.weight) {
            return { 
              ...item, 
              weight, 
              calculatedPrice 
            }
          }
          return item
        })
      }))
    } else {
      // Add new weighted item
      setOrder(prev => ({
        ...prev,
        items: [...prev.items, { 
          product, 
          quantity: 1, 
          weight, 
          calculatedPrice, 
          originalQuantity: 0, 
          originalWeight: 0, 
          originalCalculatedPrice: 0 
        }]
      }))
    }
    
    setShowWeightModal(false)
    setPendingWeightedProduct(null)
    setPendingItemId(null)
    setWeightInput('')
  }

  const addSideBusinessItemToOrder = (sideBusinessItem: SideBusinessItem) => {
    // For service items without fixed prices, show custom price modal
    // Check if price is null or undefined (but allow 0 as a valid price)
    if (sideBusinessItem.price == null) {
      setPendingSideBusinessItem(sideBusinessItem)
      setCustomPriceInput('')
      setShowCustomPriceModal(true)
    } else {
      // Regular item with fixed price
      setOrder(prev => {
        const existingItem = prev.items.find(item => item.sideBusinessItem?.item_id === sideBusinessItem.item_id)
        
        if (existingItem) {
          return {
            ...prev,
            items: prev.items.map(item =>
              item.sideBusinessItem?.item_id === sideBusinessItem.item_id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          }
        } else {
          return {
            ...prev,
            items: [...prev.items, { sideBusinessItem, quantity: 1, originalQuantity: 0 }]
          }
        }
      })
      
    }
  }

  const handleCustomPriceSubmit = () => {
    if (!pendingSideBusinessItem) return
    
    const price = parseFloat(customPriceInput)
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price')
      return
    }
    
    setOrder(prev => {
      const existingItem = prev.items.find(item => 
        item.sideBusinessItem?.item_id === pendingSideBusinessItem.item_id && 
        item.customPrice === price
      )
      
      if (existingItem) {
        return {
          ...prev,
          items: prev.items.map(item =>
            item.sideBusinessItem?.item_id === pendingSideBusinessItem.item_id && item.customPrice === price
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        }
      } else {
        return {
          ...prev,
          items: [...prev.items, { sideBusinessItem: pendingSideBusinessItem, quantity: 1, customPrice: price, originalQuantity: 0 }]
        }
      }
    })
    
    setShowCustomPriceModal(false)
    setPendingSideBusinessItem(null)
    setCustomPriceInput('')
  }

  const createQuickService = async () => {
    if (businessLoading) return

    if (businessId == null) {
      alert('Please select a business before creating a quick service item')
      return
    }

    if (!quickServiceName.trim() || !quickServicePrice || !quickServiceBusiness) {
      alert('Please fill in all fields')
      return
    }

    const price = parseFloat(quickServicePrice)
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price')
      return
    }

    try {
      // Create a temporary side business item for the order
      const tempServiceItem: SideBusinessItem = {
        item_id: Date.now(), // Temporary ID
        business_id: parseInt(quickServiceBusiness),
        name: quickServiceName.trim(),
        price: price,
        stock_quantity: null, // Services don't have stock
        side_businesses: {
          name: serviceBusinesses.find(b => b.business_id.toString() === quickServiceBusiness)?.name || 'Service',
          business_type: 'service'
        }
      }

      // Add to order
      setOrder(prev => ({
        ...prev,
        items: [...prev.items, { sideBusinessItem: tempServiceItem, quantity: 1, customPrice: price, originalQuantity: 0 }]
      }))

      // Reset form and close modal
      setQuickServiceName('')
      setQuickServicePrice('')
      setQuickServiceBusiness('')
      setShowQuickServiceModal(false)

    } catch (error) {
      console.error('Error creating quick service:', error)
      alert('Failed to create service. Please try again.')
    }
  }

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromOrder(itemId)
      return
    }

    setOrder(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.product?.product_id === itemId) {
          return { ...item, quantity: newQuantity }
        } else if (item.sideBusinessItem?.item_id.toString() === itemId || 
                   `sb-${item.sideBusinessItem?.item_id}` === itemId) {
          return { ...item, quantity: newQuantity }
        }
        return item
      })
    }))
  }

  // New function to update weight for weighted items
  const updateWeight = (itemId: string, newWeight: number) => {
    if (newWeight <= 0) {
      removeFromOrder(itemId)
      return
    }

    setOrder(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.product?.product_id === itemId && item.weight) {
          const calculatedPrice = newWeight * (item.product.price_per_unit || 0)
          return { 
            ...item, 
            weight: newWeight, 
            calculatedPrice 
          }
        }
        return item
      })
    }))
  }

  // Barcode scanning functions
  const normalizeBarcodeValue = (value: string | null | undefined) =>
    typeof value === 'string' ? value.trim().toLowerCase() : ''

  const findProductByBarcode = (barcode: string): Product | null => {
    const normalized = normalizeBarcodeValue(barcode)
    return products.find(product => normalizeBarcodeValue(product.barcode) === normalized) || null
  }

    const toNumber = (value: any, fallback = 0) => {
    if (value == null || value == '') return fallback
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
    const parsed = parseFloat(String(value))
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const toInteger = (value: any, fallback = 0) => {
    if (value == null || value == '') return fallback
    if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : fallback
    const parsed = parseInt(String(value), 10)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  const normalizeProduct = (raw: any): Product => ({
    ...raw,
    price: toNumber(raw.price),
    stock_quantity: toInteger(raw.stock_quantity),
    reorder_level: toInteger(raw.reorder_level),
    tax_rate: toNumber(raw.tax_rate),
    is_weighted: Boolean(raw.is_weighted),
    price_per_unit: raw.price_per_unit == null ? null : toNumber(raw.price_per_unit),
    total_revenue: raw.total_revenue == null ? undefined : toNumber(raw.total_revenue),
    sales_count: raw.sales_count == null ? undefined : toInteger(raw.sales_count),
    last_updated: raw.last_updated,
    weight_unit: raw.weight_unit,
    description: raw.description,
    sku: raw.sku,
    barcode: typeof raw.barcode === 'string' ? raw.barcode.trim() : raw.barcode,
    supplier_info: raw.supplier_info,
    image_url: raw.image_url
  })

  const handleBarcodeScanned = async (barcode: string) => {
    let product = findProductByBarcode(barcode)

    if (!product) {
      if (businessId == null) {
        setBarcodeStatus('not_found')
        setLastScannedBarcode(barcode)
        setTimeout(() => {
          setBarcodeStatus('idle')
        }, 3000)
        return
      }

      const normalizedBarcode = normalizeBarcodeValue(barcode)
      const { data: remoteProducts, error: remoteError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .ilike('barcode', normalizedBarcode)
        .limit(1)
      

      if (remoteError) {
        console.error('Barcode lookup failed:', remoteError)
      }

      const remoteProductData = remoteProducts && remoteProducts.length > 0
        ? remoteProducts[0]
        : null

      if (remoteProductData) {
        const normalizedProduct = normalizeProduct(remoteProductData)
        product = normalizedProduct

        setProducts(prev => {
          if (prev.some(p => p.product_id === normalizedProduct.product_id)) {
            return prev
          }
          const updated = [normalizedProduct, ...prev]
          return updated.slice(0, 50)
        })

        setTopProducts(prev => {
          if (prev.some(p => p.product_id === normalizedProduct.product_id)) {
            return prev
          }
          const updated = [normalizedProduct, ...prev]
          return updated.slice(0, 50)
        })
      }
    }

    if (product) {
      addToOrder(product)
      setBarcodeStatus('scanned')
      setLastScannedBarcode(barcode)

      setTimeout(() => {
        setBarcodeStatus('idle')
      }, 2000)
    } else {
      setBarcodeStatus('not_found')
      setLastScannedBarcode(barcode)

      setTimeout(() => {
        setBarcodeStatus('idle')
      }, 3000)
    }
  }


  const toggleBarcodeScanner = () => {
    if (barcodeScannerActive) {
      stopListening()
      setBarcodeScannerActive(false)
      setBarcodeStatus('idle')
    } else {
      startListening()
      setBarcodeScannerActive(true)
      setBarcodeStatus('listening')
    }
  }

  // Initialize barcode scanner
  const { isListening, startListening, stopListening } = useBarcodeScanner({
    onBarcodeScanned: handleBarcodeScanned,
    debounceMs: 30, // Reduced for faster scanners
    minLength: 8,
    maxLength: 20,
    isActive: barcodeScannerActive,
    context: 'sales-page'
  })

  // Manual scanner management - no automatic start/stop

  // Set modal state when sales page modals open/close
  useEffect(() => {
    const anyModalOpen = showCustomPriceModal || showWeightModal || showQuickServiceModal || showSalesSummary
    setModalOpen(anyModalOpen)
  }, [showCustomPriceModal, showWeightModal, showQuickServiceModal, showSalesSummary])

  // Global barcode detection fallback
  useEffect(() => {
    if (!barcodeScannerActive) return

    const handleGlobalInput = (event: Event) => {
      // Check if this is a barcode scanner input
      if (event.target && (event.target as HTMLElement).tagName === 'INPUT') {
        const input = event.target as HTMLInputElement
        const value = input.value.trim()
        
        // Check if this looks like a barcode (8-20 characters, mostly alphanumeric)
        if (value.length >= 8 && value.length <= 20 && /^[A-Za-z0-9]+$/.test(value)) {
          handleBarcodeScanned(value)
          input.value = ''
        }
      }
    }

    // Add global input listener
    document.addEventListener('input', handleGlobalInput, true)
    
    return () => {
      document.removeEventListener('input', handleGlobalInput, true)
    }
  }, [barcodeScannerActive, handleBarcodeScanned])

  // New function to show weight edit modal
  const showWeightEditModal = (item: OrderItem) => {
    if (item.product && item.weight) {
      setPendingWeightedProduct(item.product)
      setWeightInput(item.weight.toString())
      setShowWeightModal(true)
      // Store the item ID to update the correct item
      setPendingItemId(item.product.product_id)
    }
  }

  const removeFromOrder = (itemId: string) => {
    setOrder(prev => ({
      ...prev,
      items: prev.items.filter(item => 
        item.product?.product_id !== itemId && 
        item.sideBusinessItem?.item_id.toString() !== itemId &&
        `sb-${item.sideBusinessItem?.item_id}` !== itemId
      )
    }))
  }


  const resetTransaction = () => {
    if (window.confirm('Are you sure you want to reset the current transaction? This will clear all items from the order.')) {
      setOrder({
        items: [],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0
      })
      setOrderDetailNumber(generateOrderDetailNumber())
      setCustomerName('')
      setCustomerPhone('')
      setSelectedCustomer(null)
      setPaymentMethod('cash')
      setAmountEntered('')
      setChange(0)
      setReceiptNotes('')
      clearCartFromStorage(selectedBranchId || null) // Clear cart from localStorage
      
      // Show success message
      const successMsg = document.createElement('div')
      successMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `
      successMsg.textContent = 'Transaction reset successfully!'
      document.body.appendChild(successMsg)
      
      setTimeout(() => {
        document.body.removeChild(successMsg)
      }, 3000)
    }
  }

  const generateReceiptHTML = () => {
    const paymentInfo = {
      method: paymentMethod,
      amountEntered: amountEntered,
      change: change,
      customerName: customerName,
      receiptNotes: receiptNotes
    }

    const partialPayment = allowPartialPayment ? {
      amountPaid: parseFloat(partialAmount) || 0,
      amountRemaining: remainingAmount,
      dueDate: null,
      notes: partialPaymentNotes
    } : undefined

    return generateReceiptHTMLUtil(order, paymentInfo, user, currentBusiness, partialPayment)
  }

  const printReceipt = () => {
    const paymentInfo = {
      method: paymentMethod,
      amountEntered: amountEntered,
      change: change,
      customerName: customerName,
      receiptNotes: receiptNotes
    }

    const partialPayment = allowPartialPayment ? {
      amountPaid: parseFloat(partialAmount) || 0,
      amountRemaining: remainingAmount,
      dueDate: null,
      notes: partialPaymentNotes
    } : undefined

    printReceiptUtil(order, paymentInfo, user, currentBusiness, partialPayment)
  }

  const processSale = async () => {
    if (order.items.length === 0 || businessLoading) return

    if (businessId == null) {
      alert('Please select a business before processing a sale.')
      return
    }

    // Open cash drawer/till
    console.log('Opening cash drawer...')
    openCashDrawer()

    try {
      let saleData
      // Ensure customerId is visible across the entire function and in all branches
      let customerId: number | null = null
      
      if (isAddingToTransaction && existingTransactionId) {
        // Adding to existing transaction
        const saleId = parseInt(existingTransactionId.replace('TXN-', ''))
        
        // Update existing sale record with new total
        const { data: updatedSale, error: updateError } = await supabase
          .from('sales')
          .update({
            total_amount: order.total,
            payment_method: paymentMethod
          })
          .eq('sale_id', saleId)
          .eq('business_id', businessId)
          .select()
          .single()

        if (updateError) throw updateError
        saleData = updatedSale
      } else {
        // Create new sale record
        // Handle customer if name is provided
        if (customerName.trim()) {
          if (selectedCustomer) {
            // Use the selected customer's ID
            customerId = selectedCustomer.customer_id
          } else {
            // Check if customer exists
            let customerQuery = supabase
              .from('customers')
              .select('customer_id')
              .eq('business_id', businessId)
              .eq('name', customerName.trim())

            if (selectedBranchId) {
              customerQuery = customerQuery.eq('branch_id', selectedBranchId)
            }

            const { data: existingCustomer, error: lookupError } = await customerQuery.single()

            if (existingCustomer && !lookupError) {
              customerId = existingCustomer.customer_id
            } else {
            // Create new customer
            const customerIcon = customerGender ? getRandomCustomerIcon(customerGender) : null
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert([{
                name: customerName.trim(),
                phone_number: customerPhone.trim() || '000-000-0000', // Use provided phone or default
                email: null,
                business_id: businessId,
                branch_id: selectedBranchId,
                gender: customerGender,
                icon: customerIcon
              }])
              .select()
              .single()

            if (customerError) {
              console.error('Error creating customer:', customerError)
              // Continue without customer ID if creation fails
              customerId = null
            } else {
              customerId = newCustomer.customer_id
            }
            }
          }
        }

        // Prepare notes with partial payment information
        let notesContent = ''
        if (allowPartialPayment) {
          notesContent = `PARTIAL PAYMENT
Amount Paid Today: €${(parseFloat(partialAmount) || 0).toFixed(2)}
Remaining Balance: €${remainingAmount.toFixed(2)}`
          if (partialPaymentNotes) {
            notesContent += `\n\nPartial Payment Notes: ${partialPaymentNotes}`
          }
        }
        if (receiptNotes) {
          notesContent += (notesContent ? '\n\n' : '') + receiptNotes
        }

        // Try to insert with notes, fallback without if field doesn't exist
        let newSaleData, saleError
        try {
          const insertData = {
            datetime: getLocalDateTime(),
            total_amount: allowPartialPayment ? (parseFloat(partialAmount) || 0) : order.total,
            payment_method: paymentMethod,
            cashier_id: user?.user_id,
            customer_id: customerId,
            discount_applied: order.discount,
            partial_payment: allowPartialPayment,
            partial_amount: allowPartialPayment ? (parseFloat(partialAmount) || 0) : null,
            remaining_amount: allowPartialPayment ? remainingAmount : null,
            partial_notes: allowPartialPayment ? partialPaymentNotes : null,
            notes: notesContent || null,
            business_id: businessId,
            branch_id: selectedBranchId
          }
          
          const result = await supabase
            .from('sales')
            .insert([insertData])
            .select('*')
            .single()
          
          newSaleData = result.data
          saleError = result.error
        } catch (error) {
          // If notes field doesn't exist, try without it
          const insertData = {
            datetime: getLocalDateTime(),
            total_amount: allowPartialPayment ? (parseFloat(partialAmount) || 0) : order.total,
            payment_method: paymentMethod,
            cashier_id: user?.user_id,
            customer_id: customerId,
            discount_applied: order.discount,
            partial_payment: allowPartialPayment,
            partial_amount: allowPartialPayment ? (parseFloat(partialAmount) || 0) : null,
            remaining_amount: allowPartialPayment ? remainingAmount : null,
            partial_notes: allowPartialPayment ? partialPaymentNotes : null,
            business_id: businessId,
            branch_id: selectedBranchId
          }
          
          const result = await supabase
            .from('sales')
            .insert([insertData])
            .select('*')
            .single()
          
          newSaleData = result.data
          saleError = result.error
        }

        if (saleError) throw saleError
        saleData = newSaleData
      }

      // Create sale items and update stock
      if (isAddingToTransaction && existingTransactionId) {
        type SaleItemAddition = {
          record: {
            sale_id: number
            product_id: string
            quantity: number
            price_each: number
            weight: number | null
            calculated_price: number | null
          }
          revenue: number
        }

        const saleItemAdditions = order.items
          .filter(item => item.product)
          .reduce((acc, item) => {
            const originalQuantity = item.originalQuantity ?? 0
            const quantityDelta = item.quantity - originalQuantity

            if (item.weight && item.calculatedPrice) {
              const originalWeight = item.originalWeight ?? 0
              const weightDelta = (item.weight || 0) - originalWeight
              const originalCalc = item.originalCalculatedPrice ?? 0
              const priceDelta = (item.calculatedPrice || 0) - originalCalc

              if (weightDelta > 0 && priceDelta > 0) {
                acc.push({
                  record: {
                    sale_id: saleData.sale_id,
                    product_id: item.product!.product_id,
                    quantity: quantityDelta > 0 ? quantityDelta : 1,
                    price_each: item.product!.price,
                    weight: weightDelta,
                    calculated_price: priceDelta
                  },
                  revenue: priceDelta
                })
              }
            } else if (quantityDelta > 0) {
              acc.push({
                record: {
                  sale_id: saleData.sale_id,
                  product_id: item.product!.product_id,
                  quantity: quantityDelta,
                  price_each: item.product!.price,
                  weight: null,
                  calculated_price: null
                },
                revenue: item.product!.price * quantityDelta
              })
            }

            return acc
          }, [] as SaleItemAddition[])

        if (saleItemAdditions.length > 0) {
          const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(saleItemAdditions.map(item => item.record))

          if (itemsError) throw itemsError

          for (const addition of saleItemAdditions) {
            const { error: updateError } = await supabase
              .rpc('increment_product_sales', {
                product_id_param: addition.record.product_id,
                revenue_amount: addition.revenue,
                business_id_param: businessId
              })

            if (updateError) {
              console.error('Error updating product sales counter:', updateError)
            }
          }
        }

        const sideBusinessItems = order.items.filter(item => item.sideBusinessItem)

        for (const item of sideBusinessItems) {
          const originalQuantity = item.originalQuantity ?? 0
          const quantityDelta = item.quantity - originalQuantity
          if (quantityDelta <= 0) {
            continue
          }

          let itemId = item.sideBusinessItem!.item_id

          if (itemId > 1000000000) {
            const { data: newItem, error: createItemError } = await supabase
              .from('side_business_items')
              .insert({
                business_id: item.sideBusinessItem!.business_id,
                parent_shop_id: businessId,
                name: item.sideBusinessItem!.name,
                price: item.customPrice || item.sideBusinessItem!.price,
                stock_quantity: null,
                notes: 'Created via Quick Service',
                branch_id: selectedBranchId
              })
              .select()
              .single()

            if (createItemError) throw createItemError
            itemId = newItem.item_id
          }

          const { error: sideBusinessError } = await supabase
            .from('side_business_sales')
            .insert({
              item_id: itemId,
              quantity: quantityDelta,
              price_each: item.customPrice || item.sideBusinessItem!.price || 0,
              total_amount: (item.customPrice || item.sideBusinessItem!.price || 0) * quantityDelta,
              payment_method: paymentMethod,
              date_time: getLocalDateTime(),
              business_id: item.sideBusinessItem!.business_id,
              parent_shop_id: businessId,
              branch_id: selectedBranchId
            })

          if (sideBusinessError) throw sideBusinessError
        }
      } else {
        // New transaction - add all items
        const saleItems = order.items
          .filter(item => item.product)
          .map(item => ({
            sale_id: saleData.sale_id,
            product_id: item.product!.product_id,
            quantity: item.quantity,
            price_each: item.product!.price,
            weight: item.weight || null,
            calculated_price: item.calculatedPrice || null
          }))

        const sideBusinessItems = order.items.filter(item => item.sideBusinessItem)

        for (const item of sideBusinessItems) {
          let itemId = item.sideBusinessItem!.item_id

          if (itemId > 1000000000) {
            const { data: newItem, error: createItemError } = await supabase
              .from('side_business_items')
              .insert({
                business_id: item.sideBusinessItem!.business_id,
                parent_shop_id: businessId,
                name: item.sideBusinessItem!.name,
                price: item.customPrice || item.sideBusinessItem!.price,
                stock_quantity: null,
                notes: 'Created via Quick Service',
                branch_id: selectedBranchId
              })
              .select()
              .single()

            if (createItemError) throw createItemError
            itemId = newItem.item_id
          }

          const { error: sideBusinessError } = await supabase
            .from('side_business_sales')
            .insert({
              item_id: itemId,
              quantity: item.quantity,
              price_each: item.customPrice || item.sideBusinessItem!.price || 0,
              total_amount: (item.customPrice || item.sideBusinessItem!.price || 0) * item.quantity,
              payment_method: paymentMethod,
              date_time: getLocalDateTime(),
              business_id: item.sideBusinessItem!.business_id,
              parent_shop_id: businessId,
              branch_id: selectedBranchId
            })

          if (sideBusinessError) throw sideBusinessError
        }

        if (saleItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(saleItems)

          if (itemsError) throw itemsError

          for (const saleItem of saleItems) {
            const itemRevenue = saleItem.calculated_price || (saleItem.price_each * saleItem.quantity)

            const { error: updateError } = await supabase
              .rpc('increment_product_sales', {
                product_id_param: saleItem.product_id,
                revenue_amount: itemRevenue,
                business_id_param: businessId
              })

            if (updateError) {
              console.error('Error updating product sales counter:', updateError)
            }
          }
        }
      }

      // Update product stock quantities based on the additional items sold
      const productStockAdjustments = order.items
        .filter(item => item.product)
        .map(item => {
          const originalQuantity = item.originalQuantity ?? 0
          const quantityDelta = item.quantity - originalQuantity
          return { item, quantityDelta }
        })
        .filter(({ quantityDelta }) => quantityDelta > 0)

      for (const { item, quantityDelta } of productStockAdjustments) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: item.product!.stock_quantity - quantityDelta,
            last_updated: getLocalDateTime()
          })
          .eq('product_id', item.product!.product_id)
          .eq('business_id', businessId)

        if (stockError) throw stockError

        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert([{
            product_id: item.product.product_id,
            quantity_change: -quantityDelta,
            movement_type: 'Sale',
            reference_id: saleData.sale_id,
            business_id: businessId
          }])

        if (movementError) throw movementError
      }

      // Update side business item stock quantities
      const sideBusinessItemsToProcess = order.items.filter(item => item.sideBusinessItem)

      for (const item of sideBusinessItemsToProcess) {
        if (!item.sideBusinessItem || item.sideBusinessItem.stock_quantity === null) continue

        const originalQuantity = item.originalQuantity ?? 0
        const quantityDelta = item.quantity - originalQuantity
        if (quantityDelta <= 0) continue
        
        const { error: stockError } = await supabase
          .from('side_business_items')
          .update({ 
            stock_quantity: item.sideBusinessItem.stock_quantity - quantityDelta
          })
          .eq('item_id', item.sideBusinessItem.item_id)
          .eq('parent_shop_id', businessId)

        if (stockError) throw stockError
      }

      // Clear order
      setOrder({
        items: [],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0
      })
      setOrderDetailNumber(generateOrderDetailNumber())
      setCustomerName('')
      setCustomerPhone('')
      setSelectedCustomer(null)
      setPaymentMethod('cash')
      setAmountEntered('')
      setChange(0)
      setReceiptNotes('')
      clearCartFromStorage(selectedBranchId || null) // Clear cart from localStorage
      
      // Create reminder for partial payment if applicable
      if (allowPartialPayment && remainingAmount > 0 && saleData?.sale_id) {
        await createPartialPaymentReminder(customerName, customerPhone, remainingAmount, saleData.sale_id)
      }

      // Reset partial payment state
      setAllowPartialPayment(false)
      setPartialAmount('')
      setRemainingAmount(0)
      setPartialPaymentNotes('')

      // Show success message
      const successMsg = document.createElement('div')
      successMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `
      successMsg.textContent = isAddingToTransaction ? 
        'Items added to transaction successfully!' : 
        allowPartialPayment ? 
          `Partial payment processed! €${(parseFloat(partialAmount) || 0).toFixed(2)} paid, €${remainingAmount.toFixed(2)} remaining. Reminder created.` :
          'Sale processed successfully!'
      document.body.appendChild(successMsg)
      
      setTimeout(() => {
        document.body.removeChild(successMsg)
      }, 3000)

      // Award loyalty points if customer exists
      if (customerId && order.total > 0) {
        try {
          // Calculate points: 1 euro = 1 point
          const pointsToAward = Math.floor(order.total)
          
          // Get current customer points
          const { data: currentCustomer } = await supabase
            .from('customers')
            .select('loyalty_points')
            .eq('customer_id', customerId)
            .single()

          if (currentCustomer) {
            // Update customer with new points
            const newPoints = currentCustomer.loyalty_points + pointsToAward
            const { error: pointsError } = await supabase
              .from('customers')
              .update({ loyalty_points: newPoints })
              .eq('customer_id', customerId)

            if (pointsError) {
              console.error('Error updating loyalty points:', pointsError)
            }
          }
        } catch (error) {
          console.error('Error awarding loyalty points:', error)
          // Don't fail the sale if loyalty points fail
        }
      }

      // Close the sales summary modal
      setShowSalesSummary(false)
      
      // Navigate back to transaction detail if adding to existing transaction
      if (isAddingToTransaction && existingTransactionId) {
        setTimeout(() => {
          navigate(`/transaction/${existingTransactionId}`, { state: { from: location.pathname } })
        }, 2000)
      }
    } catch (error) {
      // Error processing sale - handled silently per user preference
      alert(`Failed to process sale: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const getCurrentDateTime = () => {
    const now = new Date()
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    const date = now.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
    return `${time} - ${date}`
  }

  const createPartialPaymentReminder = async (customerName: string, customerPhone: string, remainingAmount: number, saleId: number) => {
    if (businessId == null) {
      return
    }

    try {
      // Get the current user ID
      const ownerId = user?.user_id || 1
      
      // Create reminder title and body
      const reminderTitle = `Payment Due: ${customerName || 'Customer'}`
      const phoneInfo = customerPhone ? `\nPhone: ${customerPhone}` : ''
      const reminderBody = `Customer owes €${remainingAmount.toFixed(2)} from Sale #${saleId}. Please follow up for payment.${phoneInfo}`
      
      // Set reminder date to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const remindDate = tomorrow.toISOString().split('T')[0]
      
      // Create the reminder
      const reminderData = {
        title: reminderTitle,
        body: reminderBody,
        remind_date: remindDate,
        owner_id: ownerId,
        business_id: businessId,
        branch_id: selectedBranchId,
        sale_id: saleId // Link to the specific sale
      }
      
      const { error } = await supabase
        .from('reminders')
        .insert([reminderData])
        .select()
        .single()

      if (error) {
        console.error('Error creating partial payment reminder:', error)
        console.error('Reminder data attempted:', reminderData)
      } else {
      }
    } catch (error) {
      console.error('Error creating partial payment reminder:', error)
      // Don't throw error - reminder creation failure shouldn't break the sale
    }
  }

  // Loading state hidden - always show content
  // if (loading) {
  //   return (
  //     <div style={{ 
  //       display: 'flex', 
  //       justifyContent: 'center', 
  //       alignItems: 'center', 
  //       height: '400px',
  //       fontSize: '18px',
  //       color: '#6b7280'
  //     }}>
  //       <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '12px' }}></i>
  //       Loading products...
  //     </div>
  //   )
  // }

  return (
    <>
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: '264px', // Match standard navbar width
      right: 0,
      bottom: 0,
      paddingRight: '0',
      display: 'flex', 
      height: '100vh', 
      background: '#ffffff',
      fontFamily: 'Poppins, sans-serif',
      zIndex: 2
    }}>
      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        background: '#ffffff', 
        margin: '0', 
        borderRadius: '0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRight: '3px solid #9ca3af'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '24px 32px', 
          borderBottom: 'none',
          background: isAddingToTransaction ? '#fef3c7' : '#f9fafb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ 
                fontSize: '28px', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0 0 8px 0'
              }}>
                <i className="fa-solid fa-cash-register" style={{ marginRight: '12px', color: '#7d8d86' }}></i>
                Point Of Sales
              </h1>
              <BranchSelector size="sm" showLabel={false} />
            </div>
            {isAddingToTransaction && (
              <div style={{
                background: '#f59e0b',
                color: '#92400e',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fa-solid fa-plus-circle"></i>
                Adding to Transaction #{existingTransactionId}
              </div>
            )}
          </div>
          {isAddingToTransaction && (
            <p style={{
              fontSize: '14px',
              color: '#92400e',
              margin: '8px 0 0 0',
              fontStyle: 'italic'
            }}>
              Adding new items to existing transaction. Existing items will be preserved.
            </p>
          )}
        </div>

        {/* Search Bar */}
        <div style={{ 
          padding: '12px 32px 24px',
          borderBottom: '1px solid #e5e7eb',
          background: isAddingToTransaction ? '#fef3c7' : '#f9fafb'
        }}>
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            alignItems: 'center',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            {/* Modern Search Input */}
            <div style={{ 
              position: 'relative', 
              flex: 1,
              background: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '2px solid #000000',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px'
              }}>
                <i className="fa-solid fa-search" style={{
                  color: '#6b7280',
                  fontSize: '18px',
                  marginRight: '12px'
                }}></i>
                
                <input
                  type="text"
                  placeholder="Search products"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={(e) => {
                    e.target.parentElement.parentElement.style.borderColor = '#3b82f6'
                    e.target.parentElement.parentElement.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)'
                    setShowSuggestions(searchSuggestions.length > 0)
                  }}
                  onBlur={(e) => {
                    e.target.parentElement.parentElement.style.borderColor = '#000000'
                    e.target.parentElement.parentElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const value = searchTerm.trim()
                      
                      // Check if it looks like a barcode (8-20 digits)
                      if (value && /^\d{8,20}$/.test(value)) {
                        handleBarcodeScanned(value)
                        setSearchTerm('')
                        return
                      }
                      
                      // Regular search
                      if (value) {
                        setShowSuggestions(false)
                      }
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '4px 8px',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '16px',
                    outline: 'none',
                    color: '#1f2937',
                    fontWeight: '500'
                  }}
                />
                
                {/* Separator */}
                <Separator orientation="vertical" className="h-8 mx-2" />
                
                {/* Multiply Mode Toggle Switch */}
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Multiply:
                  </span>
                  <div
                    onClick={() => setMultiplyMode(!multiplyMode)}
                    style={{
                      width: '50px',
                      height: '26px',
                      borderRadius: '13px',
                      background: multiplyMode ? '#f43f5e' : '#d1d5db',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: '2px solid transparent',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)'
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        top: '2px',
                        left: multiplyMode ? '26px' : '2px',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {multiplyMode && (
                        <i className="fa-solid fa-check" style={{ 
                          fontSize: '10px', 
                          color: '#f43f5e',
                          fontWeight: 'bold'
                        }} />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Clear search button */}
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setShowSuggestions(false)
                      setSearchSuggestions([])
                    }}
                    style={{
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px',
                      cursor: 'pointer',
                      color: '#6b7280',
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.background = '#e5e7eb'
                      (e.target as HTMLButtonElement).style.color = '#374151'
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background = '#f3f4f6'
                      (e.target as HTMLButtonElement).style.color = '#6b7280'
                    }}
                  >
                    <i className="fa-solid fa-times"></i>
                  </button>
                )}
              </div>
              
              {/* Enhanced Search Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: '16px',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
                  zIndex: 1000,
                  maxHeight: '300px',
                  overflowY: 'auto',
                  marginTop: '8px',
                  backdropFilter: 'blur(10px)'
                }}>
                  {searchSuggestions.map((item, index) => {
                    const isProduct = 'product_id' in item
                    const isSideBusinessItem = 'item_id' in item
                    
                    return (
                      <div
                        key={isProduct ? item.product_id : `sb-${item.item_id}`}
                        onClick={() => selectSuggestion(item)}
                        style={{
                          padding: '16px 20px',
                          cursor: 'pointer',
                          borderBottom: index < searchSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          transition: 'all 0.2s ease',
                          borderRadius: index === 0 ? '16px 16px 0 0' : index === searchSuggestions.length - 1 ? '0 0 16px 16px' : '0'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLDivElement).style.background = 'linear-gradient(135deg, #f8fafc, #f1f5f9)'
                          (e.target as HTMLDivElement).style.transform = 'translateX(4px)'
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLDivElement).style.background = 'transparent'
                          (e.target as HTMLDivElement).style.transform = 'translateX(0)'
                        }}
                      >
                        {isProduct && item.image_url && (
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: `url(${item.image_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            color: '#ffffff',
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                          }}>
                          </div>
                        )}
                        {isSideBusinessItem && (
                          <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            color: '#6b7280',
                            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                          }}>
                            <i className="fa-solid fa-briefcase"></i>
                          </div>
                        )}
                        <div style={{ flex: 1 }}>
                          <p style={{ 
                            margin: '0 0 4px 0', 
                            fontSize: '16px', 
                            fontWeight: '600', 
                            color: '#1e293b',
                            lineHeight: '1.3'
                          }}>
                            {item.name}
                          </p>
                          <p style={{ 
                            margin: '0', 
                            fontSize: '14px', 
                            color: '#64748b',
                            fontWeight: '500'
                          }}>
                            {isProduct 
                              ? `${item.category} • €${item.price.toFixed(2)}`
                              : `${item.side_businesses?.name || 'Side Business'} • ${item.price ? `€${item.price.toFixed(2)}` : 'Custom Price'}`
                            }
                          </p>
                        </div>
                        <div style={{
                          background: '#f8fafc',
                          color: '#374151',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}>
                          <i className="fa-solid fa-plus"></i>
                          Add
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Modern Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowQuickServiceModal(true)}
                style={{
                  padding: '14px 32px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  minWidth: '120px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    background: '#000000',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#333333';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(31, 41, 55, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#000000';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.background = '#1a1a1a';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(31, 41, 55, 0.15)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.background = '#333333';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(31, 41, 55, 0.2)';
                }}
              >
                <i className="fa-solid fa-plus-circle" style={{ marginRight: '8px' }}></i>
                Quick Service
              </button>
              
              {/* Calculator Button */}
              <button 
                onClick={() => setIsCalculatorOpen(true)}
                style={{
                  padding: '14px 32px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  minWidth: '120px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  background: '#000000',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#333333';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#000000';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.background = '#1a1a1a';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.15)';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.background = '#333333';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
                }}
              >
                <i className="fa-solid fa-calculator" style={{ marginRight: '8px' }}></i>
                Calculator
              </button>
              
              {/* Add Product Button */}
              <Button
                onClick={() => {
                  console.log('Add Product button clicked!');
                  setShowAddProductModal(true);
                }}
                variant="secondary"
                className="inline-flex items-center gap-2 px-8 py-3 text-base font-medium"
                style={{
                  borderRadius: '8px',
                  minWidth: '120px',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  const target = e.currentTarget as HTMLButtonElement;
                  target.style.transform = 'translateY(-2px)';
                  target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget as HTMLButtonElement;
                  target.style.transform = 'translateY(0)';
                  target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
                onMouseDown={(e) => {
                  const target = e.currentTarget as HTMLButtonElement;
                  target.style.transform = 'translateY(0)';
                }}
                onMouseUp={(e) => {
                  const target = e.currentTarget as HTMLButtonElement;
                  target.style.transform = 'translateY(-2px)';
                }}
              >
                <i className="fa-solid fa-plus" style={{ fontSize: '16px' }}></i>
                Add Product
              </Button>
            </div>
          </div>
        </div>

        {/* Barcode Scanner Section - Now integrated into main search */}
        <div style={{
          display: 'none', // Hide the separate barcode scanner since it's now integrated 
          padding: '16px 32px',
          borderBottom: '1px solid #e5e7eb',
          background: barcodeScannerActive ? '#f0f9ff' : '#f9fafb',
          transition: 'background-color 0.3s ease'
        }}>
          {/* Hidden input for barcode scanner fallback */}
          {barcodeScannerActive && (
            <input
              type="text"
              style={{
                position: 'absolute',
                left: '-9999px',
                opacity: 0,
                pointerEvents: 'none'
              }}
              onInput={(e) => {
                const value = (e.target as HTMLInputElement).value
                if (value && value.length >= 8 && value.length <= 20) {
                  handleBarcodeScanned(value)
                  ;(e.target as HTMLInputElement).value = ''
                }
              }}
              autoFocus
            />
          )}

          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Barcode Input Field */}
            <div style={{ position: 'relative', flex: 1, minWidth: '300px', maxWidth: '400px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Barcode Scanner
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Scan or enter barcode manually"
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `2px solid ${barcodeScannerActive ? '#3b82f6' : 'var(--border-color)'}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none',
                    transition: 'border-color 0.3s ease',
                    background: barcodeScannerActive ? '#f0f9ff' : '#ffffff',
                    color: barcodeScannerActive ? '#1e40af' : '#1f2937'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const value = (e.target as HTMLInputElement).value.trim()
                      if (value && value.length >= 8 && value.length <= 20) {
                        handleBarcodeScanned(value)
                        ;(e.target as HTMLInputElement).value = ''
                      }
                    }
                  }}
                />
                <button 
                  onClick={toggleBarcodeScanner}
                  style={{
                    padding: '14px 32px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    minWidth: '120px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    background: barcodeStatus === 'listening' ? '#dc2626' : 
                               barcodeStatus === 'scanned' ? '#16a34a' : 
                               barcodeStatus === 'not_found' ? '#ea580c' : '#000000',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => {
                    const currentBg = e.currentTarget.style.background;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.2)';
                  }}
                >
                  {barcodeStatus === 'listening' ? (
                    <>
                      <i className="fa-solid fa-stop" style={{ marginRight: '8px' }}></i>
                      Stop Scanner
                    </>
                  ) : barcodeStatus === 'scanned' ? (
                    <>
                      <i className="fa-solid fa-check" style={{ marginRight: '8px' }}></i>
                      Item Added!
                    </>
                  ) : barcodeStatus === 'not_found' ? (
                    <>
                      <i className="fa-solid fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                      Not Found
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-barcode" style={{ marginRight: '8px' }}></i>
                      Scan Barcode
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setIsCalculatorOpen(true)}
                  style={{
                    padding: '14px 32px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                    minWidth: '120px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    background: '#000000',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#333333';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(31, 41, 55, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#000000';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.background = '#1a1a1a';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(31, 41, 55, 0.15)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.background = '#333333';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(31, 41, 55, 0.2)';
                  }}
                >
                  <i className="fa-solid fa-calculator" style={{ marginRight: '8px' }}></i>
                  Calculator
                </button>
                <Button
                  onClick={() => {
                    console.log('Add Product button clicked!');
                    navigate('/products');
                  }}
                  variant="primary"
                  className="inline-flex items-center gap-2 px-8 py-3 text-base font-medium"
                  style={{
                    background: '#000000 !important',
                    color: '#ffffff !important',
                    borderRadius: '8px',
                    minWidth: '120px',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    transform: 'translateY(0)'
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.transform = 'translateY(-2px)';
                    target.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.transform = 'translateY(0)';
                    target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseDown={(e) => {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.transform = 'translateY(0)';
                  }}
                  onMouseUp={(e) => {
                    const target = e.currentTarget as HTMLButtonElement;
                    target.style.transform = 'translateY(-2px)';
                  }}
                >
                  <i className="fa-solid fa-plus" style={{ fontSize: '16px' }}></i>
                  Add Product
                </Button>
              </div>
            </div>

          </div>
        </div>

        {/* Categories */}
        <div style={{ 
          padding: '16px 32px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {/* Category Tabs */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-end',
            gap: '0px',
            flexWrap: 'wrap',
            paddingBottom: '0px',
            borderBottom: '2px solid #e5e7eb'
          }}>
            {(() => {
              // Get random pastel color for each category
              const getCategoryColor = (cat: string) => {
                const pastelColors = [
                  { bg: '#FFE4E1', text: '#8B4513', border: '#FFB6C1' }, // Light Pink
                  { bg: '#E6F3FF', text: '#003366', border: '#87CEEB' }, // Light Blue
                  { bg: '#F0FFF0', text: '#006400', border: '#98FB98' }, // Light Green
                  { bg: '#FFF8DC', text: '#B8860B', border: '#F0E68C' }, // Light Yellow
                  { bg: '#F5F0FF', text: '#4B0082', border: '#DDA0DD' }, // Light Purple
                  { bg: '#FFF0F5', text: '#8B008B', border: '#FFB6C1' }, // Light Magenta
                  { bg: '#F0FFFF', text: '#008B8B', border: '#AFEEEE' }, // Light Cyan
                  { bg: '#FFF5EE', text: '#A0522D', border: '#F5DEB3' }, // Light Orange
                ]
                
                // Use category name to consistently assign colors
                const hash = cat.split('').reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0)
                  return a & a
                }, 0)
                return pastelColors[Math.abs(hash) % pastelColors.length]
              }

              const renderCategoryButton = (category: string) => {
                // Calculate count for each category
                let count = 0
                if (category === 'Quick Access') {
                  count = quickAccessProductIds.size + quickAccessSideBusinessIds.size
                } else {
                  count = sideBusinessItems.filter(item => item.side_businesses?.name === category).length
                }

                const isSelected = selectedCategory === category
                const colors = getCategoryColor(category)
                
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    style={{
                      background: isSelected ? colors.bg : '#ffffff',
                      color: isSelected ? colors.text : colors.text,
                      border: isSelected ? `2px solid ${colors.border}` : `2px solid ${colors.border}`,
                      borderBottom: isSelected ? `2px solid ${colors.bg}` : 'none',
                      borderRadius: '8px 8px 0 0',
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      zIndex: isSelected ? 2 : 1,
                      marginBottom: isSelected ? '-2px' : '0px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = colors.bg
                        e.currentTarget.style.color = colors.text
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#ffffff'
                        e.currentTarget.style.color = colors.text
                      }
                    }}
                  >
                    {category} {count > 0 ? `(${count})` : ''}
                  </button>
                )
              }

              // Show first 4 categories by default, or all if showAllCategories is true
              const categoriesToShow = showAllCategories ? categories : categories.slice(0, 4)
              const hasMoreCategories = categories.length > 4

              return (
                <>
                  {categoriesToShow.map(renderCategoryButton)}
                  
                  {/* Show More/Show Less Button */}
                  {hasMoreCategories && (
                    <Button
                      variant="outline"
                      onClick={() => setShowAllCategories(!showAllCategories)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 border-2 border-gray-300 border-b-0 rounded-t-lg px-4 py-3 text-sm font-medium whitespace-nowrap relative z-10 flex items-center gap-1"
                    >
                      {showAllCategories ? (
                        <>
                          <i className="fa-solid fa-chevron-up text-xs" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-chevron-down text-xs" />
                          Show More ({categories.length - 4})
                        </>
                      )}
                    </Button>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        {/* Products Grid */}
        <div 
          className="hide-scrollbar"
          style={{ 
            flex: 1, 
            padding: '24px 32px',
            overflowY: 'auto',
            transition: 'opacity 0.2s ease',
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none' // IE and Edge
          }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#1f2937',
              margin: '0 0 4px 0'
            }}>
              Products
            </h3>
          </div>
          {filteredProducts.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#6b7280'
            }}>
              <i className="fa-solid fa-search" style={{ 
                fontSize: '48px', 
                marginBottom: '16px', 
                opacity: 0.5 
              }}></i>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '500', 
                color: '#374151',
                margin: '0 0 8px 0'
              }}>
                No products found
              </h3>
              <p style={{ 
                fontSize: '14px', 
                margin: '0',
                color: '#6b7280'
              }}>
                {searchTerm ? `No products match "${searchTerm}"` : 'Try selecting a different category'}
              </p>
            </div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
              gap: '12px',
              transition: 'all 0.3s ease'
            }}>
              {filteredProducts.map(product => (
              <div key={product.product_id} style={{
                background: '#ffffff',
                border: '2px solid #6b7280',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'center',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                position: 'relative',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
              onClick={() => addToOrder(product)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
                e.currentTarget.style.border = '2px solid #6b7280'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)'
                e.currentTarget.style.border = '2px solid #6b7280'
              }}
              >
                {/* Quantity Badge - Top Left */}
                {(() => {
                  const currentQuantity = order.items
                    .filter(item => item.product?.product_id === product.product_id && !item.weight)
                    .reduce((sum, item) => sum + item.quantity, 0)
                  
                  if (currentQuantity > 0) {
                    return (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        background: '#dc2626',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                        zIndex: 1,
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }}>
                        {currentQuantity}
                      </div>
                    )
                  }
                  return null
                })()}
                
                {/* Quick Access Star Button - Top Right */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleQuickAccess(product.product_id, true)
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white hover:scale-110 transition-all duration-200 shadow-sm z-10"
                >
                  <i 
                    className={quickAccessProductIds.has(product.product_id) ? "fa-solid fa-star" : "fa-regular fa-star"}
                    style={{ 
                      fontSize: '16px', 
                      color: quickAccessProductIds.has(product.product_id) ? '#fbbf24' : '#9ca3af'
                    }}
                  />
                </Button>
                
                <div style={{
                  width: '100%',
                  height: '100px',
                  background: product.image_url 
                    ? `url(${product.image_url})` 
                    : 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '6px',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {!product.image_url && (
                    <i className="fa-solid fa-image" style={{ 
                      fontSize: '24px', 
                      color: '#9ca3af' 
                    }}></i>
                  )}
                </div>
                <h4 style={{ 
                  fontSize: '13px', 
                  fontWeight: '500', 
                  color: '#1f2937',
                  margin: '0 0 6px 0',
                  lineHeight: '1.3',
                  height: '34px',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {product.name}
                </h4>
                <p style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#7d8d86',
                  margin: '0 0 8px 0'
                }}>
                  {product.is_weighted && product.price_per_unit && product.weight_unit ? (
                    (() => {
                      // Convert to more readable units
                      if (product.weight_unit === 'g' && product.price_per_unit < 1) {
                        // Convert grams to kg for better readability
                        const pricePerKg = product.price_per_unit * 1000
                        return `€${pricePerKg.toFixed(2)}/kg`
                      } else if (product.weight_unit === 'kg' && product.price_per_unit >= 1) {
                        return `€${product.price_per_unit.toFixed(2)}/kg`
                      } else {
                        return `€${product.price_per_unit.toFixed(2)}/${product.weight_unit}`
                      }
                    })()
                  ) : (
                    `€${product.price.toFixed(2)}`
                  )}
                </p>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    addToOrder(product)
                  }}
                  variant="secondary"
                  className="w-full h-8 text-xs font-medium"
                  size="sm"
                  style={{
                    width: '100%',
                    borderRadius: '6px',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
                    transform: 'translateY(0)'
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLButtonElement
                    target.style.transform = 'translateY(-1px)'
                    target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)'
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLButtonElement
                    target.style.transform = 'translateY(0)'
                    target.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <i className="fa-solid fa-plus mr-1" style={{ fontSize: '10px' }} />
                  Add
                </Button>
              </div>
            ))}
            
            {/* Side Business Items */}
            {filteredSideBusinessItems.map(item => (
            <div key={`sb-${item.item_id}`} style={{
              background: '#ffffff',
              border: '3px solid #374151',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
            onClick={() => addSideBusinessItemToOrder(item)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              {/* Quick Access Star Button - Top Right */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleQuickAccess(item.item_id.toString(), false)
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-white/90 hover:bg-white hover:scale-110 transition-all duration-200 shadow-sm z-10"
              >
                <i 
                  className={quickAccessSideBusinessIds.has(item.item_id.toString()) ? "fa-solid fa-star" : "fa-regular fa-star"}
                  style={{ 
                    fontSize: '16px', 
                    color: quickAccessSideBusinessIds.has(item.item_id.toString()) ? '#fbbf24' : '#9ca3af'
                  }}
                />
              </Button>
              
              <div style={{
                width: '100%',
                height: '100px',
                background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                borderRadius: '6px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fa-solid fa-briefcase" style={{ 
                  fontSize: '24px', 
                  color: '#9ca3af' 
                }}></i>
              </div>
              <h4 style={{ 
                fontSize: '13px', 
                fontWeight: '500', 
                color: '#1f2937',
                margin: '0 0 6px 0',
                lineHeight: '1.3',
                height: '34px',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical'
              }}>
                {item.name}
              </h4>
              <p style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#7d8d86',
                margin: '0 0 8px 0'
              }}>
                {item.price ? `€${item.price.toFixed(2)}` : 'Custom Price'}
              </p>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    addSideBusinessItemToOrder(item)
                  }}
                  variant="secondary"
                  className="w-full h-8 text-xs font-medium"
                  size="sm"
                  style={{
                    width: '100%',
                    borderRadius: '6px',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
                    transform: 'translateY(0)'
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLButtonElement
                    target.style.transform = 'translateY(-1px)'
                    target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)'
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLButtonElement
                    target.style.transform = 'translateY(0)'
                    target.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)'
                  }}
                >
                  <i className="fa-solid fa-plus mr-1" style={{ fontSize: '10px' }} />
                  Add
                </Button>
            </div>
            ))}
            </div>
          )}

        </div>
      </div>

      {/* Order Sidebar */}
      <div style={{ 
        width: '500px', 
        background: '#f8f9fa', 
        margin: '0', 
        borderRadius: '0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* User Info Header */}
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: '1px solid #e5e7eb',
          background: '#e5e7eb'
        }}>
          <div style={{ marginBottom: '8px' }}>
            <p style={{ 
              margin: '0', 
              fontSize: '16px', 
              fontWeight: '500', 
              color: '#1f2937' 
            }}>
              Hello, {user?.username}
            </p>
          </div>
          <p style={{ 
            margin: '0', 
            fontSize: '14px', 
            color: '#6b7280' 
          }}>
            {getCurrentDateTime()}
          </p>
        </div>

        {/* Order Details */}
        <div style={{ 
          flex: 1, 
          padding: '24px',
          overflowY: 'auto'
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#1f2937',
            margin: '0 0 16px 0'
          }}>
            Order Detail #{orderDetailNumber}
          </h3>

          {order.items.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: '#6b7280',
              padding: '40px 0'
            }}>
              <i className="fa-solid fa-shopping-cart" style={{ 
                fontSize: '48px', 
                marginBottom: '16px', 
                opacity: 0.5 
              }}></i>
              <p>No items in order</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {order.items.map((item) => {
                const itemId = item.product?.product_id || `sb-${item.sideBusinessItem?.item_id}`
                const itemName = item.product?.name || item.sideBusinessItem?.name || 'Unknown Item'
                const itemPrice = item.product?.price || item.customPrice || item.sideBusinessItem?.price || 0
                const isSideBusiness = !!item.sideBusinessItem
                
                return (
                <div key={itemId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '3px solid #374151',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: isSideBusiness 
                      ? 'linear-gradient(135deg, #f3f4f6, #e5e7eb)'
                      : item.product?.image_url 
                        ? `url(${item.product.image_url})` 
                        : 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isSideBusiness && (
                      <i className="fa-solid fa-briefcase" style={{ 
                        fontSize: '16px', 
                        color: '#9ca3af' 
                      }}></i>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      margin: '0 0 4px 0', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#1f2937' 
                    }}>
                      {itemName.length > 20 
                        ? itemName.substring(0, 20) + '...' 
                        : itemName}
                    </p>
                    <p style={{ 
                      margin: '0', 
                      fontSize: '14px', 
                      color: '#7d8d86',
                      fontWeight: '600'
                    }}>
                      {item.weight && item.calculatedPrice ? (
                        <>
                          {item.weight} {item.product?.weight_unit} • €{item.calculatedPrice.toFixed(2)}
                        </>
                      ) : (
                        `€${itemPrice.toFixed(2)}`
                      )}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Show quantity controls for regular items */}
                    {!item.weight && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(itemId, Math.max(1, item.quantity - 1))}
                          className="w-6 h-6 text-xs"
                        >
                          -
                        </Button>
                        <span style={{ 
                          minWidth: '20px', 
                          textAlign: 'center', 
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#1f2937'
                        }}>
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => updateQuantity(itemId, item.quantity + 1)}
                          className="w-6 h-6 text-xs"
                        >
                          +
                        </Button>
                      </>
                    )}
                    
                    {/* Show weight controls for weighted items */}
                    {item.weight && (
                      <>
                        <button
                          onClick={() => updateWeight(itemId, item.weight! - 0.1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: 'var(--border-subtle)',
                            background: '#ffffff',
                            color: '#374151',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px'
                          }}
                        >
                          -
                        </button>
                        <button
                          onClick={() => showWeightEditModal(item)}
                          style={{
                            minWidth: '60px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid #7d8d86',
                            background: '#f9fafb',
                            color: '#7d8d86',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '500',
                            padding: '0 4px'
                          }}
                          title="Click to edit weight"
                        >
                          {item.weight} {item.product?.weight_unit}
                        </button>
                        <button
                          onClick={() => updateWeight(itemId, item.weight! + 0.1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: 'var(--border-subtle)',
                            background: '#ffffff',
                            color: '#374151',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px'
                          }}
                        >
                          +
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => removeFromOrder(itemId)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        border: 'none',
                        background: '#374151',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        marginLeft: '4px'
                      }}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Promotion Toggle */}
        {order.items.length > 0 && (
          <div style={{
            background: '#ffffff',
            border: 'var(--border-subtle)',
            borderRadius: '0px',
            padding: '12px 16px',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-tags" style={{ 
                fontSize: '16px', 
                color: promotionsEnabled ? '#10b981' : (activePromotions && activePromotions.length > 0 ? '#10b981' : '#6b7280') 
              }}></i>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: '500',
                color: '#1f2937'
              }}>
                Promotions {activePromotions && activePromotions.length > 0 ? `(Active: ${activePromotions.length})` : ''}
              </span>
            </div>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              gap: '8px'
            }}>
              <input
                type="checkbox"
                checked={promotionsEnabled}
                onChange={(e) => { setPromotionsEnabled(e.target.checked); setHasUserToggledPromotions(true) }}
                style={{
                  width: '18px',
                  height: '18px',
                  accentColor: '#10b981',
                  cursor: 'pointer'
                }}
              />
              <span style={{ 
                fontSize: '13px', 
                color: '#6b7280',
                fontWeight: '500'
              }}>
                {promotionsEnabled ? 'Enabled' : (activePromotions && activePromotions.length > 0 ? 'Available' : 'Disabled')}
              </span>
            </label>
            {promotionsEnabled && activePromotions && activePromotions.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Choose:</span>
                <select
                  value={selectedPromotionId ?? ''}
                  onChange={(e) => setSelectedPromotionId(e.target.value ? Number(e.target.value) : null)}
                  style={{
                    border: 'var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '6px 8px',
                    background: '#ffffff',
                    color: '#111827',
                    fontSize: '13px'
                  }}
                >
                  <option value="">Best discount</option>
                  {activePromotions.map(promo => (
                    <option key={promo.promotion_id} value={promo.promotion_id}>
                      {promo.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Order Total Display */}
        {order.items.length > 0 && (
          <div style={{
            background: '#f1f3f4',
            border: 'var(--border-subtle)',
            borderRadius: '0px',
            padding: '16px',
            marginBottom: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '4px'
              }}>
                Items: {order.items.length}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#9ca3af'
              }}>
                Subtotal: €{order.subtotal.toFixed(2)}
              </div>
              {order.discount > 0 && (
                <div style={{
                  fontSize: '12px',
                  color: '#10b981',
                  fontWeight: '500'
                }}>
                  Discount: -€{order.discount.toFixed(2)}
                </div>
              )}
            </div>
            <div style={{
              textAlign: 'right'
            }}>
              <div style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '2px'
              }}>
                Total: €{order.total.toFixed(2)}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6b7280'
              }}>
                Ready to pay
              </div>
            </div>
          </div>
        )}


          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '12px' }}>
            <button
              onClick={resetTransaction}
              disabled={order.items.length === 0}
              style={{
                width: '120px',
                padding: '14px 16px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: order.items.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                background: order.items.length === 0 ? '#9ca3af' : '#000000',
                color: 'white',
                opacity: order.items.length === 0 ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (order.items.length > 0) {
                  e.currentTarget.style.background = '#333333';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(31, 41, 55, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (order.items.length > 0) {
                  e.currentTarget.style.background = '#000000';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseDown={(e) => {
                if (order.items.length > 0) {
                  e.currentTarget.style.background = '#1a1a1a';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(31, 41, 55, 0.15)';
                }
              }}
              onMouseUp={(e) => {
                if (order.items.length > 0) {
                  e.currentTarget.style.background = '#333333';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(31, 41, 55, 0.2)';
                }
              }}
            >
              <i className="fa-solid fa-rotate-left" style={{ marginRight: '8px' }}></i>
              Reset
            </button>

            {/* TTS Play Button */}
            <button
              onClick={async () => {
                if (order.items.length === 0) return
                
                if (isTtsPlaying || ttsService.isPlaying()) {
                  // Stop TTS
                  ttsService.stop()
                  setIsTtsPlaying(false)
                  return
                }
                
                
                // Set playing state
                setIsTtsPlaying(true)
                
                // Temporarily enable TTS
                ttsService.refreshSettings()
                ttsService.updateSettings({ enabled: true, useOpenAI: true, useElevenLabs: false, openaiVoice: 'onyx' })
                setTtsSettings(ttsService.getSettings())
                
                
                try {
                  await speakOrderItems(order.items)
                  
                  // Wait for the Nigerian food message to finish, then disable TTS
                  setTimeout(() => {
                    ttsService.updateSettings({ enabled: false })
                    setTtsSettings(ttsService.getSettings())
                    setIsTtsPlaying(false)
                  }, 3000) // Wait 3 seconds for the delayed message
                  
                } catch (error) {
                  console.error('TTS Error:', error)
                  setIsTtsPlaying(false)
                  ttsService.updateSettings({ enabled: false })
                  setTtsSettings(ttsService.getSettings())
                }
              }}
              disabled={order.items.length === 0}
              style={{
                width: '100px',
                padding: '14px 12px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: order.items.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                background: order.items.length === 0 ? '#9ca3af' : '#000000',
                color: 'white',
                opacity: order.items.length === 0 ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (order.items.length > 0) {
                  e.currentTarget.style.background = '#333333'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(31, 41, 55, 0.2)'
                }
              }}
              onMouseLeave={(e) => {
                if (order.items.length > 0) {
                  e.currentTarget.style.background = '#000000'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
                }
              }}
              onMouseDown={(e) => {
                if (order.items.length > 0) {
                  e.currentTarget.style.background = '#1a1a1a'
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(31, 41, 55, 0.15)'
                }
              }}
              onMouseUp={(e) => {
                if (order.items.length > 0) {
                  e.currentTarget.style.background = '#333333'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(31, 41, 55, 0.2)'
                }
              }}
            >
              <i 
                className={(isTtsPlaying || ttsService.isPlaying()) ? "fa-solid fa-stop" : "fa-solid fa-play"} 
                style={{ marginRight: '8px', fontSize: '14px' }}
              ></i>
              {(isTtsPlaying || ttsService.isPlaying()) ? 'Stop' : 'Play'}
            </button>
            
            <button
              onClick={() => setShowSalesSummary(true)}
              disabled={order.items.length === 0}
              style={{
                width: '140px',
                padding: '14px 20px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: order.items.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                background: order.items.length === 0 ? '#9ca3af' : '#000000',
                color: 'white',
                opacity: order.items.length === 0 ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (order.items.length > 0) {
                  e.currentTarget.style.background = '#333333';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(31, 41, 55, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (order.items.length > 0) {
                  e.currentTarget.style.background = '#000000';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }
              }}
              onMouseDown={(e) => {
                if (order.items.length > 0) {
                  e.currentTarget.style.background = '#1a1a1a';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(31, 41, 55, 0.15)';
                }
              }}
              onMouseUp={(e) => {
                if (order.items.length > 0) {
                  e.currentTarget.style.background = '#333333';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(31, 41, 55, 0.2)';
                }
              }}
            >
              <i className="fa-solid fa-credit-card" style={{ marginRight: '8px' }}></i>
              Purchase
            </button>
          </div>
        </div>
      </div>

      {/* Sales Summary Modal */}
      {showSalesSummary && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{ 
                margin: '0', 
                fontSize: '24px', 
                fontWeight: '600',
                color: '#1f2937'
              }}>
                <i className="fa-solid fa-receipt" style={{ marginRight: '12px', color: '#7d8d86' }}></i>
                Sales Summary
              </h2>
              <button
                onClick={() => setShowSalesSummary(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>


            {/* Customer Info */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Customer Information</h3>
              <div className={styles.customerInfoGrid}>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Customer Name (Optional)</label>
                  <CustomerAutocomplete
                    value={customerName}
                    onChange={setCustomerName}
                    onSelectCustomer={(customer) => {
                      setSelectedCustomer(customer)
                      if (customer) {
                        setCustomerPhone(customer.phone_number)
                      }
                    }}
                    placeholder="Enter customer name and surname"
                    style={{
                      fontSize: '16px',
                      width: '100%'
                    }}
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Phone Number (Optional)</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className={styles.input}
                  />
                </div>
                
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Gender (Optional)</label>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setCustomerGender('male')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        border: customerGender === 'male' ? '2px solid #7d8d86' : '2px solid #e5e7eb',
                        borderRadius: '8px',
                        background: customerGender === 'male' ? '#f0f9ff' : '#ffffff',
                        color: customerGender === 'male' ? '#7d8d86' : '#6b7280',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <i className="fa-solid fa-mars" style={{ fontSize: '16px' }}></i>
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerGender('female')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        border: customerGender === 'female' ? '2px solid #7d8d86' : '2px solid #e5e7eb',
                        borderRadius: '8px',
                        background: customerGender === 'female' ? '#fdf2f8' : '#ffffff',
                        color: customerGender === 'female' ? '#7d8d86' : '#6b7280',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <i className="fa-solid fa-venus" style={{ fontSize: '16px' }}></i>
                      Female
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0 0 12px 0'
              }}>
                Payment Method
              </h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {['cash', 'card', 'credit'].map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      background: paymentMethod === method ? '#7d8d86' : '#f3f4f6',
                      color: paymentMethod === method ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <i className={`fa-solid fa-${method === 'cash' ? 'money-bill' : method === 'card' ? 'credit-card' : 'hand-holding-dollar'}`} style={{ marginRight: '6px' }}></i>
                    {method}
                  </button>
                ))}
              </div>
            </div>


            {/* Partial Payment Toggle */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1f2937',
                  margin: '0'
                }}>
                  Payment Options
                </h3>
                <button
                  onClick={() => {
                    setAllowPartialPayment(!allowPartialPayment)
                    if (!allowPartialPayment) {
                      // Enable partial payment - set partial amount to full total initially
                      setPartialAmount(order.total.toString())
                      setRemainingAmount(0)
                    } else {
                      // Disable partial payment - clear amounts
                      setPartialAmount('')
                      setRemainingAmount(0)
                    }
                  }}
                  style={{
                    background: allowPartialPayment ? '#ef4444' : '#7d8d86',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className={`fa-solid fa-${allowPartialPayment ? 'times' : 'credit-card'}`} style={{ fontSize: '12px' }}></i>
                  {allowPartialPayment ? 'Disable Partial' : 'Enable Partial Payment'}
                </button>
              </div>

              {allowPartialPayment && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <i className="fa-solid fa-info-circle" style={{ color: '#f59e0b' }}></i>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#92400e' }}>
                      Partial Payment Enabled
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#92400e' }}>
                    <div>Amount to pay now: <strong>€{(parseFloat(partialAmount) || 0).toFixed(2)}</strong></div>
                    <div>Remaining amount: <strong>€{remainingAmount.toFixed(2)}</strong></div>
                    {remainingAmount > 0 && (
                      <div style={{ marginTop: '8px', padding: '8px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '4px' }}>
                        <i className="fa-solid fa-exclamation-triangle" style={{ marginRight: '6px', color: '#dc2626' }}></i>
                        <strong style={{ color: '#dc2626' }}>Still need to pay: €{remainingAmount.toFixed(2)}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {allowPartialPayment && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Amount to Pay Now (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={order.total}
                    value={partialAmount}
                    onChange={(e) => {
                      const value = e.target.value
                      setPartialAmount(value)
                      // Immediately update remaining amount
                      const partial = parseFloat(value) || 0
                      setRemainingAmount(Math.max(0, order.total - partial))
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #6b7280',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    placeholder={`Enter amount (max €${order.total.toFixed(2)})`}
                  />
                </div>
              )}

              {allowPartialPayment && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={partialPaymentNotes}
                    onChange={(e) => setPartialPaymentNotes(e.target.value)}
                    placeholder="Add any notes about this partial payment..."
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #6b7280',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical',
                      minHeight: '60px',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.2s ease'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Amount Entered */}
            {paymentMethod === 'cash' && (
              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  color: '#1f2937',
                  margin: '0 0 12px 0'
                }}>
                  Amount Received
                </h3>
                
                {/* Quick Amount Button */}
                <div style={{ 
                  marginBottom: '12px' 
                }}>
                  <button
                    onClick={() => setAmountEntered(allowPartialPayment ? partialAmount : order.total.toFixed(2))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'var(--border-subtle)',
                      borderRadius: '8px',
                      background: '#ffffff',
                      color: '#374151',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => (e.target as HTMLButtonElement).style.background = '#f9fafb'}
                    onMouseOut={(e) => (e.target as HTMLButtonElement).style.background = '#ffffff'}
                  >
                    Set Exact Amount (€{allowPartialPayment ? (parseFloat(partialAmount) || 0).toFixed(2) : order.total.toFixed(2)})
                  </button>
                </div>

                <input
                  type="number"
                  step="0.01"
                  value={amountEntered}
                  onChange={(e) => setAmountEntered(e.target.value)}
                  placeholder={`Enter amount: €${allowPartialPayment ? (parseFloat(partialAmount) || 0).toFixed(2) : order.total.toFixed(2)}`}
                  style={{
                    width: '100%',
                    maxWidth: '300px',
                    margin: '0 auto',
                    display: 'block',
                    padding: '12px 16px',
                    border: '1px solid #6b7280',
                    borderRadius: '8px',
                    fontSize: '18px',
                    fontWeight: '500',
                    outline: 'none',
                    background: '#ffffff',
                    textAlign: 'center'
                  }}
                />
                
                {change > 0 && (
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{
                      padding: '12px 16px',
                      background: '#f0f9ff',
                      border: '1px solid #0ea5e9',
                      borderRadius: '8px',
                      color: '#0c4a6e',
                      fontSize: '16px',
                      fontWeight: '600',
                      textAlign: 'center'
                    }}>
                      <i className="fa-solid fa-coins" style={{ marginRight: '8px' }}></i>
                      Change: €{change.toFixed(2)}
                    </div>

                    {changeBreakdown.length > 0 && (
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '16px',
                        marginTop: '8px',
                        boxShadow: 'none'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#475569',
                          marginBottom: '12px'
                        }}>
                          <i className="fa-solid fa-coins" style={{ color: '#7d8d86' }}></i>
                          Change Breakdown
                        </div>

                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          justifyContent: 'center'
                        }}>
                          {changeBreakdown.map((item, idx) => (
                            <div
                              key={`${item.label}-${idx}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: item.type === 'note' ? '#dcfce7' : '#fef3c7',
                                border: `1px solid ${item.type === 'note' ? '#bbf7d0' : '#fde68a'}`,
                                borderRadius: '10px',
                                padding: '10px 12px',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: item.type === 'note' ? '#166534' : '#92400e',
                                minWidth: 'fit-content',
                                boxShadow: 'none'
                              }}
                            >
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.label}
                                  style={{
                                    width: '40px',
                                    height: '40px',
                                    objectFit: 'contain',
                                    borderRadius: '4px'
                                  }}
                                />
                              )}
                              <span style={{ fontSize: '13px', fontWeight: '600' }}>{item.label}</span>
                              <span style={{
                                background: item.type === 'note' ? '#22c55e' : '#f59e0b',
                                color: 'white',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: '700'
                              }}>
                                ×{item.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {allowPartialPayment && remainingAmount > 0 && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 16px',
                    background: '#fef2f2',
                    border: '2px solid #dc2626',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '16px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    <i className="fa-solid fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                    Still need to pay: €{remainingAmount.toFixed(2)}
                  </div>
                )}
                {amountEntered && parseFloat(amountEntered) < order.total && !allowPartialPayment && (
                  <div style={{
                    marginTop: '12px',
                    padding: '12px 16px',
                    background: '#fef2f2',
                    border: '1px solid #f87171',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '16px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    <i className="fa-solid fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
                    Need €{((allowPartialPayment ? (parseFloat(partialAmount) || 0) : order.total) - parseFloat(amountEntered)).toFixed(2)} more
                  </div>
                )}
              </div>
            )}

            {/* Receipt Notes */}
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0 0 12px 0'
              }}>
                Receipt Notes (Optional)
              </h3>
              <textarea
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="Add notes for receipt (e.g., partial payment, special instructions, etc.)"
                className={styles.textarea}
              />
              <p className={styles.helpText}>
                These notes will appear on the printed receipt
              </p>
            </div>

            {/* Payment Summary */}
            <div style={{ 
              background: '#f9fafb',
              padding: '12px',
              borderRadius: '12px',
              marginBottom: '16px'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0 0 16px 0'
              }}>
                Payment Summary
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '16px', color: '#6b7280' }}>Subtotal</span>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                    €{order.subtotal.toFixed(2)}
                  </span>
                </div>
                {order.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '16px', color: '#6b7280' }}>Discount</span>
                    <span style={{ fontSize: '16px', fontWeight: '500', color: '#1f2937' }}>
                      €{order.discount.toFixed(2)}
                    </span>
                  </div>
                )}
                {allowPartialPayment && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '16px', color: '#6b7280' }}>Amount to Pay Now</span>
                      <span style={{ fontSize: '16px', fontWeight: '500', color: '#7d8d86' }}>
                        €{(parseFloat(partialAmount) || 0).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '16px', color: '#6b7280' }}>Remaining Amount</span>
                      <span style={{ fontSize: '16px', fontWeight: '500', color: '#ef4444' }}>
                        €{remainingAmount.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid #d1d5db',
                  marginTop: '8px'
                }}>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                    {allowPartialPayment ? 'Total Order' : 'Total'}
                  </span>
                  <span style={{ fontSize: '18px', fontWeight: '600', color: '#7d8d86' }}>
                    €{order.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowReceiptPreview(true)}
                  style={{
                    background: '#ffffff',
                    color: '#3e3f29',
                    border: '1px solid #3e3f29',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fa-solid fa-eye"></i>
                  View Receipt
                </button>
                <button
                  onClick={printReceipt}
                  style={{
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fa-solid fa-print"></i>
                  Print Receipt
                </button>
              </div>
              
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowSalesSummary(false)}
                  style={{
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={processSale}
                  disabled={paymentMethod === 'cash' && (!amountEntered || parseFloat(amountEntered) < (allowPartialPayment ? (parseFloat(partialAmount) || 0) : order.total))}
                  style={{
                    background: (paymentMethod === 'cash' && (!amountEntered || parseFloat(amountEntered) < (allowPartialPayment ? (parseFloat(partialAmount) || 0) : order.total))) 
                      ? '#9ca3af' 
                      : 'linear-gradient(135deg, #7d8d86, #3e3f29)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: (paymentMethod === 'cash' && (!amountEntered || parseFloat(amountEntered) < (allowPartialPayment ? (parseFloat(partialAmount) || 0) : order.total))) 
                      ? 'not-allowed' 
                      : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: (paymentMethod === 'cash' && (!amountEntered || parseFloat(amountEntered) < (allowPartialPayment ? (parseFloat(partialAmount) || 0) : order.total))) 
                      ? 0.6 
                      : 1
                  }}
                >
                  <i className="fa-solid fa-credit-card"></i>
                  {allowPartialPayment ? 'Process Partial Payment' : 'Process Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            width: '90vw',
            maxWidth: '1200px',
            height: '90vh',
            maxHeight: '90vh',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowReceiptPreview(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6b7280',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%'
              }}
              onMouseOver={(e) => (e.target as HTMLButtonElement).style.background = '#f3f4f6'}
              onMouseOut={(e) => (e.target as HTMLButtonElement).style.background = 'none'}
            >
              <i className="fa-solid fa-times"></i>
            </button>

            {/* Receipt Preview */}
            <div style={{ width: '100%', flex: 1, overflow: 'auto', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0 0 16px 0',
                textAlign: 'center'
              }}>
                Receipt Preview
              </h2>
              <div 
                dangerouslySetInnerHTML={{ __html: generateReceiptHTML() }}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '24px',
                  background: '#ffffff',
                  fontFamily: 'Courier New, monospace',
                  fontSize: '16px',
                  lineHeight: '1.7',
                  width: '100%',
                  maxWidth: '700px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                  margin: '0 auto 16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowReceiptPreview(false)}
                style={{
                  padding: '12px 24px',
                  border: 'var(--border-subtle)',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowReceiptPreview(false)
                  printReceipt()
                }}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #3e3f29 0%, #7d8d86 100%)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fa-solid fa-print"></i>
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Price Modal */}
      {showCustomPriceModal && pendingSideBusinessItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Enter Custom Price
            </h3>
            
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Set the price for: <strong>{pendingSideBusinessItem.name}</strong>
            </p>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Price (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={customPriceInput}
                onChange={(e) => setCustomPriceInput(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  padding: '12px',
                  border: '1px solid #6b7280',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCustomPriceSubmit()
                  }
                }}
                autoFocus
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowCustomPriceModal(false)
                  setPendingSideBusinessItem(null)
                  setCustomPriceInput('')
                }}
                style={{
                  padding: '12px 24px',
                  border: 'var(--border-subtle)',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCustomPriceSubmit}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #7d8d86, #3e3f29)',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Weight Input Modal */}
      {showWeightModal && pendingWeightedProduct && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 16px 0'
            }}>
              {pendingItemId ? 'Edit Weight' : 'Enter Weight'}
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 8px 0'
              }}>
                {pendingWeightedProduct.name}
              </p>
              <p style={{
                fontSize: '12px',
                color: '#9ca3af',
                margin: '0 0 12px 0'
              }}>
                Price: €{pendingWeightedProduct.price_per_unit?.toFixed(2)} per {pendingWeightedProduct.weight_unit}
              </p>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Weight ({pendingWeightedProduct.weight_unit})
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder={`Enter weight in ${pendingWeightedProduct.weight_unit}`}
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  padding: '12px',
                  border: '2px solid #6b7280',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#7d8d86'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                autoFocus
              />
            </div>
            
            {weightInput && parseFloat(weightInput) > 0 && (
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '20px'
              }}>
                <p style={{
                  fontSize: '14px',
                  color: '#374151',
                  margin: '0 0 4px 0'
                }}>
                  Total Price:
                </p>
                <p style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0
                }}>
                  €{((parseFloat(weightInput) || 0) * (pendingWeightedProduct.price_per_unit || 0)).toFixed(2)}
                </p>
              </div>
            )}
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowWeightModal(false)
                  setPendingWeightedProduct(null)
                  setPendingItemId(null)
                  setWeightInput('')
                }}
                style={{
                  padding: '12px 24px',
                  border: 'var(--border-subtle)',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const weight = parseFloat(weightInput)
                  if (weight > 0) {
                    addWeightedProductToOrder(pendingWeightedProduct, weight)
                  }
                }}
                disabled={!weightInput || parseFloat(weightInput) <= 0}
                style={{
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  background: (!weightInput || parseFloat(weightInput) <= 0) ? '#d1d5db' : '#7d8d86',
                  color: (!weightInput || parseFloat(weightInput) <= 0) ? '#9ca3af' : '#ffffff',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: (!weightInput || parseFloat(weightInput) <= 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {pendingItemId ? 'Update Weight' : 'Add to Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Service Modal */}
      {showQuickServiceModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{
              margin: '0 0 20px 0',
              fontSize: '24px',
              fontWeight: '600',
              color: '#1f2937',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <i className="fa-solid fa-plus-circle" style={{ color: '#10b981' }}></i>
              Create Quick Service
            </h3>
            
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Create a service on-the-fly with custom name and price. No need to predefine items!
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Service Business
              </label>
              <select
                value={quickServiceBusiness}
                onChange={(e) => setQuickServiceBusiness(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px solid #6b7280',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#7d8d86'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="">Select a service business</option>
                {serviceBusinesses.map(business => (
                  <option key={business.business_id} value={business.business_id}>
                    {business.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Service Name
              </label>
              <input
                type="text"
                value={quickServiceName}
                onChange={(e) => setQuickServiceName(e.target.value)}
                placeholder="e.g., Haircut, Consultation, Repair..."
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  padding: '12px',
                  border: '2px solid #6b7280',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#7d8d86'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                autoFocus
              />
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Price (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={quickServicePrice}
                onChange={(e) => setQuickServicePrice(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  maxWidth: '300px',
                  padding: '12px',
                  border: '2px solid #6b7280',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#7d8d86'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowQuickServiceModal(false)
                  setQuickServiceName('')
                  setQuickServicePrice('')
                  setQuickServiceBusiness('')
                }}
                style={{
                  padding: '12px 24px',
                  border: 'var(--border-subtle)',
                  borderRadius: '8px',
                  background: '#ffffff',
                  color: '#374151',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button
                onClick={createQuickService}
                disabled={!quickServiceName.trim() || !quickServicePrice || !quickServiceBusiness}
                style={{
                  padding: '12px 24px',
                  border: (!quickServiceName.trim() || !quickServicePrice || !quickServiceBusiness) ? 'none' : '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: (!quickServiceName.trim() || !quickServicePrice || !quickServiceBusiness) ? '#d1d5db' : '#f8fafc',
                  color: (!quickServiceName.trim() || !quickServicePrice || !quickServiceBusiness) ? '#9ca3af' : '#374151',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: (!quickServiceName.trim() || !quickServicePrice || !quickServiceBusiness) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fa-solid fa-plus"></i>
                Add to Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calculator Modal */}
      {isCalculatorOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            position: 'relative',
            backgroundColor: 'transparent',
            borderRadius: '16px',
            padding: '0',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <button
              onClick={() => setIsCalculatorOpen(false)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.7)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#ffffff',
                zIndex: 1001,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
            <Calculator />
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onProductAdded={(product) => {
          // Refresh all products and categories when a new product is added
          fetchAllProductsAndCategories()
          setShowAddProductModal(false)
        }}
        categories={categories}
        onCategoryAdded={(category) => {
          // Add the new category to the categories list
          setCategories(prev => [...prev, category])
        }}
      />

      {/* Stock Alert Modal */}
      <StockAlertModal
        isOpen={showStockAlert}
        onClose={() => setShowStockAlert(false)}
        product={stockAlertProduct}
        currentStock={stockAlertCurrentStock}
        requestedQuantity={stockAlertRequestedQuantity}
        onQuickRestock={handleQuickRestock}
        onCancel={() => {
          setShowStockAlert(false)
          setStockAlertProduct(null)
          setStockAlertCurrentStock(0)
          setStockAlertRequestedQuantity(0)
        }}
      />

      {/* Quantity Modal */}
      {showQuantityModal && pendingProduct && (
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
          zIndex: 10000
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0 0 8px 0',
              textAlign: 'center'
            }}>
              Add {pendingProduct.name}
            </h3>
            
            {/* Show current quantity in cart */}
            {(() => {
              const existingItem = order.items.find(item => 
                item.product?.product_id === pendingProduct.product_id && !item.weight
              )
              return existingItem ? (
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  textAlign: 'center',
                  margin: '0 0 16px 0'
                }}>
                  Current in cart: {existingItem.quantity}
                </p>
              ) : null
            })()}
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                {(() => {
                  const existingItem = order.items.find(item => 
                    item.product?.product_id === pendingProduct.product_id && !item.weight
                  )
                  return existingItem ? 'Additional quantity to add:' : 'Quantity:'
                })()}
              </label>
              <input
                type="number"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #6b7280',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                min="1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const quantity = parseInt(quantityInput) || 1
                    addToOrderWithQuantity(pendingProduct, quantity)
                    setShowQuantityModal(false)
                    setPendingProduct(null)
                    setQuantityInput('1')
                  }
                }}
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <Button
                variant="outline"
                onClick={() => {
                  setShowQuantityModal(false)
                  setPendingProduct(null)
                  setQuantityInput('1')
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const quantity = parseInt(quantityInput) || 1
                  addToOrderWithQuantity(pendingProduct, quantity)
                  setShowQuantityModal(false)
                  setPendingProduct(null)
                  setQuantityInput('1')
                }}
              >
                Add to Order
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Sales

