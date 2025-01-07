import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, Lock, CheckCircle2, AlertCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DecodeResult, MCMDecoder, WOTSEntry } from 'mochimo-wallet'
import { MochimoService } from '@/lib/services/mochimo'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { useAccounts } from 'mochimo-wallet'

interface AccountValidation {
  isValid: boolean
  networkAddress?: string
  networkBalance?: string
  error?: string
  status: 'unavailable' | 'duplicate' | 'mismatch' | 'valid' | 'loading'
}

interface ValidatedAccount extends WOTSEntry {
  validation?: AccountValidation
  isLoading?: boolean
  tag: string
  originalIndex: number
}

const UNAVAILABLE_PREFIX = '420000000e00000001000000'

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
  const [accounts, setAccounts] = useState<ValidatedAccount[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const acc = useAccounts()
  const [validating, setValidating] = useState(false)

  // Validate all accounts at once
  const validateAccounts = async (accountsToValidate: ValidatedAccount[]) => {
    setValidating(true)

    try {
      const validationResults = await Promise.all(
        accountsToValidate.map(async (account): Promise<ValidatedAccount> => {
          // Check if account is unavailable
          if (account.address.endsWith(UNAVAILABLE_PREFIX)) {
            return {
              ...account,
              validation: {
                isValid: false,
                status: 'unavailable',
                error: 'This account type is not available for import'
              }
            }
          }

          // Check if tag already exists in wallet
          const existingAccount = acc.accounts.find(a => a.tag === account.tag)
          if (existingAccount) {
            return {
              ...account,
              validation: {
                isValid: false,
                status: 'duplicate',
                error: 'Account already exists in wallet'
              }
            }
          }

          try {
            // Validate against network
            const response = await MochimoService.resolveTag(account.tag)

            if (response.addressConsensus !== account.address) {
              return {
                ...account,
                validation: {
                  isValid: false,
                  status: 'mismatch',
                  networkAddress: response.addressConsensus,
                  networkBalance: response.balanceConsensus,
                  error: response.addressConsensus ? 'Address mismatch with network' : 'Address is not activated'
                }
              }
            }

            return {
              ...account,
              validation: {
                isValid: true,
                status: 'valid',
                networkAddress: response.addressConsensus,
                networkBalance: response.balanceConsensus
              }
            }
          } catch (error) {
            return {
              ...account,
              validation: {
                isValid: false,
                status: 'mismatch',
                error: 'Failed to validate with network'
              }
            }
          }
        })
      )

      setAccounts(validationResults)
    } catch (error) {
      console.error('Error during validation:', error)
      setError('Failed to validate accounts')
    } finally {
      setValidating(false)
    }
  }

  // Update the useEffect to use the new validation method
  useEffect(() => {
    if (view === 'select' && accounts.length > 0) {
      validateAccounts(accounts)
    }
  }, [view, accounts.length])

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

      // Map entries and add tag and original index
      const accountsWithTags = decodedAccounts.entries.map((entry, index) => ({
        ...entry,
        tag: entry.address.slice(-24),
        originalIndex: index
      }))

      setAccounts(accountsWithTags)
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
    const account = accounts[index]

    // Don't allow selection of unavailable or invalid accounts
    if (account.tag === UNAVAILABLE_PREFIX || !account.validation?.isValid) {
      return
    }

    const newSelected = new Set(selectedAccounts)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedAccounts(newSelected)
  }

  const getStatusBadge = (validation?: AccountValidation) => {
    if (!validation) return null

    const badges = {
      unavailable: { label: 'Unavailable', className: 'bg-yellow-500' },
      duplicate: { label: 'Duplicate', className: 'bg-red-500' },
      mismatch: { label: 'Invalid', className: 'bg-red-500' },
      valid: { label: 'Valid', className: 'bg-green-500' },
      loading: { label: 'Validating...', className: 'bg-blue-500' }
    }

    const badge = badges[validation.status]

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className={badge.className}>
            {badge.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {validation.error || 'Account is valid'}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider>
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

                  {validating ? (
                    <div className="flex flex-col items-center justify-center py-8 space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        Validating {accounts.length} accounts...
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-lg divide-y max-h-[240px] overflow-y-auto">
                      {accounts.map((account) => (
                        <div
                          key={`${account.address}-${account.originalIndex}`}
                          className={cn(
                            "flex items-center justify-between p-3",
                            account.validation?.isValid && "cursor-pointer hover:bg-secondary/50",
                            selectedAccounts.has(account.originalIndex) && "bg-primary/10",
                            !account.validation?.isValid && "opacity-75"
                          )}
                          onClick={() => account.validation?.isValid && toggleAccount(account.originalIndex)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{account.name}</p>
                              {account.isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                getStatusBadge(account.validation)
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Tag: {account.tag}
                            </p>
                            {account.validation?.networkBalance && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Balance: {account.validation.networkBalance} MCM
                              </p>
                            )}
                          </div>
                          {selectedAccounts.has(account.originalIndex) && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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
    </TooltipProvider>
  )
} 