import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Avatar, AvatarFallback } from './avatar'
import { 
  Menu,
  X as Close,
  Plus,
  Settings,
  Edit2,
  Check,
  X
} from 'lucide-react'
import { Input } from './input'
import { LogoSmall } from './logo-small'

interface SidebarProps {
  accounts: any[]
  selectedAccount: number | null
  onSelectAccount: (index: number) => void
  onCreateAccount: () => void
  onRenameAccount: (index: number, name: string) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  className?: string
}

export function Sidebar({
  accounts,
  selectedAccount,
  onSelectAccount,
  onCreateAccount,
  onRenameAccount,
  isOpen,
  onOpenChange,
  className
}: SidebarProps) {
  const [editingAccount, setEditingAccount] = useState<number | null>(null)
  const [editName, setEditName] = useState('')

  // Select first account by default
  useEffect(() => {
    if (accounts.length > 0 && selectedAccount === null) {
      onSelectAccount(0)
    }
  }, [accounts, selectedAccount, onSelectAccount])

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar')
      const hamburger = document.getElementById('hamburger-menu')
      if (
        sidebar && 
        !sidebar.contains(event.target as Node) && 
        hamburger && 
        !hamburger.contains(event.target as Node)
      ) {
        onOpenChange(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onOpenChange])

  const handleStartRename = (index: number, currentName: string) => {
    setEditingAccount(index)
    setEditName(currentName)
  }

  const handleConfirmRename = () => {
    if (editingAccount !== null && editName.trim()) {
      onRenameAccount(editingAccount, editName.trim())
      setEditingAccount(null)
      setEditName('')
    }
  }

  const getAccountInitial = (account: any, index: number) => {
    return account.name ? 
      account.name[0].toUpperCase() : 
      `${index + 1}`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
            onClick={() => onOpenChange(false)}
          />

          {/* Sidebar */}
          <motion.div
            id="sidebar"
            initial={{ x: -180 }}
            animate={{ x: 0 }}
            exit={{ x: -180 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className={cn(
              'fixed left-0 top-0 h-full w-[180px] bg-card border-r flex flex-col z-50',
              className
            )}
          >
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2 h-6 w-6"
              onClick={() => onOpenChange(false)}
            >
              <Close className="h-4 w-4" />
            </Button>

            {/* Header */}
            <div className="p-2 border-b mt-10">
              <div className="flex items-center gap-1.5">
                <LogoSmall size="xs" />
                <span className="font-medium text-sm">Accounts</span>
              </div>
            </div>

            {/* Account List */}
            <div className="flex-1 overflow-auto py-1">
              {accounts.map((account, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    'group relative flex items-center px-2 py-1.5 cursor-pointer hover:bg-accent/50',
                    selectedAccount === index && 'bg-accent'
                  )}
                  onClick={() => {
                    onSelectAccount(index)
                    onOpenChange(false)
                  }}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getAccountInitial(account, index)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {!isOpen && (
                    <>
                      {editingAccount === index ? (
                        <div className="ml-1.5 flex-1 flex items-center gap-0.5">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-6 text-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleConfirmRename()
                              if (e.key === 'Escape') setEditingAccount(null)
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={handleConfirmRename}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => setEditingAccount(null)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="ml-1.5 flex-1 truncate text-xs">
                            {account.name || `Account ${index + 1}`}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStartRename(index, account.name || `Account ${index + 1}`)
                            }}
                          >
                            <Edit2 className="h-2.5 w-2.5" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Actions */}
            <div className="p-2 border-t">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-7 text-xs"
                onClick={onCreateAccount}
              >
                <Plus className="h-3 w-3 mr-1.5" />
                Add Account
              </Button>
            </div>

            {/* Settings */}
            <div className="p-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-7 text-xs"
              >
                <Settings className="h-3 w-3 mr-1.5" />
                Settings
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
} 