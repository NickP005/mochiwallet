import { WalletCore } from '../wallet'
import { MochimoService } from '@/lib/services/mochimo'
import { Buffer } from 'buffer'

// Mock the entire module
jest.mock('@/lib/services/mochimo')

// Mock implementation
const mockResolveTag = jest.fn()
;(MochimoService as jest.Mocked<typeof MochimoService>).resolveTag = mockResolveTag

describe('Transaction Operations', () => {
  const mockSourceWOTS = Buffer.alloc(2208, 1)
  const mockDestWOTS = Buffer.alloc(2208, 2)
  const mockChangeWOTS = Buffer.alloc(2208, 3)
  const mockSecret = 'test_secret'

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  describe('computeTransaction', () => {
    it('should compute transaction with correct structure', () => {
      const tx = WalletCore.computeTransaction({
        sourceWOTS: mockSourceWOTS,
        sourceSecret: mockSecret,
        destinationWOTS: mockDestWOTS,
        changeWOTS: mockChangeWOTS,
        sentAmount: 1000n,
        remainingAmount: 500n,
        fee: 1n
      })

      // Check total length
      expect(tx.length).toBe(8920)

      // Check protocol version
      expect(tx[2]).toBe(57)
      expect(tx[3]).toBe(5)

      // Check transaction type
      expect(tx[8]).toBe(0)
      expect(tx[9]).toBe(3)

      // Check trailer
      expect(tx[tx.length - 2]).toBe(205)
      expect(tx[tx.length - 1]).toBe(171)
    })

    it('should reject invalid WOTS lengths', () => {
      expect(() => {
        WalletCore.computeTransaction({
          sourceWOTS: Buffer.alloc(2207), // Wrong length
          sourceSecret: mockSecret,
          destinationWOTS: mockDestWOTS,
          changeWOTS: mockChangeWOTS,
          sentAmount: 1000n,
          remainingAmount: 500n,
          fee: 1n
        })
      }).toThrow('Invalid WOTS length')
    })

    it('should handle amounts correctly', () => {
      const maxAmount = BigInt('0xFFFFFFFFFFFFFFFF')
      const tx = WalletCore.computeTransaction({
        sourceWOTS: mockSourceWOTS,
        sourceSecret: mockSecret,
        destinationWOTS: mockDestWOTS,
        changeWOTS: mockChangeWOTS,
        sentAmount: maxAmount,
        remainingAmount: 0n,
        fee: 0n
      })

      // Check amount bytes (should be max value)
      const amountOffset = 10 + 16 + 32 * 3 + 2 + 2208 * 3
      const amountBytes = tx.slice(amountOffset, amountOffset + 8)
      expect(Array.from(amountBytes)).toEqual([255, 255, 255, 255, 255, 255, 255, 255])
    })
  })

  describe('createTransaction', () => {
    let wallet: ReturnType<typeof WalletCore.createMasterWallet>
    
    beforeEach(() => {
      wallet = WalletCore.createMasterWallet('test_password')
      const account = WalletCore.createAccount(wallet, 0)
      
      // Mock tag resolution with proper typing
      const mockTagResponse = {
        success: true,
        addressConsensus: mockDestWOTS.toString('hex'),
        balanceConsensus: '2000',
        quorum: []
      }
      
      // Set up mock implementation
      mockResolveTag.mockResolvedValue(mockTagResponse)
    })

    it('should create valid transaction', async () => {
      const tx = await WalletCore.createTransaction(
        wallet,
        0,
        'ABCDEF1234567890ABCDEF12',
        1000n,
        1n
      )

      expect(tx).toBeInstanceOf(Uint8Array)
      expect(tx.length).toBe(8920)
      expect(mockResolveTag).toHaveBeenCalled()
    })

    it('should validate amounts', async () => {
      await expect(
        WalletCore.createTransaction(wallet, 0, 'ABCDEF1234567890ABCDEF12', -1n)
      ).rejects.toThrow('Amount must be positive')

      await expect(
        WalletCore.createTransaction(wallet, 0, 'ABCDEF1234567890ABCDEF12', 1n, -1n)
      ).rejects.toThrow('Fee cannot be negative')
    })

    it('should validate destination tag', async () => {
      await expect(
        WalletCore.createTransaction(wallet, 0, 'invalid_tag', 1000n)
      ).rejects.toThrow('Invalid destination tag')
    })

    it('should check balance', async () => {
      // Mock insufficient balance
      const mockLowBalance = {
        success: true,
        addressConsensus: mockDestWOTS.toString('hex'),
        balanceConsensus: '500',
        quorum: []
      }
      
      // Update mock for this specific test
      mockResolveTag.mockResolvedValue(mockLowBalance)

      await expect(
        WalletCore.createTransaction(wallet, 0, 'ABCDEF1234567890ABCDEF12', 1000n)
      ).rejects.toThrow('Insufficient balance')
    })

    it('should handle tag resolution failure', async () => {
      // Mock tag resolution failure
      const mockFailure = {
        success: false,
        error: 'Network error'
      }
      
      // Update mock for this specific test
      mockResolveTag.mockResolvedValue(mockFailure)

      await expect(
        WalletCore.createTransaction(wallet, 0, 'ABCDEF1234567890ABCDEF12', 1000n)
      ).rejects.toThrow('Failed to resolve source tag')
    })
  })
}) 