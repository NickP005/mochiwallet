import { Sidebar } from '@/components/ui/sidebar'
import { AccountView } from '@/components/wallet/AccountView'
import { WalletAccount, WalletCore } from '@/lib/core/wallet'
import { SecureStorage } from '@/lib/utils/storage'
import { useState, useEffect } from 'react'
import { HDWallet, useWallet } from 'mochimo-wallet'

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

  // Select first account by default
  // useEffect(() => {
  //   if (Object.keys(accounts).length > 0 && selectedAccount === null) {
  //     setSelectedAccount(0)
  //   }
  // }, [accounts, selectedAccount])
  const w = useWallet()
  // Create new account
  const handleCreateAccount = async () => {
    try {
      setLoading(true)
      console.log('Creating new account...')

      const accountName = `Account ${w.getAccounts().length + 1}`
      const account = await w.createAccount(accountName)
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
  const accounts = w.getAccounts()
  return (
    <div className="h-full flex">
      <Sidebar
        accounts={Object.values(accounts)}
        selectedAccount={w.activeAccount?.index!}
        onSelectAccount={w.setActiveAccount}
        onCreateAccount={handleCreateAccount}
        onRenameAccount={handleRenameAccount}
        isOpen={sidebarOpen}
        onOpenChange={onSidebarOpenChange}
      />
      
      <main className="flex-1 h-full overflow-auto">
        {w.activeAccount ? (
          <AccountView 
            account={w.activeAccount!}
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