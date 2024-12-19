import { WalletCore } from '../wallet'
import { MochimoService } from '@/lib/services/mochimo'
import type { TagResolveResponse } from '@/lib/services/mochimo'

// Mock the entire module
jest.mock('@/lib/services/mochimo')

describe('WalletCore', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Wallet Creation', () => {
        it('should create a master wallet', () => {
            const wallet = WalletCore.createMasterWallet()
            expect(wallet.mnemonic).toBeDefined()
            expect(wallet.masterSeed).toBeInstanceOf(Uint8Array)
            expect(wallet.accounts).toEqual({})
        })

        it('should recover wallet from mnemonic', () => {
            const originalWallet = WalletCore.createMasterWallet()
            const recoveredWallet = WalletCore.recoverWallet(originalWallet.mnemonic)
            expect(recoveredWallet.masterSeed).toEqual(originalWallet.masterSeed)
        })
    })

    describe('Account Management', () => {
        let wallet: ReturnType<typeof WalletCore.createMasterWallet>

        beforeEach(() => {
            wallet = WalletCore.createMasterWallet()
        })

        it('should create an account', () => {
            const account = WalletCore.createAccount(wallet, 0)
            expect(account.index).toBe(0)
            expect(account.tag).toHaveLength(24)
            expect(account.wotsIndex).toBe(0)
            expect(account.isActivated).toBe(false)
        })

        it('should not allow duplicate account indices', () => {
            WalletCore.createAccount(wallet, 0)
            expect(() => WalletCore.createAccount(wallet, 0)).toThrow()
        })

        it('should generate valid tags', () => {
            const account = WalletCore.createAccount(wallet, 0)
            expect(WalletCore.isValidTag(account.tag)).toBe(true)
            expect(account.tag).not.toMatch(/^00/)
            expect(account.tag).not.toMatch(/^42/)
        })
    })

    describe('WOTS Address Management', () => {
        let wallet: ReturnType<typeof WalletCore.createMasterWallet>
        let account: ReturnType<typeof WalletCore.createAccount>

        beforeEach(() => {
            wallet = WalletCore.createMasterWallet()
            account = WalletCore.createAccount(wallet, 0)
            jest.clearAllMocks()
        })

        it('should compute correct WOTS address', () => {
            const address = (WalletCore as any).computeWOTSAddress(
                wallet.masterSeed,
                account,
                0
            )
            expect(address).toHaveLength(4416) // 2208 * 2 for hex string
            expect(address).toMatch(/^[0-9a-f]+$/i)
        })

        it('should sync WOTS index with network', async () => {
            // First, compute the expected WOTS address for index 0
            const expectedAddress = (WalletCore as any).computeWOTSAddress(
                wallet.masterSeed,
                account,
                0
            )

            // Set up mock response with the computed address
            const mockResponse: TagResolveResponse = {
                success: true,
                unanimous: true,
                addressConsensus: expectedAddress,
                balanceConsensus: '1000000000',
                quorum: []
            }

            // Mock the service method
            jest.spyOn(MochimoService, 'resolveTag')
                .mockResolvedValue(mockResponse)

            await WalletCore.syncWOTSIndex(wallet, 0)


            expect(account.wotsIndex).toBe(0)  // Should find match at index 0
            expect(MochimoService.resolveTag).toHaveBeenCalledWith(account.tag)
        })
    })

    describe('Transaction Signing', () => {
        let wallet: ReturnType<typeof WalletCore.createMasterWallet>
        let account: ReturnType<typeof WalletCore.createAccount>

        beforeEach(() => {
            wallet = WalletCore.createMasterWallet()
            account = WalletCore.createAccount(wallet, 0)
            jest.clearAllMocks()
        })

        it('should sign transaction and return correct format', () => {
            // Get the expected current address
            const expectedAddress = (WalletCore as any).computeWOTSAddress(
                wallet.masterSeed,
                account,
                account.wotsIndex
            )

            const testTransaction = 'test_transaction_data'
            const { signature, address } = WalletCore.signTransaction(
                wallet,
                0,
                testTransaction
            )

            // Verify signature format
            expect(signature).toBeDefined()
            expect(signature).toMatch(/^[0-9a-f]+$/i) // Should be hex string
            expect(signature.length).toBe(4288) // 2144 bytes * 2 for hex

            // Verify address matches computed address
            expect(address).toBe(expectedAddress)
        })

        it('should generate different signatures for different transactions', () => {
            const tx1 = 'transaction_1'
            const tx2 = 'transaction_2'

            const sig1 = WalletCore.signTransaction(wallet, 0, tx1)
            const sig2 = WalletCore.signTransaction(wallet, 0, tx2)

            expect(sig1.signature).not.toBe(sig2.signature)
            expect(sig1.address).toBe(sig2.address) // Same address for same index
        })

        it('should verify valid signatures', () => {
            const message = 'test_message'
            const { signature, address } = WalletCore.signTransaction(wallet, 0, message)

            const isValid = WalletCore.verify(message, signature, address)
            expect(isValid).toBe(true)
        })

        it('should reject invalid signatures', () => {
            const message = 'test_message'
            const { signature, address } = WalletCore.signTransaction(wallet, 0, message)

            // Try to verify with wrong message
            const isValidWrongMessage = WalletCore.verify('wrong_message', signature, address)
            expect(isValidWrongMessage).toBe(false)

            // Try to verify with wrong signature
            const wrongSignature = '0'.repeat(signature.length)
            const isValidWrongSignature = WalletCore.verify(message, wrongSignature, address)
            expect(isValidWrongSignature).toBe(false)
        })

        it('should throw error for non-existent account', () => {
            expect(() => {
                WalletCore.signTransaction(wallet, 999, 'test_message')
            }).toThrow('Account 999 not found')
        })
    })
})


