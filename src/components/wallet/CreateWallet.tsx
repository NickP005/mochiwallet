import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WalletCore } from '@/lib/core/wallet'
import { SecureStorage } from '@/lib/utils/storage'
import { Mnemonic } from '@/lib/core/mnemonic'

type WizardStep = 'password' | 'confirm' | 'mnemonic' | 'verify' | 'complete'

interface VerifyWord {
  index: number
  word: string
  input: string
}

interface CreateWalletProps {
  onWalletCreated: (wallet: any) => void
}

export function CreateWallet({ onWalletCreated }: CreateWalletProps) {
  const [step, setStep] = useState<WizardStep>('password')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [verifyWords, setVerifyWords] = useState<VerifyWord[]>([])
  const [error, setError] = useState<string | null>(null)

  // Generate new mnemonic
  const handleGenerateNew = () => {
    setMnemonic(Mnemonic.generate())
    setVerifyWords([])
  }

  // Setup verification words
  const setupVerification = () => {
    const words = mnemonic.split(' ')
    // Get 5 random unique positions
    const positions = Array.from({ length: words.length }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, 5)
      .sort((a, b) => a - b) // Sort positions in ascending order
    
    setVerifyWords(
      positions.map(index => ({
        index,
        word: words[index],
        input: words[index]
      }))
    )
    setStep('verify')
  }

  // Handle word input change
  const handleWordInput = (index: number, value: string) => {
    setVerifyWords(prev =>
      prev.map(w => 
        w.index === index ? { ...w, input: value.toLowerCase().trim() } : w
      )
    )
    setError(null)
  }

  // Verify words
  const handleVerify = async () => {
    try {
      console.log('Starting verification...')
      const allCorrect = verifyWords.every(({ word, input }) => 
        word.toLowerCase() === input.toLowerCase()
      )

      if (!allCorrect) {
        console.log('Verification failed')
        setError('One or more words are incorrect. Please try again.')
        setVerifyWords(prev => prev.map(w => ({ ...w, input: '' })))
        return
      }

      console.log('Verification successful, creating wallet...')
      const wallet = WalletCore.createMasterWallet(password, mnemonic)
      
      console.log('Wallet created:', wallet)
      await SecureStorage.saveWallet(wallet, password)
      
      console.log('Wallet saved, calling onWalletCreated...')
      onWalletCreated(wallet)
      
    } catch (error) {
      console.error('Error in verification/creation:', error)
      setError(error instanceof Error ? error.message : 'Failed to create wallet')
    }
  }

  // Handle next step
  const handleNext = () => {
    setError(null)

    switch (step) {
      case 'password':
        if (password.length < 8) {
          setError('Password must be at least 8 characters')
          return
        }
        setStep('confirm')
        break

      case 'confirm':
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          return
        }
        handleGenerateNew()
        setStep('mnemonic')
        break

      case 'mnemonic':
        setupVerification()
        break

      case 'verify':
        handleVerify()
        break
    }
  }

  // Render mnemonic display
  const renderMnemonic = () => {
    const words = mnemonic.split(' ')
    return (
      <div className="grid grid-cols-3 gap-2 p-4 bg-gray-100 rounded-lg">
        {words.map((word, index) => (
          <div key={index} className="flex items-center space-x-2">
            <span className="text-gray-500 text-sm">{index + 1}.</span>
            <span className="font-mono">{word}</span>
          </div>
        ))}
      </div>
    )
  }

  // Render verification inputs
  const renderVerification = () => {
    return (
      <div className="space-y-4">
        {verifyWords.map(({ index, input }) => (
          <div key={index} className="flex items-center space-x-2">
            <span className="text-gray-500 text-sm min-w-[3rem]">
              Word #{index + 1}:
            </span>
            <Input
              value={input}
              onChange={(e) => handleWordInput(index, e.target.value)}
              placeholder={`Enter word #${index + 1}`}
              className="flex-1"
            />
          </div>
        ))}
      </div>
    )
  }

  // Render based on current step
  switch (step) {
    case 'password':
    case 'confirm':
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">
            {step === 'password' ? 'Create Password' : 'Confirm Password'}
          </h2>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder={step === 'password' ? 'Enter password' : 'Confirm password'}
              value={step === 'password' ? password : confirmPassword}
              onChange={(e) => {
                setError(null)
                if (step === 'password') {
                  setPassword(e.target.value)
                } else {
                  setConfirmPassword(e.target.value)
                }
              }}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <Button onClick={handleNext} className="w-full">
            Continue
          </Button>
        </div>
      )

    case 'mnemonic':
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Backup Recovery Phrase</h2>
          <p className="text-sm text-gray-500">
            Write down these 24 words in order. You'll need them to recover your wallet.
          </p>
          {renderMnemonic()}
          <div className="flex space-x-2">
            <Button onClick={handleGenerateNew} variant="outline">
              Generate New
            </Button>
            <Button onClick={handleNext}>
              I've Written It Down
            </Button>
          </div>
        </div>
      )

    case 'verify':
      return (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Verify Recovery Phrase</h2>
          <p className="text-sm text-gray-500">
            Please enter the requested words from your recovery phrase to verify you've saved it correctly.
          </p>
          {renderVerification()}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            onClick={handleNext}
            disabled={verifyWords.some(w => !w.input.trim())}
            className="w-full"
          >
            Verify
          </Button>
        </div>
      )
  }
} 