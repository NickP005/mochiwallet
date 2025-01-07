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

import { MochimoService } from '@/lib/services/mochimo'
import { Account, useWallet, MasterSeed, useAccounts, useNetwork } from 'mochimo-wallet'

import { SendModal } from './SendModal'

interface AccountViewProps {
  account: Account
  onUpdate: (updated: Account) => void
}

// Temporary transaction type (we'll expand this later)
interface Transaction {
  type: 'send' | 'receive'
  amount: string
  timestamp: number
  address: string
}

export function AccountView({ account, onUpdate }: AccountViewProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isActivated, setIsActivated] = useState<boolean | null>(null)
  const [checkingActivation, setCheckingActivation] = useState(false)
  const [activating, setActivating] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)
  const [sendModalOpen, setSendModalOpen] = useState(false)

  const w = useWallet()
  const ac = useAccounts()
  const net = useNetwork()
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
    //check whether the current address matches with the wots index we are using
  }, [account.tag])

  // Format balance to MCM with 9 decimal places
  const formatBalance = (balanceStr: string | null): string => {
    if (!balanceStr) return '0.000000000 MCM'
    const balance = BigInt(balanceStr)
    const whole = balance / BigInt(1e9)
    const fraction = balance % BigInt(1e9)
    return `${whole}.${fraction.toString().padStart(9, '0')} MCM`
  }

  // Check activation status and balance
  const checkActivation = async () => {
    try {
      console.log('checking activation')
      setCheckingActivation(true)
      const response = await MochimoService.resolveTag(account.tag)
      // Account is activated if addressConsensus is not empty
      const isActivated = Boolean(response.success &&
        response.addressConsensus &&
        response.addressConsensus.length > 0)
      const currentAddress = response.addressConsensus;
      //deduce current wotsindex from this
      let t1 = performance.now()
      const currentWotsAddressBeingUsed = ac.currentWOTSKeyPair?.address
      let t2 = performance.now()
      console.log('time taken to get wots address', t2 - t1)
      console.log('current wots address being used', currentWotsAddressBeingUsed)

      if (currentAddress && currentAddress !== currentWotsAddressBeingUsed) {
        console.error('current address does not match with the wots address being used')
        console.log('current network address', currentAddress)
        console.log('next wots index', account.wotsIndex)
        const t1 = performance.now()
        const currentWotsIndex = MasterSeed.deriveWotsIndexFromWotsAddress(Buffer.from(account.seed, 'hex'), Buffer.from(currentAddress, 'hex'))
        const t2 = performance.now()
        console.log('current wots index', currentWotsIndex)
        console.log('time taken', t2 - t1)
        if (currentWotsIndex !== undefined && currentWotsIndex !== null) ac.updateAccount(account.tag, { wotsIndex: currentWotsIndex })
        console.log('updated wots index', currentWotsIndex)
      }

      if (isActivated) {
        console.log('Account activation details:', {
          address: response.addressConsensus,
          balance: response.balanceConsensus,
          nodes: response.quorum.map(q => q.node.host)
        })
      }
      setIsActivated(isActivated)

      // Update balance if account is activated
      if (response) {
        const tagResponse = await MochimoService.resolveTag(account.tag)
        if (tagResponse.success && tagResponse.balanceConsensus) {
          setBalance(tagResponse.balanceConsensus)
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
      const curr = ac.currentWOTSKeyPair?.address
      console.log(
        'activating with tag:: ', curr
      )
      setTimeout(async () => {
        await checkActivation()
        setActivating(false)
      }, 5000)
      try {
        await net.activateTag()
      } catch (err) {
        console.error('Error activating account:', err)
      } finally {
        setActivating(false)
      }

    } catch (err) {
      console.error('Error activating account:', err)
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
                  {account.name}
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
              <div className="flex items-baseline gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Hash className="h-4 w-4" />
                    <span>Available Balance</span>
                  </div>
                  <div className="font-mono">
                    <span className="text-2xl font-bold text-primary">
                      {checkingActivation ? (
                        <span className="text-muted-foreground">Loading...</span>
                      ) : (
                        formatBalance(balance).split(' ')[0]
                      )}
                    </span>
                    <span className="text-lg ml-2 text-muted-foreground">MCM</span>
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
              onClick={() => setSendModalOpen(true)}
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
                      <div className={`p-2 rounded-full ${tx.type === 'receive'
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
                      <div className={`font-medium ${tx.type === 'receive' ? 'text-green-500' : 'text-blue-500'
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

        </div>
      </div>

      <SendModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
      />
    </div>
  )
} 