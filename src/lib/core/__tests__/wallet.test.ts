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
            const wallet = WalletCore.createMasterWallet('test')
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

describe('WalletCore WOTS Integration', () => {
    describe('Key Generation and Signing', () => {
        it('should generate valid WOTS key pairs', () => {
            const wallet = WalletCore.createMasterWallet('test')
            const account = WalletCore.createAccount(wallet, 0)

            expect(account.currentWOTS.privateKey).toBeDefined()
            expect(account.currentWOTS.publicKey).toBeDefined()
            expect(account.currentWOTS.privateKey.length).toBeGreaterThan(0)
            expect(account.currentWOTS.publicKey.length).toBeGreaterThan(0)
        })

        it('should sign and verify messages correctly', () => {
            // Create a wallet and account with known seed for reproducibility
            const wallet = WalletCore.createMasterWallet('test-password')
            const account = WalletCore.createAccount(wallet, 0)
            const message = 'test message'

            // Log initial state
            console.log('\nInitial state:')
            console.log('Account:', {
                privateKey: account.currentWOTS.privateKey,
                publicKey: account.currentWOTS.publicKey
            })

            // First, test direct signing and verification
            const directSignature = WalletCore.sign(message, account.currentWOTS.privateKey)
            const directVerification = WalletCore.verify(
                message, 
                directSignature, 
                account.currentWOTS.publicKey
            )

            console.log('\nDirect signing test:', {
                message,
                signature: directSignature.slice(0, 64) + '...',
                publicKey: account.currentWOTS.publicKey.slice(0, 64) + '...',
                verified: directVerification
            })

            expect(directVerification).toBe(true)

            // Then test through transaction signing
            const { signature, address } = WalletCore.signTransaction(wallet, 0, message)
            
            console.log('\nTransaction signing test:', {
                message,
                signature: signature.slice(0, 64) + '...',
                address: address.slice(0, 64) + '...'
            })

            const transactionVerification = WalletCore.verify(message, signature, address)

            console.log('\nVerification result:', {
                verified: transactionVerification
            })

            expect(transactionVerification).toBe(true)

            // Test that key rotation happened
            expect(wallet.accounts[0].usedAddresses).toContain(address)
            expect(wallet.accounts[0].currentWOTS.publicKey).not.toBe(address)
        })

        it('should fail verification with wrong message', () => {
            const wallet = WalletCore.createMasterWallet('test')
            const account = WalletCore.createAccount(wallet, 0)
            const message = 'test message'
            console.log(account)
            const { signature, address } = WalletCore.signTransaction(
                wallet,
                0,
                message
            )

            const wrongMessage = 'wrong message'
            const isValid = WalletCore.verify(
                wrongMessage,
                signature,
                address
            )

            expect(isValid).toBe(false)
        })

        it('should rotate keys after signing', () => {
            const wallet = WalletCore.createMasterWallet('test')
            const account = WalletCore.createAccount(wallet, 0)
            
            console.log('\nInitial state:')
            console.log('Current private key:', account.currentWOTS.privateKey)
            console.log('Current public key:', account.currentWOTS.publicKey)
            console.log('Next private key:', account.nextWOTS.privateKey)
            console.log('Next public key:', account.nextWOTS.publicKey)
            console.log('Tag:', account.tag)

            const originalAddress = account.currentWOTS.publicKey
            const message = 'test message'
            
            const { signature, address } = WalletCore.signTransaction(wallet, 0, message)
            
            console.log('\nAfter signing:')
            console.log('Original address:', originalAddress)
            console.log('New current address:', wallet.accounts[0].currentWOTS.publicKey)
            console.log('New next address:', wallet.accounts[0].nextWOTS.publicKey)
            console.log('Used addresses:', wallet.accounts[0].usedAddresses)

            expect(wallet.accounts[0].currentWOTS.publicKey).not.toEqual(originalAddress)
            expect(wallet.accounts[0].usedAddresses).toContain(originalAddress)
        })
    })
}) 