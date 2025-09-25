import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

interface User {
  user_id: number
  username: string
  role: string
  active: boolean
  icon?: string
  business_id: number
  last_used?: string
  pin?: string
  branch_id?: number
  branch_name?: string
}

interface SwitchUserModalProps {
  isOpen: boolean
  onClose: () => void
  onUserSwitch: (user: User, password: string, usePin?: boolean) => void
  context?: 'login' | 'switch' // 'login' for initial login, 'switch' for user menu
}

const SwitchUserModal: React.FC<SwitchUserModalProps> = ({ isOpen, onClose, onUserSwitch, context = 'switch' }) => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showPasswordView, setShowPasswordView] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [usePinAuth, setUsePinAuth] = useState(false)

  useEffect(() => {
    console.log('SwitchUserModal useEffect - isOpen:', isOpen, 'currentUser:', currentUser)
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const fetchUsers = async () => {
    // Get business_id from current user or sessionStorage
    let businessId = currentUser?.business_id
    if (!businessId) {
      businessId = sessionStorage.getItem('authenticatedBusinessId')
    }
    if (!businessId) {
      businessId = localStorage.getItem('current_business_id')
    }
    
    console.log('fetchUsers called - businessId:', businessId, 'from currentUser:', currentUser?.business_id)
    
    try {
      setLoading(true)
      console.log('Fetching users for business_id:', businessId)
      
      let query
      
      if (businessId) {
        // Get users for this specific business
        query = supabase
          .from('users')
          .select('*')
          .eq('business_id', parseInt(businessId))
          .eq('active', true)
          .order('user_id', { ascending: false })
      } else {
        // Fallback: get all active users if no business_id
        console.log('No business_id found, fetching all active users')
        query = supabase
          .from('users')
          .select('*')
          .eq('active', true)
          .order('user_id', { ascending: false })
      }

      const { data, error } = await query
      console.log('Users query result - data:', data, 'error:', error)

      if (error) {
        console.error('Error fetching users:', error)
        setUsers([])
        return
      }

      console.log('Setting users:', data || [])
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    setShowPasswordView(true)
    setPassword('')
    setPasswordError('')
    setUsePinAuth(false)
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !password) return

    setIsAuthenticating(true)
    setPasswordError('')

    try {
      // Call the parent component's user switch handler
      // It will handle the actual password verification
      await onUserSwitch(selectedUser, password, usePinAuth)
      // Only close if successful (no error thrown)
      setShowPasswordView(false)
      onClose()
    } catch (error) {
      console.log('Password error caught in SwitchUserModal:', error)
      setPasswordError(usePinAuth ? 'Invalid PIN. Please try again.' : 'Invalid password. Please try again.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const handleBackToUsers = () => {
    setShowPasswordView(false)
    setSelectedUser(null)
    setPassword('')
    setPasswordError('')
    setIsAuthenticating(false)
    setUsePinAuth(false)
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return '#dc2626' // Red
      case 'owner': return '#7c3aed' // Purple
      case 'manager': return '#ea580c' // Orange
      case 'cashier': return '#2563eb' // Blue
      default: return '#6b7280' // Gray
    }
  }

  const formatLastUsed = (lastUsed?: string) => {
    if (!lastUsed) return 'Never'
    const date = new Date(lastUsed)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  if (!isOpen) return null

  return (
    <>
      {/* Switch User Modal - Laptop Screen Style */}
      <div style={{
        position: 'fixed',
        inset: '0',
        background: '#0b0d10',
        backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.02), rgba(255,255,255,0.02) 2px, transparent 2px, transparent 4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px'
      }} onClick={onClose}>
        {/* Outer card to create depth behind the monitor */}
        <div style={{
          background: 'transparent',
          width: '100%',
          maxWidth: '800px',
          padding: '20px',
        }}>
          {/* Monitor Bezel */}
          <div style={{
            background: '#000000',
            borderRadius: '12px',
            border: '4px solid #4a5568',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)',
            padding: '16px',
          }}>
            {/* Screen */}
            <div style={{
              background: '#000000',
              borderRadius: '8px',
              padding: '24px',
              position: 'relative',
              overflow: 'hidden',
              minHeight: '500px',
            }}>
              <div style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                width: '100%',
                height: '100%',
                minHeight: '450px'
              }} onClick={(e) => e.stopPropagation()}>
                {/* macOS-style window controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  borderBottom: '1px solid #e5e7eb',
                  background: '#f8f9fa'
                }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#eab308' }} />
                  <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#7d8d86' }} />
                </div>

          {/* Modal Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827',
              margin: 0
            }}>
              {context === 'login' ? 'Select User' : 'Switch User'}
            </h2>
            <button
              onClick={() => {
                setShowPasswordView(false)
                setSelectedUser(null)
                setPassword('')
                setPasswordError('')
                setIsAuthenticating(false)
                setUsePinAuth(false)
                onClose()
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#4b5563',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#111827'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#4b5563'
              }}
            >
              <i className="fa-solid fa-xmark" style={{ fontSize: '20px' }}></i>
            </button>
          </div>

          {/* Content */}
          <div style={{ padding: '24px' }}>
            {showPasswordView ? (
              /* Password View */
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: '#7d8d86',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    border: 'none'
                  }}>
                    {selectedUser?.icon ? (
                      <img 
                        src={`/retailpos/images/icons/${selectedUser.icon}.png`} 
                        alt={selectedUser.icon}
                        style={{
                          width: '44px',
                          height: '44px',
                          objectFit: 'cover',
                          borderRadius: '50%'
                        }}
                      />
                    ) : (
                      <i className="fa-solid fa-user" style={{ 
                        fontSize: '20px', 
                        color: '#ffffff' 
                      }}></i>
                    )}
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '18px',
                      fontWeight: '500',
                      color: '#111827',
                      margin: '0 0 4px 0'
                    }}>
                      {selectedUser?.username}
                    </h3>
                    <p style={{
                      fontSize: '16px',
                      color: getRoleColor(selectedUser?.role || ''),
                      margin: 0,
                      fontWeight: '500'
                    }}>
                      {selectedUser?.role}
                    </p>
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Authentication Method Toggle */}
                  {selectedUser?.pin && (
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        background: '#f3f4f6',
                        borderRadius: '8px',
                        padding: '4px'
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            setUsePinAuth(false)
                            setPassword('')
                            setPasswordError('')
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: usePinAuth ? 'transparent' : '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            color: usePinAuth ? '#6b7280' : '#111827',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: usePinAuth ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          Password
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUsePinAuth(true)
                            setPassword('')
                            setPasswordError('')
                          }}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: usePinAuth ? '#ffffff' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: usePinAuth ? '#111827' : '#6b7280',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: usePinAuth ? '0 1px 2px rgba(0, 0, 0, 0.1)' : 'none'
                          }}
                        >
                          PIN
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#111827',
                      marginBottom: '8px'
                    }}>
                      {usePinAuth ? 'PIN' : 'Password'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (passwordError) {
                          setPasswordError('')
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        color: '#111827',
                        fontSize: '16px',
                        boxSizing: 'border-box',
                        textAlign: usePinAuth ? 'center' : 'left',
                        letterSpacing: usePinAuth ? '2px' : 'normal'
                      }}
                      placeholder={usePinAuth ? "Enter PIN" : "Enter password"}
                      maxLength={usePinAuth ? 6 : undefined}
                      required
                      autoFocus
                    />
                    {passwordError && (
                      <div style={{
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        margin: '8px 0 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <i className="fa-solid fa-exclamation-triangle" style={{
                          color: '#dc2626',
                          fontSize: '14px'
                        }}></i>
                        <p style={{
                          fontSize: '14px',
                          color: '#dc2626',
                          margin: 0,
                          fontWeight: '500'
                        }}>
                          {passwordError}
                        </p>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={handleBackToUsers}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: '#e5e7eb',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#111827',
                        fontSize: '16px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#d1d5db'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#e5e7eb'
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isAuthenticating}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: isAuthenticating ? '#9ca3af' : '#7d8d86',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '16px',
                        fontWeight: '500',
                        cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s ease',
                        opacity: isAuthenticating ? 0.7 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (!isAuthenticating) {
                          e.currentTarget.style.background = '#3e3f29'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isAuthenticating) {
                          e.currentTarget.style.background = '#7d8d86'
                        }
                      }}
                    >
                      {isAuthenticating ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
                          Signing In...
                        </>
                      ) : (
                        'Sign In'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* User List View */
              loading ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: '40px',
                  color: '#4b5563'
                }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '20px', marginRight: '8px' }}></i>
                  Loading users...
                </div>
                  ) : users.length === 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '40px',
                      color: '#6b7280',
                      textAlign: 'center'
                    }}>
                      <i className="fa-solid fa-users" style={{ fontSize: '48px', marginBottom: '16px', color: '#d1d5db' }}></i>
                      <h3 style={{ fontSize: '18px', fontWeight: '500', margin: '0 0 8px 0', color: '#374151' }}>
                        No Users Found
                      </h3>
                      <p style={{ fontSize: '14px', margin: 0, color: '#6b7280' }}>
                        No active users found for this business.
                      </p>
                      <p style={{ fontSize: '12px', margin: '8px 0 0 0', color: '#9ca3af' }}>
                        Debug: Business ID: {currentUser?.business_id || 'Not set'}
                      </p>
                      <button
                        onClick={fetchUsers}
                        style={{
                          marginTop: '16px',
                          padding: '8px 16px',
                          background: '#7d8d86',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#3e3f29'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#7d8d86'
                        }}
                      >
                        <i className="fa-solid fa-refresh" style={{ marginRight: '8px' }}></i>
                        Refresh
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {console.log('Rendering users:', users)}
                      {users.map((user) => (
                        <div
                          key={user.user_id}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f9fafb'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#ffffff'
                          }}
                          onClick={() => handleUserSelect(user)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: '#7d8d86',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          border: 'none'
                        }}>
                          {user.icon ? (
                            <img 
                              src={`/retailpos/images/icons/${user.icon}.png`} 
                              alt={user.icon}
                              style={{
                                width: '44px',
                                height: '44px',
                                objectFit: 'cover',
                                borderRadius: '50%'
                              }}
                            />
                          ) : (
                            <i className="fa-solid fa-user" style={{ 
                              fontSize: '20px', 
                              color: '#ffffff' 
                            }}></i>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <h3 style={{
                                  fontSize: '18px',
                                  fontWeight: '500',
                                  color: '#111827',
                                  margin: 0
                                }}>
                                  {user.username}
                                </h3>
                                {user.pin && (
                                  <div style={{
                                    background: '#10b981',
                                    color: '#ffffff',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                  }}>
                                    PIN
                                  </div>
                                )}
                              </div>
                          <p style={{
                            fontSize: '16px',
                            color: getRoleColor(user.role),
                            margin: '0 0 4px 0',
                            fontWeight: '500'
                          }}>
                            {user.role}
                          </p>
                          <p style={{
                            fontSize: '15px',
                            color: '#374151',
                            margin: 0,
                            fontWeight: '500'
                          }}>
                            Last used: {formatLastUsed(user.last_used)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
              </div>
            </div>
          </div>

          {/* Monitor Stand */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            {/* Stand Neck */}
            <div style={{
              width: 60,
              height: 60,
              background: 'linear-gradient(145deg, #4a5568, #2d3748)',
              borderRadius: '0 0 15px 15px',
              boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
              border: '2px solid #4a5568',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            {/* Stand Base */}
            <div style={{
              width: 300,
              height: 30,
              background: 'linear-gradient(145deg, #2d3748, #1a202c)',
              borderRadius: 50,
              boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
              border: '1px solid #4a5568',
            }} />
          </div>
        </div>
      </div>

    </>
  )
}

export default SwitchUserModal
