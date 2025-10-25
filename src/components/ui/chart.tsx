import * as React from "react"
import * as RechartsPrimitive from "recharts"

// Chart Container Component
interface ChartContainerProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ children, className, style, ...props }, ref) => (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '300px',
        ...style
      }}
      {...props}
    >
      {children}
    </div>
  )
)
ChartContainer.displayName = "ChartContainer"

// Chart Tooltip Content Component
interface ChartTooltipContentProps {
  active?: boolean
  payload?: any[]
  label?: string
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  ({ active, payload, label }, ref) => {
    if (active && payload && payload.length) {
      return (
        <div
          ref={ref}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: 'var(--shadow-card)',
            fontSize: '14px',
            color: 'var(--text-primary)'
          }}
        >
          <p style={{ margin: '0 0 4px 0', fontWeight: '600' }}>
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: '0', color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

// Re-export Recharts components for convenience
export {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend
} from "recharts"

export { ChartContainer, ChartTooltipContent }
