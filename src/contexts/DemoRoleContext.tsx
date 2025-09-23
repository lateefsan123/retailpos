import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from './DemoAuthContext'

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
    canLookupCustomers: true,
  },
  Owner: {
    canManageUsers: true,
    canManageProducts: true,
    canProcessSales: true,
    canViewReports: true,
    canChangeSettings: true,
    canUploadImages: true,
    canLookupProducts: true,
    canLookupCustomers: true,
  },
  Manager: {
    canManageUsers: false,
    canManageProducts: true,
    canProcessSales: true,
    canViewReports: true,
    canChangeSettings: false,
    canUploadImages: true,
    canLookupProducts: true,
    canLookupCustomers: true,
  },
  Cashier: {
    canManageUsers: false,
    canManageProducts: false,
    canProcessSales: true,
    canViewReports: false,
    canChangeSettings: false,
    canUploadImages: false,
    canLookupProducts: true,
    canLookupCustomers: true,
  },
}

interface RoleContextType {
  permissions: RolePermissions
  hasPermission: (permission: keyof RolePermissions) => boolean
  hasAnyPermission: (permissions: (keyof RolePermissions)[]) => boolean
  hasAllPermissions: (permissions: (keyof RolePermissions)[]) => boolean
  isAdmin: boolean
  isOwner: boolean
  isManager: boolean
  isCashier: boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export const useRole = () => {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return context
}

interface RoleProviderProps {
  children: ReactNode
}

export const RoleProvider = ({ children }: RoleProviderProps) => {
  const { user } = useAuth()
  
  // Get permissions based on user role
  const permissions = ROLE_PERMISSIONS[user?.role || 'Cashier'] || ROLE_PERMISSIONS.Cashier

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    return permissions[permission] || false
  }

  const hasAnyPermission = (permissionsList: (keyof RolePermissions)[]): boolean => {
    return permissionsList.some(permission => hasPermission(permission))
  }

  const hasAllPermissions = (permissionsList: (keyof RolePermissions)[]): boolean => {
    return permissionsList.every(permission => hasPermission(permission))
  }

  const isAdmin = user?.role === 'Admin'
  const isOwner = user?.role === 'Owner'
  const isManager = user?.role === 'Manager'
  const isCashier = user?.role === 'Cashier'

  const value: RoleContextType = {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isOwner,
    isManager,
    isCashier,
  }

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  )
}
