import { useNavigate } from 'react-router-dom'
import { formatCurrency } from '../../utils/currency'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import ProductAnalyticsSection from './ProductAnalyticsSection'

type TimePeriod = 'today' | 'week' | 'month'

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

interface Props {
  activePeriod: TimePeriod
  selectedDate: Date
  recentTransactions: RecentTransaction[]
  onViewAllTransactions: (date: Date) => void
}

const TabbedInsightsSection = ({ 
  activePeriod, 
  selectedDate, 
  recentTransactions, 
  onViewAllTransactions 
}: Props) => {
  const navigate = useNavigate()

  const getTransactionsTitle = () => {
    switch (activePeriod) {
      case 'today': {
        const today = new Date()
        const isToday = selectedDate.toDateString() === today.toDateString()
        return isToday ? 'Recent Transactions' : `${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Transactions`
      }
      case 'week':
        return 'This Week Transactions'
      case 'month':
        return 'This Month Transactions'
      default:
        return 'Recent Transactions'
    }
  }

  const handleTransactionClick = (saleId: number) => {
    navigate(`/transaction/TXN-${saleId.toString().padStart(6, '0')}`, { 
      state: { from: location.pathname } 
    })
  }

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: 'var(--shadow-card)',
        border: 'var(--border-primary)'
      }}
    >
      <Tabs defaultValue="transactions" style={{ width: '100%' }}>
        <TabsList style={{ marginBottom: '20px' }}>
          <TabsTrigger value="transactions">
            <i className="fa-solid fa-clock" style={{ marginRight: '8px', fontSize: '14px' }}></i>
            {getTransactionsTitle()}
          </TabsTrigger>
          <TabsTrigger value="products">
            <i className="fa-solid fa-chart-line" style={{ marginRight: '8px', fontSize: '14px' }}></i>
            Top Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          {/* Recent Transactions Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div 
                  key={transaction.sale_id}
                  onClick={() => handleTransactionClick(transaction.sale_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    background: transaction.partial_payment ? 'var(--error-bg-light)' : 'var(--bg-card)',
                    borderRadius: '8px',
                    border: transaction.partial_payment ? 'var(--error-border)' : 'var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: transaction.partial_payment ? '#f59e0b' : (transaction.status === 'completed' ? '#10b981' : '#f59e0b'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <i className={`fa-solid ${transaction.partial_payment ? 'fa-exclamation' : (transaction.status === 'completed' ? 'fa-check' : 'fa-hourglass-half')}`} 
                       style={{ fontSize: '12px', color: 'white' }}></i>
                    {transaction.partial_payment && (
                      <div style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '-2px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#dc2626',
                        border: '1px solid white'
                      }}></div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: 'var(--text-primary)', 
                      margin: '0 0 2px 0' 
                    }}>
                      #TXN-{transaction.sale_id.toString().padStart(6, '0')}
                    </p>
                    <p style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-secondary)', 
                      margin: 0 
                    }}>
                      {transaction.items_count} item{transaction.items_count !== 1 ? 's' : ''} | {transaction.payment_method}
                      {transaction.partial_payment && (
                        <span style={{ 
                          color: '#dc2626', 
                          fontWeight: '600',
                          marginLeft: '8px'
                        }}>
                          • PARTIAL
                        </span>
                      )}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {transaction.partial_payment ? (
                      <div>
                        <p style={{ 
                          fontSize: '14px', 
                          fontWeight: '600', 
                          color: '#10b981', 
                          margin: '0 0 2px 0' 
                        }}>
                          {formatCurrency(transaction.partial_amount || 0)}
                        </p>
                        <p style={{ 
                          fontSize: '11px', 
                          color: 'var(--text-secondary)', 
                          margin: '0 0 2px 0',
                          fontWeight: '500'
                        }}>
                          of {formatCurrency((transaction.partial_amount || 0) + (transaction.remaining_amount || 0))}
                        </p>
                        <p style={{ 
                          fontSize: '10px', 
                          color: '#dc2626', 
                          margin: 0,
                          fontWeight: '600'
                        }}>
                          OWES: {formatCurrency(transaction.remaining_amount || 0)}
                        </p>
                      </div>
                    ) : (
                      <p style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: 'var(--text-primary)', 
                        margin: 0 
                      }}>
                        {formatCurrency(transaction.total_amount)}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '40px 20px', 
                color: 'var(--text-secondary)',
                fontSize: '14px'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'var(--bg-nested)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: 'var(--text-secondary)'
                }}>
                  <i className="fa-solid fa-receipt" style={{ fontSize: '32px' }}></i>
                </div>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                  No transactions found
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
                  Transactions will appear here when available
                </p>
              </div>
            )}
          </div>
          
          {/* View All Button */}
          {recentTransactions.length > 0 && (
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                onClick={() => onViewAllTransactions(selectedDate)}
                style={{
                  background: 'var(--text-primary)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                View All
              </button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products">
          {/* Top Products Content */}
          <ProductAnalyticsSection 
            activePeriod={activePeriod} 
            selectedDate={selectedDate} 
            embedded={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default TabbedInsightsSection
