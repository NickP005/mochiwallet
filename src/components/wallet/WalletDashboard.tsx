import { Sidebar } from '@/components/ui/sidebar'
import { AccountView } from '@/components/wallet/AccountView'
import { useState, useEffect } from 'react'
import { HDWallet, useWallet, useAccounts } from 'mochimo-wallet'
import { AddAccountDialog } from './AddAccountDialog'
import { ManageAccountsDialog } from './ManageAccountsDialog'

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
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [manageAccountsOpen, setManageAccountsOpen] = useState(false)
  const w = useWallet()
  const acc = useAccounts()

  // Create new account
  const handleCreateAccount = async (name: string) => {
    try {
      setLoading(true)
      console.log('Creating new account:', name)
      const account = await acc.createAccount(name)
      console.log('New account created:', account)
    } catch (error) {
      console.error('Error creating account:', error)
      throw error // Let the dialog handle the error
    } finally {
      setLoading(false)
    }
  }

  // Import account from MCM file
  const handleImportAccount = async (file: File) => {
    try {
      setLoading(true)
      // TODO: Implement MCM file import
      console.log('Importing account from file:', file.name)
      throw new Error('MCM import not implemented yet')
    } catch (error) {
      console.error('Error importing account:', error)
      throw error
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

  const handleOpenSettings = () => {
    // TODO: Implement settings
    console.log('Open settings')
  }

  return (
    <div className="h-full flex">
      <Sidebar
        accounts={Object.values(accounts)}
        selectedAccount={acc.selectedAccount}
        onSelectAccount={a=>acc.setSelectedAccount(a.tag)}
        onCreateAccount={() => setAddAccountOpen(true)}
        onManageAccounts={() => setManageAccountsOpen(true)}
        onOpenSettings={handleOpenSettings}
        isOpen={sidebarOpen}
        onOpenChange={onSidebarOpenChange}
      />
      
      <AddAccountDialog
        isOpen={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onCreateAccount={handleCreateAccount}
        onImportAccount={handleImportAccount}
      />

      <ManageAccountsDialog
        isOpen={manageAccountsOpen}
        onClose={() => setManageAccountsOpen(false)}
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