import React from 'react'

interface CustomerIconProps {
  customer: {
    icon?: string
    name: string
    gender?: 'male' | 'female'
  }
  size?: 'small' | 'medium' | 'large'
  className?: string
}

const CustomerIcon: React.FC<CustomerIconProps> = ({ 
  customer, 
  size = 'medium',
  className = ''
}) => {
  const sizeMap = {
    small: '24px',
    medium: '40px',
    large: '56px'
  }

  const fontSizeMap = {
    small: '12px',
    medium: '16px',
    large: '20px'
  }

  // If customer has an icon, display it
  if (customer.icon) {
    return (
      <div 
        className={className}
        style={{
          width: sizeMap[size],
          height: sizeMap[size],
          borderRadius: '8px',
          background: '#2a2a2a',
          border: '1px solid #3a3a3a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
      >
        <img
          src={`/images/icons/${customer.icon}.png`}
          alt={customer.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '6px'
          }}
          onError={(e) => {
            // Fallback to initials if image fails
            const target = e.target as HTMLImageElement
            target.style.display = 'none'
            if (target.parentElement) {
              const div = document.createElement('div')
              div.style.cssText = `
                width: 100%;
                height: 100%;
                border-radius: 6px;
                background: linear-gradient(135deg, #7d8d86 0%, #3e3f29 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${fontSizeMap[size]};
                color: #ffffff;
                font-weight: 600;
              `
              div.textContent = customer.name.charAt(0).toUpperCase()
              target.parentElement.appendChild(div)
            }
          }}
        />
      </div>
    )
  }

  // Fallback to initials with gender-based styling
  const getInitialsBackground = () => {
    if (customer.gender === 'female') {
      return 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' // Pink gradient for female
    } else if (customer.gender === 'male') {
      return 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' // Blue gradient for male
    }
    return 'linear-gradient(135deg, #7d8d86 0%, #3e3f29 100%)' // Default gradient
  }

  return (
    <div 
      className={className}
      style={{
        width: sizeMap[size],
        height: sizeMap[size],
        borderRadius: '8px',
        background: getInitialsBackground(),
        border: '1px solid #3a3a3a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: fontSizeMap[size],
        color: '#ffffff',
        fontWeight: 600,
        textTransform: 'uppercase'
      }}
    >
      {customer.name.charAt(0).toUpperCase()}
    </div>
  )
}

export default CustomerIcon
