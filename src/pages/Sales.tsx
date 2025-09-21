import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBarcodeScanner, setModalOpen } from '../hooks/useBarcodeScanner'
import { ttsService, TTSSettings } from '../lib/ttsService'
import { RetroButton } from '../components/ui/RetroButton'

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
  price_per_unit?: number // price per weight unit (e.g., 3.00 for €3 per kg)
  is_weighted?: boolean // true if item is sold by weight
}

interface SideBusinessItem {
  item_id: number
  business_id: number
  name: string
  price: number | null
  stock_qty: number | null
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
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [sideBusinessItems, setSideBusinessItems] = useState<SideBusinessItem[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [filteredSideBusinessItems, setFilteredSideBusinessItems] = useState<SideBusinessItem[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchSuggestions, setSearchSuggestions] = useState<(Product | SideBusinessItem)[]>([])
  const [topProducts, setTopProducts] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isFiltering, setIsFiltering] = useState(false)
  const [order, setOrder] = useState<Order>({
    items: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0
  })
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [showSalesSummary, setShowSalesSummary] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amountEntered, setAmountEntered] = useState('')
  const [change, setChange] = useState(0)
  const [receiptNotes, setReceiptNotes] = useState('')
  const [showReceiptPreview, setShowReceiptPreview] = useState(false)
  const [showCustomPriceModal, setShowCustomPriceModal] = useState(false)
  const [pendingSideBusinessItem, setPendingSideBusinessItem] = useState<SideBusinessItem | null>(null)
  const [customPriceInput, setCustomPriceInput] = useState('')
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [pendingWeightedProduct, setPendingWeightedProduct] = useState<Product | null>(null)
  const [weightInput, setWeightInput] = useState('')
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)
  
  // Quick Service states
  const [showQuickServiceModal, setShowQuickServiceModal] = useState(false)
  const [quickServiceName, setQuickServiceName] = useState('')
  const [quickServicePrice, setQuickServicePrice] = useState('')
  const [quickServiceBusiness, setQuickServiceBusiness] = useState('')
  const [serviceBusinesses, setServiceBusinesses] = useState<{business_id: number, name: string}[]>([])
  
  // TTS states - using the new TTS service
  const [, setTtsSettings] = useState<TTSSettings>(ttsService.getSettings())
  const [isTtsPlaying, setIsTtsPlaying] = useState(false)
  
  // Barcode scanner states
  const [barcodeScannerActive, setBarcodeScannerActive] = useState(false) // Start as inactive
  const [barcodeStatus, setBarcodeStatus] = useState<'idle' | 'listening' | 'scanned' | 'not_found'>('idle') // Start as idle
  const [lastScannedBarcode, setLastScannedBarcode] = useState('')
  
  // Partial payment state
  const [allowPartialPayment, setAllowPartialPayment] = useState(false)
  const [partialAmount, setPartialAmount] = useState('')
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [partialPaymentNotes, setPartialPaymentNotes] = useState('')
  
  // Transaction context state
  const [existingTransactionId, setExistingTransactionId] = useState<string | null>(null)
  const [existingTransaction, setExistingTransaction] = useState<any>(null)
  const [isAddingToTransaction, setIsAddingToTransaction] = useState(false)

  useEffect(() => {
    if (businessLoading) {
      return
    }

        if (businessId == null) {
      setProducts([])
      setSideBusinessItems([])
      setTopProducts([])
      setCategories(['All'])
      setServiceBusinesses([])
      setExistingTransaction(null)
      setExistingTransactionId(null)
      setIsAddingToTransaction(false)
      return
    }

    // Load initial products and related data
    fetchProducts(selectedCategory, searchTerm)
    fetchServiceBusinesses()

    const transactionParam = searchParams.get('transaction')
    if (transactionParam) {
      setExistingTransactionId(transactionParam)
      setIsAddingToTransaction(true)
      fetchExistingTransaction(transactionParam)
    }
  }, [searchParams, businessId, businessLoading, selectedCategory, searchTerm])

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

  const fetchProducts = async (category?: string, search?: string) => {
    if (businessLoading) {
      return
    }

      if (businessId == null) {
      setProducts([])
      setSideBusinessItems([])
      setTopProducts([])
      setCategories(['All'])
      setLoading(false)
      setIsFiltering(false)
      return
    }

    try {
      setLoading(true)

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

      const { data: sideBusinessData, error: sideBusinessError } = await supabase
        .from('side_business_items')
        .select(`
          *,
          side_businesses (name, business_type)
        `)
        .eq('parent_shop_id', businessId)
        .order('name')

      if (sideBusinessError) throw sideBusinessError

      const safeProducts = productsData || []
      const safeSideBusinessItems = sideBusinessData || []

      setProducts(safeProducts)
      setSideBusinessItems(safeSideBusinessItems)
      setTopProducts(safeProducts)

      const productCategories = safeProducts.map(p => p.category).filter(Boolean)
      const sideBusinessCategories = safeSideBusinessItems.map(item => item.side_businesses?.name).filter(Boolean)
      const allCategories = ['All', ...new Set([...productCategories, ...sideBusinessCategories])]
      setCategories(allCategories)
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
          customers (name),
          users (username)
        `)
        .eq('sale_id', saleId)
        .eq('business_id', businessId)
        .single()

      if (transactionError || !transactionData) {
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
          quantity: item.quantity
        }

        if (item.products?.is_weighted && item.weight && item.calculated_price) {
          orderItem.weight = item.weight
          orderItem.calculatedPrice = item.calculated_price
        }

        return orderItem
      })

      const subtotal = existingItems.reduce((sum, item) => {
        if (item.weight && item.calculatedPrice) {
          return sum + item.calculatedPrice
        }
        return sum + (item.product!.price * item.quantity)
      }, 0)
      const tax = subtotal * 0.1 // 10% tax
      const total = subtotal + tax

      setOrder({
        items: existingItems,
        subtotal,
        tax,
        discount: 0,
        total
      })

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

  const filterProducts = () => {
    // Filter the cached top products client-side
    let filteredProducts = topProducts

    if (selectedCategory !== 'All') {
      filteredProducts = filteredProducts.filter(p => p.category === selectedCategory)
    }

    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase().trim()
      filteredProducts = filteredProducts.filter(p => 
        p.name.toLowerCase().includes(searchTermLower) ||
        p.category?.toLowerCase().includes(searchTermLower) ||
        p.description?.toLowerCase().includes(searchTermLower) ||
        p.sku?.toLowerCase().includes(searchTermLower)
      )
    }

    setFilteredProducts(filteredProducts)

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

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
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
    const discount = 0 // Can be implemented later
    const total = subtotal - discount

    setOrder(prev => ({
      ...prev,
      subtotal,
      tax,
      discount,
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

    // Regular product handling
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
          items: [...prev.items, { product, quantity: 1 }]
        }
      }
    })
    
    // Announce item added
    speakItemAdded(product.name, product.price)
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
          calculatedPrice 
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
    if (!sideBusinessItem.price) {
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
            items: [...prev.items, { sideBusinessItem, quantity: 1 }]
          }
        }
      })
      
      // Announce item added
      const itemName = sideBusinessItem.name
      const price = sideBusinessItem.price || 0
      speakItemAdded(itemName, price)
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
          items: [...prev.items, { sideBusinessItem: pendingSideBusinessItem, quantity: 1, customPrice: price }]
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
        stock_qty: null, // Services don't have stock
        side_businesses: {
          name: serviceBusinesses.find(b => b.business_id.toString() === quickServiceBusiness)?.name || 'Service',
          business_type: 'service'
        }
      }

      // Add to order
      setOrder(prev => ({
        ...prev,
        items: [...prev.items, { sideBusinessItem: tempServiceItem, quantity: 1, customPrice: price }]
      }))

      // Announce service created
      speakItemAdded(quickServiceName.trim(), price)

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
        } else if (item.sideBusinessItem?.item_id.toString() === itemId) {
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
    console.log('🔍 Barcode scanned:', barcode)
    let product = findProductByBarcode(barcode)
    console.log('🔍 Local product found:', product)

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
      console.log('🔍 Searching database for barcode:', normalizedBarcode, 'business_id:', businessId)
      const { data: remoteProducts, error: remoteError } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .ilike('barcode', normalizedBarcode)
        .limit(1)
      
      console.log('🔍 Database query result:', remoteProducts, 'error:', remoteError)

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
      console.log('✅ Adding product to order:', product.name)
      addToOrder(product)
      setBarcodeStatus('scanned')
      setLastScannedBarcode(barcode)

      setTimeout(() => {
        setBarcodeStatus('idle')
      }, 2000)
    } else {
      console.log('❌ Product not found for barcode:', barcode)
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
          console.log('🔍 Global barcode fallback detected:', value)
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
        item.sideBusinessItem?.item_id.toString() !== itemId
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
      setCustomerName('')
      setCustomerPhone('')
      setPaymentMethod('cash')
      setAmountEntered('')
      setChange(0)
      setReceiptNotes('')
      
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
    const receiptNumber = `RCP-${Date.now()}`
    const currentDate = new Date()
    const dateStr = currentDate.toLocaleDateString('en-IE')
    const timeStr = currentDate.toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receiptNumber}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            line-height: 1.4; 
            margin: 0; 
            padding: 10px; 
            background: white;
            color: black;
          }
          .receipt { 
            width: 100%; 
            max-width: 400px; 
            margin: 0 auto; 
            border: 1px solid #ccc; 
            padding: 20px; 
            background: white;
          }
          .header { 
            text-align: center; 
            margin-bottom: 15px; 
            border-bottom: 1px dashed #333; 
            padding-bottom: 10px; 
          }
          .logo-fallback {
            display: none;
            background: #333;
            color: white;
            padding: 8px;
            text-align: center;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .business-info { 
            font-size: 10px; 
            margin: 8px 0; 
          }
          .divider { 
            border-top: 1px dashed #333; 
            margin: 10px 0; 
          }
          .item-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 3px 0; 
          }
          .total-row { 
            font-weight: bold; 
            border-top: 1px solid #333; 
            padding-top: 5px; 
            margin-top: 8px; 
          }
          .payment-info { 
            margin: 10px 0; 
          }
          .notes-section {
            margin: 10px 0;
            padding: 8px;
            background: #f5f5f5;
            border-radius: 4px;
          }
          .footer { 
            text-align: center; 
            margin-top: 15px; 
            font-size: 10px; 
            border-top: 1px dashed #333; 
            padding-top: 10px; 
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <img src="/retailpos/images/backgrounds/logo1.png" alt="LandM Store" style="max-width: 80px; height: auto; display: block; margin: 0 auto 10px;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
            <div class="logo-fallback" style="display: none; font-size: 24px; font-weight: bold; margin-bottom: 8px; color: #1a1a1a;">LandM Store</div>
            <div class="business-info">
              <div>Unit 2 Glenmore Park</div>
              <div>Dundalk, Co. Louth</div>
              <div>087 797 0412</div>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div class="item-row">
            <span>Date: ${dateStr}</span>
            <span>Time: ${timeStr}</span>
          </div>
          <div class="item-row">
            <span>Receipt: ${receiptNumber}</span>
            <span>Cashier: ${user?.username || 'System'}</span>
          </div>
          
          <div class="divider"></div>
          
          ${order.items.map(item => {
            const itemName = item.product?.name || item.sideBusinessItem?.name || 'Unknown Item'
            const itemPrice = item.product?.price || item.customPrice || item.sideBusinessItem?.price || 0
            return `
            <div class="item-row">
              <span>${itemName} x${item.quantity}</span>
              <span>€${(itemPrice * item.quantity).toFixed(2)}</span>
            </div>
          `
          }).join('')}
          
          <div class="divider"></div>
          
          <div class="item-row total-row">
            <span>SUBTOTAL:</span>
            <span>€${order.subtotal.toFixed(2)}</span>
          </div>
          <div class="item-row total-row">
            <span>${allowPartialPayment ? 'ORDER TOTAL:' : 'GRAND TOTAL:'}</span>
            <span>€${order.total.toFixed(2)}</span>
          </div>
          
          ${allowPartialPayment ? `
          <div class="divider"></div>
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 4px; padding: 8px; margin: 10px 0;">
            <div style="font-weight: bold; margin-bottom: 5px; color: #92400e;">
              <i class="fa-solid fa-credit-card" style="margin-right: 5px;"></i>
              PARTIAL PAYMENT
            </div>
            <div class="item-row">
              <span>Amount Paid Today:</span>
              <span style="color: #059669; font-weight: bold;">€${(parseFloat(partialAmount) || 0).toFixed(2)}</span>
            </div>
            <div class="item-row">
              <span>Remaining Balance:</span>
              <span style="color: #dc2626; font-weight: bold;">€${remainingAmount.toFixed(2)}</span>
            </div>
            ${partialPaymentNotes ? `
            <div style="margin-top: 5px; font-size: 10px; color: #92400e;">
              Note: ${partialPaymentNotes}
            </div>
            ` : ''}
          </div>
          ` : ''}
          
          <div class="payment-info">
            <div class="item-row">
              <span>Payment Method:</span>
              <span>${paymentMethod.toUpperCase()}</span>
            </div>
            ${paymentMethod === 'cash' ? `
            <div class="item-row">
              <span>Amount Received:</span>
              <span>€${parseFloat(amountEntered).toFixed(2)}</span>
            </div>
            <div class="item-row">
              <span>Change Given:</span>
              <span>€${change.toFixed(2)}</span>
            </div>
            ` : paymentMethod === 'card' ? `
            <div class="item-row">
              <span>Card: ****1234</span>
              <span>Approval: ${Math.floor(Math.random() * 10000)}</span>
            </div>
            ` : ''}
          </div>
          
          ${(receiptNotes || (allowPartialPayment && partialPaymentNotes)) ? `
          <div class="divider"></div>
          <div class="notes-section">
            <div style="font-weight: bold; margin-bottom: 5px;">Notes:</div>
            <div style="font-size: 9px; line-height: 1.3; margin-left: 10px;">
              ${allowPartialPayment ? `PARTIAL PAYMENT
Amount Paid Today: €${(parseFloat(partialAmount) || 0).toFixed(2)}
Remaining Balance: €${remainingAmount.toFixed(2)}
${partialPaymentNotes ? `Partial Payment Notes: ${partialPaymentNotes}` : ''}` : ''}
              ${receiptNotes ? (allowPartialPayment ? '\n\n' : '') + receiptNotes : ''}
            </div>
          </div>
          ` : ''}
          
          <div class="divider"></div>
          
          <div class="footer">
            <div>Thank you for shopping with us!</div>
            <div style="margin-top: 5px;">LandM Store - Your Local African Food Store</div>
            ${allowPartialPayment ? `
            <div style="margin-top: 10px; font-size: 9px; color: #92400e;">
              <strong>Please keep this receipt for your records</strong><br>
              Remaining balance: €${remainingAmount.toFixed(2)}
            </div>
            ` : ''}
          </div>
        </div>
      </body>
      </html>
    `
  }

  const printReceipt = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(generateReceiptHTML())
    printWindow.document.close()
    printWindow.print()
    printWindow.close()
  }

  const processSale = async () => {
    if (order.items.length === 0 || businessLoading) return

    if (businessId == null) {
      alert('Please select a business before processing a sale.')
      return
    }

    try {
      let saleData
      
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
        let customerId = null
        if (customerName.trim()) {
          // Check if customer exists
          const { data: existingCustomer, error: lookupError } = await supabase
            .from('customers')
            .select('customer_id')
            .eq('business_id', businessId)
            .eq('name', customerName.trim())
            .single()

          if (existingCustomer && !lookupError) {
            customerId = existingCustomer.customer_id
          } else {
            // Create new customer
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert([{
                name: customerName.trim(),
                phone_number: customerPhone.trim() || '000-000-0000', // Use provided phone or default
                email: null,
                business_id: businessId
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
            business_id: businessId
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
            business_id: businessId
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
        // Only add new items that aren't already in the transaction
        const existingItemIds = existingTransaction ? 
          (await supabase.from('sale_items').select('product_id').eq('sale_id', saleData.sale_id)).data?.map(item => item.product_id) || [] : []
        
        const newItems = order.items.filter(item => item.product && !existingItemIds.includes(item.product.product_id))
        
        if (newItems.length > 0) {
          const saleItems = newItems.map(item => ({
            sale_id: saleData.sale_id,
            product_id: item.product!.product_id,
            quantity: item.quantity,
            price_each: item.product!.price,
            weight: item.weight || null,
            calculated_price: item.calculatedPrice || null
          }))

          const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(saleItems)

          if (itemsError) throw itemsError

          // Update product sales counters
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
              // Don't throw here as the main sale was successful
            }
          }
        }

        // Handle side business items for existing transactions
        const sideBusinessItems = order.items.filter(item => item.sideBusinessItem)
        
        for (const item of sideBusinessItems) {
          let itemId = item.sideBusinessItem!.item_id
          
          // If this is a temporary service item (created via Quick Service), create it in the database first
          if (itemId > 1000000000) { // Temporary IDs are timestamps, so they'll be large numbers
            const { data: newItem, error: createItemError } = await supabase
              .from('side_business_items')
              .insert({
                business_id: item.sideBusinessItem!.business_id,
                parent_shop_id: businessId,
                name: item.sideBusinessItem!.name,
                price: item.customPrice || item.sideBusinessItem!.price,
                stock_qty: null, // Services don't have stock
                notes: 'Created via Quick Service'
              })
              .select()
              .single()

            if (createItemError) throw createItemError
            itemId = newItem.item_id
          }

          // Record the sale
          const { error: sideBusinessError } = await supabase
            .from('side_business_sales')
            .insert({
              item_id: itemId,
              quantity: item.quantity,
              total_amount: (item.customPrice || item.sideBusinessItem!.price || 0) * item.quantity,
              payment_method: paymentMethod,
              date_time: getLocalDateTime(),
              business_id: item.sideBusinessItem!.business_id,
              parent_shop_id: businessId
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

        // Handle side business items (including temporary quick services)
        const sideBusinessItems = order.items.filter(item => item.sideBusinessItem)
        
        for (const item of sideBusinessItems) {
          let itemId = item.sideBusinessItem!.item_id
          
          // If this is a temporary service item (created via Quick Service), create it in the database first
          if (itemId > 1000000000) { // Temporary IDs are timestamps, so they'll be large numbers
            const { data: newItem, error: createItemError } = await supabase
              .from('side_business_items')
              .insert({
                business_id: item.sideBusinessItem!.business_id,
                parent_shop_id: businessId,
                name: item.sideBusinessItem!.name,
                price: item.customPrice || item.sideBusinessItem!.price,
                stock_qty: null, // Services don't have stock
                notes: 'Created via Quick Service'
              })
              .select()
              .single()

            if (createItemError) throw createItemError
            itemId = newItem.item_id
          }

          // Record the sale
          const { error: sideBusinessError } = await supabase
            .from('side_business_sales')
            .insert({
              item_id: itemId,
              quantity: item.quantity,
              total_amount: (item.customPrice || item.sideBusinessItem!.price || 0) * item.quantity,
              payment_method: paymentMethod,
              date_time: getLocalDateTime(),
              business_id: item.sideBusinessItem!.business_id,
              parent_shop_id: businessId
            })

          if (sideBusinessError) throw sideBusinessError
        }

        // Insert regular product sales
        if (saleItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('sale_items')
            .insert(saleItems)

          if (itemsError) throw itemsError

          // Update product sales counters
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
              // Don't throw here as the main sale was successful
            }
          }
        }
      }

      // Update product stock quantities (only for regular products)
      const productItemsToProcess = isAddingToTransaction && existingTransactionId ? 
        order.items.filter(item => {
          if (!item.product) return false
          // Only process items that are new to the transaction
          const existingItemIds = existingTransaction ? 
            (existingTransaction.sale_items || []).map((item: any) => item.product_id) : []
          return !existingItemIds.includes(item.product.product_id)
        }) : order.items.filter(item => item.product)

      for (const item of productItemsToProcess) {
        if (!item.product) continue
        
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: item.product.stock_quantity - item.quantity,
            last_updated: getLocalDateTime()
          })
          .eq('product_id', item.product.product_id)
          .eq('business_id', businessId)

        if (stockError) throw stockError

        // Create inventory movement record
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert([{
            product_id: item.product.product_id,
            quantity_change: -item.quantity,
            movement_type: 'Sale',
            reference_id: saleData.sale_id,
            business_id: businessId
          }])

        if (movementError) throw movementError
      }

      // Update side business item stock quantities
      const sideBusinessItemsToProcess = order.items.filter(item => item.sideBusinessItem)

      for (const item of sideBusinessItemsToProcess) {
        if (!item.sideBusinessItem || item.sideBusinessItem.stock_qty === null) continue
        
        const { error: stockError } = await supabase
          .from('side_business_items')
          .update({ 
            stock_qty: item.sideBusinessItem.stock_qty - item.quantity
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
      setCustomerName('')
      setCustomerPhone('')
      setPaymentMethod('cash')
      setAmountEntered('')
      setChange(0)
      setReceiptNotes('')
      
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

      // Announce order total
      speakOrderTotal(order.total)

      // Close the sales summary modal
      setShowSalesSummary(false)
      
      // Navigate back to transaction detail if adding to existing transaction
      if (isAddingToTransaction && existingTransactionId) {
        setTimeout(() => {
          navigate(`/transaction/${existingTransactionId}`)
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
      const { error } = await supabase
        .from('reminders')
        .insert([{
          title: reminderTitle,
          body: reminderBody,
          remind_date: remindDate,
          owner_id: ownerId,
          business_id: businessId
        }])
        .select()
        .single()

      if (error) {
        console.error('Error creating partial payment reminder:', error)
        console.error('Reminder data attempted:', {
          title: reminderTitle,
          body: reminderBody,
          remind_date: remindDate,
          owner_id: ownerId
        })
        // Don't throw error - reminder creation failure shouldn't break the sale
      }
    } catch (error) {
      console.error('Error creating partial payment reminder:', error)
      // Don't throw error - reminder creation failure shouldn't break the sale
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        fontSize: '18px',
        color: '#6b7280'
      }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '12px' }}></i>
        Loading products...
      </div>
    )
  }

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      background: 'linear-gradient(135deg, #7d8d86, #3e3f29)',
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        background: '#ffffff', 
        margin: '20px', 
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '24px 32px', 
          borderBottom: '1px solid #e5e7eb',
          background: isAddingToTransaction ? '#fef3c7' : '#f9fafb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#1f2937',
              margin: '0 0 8px 0'
            }}>
              <i className="fa-solid fa-cash-register" style={{ marginRight: '12px', color: '#7d8d86' }}></i>
              Point Of Sales
            </h1>
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
          padding: '24px 32px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f5f5f5'
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
              border: '2px solid #e5e7eb',
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
                  placeholder="Search products, categories, or SKU..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={(e) => {
                    e.target.parentElement.parentElement.style.borderColor = '#3b82f6'
                    e.target.parentElement.parentElement.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)'
                    setShowSuggestions(searchSuggestions.length > 0)
                  }}
                  onBlur={(e) => {
                    e.target.parentElement.parentElement.style.borderColor = '#e5e7eb'
                    e.target.parentElement.parentElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (searchTerm.trim()) {
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
                        <div style={{
                          width: '40px',
                          height: '40px',
                          background: isProduct && item.image_url 
                            ? `url(${item.image_url})` 
                            : 'linear-gradient(135deg, #667eea, #764ba2)',
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
                          {isSideBusinessItem && <i className="fa-solid fa-briefcase"></i>}
                        </div>
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
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#ffffff',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
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
              <RetroButton onClick={() => setShowQuickServiceModal(true)}>
                <i className="fa-solid fa-plus-circle" style={{ marginRight: '8px' }}></i>
                Quick Service
              </RetroButton>
            </div>
          </div>
        </div>

        {/* Barcode Scanner Section */}
        <div style={{ 
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
                  console.log('🔍 Hidden input barcode detected:', value)
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
                    border: `2px solid ${barcodeScannerActive ? '#3b82f6' : '#d1d5db'}`,
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
                        console.log('🔍 Manual barcode input:', value)
                        handleBarcodeScanned(value)
                        ;(e.target as HTMLInputElement).value = ''
                      }
                    }
                  }}
                />
                <RetroButton onClick={toggleBarcodeScanner}>
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
                </RetroButton>
              </div>
            </div>

          </div>
        </div>

        {/* Categories */}
        <div style={{ 
          padding: '16px 32px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: '12px'
          }}>
            <label style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              whiteSpace: 'nowrap'
            }}>
              Category:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                background: '#ffffff',
                border: '2px solid #6b7280',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                cursor: 'pointer',
                minWidth: '200px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#7d8d86'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            >
              {categories.map(category => {
                // Calculate count for each category
                let count = 0
                if (category === 'All') {
                  count = products.length + sideBusinessItems.length
                } else {
                  // For individual categories, we can't easily get the count without additional queries
                  // So we'll show the category name without count for now
                  // This could be improved with a separate API call to get category counts
                  count = sideBusinessItems.filter(item => item.side_businesses?.name === category).length
                }
                
                return (
                  <option key={category} value={category}>
                    {category} {category === 'All' ? `(${count})` : count > 0 ? `(${count})` : ''}
                  </option>
                )
              })}
            </select>
          </div>
        </div>

        {/* Products Grid */}
        <div style={{ 
          flex: 1, 
          padding: '24px 32px',
          overflowY: 'auto'
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
              gap: '12px' 
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
                <button
                  onClick={() => addToOrder(product)}
                  style={{
                    background: '#7d8d86',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    width: '100%',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#3e3f29'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#7d8d86'
                  }}
                >
                  <i className="fa-solid fa-plus" style={{ fontSize: '10px' }}></i>
                  Add
                </button>
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
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
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
              <button
                onClick={() => addSideBusinessItemToOrder(item)}
                style={{
                  background: '#7d8d86',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  width: '100%',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#3e3f29'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#7d8d86'
                }}
              >
                <i className="fa-solid fa-plus" style={{ fontSize: '10px' }}></i>
                Add
              </button>
            </div>
            ))}
            </div>
          )}

        </div>
      </div>

      {/* Order Sidebar */}
      <div style={{ 
        width: '400px', 
        background: '#ffffff', 
        margin: '20px 20px 20px 0', 
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* User Info Header */}
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7d8d86, #3e3f29)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ 
                margin: '0', 
                fontSize: '16px', 
                fontWeight: '500', 
                color: '#1f2937' 
              }}>
                Hello, {user?.username}
              </p>
            </div>
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
            Order Detail #{Math.floor(Math.random() * 10000000)}
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
                  border: '3px solid #dc2626',
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
                        <button
                          onClick={() => updateQuantity(itemId, item.quantity - 1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
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
                        <span style={{ 
                          minWidth: '20px', 
                          textAlign: 'center', 
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#1f2937'
                        }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(itemId, item.quantity + 1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
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
                    
                    {/* Show weight controls for weighted items */}
                    {item.weight && (
                      <>
                        <button
                          onClick={() => updateWeight(itemId, item.weight! - 0.1)}
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '1px solid #d1d5db',
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
                            border: '1px solid #d1d5db',
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
                        background: '#ef4444',
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

        {/* Payment Details */}
        <div style={{ 
          padding: '24px',
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#1f2937',
            margin: '0 0 16px 0'
          }}>
            Payment Detail
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151',
              marginBottom: '8px'
            }}>
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Enter customer name"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #6b7280',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '8px' 
            }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Sub Total</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                €{order.subtotal.toFixed(2)}
              </span>
            </div>
            {order.discount > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: '8px' 
              }}>
                <span style={{ fontSize: '14px', color: '#6b7280' }}>Discount</span>
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                  €{order.discount.toFixed(2)}
                </span>
              </div>
            )}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              paddingTop: '8px',
              borderTop: '1px solid #d1d5db',
              marginBottom: '16px'
            }}>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>Total Payment</span>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#7d8d86' }}>
                €{order.total.toFixed(2)}
              </span>
            </div>
          </div>

          <button style={{
            background: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            width: '100%',
            marginBottom: '12px'
          }}>
            Add Voucher
          </button>

          {/* TTS Announce Order Button - Audio Player Style */}
          <div
            style={{
              background: '#2a2a2a',
              border: '1px solid #404040',
              borderRadius: '12px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: 'fit-content',
              maxWidth: '280px',
              marginBottom: '12px',
              opacity: order.items.length === 0 ? 0.5 : 1,
              cursor: order.items.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
            }}
            onClick={async () => {
              if (order.items.length === 0) return
              
              if (isTtsPlaying) {
                // Pause TTS
                console.log('Pausing TTS...')
                ttsService.pause()
                setIsTtsPlaying(false)
                return
              }
              
              console.log('Announce Order clicked!')
              console.log('Order items:', order.items)
              
              // Set playing state
              setIsTtsPlaying(true)
              
              // Temporarily enable TTS
              ttsService.updateSettings({ enabled: true })
              setTtsSettings(ttsService.getSettings())
              
              console.log('TTS Settings after enabling:', ttsService.getSettings())
              
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
                // Disable TTS immediately on error
                ttsService.updateSettings({ enabled: false })
                setTtsSettings(ttsService.getSettings())
                setIsTtsPlaying(false)
              }
            }}
            onMouseEnter={(e) => {
              if (order.items.length > 0) {
                e.currentTarget.style.background = '#333333'
                e.currentTarget.style.borderColor = '#555555'
              }
            }}
            onMouseLeave={(e) => {
              if (order.items.length > 0) {
                e.currentTarget.style.background = '#2a2a2a'
                e.currentTarget.style.borderColor = '#404040'
              }
            }}
          >
            {/* Simple Play/Pause Button */}
            <button
              onClick={async () => {
                if (order.items.length === 0) return
                
                if (isTtsPlaying) {
                  // Pause TTS
                  console.log('Pausing TTS...')
                  ttsService.stop()
                  setIsTtsPlaying(false)
                  return
                }
                
                console.log('Announce Order clicked!')
                console.log('Order items:', order.items)
                
                // Set playing state
                setIsTtsPlaying(true)
                
                // Temporarily enable TTS
                ttsService.updateSettings({ enabled: true })
                setTtsSettings(ttsService.getSettings())
                
                console.log('TTS Settings after enabling:', ttsService.getSettings())
                
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
                background: order.items.length === 0 ? '#666666' : '#4a5568',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: order.items.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                opacity: order.items.length === 0 ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (order.items.length > 0) {
                  (e.target as HTMLButtonElement).style.background = '#2d3748'
                }
              }}
              onMouseLeave={(e) => {
                if (order.items.length > 0) {
                  (e.target as HTMLButtonElement).style.background = '#4a5568'
                }
              }}
            >
              <i 
                className={isTtsPlaying ? "fa-solid fa-pause" : "fa-solid fa-play"} 
                style={{ fontSize: '12px' }}
              ></i>
              {isTtsPlaying ? 'Stop' : 'Play'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <RetroButton
              onClick={resetTransaction}
              disabled={order.items.length === 0}
              style={{ flex: 1 }}
            >
              <i className="fa-solid fa-rotate-left" style={{ marginRight: '8px' }}></i>
              Reset
            </RetroButton>
            
            <RetroButton
              onClick={() => setShowSalesSummary(true)}
              disabled={order.items.length === 0}
              style={{ flex: 2 }}
            >
              <i className="fa-solid fa-credit-card" style={{ marginRight: '8px' }}></i>
              Purchase
              {order.items.length > 0 && (
                <span style={{ 
                  fontSize: '10px', 
                  opacity: 0.8,
                  marginLeft: '2px'
                }}>
                  (Ctrl+Enter)
                </span>
              )}
            </RetroButton>
          </div>
        </div>
      </div>

      {/* Sales Summary Modal */}
      {showSalesSummary && (
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
            borderRadius: '16px',
            padding: '20px',
            width: '95%',
            maxWidth: '700px',
            maxHeight: '95vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
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
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0 0 12px 0'
              }}>
                Customer Information
              </h3>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name (optional)"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #6b7280',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  marginBottom: '12px'
                }}
              />
            </div>

            {/* Customer Phone */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number (optional)"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #6b7280',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  marginBottom: '16px'
                }}
              />
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
                      border: '1px solid #d1d5db',
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
                  <div style={{
                    marginTop: '12px',
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
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '60px',
                  fontFamily: 'inherit'
                }}
              />
              <p style={{ 
                fontSize: '12px', 
                color: '#6b7280', 
                margin: '8px 0 0 0' 
              }}>
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
            width: '95vw',
            height: '95vh',
            overflow: 'auto',
            position: 'relative'
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
            <div style={{ marginBottom: '20px' }}>
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
                  padding: '30px',
                  background: '#ffffff',
                  fontFamily: 'Courier New, monospace',
                  fontSize: '16px',
                  lineHeight: '1.6',
                  maxWidth: '600px',
                  margin: '0 auto'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowReceiptPreview(false)}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #d1d5db',
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
                  border: '1px solid #d1d5db',
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
                  border: '1px solid #d1d5db',
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
                  border: '1px solid #d1d5db',
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
                  border: 'none',
                  borderRadius: '8px',
                  background: (!quickServiceName.trim() || !quickServicePrice || !quickServiceBusiness) ? '#d1d5db' : 'linear-gradient(135deg, #10b981, #059669)',
                  color: (!quickServiceName.trim() || !quickServicePrice || !quickServiceBusiness) ? '#9ca3af' : '#ffffff',
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

    </div>
  )
}

export default Sales