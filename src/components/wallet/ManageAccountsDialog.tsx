import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  GripVertical,
  ChevronRight,
  Coins,
  Tag as TagIcon,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
  X,
  Smile,
  Loader2,
  ArrowLeft
} from 'lucide-react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Account, NetworkProvider, useAccounts, useNetwork } from 'mochimo-wallet'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { getInitials } from '@/lib/utils/colors'
import { AccountAvatar } from '../ui/account-avatar'
import { useTheme } from "@/components/theme-provider"

interface ManageAccountsDialogProps {
  isOpen: boolean
  onClose: () => void
}

type View = 'list' | 'detail'

interface DetailViewProps {
  account: Account
  onBack: () => void
  onUpdate: (tag: string, updates: Partial<Account>) => void
  onDelete: (tag: string) => void
}

function DetailView({ account, onBack, onUpdate, onDelete }: DetailViewProps) {
  const [showSecret, setShowSecret] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [newName, setNewName] = useState(account.name || '')
  const [isSaving, setIsSaving] = useState(false)
  const { theme } = useTheme()

  // Convert theme to EmojiPicker theme type
  const emojiPickerTheme: Theme = theme === 'dark' ? Theme.DARK : Theme.LIGHT

  const handleNameUpdate = async () => {
    if (newName.trim() && newName !== account.name) {
      try {
        setIsSaving(true)
        await onUpdate(account.tag, { name: newName.trim() })
      } catch (error) {
        console.error('Error updating account name:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleEmojiSelect = (emoji: any) => {
    onUpdate(account.tag, { avatar: emoji.emoji })
    setShowEmojiPicker(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 h-14 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <DialogTitle>Account Details</DialogTitle>
        <div className="w-8" />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-3 py-4">
          <Button
            variant="outline"
            size="lg"
            className="h-20 w-20 text-3xl relative"
            onClick={() => setShowEmojiPicker(true)}
          >
            {account.avatar || getInitials(account.name || '')}
            <div className="absolute bottom-1 right-1">
              <Smile className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
          {showEmojiPicker && (
            <div className="absolute z-50">
              <div
                className="fixed inset-0"
                onClick={() => setShowEmojiPicker(false)}
              />
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                width={320}
                height={400}
                theme={emojiPickerTheme}
                skinTonesDisabled
              />
            </div>
          )}
        </div>

        {/* Account Details Content */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Account Name</label>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter account name"
                disabled={isSaving}
              />
              <Button
                onClick={handleNameUpdate}
                disabled={!newName.trim() || newName === account.name || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-3 bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tag</span>
              <div className="max-w-[70%]">
                <code className="bg-muted px-2 py-0.5 rounded font-mono text-xs break-all">
                  {account.tag}
                </code>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Index</span>
              <span>{account.index}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setShowSecret(!showSecret)}
            >
              <span>Show Secret Phrase</span>
              {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            {showSecret && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-muted/50 p-3 rounded-lg"
              >
                <code className="text-xs break-all">{account.seed}</code>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Footer */}
      <div className="border-t p-4">
        {!showDeleteConfirm ? (
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Account
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-medium">Are you sure?</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => onDelete(account.tag)}
              >
                Remove
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function ManageAccountsDialog({
  isOpen,
  onClose
}: ManageAccountsDialogProps) {
  const [view, setView] = useState<View>('list')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const acc = useAccounts()
  const [tempAccounts, setTempAccounts] = useState(acc.accounts)
  // Reset temp accounts when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTempAccounts(acc.accounts)
      setHasChanges(false)
    } else {
      setTempAccounts([])
    }
  }, [isOpen, acc.accounts.length])

  // Handle account updates
  const handleAccountUpdate = async (tag: string, updates: Partial<Account>) => {
    try {
      await acc.updateAccount(tag, updates)
      // Update both the global accounts and our local state
      const updatedAccounts = acc.accounts.map(account =>
        account.tag === tag ? { ...account, ...updates } : account
      )
      acc.updateAccount(tag, updates)

      // Update selected account if it's the one being modified
      if (selectedAccount && selectedAccount.tag === tag) {
        setSelectedAccount({ ...selectedAccount, ...updates })
      }
    } catch (error) {
      console.error('Error updating account:', error)
    }
  }

  // Handle account deletion
  const handleAccountDelete = async (tag: string) => {
    await acc.deleteAccount(tag)
    setView('list')
  }

  // Format balance
  const formatBalance = (balance: string) => {
    try {
      const num = BigInt(balance)
      return `${num / BigInt(1e9)}.${(num % BigInt(1e9)).toString().padStart(9, '0')} MCM`
    } catch {
      return '0.000000000 MCM'
    }
  }

  const handleReorder = (newOrder: Account[]) => {
    setTempAccounts(newOrder)
    setHasChanges(true)
  }

  const handleSaveOrder = async () => {
    try {
      setIsSaving(true)
      const newOrderMap = tempAccounts.reduce((acc, account, index) => {
        acc[account.tag] = index
        return acc
      }, {} as Record<string, number>)

      await acc.reorderAccounts(newOrderMap)
      setHasChanges(false)
      onClose()
    } catch (error) {
      console.error('Error saving account order:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setTempAccounts(acc.accounts)
    setHasChanges(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        className="h-full max-h-[600px] p-0 flex flex-col"
        showClose={true}
      >
        {/* List View Header */}
        {view === 'list' && (
          <div className="flex items-center justify-between p-4 h-14 border-b">
            <div className="w-8" />
            <DialogTitle className="flex-1 text-center">Manage Accounts</DialogTitle>
            <div className="w-8" />
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'list' ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 overflow-y-auto p-4"
            >
              <Reorder.Group
                axis="y"
                values={tempAccounts}
                onReorder={handleReorder}
                className="space-y-2"
              >
                {tempAccounts.map((account) => (
                  <Reorder.Item
                    key={account.tag}
                    value={account}
                    className="bg-card rounded-lg border"
                  >
                    <div className="flex items-center p-3 gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                      <div
                        className="flex-1 flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded p-2"
                        onClick={() => {
                          setSelectedAccount(account)
                          setView('detail')
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <AccountAvatar name={account.name || ''} emoji={account.avatar} tag={account.tag} />
                          <div>
                            <p className="font-medium">{account.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatBalance(account.balance || '0')}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1"
            >
              {selectedAccount && (
                <DetailView
                  account={selectedAccount}
                  onBack={() => setView('list')}
                  onUpdate={handleAccountUpdate}
                  onDelete={handleAccountDelete}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer with Save/Cancel buttons */}
        {view === 'list' && hasChanges && (
          <div className="border-t p-4 flex justify-end gap-2 bg-background">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveOrder}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Order'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 