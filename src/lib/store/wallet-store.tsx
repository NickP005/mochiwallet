import * as React from "react"
import browser from 'webextension-polyfill'

interface WalletState {
  address: string | null
  balance: number
  isInitialized: boolean
}

interface StoredWallet {
  wallet?: {
    address: string | null
    balance: number
  }
}

interface WalletContextType {
  state: WalletState
  createWallet: () => Promise<void>
  importWallet: (privateKey: string) => Promise<void>
}

const WalletContext = React.createContext<WalletContextType | undefined>(undefined)

const initialState: WalletState = {
  address: null,
  balance: 0,
  isInitialized: false,
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<WalletState>(initialState)

  React.useEffect(() => {
    // Check if wallet exists in storage
    browser.storage.local.get('wallet').then((data: StoredWallet) => {
      const walletData = data.wallet
      if (walletData && 'address' in walletData && 'balance' in walletData) {
        setState(prev => ({ 
          ...prev, 
          address: walletData.address,
          balance: walletData.balance,
          isInitialized: true 
        }))
      }
    })
  }, [])

  const createWallet = async () => {
    // TODO: Implement wallet creation logic
    console.log('Creating new wallet...')
  }

  const importWallet = async (privateKey: string) => {
    // TODO: Implement wallet import logic
    console.log('Importing wallet...', privateKey)
  }

  return (
    <WalletContext.Provider value={{ state, createWallet, importWallet }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = React.useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
} 