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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark">
      <ErrorBoundary>
        <MochimoWalletProvider>
            <App />
        </MochimoWalletProvider>

      </ErrorBoundary>
    </ThemeProvider>
  </React.StrictMode>,
)
