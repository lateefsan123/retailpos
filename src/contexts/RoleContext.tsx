import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from './AuthContext'

// Define role permissions
export interface RolePermissions {
  canManageUsers: boolean
  canManageProducts: boolean
  canProcessSales: boolean
  canViewReports: boolean
  canChangeSettings: boolean
  canUploadImages: boolean
  canLookupProducts: boolean
  canLookupCustomers: boolean
}

// Role definitions
const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  Admin: {
    canManageUsers: true,
    canManageProducts: true,
    canProcessSales: true,
    canViewReports: true,
    canChangeSettings: true,
    canUploadImages: true,
    canLookupProducts: true,
    canLookupCustomers: true
  },
  Owner: {
    canManageUsers: true,
    canManageProducts: true,
    canProcessSales: true,
    canViewReports: true,
    canChangeSettings: true,
    canUploadImages: true,
    canLookupProducts: true,
    canLookupCustomers: true
  },
  Manager: {
    canManageUsers: false,
    canManageProducts: true,
    canProcessSales: true,
    canViewReports: true,
    canChangeSettings: false,
    canUploadImages: true,
    canLookupProducts: true,
    canLookupCustomers: true
  },
  Cashier: {
    canManageUsers: false,
    canManageProducts: false,
    canProcessSales: true,
    canViewReports: false,
    canChangeSettings: false,
    canUploadImages: false,
    canLookupProducts: true,
    canLookupCustomers: true
  }
}

interface RoleContextType {
  userRole: string
  permissions: RolePermissions
  hasPermission: (permission: keyof RolePermissions) => boolean
  canAccessRoute: (route: string) => boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

interface RoleProviderProps {
  children: ReactNode
}

export const RoleProvider = ({ children }: RoleProviderProps) => {
  const { user } = useAuth()
  
  // Get user role from localStorage or default to 'Cashier'
  const userRole = user?.role || 'Cashier'
  const permissions = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS.Cashier

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return permissions[permission] || false
  }

  const canAccessRoute = (route: string): boolean => {
    switch (route) {
      case '/admin':
        return hasPermission('canManageUsers')
      case '/products':
        return hasPermission('canManageProducts') || hasPermission('canLookupProducts')
      case '/sales':
        return hasPermission('canProcessSales')
      case '/customers':
        return hasPermission('canLookupCustomers')
      case '/':
        return true // Dashboard accessible to all
      default:
        return true
    }
  }

  const value: RoleContextType = {
    userRole,
    permissions,
    hasPermission,
    canAccessRoute
  }

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  )
}

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}
