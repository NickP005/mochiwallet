import { WalletCore } from '../wallet'

describe('WalletCore', () => {

  describe('master wallet', () => {
    it('should create new master wallet', () => {
      const wallet = WalletCore.createMasterWallet()
      expect(wallet.mnemonic).toBeDefined()
      expect(wallet.masterSeed).toBeDefined()
      expect(wallet.accounts).toEqual({})
    })

    it('should recover wallet from mnemonic', () => {
      const wallet1 = WalletCore.createMasterWallet('test')
      const wallet2 = WalletCore.recoverWallet(wallet1.mnemonic, 'test')
      
      expect(wallet2.masterSeed).toEqual(wallet1.masterSeed)
    })
  })

  describe('account management', () => {
    it('should create new account', () => {
      const wallet = WalletCore.createMasterWallet()
      const account = WalletCore.createAccount(wallet, 0)

      expect(account.index).toBe(0)
      expect(account.currentWOTS).toBeDefined()
      expect(account.nextWOTS).toBeDefined()
      expect(account.usedAddresses).toEqual([])
    })

    it('should create different accounts from same wallet', () => {
      const wallet = WalletCore.createMasterWallet()
      const account1 = WalletCore.createAccount(wallet, 0)
      const account2 = WalletCore.createAccount(wallet, 1)

      expect(account1.baseSeed).not.toBe(account2.baseSeed)
      expect(account1.currentWOTS.publicKey).not.toBe(account2.currentWOTS.publicKey)
    })

    it('should rotate keys after signing', () => {
      const wallet = WalletCore.createMasterWallet()
      const account = WalletCore.createAccount(wallet, 0)
      const oldAddress = account.currentWOTS.publicKey
      const nextAddress = account.nextWOTS.publicKey

      const { signature, address } = WalletCore.signTransaction(wallet, 0, 'test transaction')
      console.log(signature, address)
      expect(address).toBe(oldAddress)
      expect(wallet.accounts[0].currentWOTS.publicKey).toBe(nextAddress)
      expect(wallet.accounts[0].usedAddresses).toContain(oldAddress)
    })
  })

  describe('account tags', () => {
    it('should generate tag when creating account', () => {
      const wallet = WalletCore.createMasterWallet()
      const account = WalletCore.createAccount(wallet, 0)
      
      expect(account.tag).toBeDefined()
      expect(account.tag).toHaveLength(24)
      expect(account.tag).toMatch(/^[0-9A-F]{24}$/)
      expect(account.tag.startsWith('00')).toBe(false)
      expect(account.tag.startsWith('42')).toBe(false)
    })

    it('should generate multiple valid tags', () => {
      const wallet = WalletCore.createMasterWallet()
      const tags = new Set()
      
      for (let i = 0; i < 10; i++) {
        const account = WalletCore.createAccount(wallet, i)
        expect(account.tag.startsWith('00')).toBe(false)
        expect(account.tag.startsWith('42')).toBe(false)
        tags.add(account.tag)
      }
      
      expect(tags.size).toBe(10)
    })

    it('should generate different tags for different accounts', () => {
      const wallet = WalletCore.createMasterWallet()
      const account1 = WalletCore.createAccount(wallet, 0)
      const account2 = WalletCore.createAccount(wallet, 1)
      
      expect(account1.tag).not.toBe(account2.tag)
    })

    it('should generate consistent tags for same account', () => {
      const wallet1 = WalletCore.createMasterWallet('test')
      const wallet2 = WalletCore.recoverWallet(wallet1.mnemonic, 'test')
      
      const account1 = WalletCore.createAccount(wallet1, 0)
      const account2 = WalletCore.createAccount(wallet2, 0)
      
      expect(account1.tag).toBe(account2.tag)
    })

    it('should include tag in account info', () => {
      const wallet = WalletCore.createMasterWallet()
      const account = WalletCore.createAccount(wallet, 0)
      const info = WalletCore.getAccountInfo(account)
      
      expect(info.tag).toBe(account.tag)
      expect(info.currentAddress).toBe(account.currentWOTS.publicKey)
      expect(info.nextAddress).toBe(account.nextWOTS.publicKey)
    })

    it('should generate different tags for accounts across different wallets', () => {
      const wallet1 = WalletCore.createMasterWallet('test1')
      const wallet2 = WalletCore.createMasterWallet('test2')
      
      // Create accounts in both wallets
      const account1 = WalletCore.createAccount(wallet1, 0)
      const account2 = WalletCore.createAccount(wallet2, 0)
      const account3 = WalletCore.createAccount(wallet1, 1)
      const account4 = WalletCore.createAccount(wallet2, 1)
      
      // Collect all tags
      const tags = new Set([
        account1.tag,
        account2.tag,
        account3.tag,
        account4.tag
      ])
      
      // All tags should be unique
      expect(tags.size).toBe(4)
      
      // Verify specific pairs
      expect(account1.tag).not.toBe(account2.tag) // Same index, different wallets
      expect(account3.tag).not.toBe(account4.tag) // Same index, different wallets
      expect(account1.tag).not.toBe(account3.tag) // Different index, same wallet
      expect(account2.tag).not.toBe(account4.tag) // Different index, same wallet
    })
  })
}) 