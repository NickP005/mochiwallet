import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWallet } from 'mochimo-wallet'
import { CheckCircle2, Loader2, Copy } from 'lucide-react'

interface SendModalProps {
  isOpen: boolean
  onClose: () => void
  accountIndex: number
}

interface TransactionResponse {
  status: 'success' | 'error'
  data?: {
    sent: number
    txid: string
  }
  error?: string
}

export function SendModal({ isOpen, onClose, accountIndex }: SendModalProps) {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState<{ txid: string } | null>(null)

  const w = useWallet()

  const handleSend = async () => {
    try {
      setError(null)
      setSuccess(null)
      setSending(true)

      if (!recipient || !amount) {
        throw new Error('Please fill in all fields')
      }

      const amountBigInt = BigInt(Math.floor(parseFloat(amount) * 1e9))
      const result = await w.sendTransaction(recipient, amountBigInt) as TransactionResponse

      if (result.status === 'success' && result.data) {
        setSuccess({ txid: result.data.txid })
      } else {
        throw new Error(result.error || 'Transaction failed')
      }
    } catch (error) {
      console.error('Send error:', error)
      setError(error instanceof Error ? error.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    onClose()
    // Reset form state when modal is closed
    setSuccess(null)
    setRecipient('')
    setAmount('')
    setError(null)
  }

  const copyTxId = async (txid: string) => {
    try {
      await navigator.clipboard.writeText(txid)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[340px] p-4 gap-2">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base">
            Send MCM
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {success ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="h-10 w-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="text-center w-full">
                <h3 className="text-sm font-medium">Transaction Sent!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Transaction ID:
                </p>
                <div className="flex items-center gap-1 justify-center mt-1">
                  <p className="text-[11px] font-mono bg-muted/50 rounded px-1.5 py-0.5 truncate max-w-[200px]">
                    {success.txid}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyTxId(success.txid)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <Button 
                size="sm"
                className="mt-2 w-full" 
                onClick={handleClose}
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-sm">Recipient Address</Label>
                <Input
                  className="h-8 text-sm"
                  placeholder="Enter recipient address or tag"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  disabled={sending}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm">Amount (MCM)</Label>
                <Input
                  className="h-8 text-sm"
                  type="number"
                  step="0.000000001"
                  min="0"
                  placeholder="0.000000000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={sending}
                />
              </div>

              {error && (
                <div className="text-xs text-red-500">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleClose} 
                  disabled={sending}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm"
                  onClick={handleSend}
                  disabled={sending || !recipient || !amount}
                >
                  {sending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 