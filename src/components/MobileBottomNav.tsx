import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Home, ShoppingBag, Package, Receipt, Users } from 'lucide-react'
import styles from './MobileBottomNav.module.css'

const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems = [
    {
      path: '/dashboard-mobile',
      icon: Home,
      label: 'Home'
    },
    {
      path: '/sales-mobile',
      icon: ShoppingBag,
      label: 'Sales'
    },
    {
      path: '/products-mobile',
      icon: Package,
      label: 'Products'
    },
    {
      path: '/transactions-mobile',
      icon: Receipt,
      label: 'Transactions'
    },
    {
      path: '/select-user-mobile',
      icon: Users,
      label: 'Switch'
    }
  ]

  return (
    <nav className={styles.bottomNav} aria-label="Primary">
      {navItems.map(({ path, icon: Icon, label }) => (
        <button
          key={path}
          type="button"
          className={`${styles.tabButton} ${location.pathname.startsWith(path) ? styles.tabActive : ''}`}
          onClick={() => navigate(path)}
          aria-current={location.pathname.startsWith(path) ? 'page' : undefined}
        >
          <Icon size={22} aria-hidden="true" />
          <span className={styles.tabLabel}>{label}</span>
        </button>
      ))}
    </nav>
  )
}

export default MobileBottomNav
