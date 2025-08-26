import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isDark: boolean
}

// Get system preference
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Apply theme to document
const applyTheme = (theme: Theme) => {
  if (typeof document === 'undefined') return

  const isDark = theme === 'dark' || (theme === 'system' && getSystemTheme() === 'dark')
  
  // Remove existing theme classes
  document.documentElement.classList.remove('light', 'dark')
  
  // Add new theme class
  document.documentElement.classList.add(isDark ? 'dark' : 'light')
  
  // Update data attribute for CSS variables
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      isDark: false,
      
      setTheme: (theme: Theme) => {
        const isDark = theme === 'dark' || (theme === 'system' && getSystemTheme() === 'dark')
        applyTheme(theme)
        set({ theme, isDark })
      },
      
      toggleTheme: () => {
        const { theme } = get()
        const newTheme: Theme = theme === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Apply theme on rehydration
          applyTheme(state.theme)
          
          // Listen for system theme changes
          if (typeof window !== 'undefined') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            mediaQuery.addEventListener('change', () => {
              if (state.theme === 'system') {
                applyTheme('system')
                // We can't call set here as it's not in scope
                // The theme will be updated on next store access
              }
            })
          }
        }
      },
    }
  )
)
