import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../contexts/RoleContext'
import { supabase } from '../lib/supabaseClient'
import SwitchUserModal from './SwitchUserModal'

const UserMenu: React.FC = () => {
  const { user, logout, switchUser } = useAuth()
  const { userRole } = useRole()
  const [isOpen, setIsOpen] = useState(false)
  const [showSwitchUserModal, setShowSwitchUserModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Debug logging
  console.log('UserMenu - Current user:', user?.username, 'Role:', user?.role, 'UserRole from context:', userRole)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin': return '#dc2626' // Red
      case 'owner': return '#7c3aed' // Purple
      case 'manager': return '#ea580c' // Orange
      case 'cashier': return '#2563eb' // Blue
      default: return '#6b7280' // Gray
    }
  }

  const handleLogout = async () => {
    await logout()
    setIsOpen(false)
  }

  const handleSwitchUser = () => {
    setIsOpen(false)
    setShowSwitchUserModal(true)
  }

  const handleUserSwitch = async (selectedUser: any, password: string, usePin?: boolean) => {
    try {
      console.log('Attempting to switch to user:', selectedUser.username, 'using', usePin ? 'PIN' : 'password')
      const success = await switchUser(selectedUser.user_id, password, usePin)
      
      if (success) {
        console.log('User switch successful, closing modal')
        setShowSwitchUserModal(false)
        // The user state will be automatically updated by the AuthContext
        // No need to show an alert - the UI will update automatically
      } else {
        // Keep the modal open and show error
        throw new Error(usePin ? 'Invalid PIN' : 'Invalid password')
      }
    } catch (error) {
      console.error('Error switching user:', error)
      // Re-throw the error so the modal can handle it
      throw error
    }
  }

  const handleSettings = () => {
    // TODO: Implement settings functionality
    alert('Settings functionality not implemented yet')
    setIsOpen(false)
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1000
    }} ref={menuRef}>
      {/* User avatar button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#f3f4f6',
          border: 'none',
          borderRadius: '25px',
          padding: '8px 12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          color: '#111827'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#e5e7eb'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f3f4f6'
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#7d8d86',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          border: 'none'
        }}>
          {user?.icon ? (
            <img 
              src={`/retailpos/images/icons/${user.icon}.png`} 
              alt={user.icon}
              style={{
                width: '28px',
                height: '28px',
                objectFit: 'cover',
                borderRadius: '50%'
              }}
            />
          ) : (
            <i className="fa-solid fa-user" style={{ 
              fontSize: '16px', 
              color: '#9ca3af' 
            }}></i>
          )}
        </div>
            <span style={{
              fontSize: '14px',
              fontWeight: '500',
              color: '#111827'
            }}>
              {user?.username || 'Unknown User'}
            </span>
            <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '12px', color: '#4b5563' }}></i>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          right: '0',
          top: '100%',
          marginTop: '8px',
          width: '200px',
          background: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb',
          padding: '8px 0',
          zIndex: 1001
        }}>
          {/* User info header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e5e7eb',
            marginBottom: '8px'
          }}>
            <div style={{
              color: '#111827',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '4px'
            }}>
              {user?.username || 'Unknown User'}
            </div>
            <div style={{
              color: getRoleColor(userRole),
              fontSize: '12px',
              textTransform: 'capitalize',
              fontWeight: '500'
            }}>
              {userRole}
            </div>
          </div>

          {/* Switch User */}
          <button
            onClick={handleSwitchUser}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              color: '#111827',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <i className="fa-solid fa-user-group" style={{ fontSize: '16px', color: '#4b5563' }}></i>
            <span>Switch User</span>
          </button>

          {/* Settings */}
          <button
            onClick={handleSettings}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              color: '#111827',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <i className="fa-solid fa-gear" style={{ fontSize: '16px', color: '#4b5563' }}></i>
            <span>Settings</span>
          </button>

          {/* Divider */}
          <div style={{
            borderTop: '1px solid #e5e7eb',
            margin: '8px 0'
          }}></div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              color: '#dc2626',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fef2f2'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <i className="fa-solid fa-sign-out-alt" style={{ fontSize: '16px', color: '#dc2626' }}></i>
            <span>Logout</span>
          </button>
        </div>
      )}

      {/* Switch User Modal */}
      <SwitchUserModal
        isOpen={showSwitchUserModal}
        onClose={() => setShowSwitchUserModal(false)}
        onUserSwitch={handleUserSwitch}
      />
    </div>
  )
}

export default UserMenu
