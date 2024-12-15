import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SecureStorage } from '@/lib/utils/storage'

interface UnlockWalletProps {
  onUnlock: (wallet: any, password: string) => void
}

export function UnlockWallet({ onUnlock }: UnlockWalletProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleUnlock = async () => {
    try {
      setError(null)
      setLoading(true)
      console.log('Attempting to unlock wallet...')
      const wallet = await SecureStorage.loadWallet(password)
      console.log('Wallet unlocked successfully')
      onUnlock(wallet, password)
    } catch (error) {
      console.error('Error unlocking wallet:', error)
      setError(error instanceof Error ? error.message : 'Failed to unlock wallet')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password) {
      handleUnlock()
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Unlock Wallet</h2>
      <div className="space-y-2">
        <Input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => {
            setError(null)
            setPassword(e.target.value)
          }}
          onKeyPress={handleKeyPress}
          disabled={loading}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      <Button 
        onClick={handleUnlock} 
        className="w-full"
        disabled={!password || loading}
      >
        {loading ? 'Unlocking...' : 'Unlock'}
      </Button>
    </div>
  )
} 