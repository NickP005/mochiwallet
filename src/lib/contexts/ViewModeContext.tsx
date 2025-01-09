import { createContext, useContext, useEffect, useState } from 'react'

type ViewMode = 'popup' | 'panel'

interface ViewModeContextType {
  viewMode: ViewMode
  toggleViewMode: () => void
  isExtension: boolean
}

const ViewModeContext = createContext<ViewModeContextType>({ 
  viewMode: 'popup',
  toggleViewMode: () => {},
  isExtension: false
})

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>('popup')
  // Only check if we're in extension context
  const isExtension = typeof chrome !== 'undefined' && chrome.runtime !== undefined

  useEffect(() => {
    const isPanel = window.innerWidth > 360
    setViewMode(isPanel ? 'panel' : 'popup')
  }, [])

  const toggleViewMode = async () => {
    try {
      if (viewMode === 'popup') {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        console.log('Active tabs:', tabs)

        if (tabs[0]?.id) {
          console.log('Attempting to open side panel for tab:', tabs[0].id)
          
          // Send message to background script to handle sidePanel
          chrome.runtime.sendMessage({ 
            type: 'OPEN_SIDE_PANEL', 
            tabId: tabs[0].id 
          }, (response) => {
            if (response?.success) {
              console.log('Side panel opened successfully')
              setViewMode('panel')
              setTimeout(() => window.close(), 100)
            } else {
              console.error('Failed to open side panel:', response?.error)
            }
          })
        }
      } else {
        chrome.runtime.sendMessage({ 
          type: 'CLOSE_SIDE_PANEL'
        }, (response) => {
          if (response?.success) {
            console.log('Side panel closed successfully')
            setViewMode('popup')
          } else {
            console.error('Failed to close side panel:', response?.error)
          }
        })
      }
    } catch (error) {
      console.error('Failed to toggle view mode:', error)
      return false
    }
  }

  return (
    <ViewModeContext.Provider value={{ viewMode, toggleViewMode, isExtension }}>
      {children}
    </ViewModeContext.Provider>
  )
}

export const useViewMode = () => useContext(ViewModeContext) 