import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../contexts/RoleContext'

const UserMenu: React.FC = () => {
  const { user, logout } = useAuth()
  const { userRole } = useRole()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
    switch (role) {
      case 'Admin': return '#ef4444' // Red
      case 'Owner': return '#8b5cf6' // Purple
      case 'Manager': return '#f59e0b' // Orange
      case 'Cashier': return '#3b82f6' // Blue
      default: return '#6b7280' // Gray
    }
  }

  const handleLogout = async () => {
    await logout()
    setIsOpen(false)
  }

  const handleSwitchUser = () => {
    // TODO: Implement switch user functionality
    alert('Switch User functionality not implemented yet')
    setIsOpen(false)
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
          background: '#2d2d2d',
          border: '1px solid #404040',
          borderRadius: '25px',
          padding: '8px 12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          color: '#ffffff'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#404040'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#2d2d2d'
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          border: '2px solid #e5e7eb'
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
          color: '#ffffff'
        }}>
          {user?.username || 'Unknown User'}
        </span>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '12px' }}></i>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          right: '0',
          top: '100%',
          marginTop: '8px',
          width: '200px',
          background: '#2d2d2d',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          border: '1px solid #404040',
          padding: '8px 0',
          zIndex: 1001
        }}>
          {/* User info header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #404040',
            marginBottom: '8px'
          }}>
            <div style={{
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '4px'
            }}>
              {user?.username || 'Unknown User'}
            </div>
            <div style={{
              color: getRoleColor(userRole),
              fontSize: '12px',
              textTransform: 'capitalize'
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
              color: '#ffffff',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#404040'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <i className="fa-solid fa-user-group" style={{ fontSize: '16px', color: '#9ca3af' }}></i>
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
              color: '#ffffff',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#404040'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <i className="fa-solid fa-gear" style={{ fontSize: '16px', color: '#9ca3af' }}></i>
            <span>Settings</span>
          </button>

          {/* Divider */}
          <div style={{
            borderTop: '1px solid #404040',
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
              color: '#ef4444',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7f1d1d'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <i className="fa-solid fa-sign-out-alt" style={{ fontSize: '16px', color: '#ef4444' }}></i>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
