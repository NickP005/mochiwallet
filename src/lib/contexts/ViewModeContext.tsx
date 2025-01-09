import { createContext, useContext, useEffect, useState } from 'react'

type ViewMode = 'popup' | 'panel'

interface ViewModeContextType {
    viewMode: ViewMode
    toggleViewMode: () => void
    isExtension: boolean
}

const ViewModeContext = createContext<ViewModeContextType>({
    viewMode: 'popup',
    toggleViewMode: () => { },
    isExtension: false
})

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
    const [viewMode, setViewMode] = useState<ViewMode>('popup')
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime !== undefined

    useEffect(() => {
        // Retrieve the stored view mode from chrome.storage.local
        chrome.storage.local.get('viewMode', (result) => {
            if (result.viewMode) {
                setViewMode(result.viewMode)
            }
            if (result.viewMode === 'panel') {
                chrome.runtime.connect({ name: 'mochimo_side_panel' });
            }
        })
    }, [])

    const openPanelMode = async () => {
        try {
            console.log('current view mode', viewMode)
            if (viewMode === 'popup') {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
                console.log('Active tabs:', tabs)
                if (tabs[0]?.id) {
                    console.log('Attempting to open side panel for tab:', tabs[0].id)
                    // Close popup immediately after sending message
                    chrome.runtime.sendMessage({
                        type: 'OPEN_SIDE_PANEL',
                        tabId: tabs[0].id
                    }).then(res => {
                        console.log('response', res)
                        window.close()
                    })
                }
            } else {
                window.close();
            }
        } catch (error) {
            console.error('Failed to toggle view mode:', error)
            return false
        }
    }

    return (
        <ViewModeContext.Provider value={{ viewMode, toggleViewMode: openPanelMode, isExtension }}>
            {children}
        </ViewModeContext.Provider>
    )
}

export const useViewMode = () => useContext(ViewModeContext) 