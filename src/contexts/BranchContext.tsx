import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Branch {
  branch_id: number
  branch_name: string
  address: string
  phone: string
  manager_id?: number
  shop_image: string
  business_id: number
  active: boolean
  created_at: string
}

interface BranchContextType {
  selectedBranch: Branch | null
  selectedBranchId: number | null
  setSelectedBranch: (branch: Branch | null) => void
  loading: boolean
}

const BranchContext = createContext<BranchContextType | undefined>(undefined)

interface BranchProviderProps {
  children: ReactNode
}

export const BranchProvider = ({ children }: BranchProviderProps) => {
  const [selectedBranch, setSelectedBranchState] = useState<Branch | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load selected branch from localStorage on mount
    const branchId = localStorage.getItem('selected_branch_id')
    const branchName = localStorage.getItem('selected_branch_name')
    
    if (branchId && branchName) {
      // Create a minimal branch object from localStorage data
      setSelectedBranchState({
        branch_id: parseInt(branchId),
        branch_name: branchName,
        address: '', // These will be filled when we fetch from database
        phone: '',
        shop_image: 'shop1',
        business_id: 0, // Will be filled from auth context
        active: true,
        created_at: new Date().toISOString()
      })
    }
    setLoading(false)
  }, [])

  const setSelectedBranch = (branch: Branch | null) => {
    setSelectedBranchState(branch)
    if (branch) {
      localStorage.setItem('selected_branch_id', branch.branch_id.toString())
      localStorage.setItem('selected_branch_name', branch.branch_name)
    } else {
      localStorage.removeItem('selected_branch_id')
      localStorage.removeItem('selected_branch_name')
    }
  }

  const value: BranchContextType = {
    selectedBranch,
    selectedBranchId: selectedBranch?.branch_id ?? null,
    setSelectedBranch,
    loading
  }

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  )
}

export const useBranch = () => {
  const context = useContext(BranchContext)
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider')
  }
  return context
}
