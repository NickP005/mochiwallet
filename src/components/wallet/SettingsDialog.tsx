import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  LogOut, 
  AlertTriangle,
  Moon,
  Sun,
  Monitor,
  ArrowLeft
} from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { StorageProvider, useWallet } from 'mochimo-wallet'
import { motion } from 'framer-motion'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {version} from '../../../package.json'
interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { theme, setTheme } = useTheme()
  const wallet = useWallet()

  const handleLogout = async () => {
    try {
      await wallet.lockWallet()
      await StorageProvider.getStorage().clear()
      window.location.reload()
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (!isOpen) return null

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="absolute inset-0 bg-background z-50 h-full w-full overflow-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-[51] border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4 gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
        </div>

        {/* Content */}
        <div className="container max-w-2xl mx-auto p-6 space-y-8">
          {/* Theme Settings */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Appearance</h2>
            <p className="text-sm text-muted-foreground">
              Customize how Mochimo Wallet looks on your device
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => setTheme('light')}
              >
                <Sun className="h-5 w-5" />
                <span className="text-sm">Light</span>
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => setTheme('dark')}
              >
                <Moon className="h-5 w-5" />
                <span className="text-sm">Dark</span>
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                className="flex flex-col items-center justify-center h-24 gap-2"
                onClick={() => setTheme('system')}
              >
                <Monitor className="h-5 w-5" />
                <span className="text-sm">System</span>
              </Button>
            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-3 pt-4">
            <h2 className="text-lg font-semibold">Security</h2>
            <p className="text-sm text-muted-foreground">
              Manage your wallet security settings
            </p>
            <div className="space-y-4">
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>

          {/* Version Info */}
          <div className="pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Version {version}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm Logout
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout? You will need your mnemonic phrase to access your wallet again.

            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowLogoutConfirm(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-destructive hover:bg-destructive/90"
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 