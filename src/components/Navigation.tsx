import { Link, useLocation } from 'react-router-dom'
import { useNav } from '../contexts/NavContext'
import { useRole } from '../contexts/RoleContext'

const Navigation = () => {
  const location = useLocation()
  const { isCollapsed, setIsCollapsed } = useNav()
  const { canAccessRoute } = useRole()

  const allNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'fas fa-home' },
    { path: '/products', label: 'Products', icon: 'fas fa-box' },
    { path: '/sales', label: 'Sales', icon: 'fas fa-dollar-sign' },
    { path: '/transactions', label: 'Transactions', icon: 'fas fa-receipt' },
    { path: '/customer-loyalty', label: 'Customer Loyalty', icon: 'fas fa-users' },
    { path: '/suppliers', label: 'Suppliers', icon: 'fas fa-truck' },
    { path: '/supplier-calendar', label: 'Supplier Calendar', icon: 'fas fa-calendar-week' },
    { path: '/promotions', label: 'Promotions', icon: 'fas fa-tags' },
    { path: '/side-businesses', label: 'Side Businesses', icon: 'fas fa-briefcase' },
    { path: '/reminders', label: 'Reminders', icon: 'fas fa-sticky-note' },
    { path: '/admin', label: 'Admin', icon: 'fas fa-users-cog' },
  ]

  // Filter nav items based on user permissions
  const navItems = allNavItems.filter(item => canAccessRoute(item.path))


  return (
    <nav style={{
      width: isCollapsed ? '70px' : '200px',
      height: '100vh',
      background: '#1a1a1a',
      borderRight: '1px solid #333333',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 50,
      padding: isCollapsed ? '20px 10px 20px 10px' : '20px 16px 20px 16px',
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
          onMouseEnter={(e) => (e.target as HTMLElement).style.setProperty('background-color', '#333333')}
          onMouseLeave={(e) => (e.target as HTMLElement).style.setProperty('background-color', 'transparent')}
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
        {navItems.map((item) => (
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
                const target = e.currentTarget as HTMLElement
                target.style.backgroundColor = '#333333'
                target.style.color = '#ffffff'
              }
            }}
            onMouseLeave={(e) => {
              if (location.pathname !== item.path) {
                const target = e.currentTarget as HTMLElement
                target.style.backgroundColor = 'transparent'
                target.style.color = '#cccccc'
              }
            }}
          >
            <i className={item.icon} style={{ fontSize: '20px', width: '24px' }}></i>
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

    </nav>
  )
}

export default Navigation
