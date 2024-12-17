import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from '@/components/ui/card'
import { Send, ArrowRight, X } from 'lucide-react'

interface SendTransactionProps {
  onClose: () => void
  onSend: (data: { tag: string; amount: string }) => Promise<void>
}

export function SendTransaction({ onClose, onSend }: SendTransactionProps) {
  const [tag, setTag] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!tag || !amount) {
      setError('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      await onSend({ tag, amount })
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send transaction')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50">
      <div className="container flex items-center justify-center h-full max-w-lg mx-auto">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Send MCM</CardTitle>
                <CardDescription>
                  Send Mochimo to another wallet
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Tag Input */}
              <div className="space-y-2">
                <Label htmlFor="tag">Recipient Tag</Label>
                <Input
                  id="tag"
                  placeholder="Enter recipient's tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                />
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (MCM)</Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    step="0.000001"
                    min="0"
                    placeholder="0.000000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pr-12"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    MCM
                  </div>
                </div>
              </div>

              {/* Transaction Preview */}
              {(tag || amount) && (
                <Card className="bg-muted">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted-foreground">You</div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <div className="text-muted-foreground">
                        {tag || 'Recipient'}
                      </div>
                    </div>
                    {amount && (
                      <div className="mt-2 text-center font-medium">
                        {amount} MCM
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Error Message */}
              {error && (
                <div className="text-sm text-destructive">
                  {error}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex gap-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={loading}
              >
                {loading ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Transaction
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  )
} 