import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useBusiness } from '../contexts/BusinessContext'
import { useProducts } from '../hooks/derived/useProducts'
import { useOrder } from '../hooks/useOrder'
import { PaymentInfo, PartialPayment } from '../types/sales'
import ProductGrid from '../components/sales/ProductGrid'
import OrderSidebar from '../components/sales/OrderSidebar'
import SalesSummaryModal from '../components/sales/SalesSummaryModal'
import { printReceipt } from '../utils/receiptUtils'
import { Product, SideBusinessItem } from '../types/sales'
import { supabase } from '../lib/supabaseClient'
import { getRandomCustomerIcon } from '../utils/customerIcons'

const SalesWithPartialPayment = () => {
  const { user } = useAuth()
  const { currentBusiness } = useBusiness()
  
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
  const [customerGender, setCustomerGender] = useState<'male' | 'female' | null>(null)
  const [showSalesSummary, setShowSalesSummary] = useState(false)
  const [showCustomPriceModal, setShowCustomPriceModal] = useState(false)
  const [pendingSideBusinessItem, setPendingSideBusinessItem] = useState<SideBusinessItem | null>(null)
  const [customPriceInput, setCustomPriceInput] = useState('')
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [pendingWeightedProduct, setPendingWeightedProduct] = useState<Product | null>(null)
  const [weightInput, setWeightInput] = useState('')
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)

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
    // Check if price is null or undefined (but allow 0 as a valid price)
    if (sideBusinessItem.price == null) {
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

  // Process sale with partial payment support
  const handleProcessSale = async (paymentInfo: PaymentInfo, partialPayment?: PartialPayment) => {
    if (!currentBusiness?.business_id) {
      alert('Please select a business before processing a sale.')
      return
    }

    try {
      // Handle customer if name is provided
      let customerId = null
      if (customerName.trim()) {
        // Check if customer exists
        const { data: existingCustomer, error: lookupError } = await supabase
          .from('customers')
          .select('customer_id')
          .eq('business_id', currentBusiness.business_id)
          .eq('name', customerName.trim())
          .single()

        if (existingCustomer && !lookupError) {
          customerId = existingCustomer.customer_id
        } else {
          // Create new customer
          const customerIcon = customerGender ? getRandomCustomerIcon(customerGender) : null
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert([{
              name: customerName.trim(),
              phone_number: '000-000-0000', // Default phone number
              email: null,
              business_id: currentBusiness.business_id,
              branch_id: null, // No branch selection in this component
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

      // Prepare notes with partial payment information
      let notesContent = ''
      if (partialPayment) {
        notesContent = `PARTIAL PAYMENT
Amount Paid Today: €${partialPayment.amountPaid.toFixed(2)}
Remaining Balance: €${partialPayment.amountRemaining.toFixed(2)}`
        if (partialPayment.notes) {
          notesContent += `\n\nPartial Payment Notes: ${partialPayment.notes}`
        }
      }
      if (paymentInfo.receiptNotes) {
        notesContent += (notesContent ? '\n\n' : '') + paymentInfo.receiptNotes
      }

      // Create sale record
      const insertData = {
        datetime: new Date().toISOString(),
        total_amount: partialPayment ? partialPayment.amountPaid : order.total,
        payment_method: paymentInfo.method,
        cashier_id: user?.user_id,
        customer_id: customerId,
        discount_applied: 0, // No discount in this component
        partial_payment: !!partialPayment,
        partial_amount: partialPayment ? partialPayment.amountPaid : null,
        remaining_amount: partialPayment ? partialPayment.amountRemaining : null,
        partial_notes: partialPayment ? partialPayment.notes : null,
        notes: notesContent || null,
        business_id: currentBusiness.business_id,
        branch_id: null // No branch selection in this component
      }

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert([insertData])
        .select('*')
        .single()

      if (saleError) {
        throw saleError
      }

      // Create sale items
      for (const item of order.items) {
        if (item.product) {
          const saleItemData = {
            sale_id: saleData.sale_id,
            product_id: item.product.product_id,
            quantity: item.quantity,
            price_each: item.product.price,
            weight: item.weight || null,
            calculated_price: item.calculatedPrice || null
          }

          const { error: itemError } = await supabase
            .from('sale_items')
            .insert([saleItemData])

          if (itemError) {
            console.error('Error creating sale item:', itemError)
          }
        }
      }

      // Create reminder for partial payment if applicable
      if (partialPayment && partialPayment.amountRemaining > 0 && saleData?.sale_id) {
        await createPartialPaymentReminder(customerName, partialPayment.amountRemaining, saleData.sale_id)
      }

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
      successMsg.textContent = partialPayment 
        ? `Partial payment processed! €${partialPayment.amountPaid.toFixed(2)} paid, €${partialPayment.amountRemaining.toFixed(2)} remaining. Reminder created.`
        : 'Sale processed successfully!'
      document.body.appendChild(successMsg)
      
      setTimeout(() => {
        document.body.removeChild(successMsg)
      }, 3000)

      // Print receipt
      printReceipt(order, paymentInfo, user, currentBusiness, partialPayment)
      
      // Close modal and reset
      setShowSalesSummary(false)
      resetOrder()
      setCustomerName('')
      
    } catch (error) {
      console.error('Error processing sale:', error)
      alert('Failed to process sale. Please try again.')
    }
  }

  // Create reminder for partial payment
  const createPartialPaymentReminder = async (customerName: string, remainingAmount: number, saleId: number) => {
    if (!currentBusiness?.business_id) {
      return
    }

    try {
      // Get the current user ID
      const ownerId = user?.user_id || 1
      
      // Create reminder title and body
      const reminderTitle = `Payment Due: ${customerName || 'Customer'}`
      const reminderBody = `Customer owes €${remainingAmount.toFixed(2)} from Sale #${saleId}. Please follow up for payment.`
      
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
        business_id: currentBusiness.business_id,
        branch_id: null, // No branch selection in this component
        sale_id: saleId // Link to the specific sale
      }
      
      const { error } = await supabase
        .from('reminders')
        .insert([reminderData])
        .select()
        .single()

      if (error) {
        console.error('Error creating partial payment reminder:', error)
      } else {
        console.log('Partial payment reminder created successfully')
      }
    } catch (error) {
      console.error('Error creating partial payment reminder:', error)
      // Don't throw error - reminder creation failure shouldn't break the sale
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
          background: '#f9fafb'
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
            <div style={{
              background: '#7d8d86',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fa-solid fa-credit-card"></i>
              Partial Payments Enabled
            </div>
          </div>
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
        customerGender={customerGender}
        user={user}
        onUpdateQuantity={updateQuantity}
        onUpdateWeight={updateWeight}
        onRemoveFromOrder={removeFromOrder}
        onShowWeightEditModal={showWeightEditModal}
        onSetCustomerName={setCustomerName}
        onSetCustomerGender={setCustomerGender}
        onShowSalesSummary={() => setShowSalesSummary(true)}
        onResetTransaction={handleResetTransaction}
        getCurrentDateTime={getCurrentDateTime}
      />

      {/* Sales Summary Modal with Partial Payment Support */}
      <SalesSummaryModal
        isOpen={showSalesSummary}
        onClose={() => setShowSalesSummary(false)}
        onProcessSale={handleProcessSale}
        order={order}
        user={user}
      />

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
                onClick={handleWeightedProductSubmit}
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
    </div>
  )
}

export default SalesWithPartialPayment
