import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { loadStripeTerminal } from '@stripe/terminal-js'
import {
  BadgeCheck,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Home,
  Loader2,
  Mail,
  Menu,
  Minus,
  Package,
  Plus,
  Receipt,
  Scan,
  Search,
  ShoppingBag,
  Trash2,
  Wallet,
  X,
  Briefcase,
  Printer,
  User,
  RefreshCw,
  DollarSign,
  FileText,
  BarChart3,
  Eye,
  CheckCircle
} from 'lucide-react'

import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useBranch } from '../contexts/BranchContext'
import { useBusinessId } from '../hooks/useBusinessId'
import { useProductsData } from '../hooks/data/useProductsData'
import { useOrder } from '../hooks/useOrder'
import MobileBottomNav from '../components/MobileBottomNav'
import { usePromotions } from '../hooks/usePromotions'
import { useBarcodeScanner, setModalOpen } from '../hooks/useBarcodeScanner'
import { usePartialPayment } from '../hooks/usePartialPayment'
import CustomerAutocomplete from '../components/CustomerAutocomplete'
import { supabase } from '../lib/supabaseClient'

import { formatCurrency } from '../utils/currency'
import { formatPhoneNumber } from '../utils/phone'
import { generateReceiptHTML, printReceipt } from '../utils/receiptUtils'
import type { OrderItem } from '../types/sales'
import type { Product, SideBusinessItem } from '../hooks/data/useProductsData'
import styles from './SalesMobile.module.css'


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


type ActiveModal =
  | 'cart'
  | 'weight'
  | 'customPrice'
  | 'payment'
  | 'receipt'
  | 'calculator'
  | null

const SalesMobile = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const { user } = useAuth()
  const { theme } = useTheme()
  const { businessId, businessLoading } = useBusinessId()
  const { selectedBranch, selectedBranchId } = useBranch()
  const { data: productsData, isLoading: productsLoading } = useProductsData()
  const { calculatePromotions, activePromotions } = usePromotions(businessId || null, selectedBranchId || null)
  const {
    order,
    addToOrder,
    addSideBusinessItemToOrder,
    addWeightedProductToOrder,
    updateQuantity,
    updateWeight,
    removeFromOrder,
    resetOrder,
    calculateOrderTotal,
    loadExistingTransaction
  } = useOrder()
  const partialPayment = usePartialPayment(order.total)
  useBarcodeScanner({
    onBarcodeScanned: barcode => {
      // TODO: Implement barcode scanning when barcode field is available
      console.log('Barcode scanned:', barcode)
    },
    debounceMs: 30,
    minLength: 8,
    maxLength: 20,
    context: 'sales-mobile'
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [isLoadingTransaction, setIsLoadingTransaction] = useState(false)
  const [showNav, setShowNav] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [pendingWeightedProduct, setPendingWeightedProduct] = useState<Product | null>(null)
  const [weightInput, setWeightInput] = useState('')
  const [weightUnit, setWeightUnit] = useState('kg')
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)
  const [pendingSideBusinessItem, setPendingSideBusinessItem] = useState<SideBusinessItem | null>(null)
  const [customPriceInput, setCustomPriceInput] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit' | 'tap'>('cash')
  const [cashAmount, setCashAmount] = useState('')
  const [allowPartialPayment, setAllowPartialPayment] = useState(false)
  const [receiptHtml, setReceiptHtml] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [receiptNotes, setReceiptNotes] = useState('')
  const [partialAmount, setPartialAmount] = useState('')
  const [partialNotes, setPartialNotes] = useState('')
  const [remainingAmount, setRemainingAmount] = useState(0)
  const [stripeStatus, setStripeStatus] = useState<string | null>(null)

  const terminalServerUrl = import.meta.env.VITE_TERMINAL_SERVER_URL || 'http://localhost:8787'
  const useSimulatedTerminal = (import.meta.env.VITE_STRIPE_TERMINAL_USE_SIMULATOR ?? 'true') !== 'false'
  const terminalRef = useRef<any>(null)
  const [terminalStatus, setTerminalStatus] = useState<'idle' | 'initializing' | 'discovering' | 'connecting' | 'connected' | 'error'>('idle')
  const [terminalMessage, setTerminalMessage] = useState<string | null>(null)
  const [terminalError, setTerminalError] = useState<string | null>(null)
  const [connectedReader, setConnectedReader] = useState<any>(null)
  const [lastTerminalPaymentIntentId, setLastTerminalPaymentIntentId] = useState<string | null>(null)
  const currencyCode = selectedBranch?.currency_code || 'eur'


  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const cashInputRef = useRef<HTMLInputElement | null>(null)

  const products = productsData?.products ?? []
  const sideBusinessItems = productsData?.sideBusinessItems ?? []
  const categories = useMemo(
    () => ['all', ...Array.from(new Set((productsData?.categories ?? []).filter(Boolean)))],
    [productsData]
  )

  useEffect(() => {
    calculateOrderTotal()
  }, [order.items])

  useEffect(() => {
    const anyModalOpen = activeModal !== null
    setModalOpen(anyModalOpen)
    return () => {
      if (anyModalOpen) {
        setModalOpen(false)
      }
    }
  }, [activeModal])

  useEffect(() => {
    setShowNav(false)
  }, [location.pathname])

  // Load transaction from URL parameter for editing
  useEffect(() => {
    const transactionParam = searchParams.get('transaction')
    if (!transactionParam || !businessId || businessLoading) return

    const fetchTransaction = async () => {
      setIsLoadingTransaction(true)
      try {
        const saleId = parseInt(transactionParam.replace('TXN-', ''))

        // Fetch transaction details
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

        // Set customer info if available
        if (transactionData.customers) {
          setCustomerName(transactionData.customers.name || '')
          // Phone is stored directly on the sales table as customer_phone if needed
          setCustomerPhone(transactionData.customer_phone || '')
        }

        // Fetch sale items
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

        // Map items to order format
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

        // Fetch side business items
        const { data: sideSalesData, error: sideSalesError } = await supabase
          .from('side_business_sales')
          .select(`
            *,
            side_business_items (
              name,
              price,
              description,
              image_url,
              side_business_id
            ),
            side_businesses (
              name
            )
          `)
          .eq('sale_id', saleId)

        if (!sideSalesError && sideSalesData) {
          const sideBusinessOrderItems: OrderItem[] = sideSalesData.map((item: any) => {
            const sideBusinessItem: SideBusinessItem = {
              id: item.item_id.toString(),
              name: item.side_business_items?.name || item.name || 'Unknown Item',
              price: item.total_amount / item.quantity,
              description: item.side_business_items?.description || item.description,
              image_url: item.side_business_items?.image_url,
              side_business_id: item.side_business_id,
              side_businesses: {
                name: item.side_businesses?.name || 'Unknown Business'
              }
            }

            return {
              product: sideBusinessItem as any,
              quantity: item.quantity,
              originalQuantity: item.quantity,
              isSideBusinessItem: true
            }
          })

          existingItems.push(...sideBusinessOrderItems)
        }

        // Load items into order using the hook
        if (loadExistingTransaction) {
          loadExistingTransaction(existingItems)
        }

        // Open cart to show loaded items
        setActiveModal('cart')

      } catch (error) {
        console.error('Error loading transaction:', error)
      } finally {
        setIsLoadingTransaction(false)
      }
    }

    fetchTransaction()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, businessId, businessLoading])

  const filteredProducts = useMemo(() => {
    let filtered = products

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => (product.category || '').toLowerCase() === selectedCategory.toLowerCase())
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        // TODO: Add barcode search when barcode field is available
        false
      )
    }

    return filtered
  }, [products, selectedCategory, searchTerm])

  const filteredSideBusinessItems = useMemo(() => {
    let filtered = sideBusinessItems

    if (selectedCategory !== 'all') {
      // TODO: Filter by side business type when available
      // filtered = filtered.filter(item => item.side_businesses?.business_type?.toLowerCase() === selectedCategory.toLowerCase())
    }

    if (searchTerm) {
      const query = searchTerm.toLowerCase()
      filtered = filtered.filter(item => item.name.toLowerCase().includes(query))
    }

    return filtered
  }, [sideBusinessItems, selectedCategory, searchTerm])

  const cartBadgeCount = useMemo(
    () => order.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
    [order.items]
  )

  const subtotal = useMemo(() => order.subtotal, [order.subtotal])
  const tax = useMemo(() => order.tax, [order.tax])
  const total = useMemo(() => order.total, [order.total])

  const changeDue = useMemo(() => {
    if (paymentMethod !== 'cash' || !cashAmount) return 0
    const cashValue = parseFloat(cashAmount)
    if (isNaN(cashValue)) return 0
    if (allowPartialPayment) {
      return cashValue - partialPayment.amountPaid
    }
    return cashValue - total
  }, [cashAmount, paymentMethod, total, allowPartialPayment, partialPayment.amountPaid])

  const paymentValid = useMemo(() => {
    if (paymentMethod !== 'cash') return true
    const cashValue = parseFloat(cashAmount)
    if (isNaN(cashValue) || cashValue <= 0) return false
    if (allowPartialPayment) {
      return cashValue >= partialPayment.amountPaid
    }
    return cashValue >= total
  }, [cashAmount, paymentMethod, total, allowPartialPayment, partialPayment.amountPaid])

  const handleAddProduct = (product: Product) => {
    if (product.is_weighted && product.price_per_unit && product.weight_unit) {
      setPendingWeightedProduct(product)
      setWeightInput('')
      setWeightUnit(product.weight_unit || 'kg')
      setPendingItemId(null)
      setActiveModal('weight')
    } else {
      addToOrder(product)
    }
  }

  const handleAddSideBusinessItem = (item: SideBusinessItem) => {
    if (item.price == null) {
      setPendingSideBusinessItem(item)
      setCustomPriceInput('')
      setCustomDescription(item.name)
      setActiveModal('customPrice')
      return
    }
    addSideBusinessItemToOrder(item)
  }

  const handleWeightSubmit = () => {
    if (!pendingWeightedProduct) return
    const weight = parseFloat(weightInput)
    if (Number.isNaN(weight) || weight <= 0) return

    if (pendingItemId) {
      updateWeight(pendingItemId, weight)
    } else {
      addWeightedProductToOrder(pendingWeightedProduct, weight)
    }

    setActiveModal(null)
    setPendingWeightedProduct(null)
    setPendingItemId(null)
    setWeightInput('')
  }

  const handleCustomPriceSubmit = () => {
    if (!pendingSideBusinessItem) return
    const price = parseFloat(customPriceInput)
    if (Number.isNaN(price) || price <= 0) return

    addSideBusinessItemToOrder(pendingSideBusinessItem, price)

    setActiveModal(null)
    setPendingSideBusinessItem(null)
    setCustomPriceInput('')
    setCustomDescription('')
  }

  const handleSelectSuggestion = (item: Product | SideBusinessItem) => {
    if ('product_id' in item) {
      handleAddProduct(item)
    } else {
      handleAddSideBusinessItem(item)
    }
    setSearchTerm('')
    setShowSearchSuggestions(false)
    searchInputRef.current?.blur()
  }

  const searchSuggestions = useMemo(() => {
    if (!searchTerm) return []
    const query = searchTerm.toLowerCase()
    const productMatches = products
      .filter(product => product.name.toLowerCase().includes(query))
      .slice(0, 5)
    const sideBusinessMatches = sideBusinessItems
      .filter(item => item.name.toLowerCase().includes(query))
      .slice(0, 5)
    return [...productMatches, ...sideBusinessMatches].slice(0, 5)
  }, [searchTerm, products, sideBusinessItems])

  const handleOpenCart = () => setActiveModal('cart')
  const handleCloseModal = () => {
    setActiveModal(null)
    setPendingWeightedProduct(null)
    setPendingSideBusinessItem(null)
    setPendingItemId(null)
  }

  const handleClearCart = () => {
    resetOrder()
    setCustomerName('')
    setCustomerPhone('')
    setSelectedCustomer(null)
    setAllowPartialPayment(false)
    partialPayment.reset()
  }

  const handleCalculateTotalsWithPromotions = () => {
    if (!promotionsEnabled) return
    calculatePromotions(order.items, order.subtotal)
  }

  const [promotionsEnabled] = useState(false)

  useEffect(() => {
    handleCalculateTotalsWithPromotions()
  }, [promotionsEnabled, activePromotions])

  const quickAmounts = [5, 10, 20, 50, 100]

  const handleQuickAmount = (amount: number) => {
    setCashAmount(amount.toFixed(2))
  }

  const handleExactAmount = () => {
    if (allowPartialPayment) {
      setCashAmount(partialPayment.amountPaid.toFixed(2))
      return
    }
    setCashAmount(total.toFixed(2))
  }

  const openPaymentModal = () => {
    if (!order.items.length) return
    calculateOrderTotal()
    setActiveModal('payment')
    if (paymentMethod === 'cash') {
      setTimeout(() => cashInputRef.current?.focus(), 50)
    }
  }

  const fetchConnectionToken = useCallback(async () => {
    const response = await fetch(`${terminalServerUrl}/terminal/connection_token`, {
      method: 'POST',
    })
    if (!response.ok) {
      throw new Error('Failed to fetch connection token')
    }
    const data = await response.json()
    if (!data?.secret) {
      throw new Error('Connection token response invalid')
    }
    return data.secret as string
  }, [terminalServerUrl])

  const initializeTerminal = useCallback(async () => {
    if (terminalRef.current) {
      return terminalRef.current
    }

    setTerminalStatus('initializing')
    setTerminalMessage('Preparing tap to pay terminal...')
    setTerminalError(null)

    try {
      const terminal = await loadStripeTerminal({
        onFetchConnectionToken: fetchConnectionToken,
        onUnexpectedReaderDisconnect: () => {
          setTerminalStatus('idle')
          setConnectedReader(null)
          setTerminalMessage('Reader disconnected. Please reconnect before collecting payment.')
        },
      })

      if (!terminal) {
        throw new Error('Stripe Terminal failed to load')
      }

      terminalRef.current = terminal
      setTerminalStatus('idle')
      setTerminalMessage('Terminal ready. Discover a reader to continue.')
      return terminal
    } catch (error: any) {
      console.error('Failed to initialize Stripe Terminal:', error)
      setTerminalStatus('error')
      setTerminalError(error?.message ?? 'Failed to initialize Stripe Terminal.')
      setTerminalMessage(null)
      return null
    }
  }, [fetchConnectionToken])

  const discoverAndConnectReader = useCallback(async (forceReconnect = false) => {
    const terminal = await initializeTerminal()
    if (!terminal) {
      return null
    }

    if (connectedReader && !forceReconnect) {
      setTerminalStatus('connected')
      setTerminalMessage(`Connected to ${connectedReader.label || connectedReader.deviceType}. Ready to collect payment.`)
      setTerminalError(null)
      return connectedReader
    }

    if (connectedReader && forceReconnect && typeof terminal.disconnectReader === 'function') {
      try {
        await terminal.disconnectReader()
      } catch (disconnectError) {
        console.warn('Failed to disconnect reader before reconnecting:', disconnectError)
      }
      setConnectedReader(null)
    }

    setTerminalStatus('discovering')
    setTerminalMessage('Searching for available readers...')
    setTerminalError(null)

    try {
      const discovery = await terminal.discoverReaders({
        simulated: useSimulatedTerminal,
      })

      if (discovery.error) {
        throw discovery.error
      }

      if (!discovery.discoveredReaders?.length) {
        throw new Error('No readers found. Ensure your reader is powered on and assigned to this location.')
      }

      const reader = discovery.discoveredReaders[0]
      setTerminalStatus('connecting')
      setTerminalMessage(`Connecting to ${reader.label || reader.deviceType}...`)

      const connectResult = await terminal.connectReader(reader)
      if (connectResult.error) {
        throw connectResult.error
      }

      setConnectedReader(connectResult.reader)
      setTerminalStatus('connected')
      setTerminalMessage(`Connected to ${connectResult.reader.label || connectResult.reader.deviceType}. Ready to collect payment.`)
      return connectResult.reader
    } catch (error: any) {
      console.error('Failed to connect reader:', error)
      setTerminalStatus('error')
      setTerminalError(error?.message ?? 'Failed to connect to reader.')
      setTerminalMessage(null)
      return null
    }
  }, [initializeTerminal, useSimulatedTerminal])

  const cancelTerminalPaymentIntent = useCallback(async (intentId: string) => {
    try {
      await fetch(`${terminalServerUrl}/terminal/payment_intents/${intentId}/cancel`, {
        method: 'POST',
      })
    } catch (error) {
      console.error('Failed to cancel payment intent', error)
    }
  }, [terminalServerUrl])

  useEffect(() => {
    if (paymentMethod === 'tap') {
      void discoverAndConnectReader()
    }
  }, [paymentMethod, discoverAndConnectReader])

  useEffect(() => {
    if (paymentMethod === 'tap' && allowPartialPayment) {
      setAllowPartialPayment(false)
      setPartialAmount('')
      setRemainingAmount(0)
      partialPayment.reset()
      setStripeStatus('Partial payments are not available with tap to pay.')
    }
  }, [paymentMethod, allowPartialPayment, partialPayment])

  const handlePaymentMethod = (method: 'cash' | 'card' | 'credit' | 'tap') => {
    setPaymentMethod(method)
    if (method === 'card') {
      setStripeStatus('Stripe is ready. Tap "Process Sale" to charge the card.')
    } else if (method !== 'tap') {
      setStripeStatus(null)
    }
    if (method === 'tap') {
      setStripeStatus('Connect a reader to start tap to pay.')
      setTerminalError(null)
      if (connectedReader) {
        setTerminalMessage(`Connected to ${connectedReader.label || connectedReader.deviceType}.`)
      } else {
        setTerminalMessage('Preparing tap reader...')
      }
      void discoverAndConnectReader()
    }
  }

  const handleCardPayment = async () => {
    if (!order.items.length || !businessId || businessLoading) {
      return
    }

    const totalAmount = allowPartialPayment ? (parseFloat(partialAmount) || 0) : total
    if (totalAmount <= 0) {
      alert('Card payments require a positive amount to charge.')
      return
    }

    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) {
      const shouldProceed = window.confirm(
        'Stripe is not configured for this environment. Record this sale as a card payment without charging the customer?'
      )
      if (shouldProceed) {
        setPaymentMethod('card')
        await completeSale()
      }
      return
    }

    setIsProcessing(true)
    setStripeStatus('Connecting to Stripe...')

    try {
      const stripe = await loadStripe(publishableKey)
      if (!stripe) {
        throw new Error('Stripe failed to load')
      }

      const paymentRequest = stripe.paymentRequest({
        country: 'IE',
        currency: 'eur',
        total: {
          label: 'Total',
          amount: Math.round(totalAmount * 100)
        }
      })

      const canMakePayment = await paymentRequest.canMakePayment()

      if (canMakePayment) {
        setStripeStatus('Waiting for Apple Pay / Google Pay...')

        paymentRequest.on('paymentmethod', async (event) => {
          try {
            setStripeStatus('Confirming payment...')

            const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-intent`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                amount: totalAmount,
                currency: 'eur',
                orderId: `order_${Date.now()}`,
                businessId,
                branchId: selectedBranchId
              })
            })

            if (!response.ok) {
              throw new Error('Failed to create payment intent')
            }

            const { clientSecret } = await response.json()
            const { error } = await stripe.confirmCardPayment(clientSecret, {
              payment_method: event.paymentMethod.id
            })

            if (error) {
              event.complete('fail')
              setStripeStatus(error.message || 'Payment failed.')
              setIsProcessing(false)
              alert(`Payment failed: ${error.message}`)
            } else {
              event.complete('success')
              setPaymentMethod('card')
              setStripeStatus('Payment confirmed. Finalizing sale...')
              await completeSale()
              setStripeStatus('Sale completed successfully.')
            }
          } catch (err) {
            console.error('Payment processing error:', err)
            event.complete('fail')
            setStripeStatus('Payment processing failed.')
            setIsProcessing(false)
            alert('Payment processing failed. Please try again.')
          }
        })

        paymentRequest.on('cancel', () => {
          setStripeStatus('Payment cancelled.')
          setIsProcessing(false)
        })

        paymentRequest.show()
      } else {
        setStripeStatus('Apple Pay / Google Pay is not available on this device.')
        const shouldRecord = window.confirm(
          'This device cannot trigger Stripe contactless payments. Record the sale as a manual card payment instead?'
        )
        if (shouldRecord) {
          setPaymentMethod('card')
          setStripeStatus('Recording manual card payment...')
          await completeSale()
          setStripeStatus('Manual card payment recorded.')
        } else {
          setIsProcessing(false)
        }
      }
    } catch (error) {
      console.error('Card payment error:', error)
      setStripeStatus('Failed to initialize Stripe.')
      setIsProcessing(false)
      alert('Failed to initialize card payment. Please try again.')
    }
  }

  const completeSale = async (options?: { terminalPaymentIntentId?: string }) => {
    if (!order.items.length || !businessId || businessLoading) return
    if (paymentMethod === 'cash' && !paymentValid) return

    if (businessId == null) {
      alert('Please select a business before processing a sale.')
      return
    }

    setIsProcessing(true)

    try {
      let customerId: number | null = null

      // Handle customer if name is provided
      if (customerName.trim()) {
        if (selectedCustomer) {
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
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert([{
                name: customerName.trim(),
                phone_number: customerPhone.trim() || '000-000-0000',
                email: null,
                business_id: businessId,
                branch_id: selectedBranchId
              }])
              .select()
              .single()

            if (customerError) {
              console.error('Error creating customer:', customerError)
              customerId = null
            } else {
              customerId = newCustomer.customer_id
            }
          }
        }
      }

      // Prepare notes with partial payment information
      let notesContent = ''
      if (options?.terminalPaymentIntentId) {
        notesContent = `TERMINAL PAYMENT\nStripe PaymentIntent: ${options.terminalPaymentIntentId}`
      }
      if (allowPartialPayment) {
        const partialDetails = `PARTIAL PAYMENT
Amount Paid Today: €${(parseFloat(partialAmount) || 0).toFixed(2)}
Remaining Balance: €${remainingAmount.toFixed(2)}`
        notesContent = notesContent
          ? `${notesContent}\n\n${partialDetails}`
          : partialDetails
        if (partialNotes) {
          notesContent += `\n\nPartial Payment Notes: ${partialNotes}`
        }
      }
      if (receiptNotes) {
        notesContent += (notesContent ? '\n\n' : '') + receiptNotes
      }

      // Create new sale record
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
        partial_notes: allowPartialPayment ? partialNotes : null,
        notes: notesContent || null,
        business_id: businessId,
        branch_id: selectedBranchId
      }

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([insertData])
        .select('*')
        .single()

      if (saleError) throw saleError

      // Insert sale items
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
          }
        }
      }

      // Handle side business items
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

      // Update product stock quantities
      for (const item of order.items.filter(item => item.product)) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ 
            stock_quantity: item.product!.stock_quantity - item.quantity,
            last_updated: getLocalDateTime()
          })
          .eq('product_id', item.product!.product_id)
          .eq('business_id', businessId)

        if (stockError) throw stockError

        // Create inventory movement record
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert([{
            product_id: item.product!.product_id,
            quantity_change: -item.quantity,
            movement_type: 'Sale',
            reference_id: saleData.sale_id,
            business_id: businessId
          }])

        if (movementError) throw movementError
      }

      // Update side business item stock quantities
      for (const item of order.items.filter(item => item.sideBusinessItem)) {
        if (!item.sideBusinessItem || item.sideBusinessItem.stock_quantity === null) continue

        const { error: stockError } = await supabase
          .from('side_business_items')
          .update({ 
            stock_quantity: item.sideBusinessItem.stock_quantity - item.quantity
          })
          .eq('item_id', item.sideBusinessItem.item_id)
          .eq('parent_shop_id', businessId)

        if (stockError) throw stockError
      }

      // Award loyalty points if customer exists
      if (customerId && order.total > 0) {
        try {
          const pointsToAward = Math.floor(order.total)
          
          const { data: currentCustomer } = await supabase
            .from('customers')
            .select('loyalty_points')
            .eq('customer_id', customerId)
            .single()

          if (currentCustomer) {
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
        }
      }

      // Generate receipt HTML for viewing later
    const paymentInfo = {
      method: paymentMethod,
      amountEntered: paymentMethod === 'cash' ? cashAmount : total.toFixed(2),
      change: paymentMethod === 'cash' ? Math.max(changeDue, 0) : 0,
      customerName,
        receiptNotes,
      allowPartialPayment,
        partialAmount: allowPartialPayment ? partialAmount : undefined,
        remainingAmount: allowPartialPayment ? remainingAmount.toString() : undefined
      }

      const partialPaymentInfo = allowPartialPayment ? {
        amountPaid: parseFloat(partialAmount) || 0,
        amountRemaining: remainingAmount,
        dueDate: null,
        notes: partialNotes
      } : undefined

      const businessInfo = {
        business_name: selectedBranch?.branch_name || 'Business',
        name: selectedBranch?.branch_name || user?.email || 'Business'
      }

      const receipt = generateReceiptHTML(order, paymentInfo, user, businessInfo, partialPaymentInfo)
      setReceiptHtml(receipt)

      // Clear cart and reset state
      handleClearCart()
      setCustomerName('')
      setCustomerPhone('')
      setSelectedCustomer(null)
      setPaymentMethod('cash')
      setCashAmount('')
      setReceiptNotes('')
      setPartialAmount('')
      setPartialNotes('')
      setRemainingAmount(0)
      setAllowPartialPayment(false)
      setStripeStatus(null)
      setActiveModal(null)
      setIsProcessing(false)

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
      successMsg.textContent = allowPartialPayment ? 
        `Partial payment processed! €${(parseFloat(partialAmount) || 0).toFixed(2)} paid, €${remainingAmount.toFixed(2)} remaining.` :
        'Sale processed successfully!'
      document.body.appendChild(successMsg)
      
      setTimeout(() => {
        if (document.body.contains(successMsg)) {
          document.body.removeChild(successMsg)
        }
      }, 3000)

    } catch (error) {
      console.error('Error processing sale:', error)
      alert('Error processing sale. Please try again.')
      setIsProcessing(false)
    }
  }

  const handleTapPayment = useCallback(async () => {
    if (!order.items.length || !businessId || businessLoading) {
      setStripeStatus('Add products to the cart before collecting tap payments.')
      return
    }

    const totalAmount = order.total
    if (totalAmount <= 0) {
      setStripeStatus('Cannot process a zero amount tap payment.')
      return
    }

    setIsProcessing(true)
    setStripeStatus('Preparing tap to pay...')
    setTerminalError(null)

    const terminal = (await initializeTerminal()) ?? terminalRef.current
    if (!terminal) {
      setIsProcessing(false)
      setStripeStatus('Unable to initialize tap reader.')
      return
    }

    let reader = connectedReader
    if (!reader) {
      reader = await discoverAndConnectReader()
      if (!reader) {
        setIsProcessing(false)
        setStripeStatus('Unable to connect to tap reader.')
        return
      }
    }

    const amountInMinor = Math.round(totalAmount * 100)
    const currency = currencyCode
    const description = `POS Sale (${order.items.length} item${order.items.length === 1 ? '' : 's'})`

    let paymentIntentId: string | null = null

    try {
      setStripeStatus('Creating payment intent...')
      const intentResponse = await fetch(`${terminalServerUrl}/terminal/payment_intents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInMinor,
          currency,
          description,
        }),
      })

      if (!intentResponse.ok) {
        const errorBody = await intentResponse.text()
        throw new Error(errorBody || 'Failed to create payment intent')
      }

      const intentPayload = await intentResponse.json()
      paymentIntentId = intentPayload?.id ?? null
      const clientSecret = intentPayload?.client_secret
      if (!clientSecret) {
        throw new Error('PaymentIntent did not include a client secret')
      }

      setStripeStatus('Ask the customer to tap or insert their card...')
      const collectResult = await terminal.collectPaymentMethod(clientSecret)
      const collectError = (collectResult as any)?.error
      if (collectError) {
        if (paymentIntentId) {
          await cancelTerminalPaymentIntent(paymentIntentId)
        }
        setStripeStatus(collectError.message ?? 'Payment cancelled.')
        return
      }
      const collectedIntent = (collectResult as any)?.paymentIntent ?? collectResult
      if (!collectedIntent) {
        if (paymentIntentId) {
          await cancelTerminalPaymentIntent(paymentIntentId)
        }
        setStripeStatus('Failed to collect payment method. Please try again.')
        return
      }

      const processResult = await terminal.processPayment(collectedIntent)
      const processError = (processResult as any)?.error
      if (processError) {
        const failedIntent = (processResult as any)?.paymentIntent ?? collectedIntent
        if (failedIntent?.id) {
          await cancelTerminalPaymentIntent(failedIntent.id)
        }
        setStripeStatus(processError.message ?? 'Payment failed. Please try again.')
        return
      }

      const processedIntent = (processResult as any)?.paymentIntent ?? processResult
      if (!processedIntent?.id) {
        setStripeStatus('Payment completed but intent details were unavailable.')
      } else {
        setLastTerminalPaymentIntentId(processedIntent.id)
        setStripeStatus('Payment captured. Finalizing sale...')
        await completeSale({ terminalPaymentIntentId: processedIntent.id })
      }
      setStripeStatus('Tap payment completed.')
    } catch (error: any) {
      console.error('Tap payment error:', error)
      if (paymentIntentId) {
        await cancelTerminalPaymentIntent(paymentIntentId)
      }
      setStripeStatus(error?.message ?? 'Failed to complete tap payment.')
    } finally {
      setIsProcessing(false)
    }
  }, [
    order.items,
    order.total,
    businessId,
    businessLoading,
    connectedReader,
    initializeTerminal,
    discoverAndConnectReader,
    terminalServerUrl,
    currencyCode,
    cancelTerminalPaymentIntent,
    completeSale,
  ])

  const handleProcessSale = async () => {
    if (isProcessing) {
      return
    }

    if (paymentMethod === 'card') {
      await handleCardPayment()
    } else if (paymentMethod === 'tap') {
      await handleTapPayment()
    } else {
      await completeSale()
    }
  }


  const renderHeader = () => (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        <div className={styles.headerLeft}>
          <button
            className={styles.menuButton}
            onClick={() => setShowNav(true)}
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <h1 className={styles.title}>Sales</h1>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.cartButton}
            onClick={handleOpenCart}
          >
            <ShoppingBag className="w-6 h-6 text-gray-600" />
            {cartBadgeCount > 0 && (
              <span className={styles.cartBadge}>
                {cartBadgeCount}
              </span>
            )}
          </button>
          <button className={styles.scanButton}>
            <Scan className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </div>
    </header>
  )

  const renderSearchBar = () => (
    <div className={styles.searchSection}>
      <div className={styles.searchContainer}>
        <Search className={styles.searchIcon} />
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={event => {
            setSearchTerm(event.target.value)
            setShowSearchSuggestions(event.target.value.length > 0)
          }}
          placeholder="Search products..."
          className={styles.searchInput}
        />
        {showSearchSuggestions && searchSuggestions.length > 0 && (
          <div className={styles.searchSuggestions}>
            <div className={styles.suggestionsContent}>
              {searchSuggestions.map(item => {
                const isProduct = 'product_id' in item
                return (
                  <button
                    key={isProduct ? item.product_id : `sb-${item.item_id}`}
                    type="button"
                    className={styles.suggestionItem}
                    onClick={() => handleSelectSuggestion(item)}
                  >
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">
                      {isProduct ? formatCurrency(item.price) : 'Custom price / service'}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderCategoryTabs = () => (
    <div className={styles.categorySection}>
      <div className={styles.categoryContainer}>
        {categories.map(category => {
          const isActive = selectedCategory === category
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`${styles.categoryButton} ${isActive ? styles.active : ''}`}
            >
              {category === 'all' ? 'All' : category}
            </button>
          )
        })}
      </div>
    </div>
  )

  const renderProductCard = (product: Product) => {
    const currentQuantity = order.items
      .filter(item => item.product?.product_id === product.product_id && !item.weight)
      .reduce((sum, item) => sum + item.quantity, 0)

    return (
      <button
        key={product.product_id}
        onClick={() => handleAddProduct(product)}
        className={styles.productCard}
      >
        <div className={styles.productImage}>
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className={styles.productImage}
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = 'none'
                e.currentTarget.nextElementSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div 
            className={styles.productIcon}
            style={{ display: product.image_url ? 'none' : 'flex' }}
          >
            <ShoppingBag className={styles.productIcon} />
          </div>
        </div>
        <div className={styles.productHeader}>
          <h3 className={styles.productName}>{product.name}</h3>
          {currentQuantity > 0 && (
            <span className={styles.productQuantity}>
              {currentQuantity}
            </span>
          )}
        </div>
        <p className={styles.productPrice}>{formatCurrency(product.price)}</p>
        <p className={styles.productStock}>Stock: {product.stock_quantity}</p>
      </button>
    )
  }

  const renderSideBusinessCard = (item: SideBusinessItem) => (
    <button
      key={`sb-${item.item_id}`}
      onClick={() => handleAddSideBusinessItem(item)}
      className={styles.sideBusinessCard}
    >
      <div className={styles.sideBusinessImage}>
        <Briefcase className={styles.sideBusinessIcon} />
      </div>
      <div className={styles.productHeader}>
        <h3 className={styles.sideBusinessName}>{item.name}</h3>
      </div>
      <p className={styles.sideBusinessPrice}>
        {item.price != null ? formatCurrency(item.price) : 'Custom price'}
      </p>
    </button>
  )

  const renderProductsGrid = () => (
    <div className={styles.productsSection}>
      <div className={styles.productsGrid}>
        {filteredProducts.map(renderProductCard)}
        {filteredSideBusinessItems.map(renderSideBusinessCard)}
      </div>
    </div>
  )


  const renderCartOverlay = () => {
    if (activeModal !== 'cart') return null

    return (
      <div className={`${styles.overlay} ${styles.open}`} onClick={handleCloseModal}>
        <div
          className={`${styles.slidePanel} ${styles.open}`}
          onClick={event => event.stopPropagation()}
        >
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Order Summary</h2>
            <button className={styles.closeButton} onClick={handleCloseModal}>
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className={styles.customerSection}>
            <CustomerAutocomplete
              value={customerName}
              onChange={value => setCustomerName(value)}
              onSelectCustomer={customer => {
                setSelectedCustomer(customer)
                setCustomerName(customer?.name || '')
                setCustomerPhone(formatPhoneNumber(customer?.phone_number || ''))
              }}
              placeholder="Search customer..."
            />
            {selectedCustomer && (
              <div className={styles.customerInfo}>
                <p className={styles.customerName}>{selectedCustomer.name}</p>
                <p className={styles.customerPhone}>{formatPhoneNumber(selectedCustomer.phone_number)}</p>
              </div>
            )}
          </div>

          <div className={styles.panelBody}>
            {order.items.length === 0 ? (
              <div className={styles.emptyCart}>
                <ShoppingBag className={styles.emptyCartIcon} />
                <p className={styles.emptyCartTitle}>Cart is empty</p>
                <p className={styles.emptyCartText}>Add products to start building an order.</p>
              </div>
            ) : (
              <div className={styles.cartItems}>
                {order.items.map(item => renderCartItem(item))}
              </div>
            )}
          </div>

          <div className={styles.panelFooter}>
            <div className={styles.orderSummary}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Subtotal</span>
                <span className={styles.summaryValue}>{formatCurrency(subtotal)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Tax</span>
                <span className={styles.summaryValue}>{formatCurrency(tax)}</span>
              </div>
              <div className={styles.summaryTotal}>
                <span>Total</span>
                <span className={styles.summaryTotalValue}>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className={styles.actionButtons}>
              <button 
                onClick={openPaymentModal} 
                disabled={!order.items.length}
                className={styles.primaryButton}
              >
                Proceed to Payment
              </button>
              <div className={styles.secondaryButtons}>
                <button onClick={handleClearCart} className={styles.secondaryButton}>
                  Clear Cart
                </button>
                <button onClick={() => {}} className={styles.secondaryButton}>
                  Save Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderCartItem = (item: OrderItem) => {
    const itemId = item.product?.product_id || `sb-${item.sideBusinessItem?.item_id}`
    const itemName = item.product?.name || item.sideBusinessItem?.name || 'Unknown Item'
    const price = item.product?.price || item.customPrice || item.sideBusinessItem?.price || 0
    const displayPrice = item.weight && item.calculatedPrice ? item.calculatedPrice : price * item.quantity

    return (
      <div key={itemId} className={styles.cartItem}>
        <div className={styles.cartItemHeader}>
          <div>
            <h4 className={styles.cartItemName}>{itemName}</h4>
            <p className={styles.cartItemSku}>
              {item.product?.sku || item.sideBusinessItem?.item_id}
            </p>
          </div>
          <button
            className={styles.removeButton}
            onClick={() => removeFromOrder(itemId)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className={styles.cartItemControls}>
          <div className={styles.quantityControls}>
            <button
              className={styles.quantityButton}
              onClick={() => updateQuantity(itemId, item.quantity - 1)}
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </button>
            <div className={styles.quantityDisplay}>{item.quantity}</div>
            <button
              className={styles.quantityButton}
              onClick={() => updateQuantity(itemId, item.quantity + 1)}
            >
              <Plus className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <div className={styles.cartItemPrice}>
            <p className={styles.cartItemAmount}>{formatCurrency(displayPrice)}</p>
            {item.weight && (
              <button
                className={styles.editWeightButton}
                onClick={() => {
                  if (!item.product) return
                  setPendingWeightedProduct(item.product)
                  setWeightInput(item.weight?.toString() || '')
                  setWeightUnit(item.product.weight_unit || 'kg')
                  setPendingItemId(item.product.product_id || null)
                  setActiveModal('weight')
                }}
              >
                Edit weight
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderWeightModal = () => {
    if (activeModal !== 'weight' || !pendingWeightedProduct) return null
    const unit = pendingWeightedProduct.weight_unit || weightUnit
    const pricePerUnit = pendingWeightedProduct.price_per_unit || pendingWeightedProduct.price
    const weightValue = parseFloat(weightInput) || 0
    const totalPrice = weightValue * pricePerUnit

    return (
      <div className={`${styles.overlay} ${styles.open}`} onClick={handleCloseModal}>
        <div className={`${styles.modal} ${styles.open}`}
          onClick={event => event.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Enter Weight</h2>
            <button className={styles.closeButton} onClick={handleCloseModal}>
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.modalSection}>
              <div className="text-center">
                <h3 className={styles.sectionTitle}>{pendingWeightedProduct.name}</h3>
                <p className="text-blue-600 font-bold text-xl">
                  {formatCurrency(pricePerUnit)} / {unit}
                </p>
              </div>
            </div>

            <div className={styles.modalSection}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Weight</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={weightInput}
                    onChange={event => setWeightInput(event.target.value)}
                    className={`${styles.inputField} ${styles.inputFieldLarge}`}
                    placeholder="0.00"
                  />
                  <select
                    value={weightUnit}
                    onChange={event => setWeightUnit(event.target.value)}
                    className={styles.inputField}
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="lb">lb</option>
                    <option value="oz">oz</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.modalSection}>
              <div className={styles.changeDisplay}>
                <span className={styles.changeLabel}>Total Price</span>
                <span className={styles.changeAmount}>{formatCurrency(totalPrice || 0)}</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.modalActionButton}
                onClick={handleCloseModal}
              >
                Cancel
              </button>
              <RetroButton onClick={handleWeightSubmit}>
                Add to Cart
              </RetroButton>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderCustomPriceModal = () => {
    if (activeModal !== 'customPrice' || !pendingSideBusinessItem) return null

    return (
      <div className="overlay open fixed inset-0 bg-black/60 z-50" onClick={handleCloseModal}>
        <div className="modal open fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl" onClick={event => event.stopPropagation()}>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold">Set Custom Price</h2>
            <button className="p-2 rounded-lg hover:bg-gray-100" onClick={handleCloseModal}>
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{pendingSideBusinessItem.name}</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Description</label>
              <input
                type="text"
                value={customDescription}
                onChange={event => setCustomDescription(event.target.value)}
                className="w-full bg-gray-50 rounded-lg px-4 py-3"
                placeholder="Enter service description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={customPriceInput}
                  onChange={event => setCustomPriceInput(event.target.value)}
                  className="w-full bg-gray-50 rounded-lg pl-8 pr-4 py-3 text-center text-lg font-bold"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <button className="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded-lg" onClick={handleCloseModal}>
                Cancel
              </button>
              <RetroButton onClick={handleCustomPriceSubmit}>
                Add to Cart
              </RetroButton>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderPaymentModal = () => {
    if (activeModal !== 'payment') return null

    const amountDue = allowPartialPayment ? (parseFloat(partialAmount) || 0) : total
    const changeDue = paymentMethod === 'cash' ? (parseFloat(cashAmount) || 0) - amountDue : 0
    const isPaymentValid = paymentMethod !== 'cash' || (parseFloat(cashAmount) || 0) >= amountDue

    const handlePartialAmountChange = (value: string) => {
      setPartialAmount(value)
      const partial = parseFloat(value) || 0
      setRemainingAmount(Math.max(0, total - partial))
    }

    const handleSetExactAmount = () => {
      setCashAmount(amountDue.toFixed(2))
    }

    return (
      <div className={styles.summaryModalOverlay} onClick={handleCloseModal}>
        <div className={styles.summaryModalContainer} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className={styles.summaryHeader}>
            <div className={styles.summaryHeaderTitle}>
              <Receipt size={24} />
              Sales Summary
            </div>
            <button className={styles.summaryCloseBtn} onClick={handleCloseModal}>
              ×
            </button>
          </div>

          {/* Content */}
          <div className={styles.summaryContent}>
            {/* Customer Information */}
            <div className={styles.summarySection}>
              <div className={styles.summarySectionTitle}>
                <User size={18} />
                Customer Information
              </div>
              <div className={styles.summaryInputGroup}>
                <label className={styles.summaryInputLabel}>Customer Name</label>
                <CustomerAutocomplete
                  value={customerName}
                  onChange={setCustomerName}
                  onSelectCustomer={(customer) => {
                    if (customer) {
                      setCustomerPhone(customer.phone_number)
                    }
                  }}
                  placeholder="Search or enter customer name..."
                  style={{ width: '100%' }}
                />
              </div>
              <div className={styles.summaryInputGroup}>
                <label className={styles.summaryInputLabel}>Phone Number (Optional)</label>
                <input
                  type="tel"
                  className={styles.summaryInputField}
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number..."
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className={styles.summarySection}>
              <div className={styles.summarySectionTitle}>
                <CreditCard size={18} />
                Payment Method
              </div>
              <div className={styles.summaryPaymentMethods}>
                <button
                  className={`${styles.summaryPaymentBtn} ${paymentMethod === 'cash' ? 'active' : ''}`}
                  onClick={() => handlePaymentMethod('cash')}
                >
                  <Wallet size={20} />
                  Cash
                </button>
                <button
                  className={`${styles.summaryPaymentBtn} ${paymentMethod === 'card' ? 'active' : ''}`}
                  onClick={handleCardPayment}
                >
                  <CreditCard size={20} />
                  Card
                </button>
                <button
                  className={`${styles.summaryPaymentBtn} ${paymentMethod === 'tap' ? 'active' : ''}`}
                  onClick={() => handlePaymentMethod('tap')}
                >
                  <BadgeCheck size={20} />
                  Tap to Pay
                </button>
                <button
                  className={`${styles.summaryPaymentBtn} ${paymentMethod === 'credit' ? 'active' : ''}`}
                  onClick={() => handlePaymentMethod('credit')}
                >
                  <CircleDollarSign size={20} />
                  Credit
                </button>
              </div>
            </div>

            {paymentMethod === 'tap' && (
              <div className={styles.summarySection}>
                <div className={styles.summarySectionTitle}>
                  <BadgeCheck size={18} />
                  Tap to Pay Status
                </div>
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '13px',
                    color: '#475569',
                  }}
                >
                  <span>
                    <strong>Reader:</strong>{' '}
                    {connectedReader ? connectedReader.label || connectedReader.deviceType : 'Not connected'}
                  </span>
                  <span>
                    <strong>Status:</strong>{' '}
                    {terminalStatus === 'connected'
                      ? 'Connected'
                      : terminalStatus === 'connecting'
                        ? 'Connecting...'
                        : terminalStatus === 'discovering'
                          ? 'Searching for readers...'
                          : terminalStatus === 'initializing'
                            ? 'Initializing...'
                            : terminalStatus === 'error'
                              ? 'Error'
                              : 'Idle'}
                  </span>
                  {terminalMessage && <span>{terminalMessage}</span>}
                  {terminalError && <span style={{ color: '#dc2626' }}>{terminalError}</span>}
                  {stripeStatus && <span style={{ color: '#2563eb' }}>{stripeStatus}</span>}
                </div>
                <div
                  style={{
                    marginTop: '12px',
                    display: 'flex',
                    gap: '10px',
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    className={styles.summaryActionBtn}
                    onClick={() => discoverAndConnectReader(true)}
                    disabled={terminalStatus === 'connecting' || terminalStatus === 'discovering' || isProcessing}
                  >
                    {terminalStatus === 'connected' ? 'Reconnect Reader' : 'Find Reader'}
                  </button>
                </div>
              </div>
            )}

            {/* Partial Payment */}
            <div className={styles.summarySection}>
              <div className={styles.summarySectionTitle}>
                <RefreshCw size={18} />
                Partial Payment
              </div>
              <div className={styles.summaryToggleHeader}>
                <span>Enable Partial Payment</span>
                <div
                  className={`${styles.summaryToggleSwitch} ${allowPartialPayment ? 'active' : ''}`}
                  onClick={() => {
                    setAllowPartialPayment(!allowPartialPayment)
                    if (allowPartialPayment) {
                      partialPayment.reset()
                      setPartialAmount('')
                      setRemainingAmount(0)
                    }
                  }}
                >
                  <div className={styles.summaryToggleSlider}></div>
                </div>
              </div>

              {allowPartialPayment && (
                <div className={styles.summaryToggleSection}>
                  <div className={styles.summaryInputGroup}>
                    <label className={styles.summaryInputLabel}>Amount to Pay Now</label>
                  <input
                    type="number"
                      className={styles.summaryInputField}
                      value={partialAmount}
                      onChange={e => handlePartialAmountChange(e.target.value)}
                    placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={total}
                  />
                </div>
                  <div className={styles.summaryInputGroup}>
                    <label className={styles.summaryInputLabel}>Notes</label>
                    <textarea
                      className={`${styles.summaryInputField} ${styles.summaryTextarea}`}
                      value={partialNotes}
                      onChange={e => setPartialNotes(e.target.value)}
                      placeholder="Add notes for partial payment..."
                    />
                  </div>
                  {(parseFloat(partialAmount) <= 0 || parseFloat(partialAmount) >= total) && partialAmount && (
                    <div className={styles.summaryWarning}>
                      {parseFloat(partialAmount) <= 0
                        ? 'Please enter an amount greater than €0'
                        : 'Partial payment cannot be equal to or greater than total'}
                    </div>
                  )}
                  {parseFloat(partialAmount) > 0 && parseFloat(partialAmount) < total && (
                    <div className={styles.summaryPartialPaymentInfo}>
                      <div><strong>Paying Now:</strong> {formatCurrency(parseFloat(partialAmount))}</div>
                      <div><strong>Remaining:</strong> {formatCurrency(remainingAmount)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card Payment */}
            {paymentMethod === 'card' && (
              <div className={styles.summarySection}>
                <div className={styles.summarySectionTitle}>
                  <CreditCard size={18} />
                  Stripe Card Payment
                </div>
                <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, marginBottom: '12px' }}>
                  Tap <strong>Process Sale</strong> to launch the Stripe payment sheet. We will finalize the sale automatically once the payment succeeds.
                </p>
                {stripeStatus && (
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '10px',
                      background: '#eef2ff',
                      border: '1px solid #c7d2fe',
                      color: '#3730a3',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    {stripeStatus}
                  </div>
                )}
              </div>
            )}

            {/* Cash Payment */}
            {paymentMethod === 'cash' && (
              <div className={`${styles.summarySection} ${styles.summaryCashSection}`}>
                <div className={styles.summarySectionTitle}>
                  <DollarSign size={18} />
                  Cash Payment
                </div>
                <div className={styles.summaryInputGroup}>
                  <label className={styles.summaryInputLabel}>Amount Received</label>
                    <input
                    ref={cashInputRef}
                    type="number"
                    className={styles.summaryCashInput}
                    value={cashAmount}
                    onChange={e => setCashAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                <button className={styles.summaryExactBtn} onClick={handleSetExactAmount}>
                  Set Exact Amount ({formatCurrency(amountDue)})
                    </button>
                {changeDue > 0 && (
                  <div className={styles.summaryChangeDisplay}>
                    Change: {formatCurrency(changeDue)}
                  </div>
                  )}
                {cashAmount && changeDue < 0 && (
                  <div className={styles.summaryWarning}>
                    Insufficient cash. Need {formatCurrency(Math.abs(changeDue))} more.
                </div>
                )}
                  </div>
                )}

            {/* Receipt Notes */}
            <div className={styles.summarySection}>
              <div className={styles.summarySectionTitle}>
                <FileText size={18} />
                Receipt Notes
                  </div>
              <div className={styles.summaryInputGroup}>
                <textarea
                  className={`${styles.summaryInputField} ${styles.summaryTextarea}`}
                  value={receiptNotes}
                  onChange={e => setReceiptNotes(e.target.value)}
                  placeholder="Add notes for receipt (optional)..."
                />
                <div className={styles.summaryHelpText}>
                  These notes will appear on the printed receipt
              </div>
              </div>
            </div>

            {/* Payment Summary */}
            <div className={styles.summarySection}>
              <div className={styles.summarySectionTitle}>
                <BarChart3 size={18} />
                Payment Summary
              </div>
              <div className={styles.summarySummarySection}>
                <div className={styles.summarySummaryRow}>
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className={styles.summarySummaryRow}>
                  <span>Tax:</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                {allowPartialPayment && parseFloat(partialAmount) > 0 && (
                  <>
                    <div className={styles.summarySummaryRow}>
                      <span>Paying Now:</span>
                      <span>{formatCurrency(parseFloat(partialAmount))}</span>
                    </div>
                    <div className={styles.summarySummaryRow}>
                      <span>Remaining:</span>
                      <span className={styles.summaryRemainingAmount}>{formatCurrency(remainingAmount)}</span>
                    </div>
                  </>
                )}
                <div className={styles.summarySummaryRow}>
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className={styles.summaryActionBar}>
            <button className={`${styles.summaryActionBtn} ${styles.summaryBtnSecondary}`} onClick={() => {}}>
              <Eye size={18} />
              Receipt
            </button>
            <button className={`${styles.summaryActionBtn} ${styles.summaryBtnSecondary}`} onClick={() => {}}>
              <Printer size={18} />
              Print
            </button>
            <button
              className={`${styles.summaryActionBtn} ${styles.summaryBtnPrimary}`}
              onClick={handleProcessSale}
              disabled={isProcessing || !isPaymentValid || !order.items.length}
            >
              {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
              {allowPartialPayment ? 'Process Partial' : 'Process Sale'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderReceiptModal = () => {
    if (activeModal !== 'receipt') return null

    return (
      <div className={styles.summaryModalOverlay} onClick={handleCloseModal}>
        <div className={styles.summaryModalContainer} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className={styles.summaryHeader}>
            <div className={styles.summaryHeaderTitle}>
              <Receipt size={24} />
              Receipt
            </div>
            <button className={styles.summaryCloseBtn} onClick={handleCloseModal}>
              ×
            </button>
          </div>

          {/* Receipt Content */}
          <div className={styles.summaryContent}>
            <div 
              dangerouslySetInnerHTML={{ __html: receiptHtml }}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '24px',
                background: '#ffffff',
                fontFamily: 'Courier New, monospace',
                fontSize: '14px',
                lineHeight: '1.7',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                margin: '0 auto',
                maxWidth: '600px'
              }}
            />
          </div>

          {/* Action Bar */}
          <div className={styles.summaryActionBar}>
            <button 
              className={`${styles.summaryActionBtn} ${styles.summaryBtnSecondary}`}
              onClick={() => printReceipt(order, {
                method: paymentMethod,
                amountEntered: paymentMethod === 'cash' ? cashAmount : total.toFixed(2),
                change: paymentMethod === 'cash' ? Math.max(changeDue, 0) : 0,
                customerName,
                receiptNotes
              }, user, selectedBranch?.branch_name || user?.email || 'Business')}
            >
              <Printer size={18} />
              Print
            </button>
            <button className={`${styles.summaryActionBtn} ${styles.summaryBtnSecondary}`}>
              <Mail size={18} />
              Email
            </button>
            <button 
              className={`${styles.summaryActionBtn} ${styles.summaryBtnPrimary}`}
              onClick={() => {
                handleClearCart()
                setActiveModal(null)
              }}
            >
              <BadgeCheck size={18} />
              New Sale
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderSideMenu = () => {
    if (!showNav) return null

    return (
      <div className="fixed inset-0 z-50">
        <div
          className="absolute inset-0 bg-black/40"
          onClick={() => setShowNav(false)}
        ></div>
        <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-xl">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold">Menu</h2>
            <button className="p-2 rounded-lg hover:bg-gray-100" onClick={() => setShowNav(false)}>
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
          <nav className="p-4 space-y-1">
            <button
              onClick={() => {
                setShowNav(false)
                navigate('/dashboard-mobile')
              }}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium ${
                location.pathname.startsWith('/dashboard-mobile') ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center space-x-3">
                <Home size={18} />
                <span>Home</span>
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowNav(false)
                navigate('/sales-mobile')
              }}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium ${
                location.pathname.startsWith('/sales-mobile') ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center space-x-3">
                <ShoppingBag size={18} />
                <span>Sales</span>
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowNav(false)
                navigate('/products-mobile')
              }}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium ${
                location.pathname.startsWith('/products-mobile') ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center space-x-3">
                <Package size={18} />
                <span>Products</span>
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowNav(false)
                navigate('/transactions-mobile')
              }}
              className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium ${
                location.pathname.startsWith('/transactions-mobile') ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="flex items-center space-x-3">
                <Receipt size={18} />
                <span>Transactions</span>
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </div>
    )
  }


  if (productsLoading || businessLoading || isLoadingTransaction) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.loadingSpinner} />
        {isLoadingTransaction ? 'Loading transaction...' : 'Loading sales data...'}
      </div>
    )
  }

  // Theme-aware background configuration
  const getBackgroundImage = () => {
    if (theme === 'light') {
      return 'url(/images/backgrounds/stribebg_white.png)'
    }
    return 'url(/images/backgrounds/stribebg.png)'
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundImage: getBackgroundImage(),
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      overflowX: 'hidden',
      overflowY: 'auto',
      paddingBottom: '80px'
    }}>
      {renderHeader()}
      {renderSearchBar()}
      {renderCategoryTabs()}
      {renderProductsGrid()}
      <MobileBottomNav />
      {renderCartOverlay()}
      {renderWeightModal()}
      {renderCustomPriceModal()}
      {renderPaymentModal()}
      {renderReceiptModal()}
      {renderSideMenu()}
    </div>
  )
}

export default SalesMobile

