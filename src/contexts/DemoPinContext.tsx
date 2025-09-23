import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface PinContextType {
  isPinValid: boolean | null
  isCheckingPin: boolean
  validatePin: (pin: string) => Promise<boolean>
  setPinValid: (valid: boolean) => void
}

const PinContext = createContext<PinContextType | undefined>(undefined)

interface PinProviderProps {
  children: ReactNode
}

export const PinProvider: React.FC<PinProviderProps> = ({ children }) => {
  const [isPinValid, setIsPinValid] = useState<boolean | null>(null)
  const [isCheckingPin, setIsCheckingPin] = useState(false)

  // Check if PIN is already validated in session storage
  useEffect(() => {
    const pinValidated = sessionStorage.getItem('pin_validated')
    if (pinValidated === 'true') {
      setIsPinValid(true)
    } else {
      setIsPinValid(false)
    }
  }, [])

  const validatePin = async (pin: string): Promise<boolean> => {
    setIsCheckingPin(true)
    
    try {
      // Simulate PIN validation delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Demo mode: accept any 4-digit PIN
      const isValid = /^\d{4}$/.test(pin)
      
      if (isValid) {
        setIsPinValid(true)
        sessionStorage.setItem('pin_validated', 'true')
      } else {
        setIsPinValid(false)
        sessionStorage.removeItem('pin_validated')
      }
      
      return isValid
    } catch (error) {
      console.error('PIN validation error:', error)
      setIsPinValid(false)
      sessionStorage.removeItem('pin_validated')
      return false
    } finally {
      setIsCheckingPin(false)
    }
  }

  const setPinValid = (valid: boolean) => {
    setIsPinValid(valid)
    if (valid) {
      sessionStorage.setItem('pin_validated', 'true')
    } else {
      sessionStorage.removeItem('pin_validated')
    }
  }

  const value: PinContextType = {
    isPinValid,
    isCheckingPin,
    validatePin,
    setPinValid,
  }

  return (
    <PinContext.Provider value={value}>
      {children}
    </PinContext.Provider>
  )
}

export const usePin = () => {
  const context = useContext(PinContext)
  if (context === undefined) {
    throw new Error('usePin must be used within a PinProvider')
  }
  return context
}
