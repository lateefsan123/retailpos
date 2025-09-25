import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useBranch } from '../contexts/BranchContext'
import { useBusinessId } from '../hooks/useBusinessId'
import { useAuth } from '../contexts/AuthContext'

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

interface BranchSelectorProps {
  className?: string
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const BranchSelector: React.FC<BranchSelectorProps> = ({ 
  className = '', 
  showLabel = true, 
  size = 'md' 
}) => {
  const { selectedBranch, selectedBranchId, setSelectedBranch, setSwitchingBranch, setSwitchingToBranch } = useBranch()
  const { businessId } = useBusinessId()
  const { user } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Only show branch selector for owners
  if (user?.role?.toLowerCase() !== 'owner') {
    return null
  }

  useEffect(() => {
    if (businessId) {
      fetchBranches()
    }
  }, [businessId])

  const fetchBranches = async () => {
    if (!businessId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', businessId)
        .eq('active', true)
        .order('branch_name')

      if (error) {
        console.error('Error fetching branches:', error)
        return
      }

      setBranches(data || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBranchSelect = (branch: Branch) => {
    setSelectedBranch(branch)
    setIsOpen(false)
    
    // Show loading screen for 3 seconds with branch name
    setSwitchingToBranch(branch.branch_name)
    setSwitchingBranch(true)
    
    setTimeout(() => {
      setSwitchingBranch(false)
      setSwitchingToBranch(null)
      
      // Show a brief success message after loading
      const toast = document.createElement('div')
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
      `
      toast.textContent = `Switched to ${branch.branch_name}`
      document.body.appendChild(toast)
      
      setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in'
        setTimeout(() => {
          document.body.removeChild(toast)
        }, 300)
      }, 2000)
    }, 1500) // 1.5 seconds
  }

  // Don't render if there's only one branch or no branches
  if (branches.length <= 1) {
    return null
  }

  // Size configurations
  const sizeConfig = {
    sm: {
      fontSize: '14px',
      padding: '6px 12px',
      iconSize: '16px'
    },
    md: {
      fontSize: '16px',
      padding: '8px 16px',
      iconSize: '20px'
    },
    lg: {
      fontSize: '18px',
      padding: '12px 20px',
      iconSize: '24px'
    }
  }

  const config = sizeConfig[size]

  return (
    <div style={{ position: 'relative', ...(className ? { className } : {}) }}>
      {showLabel && (
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '4px'
        }}>
          Current Branch
        </label>
      )}
      
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: config.fontSize,
            padding: config.padding,
            backgroundColor: '#ffffff',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#9ca3af'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = '#d1d5db'
            }
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6'
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#10b981',
              borderRadius: '50%'
            }}></div>
            <span style={{
              fontWeight: '500',
              color: '#111827',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {selectedBranch?.branch_name || 'Select Branch'}
            </span>
          </div>
          
          <svg
            style={{
              width: config.iconSize,
              height: config.iconSize,
              color: '#9ca3af',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 10
              }}
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              backgroundColor: '#ffffff',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              zIndex: 20,
              maxHeight: '240px',
              overflowY: 'auto'
            }}>
              {branches.map((branch) => (
                <button
                  key={branch.branch_id}
                  onClick={() => handleBranchSelect(branch)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    textAlign: 'left',
                    backgroundColor: branch.branch_id === selectedBranchId ? '#eff6ff' : 'transparent',
                    borderLeft: branch.branch_id === selectedBranchId ? '4px solid #3b82f6' : '4px solid transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (branch.branch_id !== selectedBranchId) {
                      e.currentTarget.style.backgroundColor = '#f9fafb'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (branch.branch_id !== selectedBranchId) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: branch.branch_id === selectedBranchId ? '#3b82f6' : '#d1d5db'
                  }}></div>
                  
                  <div style={{
                    flex: 1,
                    minWidth: 0
                  }}>
                    <div style={{
                      fontWeight: '500',
                      color: '#111827',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {branch.branch_name}
                    </div>
                    {branch.address && (
                      <div style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {branch.address}
                      </div>
                    )}
                  </div>
                  
                  {branch.branch_id === selectedBranchId && (
                    <svg 
                      style={{
                        width: '16px',
                        height: '16px',
                        color: '#3b82f6',
                        flexShrink: 0
                      }} 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add CSS for animations */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

export default BranchSelector
