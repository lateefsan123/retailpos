import React, { useState, useEffect } from 'react'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useRole } from '../contexts/RoleContext'
import { supabase } from '../lib/supabaseClient'
import { Voucher, VoucherRequest } from '../types/multitenant'
import PageHeader from '../components/PageHeader'
import styles from './Vouchers.module.css'
import BranchSelector from '../components/BranchSelector'

const Vouchers: React.FC = () => {
  const { businessId } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const { hasPermission } = useRole()
  
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  const [formData, setFormData] = useState<VoucherRequest>({
    business_id: businessId || 0,
    branch_id: selectedBranchId || undefined,
    name: '',
    description: '',
    points_cost: 0,
    discount_type: 'percentage',
    discount_value: 0,
    is_active: true
  })

  const canManageVouchers = hasPermission('canManageProducts')

  useEffect(() => {
    if (businessId) {
      fetchVouchers()
    }
  }, [businessId, selectedBranchId])

  const fetchVouchers = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('vouchers')
        .select('*')
        .eq('business_id', businessId || 0)
        .order('created_at', { ascending: false })

      if (selectedBranchId) {
        query = query.eq('branch_id', selectedBranchId)
      }

      const { data, error } = await query

      if (error) throw error
      setVouchers(data || [])
    } catch (err) {
      console.error('Error fetching vouchers:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch vouchers')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      business_id: businessId || 0,
      branch_id: selectedBranchId || undefined,
      name: '',
      description: '',
      points_cost: 0,
      discount_type: 'percentage',
      discount_value: 0,
      is_active: true
    })
    setEditingVoucher(null)
  }

  const handleSubmit = async () => {
    if (!formData.name || formData.points_cost <= 0 || formData.discount_value <= 0) {
      alert('Please fill in all required fields')
      return
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      alert('Percentage discount cannot exceed 100%')
      return
    }

    try {
      if (editingVoucher) {
        const { error } = await supabase
          .from('vouchers')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('voucher_id', editingVoucher.voucher_id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vouchers')
          .insert([formData])

        if (error) throw error
      }

      resetForm()
      setShowModal(false)
      fetchVouchers()
    } catch (err) {
      console.error('Error saving voucher:', err)
      setError(err instanceof Error ? err.message : 'Failed to save voucher')
    }
  }

  const handleDelete = async (voucherId: number) => {
    if (!confirm('Are you sure you want to delete this voucher?')) return

    try {
      const { error } = await supabase
        .from('vouchers')
        .delete()
        .eq('voucher_id', voucherId)

      if (error) throw error
      fetchVouchers()
    } catch (err) {
      console.error('Error deleting voucher:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete voucher')
    }
  }

  const handleToggleActive = async (voucher: Voucher) => {
    try {
      const { error } = await supabase
        .from('vouchers')
        .update({
          is_active: !voucher.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('voucher_id', voucher.voucher_id)

      if (error) throw error
      fetchVouchers()
    } catch (err) {
      console.error('Error toggling voucher status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update voucher')
    }
  }

  const handleEdit = (voucher: Voucher) => {
    setEditingVoucher(voucher)
    setFormData({
      business_id: voucher.business_id,
      branch_id: voucher.branch_id,
      name: voucher.name,
      description: voucher.description || '',
      points_cost: voucher.points_cost,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      is_active: voucher.is_active
    })
    setShowModal(true)
  }

  const filteredVouchers = vouchers.filter(voucher => {
    const matchesSearch = voucher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (voucher.description && voucher.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    if (filterStatus === 'active') return matchesSearch && voucher.is_active
    if (filterStatus === 'inactive') return matchesSearch && !voucher.is_active
    return matchesSearch
  })

  const activeVouchers = vouchers.filter(v => v.is_active).length
  const inactiveVouchers = vouchers.filter(v => !v.is_active).length

  if (loading) {
    return (
      <div className={styles.vouchersContainer}>
        <PageHeader title="Vouchers" subtitle="Create vouchers for customers to redeem with loyalty points" />
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading vouchers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.vouchersContainer}>
      <PageHeader title="Vouchers" subtitle="Create vouchers for customers to redeem with loyalty points">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <BranchSelector />
          {canManageVouchers && (
            <button
              onClick={() => { resetForm(); setShowModal(true) }}
              className={styles.createButton}
            >
              <i className="fas fa-plus" />
              Create Voucher
            </button>
          )}
        </div>
      </PageHeader>

      {/* Stats Summary Cards */}
      <div className={styles.statsCardsContainer}>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <i className="fas fa-ticket-alt"></i>
          </div>
          <div className={styles.statCardContent}>
            <div className={styles.statCardValue}>{vouchers.length}</div>
            <div className={styles.statCardLabel}>Total</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <i className="fas fa-check-circle"></i>
          </div>
          <div className={styles.statCardContent}>
            <div className={styles.statCardValue}>{activeVouchers}</div>
            <div className={styles.statCardLabel}>Active</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <i className="fas fa-pause-circle"></i>
          </div>
          <div className={styles.statCardContent}>
            <div className={styles.statCardValue}>{inactiveVouchers}</div>
            <div className={styles.statCardLabel}>Inactive</div>
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

      {/* Filters */}
      <div className={styles.filtersContainer}>
        <div className={styles.searchBar}>
          <i className="fa-solid fa-search"></i>
          <input
            type="text"
            placeholder="Search vouchers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className={styles.filterDropdown}>
          <button onClick={() => setShowFilterDropdown(!showFilterDropdown)} className={styles.filterButton}>
            <i className="fa-solid fa-filter"></i>
            {filterStatus === 'all' ? 'All Status' : filterStatus === 'active' ? 'Active Only' : 'Inactive Only'}
          </button>
          {showFilterDropdown && (
            <div className={styles.filterMenu}>
              <button onClick={() => { setFilterStatus('all'); setShowFilterDropdown(false) }}>All Status</button>
              <button onClick={() => { setFilterStatus('active'); setShowFilterDropdown(false) }}>Active Only</button>
              <button onClick={() => { setFilterStatus('inactive'); setShowFilterDropdown(false) }}>Inactive Only</button>
            </div>
          )}
        </div>
      </div>

      {/* Vouchers Grid */}
      {filteredVouchers.length > 0 ? (
        <div className={styles.vouchersGrid}>
          {filteredVouchers.map(voucher => (
            <div key={voucher.voucher_id} className={`${styles.voucherCard} ${voucher.is_active ? styles.voucherCardActive : ''}`}>
              <div className={styles.cardHeader}>
                <button
                  onClick={() => handleToggleActive(voucher)}
                  className={styles.statusButton}
                  style={{
                    backgroundColor: voucher.is_active ? '#10b981' : '#6b7280',
                    color: '#ffffff'
                  }}
                >
                  <i className={`fa-solid ${voucher.is_active ? 'fa-check-circle' : 'fa-pause-circle'}`}></i>
                </button>
              </div>

              <div className={styles.voucherContent}>
                <h3 className={styles.voucherName}>{voucher.name}</h3>
                {voucher.description && (
                  <p className={styles.voucherDescription}>{voucher.description}</p>
                )}
                
                <div className={styles.voucherDetails}>
                  <div className={styles.detailItem}>
                    <i className="fa-solid fa-star"></i>
                    <span><strong>{voucher.points_cost}</strong> points</span>
                  </div>
                  <div className={styles.detailItem}>
                    <i className="fa-solid fa-percent"></i>
                    <span>
                      {voucher.discount_type === 'percentage' 
                        ? `${voucher.discount_value}% off` 
                        : `€${voucher.discount_value} off`}
                    </span>
                  </div>
                </div>

                {canManageVouchers && (
                  <div className={styles.cardActions}>
                    <button onClick={() => handleEdit(voucher)} className={styles.actionButton}>
                      <i className="fa-solid fa-edit"></i> Edit
                    </button>
                    <button onClick={() => handleDelete(voucher.voucher_id)} className={styles.deleteButton}>
                      <i className="fa-solid fa-trash"></i> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyContainer}>
          <i className={`fa-solid fa-ticket-alt ${styles.emptyIcon}`}></i>
          <h3 className={styles.emptyTitle}>No vouchers found</h3>
          <p className={styles.emptyText}>
            {searchTerm ? 'Try adjusting your search or filters' : 'Create your first voucher to get started'}
          </p>
          {canManageVouchers && !searchTerm && (
            <button onClick={() => { resetForm(); setShowModal(true) }} className={styles.emptyButton}>
              <i className="fa-solid fa-plus"></i> Create Voucher
            </button>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && canManageVouchers && (
        <div className={styles.modalOverlay} onClick={() => { setShowModal(false); resetForm() }}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {editingVoucher ? 'Edit Voucher' : 'Create New Voucher'}
            </h2>
            
            <div className={styles.formRow}>
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., 20% Off Any Purchase"
              />
            </div>

            <div className={styles.formRow}>
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className={styles.formRow}>
              <label>Points Cost *</label>
              <input
                type="number"
                value={formData.points_cost}
                onChange={(e) => setFormData({ ...formData, points_cost: parseInt(e.target.value) || 0 })}
                placeholder="e.g., 100"
                min="1"
              />
            </div>

            <div className={styles.formRow}>
              <label>Discount Type *</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as 'percentage' | 'fixed_amount' })}
              >
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
              </select>
            </div>

            <div className={styles.formRow}>
              <label>Discount Value *</label>
              <input
                type="number"
                value={formData.discount_value}
                onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) || 0 })}
                placeholder={formData.discount_type === 'percentage' ? 'e.g., 20' : 'e.g., 5.00'}
                min="0"
                step="0.01"
              />
            </div>

            <div className={styles.formRow}>
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                Active
              </label>
            </div>

            <div className={styles.modalActions}>
              <button onClick={() => { setShowModal(false); resetForm() }} className={styles.cancelButton}>
                Cancel
              </button>
              <button onClick={handleSubmit} className={styles.saveButton}>
                {editingVoucher ? 'Update' : 'Create'} Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Vouchers
