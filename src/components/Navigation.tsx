import { type CSSProperties, type MouseEvent as ReactMouseEvent, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useNav } from '../contexts/NavContext'
import { useRole } from '../contexts/RoleContext'
import {
  Home,
  Package,
  DollarSign,
  FileText,
  Users,
  Truck,
  Calendar,
  Tag,
  Briefcase,
  Bell,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type NavSectionKey = 'core' | 'management'

type NavItemConfig = {
  path: string
  label: string
  icon: LucideIcon
}

const NAV_SECTIONS: Record<NavSectionKey, { title: string; items: NavItemConfig[] }> = {
  core: {
    title: 'Core Operations',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: Home },
      { path: '/sales', label: 'Sales', icon: DollarSign },
      { path: '/products', label: 'Products', icon: Package },
      { path: '/transactions', label: 'Transactions', icon: FileText },
      { path: '/customer-loyalty', label: 'Customer Loyalty', icon: Users }
    ]
  },
  management: {
    title: 'Management & Tools',
    items: [
      { path: '/suppliers', label: 'Suppliers', icon: Truck },
      { path: '/supplier-calendar', label: 'Supplier Visits', icon: Calendar },
      { path: '/promotions', label: 'Promotions', icon: Tag },
      { path: '/side-businesses', label: 'Side Businesses', icon: Briefcase },
      { path: '/reminders', label: 'Reminders', icon: Bell },
      { path: '/admin', label: 'Admin', icon: Settings }
    ]
  }
}

const Navigation = () => {
  const location = useLocation()
  const { isCollapsed, setIsCollapsed } = useNav()
  const { canAccessRoute } = useRole()
  const [openSections, setOpenSections] = useState<Record<NavSectionKey, boolean>>({
    core: true,
    management: true
  })

  const filteredSections: Record<NavSectionKey, NavItemConfig[]> = {
    core: NAV_SECTIONS.core.items.filter(item => canAccessRoute(item.path)),
    management: NAV_SECTIONS.management.items.filter(item => canAccessRoute(item.path))
  }

  const flattenedItems: NavItemConfig[] = [...filteredSections.core, ...filteredSections.management]

  const handleToggleSection = (section: NavSectionKey) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleCollapseToggle = () => {
    setIsCollapsed(prev => !prev)
  }

  const handleExpandNav = () => {
    // No longer needed since we removed collapse functionality
  }

  const renderNavItem = (item: NavItemConfig) => {
    const Icon = item.icon
    const isActive = location.pathname === item.path

    const baseStyle: CSSProperties = {
        display: 'flex',
        alignItems: 'center',
      justifyContent: 'flex-start',
        gap: '12px',
      padding: '12px 16px',
      borderRadius: '14px',
      textDecoration: 'none',
      color: isActive ? '#f8fafc' : '#d1d5db',
      background: isActive ? 'rgba(0, 0, 0, 0.85)' : 'transparent',
      border: `1px solid ${isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'}`,
      boxShadow: isActive ? '0 12px 30px rgba(0, 0, 0, 0.35)' : 'none',
      transition: 'all 0.25s ease',
      width: '100%',
      position: 'relative'
    }

    const iconWrapperStyle: CSSProperties = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
      width: '24px',
      height: '24px',
      transition: 'transform 0.25s ease'
    }

    const handleMouseEnter = (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (isActive) return

      Object.assign(event.currentTarget.style, {
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        color: '#f8fafc'
      })

      const iconWrapper = event.currentTarget.querySelector('[data-role="nav-icon"]') as HTMLElement | null
      if (iconWrapper) {
        iconWrapper.style.transform = 'scale(1.05)'
      }
    }

    const handleMouseLeave = (event: ReactMouseEvent<HTMLAnchorElement>) => {
      Object.assign(event.currentTarget.style, {
        backgroundColor: isActive ? 'rgba(0, 0, 0, 0.85)' : 'transparent',
        borderColor: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
        color: isActive ? '#f8fafc' : '#d1d5db'
      })

      const iconWrapper = event.currentTarget.querySelector('[data-role="nav-icon"]') as HTMLElement | null
      if (iconWrapper) {
        iconWrapper.style.transform = isActive ? 'scale(1.05)' : 'scale(1)'
      }
    }

    return (
          <Link
            key={item.path}
            to={item.path}
        style={baseStyle}
        aria-current={isActive ? 'page' : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <span data-role="nav-icon" style={iconWrapperStyle}>
          <Icon size={20} color={isActive ? '#ffffff' : '#d1d5db'} aria-hidden="true" />
        </span>
        <span
            style={{
            fontSize: '13px',
            fontWeight: 500,
            letterSpacing: '0.02em'
          }}
        >
                {item.label}
              </span>
          </Link>
    )
  }

  const renderSection = (sectionKey: NavSectionKey) => {
    const items = filteredSections[sectionKey]
    if (!items.length) return null

    const isOpen = openSections[sectionKey]

    const sectionButtonStyle: CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      background: 'transparent',
      border: 'none',
      padding: '0 0 6px',
      margin: 0,
      color: 'rgba(255, 255, 255, 0.45)',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.28em',
      textTransform: 'uppercase',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      cursor: 'pointer',
      transition: 'color 0.25s ease'
    }

    const handleMouseEnter = (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'
    }

    const handleMouseLeave = (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)'
    }

    return (
      <div key={sectionKey} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          type="button"
          style={sectionButtonStyle}
          onClick={() => handleToggleSection(sectionKey)}
          aria-expanded={isOpen}
          aria-controls={`nav-section-${sectionKey}`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span>{NAV_SECTIONS[sectionKey].title}</span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s ease',
              color: 'rgba(255, 255, 255, 0.55)'
            }}
          />
        </button>

        {isOpen && (
          <div id={`nav-section-${sectionKey}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map(item => renderNavItem(item))}
          </div>
        )}
      </div>
    )
  }

  const asideStyle: CSSProperties = {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '264px',
    flexShrink: 0,
    padding: '26px 24px 30px',
    gap: '28px',
    background: '#08080b',
    color: '#f9fafc',
    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '10px 0 40px rgba(0, 0, 0, 0.45)',
    transition: 'all 0.3s ease',
    overflow: 'hidden'
  }

  const brandContainerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '6px',
    position: 'relative',
    zIndex: 2
  }

  const footerStyle: CSSProperties = {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    marginTop: 'auto',
    paddingTop: '12px'
  }

  const bottomFillerStyle: CSSProperties = {
    width: isCollapsed ? '32px' : '48px',
    height: isCollapsed ? '16px' : '24px',
    borderRadius: '14px',
    border: isCollapsed ? '1px dashed rgba(255, 255, 255, 0.08)' : '1px dashed transparent',
    cursor: isCollapsed ? 'pointer' : 'default',
    backgroundColor: 'transparent',
    transition: 'border-color 0.2s ease, background-color 0.2s ease'
  }

  const handleFillerMouseEnter = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isCollapsed) return

    Object.assign(event.currentTarget.style, {
      borderColor: 'rgba(255, 255, 255, 0.16)',
      backgroundColor: 'rgba(255, 255, 255, 0.04)'
    })
  }

  const handleFillerMouseLeave = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!isCollapsed) return

    Object.assign(event.currentTarget.style, {
      borderColor: 'rgba(255, 255, 255, 0.08)',
      backgroundColor: 'transparent'
    })
  }

  const brandPrimaryTextStyle: CSSProperties = {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.45)' 
  }

  const brandSecondaryTextStyle: CSSProperties = {
    fontSize: '23px',
    fontWeight: 300,
    letterSpacing: '0.06em',
    margin: 0,
    color: '#ffffff'
  }

  const navContainerStyle: CSSProperties = {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    flex: 1,
    overflowY: 'auto',
    paddingRight: '4px'
  }

  const handleCollapseMouseEnter = (event: ReactMouseEvent<HTMLButtonElement>) => {
    Object.assign(event.currentTarget.style, {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderColor: 'rgba(255, 255, 255, 0.16)'
    })
  }

  const handleCollapseMouseLeave = (event: ReactMouseEvent<HTMLButtonElement>) => {
    Object.assign(event.currentTarget.style, {
      backgroundColor: 'rgba(255, 255, 255, 0.04)',
      borderColor: 'rgba(255, 255, 255, 0.08)'
    })
  }

  const collapseButtonStyle: CSSProperties = {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(255, 255, 255, 0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#f3f4f6',
    cursor: 'pointer',
    transition: 'all 0.25s ease'
  }

  return (
    <aside style={asideStyle}>
      <div style={brandContainerStyle}>
        <h1 style={brandSecondaryTextStyle}>Tillpoint POS</h1>
      </div>

      <nav style={navContainerStyle}>
        <>
          {renderSection('core')}
          {renderSection('management')}
        </>
    </nav>


      <div style={{ pointerEvents: 'none', position: 'absolute', inset: 0 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '28px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '220px',
            height: '220px',
            top: '-120px',
            left: '-120px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 70%)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '260px',
            height: '260px',
            bottom: '-80px',
            right: '-140px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at center, rgba(255, 150, 0, 0.12) 0%, rgba(255, 150, 0, 0) 70%)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.25) 45%, rgba(0, 0, 0, 0.6) 100%)'
          }}
        />
      </div>
    </aside>
  )
}

export default Navigation
