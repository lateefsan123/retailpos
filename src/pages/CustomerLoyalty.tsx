import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useRole } from '../contexts/RoleContext'
import BranchSelector from '../components/BranchSelector'
import { Customer, LoyaltyPrize, Product, NewLoyaltyPrize } from '../types/multitenant'
import { formatCurrency } from '../utils/currency'
import styles from './CustomerLoyalty.module.css'

interface CustomerRequest {
  business_id: number
  branch_id?: number
  name: string
  phone_number: string
  email?: string
  loyalty_points?: number
}

interface CustomerWithStats extends Customer {
  last_transaction_date?: string
  total_transactions: number
  total_spent: number
}

const CustomerLoyalty = () => {
  const navigate = useNavigate()
  const { businessId, businessLoading } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const { hasPermission } = useRole()
  
  const [customers, setCustomers] = useState<CustomerWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [pointsToAdd, setPointsToAdd] = useState('')
  const [pointsToRedeem, setPointsToRedeem] = useState('')
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)
  const [customerTransactions, setCustomerTransactions] = useState<any[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)

  // New state for loyalty prizes
  const [activeTab, setActiveTab] = useState<'customers' | 'prizes'>('customers')
  const [loyaltyPrizes, setLoyaltyPrizes] = useState<LoyaltyPrize[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [showPrizeModal, setShowPrizeModal] = useState(false)
  const [editingPrize, setEditingPrize] = useState<LoyaltyPrize | null>(null)
  const [prizeFormData, setPrizeFormData] = useState<NewLoyaltyPrize>({
    product_id: '',
    points_required: 0,
    is_active: true
  })

  // Form state
  const [formData, setFormData] = useState<CustomerRequest>({
    business_id: businessId || 0,
    branch_id: selectedBranchId || undefined,
    name: '',
    phone_number: '',
    email: '',
    loyalty_points: 0
  })

  // Check permissions
  const canManageCustomers = hasPermission('canProcessSales')

  useEffect(() => {
    if (!businessLoading && businessId) {
      fetchCustomers()
      if (activeTab === 'prizes') {
        fetchLoyaltyPrizes()
        fetchProducts()
      }
    }
  }, [businessId, businessLoading, selectedBranchId, activeTab])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (activeDropdown !== null) {
        setActiveDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeDropdown])

  const fetchCustomers = async () => {
    if (!businessId) return

    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .order('name', { ascending: true })

      // Filter by branch if selected
      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data: customersData, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      // Fetch transaction statistics for each customer
      const customersWithStats = await Promise.all(
        (customersData || []).map(async (customer) => {
          const { data: transactions } = await supabase
            .from('sales')
            .select('sale_id, datetime, total_amount')
            .eq('customer_id', customer.customer_id)
            .eq('business_id', businessId)
            .order('datetime', { ascending: false })

          const totalTransactions = transactions?.length || 0
          const totalSpent = transactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0
          const lastTransactionDate = transactions?.[0]?.datetime

          return {
            ...customer,
            total_transactions: totalTransactions,
            total_spent: totalSpent,
            last_transaction_date: lastTransactionDate
          }
        })
      )

      setCustomers(customersWithStats)
    } catch (err) {
      console.error('Error fetching customers:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch customers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessId || !canManageCustomers) return

    try {
      setError(null)

      const customerData: CustomerRequest = {
        ...formData,
        business_id: businessId,
        branch_id: selectedBranchId || undefined
      }

      if (editingCustomer) {
        // Update existing customer
        const { data, error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('customer_id', editingCustomer.customer_id)
          .select()
          .single()

        if (error) throw error

        setCustomers(prev => 
          prev.map(c => c.customer_id === editingCustomer.customer_id ? data : c)
        )
      } else {
        // Create new customer
        const { data, error } = await supabase
          .from('customers')
          .insert([customerData])
          .select()
          .single()

        if (error) throw error

        setCustomers(prev => [...prev, data])
      }

      // Reset form and close modal
      resetForm()
      setShowAddModal(false)
      setEditingCustomer(null)
    } catch (err) {
      console.error('Error saving customer:', err)
      setError(err instanceof Error ? err.message : 'Failed to save customer')
    }
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      business_id: customer.business_id,
      branch_id: customer.branch_id,
      name: customer.name,
      phone_number: customer.phone_number,
      email: customer.email || '',
      loyalty_points: customer.loyalty_points
    })
    setShowAddModal(true)
  }

  const resetForm = () => {
    setFormData({
      business_id: businessId || 0,
      branch_id: selectedBranchId || undefined,
      name: '',
      phone_number: '',
      email: '',
      loyalty_points: 0
    })
  }

  const handlePointsUpdate = async (type: 'add' | 'redeem') => {
    if (!selectedCustomer || !canManageCustomers) return

    const points = type === 'add' ? parseInt(pointsToAdd) : -parseInt(pointsToRedeem)
    if (isNaN(points) || points === 0) return

    try {
      const newPoints = selectedCustomer.loyalty_points + points
      if (newPoints < 0) {
        setError('Cannot redeem more points than customer has')
        return
      }

      const { error } = await supabase
        .from('customers')
        .update({ loyalty_points: newPoints })
        .eq('customer_id', selectedCustomer.customer_id)

      if (error) throw error

      // Update local state
      setCustomers(prev => 
        prev.map(c => 
          c.customer_id === selectedCustomer.customer_id 
            ? { ...c, loyalty_points: newPoints }
            : c
        )
      )

      // Reset form
      setPointsToAdd('')
      setPointsToRedeem('')
    } catch (err) {
      console.error('Error updating points:', err)
      setError(err instanceof Error ? err.message : 'Failed to update points')
    }
  }

  // Loyalty Prizes Functions
  const fetchLoyaltyPrizes = async () => {
    if (!businessId) return

    try {
      let query = supabase
        .from('loyalty_prizes')
        .select(`
          *,
          product:products(*)
        `)
        .eq('business_id', businessId)
        .order('points_required', { ascending: true })

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query

      if (error) throw error
      setLoyaltyPrizes(data || [])
    } catch (err) {
      console.error('Error fetching loyalty prizes:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch loyalty prizes')
    }
  }

  const fetchProducts = async () => {
    if (!businessId) return

    try {
      let query = supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId)
        .gt('stock_quantity', 0) // Only products with stock
        .order('name')

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query

      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch products')
    }
  }

  const handlePrizeSubmit = async () => {
    if (!canManageCustomers || !businessId) return

    try {
      const prizeData = {
        ...prizeFormData,
        business_id: businessId,
        branch_id: selectedBranchId || null
      }

      if (editingPrize) {
        const { error } = await supabase
          .from('loyalty_prizes')
          .update({
            product_id: prizeData.product_id,
            points_required: prizeData.points_required,
            is_active: prizeData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('prize_id', editingPrize.prize_id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('loyalty_prizes')
          .insert([prizeData])

        if (error) throw error
      }

      setShowPrizeModal(false)
      setEditingPrize(null)
      setPrizeFormData({
        product_id: '',
        points_required: 0,
        is_active: true
      })
      fetchLoyaltyPrizes()
    } catch (err) {
      console.error('Error saving prize:', err)
      setError(err instanceof Error ? err.message : 'Failed to save prize')
    }
  }

  const handleDeletePrize = async (prizeId: number) => {
    if (!canManageCustomers || !confirm('Are you sure you want to delete this prize?')) return

    try {
      const { error } = await supabase
        .from('loyalty_prizes')
        .delete()
        .eq('prize_id', prizeId)

      if (error) throw error
      fetchLoyaltyPrizes()
    } catch (err) {
      console.error('Error deleting prize:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete prize')
    }
  }

  const resetPrizeForm = () => {
    setPrizeFormData({
      product_id: '',
      points_required: 0,
      is_active: true
    })
    setEditingPrize(null)
  }

  const handleTransactionClick = (saleId: number) => {
    navigate(`/transaction/${saleId}`)
  }

  const fetchCustomerTransactions = async (customerId: number) => {
    if (!businessId) return

    try {
      setLoadingTransactions(true)
      const { data: transactions, error } = await supabase
        .from('sales')
        .select(`
          sale_id,
          datetime,
          total_amount,
          sale_items (
            quantity,
            price_each,
            products (
              name
            )
          )
        `)
        .eq('customer_id', customerId)
        .eq('business_id', businessId)
        .order('datetime', { ascending: false })

      if (error) throw error
      setCustomerTransactions(transactions || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch transactions')
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handlePrizeRedemption = async (prize: LoyaltyPrize) => {
    if (!selectedCustomer || !canManageCustomers) return

    try {
      // Check if customer has enough points
      if (selectedCustomer.loyalty_points < prize.points_required) {
        setError('Customer does not have enough points for this prize')
        return
      }

      // Check if product has stock
      if (!prize.product || prize.product.stock_quantity <= 0) {
        setError('This prize is out of stock')
        return
      }

      // Deduct points from customer
      const newPoints = selectedCustomer.loyalty_points - prize.points_required
      const { error: pointsError } = await supabase
        .from('customers')
        .update({ loyalty_points: newPoints })
        .eq('customer_id', selectedCustomer.customer_id)

      if (pointsError) throw pointsError

      // Create redemption record
      const { error: redemptionError } = await supabase
        .from('loyalty_redemptions')
        .insert([{
          customer_id: selectedCustomer.customer_id,
          prize_id: prize.prize_id,
          points_used: prize.points_required,
          quantity: 1,
          business_id: businessId,
          branch_id: selectedBranchId || null,
          notes: `Redeemed ${prize.product.name} for ${prize.points_required} points`
        }])

      if (redemptionError) throw redemptionError

      // Update product stock
      const { error: stockError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: prize.product.stock_quantity - 1,
          last_updated: new Date().toISOString()
        })
        .eq('product_id', prize.product_id)

      if (stockError) throw stockError

      // Update local state
      setCustomers(prev => 
        prev.map(c => 
          c.customer_id === selectedCustomer.customer_id 
            ? { ...c, loyalty_points: newPoints }
            : c
        )
      )

      // Refresh data
      fetchLoyaltyPrizes()
      fetchProducts()

      alert(`Successfully redeemed ${prize.product.name} for ${prize.points_required} points!`)
    } catch (err) {
      console.error('Error redeeming prize:', err)
      setError(err instanceof Error ? err.message : 'Failed to redeem prize')
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone_number.includes(searchTerm) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.total_transactions.toString().includes(searchTerm) ||
    formatCurrency(customer.total_spent).includes(searchTerm)
  )

  if (businessLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading customers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.customersContainer}>
      <div className={styles.customersContent}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.headerTitle}>
              <i className={`fa-solid fa-users ${styles.headerTitleIcon}`}></i>
              Customer Loyalty
            </h1>
            <p className={styles.headerSubtitle}>
              Manage customer information, loyalty points, and rewards
            </p>
            <div className={styles.branchSelectorContainer}>
              <BranchSelector />
            </div>
          </div>
          
          <div className={styles.headerActions}>
            {/* Tab Navigation */}
            <div className={styles.tabNavigation}>
              <button
                className={`${styles.tabButton} ${activeTab === 'customers' ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveTab('customers')}
              >
                <i className="fa-solid fa-users"></i>
                Customers
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'prizes' ? styles.tabButtonActive : ''}`}
                onClick={() => setActiveTab('prizes')}
              >
                <i className="fa-solid fa-gift"></i>
                Loyalty Prizes
              </button>
            </div>

            {canManageCustomers && (
              <>
                {activeTab === 'customers' && (
                  <button
                    onClick={() => {
                      resetForm()
                      setEditingCustomer(null)
                      setShowAddModal(true)
                    }}
                    className={styles.addButton}
                  >
                    <i className={`fa-solid fa-plus ${styles.addButtonIcon}`}></i>
                    Add Customer
                  </button>
                )}
                {activeTab === 'prizes' && (
                  <button
                    onClick={() => {
                      resetPrizeForm()
                      setShowPrizeModal(true)
                    }}
                    className={styles.addButton}
                  >
                    <i className={`fa-solid fa-plus ${styles.addButtonIcon}`}></i>
                    Add Prize
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>
            <i className={`fa-solid fa-exclamation-triangle ${styles.errorIcon}`}></i>
            {error}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'customers' ? (
          <>
            {/* Filters */}
            <div className={styles.filtersContainer}>
              <div className={styles.filtersContent}>
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    placeholder="Search by name, phone, email, or transaction amount..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
              </div>
            </div>

            {/* Customers List */}
        <div className={styles.customersList}>
          {loading ? (
            <div className={styles.listLoading}>
              <div className={styles.listSpinner}></div>
              Loading customers...
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className={styles.emptyState}>
              <i className={`fa-solid fa-users ${styles.emptyIcon}`}></i>
              <h3 className={styles.emptyTitle}>
                No customers found
              </h3>
              <p className={styles.emptyText}>
                {searchTerm ? 'Try adjusting your search terms' : 'Add your first customer to get started'}
              </p>
            </div>
          ) : (
            <div style={{ overflow: 'auto' }}>
              <table className={styles.customersTable}>
                <thead className={styles.tableHeader}>
                  <tr>
                    <th className={styles.tableHeaderCell}>Customer</th>
                    <th className={styles.tableHeaderCell}>Contact Info</th>
                    <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellCenter}`}>Last Transaction</th>
                    <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellCenter}`}>Total Spent</th>
                    <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellCenter}`}>Loyalty Points</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr 
                      key={customer.customer_id}
                      className={styles.tableRow}
                      onClick={() => {
                        setSelectedCustomer(customer)
                        setShowPointsModal(true)
                        fetchCustomerTransactions(customer.customer_id)
                      }}
                    >
                      <td className={styles.tableCell}>
                        <div className={styles.customerInfo}>
                          <div className={styles.customerDetails}>
                            <div className={styles.customerName}>
                              {customer.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={styles.tableCell}>
                        <div>
                          {customer.phone_number && (
                            <div className={styles.contactDetail}>
                              <i className={`fa-solid fa-phone ${styles.contactIcon}`}></i>
                              <a 
                                href={`tel:${customer.phone_number}`}
                                className={styles.contactLink}
                              >
                                {customer.phone_number}
                              </a>
                            </div>
                          )}
                          {customer.email && (
                            <div className={styles.contactDetail}>
                              <i className={`fa-solid fa-envelope ${styles.contactIcon}`}></i>
                              <a 
                                href={`mailto:${customer.email}`}
                                className={styles.contactLink}
                              >
                                {customer.email}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                        <div className={styles.transactionInfo}>
                          {customer.last_transaction_date ? (
                            <>
                              <div className={styles.lastTransactionDate}>
                                {new Date(customer.last_transaction_date).toLocaleDateString()}
                              </div>
                              <div className={styles.transactionCount}>
                                {customer.total_transactions} transaction{customer.total_transactions !== 1 ? 's' : ''}
                              </div>
                            </>
                          ) : (
                            <div className={styles.noTransactions}>
                              <i className="fa-solid fa-clock"></i>
                              No transactions yet
                            </div>
                          )}
                        </div>
                      </td>
                      <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                        <div className={styles.totalSpentContainer}>
                          <span className={styles.totalSpentValue}>
                            {formatCurrency(customer.total_spent)}
                          </span>
                          {customer.total_transactions > 0 && (
                            <span className={styles.averageSpent}>
                              Avg: {formatCurrency(customer.total_spent / customer.total_transactions)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                        <div className={styles.pointsContainer}>
                          <span className={`${styles.pointsValue} ${customer.loyalty_points === 0 ? styles.pointsValueZero : ''}`}>
                            {customer.loyalty_points.toLocaleString()}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        ) : (
          /* Loyalty Prizes Tab */
          <div className={styles.prizesList}>
            {loading ? (
              <div className={styles.listLoading}>
                <div className={styles.listSpinner}></div>
                Loading prizes...
              </div>
            ) : loyaltyPrizes.length === 0 ? (
              <div className={styles.emptyState}>
                <i className={`fa-solid fa-gift ${styles.emptyIcon}`}></i>
                <h3 className={styles.emptyTitle}>
                  No loyalty prizes set up
                </h3>
                <p className={styles.emptyText}>
                  Create your first loyalty prize to reward customers with points
                </p>
              </div>
            ) : (
              <div className={styles.prizesGrid}>
                {loyaltyPrizes.map((prize) => (
                  <div key={prize.prize_id} className={styles.prizeCard}>
                    <div className={styles.prizeHeader}>
                      <div className={styles.prizeInfo}>
                        <h3 className={styles.prizeName}>
                          {prize.product?.name || 'Unknown Product'}
                        </h3>
                        <div className={styles.prizePoints}>
                          <i className="fa-solid fa-coins"></i>
                          {prize.points_required.toLocaleString()} points
                        </div>
                      </div>
                      <div className={styles.prizeStatus}>
                        <span className={`${styles.statusBadge} ${prize.is_active ? styles.statusActive : styles.statusInactive}`}>
                          {prize.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className={styles.prizeDetails}>
                      <div className={styles.prizeDetail}>
                        <span className={styles.prizeDetailLabel}>Price:</span>
                        <span className={styles.prizeDetailValue}>
                          {formatCurrency(prize.product?.price || 0)}
                        </span>
                      </div>
                      <div className={styles.prizeDetail}>
                        <span className={styles.prizeDetailLabel}>Stock:</span>
                        <span className={styles.prizeDetailValue}>
                          {prize.product?.stock_quantity || 0} units
                        </span>
                      </div>
                      <div className={styles.prizeDetail}>
                        <span className={styles.prizeDetailLabel}>Category:</span>
                        <span className={styles.prizeDetailValue}>
                          {prize.product?.category || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {canManageCustomers && (
                      <div className={styles.prizeActions}>
                        <button
                          className={styles.prizeActionButton}
                          onClick={() => {
                            setEditingPrize(prize)
                            setPrizeFormData({
                              product_id: prize.product_id,
                              points_required: prize.points_required,
                              is_active: prize.is_active
                            })
                            setShowPrizeModal(true)
                          }}
                        >
                          <i className="fa-solid fa-edit"></i>
                          Edit
                        </button>
                        <button
                          className={`${styles.prizeActionButton} ${styles.prizeActionButtonDanger}`}
                          onClick={() => handleDeletePrize(prize.prize_id)}
                        >
                          <i className="fa-solid fa-trash"></i>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add/Edit Customer Modal */}
        {showAddModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  <i className="fa-solid fa-user" style={{ marginRight: '12px', color: '#1a1a1a' }}></i>
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingCustomer(null)
                    resetForm()
                  }}
                  className={styles.modalCloseButton}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <div>
                    <label className={styles.formLabel}>
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter customer name"
                      className={styles.formInput}
                    />
                  </div>

                  <div>
                    <label className={styles.formLabel}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone_number: e.target.value }))}
                      placeholder="+1 (555) 123-4567"
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formGridSingle}>
                  <label className={styles.formLabel}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="customer@example.com"
                    className={styles.formInput}
                  />
                </div>

                {editingCustomer && (
                  <div className={styles.formGridSingle}>
                    <label className={styles.formLabel}>
                      Loyalty Points
                    </label>
                    <input
                      type="number"
                      value={formData.loyalty_points}
                      onChange={(e) => setFormData(prev => ({ ...prev, loyalty_points: parseInt(e.target.value) || 0 }))}
                      min="0"
                      className={styles.formInput}
                    />
                  </div>
                )}

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingCustomer(null)
                      resetForm()
                    }}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                  >
                    <i className="fa-solid fa-save"></i>
                    {editingCustomer ? 'Update Customer' : 'Add Customer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add/Edit Prize Modal */}
        {showPrizeModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  <i className="fa-solid fa-gift" style={{ marginRight: '12px', color: '#f59e0b' }}></i>
                  {editingPrize ? 'Edit Loyalty Prize' : 'Add New Loyalty Prize'}
                </h2>
                <button
                  onClick={() => {
                    setShowPrizeModal(false)
                    setEditingPrize(null)
                    resetPrizeForm()
                  }}
                  className={styles.modalCloseButton}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handlePrizeSubmit(); }}>
                <div className={styles.formGrid}>
                  <div>
                    <label className={styles.formLabel}>
                      Product *
                    </label>
                    <select
                      required
                      value={prizeFormData.product_id}
                      onChange={(e) => setPrizeFormData(prev => ({ ...prev, product_id: e.target.value }))}
                      className={styles.formInput}
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.product_id} value={product.product_id}>
                          {product.name} - {formatCurrency(product.price)} (Stock: {product.stock_quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={styles.formLabel}>
                      Points Required *
                    </label>
                    <input
                      type="number"
                      required
                      value={prizeFormData.points_required}
                      onChange={(e) => setPrizeFormData(prev => ({ ...prev, points_required: parseInt(e.target.value) || 0 }))}
                      placeholder="e.g., 250"
                      min="1"
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formGridSingle}>
                  <label className={styles.formCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={prizeFormData.is_active}
                      onChange={(e) => setPrizeFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                    <span className={styles.formCheckboxText}>Active (available for redemption)</span>
                  </label>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPrizeModal(false)
                      setEditingPrize(null)
                      resetPrizeForm()
                    }}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                  >
                    <i className="fa-solid fa-save"></i>
                    {editingPrize ? 'Update Prize' : 'Add Prize'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Loyalty Management Modal */}
        {showPointsModal && selectedCustomer && (
          <div className={styles.modalOverlay}>
            <div className={styles.pointsModalContent}>
              <div className={styles.modalHeader}>
                <h2 className={styles.pointsModalTitle}>
                  {selectedCustomer.name} - Loyalty Management
                </h2>
                <button
                  onClick={() => {
                    setShowPointsModal(false)
                    setSelectedCustomer(null)
                    setPointsToAdd('')
                    setPointsToRedeem('')
                    setCustomerTransactions([])
                  }}
                  className={styles.modalCloseButton}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              </div>

              {/* Current Status */}
              <div className={styles.statusGrid}>
                <div className={styles.statusItem}>
                  <div className={`${styles.statusValue} ${styles.statusValuePoints}`}>
                    {selectedCustomer.loyalty_points.toLocaleString()}
                  </div>
                  <div className={styles.statusLabel}>
                    Loyalty Points
                  </div>
                </div>
              </div>

              {/* Points Management */}
              <div style={{ marginBottom: '32px' }}>
                <h3 className={styles.sectionTitle}>
                  Loyalty Points Management
                </h3>
                
                <div className={styles.sectionGrid}>
                  <div className={styles.sectionItem}>
                    <label className={styles.sectionLabel}>
                      Add Points
                    </label>
                    <div className={styles.sectionInputGroup}>
                      <input
                        type="number"
                        value={pointsToAdd}
                        onChange={(e) => setPointsToAdd(e.target.value)}
                        placeholder="0"
                        min="0"
                        className={styles.sectionInput}
                      />
                      <button
                        onClick={() => handlePointsUpdate('add')}
                        disabled={!pointsToAdd || parseInt(pointsToAdd) <= 0}
                        className={`${styles.sectionButton} ${styles.sectionButtonAdd}`}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className={styles.sectionItem}>
                    <label className={styles.sectionLabel}>
                      Redeem Points
                    </label>
                    <div className={styles.sectionInputGroup}>
                      <input
                        type="number"
                        value={pointsToRedeem}
                        onChange={(e) => setPointsToRedeem(e.target.value)}
                        placeholder="0"
                        min="0"
                        max={selectedCustomer.loyalty_points}
                        className={styles.sectionInput}
                      />
                      <button
                        onClick={() => handlePointsUpdate('redeem')}
                        disabled={!pointsToRedeem || parseInt(pointsToRedeem) <= 0 || parseInt(pointsToRedeem) > selectedCustomer.loyalty_points}
                        className={`${styles.sectionButton} ${styles.sectionButtonRedeem}`}
                      >
                        Redeem
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Available Prizes */}
              {loyaltyPrizes.length > 0 && (
                <div style={{ marginTop: '32px' }}>
                  <h3 className={styles.sectionTitle}>
                    <i className="fa-solid fa-gift" style={{ color: '#8b5cf6' }}></i>
                    Available Prizes
                  </h3>
                  
                  <div className={styles.availablePrizesList}>
                    {loyaltyPrizes
                      .filter(prize => prize.is_active && prize.points_required <= selectedCustomer.loyalty_points)
                      .map((prize) => (
                        <div key={prize.prize_id} className={styles.availablePrize}>
                          <div className={styles.availablePrizeInfo}>
                            <div className={styles.availablePrizeName}>
                              {prize.product?.name}
                            </div>
                            <div className={styles.availablePrizeDetails}>
                              <span className={styles.availablePrizePrice}>
                                {formatCurrency(prize.product?.price || 0)}
                              </span>
                              <span className={styles.availablePrizePoints}>
                                {prize.points_required} points
                              </span>
                            </div>
                          </div>
                          <button
                            className={styles.redeemButton}
                            onClick={() => handlePrizeRedemption(prize)}
                            disabled={!prize.product || prize.product.stock_quantity <= 0}
                          >
                            {!prize.product || prize.product.stock_quantity <= 0 ? 'Out of Stock' : 'Redeem'}
                          </button>
                        </div>
                      ))}
                  </div>
                  
                  {loyaltyPrizes.filter(prize => prize.is_active && prize.points_required <= selectedCustomer.loyalty_points).length === 0 && (
                    <div className={styles.noAvailablePrizes}>
                      <i className="fa-solid fa-gift"></i>
                      <p>No prizes available with current points</p>
                    </div>
                  )}
                </div>
              )}

              {/* Transaction History Section */}
              <div style={{ marginTop: '32px' }}>
                <h3 className={styles.sectionTitle}>
                  <i className="fa-solid fa-history" style={{ color: '#6b7280' }}></i>
                  Transaction History
                </h3>
                
                {loadingTransactions ? (
                  <div className={styles.transactionLoading}>
                    <div className={styles.listSpinner}></div>
                    Loading transactions...
                  </div>
                ) : customerTransactions.length === 0 ? (
                  <div className={styles.noTransactionsFound}>
                    <i className="fa-solid fa-receipt"></i>
                    <p>No transactions found for this customer</p>
                  </div>
                ) : (
                  <div className={styles.transactionHistory}>
                    {customerTransactions.map((transaction) => (
                      <div 
                        key={transaction.sale_id} 
                        className={styles.transactionItem}
                        onClick={() => handleTransactionClick(transaction.sale_id)}
                      >
                        <div className={styles.transactionSimple}>
                          <div className={styles.transactionDate}>
                            {new Date(transaction.datetime).toLocaleDateString()} at {new Date(transaction.datetime).toLocaleTimeString()}
                          </div>
                          <div className={styles.transactionTotal}>
                            {formatCurrency(transaction.total_amount)}
                            <i className="fa-solid fa-chevron-right" style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280' }}></i>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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

export default CustomerLoyalty