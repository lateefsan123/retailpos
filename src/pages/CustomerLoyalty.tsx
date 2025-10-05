import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useRole } from '../contexts/RoleContext'
import BranchSelector from '../components/BranchSelector'
import { Customer } from '../types/multitenant'
import { formatCurrency } from '../utils/currency'
import styles from './CustomerLoyalty.module.css'

interface CustomerRequest {
  business_id: number
  branch_id?: number
  name: string
  phone_number: string
  email?: string
  loyalty_points?: number
  credit_balance?: number
}

interface CustomerWithStats extends Customer {
  last_transaction_date?: string
  total_transactions: number
  total_spent: number
}

const CustomerLoyalty = () => {
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
  const [creditToAdd, setCreditToAdd] = useState('')
  const [creditToDeduct, setCreditToDeduct] = useState('')
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null)

  // Form state
  const [formData, setFormData] = useState<CustomerRequest>({
    business_id: businessId || 0,
    branch_id: selectedBranchId || undefined,
    name: '',
    phone_number: '',
    email: '',
    loyalty_points: 0,
    credit_balance: 0
  })

  // Check permissions
  const canManageCustomers = hasPermission('canProcessSales')

  useEffect(() => {
    if (!businessLoading && businessId) {
      fetchCustomers()
    }
  }, [businessId, businessLoading, selectedBranchId])

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
      loyalty_points: customer.loyalty_points,
      credit_balance: customer.credit_balance
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
      loyalty_points: 0,
      credit_balance: 0
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

  const handleCreditUpdate = async (type: 'add' | 'deduct') => {
    if (!selectedCustomer || !canManageCustomers) return

    const credit = type === 'add' ? parseFloat(creditToAdd) : -parseFloat(creditToDeduct)
    if (isNaN(credit) || credit === 0) return

    try {
      const newCredit = selectedCustomer.credit_balance + credit
      if (newCredit < 0) {
        setError('Cannot deduct more credit than customer has')
        return
      }

      const { error } = await supabase
        .from('customers')
        .update({ credit_balance: newCredit })
        .eq('customer_id', selectedCustomer.customer_id)

      if (error) throw error

      // Update local state
      setCustomers(prev => 
        prev.map(c => 
          c.customer_id === selectedCustomer.customer_id 
            ? { ...c, credit_balance: newCredit }
            : c
        )
      )

      // Reset form
      setCreditToAdd('')
      setCreditToDeduct('')
    } catch (err) {
      console.error('Error updating credit:', err)
      setError(err instanceof Error ? err.message : 'Failed to update credit')
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
              Manage customer information, loyalty points, and credit balances
            </p>
            <div className={styles.branchSelectorContainer}>
              <BranchSelector />
            </div>
          </div>
          
          <div className={styles.headerActions}>
            {canManageCustomers && (
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
          </div>
        </div>

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

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>
            <i className={`fa-solid fa-exclamation-triangle ${styles.errorIcon}`}></i>
            {error}
          </div>
        )}

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
                    <th className={styles.tableHeaderCell}>Last Transaction</th>
                    <th className={styles.tableHeaderCell}>Total Spent</th>
                    <th className={styles.tableHeaderCell}>Loyalty Points</th>
                    <th className={styles.tableHeaderCell}>Credit Balance</th>
                    {canManageCustomers && (
                      <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellCenter}`}>
                        Actions
                      </th>
                    )}
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
                          <span className={styles.pointsLabel}>points</span>
                          {customer.loyalty_points === 0 && (
                            <span className={styles.pointsMotivation}>
                              No points yet - reward this customer for their next purchase!
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                        <div className={styles.creditContainer}>
                          <span className={styles.creditValue}>
                            {formatCurrency(customer.credit_balance)}
                          </span>
                        </div>
                      </td>
                      {canManageCustomers && (
                        <td className={styles.tableCell}>
                          <div className={styles.actionButtons}>
                            <div className={styles.dropdownContainer}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActiveDropdown(activeDropdown === customer.customer_id ? null : customer.customer_id)
                                }}
                                className={styles.dropdownButton}
                              >
                                <i className="fa-solid fa-ellipsis-vertical"></i>
                              </button>
                              {activeDropdown === customer.customer_id && (
                                <div className={styles.dropdownMenu}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEdit(customer)
                                      setActiveDropdown(null)
                                    }}
                                    className={styles.dropdownItem}
                                  >
                                    <i className="fa-solid fa-cog"></i>
                                    Manage
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedCustomer(customer)
                                      setShowPointsModal(true)
                                      setActiveDropdown(null)
                                    }}
                                    className={styles.dropdownItem}
                                  >
                                    <i className="fa-solid fa-star"></i>
                                    Award Points
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      // TODO: Implement view history
                                      setActiveDropdown(null)
                                    }}
                                    className={styles.dropdownItem}
                                  >
                                    <i className="fa-solid fa-history"></i>
                                    View History
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
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
                  <div className={styles.formGrid}>
                    <div>
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

                    <div>
                      <label className={styles.formLabel}>
                        Credit Balance
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.credit_balance}
                        onChange={(e) => setFormData(prev => ({ ...prev, credit_balance: parseFloat(e.target.value) || 0 }))}
                        min="0"
                        className={styles.formInput}
                      />
                    </div>
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

        {/* Points & Credit Management Modal */}
        {showPointsModal && selectedCustomer && (
          <div className={styles.modalOverlay}>
            <div className={styles.pointsModalContent}>
              <div className={styles.modalHeader}>
                <h2 className={styles.pointsModalTitle}>
                  <i className="fa-solid fa-star" style={{ marginRight: '12px', color: '#f59e0b' }}></i>
                  {selectedCustomer.name} - Loyalty Management
                </h2>
                <button
                  onClick={() => {
                    setShowPointsModal(false)
                    setSelectedCustomer(null)
                    setPointsToAdd('')
                    setPointsToRedeem('')
                    setCreditToAdd('')
                    setCreditToDeduct('')
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
                <div className={styles.statusItem}>
                  <div className={`${styles.statusValue} ${styles.statusValueCredit}`}>
                    {formatCurrency(selectedCustomer.credit_balance)}
                  </div>
                  <div className={styles.statusLabel}>
                    Credit Balance
                  </div>
                </div>
              </div>

              {/* Points Management */}
              <div style={{ marginBottom: '32px' }}>
                <h3 className={styles.sectionTitle}>
                  <i className="fa-solid fa-star" style={{ color: '#f59e0b' }}></i>
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

              {/* Credit Management */}
              <div>
                <h3 className={styles.sectionTitle}>
                  <i className="fa-solid fa-credit-card" style={{ color: '#10b981' }}></i>
                  Credit Balance Management
                </h3>
                
                <div className={styles.sectionGrid}>
                  <div className={styles.sectionItem}>
                    <label className={styles.sectionLabel}>
                      Add Credit
                    </label>
                    <div className={styles.sectionInputGroup}>
                      <input
                        type="number"
                        step="0.01"
                        value={creditToAdd}
                        onChange={(e) => setCreditToAdd(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        className={styles.sectionInput}
                      />
                      <button
                        onClick={() => handleCreditUpdate('add')}
                        disabled={!creditToAdd || parseFloat(creditToAdd) <= 0}
                        className={`${styles.sectionButton} ${styles.sectionButtonAdd}`}
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className={styles.sectionItem}>
                    <label className={styles.sectionLabel}>
                      Deduct Credit
                    </label>
                    <div className={styles.sectionInputGroup}>
                      <input
                        type="number"
                        step="0.01"
                        value={creditToDeduct}
                        onChange={(e) => setCreditToDeduct(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        max={selectedCustomer.credit_balance}
                        className={styles.sectionInput}
                      />
                      <button
                        onClick={() => handleCreditUpdate('deduct')}
                        disabled={!creditToDeduct || parseFloat(creditToDeduct) <= 0 || parseFloat(creditToDeduct) > selectedCustomer.credit_balance}
                        className={`${styles.sectionButton} ${styles.sectionButtonRedeem}`}
                      >
                        Deduct
                      </button>
                    </div>
                  </div>
                </div>
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