import React, { useState, useEffect } from 'react'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useRole } from '../contexts/RoleContext'
import { usePromotions } from '../hooks/usePromotions'
import { useProducts } from '../hooks/derived/useProducts'
import { Promotion, PromotionRequest, Product } from '../types/multitenant'
import PageHeader from '../components/PageHeader'
import styles from './Promotions.module.css'

const Promotions: React.FC = () => {
  const { businessId } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const { hasPermission } = useRole()
  const { promotions, loading, error, createPromotion, updatePromotion, deletePromotion, togglePromotion, getPromotionStats } = usePromotions(businessId, selectedBranchId)
  const { products } = useProducts(businessId, selectedBranchId)

  const [showModal, setShowModal] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [statsPromotion, setStatsPromotion] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'expired'>('all')
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  const [formData, setFormData] = useState<PromotionRequest>({
    business_id: businessId || 0,
    branch_id: selectedBranchId || undefined,
    name: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    start_date: '',
    end_date: '',
    active: true,
    applies_to: 'all',
    min_purchase_amount: 0,
    max_discount_amount: undefined,
    usage_limit: undefined,
    product_ids: []
  })

  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  const canManagePromotions = hasPermission('canManageProducts') // You may want a separate permission

  // Reset form
  const resetForm = () => {
    setFormData({
      business_id: businessId || 0,
      branch_id: selectedBranchId || undefined,
      name: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      start_date: '',
      end_date: '',
      active: true,
      applies_to: 'all',
      min_purchase_amount: 0,
      max_discount_amount: undefined,
      usage_limit: undefined,
      product_ids: []
    })
    setSelectedProducts([])
    setEditingPromotion(null)
  }

  // Handle add/edit
  const handleSubmit = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields')
      return
    }

    if (formData.discount_value <= 0) {
      alert('Discount value must be greater than 0')
      return
    }

    if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
      alert('Percentage discount cannot exceed 100%')
      return
    }

    const promotionData: PromotionRequest = {
      ...formData,
      product_ids: formData.applies_to === 'specific' ? selectedProducts : []
    }

    const success = editingPromotion
      ? await updatePromotion(editingPromotion.promotion_id, promotionData)
      : await createPromotion(promotionData)

    if (success) {
      setShowModal(false)
      resetForm()
    }
  }

  // Handle edit
  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setFormData({
      business_id: promotion.business_id,
      branch_id: promotion.branch_id,
      name: promotion.name,
      description: promotion.description || '',
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      start_date: promotion.start_date.split('T')[0],
      end_date: promotion.end_date.split('T')[0],
      active: promotion.active,
      applies_to: promotion.applies_to,
      min_purchase_amount: promotion.min_purchase_amount,
      max_discount_amount: promotion.max_discount_amount,
      usage_limit: promotion.usage_limit,
      product_ids: promotion.products?.map(p => p.product_id) || []
    })
    setSelectedProducts(promotion.products?.map(p => p.product_id) || [])
    setShowModal(true)
  }

  // Handle delete
  const handleDelete = async (promotionId: number) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return
    await deletePromotion(promotionId)
  }

  // Handle toggle
  const handleToggle = async (promotionId: number, currentStatus: boolean) => {
    await togglePromotion(promotionId, !currentStatus)
  }

  // View stats
  const viewStats = async (promotion: Promotion) => {
    const stats = await getPromotionStats(promotion.promotion_id)
    setStatsPromotion({ ...promotion, stats })
  }

  // Filter promotions
  const filteredPromotions = promotions.filter(promo => {
    const matchesSearch = promo.name.toLowerCase().includes(searchTerm.toLowerCase())
    const now = new Date()
    const startDate = new Date(promo.start_date)
    const endDate = new Date(promo.end_date)
    
    let matchesStatus = true
    if (filterStatus === 'active') {
      matchesStatus = promo.active && startDate <= now && endDate >= now
    } else if (filterStatus === 'inactive') {
      matchesStatus = !promo.active
    } else if (filterStatus === 'expired') {
      matchesStatus = endDate < now
    }

    return matchesSearch && matchesStatus
  })

  // Toggle product selection
  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    )
  }

  if (!canManagePromotions) {
    return (
      <div className={styles.accessDenied}>
        <h2>Access Denied</h2>
        <p>You don't have permission to manage promotions.</p>
      </div>
    )
  }

  return (
    <div className={styles.promotionsContainer}>
      {/* Page Header */}
      <PageHeader
        title="Promotions & Discounts"
        subtitle="Create and manage promotional campaigns"
      >
        <button
          onClick={() => { resetForm(); setShowModal(true) }}
          style={{
            padding: '16px 32px',
            background: '#1a1a1a',
            color: '#f1f0e4',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(26, 26, 26, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#374151'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(26, 26, 26, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1a1a1a'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 26, 26, 0.15)'
          }}
        >
          <i className="fas fa-plus" />
          Create Promotion
        </button>
      </PageHeader>

      {/* Stats Summary */}
      <div style={{
        marginBottom: '40px'
      }}>
        {/* Stats Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginTop: '24px'
        }}>
          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #d1d5db',
            boxShadow: '0 2px 8px rgba(62, 63, 41, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#d1fae5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fas fa-play" style={{ fontSize: '18px', color: '#10b981' }}></i>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0', fontWeight: '500' }}>Active</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
                  {filteredPromotions.filter(p => {
                    const now = new Date()
                    const startDate = new Date(p.start_date)
                    const endDate = new Date(p.end_date)
                    return p.active && startDate <= now && endDate >= now
                  }).length}
                </p>
              </div>
            </div>
          </div>
          
          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #d1d5db',
            boxShadow: '0 2px 8px rgba(62, 63, 41, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fas fa-pause" style={{ fontSize: '18px', color: '#f59e0b' }}></i>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0', fontWeight: '500' }}>Inactive</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
                  {filteredPromotions.filter(p => !p.active).length}
                </p>
              </div>
            </div>
          </div>
          
          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #d1d5db',
            boxShadow: '0 2px 8px rgba(62, 63, 41, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fas fa-clock" style={{ fontSize: '18px', color: '#dc2626' }}></i>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0', fontWeight: '500' }}>Expired</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
                  {filteredPromotions.filter(p => {
                    const now = new Date()
                    const endDate = new Date(p.end_date)
                    return endDate < now
                  }).length}
                </p>
              </div>
            </div>
          </div>
          
          <div style={{
            background: '#ffffff',
            padding: '20px',
            borderRadius: '12px',
            border: '2px solid #d1d5db',
            boxShadow: '0 2px 8px rgba(62, 63, 41, 0.08)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <i className="fas fa-calendar" style={{ fontSize: '18px', color: '#3b82f6' }}></i>
              </div>
              <div>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 4px 0', fontWeight: '500' }}>Upcoming</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>
                  {filteredPromotions.filter(p => {
                    const now = new Date()
                    const startDate = new Date(p.start_date)
                    return startDate > now
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className={styles.searchFilterSection}>
        <div className={styles.searchFilterContainer}>
          <div className={styles.searchContainer}>
            <div className={styles.searchWrapper}>
              <input
                type="text"
                placeholder="Search promotions by name, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
              <i className={`fas fa-search ${styles.searchIcon}`}></i>
              <button
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={styles.filterButton}
              >
                <i className={`fas fa-sliders-h ${styles.filterIcon}`}></i>
                {filterStatus !== 'all' && (
                  <span className={styles.filterNotification}>
                    !
                  </span>
                )}
              </button>
            </div>
          </div>
          
          {/* Filter Dropdown */}
          {showFilterDropdown && (
            <div className={styles.filterDropdown}>
              <div className={styles.filterContent}>
                <label className={styles.filterLabel}>
                  Status:
                </label>
                <div className={styles.filterOptions}>
                  {[
                    { value: 'all', label: 'All', icon: 'fas fa-list' },
                    { value: 'active', label: 'Active', icon: 'fas fa-play' },
                    { value: 'inactive', label: 'Inactive', icon: 'fas fa-pause' },
                    { value: 'expired', label: 'Expired', icon: 'fas fa-clock' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setFilterStatus(option.value as any)}
                      className={`${styles.filterOption} ${filterStatus === option.value ? styles.filterOptionActive : ''}`}
                    >
                      <i className={`${option.icon} ${styles.filterOptionIcon}`}></i>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          background: '#fee2e2',
          border: '2px solid #dc2626',
          color: '#991b1b',
          padding: '16px',
          borderRadius: '12px',
          marginBottom: '24px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)'
        }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }} />
          {error}
          {error.includes('table not found') && (
            <div style={{ marginTop: '8px', fontSize: '14px' }}>
              <strong>To fix this:</strong>
              <br />
              1. Go to your Supabase dashboard
              <br />
              2. Open the SQL Editor
              <br />
              3. Run the contents of <code>promotions_system_migration.sql</code>
            </div>
          )}
        </div>
      )}

      {/* Promotions Section */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fas fa-tags" style={{ fontSize: '16px', color: '#7d8d86' }}></i>
            All Promotions
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              background: '#1a1a1a',
              padding: '4px 8px',
              borderRadius: '12px',
              marginLeft: '8px'
            }}>
              {filteredPromotions.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div style={{
            background: '#ffffff',
            padding: '60px',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
            border: '2px solid #d1d5db'
          }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#7c3aed', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', color: '#6b7280', margin: 0 }}>Loading promotions...</p>
          </div>
        ) : filteredPromotions.length === 0 && !error ? (
          <div style={{
            background: '#ffffff',
            padding: '60px',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
            border: '2px solid #d1d5db'
          }}>
            <i className="fas fa-tags" style={{ fontSize: '48px', color: '#7d8d86', marginBottom: '16px' }} />
            <h3 style={{ fontSize: '20px', color: '#1a1a1a', marginBottom: '8px', fontWeight: '600' }}>No promotions found</h3>
            <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px' }}>
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Create your first promotion to get started'
              }
            </p>
            {(!searchTerm && filterStatus === 'all') && (
              <button
                onClick={() => { resetForm(); setShowModal(true) }}
                style={{
                  padding: '12px 24px',
                  background: '#1a1a1a',
                  color: '#f1f0e4',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#374151'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#1a1a1a'
                }}
              >
                <i className="fas fa-plus" style={{ marginRight: '8px' }} />
                Create Your First Promotion
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
            gap: '24px'
          }}>
          {filteredPromotions.map(promo => {
            const now = new Date()
            const startDate = new Date(promo.start_date)
            const endDate = new Date(promo.end_date)
            const isActive = promo.active && startDate <= now && endDate >= now
            const isExpired = endDate < now
            const isUpcoming = startDate > now

            return (
              <div
                key={promo.promotion_id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '24px',
                  boxShadow: '0 4px 12px rgba(62, 63, 41, 0.1)',
                  border: `2px solid ${isActive ? '#1a1a1a' : isExpired ? '#dc2626' : '#d1d5db'}`,
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(62, 63, 41, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(62, 63, 41, 0.1)'
                }}
              >
                {/* Status Badge */}
                <div style={{ marginBottom: '12px' }}>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: isActive ? '#1a1a1a' : isExpired ? '#fee2e2' : isUpcoming ? '#dbeafe' : '#f3f4f6',
                    color: isActive ? '#ffffff' : isExpired ? '#991b1b' : isUpcoming ? '#1e40af' : '#1a1a1a',
                    border: `1px solid ${isActive ? '#1a1a1a' : isExpired ? '#dc2626' : isUpcoming ? '#3b82f6' : '#d1d5db'}`
                  }}>
                    {isActive ? '🟢 Active' : isExpired ? '⚫ Expired' : isUpcoming ? '🔵 Upcoming' : '⚪ Inactive'}
                  </span>
                </div>

                {/* Promotion Name */}
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '700', 
                  marginBottom: '8px', 
                  color: '#1a1a1a',
                  lineHeight: '1.3'
                }}>
                  {promo.name}
                </h3>

                {/* Description */}
                {promo.description && (
                  <p style={{ 
                    color: '#6b7280', 
                    fontSize: '14px', 
                    marginBottom: '16px',
                    lineHeight: '1.5'
                  }}>
                    {promo.description}
                  </p>
                )}

                {/* Discount Info */}
                <div style={{
                  background: '#f9fafb',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  border: '1px solid #e5e7eb',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '28px', 
                    fontWeight: '800', 
                    color: '#7c3aed',
                    marginBottom: '4px',
                    letterSpacing: '-0.02em'
                  }}>
                    {promo.discount_type === 'percentage'
                      ? `${promo.discount_value}% OFF`
                      : `$${promo.discount_value.toFixed(2)} OFF`}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#6b7280', 
                    fontWeight: '500'
                  }}>
                    {promo.applies_to === 'all'
                      ? 'All Products'
                      : `${promo.products?.length || 0} Specific Products`}
                  </div>
                </div>

                {/* Dates */}
                <div style={{ 
                  fontSize: '13px', 
                  color: '#6b7280', 
                  marginBottom: '16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px'
                }}>
                  <div style={{
                    padding: '8px',
                    background: '#f3f4f6',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '2px' }}>START</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a1a' }}>
                      {new Date(promo.start_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{
                    padding: '8px',
                    background: '#f3f4f6',
                    borderRadius: '6px',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '2px' }}>END</div>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a1a' }}>
                      {new Date(promo.end_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Conditions */}
                {(promo.min_purchase_amount > 0 || promo.usage_limit) && (
                  <div style={{
                    fontSize: '12px',
                    color: '#92400e',
                    padding: '12px',
                    background: '#fef3c7',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    border: '1px solid #f59e0b'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                      CONDITIONS
                    </div>
                    {promo.min_purchase_amount > 0 && (
                      <div style={{ marginBottom: '2px' }}>
                        <i className="fas fa-dollar-sign" style={{ marginRight: '4px' }}></i>
                        Min. purchase: ${promo.min_purchase_amount.toFixed(2)}
                      </div>
                    )}
                    {promo.usage_limit && (
                      <div>
                        <i className="fas fa-users" style={{ marginRight: '4px' }}></i>
                        Usage: {promo.usage_count || 0}/{promo.usage_limit}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleEdit(promo)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: '#f3f4f6',
                      color: '#1a1a1a',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e5e7eb'
                      e.currentTarget.style.borderColor = '#9ca3af'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f3f4f6'
                      e.currentTarget.style.borderColor = '#d1d5db'
                    }}
                  >
                    <i className="fas fa-edit" /> Edit
                  </button>
                  <button
                    onClick={() => handleToggle(promo.promotion_id, promo.active)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: promo.active ? '#fef3c7' : '#d1fae5',
                      color: promo.active ? '#92400e' : '#065f46',
                      border: `1px solid ${promo.active ? '#f59e0b' : '#10b981'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = promo.active ? '#fde68a' : '#a7f3d0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = promo.active ? '#fef3c7' : '#d1fae5'
                    }}
                  >
                    <i className={`fas fa-${promo.active ? 'pause' : 'play'}`} />
                    {promo.active ? ' Pause' : ' Activate'}
                  </button>
                  <button
                    onClick={() => viewStats(promo)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: '#f3f4f6',
                      color: '#1a1a1a',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e5e7eb'
                      e.currentTarget.style.borderColor = '#9ca3af'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f3f4f6'
                      e.currentTarget.style.borderColor = '#d1d5db'
                    }}
                  >
                    <i className="fas fa-chart-line" /> Stats
                  </button>
                  <button
                    onClick={() => handleDelete(promo.promotion_id)}
                    style={{
                      padding: '8px 12px',
                      background: '#fee2e2',
                      color: '#991b1b',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fecaca'
                      e.currentTarget.style.borderColor = '#f87171'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fee2e2'
                      e.currentTarget.style.borderColor = '#fecaca'
                    }}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              </div>
            )
          })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
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
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(125, 141, 134, 0.2)'
          }}>
            <h2 style={{ 
              marginBottom: '24px', 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#1a1a1a',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              {editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1a1a1a' }}>
                  Promotion Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Summer Sale 2025"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #1a1a1a',
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                    color: '#1a1a1a'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#1a1a1a'
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1a1a1a' }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #1a1a1a',
                    borderRadius: '8px',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    background: '#ffffff',
                    color: '#1a1a1a'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#1a1a1a'
                  }}
                />
              </div>

              {/* Discount Type & Value */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1a1a1a' }}>
                    Discount Type *
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value as 'percentage' | 'fixed_amount' }))}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #1a1a1a',
                      borderRadius: '8px',
                      fontSize: '15px',
                      cursor: 'pointer',
                      background: '#ffffff',
                      color: '#1a1a1a'
                    }}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#1a1a1a' }}>
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                    min="0"
                    max={formData.discount_type === 'percentage' ? 100 : undefined}
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #1a1a1a',
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box',
                      background: '#ffffff',
                      color: '#1a1a1a'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3b82f6'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#1a1a1a'
                    }}
                  />
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Applies To */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                  Applies To *
                </label>
                <select
                  value={formData.applies_to}
                  onChange={(e) => setFormData(prev => ({ ...prev, applies_to: e.target.value as 'all' | 'specific' }))}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '15px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Products</option>
                  <option value="specific">Specific Products</option>
                </select>
              </div>

              {/* Product Selection (if specific) */}
              {formData.applies_to === 'specific' && (
                <div style={{
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    Select Products ({selectedProducts.length} selected)
                  </label>
                  {products.map(product => (
                    <label
                      key={product.product_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        background: selectedProducts.includes(product.product_id) ? '#eff6ff' : 'transparent'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.product_id)}
                        onChange={() => toggleProduct(product.product_id)}
                        style={{ marginRight: '8px' }}
                      />
                      <span>{product.name} - ${product.price.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Optional Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    Min. Purchase ($)
                  </label>
                  <input
                    type="number"
                    value={formData.min_purchase_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_purchase_amount: Number(e.target.value) }))}
                    min="0"
                    step="0.01"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={formData.usage_limit || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value ? Number(e.target.value) : undefined }))}
                    min="0"
                    placeholder="Unlimited"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Max Discount */}
              {formData.discount_type === 'percentage' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                    Max Discount Amount ($)
                  </label>
                  <input
                    type="number"
                    value={formData.max_discount_amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_discount_amount: e.target.value ? Number(e.target.value) : undefined }))}
                    min="0"
                    step="0.01"
                    placeholder="No limit"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '15px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* Active Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                  style={{ marginRight: '8px' }}
                />
                <span style={{ fontWeight: '600' }}>Active Promotion</span>
              </label>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={handleSubmit}
                  style={{
                    flex: 1,
                    padding: '12px 24px',
                    background: '#1a1a1a',
                    color: '#f1f0e4',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#374151'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#1a1a1a'
                  }}
                >
                  {editingPromotion ? 'Update Promotion' : 'Create Promotion'}
                </button>
                <button
                  onClick={() => { setShowModal(false); resetForm() }}
                  style={{
                    padding: '12px 24px',
                    background: '#7d8d86',
                    color: '#f1f0e4',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#374151'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#7d8d86'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {statsPromotion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}
          onClick={() => setStatsPromotion(null)}
        >
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(125, 141, 134, 0.2)'
          }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ 
              marginBottom: '24px', 
              fontSize: '24px', 
              fontWeight: '600', 
              color: '#1a1a1a',
              paddingBottom: '16px',
              borderBottom: '1px solid #e5e7eb'
            }}>
              {statsPromotion.name} - Statistics
            </h2>

            {statsPromotion.stats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  padding: '16px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Applications</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>
                    {statsPromotion.stats.total_applications}
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Total Discount Given</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626' }}>
                    ${statsPromotion.stats.total_discount_given.toFixed(2)}
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Sales with Promotion</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>
                    {statsPromotion.stats.total_sales}
                  </div>
                </div>
                <div style={{
                  padding: '16px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Avg. Discount Per Sale</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>
                    ${statsPromotion.stats.avg_discount_per_sale.toFixed(2)}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#7c3aed' }} />
              </div>
            )}

            <button
              onClick={() => setStatsPromotion(null)}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: '#7d8d86',
                color: '#f1f0e4',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '600',
                width: '100%',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#374151'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#7d8d86'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Promotions
