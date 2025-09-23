import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useAuth } from './DemoAuthContext'
import { useBusiness } from './DemoBusinessContext'

interface StaffMember {
  user_id: number
  username: string
  role: string
  active: boolean
  icon: string
  business_id: number
  created_at: string
  employee_id?: string
  full_name?: string
  email?: string
  phone?: string
  hire_date?: string
  hourly_rate?: number
  permissions: string[]
}

interface StaffContextType {
  staff: StaffMember[]
  loading: boolean
  error: string | null
  refreshStaff: () => Promise<void>
  addStaff: (staffData: Omit<StaffMember, 'user_id' | 'created_at'>) => Promise<boolean>
  updateStaff: (staffId: number, updates: Partial<StaffMember>) => Promise<boolean>
  deleteStaff: (staffId: number) => Promise<boolean>
  verifyStaffPin: (staffId: number, pin: string) => Promise<boolean>
}

const StaffContext = createContext<StaffContextType | undefined>(undefined)

export const useStaff = () => {
  const context = useContext(StaffContext)
  if (context === undefined) {
    throw new Error('useStaff must be used within a StaffProvider')
  }
  return context
}

interface StaffProviderProps {
  children: ReactNode
}

export const StaffProvider = ({ children }: StaffProviderProps) => {
  const { user } = useAuth()
  const { currentBusinessId } = useBusiness()
  
  // Demo staff data
  const demoStaff: StaffMember[] = [
    {
      user_id: 1,
      username: 'demo@example.com',
      role: 'Admin',
      active: true,
      icon: 'lily',
      business_id: 1,
      created_at: new Date().toISOString(),
      employee_id: 'EMP001',
      full_name: 'Demo Admin',
      email: 'demo@example.com',
      phone: '+1 (555) 123-4567',
      hire_date: '2024-01-01',
      hourly_rate: 25.00,
      permissions: ['view_products', 'make_sales', 'manage_inventory', 'view_reports', 'manage_users']
    },
    {
      user_id: 2,
      username: 'cashier1@example.com',
      role: 'Cashier',
      active: true,
      icon: 'lily',
      business_id: 1,
      created_at: new Date().toISOString(),
      employee_id: 'EMP002',
      full_name: 'John Cashier',
      email: 'cashier1@example.com',
      phone: '+1 (555) 234-5678',
      hire_date: '2024-01-15',
      hourly_rate: 18.00,
      permissions: ['view_products', 'make_sales']
    },
    {
      user_id: 3,
      username: 'manager1@example.com',
      role: 'Manager',
      active: true,
      icon: 'lily',
      business_id: 1,
      created_at: new Date().toISOString(),
      employee_id: 'EMP003',
      full_name: 'Jane Manager',
      email: 'manager1@example.com',
      phone: '+1 (555) 345-6789',
      hire_date: '2024-02-01',
      hourly_rate: 22.00,
      permissions: ['view_products', 'make_sales', 'manage_inventory', 'view_reports']
    }
  ]

  const [staff, setStaff] = useState<StaffMember[]>(demoStaff)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchStaff = useCallback(async () => {
    if (!currentBusinessId) return

    setLoading(true)
    setError(null)
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300))
      setStaff(demoStaff)
    } catch (err) {
      setError('Failed to fetch staff data')
      console.error('Error fetching staff:', err)
    } finally {
      setLoading(false)
    }
  }, [currentBusinessId])

  const refreshStaff = useCallback(async () => {
    await fetchStaff()
  }, [fetchStaff])

  const addStaff = async (staffData: Omit<StaffMember, 'user_id' | 'created_at'>): Promise<boolean> => {
    try {
      const newStaff: StaffMember = {
        ...staffData,
        user_id: Math.max(...staff.map(s => s.user_id)) + 1,
        created_at: new Date().toISOString()
      }
      setStaff(prev => [...prev, newStaff])
      return true
    } catch (err) {
      console.error('Error adding staff:', err)
      return false
    }
  }

  const updateStaff = async (staffId: number, updates: Partial<StaffMember>): Promise<boolean> => {
    try {
      setStaff(prev => prev.map(s => s.user_id === staffId ? { ...s, ...updates } : s))
      return true
    } catch (err) {
      console.error('Error updating staff:', err)
      return false
    }
  }

  const deleteStaff = async (staffId: number): Promise<boolean> => {
    try {
      setStaff(prev => prev.filter(s => s.user_id !== staffId))
      return true
    } catch (err) {
      console.error('Error deleting staff:', err)
      return false
    }
  }

  const verifyStaffPin = async (staffId: number, pin: string): Promise<boolean> => {
    // Demo PIN verification - accept any 4-digit PIN
    return /^\d{4}$/.test(pin)
  }

  useEffect(() => {
    if (currentBusinessId) {
      fetchStaff()
    } else {
      setStaff([])
    }
  }, [currentBusinessId, fetchStaff])

  const value: StaffContextType = {
    staff,
    loading,
    error,
    refreshStaff,
    addStaff,
    updateStaff,
    deleteStaff,
    verifyStaffPin
  }

  return (
    <StaffContext.Provider value={value}>
      {children}
    </StaffContext.Provider>
  )
}
