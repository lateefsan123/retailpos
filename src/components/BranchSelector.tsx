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
  onSelectBranch?: () => void
}

const BranchSelector: React.FC<BranchSelectorProps> = ({ 
  className = '', 
  showLabel = true, 
  size = 'md',
  onSelectBranch
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
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast)
          }
        }, 300)
      }, 2000)
    }, 1500) // 1.5 seconds

    if (onSelectBranch) {
      onSelectBranch()
    }
  }

  // Don't render if there's only one branch or no branches
  if (branches.length <= 1) {
    return null
  }

  // Size configurations
  const sizeConfig = {
    sm: {
      fontSize: '14px',
      padding: '10px 16px',
      iconSize: '16px',
      height: '48px',
      background: '#ffffff',
      borderColor: '#d1d5db',
      textColor: '#111827',
      hoverBorder: '#9ca3af',
      focusBorder: '#3b82f6',
      focusShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
      badgeColor: '#10b981',
      chevronColor: '#9ca3af',
      dropdownBackground: '#ffffff',
      dropdownBorder: '#d1d5db',
      dropdownShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.12)',
      hoverBackground: '#f9fafb',
      activeBackground: '#eff6ff',
      activeBorder: '#60a5fa',
      addressColor: '#6b7280'
    },
    md: {
      fontSize: '16px',
      padding: '12px 18px',
      iconSize: '20px',
      height: '52px',
      background: '#ffffff',
      borderColor: '#d1d5db',
      textColor: '#111827',
      hoverBorder: '#9ca3af',
      focusBorder: '#3b82f6',
      focusShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
      badgeColor: '#10b981',
      chevronColor: '#9ca3af',
      dropdownBackground: '#ffffff',
      dropdownBorder: '#d1d5db',
      dropdownShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.12)',
      hoverBackground: '#f9fafb',
      activeBackground: '#eff6ff',
      activeBorder: '#60a5fa',
      addressColor: '#6b7280'
    },
    lg: {
      fontSize: '18px',
      padding: '14px 22px',
      iconSize: '24px',
      height: '56px',
      background: '#ffffff',
      borderColor: '#d1d5db',
      textColor: '#111827',
      hoverBorder: '#9ca3af',
      focusBorder: '#3b82f6',
      focusShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
      badgeColor: '#10b981',
      chevronColor: '#9ca3af',
      dropdownBackground: '#ffffff',
      dropdownBorder: '#d1d5db',
      dropdownShadow: '0 24px 48px -18px rgba(15, 23, 42, 0.15)',
      hoverBackground: '#f9fafb',
      activeBackground: '#eff6ff',
      activeBorder: '#60a5fa',
      addressColor: '#6b7280'
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
          color: 'var(--text-secondary)',
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
            height: config.height,
            backgroundColor: config.background,
            border: `1px solid ${config.borderColor}`,
            borderRadius: '14px',
            color: config.textColor,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = config.hoverBorder
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = config.borderColor
            }
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = config.focusBorder
            e.currentTarget.style.boxShadow = config.focusShadow
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = config.borderColor
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
              backgroundColor: config.badgeColor,
              borderRadius: '50%'
            }}></div>
            <span style={{
              fontWeight: '500',
              color: config.textColor,
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
              color: config.chevronColor,
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
              backgroundColor: config.dropdownBackground,
              border: `1px solid ${config.dropdownBorder}`,
              borderRadius: '16px',
              boxShadow: config.dropdownShadow,
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
                    backgroundColor: branch.branch_id === selectedBranchId
                      ? config.activeBackground
                      : 'transparent',
                    borderLeft: branch.branch_id === selectedBranchId
                      ? `4px solid ${config.activeBorder}`
                      : '4px solid transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease, color 0.15s ease',
                    color: branch.branch_id === selectedBranchId ? config.textColor : '#111827'
                  }}
                  onMouseEnter={(e) => {
                    if (branch.branch_id !== selectedBranchId) {
                      e.currentTarget.style.backgroundColor = config.hoverBackground
                      e.currentTarget.style.color = '#111827'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (branch.branch_id !== selectedBranchId) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                      e.currentTarget.style.color = config.textColor
                    }
                  }}
                >
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: branch.branch_id === selectedBranchId
                      ? config.activeBorder
                      : '#d1d5db'
                  }}></div>
                  
                  <div style={{
                    flex: 1,
                    minWidth: 0
                  }}>
                    <div style={{
                      fontWeight: '500',
                      color: config.textColor,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {branch.branch_name}
                    </div>
                    {branch.address && (
                      <div style={{
                        fontSize: '14px',
                        color: config.addressColor,
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
                        color: config.activeBorder,
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
