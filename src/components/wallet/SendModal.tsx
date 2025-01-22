import { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTransaction, useWallet, useAccounts } from 'mochimo-wallet'
import { CheckCircle2, Loader2, Copy, Search, ArrowLeft, ArrowRight, ArrowDownUp, Wallet, SendHorizontal, Coins, Receipt } from 'lucide-react'
import { TagUtils } from 'mochimo-wots'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { AccountAvatar } from '../ui/account-avatar'
import { motion, AnimatePresence } from 'framer-motion'
import { Combobox } from "@/components/ui/combobox"
import { AddressInput } from "@/components/ui/address-input"
import { AmountInput } from "@/components/ui/amount-input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SendModalProps {
  isOpen: boolean
  onClose: () => void
}

type Step = 'details' | 'confirm' | 'success'

interface TransactionDetails {
  amount: bigint
  fee: bigint
  total: bigint
  change: bigint
}

export function SendModal({ isOpen, onClose }: SendModalProps) {
  const [step, setStep] = useState<Step>('details')
  const [destination, setDestination] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState<{ txid: string } | null>(null)
  const [showAddressCommand, setShowAddressCommand] = useState(false)
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [fee, setFee] = useState("500") // 500 nano MCM default
  const [amountError, setAmountError] = useState<string | null>(null)
  const [destinationError, setDestinationError] = useState<string | null>(null)

  const w = useWallet()
  const acc = useAccounts()
  const tx = useTransaction()

  // Add click outside handler for command
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const commandElement = document.getElementById('address-command')
      if (showAddressCommand && 
          commandElement && 
          !commandElement.contains(event.target as Node)) {
        setShowAddressCommand(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAddressCommand])

  // Calculate max amount user can send
  const getMaxAmount = () => {
    if (!currentAccount?.balance) return "0"
    const balance = BigInt(currentAccount.balance)
    const feeAmount = BigInt(fee)
    
    if (balance <= feeAmount) return "0"
    
    // Calculate the maximum amount in nano MCM first
    const maxNano = balance - feeAmount
    
    // Convert to MCM with proper decimal places
    const mcmWhole = maxNano / BigInt(1e9)
    const mcmDecimal = (maxNano % BigInt(1e9)).toString().padStart(9, '0')
    
    return `${mcmWhole}.${mcmDecimal}`
  }

  const handleMax = () => {
    setAmount(getMaxAmount())
    setAmountError(null) // Clear any existing errors
  }

  const validateAmount = (value: string) => {
    if (!value) return null
    
    try {
      const amountBigInt = BigInt(Math.floor(parseFloat(value) * 1e9))
      const feeAmount = BigInt(fee)
      const total = amountBigInt + feeAmount
      
      const balance = BigInt(currentAccount?.balance || '0')
      
      if (total > balance) {
        return 'Insufficient balance for amount + fee'
      }
      
      return null
    } catch (error) {
      return 'Invalid amount'
    }
  }

  const handleAmountBlur = (value: string) => {
    const error = validateAmount(value)
    setAmountError(error)
  }

  const handleNext = async () => {
    try {
      if (!destination || !amount) {
        throw new Error('Please fill in all fields')
      }

      if (!TagUtils.validateBase58Tag(destination)) {
        throw new Error('Invalid recipient tag')
      }

      const error = validateAmount(amount)
      if (error) {
        throw new Error(error)
      }

      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e9))
      const feeAmount = BigInt(fee) // Use custom fee
      const total = amountBigInt + feeAmount
      
      const balance = BigInt(currentAccount?.balance || '0')
      const change = balance - total

      if (change < 0n) {
        throw new Error('Insufficient balance')
      }

      setTransactionDetails({
        amount: amountBigInt,
        fee: feeAmount,
        total,
        change
      })
      setStep('confirm')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid input')
    }
  }

  const handleBack = () => {
    setStep('details')
    setError(null)
  }

  const handleSend = async () => {
    const currAccount = acc.accounts.find(a => a.tag === acc.selectedAccount!)
    if (!currAccount) {
      throw new Error('Current account not found')
    }
    try {
      setError(null)
      setSending(true)

      const recipientTagBytes = TagUtils.base58ToAddrTag(destination)
      if (!recipientTagBytes) {
        throw new Error('Invalid recipient tag')
      }
      const recipientTagHex = Buffer.from(recipientTagBytes).toString('hex')

      const result = await tx.sendTransaction(recipientTagHex, BigInt(transactionDetails!.amount)) 

      if (result) {
        await acc.updateAccount(acc.selectedAccount!, { wotsIndex: currAccount.wotsIndex + 1 })
        setSuccess({ txid: result })
        setStep('success')
      } else {
        throw new Error(result || 'Transaction failed')
      }
    } catch (error) {
      console.error('Send error:', error)
      setError(error instanceof Error ? error.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    if (!sending) {
      setDestination('')
      setAmount('')
      setError(null)
      setSuccess(null)
      setStep('details')
      onClose()
    }
  }

  const accounts = Object.values(acc.accounts)
    .filter(a => a.tag !== acc.selectedAccount)
    .map(account => ({
      ...account,
      base58Tag: TagUtils.addrTagToBase58(Buffer.from(account.tag, 'hex'))
    }))

  const formatMCM = (amount: bigint) => {
    return `${amount / BigInt(1e9)}.${(amount % BigInt(1e9)).toString().padStart(9, '0')} MCM`
  }

  const addressOptions = accounts.map(account => ({
    value: account.base58Tag!,
    label: account.name,
    tag: account.tag,
    emoji: account.avatar,
    description: `${account.base58Tag!.slice(0, 8)}...${account.base58Tag!.slice(-8)}`
  }))

  const currentAccount = acc.accounts.find(a => a.tag === acc.selectedAccount)
  const currentAccountBase58 = currentAccount 
    ? TagUtils.addrTagToBase58(Buffer.from(currentAccount.tag, 'hex'))
    : null

  const formatBalance = (balance: string | null) => {
    if (!balance) return '0.000000000'
    return `${BigInt(balance) / BigInt(1e9)}.${(BigInt(balance) % BigInt(1e9)).toString().padStart(9, '0')}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[440px] h-[100vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="border-b p-4 flex items-center gap-3">
          {step !== 'details' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h2 className="text-lg font-semibold">
            {step === 'details' && 'Send MCM'}
            {step === 'confirm' && 'Confirm Transaction'}
            {step === 'success' && 'Transaction Sent'}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="w-full">
            <AnimatePresence mode="wait">
              {step === 'details' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* From Account Card */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {currentAccount && (
                        <AccountAvatar
                          name={currentAccount.name}
                          tag={currentAccount.tag}
                          emoji={currentAccount.avatar}
                          className="h-8 w-8"
                        />
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">
                          From: {currentAccount?.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {currentAccountBase58?.slice(0, 8)}...{currentAccountBase58?.slice(-8)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm px-1">
                      <span className="text-muted-foreground">Available Balance:</span>
                      <span className="font-mono">
                        {formatBalance(currentAccount?.balance)} MCM
                      </span>
                    </div>
                  </div>

                  {/* Destination field */}
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <AddressInput
                      value={destination}
                      onValueChange={setDestination}
                      options={addressOptions}
                      placeholder="Enter destination tag"
                      error={!!destinationError}
                      onValidate={setDestinationError}
                    />
                    {destinationError && (
                      <p className="text-sm text-destructive">
                        {destinationError}
                      </p>
                    )}
                  </div>

                  {/* Amount field */}
                  <div className="space-y-2">
                    <Label>Amount (MCM)</Label>
                    <AmountInput
                      type="number"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value)
                        setAmountError(null) // Clear error when typing
                      }}
                      onAmountBlur={handleAmountBlur}
                      onMax={handleMax}
                      placeholder="0.000000000"
                      min="0"
                      step="0.000000001"
                      error={!!amountError}
                    />
                    {amountError && (
                      <p className="text-sm text-destructive">
                        {amountError}
                      </p>
                    )}
                  </div>

                  {/* Add Advanced Settings */}
                  <Collapsible
                    open={showAdvanced}
                    onOpenChange={setShowAdvanced}
                    className="space-y-2"
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex items-center gap-2 p-0 h-auto font-normal"
                      >
                        <ChevronDown className={cn(
                          "h-4 w-4 transition-transform",
                          showAdvanced && "transform rotate-180"
                        )} />
                        <span className="text-sm">Advanced Settings</span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>
                          Network Fee (nano MCM)
                          <span className="text-xs text-muted-foreground ml-2">
                            Default: 500
                          </span>
                        </Label>
                        <Input
                          type="number"
                          value={fee}
                          onChange={(e) => setFee(e.target.value)}
                          placeholder="500"
                          min="500"
                          step="1"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </motion.div>
              )}

              {step === 'confirm' && transactionDetails && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-3"
                >
                  <div className="rounded-lg border bg-card p-3 space-y-3">
                    {/* Transaction Direction */}
                    <div className="space-y-3">
                      {/* From Account */}
                      <div className="flex items-start gap-2">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-muted/50 flex items-center justify-center">
                          <Wallet className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <Label className="text-muted-foreground text-xs">From</Label>
                          <div className="flex items-center gap-2">
                            <AccountAvatar
                              name={currentAccount?.name || ''}
                              tag={currentAccount?.tag || ''}
                              emoji={currentAccount?.avatar}
                              className="h-5 w-5"
                              textClassName="text-xs"
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-sm">
                                {currentAccount?.name}
                              </p>
                              <p className="text-xs text-muted-foreground break-all">
                                {currentAccountBase58}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Arrow Icon */}
                      <div className="flex justify-center py-0.5">
                        <ArrowDownUp className="h-4 w-4 text-muted-foreground rotate-90" />
                      </div>

                      {/* To Account */}
                      <div className="flex items-start gap-2">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-muted/50 flex items-center justify-center">
                          <SendHorizontal className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <Label className="text-muted-foreground text-xs">To</Label>
                          <div className="flex items-center gap-2">
                            {addressOptions.find(opt => opt.value === destination) ? (
                              <>
                                <AccountAvatar
                                  name={addressOptions.find(opt => opt.value === destination)!.label}
                                  tag={addressOptions.find(opt => opt.value === destination)!.tag}
                                  emoji={addressOptions.find(opt => opt.value === destination)!.emoji}
                                  className="h-5 w-5"
                                  textClassName="text-xs"
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-sm">
                                    {addressOptions.find(opt => opt.value === destination)!.label}
                                  </p>
                                  <p className="text-xs text-muted-foreground break-all">
                                    {destination}
                                  </p>
                                </div>
                              </>
                            ) : (
                              <div className="min-w-0">
                                <p className="text-sm font-mono break-all">
                                  {destination}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Transaction Details */}
                    <div className="space-y-3">
                      {/* Amount */}
                      <div className="flex items-start gap-2">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-muted/50 flex items-center justify-center">
                          <Coins className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-muted-foreground text-xs">Amount</Label>
                          <p className="text-base font-mono font-medium">
                            {formatMCM(transactionDetails.amount)}
                          </p>
                        </div>
                      </div>

                      {/* Network Fee */}
                      <div className="flex items-start gap-2">
                        <div className="h-8 w-8 shrink-0 rounded-full bg-muted/50 flex items-center justify-center">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-muted-foreground text-xs">Network Fee</Label>
                          <p className="text-base font-mono">
                            {formatMCM(transactionDetails.fee)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Totals */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-muted-foreground text-sm">Total Amount</Label>
                        <p className="text-base font-mono font-bold">
                          {formatMCM(transactionDetails.total)}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <Label className="text-muted-foreground text-sm">Remaining Balance</Label>
                        <p className="text-base font-mono">
                          {formatMCM(transactionDetails.change)}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'success' && success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-4 py-8"
                >
                  <div className="h-12 w-12 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Transaction Sent!</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your transaction has been successfully broadcast to the network
                    </p>
                    <div className="flex items-center gap-2 justify-center">
                      <code className="px-2 py-1 bg-muted rounded text-xs">
                        {success.txid}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigator.clipboard.writeText(success.txid)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-3">
          <div className="w-full flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={sending}
            >
              Cancel
            </Button>
            
            {step === 'details' && (
              <Button
                onClick={handleNext}
                disabled={!destination || !amount || !!destinationError || !!amountError}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}

            {step === 'confirm' && (
              <Button
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Confirm & Send'
                )}
              </Button>
            )}

            {step === 'success' && (
              <Button
                onClick={handleClose}
              >
                Done
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 