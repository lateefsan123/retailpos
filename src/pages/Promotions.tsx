import React, { useState, useEffect } from 'react'
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
    promotion_type: 'standard',
    discount_type: 'percentage',
    discount_value: 0,
    quantity_required: undefined,
    quantity_reward: undefined,
    applies_to_categories: false,
    category_ids: [],
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)

  const canManagePromotions = hasPermission('canManageProducts') // You may want a separate permission

  // Reset form
  const resetForm = () => {
    setFormData({
      business_id: businessId || 0,
      branch_id: selectedBranchId || undefined,
      name: '',
      description: '',
      promotion_type: 'standard',
      discount_type: 'percentage',
      discount_value: 0,
      quantity_required: undefined,
      quantity_reward: undefined,
      applies_to_categories: false,
      category_ids: [],
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
    setSelectedCategories([])
    setEditingPromotion(null)
  }

  // Handle add/edit
  const handleSubmit = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      alert('Please fill in all required fields')
      return
    }

    // Validate based on promotion type
    if (formData.promotion_type === 'standard') {
      if (!formData.discount_value || formData.discount_value <= 0) {
        alert('Discount value must be greater than 0')
        return
      }

      if (formData.discount_type === 'percentage' && formData.discount_value > 100) {
        alert('Percentage discount cannot exceed 100%')
        return
      }
    } else if (formData.promotion_type === 'buy_x_discount') {
      if (!formData.quantity_required || formData.quantity_required <= 0) {
        alert('Buy quantity must be greater than 0')
        return
      }
      if (!formData.discount_value || formData.discount_value <= 0) {
        alert('Discount percentage must be greater than 0')
        return
      }
      if (formData.discount_value > 100) {
        alert('Discount percentage cannot exceed 100%')
        return
      }
    } else if (formData.promotion_type === 'buy_x_get_y_free') {
      if (!formData.quantity_required || formData.quantity_required <= 0) {
        alert('Buy quantity must be greater than 0')
        return
      }
      if (!formData.quantity_reward || formData.quantity_reward <= 0) {
        alert('Free quantity must be greater than 0')
        return
      }
    }

    // Validate applies to selection
    if (formData.applies_to === 'specific') {
      if (formData.applies_to_categories) {
        if (!selectedCategories.length) {
          alert('Please select at least one category')
          return
        }
      } else {
        if (!selectedProducts.length) {
          alert('Please select at least one product')
          return
        }
      }
    }

    const promotionData: PromotionRequest = {
      ...formData,
      product_ids: formData.applies_to === 'specific' ? selectedProducts : [],
      category_ids: formData.applies_to_categories ? selectedCategories : [],
      // For BOGO promotions, don't include discount_type and discount_value
      ...(formData.promotion_type === 'buy_x_get_y_free' && {
        discount_type: undefined,
        discount_value: undefined
      })
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
      promotion_type: promotion.promotion_type || 'standard',
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      quantity_required: promotion.quantity_required,
      quantity_reward: promotion.quantity_reward,
      applies_to_categories: promotion.applies_to_categories || false,
      category_ids: promotion.category_ids || [],
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
    setSelectedCategories(promotion.category_ids || [])
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

  // Toggle menu
  const toggleMenu = (promotionId: number) => {
    setActiveMenuId(activeMenuId === promotionId ? null : promotionId)
  }


  // Add click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      // Check if click is outside any hamburger menu
      if (!target.closest('.hamburgerMenu')) {
        setActiveMenuId(null)
      }
    }

    if (activeMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [activeMenuId])

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

  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(cat => cat !== category)
        : [...prev, category]
    )
  }

  // Get unique categories from products
  const getUniqueCategories = () => {
    const categories = new Set<string>()
    products.forEach(product => {
      if (product.category) {
        categories.add(product.category)
      }
    })
    return Array.from(categories).sort()
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

      {/* Stats Summary Cards */}
      <div className={styles.statsCardsContainer}>
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <i className="fas fa-play"></i>
          </div>
          <div className={styles.statCardContent}>
            <div className={styles.statCardValue}>
              {filteredPromotions.filter(p => {
                const now = new Date()
                const startDate = new Date(p.start_date)
                const endDate = new Date(p.end_date)
                return p.active && startDate <= now && endDate >= now
              }).length}
            </div>
            <div className={styles.statCardLabel}>Active</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <i className="fas fa-pause"></i>
          </div>
          <div className={styles.statCardContent}>
            <div className={styles.statCardValue}>
              {filteredPromotions.filter(p => !p.active).length}
            </div>
            <div className={styles.statCardLabel}>Inactive</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <i className="fas fa-clock"></i>
          </div>
          <div className={styles.statCardContent}>
            <div className={styles.statCardValue}>
              {filteredPromotions.filter(p => {
                const now = new Date()
                const endDate = new Date(p.end_date)
                return endDate < now
              }).length}
            </div>
            <div className={styles.statCardLabel}>Expired</div>
          </div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statCardIcon}>
            <i className="fas fa-calendar"></i>
          </div>
          <div className={styles.statCardContent}>
            <div className={styles.statCardValue}>
              {filteredPromotions.filter(p => {
                const now = new Date()
                const startDate = new Date(p.start_date)
                return startDate > now
              }).length}
            </div>
            <div className={styles.statCardLabel}>Upcoming</div>
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

            return (
              <div
                key={promo.promotion_id}
                className={`${styles.promotionCard} ${isActive ? styles.promotionCardActive : isExpired ? styles.promotionCardExpired : ''}`}
              >
                {/* Hamburger Menu - Top Right */}
                <div className={styles.cardHeader}>
                  <div className={`${styles.hamburgerMenu} hamburgerMenu`} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => toggleMenu(promo.promotion_id)}
                      className={styles.hamburgerButton}
                    >
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                    {activeMenuId === promo.promotion_id && (
                      <div className={styles.menuDropdown}>
                        <button
                          onClick={() => { handleEdit(promo); setActiveMenuId(null) }}
                          className={styles.menuItem}
                        >
                          <i className="fas fa-edit"></i>
                          Edit
                        </button>
                        <button
                          onClick={() => { handleToggle(promo.promotion_id, promo.active); setActiveMenuId(null) }}
                          className={styles.menuItem}
                        >
                          <i className={`fas fa-${promo.active ? 'pause' : 'play'}`}></i>
                          {promo.active ? 'Pause' : 'Activate'}
                        </button>
                        <button
                          onClick={() => { viewStats(promo); setActiveMenuId(null) }}
                          className={styles.menuItem}
                        >
                          <i className="fas fa-chart-line"></i>
                          Stats
                        </button>
                        <button
                          onClick={() => { handleDelete(promo.promotion_id); setActiveMenuId(null) }}
                          className={`${styles.menuItem} ${styles.menuItemDelete}`}
                        >
                          <i className="fas fa-trash"></i>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 1. Promotion Name */}
                <h3 className={styles.promotionName}>
                  {promo.name}
                </h3>

                {/* 2. Product Display for Specific Products */}
                {promo.applies_to === 'specific' && !promo.applies_to_categories && promo.products && promo.products.length > 0 && (
                  <div className={styles.productsSection}>
                    <div className={styles.productsGrid}>
                      {promo.products.slice(0, 4).map(product => (
                        <div key={product.product_id} className={styles.productCard}>
                          <div className={styles.productImage}>
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className={styles.productImageImg}
                              />
                            ) : (
                              <div className={styles.productImagePlaceholder}>
                                <i className="fas fa-box"></i>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {promo.products.length > 4 && (
                        <div className={styles.productCard}>
                          <div className={styles.productMore}>
                            <div className={styles.productMoreCount}>+{promo.products.length - 4}</div>
                            <div className={styles.productMoreText}>More Products</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Description */}
                {promo.description && (
                  <p className={styles.promotionDescription}>
                    {promo.description}
                  </p>
                )}

                {/* 4. Discount Info */}
                <div className={styles.discountInfo}>
                  <div className={styles.discountValue}>
                    {promo.promotion_type === 'buy_x_discount' && promo.quantity_required && promo.discount_value
                      ? `Buy ${promo.quantity_required}, Get ${promo.discount_value}% Off`
                      : promo.promotion_type === 'buy_x_get_y_free' && promo.quantity_required && promo.quantity_reward
                      ? `Buy ${promo.quantity_required}, Get ${promo.quantity_reward} Free`
                      : promo.discount_type === 'percentage'
                      ? `${promo.discount_value}% OFF`
                      : `$${promo.discount_value?.toFixed(2)} OFF`}
                  </div>
                  <div className={styles.discountScope}>
                    {promo.applies_to_categories && promo.category_ids
                      ? `Categories: ${promo.category_ids.join(', ')}`
                      : promo.applies_to === 'all'
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

              {/* Promotion Type */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Promotion Type *
                </label>
                <div className={styles.promotionTypeSelector}>
                  <label className={styles.promotionTypeOption}>
                    <input
                      type="radio"
                      name="promotion_type"
                      value="standard"
                      checked={formData.promotion_type === 'standard'}
                      onChange={(e) => setFormData(prev => ({ ...prev, promotion_type: e.target.value as any }))}
                    />
                    <span>Standard Discount</span>
                  </label>
                  <label className={styles.promotionTypeOption}>
                    <input
                      type="radio"
                      name="promotion_type"
                      value="buy_x_discount"
                      checked={formData.promotion_type === 'buy_x_discount'}
                      onChange={(e) => setFormData(prev => ({ ...prev, promotion_type: e.target.value as any }))}
                    />
                    <span>Buy X, Get Discount</span>
                  </label>
                  <label className={styles.promotionTypeOption}>
                    <input
                      type="radio"
                      name="promotion_type"
                      value="buy_x_get_y_free"
                      checked={formData.promotion_type === 'buy_x_get_y_free'}
                      onChange={(e) => setFormData(prev => ({ ...prev, promotion_type: e.target.value as any }))}
                    />
                    <span>Buy X, Get Y Free</span>
                  </label>
                </div>
              </div>

              {/* Standard Discount Fields */}
              {formData.promotion_type === 'standard' && (
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
                      value={formData.discount_value || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                      min="0"
                      max={formData.discount_type === 'percentage' ? 100 : undefined}
                      step="0.01"
                      className={styles.formInput}
                    />
                  </div>
                </div>
              )}

              {/* Buy X, Get Discount Fields */}
              {formData.promotion_type === 'buy_x_discount' && (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Buy Quantity *
                    </label>
                    <input
                      type="number"
                      value={formData.quantity_required || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity_required: Number(e.target.value) }))}
                      min="1"
                      step="1"
                      placeholder="e.g., 3"
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Discount Percentage *
                    </label>
                    <input
                      type="number"
                      value={formData.discount_value || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                      min="0"
                      max="100"
                      step="1"
                      placeholder="e.g., 20"
                      className={styles.formInput}
                    />
                  </div>
                </div>
              )}

              {/* Buy X, Get Y Free Fields */}
              {formData.promotion_type === 'buy_x_get_y_free' && (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Buy Quantity *
                    </label>
                    <input
                      type="number"
                      value={formData.quantity_required || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity_required: Number(e.target.value) }))}
                      min="1"
                      step="1"
                      placeholder="e.g., 2"
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      Get Free Quantity *
                    </label>
                    <input
                      type="number"
                      value={formData.quantity_reward || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity_reward: Number(e.target.value) }))}
                      min="1"
                      step="1"
                      placeholder="e.g., 1"
                      className={styles.formInput}
                    />
                  </div>
                </div>
              )}

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

              {/* Category Toggle */}
              {formData.applies_to === 'specific' && (
                <div className={styles.formGroup}>
                  <label className={styles.formCheckbox}>
                    <input
                      type="checkbox"
                      checked={formData.applies_to_categories}
                      onChange={(e) => setFormData(prev => ({ ...prev, applies_to_categories: e.target.checked }))}
                    />
                    <span>Apply to Product Categories</span>
                  </label>
                </div>
              )}

              {/* Product Selection (if specific) */}
              {formData.applies_to === 'specific' && !formData.applies_to_categories && (
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

              {/* Category Selection (if specific and categories) */}
              {formData.applies_to === 'specific' && formData.applies_to_categories && (
                <div className={styles.productSelection}>
                  <label className={styles.productSelectionLabel}>
                    Select Categories ({selectedCategories.length} selected)
                  </label>
                  {getUniqueCategories().map(category => (
                    <label
                      key={category}
                      className={`${styles.productItem} ${selectedCategories.includes(category) ? styles.productItemSelected : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category)}
                        onChange={() => toggleCategory(category)}
                      />
                      <span>{category}</span>
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
