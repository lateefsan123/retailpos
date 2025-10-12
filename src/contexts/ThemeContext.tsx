import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Default to light mode as requested
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first, then default to light
    const savedTheme = localStorage.getItem('theme') as Theme
    return savedTheme && ['light', 'dark'].includes(savedTheme) ? savedTheme : 'light'
  })

  useEffect(() => {
    // Save theme to localStorage whenever it changes
    localStorage.setItem('theme', theme)
    
    // Apply theme to document root for CSS custom properties
    document.documentElement.setAttribute('data-theme', theme)
    
    // Update body class for additional styling if needed
    document.body.className = `theme-${theme}`
  }, [theme])

  const toggleTheme = () => {
    setThemeState(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  const value: ThemeContextType = {
    theme,
    toggleTheme,
    setTheme
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
