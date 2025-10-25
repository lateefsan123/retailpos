import { useEffect, useMemo, useState } from 'react'
import { useProductAnalytics, ProductAnalytics } from '../../hooks/derived/useProductAnalytics'
import { formatCurrency } from '../../utils/currency'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, ChartContainer, ChartTooltipContent, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from '../ui'

type TimePeriod = 'today' | 'week' | 'month'

interface Props {
  activePeriod?: TimePeriod
  selectedDate?: Date
  embedded?: boolean
}

const CHART_COLORS = [
  '#FF6B7A', // Coral pink
  '#FFB366', // Orange
  '#FFD93D', // Golden yellow
  '#6BCF7F', // Green
  '#4D96FF', // Blue
  '#9B59B6', // Purple
  '#E74C3C', // Red
  '#1ABC9C'  // Turquoise
]

// Product List Component for Modal
const ProductList = ({ products, totalSalesValue }: { products: ProductAnalytics[], totalSalesValue: number }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {products.map((product, index) => {
        const percentage = totalSalesValue === 0 ? 0 : (product.total_sales / totalSalesValue) * 100
        const clampedPercentage = Math.min(Math.max(percentage, 0), 100)
        const roundedPercentage = Math.round(clampedPercentage * 10) / 10
        const displayPercentage = Number.isInteger(roundedPercentage) ? roundedPercentage.toFixed(0) : roundedPercentage.toFixed(1)
        const accentColor = CHART_COLORS[index % CHART_COLORS.length]
        
        return (
          <div
            key={product.product_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: 'var(--bg-nested)',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
              transition: 'all 0.2s ease'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: product.image_url ? 'transparent' : accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '12px',
                flexShrink: 0,
                overflow: 'hidden',
                position: 'relative'
              }}
            >
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.product_name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                  onError={(e) => {
                    // Fallback to numbered badge if image fails to load
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.style.background = accentColor
                      parent.textContent = `#${index + 1}`
                    }
                  }}
                />
              ) : (
                `#${index + 1}`
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 600, 
                color: 'var(--text-primary)', 
                marginBottom: '2px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {product.product_name}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: 'var(--text-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{product.quantity_sold} units</span>
                <span style={{ fontWeight: '600' }}>{formatCurrency(product.total_sales)}</span>
              </div>
            </div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: 'var(--text-primary)',
              background: 'var(--bg-card)',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)'
            }}>
              {displayPercentage}%
            </div>
          </div>
        )
      })}
    </div>
  )
}

const ProductAnalyticsSection = ({ activePeriod: externalPeriod, selectedDate, embedded = false }: Props) => {
  const { todayProducts, weekProducts, monthProducts, loading, error } = useProductAnalytics(selectedDate)
  const [activePeriod, setActivePeriod] = useState<TimePeriod>(externalPeriod ?? 'today')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie')

  useEffect(() => {
    if (externalPeriod) {
      setActivePeriod(externalPeriod)
    }
  }, [externalPeriod])

  const getProductsForPeriod = (period: TimePeriod): ProductAnalytics[] => {
    switch (period) {
      case 'today':
        return todayProducts
      case 'week':
        return weekProducts
      case 'month':
        return monthProducts
    }
  }

  const getPeriodLabel = (period: TimePeriod): string => {
    switch (period) {
      case 'today':
        if (selectedDate) {
          const today = new Date()
          const isToday = selectedDate.toDateString() === today.toDateString()
          return isToday ? 'Today' : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
        return 'Today'
      case 'week':
        return 'This Week'
      case 'month':
        return 'This Month'
    }
  }

  const periods: TimePeriod[] = ['today', 'week', 'month']
  
  const currentProducts = getProductsForPeriod(activePeriod)


  const topProducts = useMemo(() => currentProducts.slice(0, 5), [currentProducts])
  const totalSalesValue = useMemo(
    () => topProducts.reduce((sum, product) => sum + product.total_sales, 0),
    [topProducts]
  )

  // Prepare data for PieChart
  const chartData = useMemo(() => {
    return topProducts.map((product, index) => ({
      name: product.product_name,
      value: product.total_sales,
      color: CHART_COLORS[index % CHART_COLORS.length],
      percentage: totalSalesValue > 0 ? (product.total_sales / totalSalesValue) * 100 : 0
    }))
  }, [topProducts, totalSalesValue])

  if (loading) {
    return (
      <div
        className={embedded ? '' : 'dashboardCard'}
        style={embedded ? {} : {
          background: 'var(--bg-card)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
          border: 'var(--border-primary)'
        }}
      >
        <style>{`@keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}} .skeleton{background-image:linear-gradient(90deg,#e5e7eb 0px,#f3f4f6 40px,#e5e7eb 80px);background-size:600px 100%;animation:shimmer 1.2s infinite linear;border-radius:8px}`}</style>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div className="skeleton" style={{ width: '40px', height: '40px' }}></div>
          <div className="skeleton" style={{ width: '160px', height: '18px' }}></div>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <div className="skeleton" style={{ width: '80px', height: '28px' }}></div>
          <div className="skeleton" style={{ width: '100px', height: '28px' }}></div>
          <div className="skeleton" style={{ width: '100px', height: '28px' }}></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: '1px solid rgba(125,141,134,0.1)',
                borderRadius: '8px'
              }}
            >
              <div className="skeleton" style={{ width: '32px', height: '32px' }}></div>
              <div className="skeleton" style={{ width: '40px', height: '40px' }}></div>
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ width: '160px', height: '12px', marginBottom: '6px' }}></div>
                <div className="skeleton" style={{ width: '100px', height: '10px' }}></div>
              </div>
              <div className="skeleton" style={{ width: '70px', height: '14px' }}></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
        <div
          className={embedded ? '' : 'dashboardCard'}
          style={embedded ? {
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          } : {
            background: 'var(--bg-card)',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: 'var(--shadow-card)',
            border: 'var(--border-primary)',
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
        <div style={{ textAlign: 'center', color: 'var(--error-color)' }}>
          <i className="fa-solid fa-exclamation-triangle" style={{ fontSize: '24px', marginBottom: '8px' }}></i>
          <p style={{ margin: 0, fontSize: '14px' }}>{error}</p>
        </div>
      </div>
    )
  }

  console.log('ProductAnalyticsSection rendering:', { 
    topProducts: topProducts.length, 
    totalSalesValue, 
    isModalOpen,
    activePeriod,
    embedded,
    chartData: chartData.length
  })

  return (
    <>
      <style>{`
        .product-list-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .product-list-scroll::-webkit-scrollbar-track {
          background: var(--bg-nested);
          border-radius: 3px;
        }
        .product-list-scroll::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }
        .product-list-scroll::-webkit-scrollbar-thumb:hover {
          background: var(--text-secondary);
        }
      `}</style>
      <div
        className={embedded ? '' : 'dashboardCard'}
        style={embedded ? {} : {
          background: 'var(--bg-card)',
          borderRadius: '18px',
          padding: '24px',
          boxShadow: 'var(--shadow-card)',
          border: 'var(--border-primary)'
        }}
      >
       {/* Header */}
       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <div
             style={{
               width: '40px',
               height: '40px',
               borderRadius: '10px',
               background: 'var(--bg-nested)',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center'
             }}
           >
             <i className="fa-solid fa-chart-line" style={{ fontSize: '18px', color: 'var(--text-primary)' }}></i>
           </div>
           <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Top Products</h3>
         </div>
         
         {/* Chart Type Toggle */}
         <div style={{ display: 'flex', gap: '4px' }}>
           <button
             onClick={() => setChartType('pie')}
             style={{
               padding: '6px 10px',
               borderRadius: '6px',
               border: '1px solid #d1d5db',
               background: chartType === 'pie' ? '#7d8d86' : 'var(--bg-card)',
               color: chartType === 'pie' ? '#f1f0e4' : 'var(--text-secondary)',
               fontSize: '12px',
               fontWeight: 600,
               cursor: 'pointer',
               transition: 'all 0.2s ease',
               display: 'flex',
               alignItems: 'center',
               gap: '4px'
             }}
           >
             <i className="fa-solid fa-chart-pie" style={{ fontSize: '12px' }}></i>
           </button>
           <button
             onClick={() => setChartType('bar')}
             style={{
               padding: '6px 10px',
               borderRadius: '6px',
               border: '1px solid #d1d5db',
               background: chartType === 'bar' ? '#7d8d86' : 'var(--bg-card)',
               color: chartType === 'bar' ? '#f1f0e4' : 'var(--text-secondary)',
               fontSize: '12px',
               fontWeight: 600,
               cursor: 'pointer',
               transition: 'all 0.2s ease',
               display: 'flex',
               alignItems: 'center',
               gap: '4px'
             }}
           >
             <i className="fa-solid fa-chart-bar" style={{ fontSize: '12px' }}></i>
           </button>
         </div>
       </div>

       {/* Tabs */}
       <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {periods.map((periodKey) => (
          <button
            key={periodKey}
            onClick={() => setActivePeriod(periodKey)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: activePeriod === periodKey ? '#7d8d86' : 'var(--bg-card)',
              color: activePeriod === periodKey ? '#f1f0e4' : 'var(--text-secondary)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <i
              className={`fa-solid ${
                periodKey === 'today' ? 'fa-calendar-day' : periodKey === 'week' ? 'fa-calendar-week' : 'fa-calendar'
              }`}
              style={{ fontSize: '12px', marginRight: 6 }}
            ></i>
            {getPeriodLabel(periodKey)}
          </button>
        ))}
       </div>


       {/* Visualization + List */}
      {topProducts.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-primary)', padding: '16px' }}>
          No products for {getPeriodLabel(activePeriod)}
        </div>
      ) : (
         <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
             {totalSalesValue > 0 ? (
               chartType === 'pie' ? (
                 <>
                   <div style={{ height: '250px', width: '250px', margin: '0 auto' }}>
                     <PieChart width={250} height={250}>
                       <Pie
                         data={chartData}
                         cx="50%"
                         cy="50%"
                         dataKey="value"
                         nameKey="name"
                         stroke="0"
                         radius={[60, 100]}
                       >
                         {chartData.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={entry.color} />
                         ))}
                       </Pie>
                       <Tooltip 
                         content={({ active, payload }) => {
                           if (active && payload && payload.length) {
                             const data = payload[0].payload;
                             return (
                               <div style={{
                                 background: 'var(--bg-card)',
                                 border: '1px solid var(--border-color)',
                                 borderRadius: '8px',
                                 padding: '12px',
                                 boxShadow: 'var(--shadow-card)',
                                 fontSize: '14px',
                                 color: 'var(--text-primary)'
                               }}>
                                 <p style={{ margin: '0 0 4px 0', fontWeight: '600' }}>
                                   {data.name}
                                 </p>
                                 <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                   {formatCurrency(data.value)}
                                 </p>
                               </div>
                             );
                           }
                           return null;
                         }}
                       />
                     </PieChart>
                   </div>
                   <div style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '12px' }}>
                     Share of revenue · {getPeriodLabel(activePeriod)}
                   </div>
                   
                   {/* Pie Chart Legend */}
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '250px' }}>
                     {chartData.slice(0, 4).map((entry, index) => (
                       <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                         <div
                           style={{
                             width: '14px',
                             height: '14px',
                             borderRadius: '2px',
                             background: entry.color,
                             flexShrink: 0
                           }}
                         />
                         <span style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                           {entry.name}
                         </span>
                         <span style={{ color: 'var(--text-secondary)', marginLeft: 'auto' }}>
                           {entry.percentage.toFixed(1)}%
                         </span>
                       </div>
                     ))}
                     {chartData.length > 4 && (
                       <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '4px' }}>
                         +{chartData.length - 4} more in modal
                       </div>
                     )}
                   </div>
                 </>
               ) : (
                 <>
                   <div style={{ height: '300px', width: '100%' }}>
                     <ResponsiveContainer width="100%" height="100%">
                       <BarChart
                         data={chartData}
                         layout="vertical"
                         margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                       >
                         <YAxis
                           dataKey="name"
                           type="category"
                           tickLine={false}
                           tickMargin={10}
                           axisLine={false}
                           tick={{ fontSize: 12, fill: 'var(--text-primary)' }}
                         />
                         <XAxis 
                           dataKey="value" 
                           type="number" 
                           hide 
                         />
                         <Tooltip 
                           content={({ active, payload }) => {
                             if (active && payload && payload.length) {
                               const data = payload[0].payload;
                               return (
                                 <div style={{
                                   background: 'var(--bg-card)',
                                   border: '1px solid var(--border-color)',
                                   borderRadius: '8px',
                                   padding: '12px',
                                   boxShadow: 'var(--shadow-card)',
                                   fontSize: '14px',
                                   color: 'var(--text-primary)'
                                 }}>
                                   <p style={{ margin: '0 0 4px 0', fontWeight: '600' }}>
                                     {data.name}
                                   </p>
                                   <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                     {formatCurrency(data.value)}
                                   </p>
                                 </div>
                               );
                             }
                             return null;
                           }}
                         />
                         <Bar 
                           dataKey="value" 
                           layout="vertical" 
                           radius={5}
                         >
                           {chartData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={entry.color} />
                           ))}
                         </Bar>
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                   <div style={{ textAlign: 'center', color: 'var(--text-primary)', fontSize: '12px' }}>
                     Revenue by product · {getPeriodLabel(activePeriod)}
                   </div>
                 </>
               )
            ) : (
              <div style={{ color: 'var(--text-primary)', fontSize: '12px', padding: '16px', textAlign: 'center' }}>
                No revenue recorded in this period
              </div>
            )}
             
             {/* View All Products Button */}
             <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
               <DialogTrigger asChild>
                 <button
                   onClick={() => console.log('Button clicked!', { isModalOpen, topProducts: topProducts.length })}
                   style={{
                     padding: '12px 16px',
                     background: 'var(--bg-nested)',
                     border: '1px solid var(--border-color)',
                     borderRadius: '8px',
                     color: 'var(--text-primary)',
                     fontSize: '16px',
                     fontWeight: '600',
                     cursor: 'pointer',
                     transition: 'all 0.2s ease',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     gap: '8px'
                   }}
                   onMouseEnter={(e) => {
                     e.currentTarget.style.background = 'var(--bg-card)'
                     e.currentTarget.style.borderColor = 'var(--text-secondary)'
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.background = 'var(--bg-nested)'
                     e.currentTarget.style.borderColor = 'var(--border-color)'
                   }}
                 >
                   <i className="fa-solid fa-list" style={{ fontSize: '16px' }}></i>
                   View All Products ({topProducts.length})
                 </button>
               </DialogTrigger>
               <DialogContent style={{ maxWidth: '600px', maxHeight: '80vh', overflow: 'hidden' }}>
                 <DialogHeader>
                   <DialogTitle>
                     Top Products - {getPeriodLabel(activePeriod)}
                   </DialogTitle>
                 </DialogHeader>
                 <div className="product-list-scroll" style={{ 
                   maxHeight: '60vh', 
                   overflowY: 'auto',
                   paddingRight: '8px',
                   marginRight: '-8px'
                 }}>
                   <ProductList products={topProducts} totalSalesValue={totalSalesValue} />
                 </div>
               </DialogContent>
             </Dialog>
           </div>
        </div>
      )}
      </div>
    </>
  )
}

export default ProductAnalyticsSection
