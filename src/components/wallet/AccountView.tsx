import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  ShieldOff, 
  RefreshCcw, 
  Loader2,
  Send,
  QrCode,
  Settings,
  ChevronDown,
  ChevronUp,
  History,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Tag as TagIcon,
  CheckCircle,
  AlertTriangle,
  Wallet,
  Hash
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { WalletCore as WalletService, WalletAccount, MasterWallet } from '@/lib/core/wallet'
import { MochimoService } from '@/lib/services/mochimo'
import { SendTransaction } from './SendTransaction'
import BigNumber from 'bignumber.js'
import CryptoJS from 'crypto-js'

// Configure BigNumber
BigNumber.config({
  DECIMAL_PLACES: 8,
  ROUNDING_MODE: BigNumber.ROUND_DOWN,
  FORMAT: {
    decimalSeparator: '.',
    groupSeparator: '',
    groupSize: 3,
    secondaryGroupSize: 0,
    fractionGroupSeparator: '',
    fractionGroupSize: 0
  }
})

interface AccountViewProps {
  wallet: MasterWallet
  account: WalletAccount
  onUpdate: (updated: WalletAccount) => void
}

// Temporary transaction type (we'll expand this later)
interface Transaction {
  type: 'send' | 'receive'
  amount: string
  timestamp: number
  address: string
}

export function AccountView({ wallet, account, onUpdate }: AccountViewProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isActivated, setIsActivated] = useState<boolean | null>(null)
  const [checkingActivation, setCheckingActivation] = useState(false)
  const [activating, setActivating] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)
  const [showSend, setShowSend] = useState(false)

  // Temporary transactions (we'll implement real data later)
  const tempTransactions: Transaction[] = [
    {
      type: 'receive',
      amount: '100.00000000',
      timestamp: Date.now() - 3600000,
      address: '1234...5678'
    },
    {
      type: 'send',
      amount: '50.00000000',
      timestamp: Date.now() - 7200000,
      address: '8765...4321'
    }
  ]

  // Check activation status on mount and refresh
  useEffect(() => {
    checkActivation()
  }, [account.tag])

  // Format balance to show both nanoMCM and MCM
  const formatBalance = (balanceStr: string | null): { nano: string, mcm: string } => {
    if (!balanceStr) return { 
      nano: '0', 
      mcm: '0.000000000' 
    }
    
    try {
      console.log('Raw balance:', balanceStr)
      
      const balance = new BigNumber(balanceStr)
      const mcm = balance.dividedBy(new BigNumber('1000000000'))
      
      console.log('BigNumber calc:', {
        original: balance.toString(),
        divided: mcm.toString()
      })
      
      return {
        nano: balance.toString(),
        mcm: mcm.toFixed(9)
      }
    } catch (error) {
      console.error('Error formatting balance:', error)
      return { 
        nano: '0', 
        mcm: '0.000000000' 
      }
    }
  }

  // Check activation status and balance
  const checkActivation = async () => {
    try {
      setCheckingActivation(true)
      const response = await WalletService.checkActivationStatus(account)
      setIsActivated(response)
      
      // Update balance if account is activated
      if (response) {
        const tagResponse = await MochimoService.resolveTag(account.tag)
        console.log('Tag Response:', tagResponse)
        
        if (tagResponse.success && tagResponse.balanceConsensus) {
          // Balance is already in nanoMCM, no need to convert
          const rawBalance = tagResponse.balanceConsensus
          console.log('Raw Balance from API:', rawBalance)
          setBalance(rawBalance)
        }
      } else {
        setBalance(null)
      }

      onUpdate(account)
    } catch (error) {
      console.error('Error checking activation:', error)
      setIsActivated(false)
      setBalance(null)
    } finally {
      setCheckingActivation(false)
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await checkActivation()
    } finally {
      setRefreshing(false)
    }
  }

  // Handle activation
  const handleActivate = async () => {
    try {
      setActivating(true)
      const success = await WalletService.activateAccount(wallet, account.index)
      
      if (success) {
        setTimeout(async () => {
          await checkActivation()
          setActivating(false)
        }, 5000)
      } else {
        setActivating(false)
      }
    } catch (error) {
      console.error('Error activating account:', error)
      setActivating(false)
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You might want to add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleSend = async (data: { tag: string; amount: string }) => {
    // Implement send transaction logic here
    console.log('Sending transaction:', data)
  }

  const getCurrentAddress = () => {
    const currentWOTSSeed = CryptoJS.SHA256(
      WalletService.deriveAccountSeed(wallet.masterSeed, account.index) + 
      account.wotsIndex.toString(16).padStart(8, '0')
    ).toString()

    return Buffer.from(
      WalletService.wots.generatePKFrom(currentWOTSSeed, account.tag)
    ).toString('hex')
  }

  const getNextAddress = () => {
    const nextWOTSSeed = CryptoJS.SHA256(
      WalletService.deriveAccountSeed(wallet.masterSeed, account.index) + 
      (account.wotsIndex + 1).toString(16).padStart(8, '0')
    ).toString()

    return Buffer.from(
      WalletService.wots.generatePKFrom(nextWOTSSeed, account.tag)
    ).toString('hex')
  }

  const advancedSection = (
    <CollapsibleContent className="space-y-4 pt-4">
      <div className="rounded-lg border p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Current Address (Index: {account.wotsIndex})</label>
          <code className="block text-xs bg-muted p-2 rounded break-all">
            {getCurrentAddress()}
          </code>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Next Address (Index: {account.wotsIndex + 1})</label>
          <code className="block text-xs bg-muted p-2 rounded break-all">
            {getNextAddress()}
          </code>
        </div>
      </div>
    </CollapsibleContent>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-8 max-w-4xl mx-auto">
          {/* Header Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-card to-card/50 rounded-xl p-6 shadow-lg border border-border/50"
          >
            {/* Account Name and Tag */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {account.name || `Account ${account.index + 1}`}
                </h2>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                <code className="bg-muted/50 px-2 py-0.5 rounded-md font-mono text-primary/90">
                  {account.tag}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-primary/10"
                  onClick={() => copyToClipboard(account.tag)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Status and Refresh */}
            <div className="flex items-center justify-between mb-6 text-sm">
              <div className="flex items-center gap-2">
                {checkingActivation ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCcw className="h-4 w-4 animate-spin" />
                    <span>Checking status...</span>
                  </div>
                ) : isActivated ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle className="h-4 w-4" />
                    <span>Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Not Active</span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-7 px-2 hover:bg-primary/10"
              >
                <RefreshCcw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Balance */}
            {isActivated && (
              <div className="flex flex-col gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Hash className="h-4 w-4" />
                    <span>Available Balance</span>
                  </div>
                  <div className="font-mono">
                    {checkingActivation ? (
                      <span className="text-muted-foreground">Loading...</span>
                    ) : (
                      <>
                        <div>
                          <span className="text-2xl font-bold text-primary">
                            {formatBalance(balance).mcm}
                          </span>
                          <span className="text-lg ml-2 text-muted-foreground">MCM</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatBalance(balance).nano} nanoMCM
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-4"
          >
            <Button
              size="lg"
              className="h-24 flex flex-col items-center justify-center gap-2 bg-gradient-to-b from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              disabled={!isActivated}
              onClick={() => setShowSend(true)}
            >
              <Send className="h-6 w-6" />
              <span>Send</span>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-24 flex flex-col items-center justify-center gap-2 border-2 hover:bg-primary/5"
            >
              <QrCode className="h-6 w-6" />
              <span>Receive</span>
            </Button>
          </motion.div>

          {/* Activation Button */}
          {!isActivated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center"
            >
              <Button 
                size="lg"
                variant="default"
                onClick={handleActivate}
                disabled={activating}
                className="w-full max-w-md bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary"
              >
                {activating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Activating Account...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Activate Account
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {/* Transactions Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-xl border border-border/50 overflow-hidden"
          >
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Recent Transactions</h3>
              </div>
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </div>
            <div className="divide-y divide-border/50">
              {tempTransactions.map((tx, i) => (
                <div key={i} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        tx.type === 'receive' 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-blue-500/10 text-blue-500'
                      }`}>
                        {tx.type === 'receive' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-medium">{tx.type === 'receive' ? 'Received' : 'Sent'}</div>
                        <div className="text-sm text-muted-foreground">{tx.address}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-medium ${
                        tx.type === 'receive' ? 'text-green-500' : 'text-blue-500'
                      }`}>
                        {tx.type === 'receive' ? '+' : '-'}{tx.amount} MCM
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(tx.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Advanced Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full flex items-center justify-between"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span>Advanced Options</span>
                  </div>
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              {showAdvanced && advancedSection}
            </Collapsible>
          </motion.div>

          {showSend && (
            <SendTransaction
              onClose={() => setShowSend(false)}
              onSend={handleSend}
            />
          )}
        </div>
      </div>
    </div>
  )
} 