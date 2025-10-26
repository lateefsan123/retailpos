import React, { useState, useRef, useEffect } from 'react'

interface ActionDropdownProps {
  actions: Array<{
    label: string
    icon?: string
    onClick: () => void
    destructive?: boolean
  }>
  triggerIcon?: string
  triggerText?: string
  size?: 'sm' | 'md' | 'lg'
}

const ActionDropdown: React.FC<ActionDropdownProps> = ({
  actions,
  triggerIcon = 'fa-solid fa-ellipsis-vertical',
  triggerText,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Calculate dropdown position
  const calculatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        right: window.innerWidth - rect.right - window.scrollX
      })
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const sizeStyles = {
    sm: {
      button: '8px 12px',
      fontSize: '12px',
      iconSize: '12px'
    },
    md: {
      button: '10px 16px',
      fontSize: '14px',
      iconSize: '14px'
    },
    lg: {
      button: '12px 20px',
      fontSize: '16px',
      iconSize: '16px'
    }
  }

  const currentSize = sizeStyles[size]

  return (
    <div className="dropdown-container" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          calculatePosition()
          setIsOpen(!isOpen)
        }}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          padding: currentSize.button,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          color: 'var(--text-primary)',
          fontSize: currentSize.fontSize,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-nested)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-card)'
        }}
      >
        {triggerIcon && <i className={triggerIcon} style={{ fontSize: currentSize.iconSize }}></i>}
        {triggerText && <span>{triggerText}</span>}
        {!triggerText && !triggerIcon && <i className="fa-solid fa-ellipsis-vertical" style={{ fontSize: currentSize.iconSize }}></i>}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            right: dropdownPosition.right,
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 9999,
            minWidth: '160px',
            overflow: 'hidden'
          }}
        >
          {actions.map((action, index) => (
            <React.Fragment key={index}>
              <button
                onClick={() => {
                  action.onClick()
                  setIsOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 16px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: currentSize.fontSize,
                  color: action.destructive ? '#dc2626' : '#374151',
                  transition: 'background-color 0.2s ease',
                  borderRadius: index === 0 && actions.length === 1 ? '8px' : 
                              index === 0 ? '8px 8px 0 0' : 
                              index === actions.length - 1 ? '0 0 8px 8px' : '0'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = action.destructive ? '#fef2f2' : '#f3f4f6'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'none'
                }}
              >
                {action.icon && <i className={action.icon} style={{ fontSize: currentSize.iconSize }}></i>}
                {action.label}
              </button>
              {/* Separator line before destructive actions */}
              {action.destructive && index < actions.length - 1 && (
                <div style={{
                  height: '1px',
                  background: '#e5e7eb',
                  margin: '4px 0'
                }}></div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

export default ActionDropdown
