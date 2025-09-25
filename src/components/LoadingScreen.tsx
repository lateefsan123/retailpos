import React, { useState, useEffect } from 'react'

interface LoadingScreenProps {
  isVisible: boolean
  message?: string
}

// Component for animated dots
const AnimatedDots = () => {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '') return '.'
        if (prev === '.') return '..'
        if (prev === '..') return '...'
        return ''
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return <span>{dots}</span>
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  isVisible, 
  message = "Switching Branch..." 
}) => {
  if (!isVisible) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: 'url(images/loading/loadingbg.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      animation: 'fadeIn 0.3s ease-in-out'
    }}>

      {/* Branch name text positioned at top left */}
      <div style={{
        position: 'absolute',
        top: '40px',
        left: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '12px'
      }}>
        {/* Custom message */}
        <div style={{
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: '600',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
          textAlign: 'left',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '12px 24px',
          borderRadius: '25px',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          {message.replace('...', '')}<AnimatedDots />
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0) scale(1);
          }
          40% {
            transform: translateY(-10px) scale(1.05);
          }
          60% {
            transform: translateY(-5px) scale(1.02);
          }
        }
        
      `}</style>
    </div>
  )
}

export default LoadingScreen
