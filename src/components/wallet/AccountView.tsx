import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'

import { 
  Copy, 
  Send, 
  RefreshCcw, 
  Tag,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  Shield,
  ShieldOff
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { WalletCore as WalletService, WalletAccount } from '@/lib/core/wallet'

interface AccountViewProps {
  account: WalletAccount
  onUpdate: (updated: WalletAccount) => void
}

export function AccountView({ account, onUpdate }: AccountViewProps) {
  const [copying, setCopying] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [isActivated, setIsActivated] = useState<boolean | null>(null)
  const [checkingActivation, setCheckingActivation] = useState(false)

  // Check activation status on mount and refresh
  useEffect(() => {
    checkActivation()
  }, [account.tag])

  // Check activation status
  const checkActivation = async () => {
    try {
      setCheckingActivation(true)
      const status = await WalletService.checkActivationStatus(account)
      setIsActivated(status)
      // Call onUpdate to propagate activation status change
      onUpdate(account)
    } catch (error) {
      console.error('Error checking activation:', error)
      setIsActivated(false)
    } finally {
      setCheckingActivation(false)
    }
  }

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopying(type)
      setTimeout(() => setCopying(null), 1500)
    } catch (error) {
      console.error('Failed to copy:', error)
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

  // Handle sign
  const handleSign = async (message: string) => {
    try {
      const { signature, address } = await WalletService.signTransaction(
        wallet,
        account.index,
        message,
        wallet.password!
      )
      // TODO: Handle signed message
    } catch (error) {
      console.error('Error signing message:', error)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">
            {account.name || `Account ${account.index + 1}`}
          </h2>
          {checkingActivation ? (
            <RefreshCcw className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : isActivated ? (
            <div className="flex items-center gap-1 text-green-500" title="Account Activated">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-yellow-500" title="Account Not Activated">
              <ShieldOff className="h-5 w-5" />
              <span className="text-sm font-medium">Not Active</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </div>
      </motion.div>

      {/* Account Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-6 md:grid-cols-2"
      >
        {/* Current Address */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Current Address</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(account.currentWOTS.publicKey, 'address')}
            >
              {copying === 'address' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-mono text-sm break-all">
              {account.currentWOTS.publicKey}
            </p>
          </div>
        </div>

        {/* Tag */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Account Tag</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(account.tag, 'tag')}
            >
              {copying === 'tag' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <p className="font-mono text-sm">{account.tag}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Advanced Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>Advanced Details</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Next Address */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Next Address</label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-mono text-sm break-all">
                  {account.nextWOTS.publicKey}
                </p>
              </div>
            </div>

            {/* Used Addresses */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Used Addresses</label>
              {account.usedAddresses.length > 0 ? (
                <div className="space-y-2">
                  {account.usedAddresses.map((address, i) => (
                    <div key={i} className="p-3 bg-muted rounded-lg">
                      <p className="font-mono text-sm break-all">{address}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  No used addresses
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>
    </div>
  )
} 