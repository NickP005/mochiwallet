import { SecureStorage } from '../storage'
import browser from 'webextension-polyfill'

// Mock browser.storage.local
jest.mock('webextension-polyfill', () => ({
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
    },
  },
}))

describe('SecureStorage', () => {
  const mockWallet = {
    mnemonic: 'test mnemonic',
    masterSeed: new Uint8Array([1, 2, 3]),
    accounts: {},
  }

  const mockPassword = 'testPassword123!'

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    ;(browser.storage.local.get as jest.Mock).mockResolvedValue({})
    ;(browser.storage.local.set as jest.Mock).mockResolvedValue(undefined)
  })

  describe('encrypt', () => {
    it('should encrypt data with password', async () => {
      const encrypted = await SecureStorage.encrypt(mockWallet, mockPassword)

      expect(encrypted).toHaveProperty('data')
      expect(encrypted).toHaveProperty('salt')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('version')
      expect(encrypted).toHaveProperty('iterations')
      expect(encrypted).toHaveProperty('timestamp')
      expect(encrypted).toHaveProperty('attempts')

      // Log for debugging
      console.log('Encrypted data:', encrypted)
    })

    it('should generate different ciphertexts for same data', async () => {
      const encrypted1 = await SecureStorage.encrypt(mockWallet, mockPassword)
      const encrypted2 = await SecureStorage.encrypt(mockWallet, mockPassword)

      expect(encrypted1.data).not.toBe(encrypted2.data)
      expect(encrypted1.salt).not.toBe(encrypted2.salt)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
    })
  })

  describe('decrypt', () => {
    it('should decrypt previously encrypted data', async () => {
      const encrypted = await SecureStorage.encrypt(mockWallet, mockPassword)
      const decrypted = await SecureStorage.decrypt(encrypted, mockPassword)

      expect(decrypted).toEqual(mockWallet)
    })

    it('should fail with wrong password', async () => {
      const encrypted = await SecureStorage.encrypt(mockWallet, mockPassword)
      
      await expect(
        SecureStorage.decrypt(encrypted, 'wrongPassword')
      ).rejects.toThrow('Invalid password')
    })

    it('should handle version mismatch', async () => {
      const encrypted = await SecureStorage.encrypt(mockWallet, mockPassword)
      encrypted.version = 999

      await expect(
        SecureStorage.decrypt(encrypted, mockPassword)
      ).rejects.toThrow('Incompatible wallet version')
    })

    it('should handle too many attempts', async () => {
      const encrypted = await SecureStorage.encrypt(mockWallet, mockPassword)
      encrypted.attempts = 3
      encrypted.timestamp = Date.now()

      await expect(
        SecureStorage.decrypt(encrypted, mockPassword)
      ).rejects.toThrow('Wallet is locked')
    })
  })

  describe('saveWallet/loadWallet', () => {
    it('should save and load wallet', async () => {
      let storedData: any = {}
      ;(browser.storage.local.set as jest.Mock).mockImplementation(
        (data) => { storedData = data }
      )
      ;(browser.storage.local.get as jest.Mock).mockImplementation(
        () => Promise.resolve(storedData)
      )

      await SecureStorage.saveWallet(mockWallet, mockPassword)
      const loaded = await SecureStorage.loadWallet(mockPassword)

      expect(loaded).toEqual(mockWallet)
    })

    it('should handle missing wallet', async () => {
      ;(browser.storage.local.get as jest.Mock).mockResolvedValue({})

      await expect(
        SecureStorage.loadWallet(mockPassword)
      ).rejects.toThrow('No wallet found')
    })
  })

  describe('hasWallet', () => {
    it('should return true when wallet exists', async () => {
      ;(browser.storage.local.get as jest.Mock).mockResolvedValue({
        encryptedWallet: { data: 'test' }
      })

      const result = await SecureStorage.hasWallet()
      expect(result).toBe(true)
    })

    it('should return false when wallet does not exist', async () => {
      ;(browser.storage.local.get as jest.Mock).mockResolvedValue({})

      const result = await SecureStorage.hasWallet()
      expect(result).toBe(false)
    })
  })

  describe('removeWallet', () => {
    it('should remove wallet from storage', async () => {
      await SecureStorage.removeWallet()
      expect(browser.storage.local.remove).toHaveBeenCalledWith('encryptedWallet')
    })
  })

  describe('sanitizeData', () => {
    it('should remove sensitive data', async () => {
      const walletWithSensitive = {
        ...mockWallet,
        privateKeys: ['sensitive'],
        tempKeys: ['sensitive'],
        otherData: 'keep'
      }

      const encrypted = await SecureStorage.encrypt(walletWithSensitive, mockPassword)
      const decrypted = await SecureStorage.decrypt(encrypted, mockPassword)

      expect(decrypted).not.toHaveProperty('privateKeys')
      expect(decrypted).not.toHaveProperty('tempKeys')
      expect(decrypted).toHaveProperty('otherData')
    })
  })
}) 