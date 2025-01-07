import { Sidebar } from '@/components/ui/sidebar'
import { AccountView } from '@/components/wallet/AccountView'
import { useState, useEffect } from 'react'
import { HDWallet, useWallet, useAccounts } from 'mochimo-wallet'

interface WalletDashboardProps {
  wallet: HDWallet
  sidebarOpen: boolean
  onSidebarOpenChange: (open: boolean) => void
}

export function WalletDashboard({ 
  wallet, 
  sidebarOpen, 
  onSidebarOpenChange 
}: WalletDashboardProps) {

  const [loading, setLoading] = useState(false)
  const w = useWallet()
  const acc = useAccounts()

  // Create new account
  const handleCreateAccount = async () => {
    try {
      setLoading(true)
      console.log('Creating new account...')
      const accountName = `Account ${acc.accounts.length + 1}`
      const account = await acc.createAccount(accountName)
      console.log('New account created:', account)
    } catch (error) {
      console.error('Error creating account:', error)
    } finally {
      setLoading(false)
    }
  }

  // Rename account
  const handleRenameAccount = async (index: number, name: string) => {
    try {
      //NOT IMPLEMENTED YET
      // const updatedAccount = {
      //   ...accounts[index],
      //   name
      // }

      // // Update accounts state
      // setAccounts(prev => ({
      //   ...prev,
      //   [index]: updatedAccount
      // }))

      // // Update wallet and save
      // wallet.accounts[index] = updatedAccount
      // await SecureStorage.saveWallet(wallet, wallet.password)
    } catch (error) {
      console.error('Error renaming account:', error)
    }
  }
  const accounts = acc.accounts
  return (
    <div className="h-full flex">
      <Sidebar
        accounts={Object.values(accounts)}
        selectedAccount={acc.selectedAccount}
        onSelectAccount={a=>acc.setSelectedAccount(a.tag)}
        onCreateAccount={handleCreateAccount}
        onRenameAccount={handleRenameAccount}
        isOpen={sidebarOpen}
        onOpenChange={onSidebarOpenChange}
      />
      
      <main className="flex-1 h-full overflow-auto">
        {acc.selectedAccount ? (
          <AccountView 
            account={accounts.find(a=>a.tag === acc.selectedAccount)!}
            onUpdate={(updated) => {
             console.log('updated account view :: ', updated)
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an account or create a new one
          </div>
        )}
      </main>
    </div>
  )
} 