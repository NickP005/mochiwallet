import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Upload, Wallet } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { McmImportDialog } from './McmImportDialog'

interface AddAccountDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateAccount: (name: string) => Promise<void>
  onImportAccount: (file: File) => Promise<void>
}

type AddAccountView = 'select' | 'create' | 'import'

export function AddAccountDialog({
  isOpen,
  onClose,
  onCreateAccount,
  onImportAccount
}: AddAccountDialogProps) {
  const [view, setView] = useState<AddAccountView>('select')
  const [accountName, setAccountName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mcmImportOpen, setMcmImportOpen] = useState(false)

  const handleClose = () => {
    setView('select')
    setAccountName('')
    setSelectedFile(null)
    setError(null)
    onClose()
  }

  const handleCreateSubmit = async () => {
    if (!accountName.trim()) {
      setError('Please enter an account name')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await onCreateAccount(accountName.trim())
      handleClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleImportSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await onImportAccount(selectedFile)
      handleClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-[340px] p-4">
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {view === 'select' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-2 py-2"
              >
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => setView('create')}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium mb-1">Create New Account</h3>
                      <p className="text-xs text-muted-foreground">
                        Add a new account to your HD wallet
                      </p>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => {
                    handleClose()
                    setMcmImportOpen(true)
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Upload className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium mb-1">Import MCM File</h3>
                      <p className="text-xs text-muted-foreground">
                        Import accounts from an MCM file
                      </p>
                    </div>
                  </div>
                </Button>
              </motion.div>
            )}

            {view === 'create' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 py-2"
              >
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input
                    placeholder="Enter account name"
                    value={accountName}
                    onChange={(e) => {
                      setError(null)
                      setAccountName(e.target.value)
                    }}
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setView('select')}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateSubmit}
                    disabled={loading || !accountName.trim()}
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </motion.div>
            )}

            {view === 'import' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 py-2"
              >
                <div className="space-y-2">
                  <Label>MCM File</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept=".mcm"
                      className="hidden"
                      id="mcm-file"
                      onChange={(e) => {
                        setError(null)
                        setSelectedFile(e.target.files?.[0] || null)
                      }}
                    />
                    <label
                      htmlFor="mcm-file"
                      className={cn(
                        "cursor-pointer flex flex-col items-center gap-2",
                        "text-sm text-muted-foreground hover:text-foreground transition-colors"
                      )}
                    >
                      <Upload className="h-8 w-8" />
                      {selectedFile ? (
                        <span>{selectedFile.name}</span>
                      ) : (
                        <span>Click to select MCM file</span>
                      )}
                    </label>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setView('select')}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleImportSubmit}
                    disabled={loading || !selectedFile}
                  >
                    {loading ? 'Importing...' : 'Import'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <McmImportDialog
        isOpen={mcmImportOpen}
        onClose={() => setMcmImportOpen(false)}
        onImportAccounts={async (accounts) => {
          // Handle multiple account import
          for (const account of accounts) {
            await onImportAccount(account)
          }
        }}
      />
    </>
  )
} 