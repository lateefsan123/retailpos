import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

interface User {
  user_id: number
  username: string
  role: string
  active: boolean
  icon?: string
  business_id: number | null
  last_used?: string
  pin?: string
  branch_id?: number
  branch_name?: string
}

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

interface UserSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onUserSelected: (user: User) => void
  currentUser: User | null
}

const UserSelectionModal: React.FC<UserSelectionModalProps> = ({
  isOpen,
  onClose,
  onUserSelected,
  currentUser
}) => {
  const [users, setUsers] = useState<User[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && currentUser?.business_id) {
      fetchData()
    }
  }, [isOpen, currentUser?.business_id])

  const fetchData = async () => {
    if (!currentUser?.business_id) return

    setLoading(true)
    try {
      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('business_id', currentUser.business_id)
        .eq('active', true)
        .order('user_id', { ascending: false })

      if (usersError) {
        console.error('Error fetching users:', usersError)
        return
      }

      // Get branch information for users
      const usersWithBranches = await Promise.all((usersData || []).map(async (user) => {
        if (user.branch_id) {
          const { data: branchData } = await supabase
            .from('branches')
            .select('branch_name')
            .eq('branch_id', user.branch_id)
            .single()
          
          return {
            ...user,
            branch_name: branchData?.branch_name || 'Branch Not Found'
          }
        }
        
        return {
          ...user,
          branch_name: 'No Branch Assigned'
        }
      }))

      setUsers(usersWithBranches)

      // Fetch branches
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('*')
        .eq('business_id', currentUser.business_id)
        .eq('active', true)
        .order('branch_id', { ascending: false })

      if (branchesError) {
        console.error('Error fetching branches:', branchesError)
        return
      }

      setBranches(branchesData || [])
      
      // Auto-select first branch if only one exists
      if (branchesData && branchesData.length === 1) {
        setSelectedBranch(branchesData[0])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = (user: User) => {
    onUserSelected(user)
    onClose()
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return '#dc2626'
      case 'owner': return '#7c3aed'
      case 'manager': return '#ea580c'
      case 'cashier': return '#2563eb'
      default: return '#6b7280'
    }
  }

  const formatLastUsed = (lastUsed?: string) => {
    if (!lastUsed) return 'Never'
    const date = new Date(lastUsed)
    if (Number.isNaN(date.getTime())) return 'Never'
    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: '0',
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '24px'
    }}>
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: '0',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}
        onClick={onClose}
      />

      {/* Modal Content - Laptop Screen Style */}
      <div style={{
        width: '100%',
        maxWidth: '900px',
        height: '600px',
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        border: '1px solid #333',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden'
      }}>
        {/* Title Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #333',
          backgroundColor: '#2a2a2a'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {/* Traffic Light Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#ff5f57'
              }} />
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#ffbd2e'
              }} />
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#28ca42'
              }} />
            </div>
            <span style={{
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '600',
              marginLeft: '16px'
            }}>
              Switch User
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ffffff',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#333'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            ×
          </button>
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          backgroundImage: 'url(/images/backgrounds/u2541828551_An_elegant_illustration_of_a_small_African_corner_5e875dd7-e5d8-4655-af92-bb5c9c2865fd_1.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          position: 'relative'
        }}>
          {/* Dark overlay */}
          <div style={{
            position: 'absolute',
            inset: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          }} />

          {loading ? (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '500'
              }}>
                Loading users...
              </div>
            </div>
          ) : (
            /* User Selection View */
            <div style={{
              flex: 1,
              display: 'flex',
              position: 'relative',
              zIndex: 1
            }}>
              {/* User List */}
              <div style={{
                flex: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{
                  padding: '20px',
                  borderBottom: '1px solid #333'
                }}>
                  <h3 style={{
                    color: '#ffffff',
                    fontSize: '18px',
                    fontWeight: '600',
                    margin: '0 0 8px 0'
                  }}>
                    Select User
                  </h3>
                  <p style={{
                    color: '#cccccc',
                    fontSize: '14px',
                    margin: '0'
                  }}>
                    Choose a user to switch to
                  </p>
                </div>

                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '16px'
                }}>
                  {users
                    .filter(u => u.user_id !== currentUser?.user_id)
                    .map((user) => (
                      <button
                        key={user.user_id}
                        onClick={() => handleUserSelect(user)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          marginBottom: '8px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
                        }}
                      >
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: '#4a4a4a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          flexShrink: 0
                        }}>
                          {user.icon || '👤'}
                        </div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '2px'
                          }}>
                            {user.username}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#cccccc'
                          }}>
                            {user.role} • {user.branch_name}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: '#999'
                          }}>
                            Last used: {formatLastUsed(user.last_used)}
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserSelectionModal
