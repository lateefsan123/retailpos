import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Package, Receipt, X } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency } from '../utils/currency'
import { useBusinessId } from '../hooks/useBusinessId'
import { useBranch } from '../contexts/BranchContext'
import { useAuth } from '../contexts/AuthContext'
import BranchSelector from '../components/BranchSelector'

import Navigation from '../components/Navigation'
import LowStockSection from '../components/dashboard/LowStockSection'
import ProductAnalyticsSection from '../components/dashboard/ProductAnalyticsSection'
import { useTransactions } from '../hooks/derived/useTransactions'

import styles from './DashboardMobile.module.css'

interface RecentTransaction {
  sale_id: number
  datetime: string
  total_amount: number
  payment_method: string
  items_count: number
  status: 'completed' | 'pending'
  partial_payment?: boolean
  partial_amount?: number
  remaining_amount?: number
  partial_notes?: string
}

const DashboardMobile = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { businessId, businessLoading } = useBusinessId()
  const { selectedBranchId, selectedBranch } = useBranch()
  const { user } = useAuth()
  
  const [showNav, setShowNav] = useState(false)
  const [showBranchSelector, setShowBranchSelector] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    todayNetRevenue: 0,
    todayRefunds: 0,
    todaySideBusinessRevenue: 0,
    todayTransactions: 0,
    lowStockItems: 0
  })
  const [loading, setLoading] = useState(true)
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [sideBusinessBreakdown, setSideBusinessBreakdown] = useState<Array<{
    business_id: number
    name: string
    image_url: string | null
    total_amount: number
  }>>([])
  const [selectedDate] = useState<Date>(new Date())
  const [activePeriod] = useState<'today' | 'week' | 'month'>('today')

  const canSwitchBranches = user?.role?.toLowerCase() === 'owner'

  // Use same hook as desktop for transactions
  const { transactions: hookTransactions } = useTransactions()
  const computedRecentTransactions = hookTransactions.slice(0, 5)
  const [chartData, setChartData] = useState<Array<{
    period: string
    revenue: number
  }>>([])
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setShowNav(false)
  }, [location.pathname])

  // Animate chart when chartData changes
  useEffect(() => {
    if (chartData.length > 0 && chartRef.current) {
      // Reset all bars to 0 width
      const bars = chartRef.current.querySelectorAll('[data-width]')
      bars.forEach(bar => {
        bar.style.width = '0%'
        bar.classList.remove('loaded')
      })

      // Animate bars after a short delay
      setTimeout(() => {
        bars.forEach(bar => {
          const width = bar.getAttribute('data-width')
          if (width) {
            bar.style.width = width
            setTimeout(() => bar.classList.add('loaded'), 800)
          }
        })
      }, 100)
    }
  }, [chartData])

  // No body scroll locking needed since we use bottom navigation

  // Fetch dashboard data
  useEffect(() => {
    if (businessLoading || !businessId) return

    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        // Fetch today's stats
        const today = new Date()
        const ymdLocal = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
        const todayStr = ymdLocal(today)

        // Today's sales
        let todaySalesQuery = supabase
          .from('sales')
          .select('total_amount, sale_id')
          .eq('business_id', businessId)
          .gte('datetime', `${todayStr}T00:00:00`)
          .lt('datetime', `${todayStr}T23:59:59`)
        
        if (selectedBranchId) {
          todaySalesQuery = todaySalesQuery.eq('branch_id', selectedBranchId)
        }

        const { data: todaySales } = await todaySalesQuery
        const todayRevenue = todaySales?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0
        const todayTransactions = todaySales?.length || 0

        // Today's refunds
        let todayRefundsQuery = supabase
          .from('refunds')
          .select('refund_amount')
          .eq('business_id', businessId)
          .gte('created_at', `${todayStr}T00:00:00`)
          .lt('created_at', `${todayStr}T23:59:59`)
        
        if (selectedBranchId) {
          todayRefundsQuery = todayRefundsQuery.eq('branch_id', selectedBranchId)
        }

        const { data: todayRefunds } = await todayRefundsQuery
        const totalRefunds = todayRefunds?.reduce((sum, refund) => sum + (refund.refund_amount || 0), 0) || 0

        // Recent transactions now come from hook; keep state in sync
        setRecentTransactions(computedRecentTransactions)

        // Side business breakdown - simplified query
        const { data: sideBusinessData, error: sideBusinessError } = await supabase
          .from('side_businesses')
          .select('business_id, name, image_url')
          .eq('business_id', businessId)

        if (sideBusinessError) {
          console.error('Error fetching side businesses:', sideBusinessError)
        }

        // Get side business sales separately
        let sideBusinessSalesQuery = supabase
          .from('sales')
          .select('side_business_id, total_amount')
          .eq('business_id', businessId)
          .gte('datetime', `${todayStr}T00:00:00Z`)
          .lt('datetime', `${todayStr}T23:59:59Z`)
        
        if (selectedBranchId) {
          sideBusinessSalesQuery = sideBusinessSalesQuery.eq('branch_id', selectedBranchId)
        }

        const { data: sideBusinessSales, error: sideBusinessSalesError } = await sideBusinessSalesQuery
        if (sideBusinessSalesError) {
          console.error('Error fetching side business sales:', sideBusinessSalesError)
        }

        if (sideBusinessData && sideBusinessSales) {
          const breakdown = sideBusinessData.map(sb => {
            const sales = sideBusinessSales
              .filter(sale => sale.side_business_id != null)
              .filter(sale => sale.side_business_id === sb.business_id)
            return {
              business_id: sb.business_id,
              name: sb.name,
              image_url: sb.image_url,
              total_amount: sales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0)
            }
          })
          setSideBusinessBreakdown(breakdown)
        }

        // Calculate side business revenue
        const sideBusinessRevenue = sideBusinessSales
          ?.filter(sale => sale.side_business_id != null)
          .reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0

        // Fetch chart data for the last 7 days
        const chartStartDate = new Date(today)
        chartStartDate.setDate(chartStartDate.getDate() - 6)
        
        let chartQuery = supabase
          .from('sales')
          .select('datetime, total_amount')
          .eq('business_id', businessId)
          .gte('datetime', chartStartDate.toISOString().split('T')[0])
          .lt('datetime', `${todayStr}T23:59:59`)
          .order('datetime', { ascending: true })
        
        if (selectedBranchId) {
          chartQuery = chartQuery.eq('branch_id', selectedBranchId)
        }

        const { data: chartSales, error: chartError } = await chartQuery
        if (chartError) {
          console.error('Error fetching chart data:', chartError)
        }

        // Process chart data by day
        if (chartSales) {
          const dailyData: { [key: string]: { revenue: number } } = {}
          
          // Initialize last 7 days
          for (let i = 6; i >= 0; i--) {
            const date = new Date(today)
            date.setDate(date.getDate() - i)
            const dateStr = date.toISOString().split('T')[0]
            dailyData[dateStr] = { revenue: 0 }
          }

          // Aggregate sales data
          chartSales.forEach(sale => {
            const saleDate = sale.datetime.split('T')[0]
            if (dailyData[saleDate]) {
              dailyData[saleDate].revenue += sale.total_amount || 0
            }
          })

          // Convert to array format
          const chartDataArray = Object.entries(dailyData).map(([date, data]) => ({
            period: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            revenue: data.revenue
          }))
          
          setChartData(chartDataArray)
        }

        // Update stats
        setStats(prev => ({
          ...prev,
          todayRevenue,
          todayNetRevenue: todayRevenue - totalRefunds,
          todayRefunds: totalRefunds,
          todayTransactions,
          todaySideBusinessRevenue: sideBusinessRevenue
        }))

      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [businessId, businessLoading, selectedBranchId, selectedDate])


  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <div className={styles.headerCopy}>
            <div>
              <h1 className={styles.title}>Dashboard</h1>
              <p className={styles.dateText}>{selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>
          <div className={styles.branch}>
            <button
              type="button"
              className={styles.branchButton}
              onClick={() => canSwitchBranches && setShowBranchSelector(true)}
              disabled={!canSwitchBranches}
              aria-disabled={!canSwitchBranches}
            >
              <span className={styles.title}>{selectedBranch?.branch_name || 'Main Branch'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats next */}

      <div className={styles.statsSection}>
        <h2 className={styles.sectionTitle}>Today's Overview</h2>
        <div className={styles.statsScroller}>
          <div className={`${styles.statCard} ${styles.accentRevenue}`}>
            <span className={styles.statLabel}>Today's Sales</span>
            <h3 className={styles.statValue}>
              {loading ? '...' : formatCurrency(stats.todayRevenue)}
            </h3>
            <p className={styles.statHelper}>
              +12% from yesterday
            </p>
          </div>
          
          <div className={`${styles.statCard} ${styles.accentNet}`}>
            <span className={styles.statLabel}>Net Sales</span>
            <h3 className={styles.statValue}>
              {loading ? '...' : formatCurrency(stats.todayNetRevenue)}
            </h3>
            <p className={styles.statHelper}>
              After refunds
            </p>
          </div>
          
          <div className={`${styles.statCard} ${styles.accentSide}`}>
            <span className={styles.statLabel}>Side Business</span>
            <h3 className={styles.statValue}>
              {loading ? '...' : formatCurrency(stats.todaySideBusinessRevenue)}
            </h3>
            <p className={styles.statHelper}>
              +8% this week
            </p>
          </div>
        </div>
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              Sales Overview (Last 7 Days)
            </h2>
          </div>
        </div>
        <div className={styles.chartContainer}>
          {loading ? (
            <div className={styles.emptyState}>Loading chart data...</div>
          ) : chartData.length > 0 ? (
            <div className={styles.salesChart} ref={chartRef}>
              {chartData.map((item, index) => {
                const maxRevenue = Math.max(...chartData.map(d => d.revenue))
                const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0
                const isLow = item.revenue < maxRevenue * 0.3
                
                return (
                  <div key={index} className={styles.dayItem}>
                    <div className={styles.dayLabel}>{item.period}</div>
                    <div className={styles.barContainer}>
                      <div 
                        className={`${styles.bar} ${isLow ? styles.barLow : styles.barHigh}`}
                        style={{ width: '0%' }}
                        data-width={`${percentage}%`}
                      >
                        {item.revenue > 0 && (
                          <span className={styles.amount}>
                            {formatCurrency(item.revenue)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>No chart data available</div>
          )}
          
          {/* Total Revenue Section */}
          {chartData.length > 0 && (
            <div className={styles.totalSection}>
              <span className={styles.totalLabel}>Total Revenue</span>
              <span className={styles.totalAmount}>
                {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0))}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Desktop sections reused - product analytics (Top Products) then Low Stock */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              Top Products
            </h2>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <ProductAnalyticsSection activePeriod={activePeriod} selectedDate={selectedDate} />
        </div>
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              Low Stock Alert
            </h2>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <LowStockSection />
        </div>
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              Recent Transactions
            </h2>
          </div>
          <button 
            className={styles.linkButton}
            onClick={() => navigate('/transactions-mobile')}
          >
            View All
          </button>
        </div>
        <div className={styles.sectionBody}>
          {loading ? (
            <div className={styles.emptyState}>Loading transactions...</div>
          ) : recentTransactions.length > 0 ? (
            <ul className={styles.transactionList}>
              {recentTransactions.map((transaction) => (
                <li key={transaction.sale_id} className={styles.transactionItem}>
                  <button 
                    className={styles.transactionButton}
                    onClick={() => {
                      setSelectedTransaction(transaction)
                      setShowTransactionModal(true)
                    }}
                  >
                    <div className={styles.transactionContent}>
                      <div className={`${styles.transactionIcon} ${
                        transaction.status === 'completed' 
                          ? styles.transactionIconComplete 
                          : styles.transactionIconPartial
                      }`}></div>
                      <div>
                        <div className={styles.transactionTitle}>
                          #{transaction.sale_id.toString().padStart(8, '0')}
                        </div>
                        <div className={styles.transactionMeta}>
                          {transaction.items_count} {transaction.items_count === 1 ? 'item' : 'items'} • {transaction.payment_method}
                        </div>
                      </div>
                    </div>
                    <div className={styles.transactionValue}>
                      {formatCurrency(transaction.total_amount)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              No recent transactions found
              <br />
              <small style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                Loading: {loading ? 'Yes' : 'No'} | Count: {recentTransactions.length}
              </small>
        </div>
      )}
        </div>
      </div>

      {/* Bottom navigation */}
      <nav className={styles.bottomNav} aria-label="Primary">
        <button
          type="button"
          className={`${styles.tabButton} ${location.pathname.startsWith('/dashboard-mobile') ? styles.tabActive : ''}`}
          onClick={() => navigate('/dashboard-mobile')}
          aria-current={location.pathname.startsWith('/dashboard-mobile') ? 'page' : undefined}
        >
          <Home size={22} aria-hidden="true" />
          <span className={styles.tabLabel}>Home</span>
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${location.pathname.startsWith('/products-mobile') ? styles.tabActive : ''}`}
          onClick={() => navigate('/products-mobile')}
          aria-current={location.pathname.startsWith('/products-mobile') ? 'page' : undefined}
        >
          <Package size={22} aria-hidden="true" />
          <span className={styles.tabLabel}>Products</span>
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${location.pathname.startsWith('/transactions-mobile') ? styles.tabActive : ''}`}
          onClick={() => navigate('/transactions-mobile')}
          aria-current={location.pathname.startsWith('/transactions-mobile') ? 'page' : undefined}
        >
          <Receipt size={22} aria-hidden="true" />
          <span className={styles.tabLabel}>Transactions</span>
        </button>
      </nav>

      {/* Branch Selector Modal */}
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
              <BranchSelector
                showLabel={false}
                size="sm"
                onSelectBranch={() => setShowBranchSelector(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {showTransactionModal && selectedTransaction && (
        <div className={styles.detailOverlay} onClick={() => setShowTransactionModal(false)} role="dialog" aria-modal="true">
          <div className={`${styles.detailModal} ${styles.detailModalOpen}`} onClick={(event) => event.stopPropagation()}>
            <div className={styles.detailHeader}>
              <div>
                <p className={styles.detailSubheading}>Transaction Details</p>
                <h2 className={styles.detailTitle}>#{selectedTransaction.sale_id.toString().padStart(6, '0')}</h2>
              </div>
              <button type="button" className={styles.closeDetailButton} onClick={() => setShowTransactionModal(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className={styles.detailBody}>
              <section className={styles.detailSection}>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Customer</span>
                  <span className={styles.detailValue}>{selectedTransaction.customer_name || 'Walk-in Customer'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Amount</span>
                  <span className={styles.detailValueStrong}>
                    {selectedTransaction.is_partial_payment
                      ? `${formatCurrency(selectedTransaction.partial_amount || 0)} paid · ${formatCurrency(selectedTransaction.remaining_amount || 0)} owed`
                      : formatCurrency(selectedTransaction.total_amount)}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Payment</span>
                  <span className={styles.detailValue}>{selectedTransaction.payment_method?.replace('_', ' ') || 'Unknown'}</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Status</span>
                  <span
                    className={`${styles.detailStatus} ${selectedTransaction.is_partial_payment ? styles.detailStatusPartial : styles.detailStatusComplete}`}
                  >
                    {selectedTransaction.is_partial_payment ? 'Partial Payment' : 'Completed'}
                  </span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Date</span>
                  <span className={styles.detailValue}>
                    {new Date(selectedTransaction.datetime).toLocaleString([], { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </section>

              <section className={styles.detailSection}>
                <h3 className={styles.detailSectionTitle}>Items Purchased</h3>
                <div className={styles.detailItems}>
                  {selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                    selectedTransaction.items.map((item: any) => (
                      <div key={`${item.sale_item_id}-${item.product_id}`} className={styles.detailItem}>
                        <div className={styles.detailItemAvatar}>
                          {item.products?.image_url ? (
                            <img 
                              src={item.products.image_url} 
                              alt={item.products?.name || 'Product'} 
                              className={styles.detailItemImage}
                            />
                          ) : (
                            <span>{item.products?.name?.charAt(0)?.toUpperCase() || '•'}</span>
                          )}
                        </div>
                        <div className={styles.detailItemInfo}>
                          <p className={styles.detailItemName}>{item.products?.name || 'Unknown Product'}</p>
                          <p className={styles.detailItemMeta}>
                            Qty: {item.quantity} x {formatCurrency(item.price_each)}
                            {item.weight && ` (${item.weight}g)`}
                          </p>
                        </div>
                        <span className={styles.detailItemAmount}>{formatCurrency(item.calculated_price)}</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.detailItem}>
                      <div className={styles.detailItemAvatar}>
                        <span>•</span>
                      </div>
                      <div className={styles.detailItemInfo}>
                        <p className={styles.detailItemName}>Transaction Items</p>
                        <p className={styles.detailItemMeta}>
                          Items for this sale are not available.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className={styles.detailSection}>
                <div className={styles.detailActions}>
                  <button
                    type="button"
                    className={styles.detailActionButton}
                    onClick={() => {
                      setShowTransactionModal(false)
                      navigate(`/transaction/${selectedTransaction.sale_id}`)
                    }}
                  >
                    Process Refund
                  </button>
                  <button
                    type="button"
                    className={styles.detailActionButton}
                    onClick={() => {
                      setShowTransactionModal(false)
                      navigate(`/sales?transaction=${selectedTransaction.sale_id}`)
                    }}
                  >
                    Edit Transaction
                  </button>
                  <button
                    type="button"
                    className={`${styles.detailActionButton} ${styles.detailDestructiveAction}`}
                    onClick={() => {
                      setShowTransactionModal(false)
                      // Handle delete action
                    }}
                  >
                    Delete Transaction
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardMobile
