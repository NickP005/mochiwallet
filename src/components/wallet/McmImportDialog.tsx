import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DecodeResult, MCMDecoder } from 'mochimo-wallet'



interface McmImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImportAccounts: (accounts: McmAccount[]) => Promise<void>
}

type ImportView = 'upload' | 'password' | 'select'

export function McmImportDialog({
  isOpen,
  onClose,
  onImportAccounts
}: McmImportDialogProps) {
  const [view, setView] = useState<ImportView>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [accounts, setAccounts] = useState<DecodeResult['entries']>([])
  const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleClose = () => {
    setView('upload')
    setSelectedFile(null)
    setPassword('')
    setAccounts([])
    setSelectedAccounts(new Set())
    setError(null)
    onClose()
  }

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    setView('password')
  }

  const handleDecodeFile = async () => {
    if (!selectedFile || !password) return

    try {
      setLoading(true)
      setError(null)

      const fileBuffer = await selectedFile.arrayBuffer()
      const decodedAccounts = await MCMDecoder.decode(Buffer.from(fileBuffer), password)

      setAccounts(decodedAccounts.entries)
      setView('select')
    } catch (error) {
      console.error('Error decoding MCM file:', error)
      setError('Invalid password or corrupted MCM file')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (selectedAccounts.size === 0) {
      setError('Please select at least one account')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const accountsToImport = accounts.filter((acc, index) => selectedAccounts.has(index))
      await onImportAccounts(accountsToImport)
      handleClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import accounts')
    } finally {
      setLoading(false)
    }
  }

  const toggleAccount = (index: number) => {
    const newSelected = new Set(selectedAccounts)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedAccounts(newSelected)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[400px] p-4">
        <DialogHeader>
          <DialogTitle>Import MCM Wallet</DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {view === 'upload' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 py-2"
            >
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".mcm"
                  className="hidden"
                  id="mcm-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
                <label
                  htmlFor="mcm-file"
                  className={cn(
                    "cursor-pointer flex flex-col items-center gap-3",
                    "text-sm text-muted-foreground hover:text-foreground transition-colors"
                  )}
                >
                  <Upload className="h-8 w-8" />
                  <div>
                    <p className="font-medium text-foreground">Click to select MCM file</p>
                    <p className="text-xs mt-1">or drag and drop</p>
                  </div>
                </label>
              </div>
            </motion.div>
          )}

          {view === 'password' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 py-2"
            >
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Enter MCM Password
                </Label>
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => {
                    setError(null)
                    setPassword(e.target.value)
                  }}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setView('upload')}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  onClick={handleDecodeFile}
                  disabled={loading || !password}
                >
                  {loading ? 'Decoding...' : 'Continue'}
                </Button>
              </div>
            </motion.div>
          )}

          {view === 'select' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4 py-2"
            >
              <div className="space-y-2">
                <Label>Select Accounts to Import</Label>
                <div className="border rounded-lg divide-y max-h-[240px] overflow-y-auto">
                  {accounts.map((account, index) => (
                    <div
                      key={account.address}
                      className={cn(
                        "flex items-center justify-between p-3 cursor-pointer hover:bg-secondary/50",
                        selectedAccounts.has(index) && "bg-primary/10"
                      )}
                      onClick={() => toggleAccount(index)}
                    >
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Tag: {account.address.slice(-24)}
                        </p>
                      </div>
                      {selectedAccounts.has(index) && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedAccounts.size} of {accounts.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setView('password')}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={loading || selectedAccounts.size === 0}
                  >
                    {loading ? 'Importing...' : 'Import Selected'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
} 