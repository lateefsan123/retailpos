import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useBranch } from '../contexts/BranchContext'
import { useAuth } from '../contexts/AuthContext'
import { useBusiness } from '../contexts/BusinessContext'
import RefundModal from '../components/sales/RefundModal'
import { useRefunds } from '../hooks/useRefunds'
import { RefundRequest } from '../types/multitenant'

interface Transaction {
  sale_id: number
  datetime: string
  total_amount: number
  payment_method: string
  customer_id?: number
  cashier_id?: number
  discount_applied?: number
  customer_name?: string
  cashier_name?: string
  partial_payment?: boolean
  partial_amount?: number
  remaining_amount?: number
  partial_notes?: string
}

interface TransactionItem {
  sale_item_id: number
  product_id: number
  quantity: number
  unit_price: number
  total_price: number
  product_name?: string
  product_category?: string
  product_image?: string | null // Product image URL
  weight?: number // Weight for weighted items
  weight_unit?: string // Weight unit (kg, g, etc.)
  price_per_unit?: number // Price per weight unit
  is_weighted?: boolean // Whether this item is sold by weight
}

const TransactionDetail = () => {
  const { transactionId } = useParams<{ transactionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { selectedBranchId } = useBranch()
  const { user } = useAuth()
  const { currentBusiness } = useBusiness()
  const { processRefund, loading: refundLoading } = useRefunds()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [items, setItems] = useState<TransactionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [editForm, setEditForm] = useState({
    payment_method: '',
    customer_id: null as number | null,
    notes: ''
  })
  const [customers, setCustomers] = useState<Array<{id: number, name: string}>>([])
  const [editingItems, setEditingItems] = useState<{[key: number]: number}>({})
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(Date.now())

  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetails()
      fetchCustomers()
    }
  }, [transactionId])

  // Refresh customers when branch changes
  useEffect(() => {
    fetchCustomers()
  }, [selectedBranchId])

  // Add page visibility listener to refresh data when user returns to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && transactionId) {
        console.log('Page became visible, refreshing transaction data')
        // Refresh transaction data when user returns to the page
        fetchTransactionDetails()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [transactionId])

  // Add focus listener to refresh data when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (transactionId) {
        console.log('Window focused, refreshing transaction data')
        fetchTransactionDetails()
      }
    }

    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [transactionId])

  // Only refresh when transactionId changes
  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetails()
    }
  }, [transactionId])

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true)
      setLastRefreshTime(Date.now()) // Update refresh timestamp
      
      // Extract sale_id from transaction ID (e.g., "TXN-000001" -> 1)
      const saleId = parseInt(transactionId?.replace('TXN-', '') || '0')
      
      if (!saleId) {
        console.error('Invalid transaction ID')
        navigate('/sales')
        return
      }

      // First try to fetch as a regular sale
      const { data: transactionData, error: transactionError } = await supabase
        .from('sales')
        .select(`
          *,
          customers (name)
        `)
        .eq('sale_id', saleId)
        .single()

      let isSideBusinessTransaction = false
      let transformedTransaction: Transaction

      if (transactionError) {
        console.log('Not a regular sale, checking side business sales...')
        
        // Try to fetch as a side business sale
        const { data: sideBusinessSaleData, error: sideBusinessError } = await supabase
          .from('side_business_sales')
          .select(`
            *,
            side_business_items (
              name,
              side_businesses (name)
            )
          `)
          .eq('sale_id', saleId)
          .single()

        if (sideBusinessError) {
          console.error('Error fetching transaction (both regular and side business):', transactionError, sideBusinessError)
          navigate('/sales')
          return
        }

        // Transform side business sale to match Transaction interface
        isSideBusinessTransaction = true
        transformedTransaction = {
          sale_id: sideBusinessSaleData.sale_id,
          datetime: sideBusinessSaleData.date_time,
          total_amount: sideBusinessSaleData.total_amount,
          payment_method: sideBusinessSaleData.payment_method,
          customer_name: null, // Side business sales don't have customer info in this context
          cashier_name: 'System User',
          business_id: sideBusinessSaleData.business_id,
          branch_id: sideBusinessSaleData.branch_id,
          notes: null,
          partial_payment: false,
          partial_amount: null,
          remaining_amount: null,
          partial_notes: null
        }
        console.log('Fetched side business transaction data:', transformedTransaction)
      } else {
        // Transform regular transaction data
        transformedTransaction = {
          ...transactionData,
          customer_name: transactionData.customers?.name || null,
          cashier_name: 'System User'
        }
        console.log('Fetched regular transaction data:', transformedTransaction)
      }

      setTransaction(transformedTransaction)

      // Fetch transaction items based on transaction type
      if (isSideBusinessTransaction) {
        // Fetch side business items
        const { data: sideBusinessItemsData, error: sideBusinessItemsError } = await supabase
          .from('side_business_sales')
          .select(`
            *,
            side_business_items (
              name,
              side_businesses (name)
            )
          `)
          .eq('sale_id', saleId)

        if (sideBusinessItemsError) {
          console.error('Error fetching side business transaction items:', sideBusinessItemsError)
        } else {
          console.log('Fetched side business items data:', sideBusinessItemsData)
          const transformedItems: TransactionItem[] = (sideBusinessItemsData || []).map(item => ({
            sale_item_id: item.sale_id, // Use sale_id as item ID for side business
            product_id: `sb-${item.item_id}`, // Prefix to identify as side business item
            quantity: item.quantity,
            unit_price: item.price_each,
            total_price: item.total_amount,
            product_name: item.side_business_items?.name || 'Unknown Side Business Item',
            product_category: item.side_business_items?.side_businesses?.name || 'Side Business',
            product_image: null,
            weight: undefined,
            weight_unit: undefined,
            price_per_unit: undefined,
            is_weighted: false
          }))
          setItems(transformedItems)
        }
      } else {
        // Fetch regular sale items
        const { data: itemsData, error: itemsError } = await supabase
          .from('sale_items')
          .select(`
            *,
            products (
              name,
              category,
              weight_unit,
              price_per_unit,
              is_weighted,
              image_url
            )
          `)
          .eq('sale_id', saleId)

        if (itemsError) {
          console.error('Error fetching transaction items:', itemsError)
        } else {
          console.log('Fetched items data:', itemsData) // Debug logging
          const transformedItems: TransactionItem[] = (itemsData || []).map(item => {
            // Debug logging for weighted items
            if (item.products?.is_weighted) {
              console.log('Weighted item data:', {
                name: item.products.name,
                weight: item.weight,
                weight_unit: item.products.weight_unit,
                price_per_unit: item.products.price_per_unit,
                calculated_price: item.calculated_price,
                price_each: item.price_each
              })
            }
            
            return {
              sale_item_id: item.sale_item_id,
              product_id: item.product_id,
              quantity: item.quantity,
              unit_price: item.price_each,
              total_price: item.calculated_price || 
                (item.products?.is_weighted && item.weight && item.products?.price_per_unit 
                  ? item.weight * item.products.price_per_unit 
                  : item.quantity * item.price_each),
              product_name: item.products?.name || 'Unknown Product',
              product_category: item.products?.category || 'Unknown Category',
              product_image: item.products?.image_url || null,
              weight: item.weight || undefined,
              weight_unit: item.products?.weight_unit || undefined,
              price_per_unit: item.products?.price_per_unit || undefined,
              is_weighted: item.products?.is_weighted || false
            }
          })
          setItems(transformedItems)
        }
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error)
      navigate('/sales')
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      let query = supabase
        .from('customers')
        .select('id, name')

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query.order('name')

      if (error) {
        console.error('Error fetching customers:', error)
      } else {
        setCustomers(data || [])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const handleBack = () => {
    navigate('/dashboard')
  }

  const handleEdit = () => {
    // Navigate to sales page with the transaction ID for editing
    navigate(`/sales?transaction=${transactionId}`)
  }

  const handleSave = async () => {
    if (!transaction) return

    try {
      setSaving(true)
      
      const saleId = parseInt(transactionId?.replace('TXN-', '') || '0')
      
      // Update transaction details
      const { error } = await supabase
        .from('sales')
        .update({
          payment_method: editForm.payment_method,
          customer_id: editForm.customer_id,
          notes: editForm.notes
        })
        .eq('sale_id', saleId)

      if (error) {
        console.error('Error updating transaction:', error)
        alert('Failed to update transaction. Please try again.')
        return
      }

      // Refresh transaction data
      await fetchTransactionDetails()
      setEditing(false)
      alert('Transaction updated successfully!')
      
    } catch (error) {
      console.error('Error saving transaction:', error)
      alert('Failed to save changes. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setEditForm({
      payment_method: '',
      customer_id: null,
      notes: ''
    })
    setEditingItems({})
  }

  const handleItemQuantityChange = (itemId: number, newQuantity: number) => {
    if (newQuantity < 0) return
    setEditingItems(prev => ({
      ...prev,
      [itemId]: newQuantity
    }))
  }

  const handleRemoveItem = async (itemId: number) => {
    if (!confirm('Are you sure you want to remove this item from the transaction?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_item_id', itemId)

      if (error) {
        console.error('Error removing item:', error)
        alert('Failed to remove item. Please try again.')
        return
      }

      // Refresh transaction data
      await fetchTransactionDetails()
      alert('Item removed successfully!')
      
    } catch (error) {
      console.error('Error removing item:', error)
      alert('Failed to remove item. Please try again.')
    }
  }

  const handleUpdateItemQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(itemId)
      return
    }

    try {
      const item = items.find(i => i.sale_item_id === itemId)
      if (!item) return

      const newTotalPrice = newQuantity * item.unit_price

      const { error } = await supabase
        .from('sale_items')
        .update({
          quantity: newQuantity,
          total_price: newTotalPrice
        })
        .eq('sale_item_id', itemId)

      if (error) {
        console.error('Error updating item quantity:', error)
        alert('Failed to update item quantity. Please try again.')
        return
      }

      // Refresh transaction data
      await fetchTransactionDetails()
      setEditingItems(prev => {
        const newState = {...prev}
        delete newState[itemId]
        return newState
      })
      alert('Item quantity updated successfully!')
      
    } catch (error) {
      console.error('Error updating item quantity:', error)
      alert('Failed to update item quantity. Please try again.')
    }
  }

  // Resolve reminders related to a specific sale
  const resolveRelatedReminders = async (saleId: number) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ resolved: true })
        .eq('sale_id', saleId)
        .eq('resolved', false) // Only update unresolved reminders

      if (error) {
        console.error('Error resolving related reminders:', error)
      } else {
        console.log('Related reminders resolved successfully')
      }
    } catch (error) {
      console.error('Error resolving related reminders:', error)
      // Don't throw error - reminder resolution failure shouldn't break payment completion
    }
  }

  const handleCompletePayment = async () => {
    if (!transaction || !transaction.partial_payment) return

    const confirmed = window.confirm(
      `Complete payment for Transaction #${transactionId}?\n\n` +
      `This will mark the remaining balance of €${transaction.remaining_amount?.toFixed(2) || '0.00'} as paid.\n\n` +
      `The transaction will be marked as fully paid.`
    )

    if (!confirmed) return

    try {
      const saleId = parseInt(transactionId?.replace('TXN-', '') || '0')
      
      // Update the transaction to mark it as fully paid
      const { error } = await supabase
        .from('sales')
        .update({
          partial_payment: false,
          partial_amount: null,
          remaining_amount: null,
          partial_notes: null,
          notes: transaction.notes ? 
            `${transaction.notes}\n\nPayment completed on ${new Date().toLocaleString()}` : 
            `Payment completed on ${new Date().toLocaleString()}`
        })
        .eq('sale_id', saleId)

      if (error) {
        console.error('Error completing payment:', error)
        alert('Failed to complete payment. Please try again.')
        return
      }

      // Automatically resolve related reminders
      await resolveRelatedReminders(saleId)

      // Show success message
      alert('Payment completed successfully! Related reminders have been resolved.')
      
      // Refresh transaction data
      await fetchTransactionDetails()
      
    } catch (error) {
      console.error('Error completing payment:', error)
      alert('Failed to complete payment. Please try again.')
    }
  }

  const handleProcessRefund = async (refundRequests: RefundRequest[]) => {
    if (!currentBusiness?.business_id || !selectedBranchId) {
      alert('Business and branch information is required for refunds')
      return
    }

    try {
      let successCount = 0
      let totalAmount = 0
      const errors: string[] = []

      for (const refundRequest of refundRequests) {
        const { data, error } = await processRefund(refundRequest)
        
        if (error) {
          errors.push(`Item refund failed: ${error}`)
        } else if (data) {
          successCount++
          totalAmount += data.refund_amount
        }
      }

      if (successCount > 0) {
        const message = successCount === refundRequests.length 
          ? `All refunds processed successfully!\nTotal Amount: €${totalAmount.toFixed(2)}`
          : `${successCount}/${refundRequests.length} refunds processed successfully.\nTotal Amount: €${totalAmount.toFixed(2)}`
        
        alert(message)
        
        if (errors.length > 0) {
          console.error('Some refunds failed:', errors)
        }
        
        // Refresh transaction data to show updated information
        fetchTransactionDetails()
      } else {
        alert(`Failed to process refunds:\n${errors.join('\n')}`)
      }
    } catch (err) {
      console.error('Error processing refunds:', err)
      alert('An unexpected error occurred while processing the refunds')
    }
  }

  const handleDeleteTransaction = async () => {
    if (!transaction) return

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete Transaction #${transactionId}?\n\n` +
      `This will:\n` +
      `• Remove all items from this transaction\n` +
      `• Restore stock quantities for all items\n` +
      `• Delete the transaction record\n\n` +
      `This action cannot be undone!`
    )

    if (!confirmed) return

    try {
      const saleId = parseInt(transactionId?.replace('TXN-', '') || '0')
      
      // First, restore stock quantities for all items
      for (const item of items) {
        // Get current stock quantity
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('stock_quantity')
          .eq('product_id', item.product_id)
          .single()

        if (productError) {
          console.error('Error fetching product stock:', productError)
          continue
        }

        // Restore stock quantity
        const { error: stockError } = await supabase
          .from('products')
          .update({
            stock_quantity: productData.stock_quantity + item.quantity,
            last_updated: new Date().toISOString()
          })
          .eq('product_id', item.product_id)

        if (stockError) {
          console.error('Error restoring stock:', stockError)
        }

        // Create inventory movement record for stock restoration
        const { error: movementError } = await supabase
          .from('inventory_movements')
          .insert([{
            product_id: item.product_id,
            quantity_change: item.quantity,
            movement_type: 'Transaction Deletion',
            reference_id: saleId,
            notes: `Stock restored from deleted transaction #${transactionId}`
          }])

        if (movementError) {
          console.error('Error creating inventory movement:', movementError)
        }
      }

      // Delete all sale items
      const { error: itemsError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId)

      if (itemsError) {
        console.error('Error deleting sale items:', itemsError)
        alert('Failed to delete transaction items. Please try again.')
        return
      }

      // Delete the sale record
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('sale_id', saleId)

      if (saleError) {
        console.error('Error deleting sale:', saleError)
        alert('Failed to delete transaction. Please try again.')
        return
      }

      // Show success message
      alert('Transaction deleted successfully!')
      
      // Navigate back to transactions list
      navigate('/dashboard')
      
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert('Failed to delete transaction. Please try again.')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Loading state hidden - always show content
  // if (loading) {
  //   return (
  //     <div style={{
  //       display: 'flex',
  //       justifyContent: 'center',
  //       alignItems: 'center',
  //       minHeight: '400px'
  //     }}>
  //       <div style={{
  //         fontSize: '20px',
  //         color: '#4b5563',
  //         display: 'flex',
  //         alignItems: 'center',
  //         gap: '12px'
  //       }}>
  //         <i className="fa-solid fa-spinner" style={{
  //           animation: 'spin 1s linear infinite',
  //           fontSize: '24px'
  //         }}></i>
  //         Loading transaction details...
  //       </div>
  //     </div>
  //   )
  // }

  if (!transaction) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#4b5563'
        }}>
          <i className="fa-solid fa-exclamation-triangle" style={{
            fontSize: '48px',
            marginBottom: '16px',
            opacity: 0.5
          }}></i>
          <p style={{ fontSize: '16px', margin: 0 }}>
            Transaction not found
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={handleBack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: '#1f2937',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#f3f4f6'
              (e.target as HTMLButtonElement).style.color = '#1f2937'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'none'
              (e.target as HTMLButtonElement).style.color = '#3e3f29'
            }}
          >
            <i className="fa-solid fa-arrow-left"></i>
          </button>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              Transaction #{transactionId}
              {items.length > 0 && items[0].product_id.startsWith('sb-') && (
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'normal',
                  background: '#f3f4f6',
                  color: '#374151',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}>
                  <i className="fa-solid fa-briefcase" style={{ marginRight: '4px' }}></i>
                  Side Business
                </span>
              )}
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#4b5563',
              margin: 0
            }}>
              {formatDate(transaction.datetime)}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowRefundModal(true)}
            disabled={refundLoading || !currentBusiness?.business_id || !selectedBranchId}
            style={{
              background: refundLoading || !currentBusiness?.business_id || !selectedBranchId ? '#d1d5db' : '#111827',
              color: refundLoading || !currentBusiness?.business_id || !selectedBranchId ? '#9ca3af' : '#f1f0e4',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: refundLoading || !currentBusiness?.business_id || !selectedBranchId ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!refundLoading && currentBusiness?.business_id && selectedBranchId) {
                (e.target as HTMLButtonElement).style.background = '#374151'
              }
            }}
            onMouseLeave={(e) => {
              if (!refundLoading && currentBusiness?.business_id && selectedBranchId) {
                (e.target as HTMLButtonElement).style.background = '#111827'
              }
            }}
          >
            <i className="fa-solid fa-undo" style={{ fontSize: '14px' }}></i>
            {refundLoading ? 'Processing...' : 'Process Refund'}
          </button>
          <button
            onClick={handleDeleteTransaction}
            style={{
              background: '#6b7280',
              color: '#f1f0e4',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = '#4b5563'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = '#6b7280'
            }}
          >
            <i className="fa-solid fa-trash" style={{ fontSize: '14px' }}></i>
            Delete Transaction
          </button>
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: saving ? '#9ca3af' : '#111827',
                  color: '#f1f0e4',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    (e.target as HTMLButtonElement).style.background = '#374151'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    (e.target as HTMLButtonElement).style.background = '#111827'
                  }
                }}
              >
                <i className={`fa-solid ${saving ? 'fa-spinner' : 'fa-save'}`} style={{ 
                  fontSize: '14px',
                  animation: saving ? 'spin 1s linear infinite' : 'none'
                }}></i>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                style={{
                  background: '#6b7280',
                  color: '#f1f0e4',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (!saving) {
                    (e.target as HTMLButtonElement).style.background = '#4b5563'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!saving) {
                    (e.target as HTMLButtonElement).style.background = '#6b7280'
                  }
                }}
              >
                <i className="fa-solid fa-times" style={{ fontSize: '14px' }}></i>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={fetchTransactionDetails}
                style={{
                  background: '#111827',
                  color: '#f1f0e4',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#374151'
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#111827'
                }}
                title={`Last refreshed: ${new Date(lastRefreshTime).toLocaleTimeString()}`}
              >
                <i className="fa-solid fa-refresh" style={{ fontSize: '14px' }}></i>
                Refresh
              </button>
              <button
                onClick={handleEdit}
                style={{
                  background: '#111827',
                  color: '#f1f0e4',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#374151'
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = '#111827'
                }}
              >
                <i className="fa-solid fa-edit" style={{ fontSize: '14px' }}></i>
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Transaction Summary Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        border: '1px solid rgba(125, 141, 134, 0.2)',
        boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px'
        }}>
          <div>
            <p style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#4b5563',
              margin: '0 0 8px 0'
            }}>
              Total Amount
            </p>
            <p style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#1f2937',
              margin: 0
            }}>
              €{transaction.total_amount.toFixed(2)}
            </p>
          </div>
          <div>
            <p style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#4b5563',
              margin: '0 0 8px 0'
            }}>
              Payment Method
            </p>
            {editing ? (
              <select
                value={editForm.payment_method}
                onChange={(e) => setEditForm({...editForm, payment_method: e.target.value})}
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  background: '#f9fafb',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  width: '100%',
                  cursor: 'pointer'
                }}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="credit">Credit</option>
              </select>
            ) : (
              <p style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0,
                textTransform: 'capitalize'
              }}>
                {transaction.payment_method}
              </p>
            )}
          </div>
          <div>
            <p style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#4b5563',
              margin: '0 0 8px 0'
            }}>
              Customer
            </p>
            {editing ? (
              <select
                value={editForm.customer_id || ''}
                onChange={(e) => setEditForm({...editForm, customer_id: e.target.value ? parseInt(e.target.value) : null})}
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  background: '#f9fafb',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  width: '100%',
                  cursor: 'pointer'
                }}
              >
                <option value="">Walk-in Customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            ) : (
              <p style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                {transaction.customer_name || 'Walk-in Customer'}
              </p>
            )}
          </div>
          <div>
            <p style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#4b5563',
              margin: '0 0 8px 0'
            }}>
              Cashier
            </p>
            <p style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              {transaction.cashier_name || 'System'}
            </p>
          </div>
          <div>
            <p style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#4b5563',
              margin: '0 0 8px 0'
            }}>
              Items Count
            </p>
            <p style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              {items.length} items
            </p>
          </div>
          {transaction.discount_applied && transaction.discount_applied > 0 && (
            <div>
              <p style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#4b5563',
                margin: '0 0 8px 0'
              }}>
                Discount Applied
              </p>
              <p style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#ef4444',
                margin: 0
              }}>
                -€{transaction.discount_applied.toFixed(2)}
              </p>
            </div>
          )}
        </div>
        
        {/* Partial Payment Information */}
        {transaction.partial_payment && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '12px',
            padding: '16px',
            marginTop: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-credit-card" style={{ color: '#f59e0b', fontSize: '16px' }}></i>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#92400e',
                  margin: 0
                }}>
                  Partial Payment Transaction
                </h3>
              </div>
              <button
                onClick={handleCompletePayment}
                style={{
                  background: '#7d8d86',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#6b7280'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#7d8d86'
                }}
              >
                <i className="fa-solid fa-check" style={{ fontSize: '12px' }}></i>
                Complete Payment
              </button>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px'
            }}>
              <div>
                <p style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#92400e',
                  margin: '0 0 4px 0'
                }}>
                  Amount Paid
                </p>
                <p style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#059669',
                  margin: 0
                }}>
                  €{transaction.partial_amount?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <p style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#92400e',
                  margin: '0 0 4px 0'
                }}>
                  Remaining Balance
                </p>
                <p style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#dc2626',
                  margin: 0
                }}>
                  €{transaction.remaining_amount?.toFixed(2) || '0.00'}
                </p>
              </div>
              {transaction.partial_notes && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <p style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#92400e',
                    margin: '0 0 4px 0'
                  }}>
                    Notes
                  </p>
                  <p style={{
                    fontSize: '14px',
                    color: '#92400e',
                    margin: 0,
                    fontStyle: 'italic'
                  }}>
                    {transaction.partial_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Notes Section */}
        <div style={{ marginTop: '24px' }}>
          <p style={{
            fontSize: '14px',
            fontWeight: '500',
            color: '#4b5563',
            margin: '0 0 8px 0'
          }}>
            Notes
          </p>
          {editing ? (
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
              placeholder="Add transaction notes..."
              style={{
                width: '100%',
                minHeight: '80px',
                fontSize: '14px',
                color: '#1f2937',
                background: '#f9fafb',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          ) : (
            <p style={{
              fontSize: '16px',
              color: '#1f2937',
              margin: 0,
              fontStyle: transaction.notes ? 'normal' : 'italic',
              opacity: transaction.notes ? 1 : 0.6
            }}>
              {transaction.notes || 'No notes added'}
            </p>
          )}
        </div>
      </div>

      {/* Transaction Items */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(125, 141, 134, 0.2)',
        boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)'
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1f2937',
          margin: '0 0 24px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fa-solid fa-shopping-cart" style={{ fontSize: '20px' }}></i>
          Transaction Items
        </h2>

        {items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(() => {
              // Group items by product_id and weight (for weighted items)
              const groupedItems = items.reduce((acc, item) => {
                const key = `${item.product_id}-${item.weight || 'no-weight'}`
                if (!acc[key]) {
                  acc[key] = {
                    ...item,
                    totalQuantity: 0,
                    totalPrice: 0,
                    saleItemIds: []
                  }
                }
                acc[key].totalQuantity += item.quantity
                acc[key].totalPrice += item.total_price || (item.quantity * item.unit_price)
                acc[key].saleItemIds.push(item.sale_item_id)
                return acc
              }, {} as Record<string, any>)

              return Object.values(groupedItems).map((item, index) => {
              const isEditingQuantity = editingItems[item.sale_item_id] !== undefined
              const currentQuantity = isEditingQuantity ? editingItems[item.sale_item_id] : item.totalQuantity
              const currentTotal = item.is_weighted && item.weight
                ? item.totalPrice // Use the grouped total price
                : currentQuantity * item.unit_price
              
              return (
                <div key={index} style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(125, 141, 134, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.boxShadow = '0 4px 12px rgba(62, 63, 41, 0.1)'
                  e.target.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.boxShadow = 'none'
                  e.target.style.transform = 'translateY(0)'
                }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Product Image */}
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: item.product_image 
                        ? `url(${item.product_image})` 
                        : item.is_weighted ? '#f59e0b' : '#7d8d86',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f1f0e4',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      position: 'relative',
                      border: '2px solid rgba(125, 141, 134, 0.2)'
                    }}>
                      {!item.product_image && (
                        <>
                          {item.is_weighted && item.weight ? `${item.weight}${item.weight_unit}` : item.totalQuantity}
                          {item.is_weighted && (
                            <div style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              background: '#f59e0b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              color: '#ffffff'
                            }}>
                              ⚖️
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Quantity/Weight Controls for Editing */}
                    {editing && !item.is_weighted && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          onClick={() => handleItemQuantityChange(item.sale_item_id, currentQuantity - 1)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#ef4444',
                            color: '#f1f0e4',
                            border: 'none',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          -
                        </button>
                        <div style={{
                          minWidth: '48px',
                          height: '48px',
                          borderRadius: '12px',
                          background: isEditingQuantity ? '#fef3c7' : '#7d8d86',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: isEditingQuantity ? '#92400e' : '#f1f0e4',
                          fontSize: '18px',
                          fontWeight: 'bold',
                          border: isEditingQuantity ? '2px solid #f59e0b' : 'none'
                        }}>
                          {currentQuantity}
                        </div>
                        <button
                          onClick={() => handleItemQuantityChange(item.sale_item_id, currentQuantity + 1)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: '#10b981',
                            color: '#f1f0e4',
                            border: 'none',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          +
                        </button>
                        {isEditingQuantity && (
                          <button
                            onClick={() => handleUpdateItemQuantity(item.sale_item_id, currentQuantity)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              background: '#3b82f6',
                              color: '#f1f0e4',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer'
                            }}
                          >
                            Save
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveItem(item.sale_item_id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: '#ef4444',
                            color: '#f1f0e4',
                            border: 'none',
                            fontSize: '12px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            marginLeft: '8px'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    <div>
                      <p style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#1f2937',
                        margin: '0 0 4px 0'
                      }}>
                        {item.product_name}
                      </p>
                      <p style={{
                        fontSize: '14px',
                        color: '#4b5563',
                        margin: 0
                      }}>
                        {item.product_category} • {
                          item.is_weighted && item.weight && item.weight_unit && item.price_per_unit
                            ? `${item.weight} ${item.weight_unit} • €${item.price_per_unit.toFixed(2)}/${item.weight_unit}`
                            : `€${item.unit_price.toFixed(2)} each`
                        }
                      </p>
                      {item.is_weighted && editing && (
                        <p style={{
                          fontSize: '12px',
                          color: '#f59e0b',
                          margin: '4px 0 0 0',
                          fontStyle: 'italic'
                        }}>
                          Weighted items cannot be edited after sale
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: isEditingQuantity ? '#f59e0b' : '#3e3f29'
                  }}>
                    €{currentTotal.toFixed(2)}
                  </div>
                </div>
              )
            })
            })()}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#4b5563'
          }}>
            <i className="fa-solid fa-box" style={{
              fontSize: '48px',
              marginBottom: '16px',
              opacity: 0.5
            }}></i>
            <p style={{ fontSize: '16px', margin: 0 }}>
              No items found for this transaction
            </p>
          </div>
        )}
      </div>

      {/* Refund Modal */}
      {transaction && currentBusiness?.business_id && selectedBranchId && (
        <RefundModal
          isOpen={showRefundModal}
          onClose={() => setShowRefundModal(false)}
          onConfirm={handleProcessRefund}
          transaction={transaction}
          items={items}
          businessId={currentBusiness.business_id}
          branchId={selectedBranchId}
          currentUserId={user?.user_id}
        />
      )}
    </div>
  )
}

export default TransactionDetail
