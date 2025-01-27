import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  LogOut, 
  AlertTriangle,
  Moon,
  Sun,
  Monitor,
  ArrowLeft,
  Download,
  Lock
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
import { sessionManager } from '@/lib/services/SessionManager'
import { log } from "@/lib/utils/logging"
const logger = log.getLogger("wallet-settings");

type Theme = 'dark' | 'light' | 'system'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showExportConfirm, setShowExportConfirm] = useState(false)
  const [exportPassword, setExportPassword] = useState('')
  const [exportError, setExportError] = useState<string | null>(null)
  const { theme, setTheme } = useTheme() as { 
    theme: Theme, 
    setTheme: (theme: Theme) => void 
  }
  const wallet = useWallet()

  const handleLogout = async () => {
    try {
      await wallet.lockWallet()
      await StorageProvider.getStorage().clear()
      await sessionManager.endSession()
      window.location.reload()
    } catch (error) {
      logger.error('Error logging out:', error)
    }
  }

  const handleExportWallet = async () => {
    try {
      // Verify password before export
      const isVerified = await wallet.verifyWalletOwnership(exportPassword)
      if (!isVerified) {
        setExportError('Invalid password')
        return
      }

      // Get wallet data
      const walletData = await wallet.exportWalletJSON(exportPassword)
      
      // Create and download file
      const blob = new Blob([JSON.stringify(walletData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mochimo-wallet-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      // Reset state
      setShowExportConfirm(false)
      setExportPassword('')
      setExportError(null)
    } catch (error) {
      setExportError('Failed to export wallet')
      logger.error('Export error:', error)
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

          {/* Export Wallet */}
          <div className="space-y-3 pt-4">
            <h2 className="text-lg font-semibold">Backup</h2>
            <p className="text-sm text-muted-foreground">
              Export your wallet data
            </p>
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowExportConfirm(true)}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Wallet
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

      {/* Export Confirmation Dialog */}
      <AlertDialog open={showExportConfirm} onOpenChange={setShowExportConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Export Wallet</AlertDialogTitle>
            <AlertDialogDescription>
              Enter your password to export your wallet data. Keep this file safe and secure.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enter your password"
                value={exportPassword}
                onChange={(e) => {
                  setExportPassword(e.target.value)
                  setExportError(null)
                }}
              />
            </div>

            {exportError && (
              <p className="text-sm text-destructive">{exportError}</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setExportPassword('')
              setExportError(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <Button onClick={handleExportWallet}>
              Export
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 