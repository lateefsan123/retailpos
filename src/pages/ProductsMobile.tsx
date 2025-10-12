import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { formatCurrency } from '../utils/currency'
import { useSuppliers } from '../hooks/useSuppliers'
import { useProductsData } from '../hooks/data/useProductsData'
import AddProductModal from '../components/modals/AddProductModal'
import { printBulkLabels } from '../utils/labelUtils'
import BranchSelector from '../components/BranchSelector'
import MobileBottomNav from '../components/MobileBottomNav'
import styles from './ProductsMobile.module.css'

interface Product {
  product_id: string
  name: string
  category: string
  price: number
  stock_quantity: number
  supplier_info: string
  reorder_level: number
  tax_rate: number
  image_url?: string
  last_updated: string
  weight_unit?: string | null
  price_per_unit?: number | null
  is_weighted?: boolean
  description?: string
  sku?: string
  barcode?: string | null
  sales_count?: number
  total_revenue?: number
  last_sold_date?: string
}

const ProductsMobile = () => {
  const navigate = useNavigate()
  const { businessId } = useBusinessId()
  const { selectedBranch, selectedBranchId } = useBranch()
  const { suppliers } = useSuppliers(businessId, selectedBranchId)
  const { data: productsData, isLoading, error, refetch } = useProductsData()
  const { user } = useAuth()
  const { theme } = useTheme()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showNav, setShowNav] = useState(false)
  const [showProductModal, setShowProductModal] = useState(false)
  const [showBranchSelector, setShowBranchSelector] = useState(false)
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const products = productsData?.products ?? []
  const categoriesFromData = productsData?.categories ?? []

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(categoriesFromData)).filter(Boolean)],
    [categoriesFromData]
  )

  const summaryStats = useMemo(() => {
    return products.reduce(
      (stats, product) => {
        stats.totalProducts += 1

        if (product.stock_quantity === 0) {
          stats.outOfStock += 1
        } else if (product.stock_quantity <= product.reorder_level) {
          stats.lowStock += 1
        } else {
          stats.inStock += 1
        }

        return stats
      },
      {
        totalProducts: 0,
        inStock: 0,
        lowStock: 0,
        outOfStock: 0
      }
    )
  }, [products])

  const filteredProducts = useMemo(() => {
    let filtered = products

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => product.category === selectedCategory)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [products, selectedCategory, searchQuery])

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) return { status: 'out', color: 'red', text: 'Out of Stock' }
    if (product.stock_quantity <= product.reorder_level) return { status: 'low', color: 'yellow', text: 'Low Stock' }
    return { status: 'in', color: 'green', text: 'In Stock' }
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'Beverages': '☕',
      'Food': '🥐',
      'Electronics': '📱',
      'Supplies': '📦',
      'default': '📦'
    }
    return icons[category] || icons.default
  }

  const getCategoryGradient = (category: string) => {
    const gradients: Record<string, string> = {
      'Beverages': 'from-amber-400 to-orange-500',
      'Food': 'from-pink-400 to-red-500',
      'Electronics': 'from-blue-400 to-purple-500',
      'Supplies': 'from-gray-400 to-gray-600',
      'default': 'from-gray-400 to-gray-600'
    }
    return gradients[category] || gradients.default
  }

  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
    setShowSearchSuggestions(value.length > 0)
  }

  const handleProductClick = (product: Product) => {
    // Navigate to product details or show modal
    // TODO: Implement product details navigation
  }

  const handlePrintLabels = () => {
    printBulkLabels(filteredProducts)
  }

  const handleAddProduct = () => {
    setShowProductModal(true)
  }

  const canSwitchBranches = user?.role?.toLowerCase() === 'owner'

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading products...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <p>Unable to load products.</p>
          <button onClick={() => refetch()} className={styles.retryButton}>Try Again</button>
        </div>
      </div>
    )
  }

  // Theme-aware background configuration
  const getBackgroundImage = () => {
    if (theme === 'light') {
      return 'url(/images/backgrounds/stribebg_white.png)'
    }
    return 'url(/images/backgrounds/stribebg.png)'
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      backgroundImage: getBackgroundImage(),
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      overflowX: 'hidden',
      overflowY: 'auto',
      paddingBottom: '80px'
    }}>
      {/* Slide-out Navigation Overlay */}
      <div className={`${styles.overlay} ${showNav ? styles.open : ''}`} onClick={() => setShowNav(false)}>
        <div className={`${styles.slideNav} ${showNav ? styles.open : ''}`}>
          <div className={styles.navHeader}>
            <div className={styles.navHeaderContent}>
              <h2 className={styles.navTitle}>Menu</h2>
              <button className={styles.closeNavBtn} onClick={() => setShowNav(false)}>
                <svg className={styles.closeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <nav className={styles.navContent}>
            <ul className={styles.navList}>
              <li>
                <button onClick={() => navigate('/dashboard-mobile')} className={styles.navItem}>
                  <svg className={styles.navIcon} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
                  </svg>
                  Dashboard
                </button>
              </li>
              <li>
                <button className={`${styles.navItem} ${styles.activeNavItem}`}>
                  <svg className={styles.navIcon} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"></path>
                  </svg>
                  Products
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button className={styles.menuBtn} onClick={() => setShowNav(true)}>
              <svg className={styles.menuIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
            <div>
              <h1 className={styles.title}>Products</h1>
              <p className={styles.subtitle}>Inventory Management</p>
            </div>
          </div>
          <div className={styles.branchBadgeWrapper}>
            <button
              type="button"
              className={styles.branchBadge}
              onClick={() => canSwitchBranches && setShowBranchSelector(true)}
              disabled={!canSwitchBranches}
              aria-disabled={!canSwitchBranches}
            >
              <span>{selectedBranch?.branch_name || 'Select Branch'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className={styles.statsSection}>
        <div className={styles.statsContainer}>
          <div className={`${styles.statCard} ${styles.statCardBlue}`}>
            <p className={styles.statLabel}>Total Products</p>
            <p className={styles.statValue}>{summaryStats.totalProducts}</p>
          </div>
          <div className={`${styles.statCard} ${styles.statCardGreen}`}>
            <p className={styles.statLabel}>In Stock</p>
            <p className={styles.statValue}>{summaryStats.inStock}</p>
          </div>
          <div className={`${styles.statCard} ${styles.statCardYellow}`}>
            <p className={styles.statLabel}>Low Stock</p>
            <p className={styles.statValue}>{summaryStats.lowStock}</p>
          </div>
          <div className={`${styles.statCard} ${styles.statCardRed}`}>
            <p className={styles.statLabel}>Out of Stock</p>
            <p className={styles.statValue}>{summaryStats.outOfStock}</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={styles.searchSection}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => setShowSearchSuggestions(searchQuery.length > 0)}
            onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
            className={styles.searchInput}
          />
          <svg className={styles.searchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          
          {/* Search Suggestions */}
          {showSearchSuggestions && (
            <div className={styles.searchSuggestions}>
              <div className={styles.suggestionsContent}>
                <div className={styles.suggestionsTitle}>Recent searches</div>
                <div className={styles.suggestionsList}>
                  <div className={styles.suggestionItem} onClick={() => handleSearchInput('Coffee beans')}>Coffee beans</div>
                  <div className={styles.suggestionItem} onClick={() => handleSearchInput('Electronics')}>Electronics</div>
                  <div className={styles.suggestionItem} onClick={() => handleSearchInput('Beverages')}>Beverages</div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Category Filter */}
        <div className={styles.categoryContainer}>
          {categories.map(category => (
            <button
              key={category}
              className={`${styles.categoryFilter} ${selectedCategory === category ? styles.activeCategory : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'all' ? 'All' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionsSection}>
        <button onClick={handleAddProduct} className={styles.addProductBtn}>
          <svg className={styles.addIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Add Product
        </button>
        <button onClick={handlePrintLabels} className={styles.printLabelsBtn}>
          <svg className={styles.printIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
          </svg>
        </button>
      </div>

      {/* Products List */}
      <div className={styles.productsList}>
        {filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No products found</p>
            {searchQuery && <p className={styles.emptyStateSub}>Try adjusting your search or filters</p>}
          </div>
        ) : (
          filteredProducts.map(product => {
            const stockStatus = getStockStatus(product)
            return (
              <div
                key={product.product_id}
                className={styles.productCard}
                onClick={() => handleProductClick(product)}
              >
                <div className={styles.productContent}>
                  <div className={styles.productIcon}>
                    {product.image_url ? (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className={styles.productImage}
                      />
                    ) : (
                      <div className={`${styles.productIconPlaceholder} ${styles[`gradient${product.category.replace(/\s+/g, '')}`]}`}>
                        <span className={styles.iconText}>{getCategoryIcon(product.category)}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.productInfo}>
                    <div className={styles.productHeader}>
                      <div className={styles.productDetails}>
                        <h3 className={styles.productName}>{product.name}</h3>
                        <p className={styles.productMeta}>SKU: {product.sku || 'N/A'} • {product.category}</p>
                        <p className={styles.productPrice}>{formatCurrency(product.price)}</p>
                      </div>
                      <div className={styles.stockInfo}>
                        <div className={styles.stockStatus}>
                          <div className={`${styles.stockDot} ${styles[`dot${stockStatus.color}`]}`}></div>
                          <span className={`${styles.stockText} ${styles[`text${stockStatus.color}`]}`}>{stockStatus.text}</span>
                        </div>
                        <p className={styles.stockQuantity}>{product.stock_quantity} units</p>
                      </div>
                    </div>
                    <div className={styles.productFooter}>
                      <div className={styles.productStats}>
                        <span>Sales: {product.sales_count || 0} • Revenue: {formatCurrency(product.total_revenue || 0)}</span>
                      </div>
                      <button className={styles.productArrow}>
                        <svg className={styles.arrowIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Bottom Navigation */}
      <MobileBottomNav />

      {/* Add Product Modal */}
      {showProductModal && (
        <AddProductModal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          onProductAdded={async () => {
            await refetch()
            setShowProductModal(false)
          }}
          suppliers={suppliers}
          businessId={businessId}
          branchId={selectedBranchId}
        />
      )}

      {showBranchSelector && canSwitchBranches && (
        <div className={styles.branchModalOverlay} onClick={() => setShowBranchSelector(false)}>
          <div className={styles.branchModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.branchModalHeader}>
              <div>
                <p className={styles.branchModalLabel}>Current Branch</p>
                <h2 className={styles.branchModalTitle}>{selectedBranch?.branch_name || 'Select Branch'}</h2>
              </div>
              <button
                type="button"
                className={styles.closeModalButton}
                onClick={() => setShowBranchSelector(false)}
                aria-label="Close"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className={styles.branchSelectorContainer}>
              {canSwitchBranches ? (
                <BranchSelector
                  showLabel={false}
                  size="sm"
                  onSelectBranch={() => setShowBranchSelector(false)}
                />
              ) : (
                <p className={styles.branchSelectorNotice}>Branch switching is not available for your role.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductsMobile
