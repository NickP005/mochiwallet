import './polyfills'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './lib/store'
import { App } from './App.tsx'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from "@/components/theme-provider"
import { MochimoWalletProvider } from "mochimo-wallet"
import { TooltipProvider } from '@radix-ui/react-tooltip'
import { ViewModeProvider } from '@/lib/contexts/ViewModeContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ViewModeProvider>
      <ThemeProvider defaultTheme="dark">
        <ErrorBoundary>
          <MochimoWalletProvider>
            <TooltipProvider>
              <App />
            </TooltipProvider>
          </MochimoWalletProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </ViewModeProvider>
  </React.StrictMode>,
)
