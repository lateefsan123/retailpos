import { useState, useEffect, useCallback } from 'react'

interface BarcodeScannerOptions {
  onBarcodeScanned: (barcode: string) => void
  debounceMs?: number
  minLength?: number
  maxLength?: number
  isActive?: boolean
  context?: string // Unique context identifier
}

// Global state to manage which scanner is active
let activeScanner: { context: string; onBarcodeScanned: (barcode: string) => void } | null = null

// Global flag to track if any modal is open
let isModalOpen = false

// Function to set modal state
export const setModalOpen = (open: boolean) => {
  isModalOpen = open
}

export const useBarcodeScanner = ({
  onBarcodeScanned,
  debounceMs = 100,
  minLength = 8,
  maxLength = 20,
  isActive = true,
  context = 'default'
}: BarcodeScannerOptions) => {
  const [isListening, setIsListening] = useState(false)
  const [currentInput, setCurrentInput] = useState('')
  const [lastKeyTime, setLastKeyTime] = useState(0)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Only handle if this is the active scanner and no modal is open (except for product-modal)
    if (!activeScanner || activeScanner.context !== context) {
      return
    }
    
    // If a modal is open and this is not the product-modal scanner, don't handle
    if (isModalOpen && context !== 'product-modal') {
      return
    }

    const now = Date.now()
    
    // Reset input if too much time has passed (indicates manual typing)
    if (now - lastKeyTime > debounceMs * 3) { // Increased from 2 to 3 for faster scanners
      setCurrentInput('')
    }
    
    setLastKeyTime(now)
    
    // Handle Enter key (barcode scanner typically sends Enter at the end)
    if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      
      // Trim the captured value and ensure it meets the configured length bounds
      const trimmedInput = currentInput.trim()
      console.log('🔍 Barcode scanner detected Enter, input:', trimmedInput, 'length:', trimmedInput.length, 'min:', minLength, 'max:', maxLength)
      if (trimmedInput.length >= minLength && trimmedInput.length <= maxLength) {
        console.log('✅ Barcode valid, calling onBarcodeScanned')
        onBarcodeScanned(trimmedInput)
        setCurrentInput('')
        return
      }

      // Out-of-range inputs are treated as manual typing and discarded
      setCurrentInput('')
      return
    }
    
        // Handle regular character input
        if (event.key.length === 1) {
          setCurrentInput(prev => {
            const newInput = prev + event.key
            console.log('🔍 Barcode scanner input:', newInput)
            return newInput
          })
        }
        
        // Handle special keys that might be part of barcode
        if (event.key === 'Tab' || event.key === 'Shift' || event.key === 'Control' || event.key === 'Alt') {
          // These keys are often sent by barcode scanners, ignore them
          return
        }
  }, [currentInput, lastKeyTime, debounceMs, minLength, maxLength, onBarcodeScanned, context])

  const startListening = useCallback(() => {
    setIsListening(true)
    setCurrentInput('')
    setLastKeyTime(Date.now())
    
    // Set this as the active scanner
    activeScanner = { context, onBarcodeScanned }
  }, [context, onBarcodeScanned])

  const stopListening = useCallback(() => {
    setIsListening(false)
    setCurrentInput('')
    
    // Clear active scanner if this was it
    if (activeScanner && activeScanner.context === context) {
      activeScanner = null
    }
  }, [context])

  useEffect(() => {
    if (isListening && isActive) {
      document.addEventListener('keydown', handleKeyDown, true) // Use capture phase
      
      // Add a fallback handler for direct input events
      const handleInput = (event: Event) => {
        if (event.target && (event.target as HTMLElement).tagName === 'INPUT') {
          const input = event.target as HTMLInputElement
          if (input.value && input.value.length >= minLength && input.value.length <= maxLength) {
            console.log('🔍 Fallback barcode detected:', input.value)
            onBarcodeScanned(input.value)
            input.value = ''
          }
        }
      }
      
      document.addEventListener('input', handleInput, true)
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true)
        document.removeEventListener('input', handleInput, true)
      }
    }
  }, [isListening, isActive, handleKeyDown, minLength, maxLength, onBarcodeScanned])

  return {
    isListening,
    startListening,
    stopListening,
    currentInput
  }
}
