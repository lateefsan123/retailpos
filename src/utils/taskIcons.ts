// Task Icons Utility
// Provides icon mapping and utilities for task categorization

export interface TaskIcon {
  id: string
  name: string
  icon: string
  color: string
  description: string
}

export const TASK_ICONS: TaskIcon[] = [
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: 'fa-solid fa-broom',
    color: '#10b981',
    description: 'Cleaning and maintenance tasks'
  },
  {
    id: 'inventory',
    name: 'Inventory',
    icon: 'fa-solid fa-boxes-stacked',
    color: '#3b82f6',
    description: 'Stock management and inventory tasks'
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    icon: 'fa-solid fa-wrench',
    color: '#f59e0b',
    description: 'Equipment and facility maintenance'
  },
  {
    id: 'delivery',
    name: 'Delivery',
    icon: 'fa-solid fa-truck',
    color: '#8b5cf6',
    description: 'Delivery and shipping tasks'
  },
  {
    id: 'customer-service',
    name: 'Customer Service',
    icon: 'fa-solid fa-headset',
    color: '#06b6d4',
    description: 'Customer support and service tasks'
  },
  {
    id: 'stock-check',
    name: 'Stock Check',
    icon: 'fa-solid fa-clipboard-check',
    color: '#84cc16',
    description: 'Stock counting and verification'
  },
  {
    id: 'pricing',
    name: 'Pricing',
    icon: 'fa-solid fa-tags',
    color: '#f97316',
    description: 'Price updates and pricing tasks'
  },
  {
    id: 'display',
    name: 'Display',
    icon: 'fa-solid fa-store',
    color: '#ec4899',
    description: 'Product display and merchandising'
  },
  {
    id: 'security',
    name: 'Security',
    icon: 'fa-solid fa-shield-halved',
    color: '#ef4444',
    description: 'Security and safety tasks'
  },
  {
    id: 'training',
    name: 'Training',
    icon: 'fa-solid fa-graduation-cap',
    color: '#6366f1',
    description: 'Training and development tasks'
  },
  {
    id: 'meeting',
    name: 'Meeting',
    icon: 'fa-solid fa-users',
    color: '#14b8a6',
    description: 'Meetings and team coordination'
  },
  {
    id: 'reporting',
    name: 'Reporting',
    icon: 'fa-solid fa-chart-line',
    color: '#0ea5e9',
    description: 'Reports and data analysis'
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: 'fa-solid fa-bullhorn',
    color: '#a855f7',
    description: 'Marketing and promotional tasks'
  },
  {
    id: 'sales',
    name: 'Sales',
    icon: 'fa-solid fa-handshake',
    color: '#22c55e',
    description: 'Sales and revenue tasks'
  },
  {
    id: 'admin',
    name: 'Admin',
    icon: 'fa-solid fa-cog',
    color: '#6b7280',
    description: 'Administrative tasks'
  }
]

export const getTaskIcon = (iconId: string): TaskIcon | undefined => {
  return TASK_ICONS.find(icon => icon.id === iconId)
}

export const getTaskIconElement = (iconId: string, className: string = '') => {
  const icon = getTaskIcon(iconId)
  if (!icon) {
    return {
      className: `fa-solid fa-circle ${className}`,
      style: { color: '#6b7280' },
      title: 'No icon'
    }
  }
  
  return {
    className: `${icon.icon} ${className}`,
    style: { color: icon.color },
    title: icon.description
  }
}

export const getTaskIconColor = (iconId: string): string => {
  const icon = getTaskIcon(iconId)
  return icon ? icon.color : '#6b7280'
}
