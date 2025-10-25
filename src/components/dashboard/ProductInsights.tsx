import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useBusinessId } from '../../hooks/useBusinessId'
import { useBranch } from '../../contexts/BranchContext'
import { formatCurrency } from '../../utils/currency'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts'

interface ProductInsight {
  product_id: string
  product_name: string
  category: string
  total_sales: number
  quantity_sold: number
  avg_price: number
  stock_quantity: number
  reorder_level: number
  last_sale_date: string
}

interface StockTrend {
  date: string
  stock_level: number
  sales: number
}

interface CategoryPerformance {
  category: string
  total_sales: number
  product_count: number
  avg_price: number
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))', 
  'hsl(var(--accent))',
  'hsl(var(--destructive))',
  'hsl(var(--muted))',
  'hsl(var(--ring))',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#f59e0b'
]

const ProductInsights = () => {
  const { businessId } = useBusinessId()
  const { selectedBranchId } = useBranch()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [insights, setInsights] = useState<ProductInsight[]>([])
  const [stockTrends, setStockTrends] = useState<StockTrend[]>([])
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'categories'>('overview')

  useEffect(() => {
    if (businessId && selectedBranchId) {
      fetchInsights()
    }
  }, [businessId, selectedBranchId])

  const fetchInsights = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch product insights
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          product_id,
          product_name,
          category,
          price,
          stock_quantity,
          reorder_level,
          is_weighted,
          price_per_unit
        `)
        .eq('business_id', businessId)
        .eq('branch_id', selectedBranchId)

      if (productsError) throw productsError

      // Fetch sales data for insights
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select(`
          product_id,
          quantity,
          unit_price,
          datetime
        `)
        .eq('business_id', businessId)
        .eq('branch_id', selectedBranchId)
        .gte('datetime', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

      if (salesError) throw salesError

      // Process insights data
      const insightsData: ProductInsight[] = products.map(product => {
        const productSales = sales.filter(sale => sale.product_id === product.product_id)
        const totalSales = productSales.reduce((sum, sale) => sum + (sale.quantity * sale.unit_price), 0)
        const quantitySold = productSales.reduce((sum, sale) => sum + sale.quantity, 0)
        const avgPrice = quantitySold > 0 ? totalSales / quantitySold : product.price || 0
        const lastSaleDate = productSales.length > 0 
          ? new Date(Math.max(...productSales.map(s => new Date(s.datetime).getTime()))).toISOString()
          : null

        return {
          product_id: product.product_id,
          product_name: product.product_name,
          category: product.category,
          total_sales: totalSales,
          quantity_sold: quantitySold,
          avg_price: avgPrice,
          stock_quantity: product.stock_quantity,
          reorder_level: product.reorder_level,
          last_sale_date: lastSaleDate || ''
        }
      })

      setInsights(insightsData)

      // Generate stock trends (mock data for demonstration)
      const trendsData: StockTrend[] = Array.from({ length: 30 }, (_, i) => {
        const date = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000)
        return {
          date: date.toISOString().split('T')[0],
          stock_level: Math.max(0, 100 - i * 2 + Math.random() * 10),
          sales: Math.floor(Math.random() * 20) + 5
        }
      })
      setStockTrends(trendsData)

      // Process category performance
      const categoryMap = new Map<string, CategoryPerformance>()
      insightsData.forEach(insight => {
        const existing = categoryMap.get(insight.category) || {
          category: insight.category,
          total_sales: 0,
          product_count: 0,
          avg_price: 0
        }
        existing.total_sales += insight.total_sales
        existing.product_count += 1
        existing.avg_price = (existing.avg_price + insight.avg_price) / 2
        categoryMap.set(insight.category, existing)
      })
      setCategoryPerformance(Array.from(categoryMap.values()).sort((a, b) => b.total_sales - a.total_sales))

    } catch (err) {
      console.error('Error fetching insights:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch insights')
    } finally {
      setLoading(false)
    }
  }

  const topProducts = useMemo(() => 
    insights.sort((a, b) => b.total_sales - a.total_sales).slice(0, 5), 
    [insights]
  )

  const lowStockProducts = useMemo(() => 
    insights.filter(p => p.stock_quantity <= p.reorder_level), 
    [insights]
  )

  const totalRevenue = useMemo(() => 
    insights.reduce((sum, p) => sum + p.total_sales, 0), 
    [insights]
  )

  const totalUnitsSold = useMemo(() => 
    insights.reduce((sum, p) => sum + p.quantity_sold, 0), 
    [insights]
  )

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: 'var(--shadow-card)'
        }}>
          <p style={{ 
            margin: '0 0 4px 0', 
            fontSize: '14px', 
            fontWeight: '600', 
            color: 'var(--text-primary)' 
          }}>
            {label}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ 
              margin: '0', 
              fontSize: '12px', 
              color: entry.color 
            }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '18px',
        padding: '24px',
        boxShadow: 'var(--shadow-card)',
        border: 'var(--border-primary)'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px' }}></i>
          <p style={{ margin: 0, fontSize: '14px' }}>Loading product insights...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: '18px',
        padding: '24px',
        boxShadow: 'var(--shadow-card)',
        border: 'var(--border-primary)'
      }}>
        <div style={{ textAlign: 'center', color: 'var(--error-text)' }}>
          <i className="fa-solid fa-exclamation-triangle" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
          <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '18px',
      padding: '24px',
      boxShadow: 'var(--shadow-card)',
      border: 'var(--border-primary)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: 'var(--bg-nested)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <i className="fa-solid fa-chart-line" style={{ fontSize: '18px', color: 'var(--text-primary)' }}></i>
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Product Insights
        </h3>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { key: 'overview', label: 'Overview', icon: 'fa-chart-pie' },
          { key: 'trends', label: 'Trends', icon: 'fa-chart-line' },
          { key: 'categories', label: 'Categories', icon: 'fa-tags' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: activeTab === tab.key ? 'var(--primary-color)' : 'var(--bg-card)',
              color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <i className={`fa-solid ${tab.icon}`} style={{ fontSize: '12px', marginRight: '6px' }}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '16px' 
          }}>
            <div style={{
              background: 'var(--bg-nested)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {formatCurrency(totalRevenue)}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Revenue</div>
            </div>
            <div style={{
              background: 'var(--bg-nested)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {totalUnitsSold}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Units Sold</div>
            </div>
            <div style={{
              background: 'var(--bg-nested)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {insights.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Products</div>
            </div>
            <div style={{
              background: 'var(--bg-nested)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--error-text)', marginBottom: '4px' }}>
                {lowStockProducts.length}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Low Stock</div>
            </div>
          </div>

          {/* Top Products Chart */}
          <div style={{ 
            height: '300px', 
            background: 'var(--bg-nested)', 
            borderRadius: '12px', 
            padding: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: 'var(--text-primary)', 
              margin: '0 0 16px 0' 
            }}>
              Top Performing Products
            </h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topProducts.map((p, i) => ({
                    name: p.product_name,
                    value: p.total_sales,
                    fill: CHART_COLORS[i % CHART_COLORS.length]
                  }))}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {topProducts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Stock Trends */}
          <div style={{ 
            height: '300px', 
            background: 'var(--bg-nested)', 
            borderRadius: '12px', 
            padding: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: 'var(--text-primary)', 
              margin: '0 0 16px 0' 
            }}>
              Stock Level Trends (30 Days)
            </h4>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stockTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-secondary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="var(--text-secondary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="stock_level" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Category Performance */}
          <div style={{ 
            height: '300px', 
            background: 'var(--bg-nested)', 
            borderRadius: '12px', 
            padding: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: 'var(--text-primary)', 
              margin: '0 0 16px 0' 
            }}>
              Category Performance
            </h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="category" 
                  stroke="var(--text-secondary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="var(--text-secondary)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categoryPerformance.map((category, index) => (
              <div
                key={category.category}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--bg-nested)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: CHART_COLORS[index % CHART_COLORS.length],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '12px',
                    flexShrink: 0
                  }}
                >
                  {category.category.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: 'var(--text-primary)', 
                    marginBottom: '2px'
                  }}>
                    {category.category}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{category.product_count} products</span>
                    <span style={{ fontWeight: '600' }}>{formatCurrency(category.total_sales)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductInsights
