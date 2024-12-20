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
  AlertCircle,
  AlertCircleIcon,
  X
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { WalletCore as WalletService, WalletAccount, MasterWallet, WalletCore } from '@/lib/core/wallet'
import { MochimoService } from '@/lib/services/mochimo'

import { Input } from '../ui/input'
import BigNumber from 'bignumber.js'
import CryptoJS from 'crypto-js'
import { useToast } from '@/components/ui/use-toast'
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

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

// Define form schema
const formSchema = z.object({
  destinationTag: z.string().min(1, "Destination tag is required"),
  amount: z.string().min(1, "Amount is required")
})

export function AccountView({ wallet, account, onUpdate }: AccountViewProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isActivated, setIsActivated] = useState<boolean | null>(null)
  const [checkingActivation, setCheckingActivation] = useState(false)
  const [activating, setActivating] = useState(false)
  const [balance, setBalance] = useState<string | null>(null)
  const [showSend, setShowSend] = useState(false)
  const [destinationTag, setDestinationTag] = useState('')
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destinationTag: "",
      amount: ""
    }
  })

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
      const currentWOTS = WalletService.computeWOTSAddress(wallet.masterSeed, account, account.wotsIndex)
      console.log('Current WOTS:', currentWOTS)
      console.log('derive current wots:', WalletService.computeWOTSAddress(wallet.masterSeed, account, account.wotsIndex))
      console.log('are they the same?', currentWOTS === WalletService.computeWOTSAddress(wallet.masterSeed, account, account.wotsIndex))
      // Update balance if account is activated
      if (response) {
        const tagResponse = await MochimoService.resolveTag(account.tag)
        console.log('Tag Response:', tagResponse)
        //compare with current wots address
        console.log('Current WOTS:', currentWOTS)
        console.log('Network WOTS:', tagResponse.addressConsensus)

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

  const handleSend = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true)
      setError('')

      // Convert amount to nanochains (1 MCM = 1e9 nMCM)
      const amountNano = parseInt(parseFloat(data.amount).toFixed(9).toString().replaceAll(".", ""))
      // Optional fee (could be added to form later)
      const fee = 500

      if (!wallet) {
        throw new Error('Wallet not found')
      }

      // Create transaction
      const tx = await WalletCore.createTransaction(
        wallet,
        account.index,
        data.destinationTag,
        amountNano,
        (fee)
      )

      // Convert transaction bytes to base64
      function _arrayBufferToBase64(buffer) {
        function b2a(a) {
            var c, d, e, f, g, h, i, j, o, b = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", k = 0, l = 0, m = "", n: string[] = [];
            if (!a) return a;
            // eslint-disable-next-line no-unused-expressions
            do c = a.charCodeAt(k++), d = a.charCodeAt(k++), e = a.charCodeAt(k++), j = c << 16 | d << 8 | e,
                f = 63 & j >> 18, g = 63 & j >> 12, h = 63 & j >> 6, i = 63 & j, n[l++] = b.charAt(f) + b.charAt(g) + b.charAt(h) + b.charAt(i);
            while (k < a.length);
            return m = n.join(""), o = a.length % 3, (o ? m.slice(0, o - 3) : m) + "===".slice(o || 3);
        }
        var binary = ''; var bytes = new Uint8Array(buffer);
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return b2a(binary);
    }
      const txBase64 = _arrayBufferToBase64(tx)

      // Send transaction to network
      console.log('Sending transaction to network...', txBase64)
      const response = await MochimoService.pushTransaction(txBase64)
      console.log('Push transaction response:', response)

      // Clear form and close send view
      form.reset()
      setShowSend(false)

      // Show success message
      toast({
        title: 'Transaction sent!',
        description: 'Your transaction has been broadcast to the network.',
        variant: 'default',
      })

      // Refresh balance after short delay
      setTimeout(() => {
        handleRefresh()
      }, 2000)

    } catch (err: any) {
      console.error('Send error:', err)
      setError(err.message || 'Failed to send transaction')

      toast({
        title: 'Transaction failed',
        description: err.message || 'Failed to send transaction',
        variant: 'destructive',
      })

    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentAddress = () => {
    return WalletService.computeWOTSAddress(wallet.masterSeed, account, account.wotsIndex)
  }

  const getNextAddress = () => {
    return WalletService.computeWOTSAddress(wallet.masterSeed, account, account.wotsIndex + 1)
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
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
              <div className="fixed inset-x-4 top-[50%] z-50 translate-y-[-50%] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
                <div className="bg-background border rounded-lg shadow-lg">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b p-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Send className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold">Send MCM</h2>
                        <p className="text-sm text-muted-foreground">
                          Transfer funds to another address
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => {
                        form.reset()
                        setShowSend(false)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Form */}
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSend)} className="p-4 space-y-4">
                      <FormField
                        control={form.control}
                        name="destinationTag"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <TagIcon className="h-4 w-4 text-muted-foreground" />
                              Destination Tag
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  placeholder="Enter destination tag"
                                  disabled={isLoading}
                                  className="pr-10"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                  onClick={() => {
                                    // Add QR code scanner functionality here
                                  }}
                                >
                                  <QrCode className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-muted-foreground" />
                              Amount
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.000000001"
                                  min="0"
                                  placeholder="0.0"
                                  disabled={isLoading}
                                  className="pr-16"
                                />
                                <div className="absolute right-0 top-0 h-full px-3 flex items-center text-sm font-medium text-muted-foreground">
                                  MCM
                                </div>
                              </div>
                            </FormControl>
                            <FormMessage />
                            {balance && (
                              <p className="text-sm text-muted-foreground">
                                Available: {formatBalance(balance).mcm} MCM
                              </p>
                            )}
                          </FormItem>
                        )}
                      />

                      {/* Actions */}
                      <div className="flex flex-col gap-2 pt-2">
                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full bg-primary hover:bg-primary/90"
                        >
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending Transaction...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Send MCM
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={isLoading}
                          onClick={() => {
                            form.reset()
                            setShowSend(false)
                          }}
                          className="w-full"
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 