import React, { useState } from 'react'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useRole } from '../contexts/RoleContext'
import { usePromotions } from '../hooks/usePromotions'
import { useProducts } from '../hooks/derived/useProducts'
import { Promotion, PromotionRequest } from '../types/multitenant'
import PageHeader from '../components/PageHeader'
import styles from './Promotions.module.css'

const Promotions: React.FC = () => {
  const { businessId } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const { hasPermission } = useRole()
  const { promotions, loading, error, createPromotion, updatePromotion, deletePromotion, togglePromotion, getPromotionStats } = usePromotions(businessId || null, selectedBranchId || null)
  const { products } = useProducts()

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
          className={styles.createButton}
        >
          <i className="fas fa-plus" />
          Create Promotion
        </button>
      </PageHeader>

      {/* Stats Summary */}
      <div className={styles.statsContainer}>
        <div className={styles.statItem}>
          <div className={`${styles.statIcon} ${styles.statIconActive}`}>
            <i className="fas fa-play"></i>
          </div>
          <div>
            <p className={styles.statLabel}>Active</p>
            <p className={styles.statValue}>
              {filteredPromotions.filter(p => {
                const now = new Date()
                const startDate = new Date(p.start_date)
                const endDate = new Date(p.end_date)
                return p.active && startDate <= now && endDate >= now
              }).length}
            </p>
          </div>
        </div>
        
        <div className={styles.statItem}>
          <div className={`${styles.statIcon} ${styles.statIconInactive}`}>
            <i className="fas fa-pause"></i>
          </div>
          <div>
            <p className={styles.statLabel}>Inactive</p>
            <p className={styles.statValue}>
              {filteredPromotions.filter(p => !p.active).length}
            </p>
          </div>
        </div>
        
        <div className={styles.statItem}>
          <div className={`${styles.statIcon} ${styles.statIconExpired}`}>
            <i className="fas fa-clock"></i>
          </div>
          <div>
            <p className={styles.statLabel}>Expired</p>
            <p className={styles.statValue}>
              {filteredPromotions.filter(p => {
                const now = new Date()
                const endDate = new Date(p.end_date)
                return endDate < now
              }).length}
            </p>
          </div>
        </div>
        
        <div className={styles.statItem}>
          <div className={`${styles.statIcon} ${styles.statIconUpcoming}`}>
            <i className="fas fa-calendar"></i>
          </div>
          <div>
            <p className={styles.statLabel}>Upcoming</p>
            <p className={styles.statValue}>
              {filteredPromotions.filter(p => {
                const now = new Date()
                const startDate = new Date(p.start_date)
                return startDate > now
              }).length}
            </p>
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
        <div className={styles.errorMessage}>
          <i className={`fas fa-exclamation-triangle ${styles.errorIcon}`} />
          {error}
          {error.includes('table not found') && (
            <div className={styles.errorDetails}>
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
        <div className={styles.promotionsHeader}>
          <h2 className={styles.promotionsTitle}>
            <i className={`fas fa-tags ${styles.promotionsTitleIcon}`}></i>
            All Promotions
            <span className={styles.promotionsCount}>
              {filteredPromotions.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <i className={`fas fa-spinner fa-spin ${styles.loadingSpinner}`} />
            <p className={styles.loadingText}>Loading promotions...</p>
          </div>
        ) : filteredPromotions.length === 0 && !error ? (
          <div className={styles.emptyContainer}>
            <i className={`fas fa-tags ${styles.emptyIcon}`} />
            <h3 className={styles.emptyTitle}>No promotions found</h3>
            <p className={styles.emptyText}>
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Create your first promotion to get started'
              }
            </p>
          </div>
        ) : (
          <div className={styles.promotionsGrid}>
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
                className={`${styles.promotionCard} ${isActive ? styles.promotionCardActive : isExpired ? styles.promotionCardExpired : ''}`}
              >
                {/* Status Badge */}
                <div className={styles.statusBadge}>
                  <span className={`${isActive ? styles.statusActive : isExpired ? styles.statusExpired : isUpcoming ? styles.statusUpcoming : styles.statusInactive}`}>
                    {isActive ? '🟢 Active' : isExpired ? '⚫ Expired' : isUpcoming ? '🔵 Upcoming' : '⚪ Inactive'}
                  </span>
                </div>

                {/* Promotion Name */}
                <h3 className={styles.promotionName}>
                  {promo.name}
                </h3>

                {/* Description */}
                {promo.description && (
                  <p className={styles.promotionDescription}>
                    {promo.description}
                  </p>
                )}

                {/* Discount Info */}
                <div className={styles.discountInfo}>
                  <div className={styles.discountValue}>
                    {promo.discount_type === 'percentage'
                      ? `${promo.discount_value}% OFF`
                      : `$${promo.discount_value.toFixed(2)} OFF`}
                  </div>
                  <div className={styles.discountScope}>
                    {promo.applies_to === 'all'
                      ? 'All Products'
                      : `${promo.products?.length || 0} Specific Products`}
                  </div>
                </div>

                {/* Dates */}
                <div className={styles.datesContainer}>
                  <div className={styles.dateBox}>
                    <div className={styles.dateLabel}>START</div>
                    <div className={styles.dateValue}>
                      {new Date(promo.start_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={styles.dateBox}>
                    <div className={styles.dateLabel}>END</div>
                    <div className={styles.dateValue}>
                      {new Date(promo.end_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Conditions */}
                {(promo.min_purchase_amount > 0 || promo.usage_limit) && (
                  <div className={styles.conditionsContainer}>
                    <div className={styles.conditionsTitle}>
                      CONDITIONS
                    </div>
                    {promo.min_purchase_amount > 0 && (
                      <div className={styles.conditionItem}>
                        <i className="fas fa-dollar-sign"></i>
                        Min. purchase: ${promo.min_purchase_amount.toFixed(2)}
                      </div>
                    )}
                    {promo.usage_limit && (
                      <div className={styles.conditionItem}>
                        <i className="fas fa-users"></i>
                        Usage: {promo.usage_count || 0}/{promo.usage_limit}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className={styles.actionsContainer}>
                  <button
                    onClick={() => handleEdit(promo)}
                    className={`${styles.actionButton} ${styles.actionButtonEdit}`}
                  >
                    <i className={`fas fa-edit ${styles.actionButtonIcon}`} /> Edit
                  </button>
                  <button
                    onClick={() => handleToggle(promo.promotion_id, promo.active)}
                    className={`${styles.actionButton} ${promo.active ? styles.actionButtonToggle : styles.actionButtonToggleActive}`}
                  >
                    <i className={`fas fa-${promo.active ? 'pause' : 'play'} ${styles.actionButtonIcon}`} />
                    {promo.active ? ' Pause' : ' Activate'}
                  </button>
                  <button
                    onClick={() => viewStats(promo)}
                    className={`${styles.actionButton} ${styles.actionButtonStats}`}
                  >
                    <i className={`fas fa-chart-line ${styles.actionButtonIcon}`} /> Stats
                  </button>
                  <button
                    onClick={() => handleDelete(promo.promotion_id)}
                    className={styles.actionButtonDelete}
                  >
                    <i className={`fas fa-trash ${styles.actionButtonIcon}`} />
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
        <div className={`${styles.modalOverlay} ${styles.open}`}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingPromotion ? 'Edit Promotion' : 'Create Promotion'}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                className={styles.closeButton}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalForm}>
              {/* Name */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Promotion Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Summer Sale 2025"
                  className={styles.formInput}
                />
              </div>

              {/* Description */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={2}
                  className={styles.formTextarea}
                />
              </div>

              {/* Discount Type & Value */}
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Discount Type *
                  </label>
                  <select
                    value={formData.discount_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_type: e.target.value as 'percentage' | 'fixed_amount' }))}
                    className={styles.formSelect}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed_amount">Fixed Amount ($)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Discount Value *
                  </label>
                  <input
                    type="number"
                    value={formData.discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                    min="0"
                    max={formData.discount_type === 'percentage' ? 100 : undefined}
                    step="0.01"
                    className={styles.formInput}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className={styles.formInput}
                  />
                </div>
              </div>

              {/* Applies To */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Applies To *
                </label>
                <select
                  value={formData.applies_to}
                  onChange={(e) => setFormData(prev => ({ ...prev, applies_to: e.target.value as 'all' | 'specific' }))}
                  className={styles.formSelect}
                >
                  <option value="all">All Products</option>
                  <option value="specific">Specific Products</option>
                </select>
              </div>

              {/* Product Selection (if specific) */}
              {formData.applies_to === 'specific' && (
                <div className={styles.productSelection}>
                  <label className={styles.productSelectionLabel}>
                    Select Products ({selectedProducts.length} selected)
                  </label>
                  {products.map(product => (
                    <label
                      key={product.product_id}
                      className={`${styles.productItem} ${selectedProducts.includes(product.product_id) ? styles.productItemSelected : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.product_id)}
                        onChange={() => toggleProduct(product.product_id)}
                      />
                      <span>{product.name} - ${product.price.toFixed(2)}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Optional Fields */}
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Min. Purchase ($)
                  </label>
                  <input
                    type="number"
                    value={formData.min_purchase_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_purchase_amount: Number(e.target.value) }))}
                    min="0"
                    step="0.01"
                    className={styles.formInput}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={formData.usage_limit || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value ? Number(e.target.value) : undefined }))}
                    min="0"
                    placeholder="Unlimited"
                    className={styles.formInput}
                  />
                </div>
              </div>

              {/* Max Discount */}
              {formData.discount_type === 'percentage' && (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    Max Discount Amount ($)
                  </label>
                  <input
                    type="number"
                    value={formData.max_discount_amount || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_discount_amount: e.target.value ? Number(e.target.value) : undefined }))}
                    min="0"
                    step="0.01"
                    placeholder="No limit"
                    className={styles.formInput}
                  />
                </div>
              )}

              {/* Active Toggle */}
              <label className={styles.formCheckbox}>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                />
                <span>Active Promotion</span>
              </label>

              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                className={styles.modalButtonSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
              >
                {editingPromotion ? 'Update Promotion' : 'Create Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {statsPromotion && (
        <div className={`${styles.modalOverlay} ${styles.open}`}
          onClick={() => setStatsPromotion(null)}
        >
          <div className={styles.statsModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {statsPromotion.name} - Statistics
              </h2>
              <button
                onClick={() => setStatsPromotion(null)}
                className={styles.closeButton}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            {statsPromotion.stats ? (
              <div className={styles.statsGrid}>
                <div className={styles.statItem}>
                  <div className={styles.statItemLabel}>Total Applications</div>
                  <div className={styles.statItemValue}>
                    {statsPromotion.stats.total_applications}
                  </div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statItemLabel}>Total Discount Given</div>
                  <div className={`${styles.statItemValue} ${styles.statItemValueDiscount}`}>
                    ${statsPromotion.stats.total_discount_given.toFixed(2)}
                  </div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statItemLabel}>Sales with Promotion</div>
                  <div className={styles.statItemValue}>
                    {statsPromotion.stats.total_sales}
                  </div>
                </div>
                <div className={styles.statItem}>
                  <div className={styles.statItemLabel}>Avg. Discount Per Sale</div>
                  <div className={styles.statItemValue}>
                    ${statsPromotion.stats.avg_discount_per_sale.toFixed(2)}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.statsLoading}>
                <i className={`fas fa-spinner fa-spin ${styles.statsSpinner}`} />
              </div>
            )}

            <div className={styles.modalFooter}>
              <button
                onClick={() => setStatsPromotion(null)}
                className={styles.statsCloseButton}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Promotions
