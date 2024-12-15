import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { WalletCore, WalletAccount } from '@/lib/core/wallet'
import { SecureStorage } from '@/lib/utils/storage'

import { 
  Wallet, 
  CircleDollarSign, 
  Send, 
  RefreshCcw,
  Copy
} from 'lucide-react'

interface WalletDashboardProps {
  wallet: any
}

export function WalletDashboard({ wallet }: WalletDashboardProps) {
  const [accounts, setAccounts] = useState<Record<number, WalletAccount>>(wallet.accounts || {})
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // Create new account
  const handleCreateAccount = async () => {
    try {
      setLoading(true)
      console.log('Creating new account...')
      
      const accountIndex = Object.keys(accounts).length
      const account = WalletCore.createAccount(wallet, accountIndex)
      
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

  // Copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Render account card
  const renderAccountCard = (account: WalletAccount, index: number) => {
    const isSelected = selectedAccount === index

    return (
      <div 
        key={index}
        className={`p-4 rounded-lg border ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'} cursor-pointer`}
        onClick={() => setSelectedAccount(index)}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5" />
            <h3 className="font-medium">Account {index + 1}</h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                copyToClipboard(account.currentWOTS.publicKey)
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Address:</span>
            <span className="font-mono truncate max-w-[200px]">
              {account.currentWOTS.publicKey}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Tag:</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono">{account.tag}</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  copyToClipboard(account.tag)
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {isSelected && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button size="sm" className="w-full">
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
            <Button size="sm" className="w-full">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Your Wallet</h2>
        <Button 
          onClick={handleCreateAccount}
          disabled={loading}
        >
          Create Account
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(accounts).map(([index, account]) => 
          renderAccountCard(account, parseInt(index))
        )}
      </div>

      {Object.keys(accounts).length === 0 && (
        <div className="text-center py-8">
          <CircleDollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No accounts yet. Create one to get started.</p>
        </div>
      )}

      {selectedAccount !== null && accounts[selectedAccount] && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-4">Account Details</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500">Current Address</label>
                <div className="font-mono text-sm break-all">
                  {accounts[selectedAccount].currentWOTS.publicKey}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Next Address</label>
                <div className="font-mono text-sm break-all">
                  {accounts[selectedAccount].nextWOTS.publicKey}
                </div>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-500">Used Addresses</label>
              <div className="mt-1 max-h-32 overflow-y-auto">
                {accounts[selectedAccount].usedAddresses.map((address, i) => (
                  <div key={i} className="font-mono text-sm break-all mb-1">
                    {address}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 