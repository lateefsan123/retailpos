import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, Package, Receipt, Users, LogOut, UserCog } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import styles from './MobileBottomNav.module.css'

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const [showUserModal, setShowUserModal] = useState(false)

  const navItems = [
    {
      path: '/dashboard-mobile',
      icon: Home,
      label: 'Home',
      action: null
    },
    {
      path: '/sales-mobile',
      icon: ShoppingBag,
      label: 'Sales',
      action: null
    },
    {
      path: '/products-mobile',
      icon: Package,
      label: 'Products',
      action: null
    },
    {
      path: '/transactions-mobile',
      icon: Receipt,
      label: 'Transactions',
      action: null
    },
    {
      path: null,
      icon: Users,
      label: 'Switch',
      action: 'user-menu'
    }
  ]

  const handleNavClick = (path: string | null, action: string | null) => {
    if (action === 'user-menu') {
      setShowUserModal(true)
    } else if (path) {
      navigate(path)
    }
  }

  const handleSwitchUser = () => {
    setShowUserModal(false)
    navigate('/select-user-mobile')
  }

  const handleLogout = () => {
    setShowUserModal(false)
    logout()
    navigate('/login-mobile')
  }

  return (
    <>
      <nav className={styles.bottomNav} aria-label="Primary">
        {navItems.map(({ path, icon: Icon, label, action }) => (
          <button
            key={path || action}
            type="button"
            className={`${styles.tabButton} ${path && location.pathname.startsWith(path) ? styles.tabActive : ''}`}
            onClick={() => handleNavClick(path, action)}
            aria-current={path && location.pathname.startsWith(path) ? 'page' : undefined}
          >
            <Icon size={22} aria-hidden="true" />
            <span className={styles.tabLabel}>{label}</span>
          </button>
        ))}
      </nav>

      {showUserModal && (
        <>
          <div className={styles.modalOverlay} onClick={() => setShowUserModal(false)} />
          <div className={styles.userModal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Account Options</h3>
            </div>
            <div className={styles.modalContent}>
              <button className={styles.modalOption} onClick={handleSwitchUser}>
                <UserCog size={20} />
                <span>Switch User</span>
              </button>
              <button className={styles.modalOptionDanger} onClick={handleLogout}>
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default MobileBottomNav
