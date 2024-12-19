import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WalletCore } from '@/lib/core/wallet'
import { SecureStorage } from '@/lib/utils/storage'
import { Eye, EyeOff, Lock, AlertCircle } from 'lucide-react'
import { Logo } from '../ui/logo'
import { motion } from 'framer-motion'
import { cn } from "@/lib/utils"

interface CreateWalletProps {
  onWalletCreated: (wallet: any) => void
}

type Step = 'credentials' | 'mnemonic' | 'verify'

interface WordVerification {
  index: number
  word: string
  input: string
}

export function CreateWallet({ onWalletCreated }: CreateWalletProps) {
  const [step, setStep] = useState<Step>('credentials')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tempWallet, setTempWallet] = useState<any>(null)
  const [verificationWords, setVerificationWords] = useState<WordVerification[]>([])

  // Helper to get random word indices for verification
  const getRandomWordIndices = (total: number, count: number = 3): number[] => {
    const indices: number[] = []
    while (indices.length < count) {
      const index = Math.floor(Math.random() * total)
      if (!indices.includes(index)) {
        indices.push(index)
      }
    }
    return indices.sort((a, b) => a - b)
  }

  // Setup verification words when moving to verify step
  const setupVerification = () => {
    const words = tempWallet.mnemonic.split(' ')
    const indices = getRandomWordIndices(words.length)
    setVerificationWords(
      indices.map(index => ({
        index,
        word: words[index],
        input: words[index]
      }))
    )
    setStep('verify')
  }

  // Handle verification input
  const handleVerificationInput = (index: number, value: string) => {
    setVerificationWords(prev => 
      prev.map(w => 
        w.index === index ? { ...w, input: value.toLowerCase().trim() } : w
      )
    )
  }

  // Verify mnemonic words
  const verifyMnemonic = () => {
    const isValid = verificationWords.every(w => w.input === w.word)
    if (!isValid) {
      setError('The words you entered do not match. Please try again.')
      return false
    }
    return true
  }

  const handleKeyDown = (e: React.KeyboardEvent, field: 'password' | 'confirm') => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      if (field === 'password') {
        // Move focus to confirm password field
        const confirmInput = document.getElementById('confirmPassword')
        confirmInput?.focus()
      } else if (field === 'confirm') {
        // Submit form
        handleSubmit(e as any)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long')
        return
      }

      if (step === 'credentials') {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          return
        }

        // Generate temporary wallet data without saving
        const newWallet = WalletCore.createMasterWallet(password)
        setTempWallet(newWallet)
        setStep('mnemonic')
      }

      if (step === 'mnemonic') {
        setupVerification()
      }

      if (step === 'verify') {
        if (verifyMnemonic()) {
          setLoading(true)
          try {
            // Only create and save wallet after successful verification
            const wallet = WalletCore.createMasterWallet(password, tempWallet.mnemonic)
            await SecureStorage.saveWallet(wallet, password)
            onWalletCreated({ ...wallet, password })
          } catch (error) {
            console.error('Error creating wallet:', error)
            setError('Failed to create wallet')
          }
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'credentials') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="flex flex-col items-center space-y-4">
            <Logo size="lg" animated />
            <h1 className="text-2xl font-bold text-center">Create New Wallet</h1>
            <p className="text-sm text-muted-foreground text-center">
              Set a strong password to protect your wallet
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Password Input */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setError(null)
                      setPassword(e.target.value)
                    }}
                    onKeyDown={(e) => handleKeyDown(e, 'password')}
                    className="pr-10"
                    placeholder="Enter your password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Confirm Password
                </label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setError(null)
                    setConfirmPassword(e.target.value)
                  }}
                  onKeyDown={(e) => handleKeyDown(e, 'confirm')}
                  className="pr-10"
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? 'Creating Wallet...' : 'Create Wallet'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  if (step === 'mnemonic' && tempWallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center space-y-4">
            <Logo size="lg" animated />
            <h1 className="text-2xl font-bold text-center">Backup Your Recovery Phrase</h1>
            <div className="text-sm text-muted-foreground text-center space-y-2">
              <p>Write down these 24 words in order and keep them safe.</p>
              <p className="font-medium text-destructive">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                If you lose these words, you will lose access to your wallet forever.
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-mono break-all select-all">{tempWallet.mnemonic}</p>
          </div>

          <Button 
            onClick={handleSubmit}
            className="w-full"
            size="lg"
          >
            I've Saved My Recovery Phrase
          </Button>
        </div>
      </div>
    )
  }

  if (step === 'verify') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full p-6">
        <div className="w-full max-w-md">
          {/* Header - More compact */}
          <div className="flex flex-col items-center space-y-2 mb-6">
            <Logo size="sm" animated />
            <h1 className="text-xl font-bold text-center">Verify Recovery Phrase</h1>
            <p className="text-xs text-muted-foreground text-center">
              Enter the requested words to verify your backup
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Word inputs - More compact grid */}
            <div className="grid grid-cols-1 gap-3">
              {verificationWords.map((verification, idx) => (
                <div 
                  key={verification.index}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <Input
                        type="text"
                        value={verification.input}
                        onChange={(e) => handleVerificationInput(verification.index, e.target.value)}
                        placeholder={`Word #${verification.index + 1}`}
                        autoComplete="off"
                        spellCheck="false"
                        className="pr-8 h-9 text-sm transition-all border-primary/20 focus:border-primary/40 bg-muted/50"
                        autoFocus={idx === 0}
                      />
                      {verification.input && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            "absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full",
                            verification.input === verification.word
                              ? "bg-green-500/20"
                              : "bg-destructive/20"
                          )}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Error Message - More compact */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-2 py-1.5 rounded bg-destructive/10 text-xs text-destructive flex items-center gap-1.5"
              >
                <AlertCircle className="h-3 w-3" />
                {error}
              </motion.div>
            )}

            {/* Actions - More compact */}
            <div className="space-y-2 pt-2">
              <Button
                type="submit"
                className="w-full relative overflow-hidden group h-9"
                disabled={loading || verificationWords.some(w => !w.input)}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0"
                  animate={{
                    x: ['0%', '100%'],
                  }}
                  transition={{
                    duration: 1.5,
                    ease: 'linear',
                    repeat: Infinity,
                  }}
                />
                <span className="relative text-sm">
                  {loading ? 'Verifying...' : 'Complete Setup'}
                </span>
              </Button>

              <button
                type="button"
                onClick={() => setStep('mnemonic')}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                ← View recovery phrase
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }
} 