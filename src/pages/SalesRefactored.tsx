import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useProducts } from '../hooks/useProducts'
import { useOrder } from '../hooks/useOrder'
import ProductGrid from '../components/sales/ProductGrid'
import OrderSidebar from '../components/sales/OrderSidebar'
import { Product, SideBusinessItem } from '../types/sales'

const SalesRefactored = () => {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  // Use custom hooks
  const {
    filteredProducts,
    filteredSideBusinessItems,
    categories,
    selectedCategory,
    searchTerm,
    showAllProducts,
    currentPage,
    productsPerPage,
    totalProducts,
    isLoadingMore,
    isSwitchingMode,
    isFiltering,
    loading,
    setSelectedCategory,
    setSearchTerm,
    handleShowAllToggle,
    loadMoreProducts
  } = useProducts()

  const {
    order,
    addToOrder,
    addWeightedProductToOrder,
    addSideBusinessItemToOrder,
    updateQuantity,
    updateWeight,
    removeFromOrder,
    resetOrder
  } = useOrder()

  // Local state for UI
  const [customerName, setCustomerName] = useState('')
  const [showSalesSummary, setShowSalesSummary] = useState(false)
  const [showCustomPriceModal, setShowCustomPriceModal] = useState(false)
  const [pendingSideBusinessItem, setPendingSideBusinessItem] = useState<SideBusinessItem | null>(null)
  const [customPriceInput, setCustomPriceInput] = useState('')
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [pendingWeightedProduct, setPendingWeightedProduct] = useState<Product | null>(null)
  const [weightInput, setWeightInput] = useState('')
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)

  // Transaction context state
  const [existingTransactionId, setExistingTransactionId] = useState<string | null>(null)
  const [existingTransaction, setExistingTransaction] = useState<any>(null)
  const [isAddingToTransaction, setIsAddingToTransaction] = useState(false)

  // Handle existing transaction
  useEffect(() => {
    const transactionParam = searchParams.get('transaction')
    if (transactionParam) {
      setExistingTransactionId(transactionParam)
      setIsAddingToTransaction(true)
      // fetchExistingTransaction(transactionParam) // TODO: Implement this
    }
  }, [searchParams])

  // Keyboard shortcuts
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
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [order.items, setSearchTerm])

  // Handle product addition with weight modal
  const handleAddProduct = (product: Product) => {
    if (product.is_weighted && product.price_per_unit && product.weight_unit) {
      setPendingWeightedProduct(product)
      setWeightInput('')
      setShowWeightModal(true)
    } else {
      addToOrder(product)
    }
  }

  // Handle side business item addition with custom price modal
  const handleAddSideBusinessItem = (sideBusinessItem: SideBusinessItem) => {
    if (!sideBusinessItem.price) {
      setPendingSideBusinessItem(sideBusinessItem)
      setCustomPriceInput('')
      setShowCustomPriceModal(true)
    } else {
      addSideBusinessItemToOrder(sideBusinessItem)
    }
  }

  // Handle custom price submission
  const handleCustomPriceSubmit = () => {
    if (!pendingSideBusinessItem) return
    
    const price = parseFloat(customPriceInput)
    if (isNaN(price) || price < 0) {
      alert('Please enter a valid price')
      return
    }
    
    addSideBusinessItemToOrder(pendingSideBusinessItem, price)
    
    setShowCustomPriceModal(false)
    setPendingSideBusinessItem(null)
    setCustomPriceInput('')
  }

  // Handle weighted product addition
  const handleWeightedProductSubmit = () => {
    if (!pendingWeightedProduct) return
    
    const weight = parseFloat(weightInput)
    if (isNaN(weight) || weight <= 0) {
      alert('Please enter a valid weight')
      return
    }
    
    if (pendingItemId) {
      // Update existing weighted item
      updateWeight(pendingItemId, weight)
    } else {
      // Add new weighted item
      addWeightedProductToOrder(pendingWeightedProduct, weight)
    }
    
    setShowWeightModal(false)
    setPendingWeightedProduct(null)
    setPendingItemId(null)
    setWeightInput('')
  }

  // Show weight edit modal
  const showWeightEditModal = (item: any) => {
    if (item.product && item.weight) {
      setPendingWeightedProduct(item.product)
      setWeightInput(item.weight.toString())
      setShowWeightModal(true)
      setPendingItemId(item.product.product_id)
    }
  }

  // Reset transaction with confirmation
  const handleResetTransaction = () => {
    if (window.confirm('Are you sure you want to reset the current transaction? This will clear all items from the order.')) {
      resetOrder()
      setCustomerName('')
      
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

  // Get current date time
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
          padding: '20px 32px 16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', maxWidth: '600px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Search Product"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #6b7280',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
              />
            </div>
            <button style={{
              background: 'linear-gradient(135deg, #7d8d86, #3e3f29)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fa-solid fa-search"></i>
              Search
            </button>
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
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button
              onClick={handleShowAllToggle}
              disabled={isSwitchingMode}
              style={{
                background: showAllProducts ? '#7d8d86' : '#f3f4f6',
                color: showAllProducts ? '#ffffff' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: isSwitchingMode ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isSwitchingMode ? 0.6 : 1
              }}
            >
              {isSwitchingMode ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '4px' }}></i>
                  Switching...
                </>
              ) : (
                showAllProducts ? 'Show Top 5' : 'Show All'
              )}
            </button>
          </div>
        </div>

        {/* Product Grid */}
        <ProductGrid
          filteredProducts={filteredProducts}
          filteredSideBusinessItems={filteredSideBusinessItems}
          showAllProducts={showAllProducts}
          totalProducts={totalProducts}
          currentPage={currentPage}
          productsPerPage={productsPerPage}
          isLoadingMore={isLoadingMore}
          isFiltering={isFiltering}
          onAddProduct={handleAddProduct}
          onAddSideBusinessItem={handleAddSideBusinessItem}
          onLoadMore={loadMoreProducts}
        />
      </div>

      {/* Order Sidebar */}
      <OrderSidebar
        order={order}
        customerName={customerName}
        user={user}
        onUpdateQuantity={updateQuantity}
        onUpdateWeight={updateWeight}
        onRemoveFromOrder={removeFromOrder}
        onShowWeightEditModal={showWeightEditModal}
        onSetCustomerName={setCustomerName}
        onShowSalesSummary={() => setShowSalesSummary(true)}
        onResetTransaction={handleResetTransaction}
        getCurrentDateTime={getCurrentDateTime}
      />

      {/* Modals would go here - Custom Price Modal, Weight Modal, etc. */}
      {/* For now, we'll keep the existing modal implementations */}
    </div>
  )
}

export default SalesRefactored
