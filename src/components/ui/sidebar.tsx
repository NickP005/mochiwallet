import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './button'
import { Plus } from 'lucide-react'
import { WalletAccount } from '@/lib/core/wallet'
import { Avatar, AvatarFallback } from './avatar'
import { generateColorFromTag, getInitials } from '@/lib/utils/colors'
import { Account } from 'mochimo-wallet'

interface SidebarProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  selectedAccount: number | null
  onSelectAccount: (account: Account) => void
  onCreateAccount: () => void
  onRenameAccount: (index: number, name: string) => void
}

export function Sidebar({
  isOpen,
  onOpenChange,
  accounts,
  selectedAccount,
  onSelectAccount,
  onCreateAccount,
  onRenameAccount
}: SidebarProps) {
  // Add debug logging
  console.log('Sidebar render:', { isOpen, accountsCount: accounts.length })

  useEffect(() => {
    console.log('Sidebar isOpen changed:', isOpen)
  }, [isOpen])

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar')
      if (isOpen && sidebar && !sidebar.contains(event.target as Node)) {
        onOpenChange(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onOpenChange])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/20 z-10"
            onClick={() => onOpenChange(false)}
          />

          {/* Sidebar */}
          <motion.div
            id="sidebar"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="absolute inset-y-0 left-0 w-64 bg-background border-r z-20"
          >
            <div className="h-full p-4 space-y-4">
              {/* Accounts List */}
              <div className="space-y-2">
                {accounts.map((account) => {
                  const accountName = account.name || `Account ${account.index + 1}`
                  const initials = getInitials(accountName)
                  const avatarColor = generateColorFromTag(account.tag)

                  return (
                    <Button
                      key={account.index}
                      variant={selectedAccount === account.index ? "secondary" : "ghost"}
                      className="w-full justify-start gap-3"
                      onClick={() => {
                        onSelectAccount(account)
                        onOpenChange(false)
                      }}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback 
                          style={{ 
                            backgroundColor: avatarColor,
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 500
                          }}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="truncate">
                        {accountName}
                      </div>
                    </Button>
                  )
                })}
              </div>

              {/* Add Account Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={onCreateAccount}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
} 