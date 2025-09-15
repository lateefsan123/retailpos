import { useEffect } from 'react'
import { useNav } from '../contexts/NavContext'

export const useNavCollapse = () => {
  const { isCollapsed, setIsCollapsed } = useNav()

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Don't collapse if already collapsed
      if (isCollapsed) return

      // Don't collapse if clicking on navigation
      const nav = document.querySelector('nav')
      if (nav && nav.contains(e.target as Node)) return

      // Don't collapse if clicking on interactive elements
      const target = e.target as HTMLElement
      const isInteractive = target.closest('button, a, input, select, textarea, [role="button"], [onclick]')
      
      if (!isInteractive) {
        setIsCollapsed(true)
      }
    }

    // Add event listener with a small delay to avoid immediate collapse
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleGlobalClick)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleGlobalClick)
    }
  }, [isCollapsed, setIsCollapsed])
}
