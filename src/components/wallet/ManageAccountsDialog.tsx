import { useTheme } from "@/components/theme-provider"
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getInitials } from '@/lib/utils/colors'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import { AnimatePresence, motion, Reorder } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  Smile,
  Trash2,
  Tag as At,
  Hash,
  Key,
  Lock
} from 'lucide-react'
import { Account, useAccounts, useWallet } from 'mochimo-wallet'
import { useEffect, useState } from 'react'
import { AccountAvatar } from '../ui/account-avatar'
import { TagUtils } from "mochimo-wots"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog"


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
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const w = useWallet()
  const [showSecretConfirm, setShowSecretConfirm] = useState(false)
  const [secretPassword, setSecretPassword] = useState('')
  const [secretError, setSecretError] = useState<string | null>(null)
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

  const handleAccountDelete = async () => {
    try {
      // Verify password before deletion
      const isVerified = await w.verifyWalletOwnership(deletePassword)
      if (!isVerified) {
        setDeleteError('Invalid password')
        return
      }
      
      onDelete(account.tag)
      setShowDeleteConfirm(false)
      setDeletePassword('')
      setDeleteError(null)
    } catch (error) {
      setDeleteError('Invalid password')
    }
  }

  const handleVerifyForSecret = async () => {
    try {
      const isVerified = await w.verifyWalletOwnership(secretPassword)
      if (!isVerified) {
        setSecretError('Invalid password')
        return
      }
      
      setShowSecret(true)
      setShowSecretConfirm(false)
      setSecretPassword('')
      setSecretError(null)
    } catch (error) {
      setSecretError('Invalid password')
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar and Name Section */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div 
            className="cursor-pointer"
            onClick={() => setShowEmojiPicker(true)}
          >
            <AccountAvatar
              name={account.name || ''}
              emoji={account.avatar}
              tag={account.tag}
              className="h-20 w-20"
              textClassName="text-2xl"
            />
            <Button
              variant="outline"
              size="icon"
              className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-background"
            >
              <Smile className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Emoji Picker */}
          {showEmojiPicker && (
            <>
              <div 
                className="fixed inset-0 z-50"
                onClick={() => setShowEmojiPicker(false)}
              />
              <div 
                className="absolute z-50 left-1/2 -translate-x-1/2"
                style={{ top: 'calc(100% + 8px)' }}
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  width={320}
                  height={400}
                  theme={emojiPickerTheme}
                  skinTonesDisabled
                />
              </div>
            </>
          )}
        </div>

        <div className="w-full flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleNameUpdate}
            placeholder="Account Name"
            className="flex-1"
          />
          <Button 
            variant="outline" 
            onClick={handleNameUpdate}
            disabled={newName === account.name}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Account Info Section */}
      <div className="space-y-4 bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <At className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-muted-foreground mb-1">Tag</div>
            <code className="text-xs font-mono break-all">
              {TagUtils.addrTagToBase58(Buffer.from(account.tag, 'hex'))}
            </code>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Hash className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Index</div>
            <div className="text-sm">{account.index}</div>
          </div>
        </div>
      </div>

      {/* Secret Phrase Section */}
      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={() => {
            if (showSecret) {
              setShowSecret(false)
            } else {
              setShowSecretConfirm(true)
            }
          }}
        >
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            <span>Secret Phrase</span>
          </div>
          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        {showSecret && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-muted/50 p-4 rounded-lg"
          >
            <code className="text-xs break-all">{account.seed}</code>
          </motion.div>
        )}
      </div>

      {/* Add Password Verification Dialog */}
      {showSecretConfirm && (
        <AlertDialog open={showSecretConfirm} onOpenChange={setShowSecretConfirm}>
          <AlertDialogContent>
            <form onSubmit={(e) => {
              e.preventDefault()
              if (secretPassword) {
                handleVerifyForSecret()
              }
            }}>
              <AlertDialogHeader>
                <AlertDialogTitle>View Secret Phrase</AlertDialogTitle>
                <AlertDialogDescription>
                  Please enter your password to view the secret phrase.
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </label>
                  <Input
                    type="password"
                    value={secretPassword}
                    onChange={(e) => {
                      setSecretPassword(e.target.value)
                      setSecretError(null)
                    }}
                    placeholder="Enter your password"
                  />
                  {secretError && (
                    <p className="text-sm text-destructive">{secretError}</p>
                  )}
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel type="button" onClick={() => {
                  setShowSecretConfirm(false)
                  setSecretPassword('')
                  setSecretError(null)
                }}>
                  Cancel
                </AlertDialogCancel>
                <Button 
                  type="submit"
                  disabled={!secretPassword}
                >
                  View Secret
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Delete Account Button */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={() => setShowDeleteConfirm(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Remove Account
      </Button>

      {showDeleteConfirm && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <form onSubmit={(e) => {
              e.preventDefault()
              if (deletePassword) {
                handleAccountDelete()
              }
            }}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Account</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. Please enter your password to confirm deletion.
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Password
                  </label>
                  <Input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => {
                      setDeletePassword(e.target.value)
                      setDeleteError(null)
                    }}
                    placeholder="Enter your password"
                  />
                  {deleteError && (
                    <p className="text-sm text-destructive">{deleteError}</p>
                  )}
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel type="button" onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletePassword('')
                  setDeleteError(null)
                }}>
                  Cancel
                </AlertDialogCancel>
                <Button 
                  type="submit"
                  variant="destructive"
                  disabled={!deletePassword}
                >
                  Delete Account
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      )}
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
    <Dialog 
      open={isOpen} 
      onOpenChange={onClose}
    >
      <DialogContent 
        className="w-full max-w-full  h-[100vh] flex flex-col p-0 gap-0 dialog-content"
      >
        {/* Dynamic Header */}
        <div className="flex items-center h-14 border-b p-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-8">
              {view === 'detail' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setView('list')
                    setTempAccounts(acc.accounts)
                    setHasChanges(false)
                  }}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
            <h2 className="text-lg font-semibold flex-1 text-center">
              {view === 'list' ? 'Manage Accounts' : 'Account Details'}
            </h2>
            <div className="w-8" /> {/* Consistent spacer for both views */}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {view === 'list' ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {/* Reorderable list */}
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
                      className="bg-background rounded-lg border touch-none"
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
              >
                {selectedAccount && (
                  <DetailView
                    account={selectedAccount}
                    onBack={() => {
                      setView('list')
                      setTempAccounts(acc.accounts)
                      setHasChanges(false)
                    }}
                    onUpdate={handleAccountUpdate}
                    onDelete={handleAccountDelete}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

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