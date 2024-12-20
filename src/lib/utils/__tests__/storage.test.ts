import { SecureStorage } from '../storage'
import mockBrowser, { mockStorage } from '../../../__mocks__/browser'
import { WalletCore } from '@/lib/core/wallet'

describe('SecureStorage - Real World Scenarios', () => {
  const password = 'test_password123!'
  let storedData: any = {}

  beforeEach(() => {
    jest.clearAllMocks()

      // Set up storage mocks
      ; (mockStorage.local.set as jest.Mock).mockImplementation((data) => {
        storedData = data
        return Promise.resolve()
      })
      ; (mockStorage.local.get as jest.Mock).mockImplementation(() => {
        return Promise.resolve(storedData)
      })
  })

  it('should handle complete wallet lifecycle', async () => {
    // 1. Create and save initial master wallet
    const masterWallet = WalletCore.createMasterWallet(password)
    await SecureStorage.saveWallet(masterWallet, password)

    // Verify initial save
    expect(mockStorage.local.set).toHaveBeenCalledTimes(1)

    // Load and verify initial wallet
    const loadedWallet1 = await SecureStorage.loadWallet(password)
    expect(loadedWallet1).toEqual(masterWallet)
    expect(Object.keys(loadedWallet1.accounts)).toHaveLength(0)

    // 2. Add first account
    const account1 = WalletCore.createAccount(masterWallet, 0)
    await SecureStorage.saveWallet(masterWallet, password)

    // Load and verify wallet with first account
    const loadedWallet2 = await SecureStorage.loadWallet(password)
    expect(loadedWallet2.accounts[0]).toBeDefined()
    expect(loadedWallet2.accounts[0].tag).toBe(account1.tag)
    expect(loadedWallet2.accounts[0].index).toBe(0)
    expect(Object.keys(loadedWallet2.accounts)).toHaveLength(1)

    // 3. Add second account
    const account2 = WalletCore.createAccount(masterWallet, 1)
    await SecureStorage.saveWallet(masterWallet, password)

    // Load and verify wallet with both accounts
    const loadedWallet3 = await SecureStorage.loadWallet(password)
    expect(loadedWallet3.accounts[0]).toBeDefined()
    expect(loadedWallet3.accounts[1]).toBeDefined()
    expect(loadedWallet3.accounts[0].tag).toBe(account1.tag)
    expect(loadedWallet3.accounts[1].tag).toBe(account2.tag)
    expect(Object.keys(loadedWallet3.accounts)).toHaveLength(2)

    // Verify account specific data
    expect(loadedWallet3.accounts[0].wotsIndex).toBe(0)
    expect(loadedWallet3.accounts[1].wotsIndex).toBe(0)
    expect(loadedWallet3.accounts[0].isActivated).toBe(false)
    expect(loadedWallet3.accounts[1].isActivated).toBe(false)

    // Verify master wallet data persisted
    expect(loadedWallet3.mnemonic).toBe(masterWallet.mnemonic)
    expect(Buffer.from(loadedWallet3.masterSeed).toString('hex'))
      .toBe(Buffer.from(masterWallet.masterSeed).toString('hex'))

    // 4. Modify account state
    masterWallet.accounts[0].wotsIndex = 1
    masterWallet.accounts[0].isActivated = true
    await SecureStorage.saveWallet(masterWallet, password)

    // Load and verify modified state
    const loadedWallet4 = await SecureStorage.loadWallet(password)
    expect(loadedWallet4.accounts[0].wotsIndex).toBe(1)
    expect(loadedWallet4.accounts[0].isActivated).toBe(true)
    expect(loadedWallet4.accounts[1].wotsIndex).toBe(0)
    expect(loadedWallet4.accounts[1].isActivated).toBe(false)

    // 5. Verify encryption is working
    const encryptedData = (mockStorage.local.set as jest.Mock).mock.calls[0][0].encryptedWallet
    expect(encryptedData.data).not.toContain(masterWallet.mnemonic)
    expect(encryptedData.data).not.toContain(account1.tag)
    expect(encryptedData.data).not.toContain(account2.tag)

    // 6. Verify wrong password fails
    await expect(
      SecureStorage.loadWallet('wrong_password')
    ).rejects.toThrow('Invalid password')

    // 7. Remove wallet
    await SecureStorage.removeWallet()
    expect(mockStorage.local.remove).toHaveBeenCalledWith('encryptedWallet')

      // 8. Verify wallet is gone
      ; (mockStorage.local.get as jest.Mock).mockResolvedValue({})
    await expect(
      SecureStorage.loadWallet(password)
    ).rejects.toThrow('No wallet found')
  })
}) 