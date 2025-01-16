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
  Hash,
  Coins,
  ArrowRight,
  Clock
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

import { MochimoService } from '@/lib/services/mochimo'
import { Account, useWallet, MasterSeed, useAccounts, useNetwork, NetworkProvider } from 'mochimo-wallet'

import { SendModal } from './SendModal'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider
} from '@/components/ui/tooltip'

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

const truncateMiddle = (text: string, startChars = 8, endChars = 8) => {
  if (text.length <= startChars + endChars) return text

  return `${text.slice(0, startChars)}...${text.slice(-endChars)}`
}

export function AccountView({ account, onUpdate }: AccountViewProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isActivated, setIsActivated] = useState<boolean | null>(null)
  const [checkingActivation, setCheckingActivation] = useState(false)
  const [activating, setActivating] = useState(false)

  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

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
      const response = await NetworkProvider.getNetwork().resolveTag(account.tag)
      // Account is activated if addressConsensus is not empty
      const isActivated = Boolean(response.success &&
        response.addressConsensus &&
        response.addressConsensus.length > 0)
      const currentAddress = response.addressConsensus.slice(2);
      //deduce current wotsindex from this
      let t1 = performance.now()
      const currentWotsAddressBeingUsed = ac.currentWOTSKeyPair?.wotsWallet.getAddress()!
      let t2 = performance.now()
      console.log('time taken to get wots address', t2 - t1)
      console.log('current wots address being used', Buffer.from(currentWotsAddressBeingUsed).toString('hex'))

      if (currentAddress && currentAddress !== Buffer.from(currentWotsAddressBeingUsed).toString('hex')) {
        console.error('current address does not match with the wots address being used')
        console.log('CURRENT NETWORK ADDRESS', currentAddress)
        console.log('CURRENTLY USED WOTS INDEX', account.wotsIndex)
        const t1 = performance.now()
        const currentWotsIndex = MasterSeed.deriveWotsIndexFromWotsAddrHash(Buffer.from(account.seed, 'hex'), Buffer.from(currentAddress, 'hex').subarray(20, 40), Buffer.from(account.faddress, 'hex'))
        const t2 = performance.now()
        console.log('current wots index', currentWotsIndex)
        console.log('time taken', t2 - t1)
        if (currentWotsIndex !== undefined && currentWotsIndex !== null) ac.updateAccount(account.tag, { wotsIndex: currentWotsIndex })
        console.log('updated wots index', currentWotsIndex)
      } else {
        console.log('current address matches with the wots address being used')
      }

      if (isActivated) {
        console.log('Account activation details:', {
          address: response.addressConsensus,
          balance: response.balanceConsensus,
          nodes: response.quorum.map(q => q.node.host)
        })
      }
      setIsActivated(isActivated)
      onUpdate(account)
    } catch (error) {
      console.error('Error checking activation:', error)
      setIsActivated(false)
    } finally {
      setCheckingActivation(false)
    }
  }

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    checkActivation().finally(() => {
      setRefreshing(false)
    })
  }
  const network = useNetwork()
  console.log("BLOCK HEIGHT", network.blockHeight)

  useEffect(() => {
    //when block height changes, check if the account needs to update its wots index.
    setRefreshing(true)
    checkActivation().finally(() => {
      setRefreshing(false)
    })
  }, [network.blockHeight, account.tag])


  // Copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You might want to add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(account.tag)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-background to-background/50">
      {/* Floating Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-10 backdrop-blur-md border-b border-border/50"
      >
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">

              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="p-2 rounded-full bg-primary/10 cursor-pointer"
              >
                <Wallet className="h-6 w-6 text-primary" />
              </motion.div>


              <div>
                <h1 className="text-xl font-bold">{account.name}</h1>
                <div className="flex items-center gap-2">
                  <TagIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="relative flex items-center group">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <code className="bg-muted/50 px-2 py-0.5 rounded-md font-mono text-xs text-primary/90 cursor-pointer">
                          {truncateMiddle(account.tag)}
                        </code>
                      </TooltipTrigger>
                      <TooltipContent>Click to copy address</TooltipContent>
                    </Tooltip>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleCopy}
                      className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <AnimatePresence mode="wait">
                        {copied ? (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                          >
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                          >
                            <Copy className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      whileHover={{ opacity: 1, y: 0 }}
                      className="absolute left-0 top-full mt-2 pointer-events-none bg-popover/95 backdrop-blur-sm text-popover-foreground text-xs rounded-md px-2 py-1 font-mono shadow-lg"
                    >
                      {account.tag}
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                  onClick={handleRefresh}
                  className="p-2 rounded-full hover:bg-muted/50"
                  disabled={refreshing}
                >
                  <RefreshCcw className={cn(
                    "h-5 w-5 text-muted-foreground",
                    refreshing && "animate-spin"
                  )} />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent>
                {refreshing ? 'Refreshing...' : 'Refresh balance'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Add overflow-y-auto here */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative group"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-card rounded-xl border border-border/50 overflow-hidden hover:shadow-lg transition-all duration-300"
            >
              <div className="p-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <Coins className="h-5 w-5 text-primary" />
                  <span className="font-medium">Available Balance</span>
                </div>

                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="flex flex-col"
                >
                  <div className="flex items-baseline gap-2">
                    <div className="font-mono">
                      <span className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                        {account.balance
                          ? (parseFloat(account.balance) / 1e9).toFixed(9)
                          : '0.000000000'
                        }
                      </span>
                      <span className="ml-2 text-xl text-muted-foreground font-medium">
                        MCM
                      </span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Button
                    size="lg"
                    onClick={() => setSendModalOpen(true)}
                    disabled={!isActivated}
                    className={cn(
                      "w-full h-24 relative overflow-hidden group",
                      isActivated
                        ? "bg-primary/10 hover:bg-primary/20 text-primary border-2 border-primary/20"
                        : "bg-muted border-2 border-muted"
                    )}
                  >
                    <motion.div
                      className="flex flex-col items-center gap-2 relative z-10"
                      whileHover={{ y: -5 }}
                    >
                      <Send className={cn(
                        "h-6 w-6",
                        isActivated ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className="font-semibold">Send</span>
                    </motion.div>
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={false}
                      whileHover={{ scale: 1.5, rotate: 45 }}
                    />
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                {isActivated
                  ? 'Send MCM to another address'
                  : 'Account needs to be activated first'
                }
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full h-24 relative overflow-hidden group border-2 hover:border-primary/20"
                  >
                    <motion.div
                      className="flex flex-col items-center gap-2 relative z-10"
                      whileHover={{ y: -5 }}
                    >
                      <QrCode className="h-6 w-6" />
                      <span className="font-semibold">Receive</span>
                    </motion.div>
                    <motion.div
                      className="absolute inset-0 bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity"
                      initial={false}
                      whileHover={{ scale: 1.5, rotate: 45 }}
                    />
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                Receive MCM - Show QR code and address
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-card rounded-xl border-2 border-border/50"
          >
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground">Recent Activity</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs hover:text-primary hover:bg-primary/10"
              >
                View All
              </Button>
            </div>
            {/* Transaction list will go here */}
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