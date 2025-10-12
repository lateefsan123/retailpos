import React, { CSSProperties, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRole } from '../contexts/RoleContext'
import { useTheme } from '../contexts/ThemeContext'
import SelectUserModal from './SelectUserModal'
import BusinessSettingsModal from './BusinessSettingsModal'
import ChangeNameModal from './ChangeNameModal'
import ThemeToggle from './ThemeToggle'

type UserMenuVariant = 'floating' | 'sidebar'

interface UserMenuProps {
  variant?: UserMenuVariant
}

const UserMenu: React.FC<UserMenuProps> = ({ variant = 'floating' }) => {
  const { user, logout, switchUser } = useAuth()
  const { userRole } = useRole()
  const { theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [showSelectUserModal, setShowSelectUserModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showChangeNameModal, setShowChangeNameModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isSidebar = variant === 'sidebar'
  const iconName = user?.icon
  const userExtra = (user as unknown as Record<string, any>) || null
  const displayName = (userExtra?.full_name as string | undefined) || user?.username || 'User'
  const emailAddress = userExtra?.email as string | undefined
  const usernameInitial = (user?.username || displayName || '?').charAt(0).toUpperCase()

  // Debug logging / lifecycle hooks
  useEffect(() => {
    // User role tracking for debugging
  }, [user, userRole])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return '#dc2626'
      case 'owner':
        return '#7c3aed'
      case 'manager':
        return '#ea580c'
      case 'cashier':
        return '#2563eb'
      default:
        return '#6b7280'
    }
  }

  const containerStyle: CSSProperties = isSidebar
    ? {
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 5
      }
    : {
        position: 'fixed',
        top: '20px',
        right: '20px',
        display: 'inline-flex',
        zIndex: 1000
      }

  const buttonStyle: CSSProperties = isSidebar
    ? {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '14px',
        background: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        color: '#f8fafc',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(6px)'
      }
    : {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        borderRadius: '25px',
        background: '#f3f4f6',
        border: 'none',
        color: '#111827',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }

  const dropdownStyle: CSSProperties = isSidebar
    ? {
        position: 'fixed',
        left: '280px',
        bottom: '20px',
        minWidth: '260px',
        background: 'rgba(12, 12, 16, 0.98)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45)',
        padding: '12px 0',
        zIndex: 1000
      }
    : {
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: '8px',
        minWidth: '220px',
        maxWidth: '300px',
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        padding: '8px 0',
        zIndex: 1001
      }

  const dropdownTextColor = isSidebar ? '#f8fafc' : '#111827'
  const dropdownIconColor = isSidebar ? '#d1d5db' : '#4b5563'
  const dropdownHoverBg = isSidebar ? 'rgba(255, 255, 255, 0.08)' : '#f9fafb'

  const handleLogout = async () => {
    await logout()
    setIsOpen(false)
  }

  const handleSwitchUser = () => {
    setIsOpen(false)
    setShowSelectUserModal(true)
  }

  const handleUserSwitch = async (selectedUser: any, password: string, usePin?: boolean) => {
    try {
      const success = await switchUser(selectedUser.user_id, password, usePin)
      if (success) {
        setShowSelectUserModal(false)
      } else {
        throw new Error(usePin ? 'Invalid PIN' : 'Invalid password')
      }
    } catch (error) {
      console.error('Error switching user:', error)
      throw error
    }
  }

  const handleSettings = () => {
    setShowSettingsModal(true)
    setIsOpen(false)
  }

  const handleChangeName = () => {
    setShowChangeNameModal(true)
    setIsOpen(false)
  }

  const handleButtonEnter = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isSidebar) {
      Object.assign(event.currentTarget.style, {
        borderColor: 'rgba(255, 255, 255, 0.22)',
        background: 'rgba(255, 255, 255, 0.12)'
      })
    } else {
      Object.assign(event.currentTarget.style, {
        boxShadow: '0 8px 18px rgba(148, 163, 184, 0.2)',
        transform: 'translateY(-2px)',
        background: '#e5e7eb'
      })
    }
  }

  const handleButtonLeave = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isSidebar) {
      Object.assign(event.currentTarget.style, {
        borderColor: 'rgba(255, 255, 255, 0.12)',
        background: 'rgba(255, 255, 255, 0.06)'
      })
    } else {
      Object.assign(event.currentTarget.style, {
        boxShadow: 'none',
        transform: 'translateY(0)',
        background: '#f3f4f6'
      })
    }
  }

  return (
    <div style={containerStyle} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={buttonStyle}
        onMouseEnter={handleButtonEnter}
        onMouseLeave={handleButtonLeave}
      >
        <div
          style={{
            width: isSidebar ? 36 : 32,
            height: isSidebar ? 36 : 32,
            borderRadius: isSidebar ? '12px' : '50%',
            background: isSidebar
              ? 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(148,163,184,0.28))'
              : 'linear-gradient(135deg, #1a1a1a, #374151)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {iconName ? (
            <img
              src={`/images/icons/${iconName}.png`}
              alt={iconName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const parent = target.parentElement
                if (parent) {
                  parent.innerHTML = `<span style="font-size:14px;color:#f8fafc;font-weight:600;">${(user?.username || '?').charAt(0).toUpperCase()}</span>`
                }
              }}
            />
          ) : (
            <span style={{ fontSize: '14px', color: '#f8fafc', fontWeight: 600 }}>
              {(user?.username || '?').charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', color: isSidebar ? '#f8fafc' : '#111827' }}>
          <span style={{ fontSize: '14px', fontWeight: 500, margin: 0, textTransform: 'capitalize' }}>
            {user?.username || 'loading...'}
          </span>
          {(user?.role || userRole) && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: isSidebar ? 'rgba(226, 232, 240, 0.7)' : getRoleColor(user?.role || userRole),
                textTransform: 'capitalize',
                letterSpacing: '0.01em'
              }}
            >
              {user?.role || userRole}
            </span>
          )}
        </div>

        <i
          className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`}
          style={{ fontSize: '12px', color: isSidebar ? '#d1d5db' : '#6b7280', marginLeft: 'auto' }}
        ></i>
      </button>

      {isOpen && (
        <div style={dropdownStyle}>
          <div
            style={{
              padding: '12px 16px',
              borderBottom: isSidebar ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e5e7eb',
              marginBottom: '8px',
              color: dropdownTextColor
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: isSidebar
                    ? 'linear-gradient(135deg, rgba(255,255,255,0.18), rgba(148,163,184,0.28))'
                    : 'linear-gradient(135deg, #1a1a1a, #374151)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden'
                }}
              >
                {iconName ? (
                  <img
                    src={`/images/icons/${iconName}.png`}
                    alt={iconName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `<span style="font-size:16px;color:#f8fafc;font-weight:600;">${(user?.username || '?').charAt(0).toUpperCase()}</span>`
                      }
                    }}
                  />
                ) : (
                  <span style={{ fontSize: '16px', color: '#f8fafc', fontWeight: 600 }}>
                    {(user?.username || '?').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: dropdownTextColor }}>
                  {user?.full_name || user?.username || 'User'}
                </span>
                <span style={{ fontSize: '12px', color: isSidebar ? 'rgba(226, 232, 240, 0.68)' : '#6b7280' }}>
                  {user?.email || ''}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSwitchUser}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              color: dropdownTextColor,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = dropdownHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <i className="fa-solid fa-user-group" style={{ fontSize: '16px', color: dropdownIconColor }}></i>
            <span>Switch User</span>
          </button>

          <button
            onClick={handleSettings}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              color: dropdownTextColor,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = dropdownHoverBg)}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <i className="fa-solid fa-gear" style={{ fontSize: '16px', color: dropdownIconColor }}></i>
            <span>Settings</span>
          </button>

          {user?.role?.toLowerCase() === 'owner' && (
            <button
              onClick={handleChangeName}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                color: dropdownTextColor,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = dropdownHoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <i className="fa-solid fa-user-edit" style={{ fontSize: '16px', color: dropdownIconColor }}></i>
              <span>Change Name</span>
            </button>
          )}

          {/* Theme Toggle */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: isSidebar ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e5e7eb',
              borderBottom: isSidebar ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e5e7eb',
              margin: '8px 0'
            }}
          >
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              color: dropdownTextColor
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i 
                  className={theme === 'light' ? 'fa-solid fa-sun' : 'fa-solid fa-moon'} 
                  style={{ fontSize: '16px', color: dropdownIconColor }}
                ></i>
                <span style={{ fontSize: '14px', fontWeight: 500 }}>
                  {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                </span>
              </div>
              <ThemeToggle variant="switch" size="sm" />
            </div>
          </div>

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
              e.currentTarget.style.background = isSidebar ? 'rgba(220, 38, 38, 0.12)' : '#fef2f2'
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

      <SelectUserModal
        isOpen={showSelectUserModal}
        onClose={() => setShowSelectUserModal(false)}
        onUserSwitch={handleUserSwitch}
      />

      <BusinessSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <ChangeNameModal
        isOpen={showChangeNameModal}
        onClose={() => setShowChangeNameModal(false)}
      />
    </div>
  )
}

export default UserMenu
