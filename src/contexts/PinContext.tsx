import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient'

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
    
    // Get PIN from environment variable
    const validPin = import.meta.env.VITE_PIN_ADMIN_SECRET || '1967'
    
    // Simulate a small delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    if (pin === validPin) {
      setIsPinValid(true)
      sessionStorage.setItem('pin_validated', 'true')
      setIsCheckingPin(false)
      return true
    } else {
      setIsPinValid(false)
      setIsCheckingPin(false)
      return false
    }
  }

  const setPinValid = (valid: boolean) => {
    setIsPinValid(valid)
  }

  return (
    <PinContext.Provider value={{
      isPinValid,
      isCheckingPin,
      validatePin,
      setPinValid
    }}>
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
