import { useState } from 'react'
import { WalletCore, WalletAccount } from '@/lib/core/wallet'
import { SecureStorage } from '@/lib/utils/storage'
import { Sidebar } from '@/components/ui/sidebar'
import { AccountView } from '@/components/wallet/AccountView'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { WalletService } from '@/lib/services/wallet'

interface WalletDashboardProps {
  wallet: any
  sidebarOpen: boolean
  onSidebarOpenChange: (open: boolean) => void
}

export function WalletDashboard({ 
  wallet, 
  sidebarOpen, 
  onSidebarOpenChange 
}: WalletDashboardProps) {
  const [accounts, setAccounts] = useState<Record<number, WalletAccount>>(wallet.accounts || {})
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // Create new account
  const handleCreateAccount = async () => {
    try {
      setLoading(true)
      console.log('Creating new account...')
      
      const accountIndex = Object.keys(accounts).length
      const account = await WalletService.createAccount(wallet, wallet.password!)
      
      // Update wallet accounts
      wallet.accounts[accountIndex] = account
      
      // Update accounts state
      setAccounts(prev => ({ ...prev, [accountIndex]: account }))
      
      // Save updated wallet
      console.log('Saving updated wallet...')
      await SecureStorage.saveWallet(wallet, wallet.password)
      console.log('Wallet saved with new account')
      
      // Select the new account
      setSelectedAccount(accountIndex)
    } catch (error) {
      console.error('Error creating account:', error)
    } finally {
      setLoading(false)
    }
  }

  // Rename account
  const handleRenameAccount = async (index: number, name: string) => {
    try {
      const updatedAccount = {
        ...accounts[index],
        name
      }

      // Update accounts state
      setAccounts(prev => ({
        ...prev,
        [index]: updatedAccount
      }))

      // Update wallet and save
      wallet.accounts[index] = updatedAccount
      await SecureStorage.saveWallet(wallet, wallet.password)
    } catch (error) {
      console.error('Error renaming account:', error)
    }
  }

  return (
    <div className="h-full relative">
      <Sidebar
        accounts={Object.values(accounts)}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
        onCreateAccount={handleCreateAccount}
        onRenameAccount={handleRenameAccount}
        isOpen={sidebarOpen}
        onOpenChange={onSidebarOpenChange}
      />
      
      <main className="h-full overflow-auto px-4">
        {selectedAccount !== null && accounts[selectedAccount] ? (
          <AccountView 
            account={accounts[selectedAccount]}
            onUpdate={(updated) => {
              setAccounts(prev => ({
                ...prev,
                [selectedAccount]: updated
              }))
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