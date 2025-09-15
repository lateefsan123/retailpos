import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNav } from '../contexts/NavContext'
import { useRole } from '../contexts/RoleContext'

const Navigation = () => {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { isCollapsed, setIsCollapsed } = useNav()
  const { canAccessRoute, userRole } = useRole()

  const allNavItems = [
    { path: '/', label: 'Dashboard', icon: 'fas fa-home' },
    { path: '/products', label: 'Products', icon: 'fas fa-box' },
    { path: '/sales', label: 'Sales', icon: 'fas fa-dollar-sign' },
    { path: '/transactions', label: 'Transactions', icon: 'fas fa-receipt' },
    { path: '/side-businesses', label: 'Side Businesses', icon: 'fas fa-briefcase' },
    { path: '/reminders', label: 'Reminders', icon: 'fas fa-sticky-note' },
    { path: '/admin', label: 'Admin', icon: 'fas fa-users-cog' },
  ]

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter(item => canAccessRoute(item.path))

  // Get role color
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Admin': return '#ef4444' // Red
      case 'Manager': return '#f59e0b' // Orange
      case 'Cashier': return '#3b82f6' // Blue
      default: return '#6b7280' // Gray
    }
  }

  return (
    <nav style={{
      width: isCollapsed ? '60px' : '160px',
      height: '100vh',
      background: '#1a1a1a',
      borderRight: '1px solid #333333',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 50,
      padding: isCollapsed ? '20px 8px' : '20px 12px',
      boxShadow: '2px 0 8px rgba(0, 0, 0, 0.3)',
      transition: 'width 0.3s ease, padding 0.3s ease'
    }}>
      {/* Logo Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: '12px',
        marginBottom: '32px',
        paddingBottom: '16px',
        borderBottom: '1px solid #333333'
      }}>
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            borderRadius: '4px',
            transition: 'background 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = '#333333'}
          onMouseLeave={(e) => e.target.style.background = 'transparent'}
        >
          <div style={{
            width: '16px',
            height: '2px',
            background: '#ffffff',
            position: 'relative',
            transition: 'transform 0.3s ease'
          }}>
            <div style={{
              position: 'absolute',
              top: '6px',
              left: 0,
              width: '16px',
              height: '2px',
              background: '#ffffff',
              transition: 'transform 0.3s ease'
            }}></div>
          </div>
        </div>
        {!isCollapsed && (
          <h1 style={{
            color: '#ffffff',
            fontSize: '16px',
            fontWeight: 'bold',
            margin: 0,
            transition: 'opacity 0.3s ease'
          }}>
            Retail POS
          </h1>
        )}
      </div>

      {/* Navigation Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {navItems.map((item, index) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              gap: '12px',
              padding: isCollapsed ? '12px 8px' : '12px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              background: location.pathname === item.path ? '#333333' : 'transparent',
              color: location.pathname === item.path ? '#ffffff' : '#cccccc'
            }}
            onMouseEnter={(e) => {
              if (location.pathname !== item.path) {
                e.target.style.background = '#333333'
                e.target.style.color = '#ffffff'
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== item.path) {
                e.target.style.background = 'transparent'
                e.target.style.color = '#cccccc'
              }
            }}
          >
            <i className={item.icon} style={{ fontSize: '16px', width: '20px' }}></i>
            {!isCollapsed && (
              <span style={{ 
                fontSize: '13px', 
                fontWeight: '500',
                transition: 'opacity 0.3s ease'
              }}>
                {item.label}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* User section */}
      <div style={{
        padding: '16px 0',
        borderTop: '1px solid #333333',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: isCollapsed ? 'center' : 'stretch'
      }}>
        {/* User info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: '12px',
          padding: isCollapsed ? '8px' : '8px 12px',
          borderRadius: '8px',
          background: '#333333',
          cursor: 'pointer',
          transition: 'background 0.2s ease',
          width: isCollapsed ? '44px' : 'auto'
        }}
        onMouseEnter={(e) => e.target.style.background = '#444444'}
        onMouseLeave={(e) => e.target.style.background = '#333333'}
        >
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1a1a1a',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          {!isCollapsed && (
            <div style={{ flex: 1 }}>
              <p style={{ 
                color: '#ffffff', 
                fontSize: '14px', 
                fontWeight: '500', 
                margin: 0,
                lineHeight: '1.2',
                transition: 'opacity 0.3s ease'
              }}>
                {user?.username}
              </p>
              <p style={{ 
                color: getRoleColor(userRole), 
                fontSize: '12px', 
                margin: 0,
                textTransform: 'capitalize',
                transition: 'opacity 0.3s ease',
                fontWeight: '500'
              }}>
                {userRole}
              </p>
            </div>
          )}
        </div>

        {/* Logout button */}
        <button
          onClick={async () => {
            console.log('Logout button clicked')
            await logout()
          }}
          style={{
            width: isCollapsed ? '44px' : '100%',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            borderRadius: '8px',
            background: '#dc3545',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s ease, width 0.3s ease',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: '500'
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement
            target.style.background = '#c82333'
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement
            target.style.background = '#dc3545'
          }}
        >
          <i className="fa-solid fa-sign-out-alt" style={{ fontSize: '16px' }}></i>
          {!isCollapsed && (
            <span style={{ transition: 'opacity 0.3s ease' }}>Logout</span>
          )}
        </button>
      </div>
    </nav>
  )
}

export default Navigation
