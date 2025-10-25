import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

const Tabs = TabsPrimitive.Root

// Add CSS for active state styling
const tabsStyles = `
  [data-state="active"] {
    background: var(--bg-card) !important;
    color: var(--text-primary) !important;
    box-shadow: var(--shadow-card) !important;
  }
`

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ style, ...props }, ref) => (
  <>
    <style>{tabsStyles}</style>
    <TabsPrimitive.List
      ref={ref}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '40px',
        borderRadius: '8px',
        background: 'var(--bg-nested)',
        padding: '4px',
        border: '1px solid var(--border-color)',
        ...style
      }}
      {...props}
    />
  </>
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ style, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      whiteSpace: 'nowrap',
      borderRadius: '6px',
      padding: '6px 12px',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: 'none',
      outline: 'none',
      ...style
    }}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ style, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    style={{
      marginTop: '16px',
      outline: 'none',
      ...style
    }}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
