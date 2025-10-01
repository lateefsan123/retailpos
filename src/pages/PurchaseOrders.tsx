import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../contexts/RoleContext'
import BranchSelector from '../components/BranchSelector'
import { PurchaseOrder, PurchaseOrderRequest, Supplier, Product } from '../types/multitenant'
import { formatCurrency } from '../utils/currency'

const PurchaseOrders = () => {
  const { businessId, businessLoading } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const { user } = useAuth()
  const { hasPermission } = useRole()
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'received' | 'cancelled'>('all')

  // Form state
  const [formData, setFormData] = useState<PurchaseOrderRequest>({
    supplier_id: 0,
    business_id: businessId || 0,
    branch_id: selectedBranchId || undefined,
    expected_date: '',
    notes: '',
    items: []
  })

  // Check permissions
  const canManagePurchaseOrders = hasPermission('manage_inventory')

  useEffect(() => {
    if (!businessLoading && businessId) {
      fetchPurchaseOrders()
      fetchSuppliers()
      fetchProducts()
    }
  }, [businessId, businessLoading, selectedBranchId])

  const fetchPurchaseOrders = async () => {
    if (!businessId) return

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers (
            supplier_id,
            name,
            contact_name,
            email,
            phone
          )
        `)
        .eq('business_id', businessId)
        .order('order_date', { ascending: false })

      // Filter by branch if selected
      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      // Filter by status
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      // Fetch items for each purchase order
      const ordersWithItems = await Promise.all(
        (data || []).map(async (order) => {
          const { data: items } = await supabase
            .from('purchase_order_items')
            .select(`
              *,
              products (
                product_id,
                name,
                price,
                stock_quantity
              )
            `)
            .eq('po_id', order.po_id)

          return { ...order, items: items || [] }
        })
      )

      setPurchaseOrders(ordersWithItems)
    } catch (err) {
      console.error('Error fetching purchase orders:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch purchase orders')
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    if (!businessId) return

    try {
      let query = supabase
        .from('suppliers')
        .select('*')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('name')

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query
      if (error) throw error

      setSuppliers(data || [])
    } catch (err) {
      console.error('Error fetching suppliers:', err)
    }
  }

  const fetchProducts = async () => {
    if (!businessId) return

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .order('name')

      if (error) throw error

      setProducts(data || [])
    } catch (err) {
      console.error('Error fetching products:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !canManagePurchaseOrders || formData.items.length === 0) return

    try {
      setError(null)

      // Create purchase order
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert([{
          supplier_id: formData.supplier_id,
          business_id: businessId,
          branch_id: selectedBranchId || undefined,
          expected_date: formData.expected_date || undefined,
          notes: formData.notes || undefined,
          created_by: user?.user_id,
          total_amount: formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
        }])
        .select()
        .single()

      if (poError) throw poError

      // Create purchase order items
      const itemsWithPoId = formData.items.map(item => ({
        ...item,
        po_id: poData.po_id
      }))

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsWithPoId)

      if (itemsError) throw itemsError

      // Reset form and refresh data
      resetForm()
      setShowAddModal(false)
      fetchPurchaseOrders()
    } catch (err) {
      console.error('Error creating purchase order:', err)
      setError(err instanceof Error ? err.message : 'Failed to create purchase order')
    }
  }

  const handleReceiveOrder = async (order: PurchaseOrder) => {
    if (!canManagePurchaseOrders || !confirm(`Mark order #${order.po_id} as received?`)) {
      return
    }

    try {
      setError(null)

      // Update order status
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'received' })
        .eq('po_id', order.po_id)

      if (error) throw error

      // Update product stock quantities
      if (order.items) {
        for (const item of order.items) {
          if (item.product) {
            const newStockQuantity = (item.product.stock_quantity || 0) + item.received_quantity

            await supabase
              .from('products')
              .update({ 
                stock_quantity: newStockQuantity,
                last_updated: new Date().toISOString()
              })
              .eq('product_id', item.product_id)
              .eq('business_id', businessId)

            // Create inventory movement record
            await supabase
              .from('inventory_movements')
              .insert([{
                product_id: item.product_id,
                quantity_change: item.received_quantity,
                movement_type: 'Purchase',
                reference_id: order.po_id,
                business_id: businessId,
                branch_id: selectedBranchId,
                notes: `Purchase order #${order.po_id} - Received from supplier`,
                created_by: user?.user_id,
                datetime: new Date().toISOString()
              }])
          }
        }
      }

      fetchPurchaseOrders()
    } catch (err) {
      console.error('Error receiving order:', err)
      setError(err instanceof Error ? err.message : 'Failed to receive order')
    }
  }

  const addItemToForm = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product_id: '', quantity: 1, unit_price: 0 }]
    }))
  }

  const updateItemInForm = (index: number, field: keyof typeof formData.items[0], value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const removeItemFromForm = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const resetForm = () => {
    setFormData({
      supplier_id: 0,
      business_id: businessId || 0,
      branch_id: selectedBranchId || undefined,
      expected_date: '',
      notes: '',
      items: []
    })
  }

  const filteredOrders = purchaseOrders.filter(order =>
    order.suppliers?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.po_id.toString().includes(searchTerm) ||
    order.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#fef3c7', color: '#d97706' }
      case 'received': return { bg: '#dcfce7', color: '#166534' }
      case 'cancelled': return { bg: '#fee2e2', color: '#dc2626' }
      default: return { bg: '#f3f4f6', color: '#374151' }
    }
  }

  if (businessLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#f9fafb'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #e5e7eb', 
            borderTop: '4px solid #1a1a1a', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading purchase orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f9fafb',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px',
          background: '#ffffff',
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div>
            <h1 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '28px', 
              fontWeight: '700',
              color: '#1a1a1a'
            }}>
              <i className="fa-solid fa-shopping-cart" style={{ marginRight: '12px', color: '#1a1a1a' }}></i>
              Purchase Orders
            </h1>
            <p style={{ 
              margin: '0', 
              color: '#6b7280', 
              fontSize: '16px' 
            }}>
              Manage purchase orders and track inventory deliveries
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <BranchSelector />
            {canManagePurchaseOrders && (
              <button
                onClick={() => {
                  resetForm()
                  setShowAddModal(true)
                }}
                style={{
                  background: '#1a1a1a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#374151'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#1a1a1a'
                }}
              >
                <i className="fa-solid fa-plus"></i>
                New Order
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={{ 
          background: '#ffffff',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '1', minWidth: '300px' }}>
              <input
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  background: '#ffffff'
                }}
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '16px',
                background: '#ffffff',
                minWidth: '150px'
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <i className="fa-solid fa-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {/* Purchase Orders List */}
        <div style={{ 
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          {loading ? (
            <div style={{ 
              padding: '60px', 
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                border: '4px solid #e5e7eb', 
                borderTop: '4px solid #1a1a1a', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              Loading purchase orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ 
              padding: '60px', 
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <i className="fa-solid fa-shopping-cart" style={{ 
                fontSize: '48px', 
                marginBottom: '16px',
                color: '#d1d5db'
              }}></i>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
                No purchase orders found
              </h3>
              <p style={{ margin: '0' }}>
                {searchTerm ? 'Try adjusting your search terms' : 'Create your first purchase order to get started'}
              </p>
            </div>
          ) : (
            <div>
              {filteredOrders.map((order) => (
                <div 
                  key={order.po_id}
                  style={{ 
                    borderBottom: '1px solid #f3f4f6',
                    padding: '24px',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#f9fafb'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h3 style={{ 
                          margin: '0', 
                          fontSize: '20px', 
                          fontWeight: '600',
                          color: '#1a1a1a'
                        }}>
                          Order #{order.po_id}
                        </h3>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: getStatusColor(order.status).bg,
                          color: getStatusColor(order.status).color
                        }}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '24px', fontSize: '14px', color: '#6b7280' }}>
                        <div>
                          <strong>Supplier:</strong> {order.suppliers?.name || 'Unknown'}
                        </div>
                        <div>
                          <strong>Order Date:</strong> {new Date(order.order_date).toLocaleDateString()}
                        </div>
                        {order.expected_date && (
                          <div>
                            <strong>Expected:</strong> {new Date(order.expected_date).toLocaleDateString()}
                          </div>
                        )}
                        <div>
                          <strong>Total:</strong> {formatCurrency(order.total_amount)}
                        </div>
                      </div>
                    </div>

                    {canManagePurchaseOrders && order.status === 'pending' && (
                      <button
                        onClick={() => handleReceiveOrder(order)}
                        style={{
                          background: '#10b981',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = '#059669'
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = '#10b981'
                        }}
                      >
                        <i className="fa-solid fa-check"></i>
                        Mark Received
                      </button>
                    )}
                  </div>

                  {order.items && order.items.length > 0 && (
                    <div style={{ 
                      background: '#f9fafb',
                      borderRadius: '8px',
                      padding: '16px',
                      marginTop: '12px'
                    }}>
                      <h4 style={{ 
                        margin: '0 0 12px 0', 
                        fontSize: '16px', 
                        fontWeight: '600',
                        color: '#374151'
                      }}>
                        Items ({order.items.length})
                      </h4>
                      <div style={{ display: 'grid', gap: '8px' }}>
                        {order.items.map((item, index) => (
                          <div key={index} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '8px 0',
                            borderBottom: index < order.items!.length - 1 ? '1px solid #e5e7eb' : 'none'
                          }}>
                            <div>
                              <div style={{ fontWeight: '500', color: '#374151' }}>
                                {item.products?.name || `Product ${item.product_id}`}
                              </div>
                              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                {item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(item.quantity * item.unit_price)}
                              </div>
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              Received: {item.received_quantity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <div style={{ 
                      marginTop: '12px',
                      padding: '12px',
                      background: '#f3f4f6',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: '#374151'
                    }}>
                      <strong>Notes:</strong> {order.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
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
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h2 style={{ 
                  margin: '0', 
                  fontSize: '24px', 
                  fontWeight: '600',
                  color: '#1a1a1a'
                }}>
                  <i className="fa-solid fa-shopping-cart" style={{ marginRight: '12px', color: '#1a1a1a' }}></i>
                  New Purchase Order
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    resetForm()
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Supplier *
                    </label>
                    <select
                      required
                      value={formData.supplier_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplier_id: parseInt(e.target.value) }))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        background: '#ffffff'
                      }}
                    >
                      <option value={0}>Select a supplier...</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.supplier_id} value={supplier.supplier_id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      value={formData.expected_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, expected_date: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        background: '#ffffff'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Additional notes about this order..."
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '16px',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>

                {/* Items Section */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '16px'
                  }}>
                    <h3 style={{ 
                      margin: '0', 
                      fontSize: '18px', 
                      fontWeight: '600',
                      color: '#374151'
                    }}>
                      Order Items
                    </h3>
                    <button
                      type="button"
                      onClick={addItemToForm}
                      style={{
                        background: '#1a1a1a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <i className="fa-solid fa-plus"></i>
                      Add Item
                    </button>
                  </div>

                  {formData.items.length === 0 ? (
                    <div style={{ 
                      textAlign: 'center',
                      padding: '40px',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      color: '#6b7280'
                    }}>
                      <i className="fa-solid fa-box" style={{ fontSize: '32px', marginBottom: '12px' }}></i>
                      <p style={{ margin: '0' }}>No items added yet. Click "Add Item" to get started.</p>
                    </div>
                  ) : (
                    <div style={{ 
                      background: '#f9fafb',
                      borderRadius: '8px',
                      padding: '16px'
                    }}>
                      {formData.items.map((item, index) => (
                        <div key={index} style={{ 
                          display: 'grid', 
                          gridTemplateColumns: '2fr 1fr 1fr auto', 
                          gap: '12px',
                          alignItems: 'center',
                          marginBottom: '12px',
                          padding: '12px',
                          background: '#ffffff',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <select
                            value={item.product_id}
                            onChange={(e) => updateItemInForm(index, 'product_id', e.target.value)}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              background: '#ffffff'
                            }}
                          >
                            <option value="">Select product...</option>
                            {products.map(product => (
                              <option key={product.product_id} value={product.product_id}>
                                {product.name}
                              </option>
                            ))}
                          </select>

                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItemInForm(index, 'quantity', parseInt(e.target.value) || 1)}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItemInForm(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => removeItemFromForm(index)}
                            style={{
                              background: '#ef4444',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              cursor: 'pointer',
                              fontSize: '14px'
                            }}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      ))}

                      <div style={{ 
                        marginTop: '16px',
                        padding: '12px',
                        background: '#ffffff',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        textAlign: 'right'
                      }}>
                        <strong style={{ fontSize: '16px', color: '#374151' }}>
                          Total: {formatCurrency(formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0))}
                        </strong>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ 
                  display: 'flex', 
                  gap: '12px', 
                  justifyContent: 'flex-end' 
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      resetForm()
                    }}
                    style={{
                      padding: '12px 24px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      background: '#ffffff',
                      color: '#374151',
                      fontSize: '16px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formData.items.length === 0 || formData.supplier_id === 0}
                    style={{
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '8px',
                      background: formData.items.length === 0 || formData.supplier_id === 0 ? '#d1d5db' : '#1a1a1a',
                      color: formData.items.length === 0 || formData.supplier_id === 0 ? '#9ca3af' : '#ffffff',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: formData.items.length === 0 || formData.supplier_id === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <i className="fa-solid fa-save"></i>
                    Create Order
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default PurchaseOrders
