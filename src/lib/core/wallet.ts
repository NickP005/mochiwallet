import CryptoJS from 'crypto-js'
import { Buffer } from 'buffer'
import { Mnemonic } from './mnemonic'
import { WOTS } from './wots_core'
import { MochimoService } from '../services/mochimo'

const TAG_LENGTH = 24 // 12 bytes = 24 hex chars
const SIGNATURE_SIZE = 2144  // Changed from 2208 to match WOTS.TXSIGLEN

export interface WalletAccount {
  index: number          // Account index
  tag: string           // Account tag
  wotsIndex: number     // Current WOTS index
  isActivated?: boolean // Activation status
  name: string;
}

export interface MasterWallet {
  mnemonic: string
  masterSeed: Uint8Array
  accounts: { [index: number]: WalletAccount }
}

interface TransactionParams {
  sourceWOTS: Uint8Array
  sourceSecret: string
  changeWOTS: Uint8Array
  destinationWOTS: Uint8Array
  sentAmount: bigint
  remainingAmount: bigint
  fee: bigint
}

export class WalletCore {
  public static wots = new WOTS()

  /**
   * Derives account base seed from master seed and account index
   */
  public static deriveAccountSeed(masterSeed: Uint8Array, accountIndex: number): string {
    const accountSeedData = new Uint8Array([
      ...masterSeed,
      ...new Uint8Array([accountIndex])
    ])
    return CryptoJS.SHA256(Buffer.from(accountSeedData).toString('hex')).toString()
  }

  /**
   * Computes WOTS address for given account and index
   */
  public static computeWOTSAddress(masterSeed: Uint8Array, account: WalletAccount, wotsIndex: number): string {
    const baseSeed = this.deriveAccountSeed(masterSeed, account.index)
    const wotsSeed = CryptoJS.SHA256(baseSeed + wotsIndex.toString(16).padStart(8, '0')).toString()
    const publicKey = this.wots.generatePKFrom(wotsSeed, account.tag)
    return Buffer.from(publicKey).toString('hex')
  }

  /**
   * Syncs account WOTS index with network state
   */
  static async syncWOTSIndex(wallet: MasterWallet, accountIndex: number): Promise<void> {
    const account = wallet.accounts[accountIndex]
    if (!account) throw new Error('Account not found')

    // Add debug log
    console.log('Syncing WOTS index for account:', account)

    // Get current network state for tag
    const tagResponse = await MochimoService.resolveTag(account.tag)
    if (!tagResponse.success) throw new Error('Failed to resolve tag')

    // If no address consensus, index is 0
    if (!tagResponse.addressConsensus) {
      account.wotsIndex = 0
      return
    }

    // Find matching WOTS index
    const networkAddress = tagResponse.addressConsensus
    let found = false

    // Check recent indices first (optimization)
    for (let i = Math.max(0, account.wotsIndex - 5); i <= account.wotsIndex + 5; i++) {
      const computed = this.computeWOTSAddress(wallet.masterSeed, account, i)
      if (computed === networkAddress) {
        account.wotsIndex = i
        found = true
        break
      }
    }

    // If not found in recent range, search broader
    if (!found) {
      for (let i = 0; i < 1000; i++) { // Reasonable upper limit
        const computed = this.computeWOTSAddress(wallet.masterSeed, account, i)
        if (computed === networkAddress) {
          account.wotsIndex = i
          found = true
          break
        }
      }
    }

    if (!found) {
      throw new Error('Could not sync WOTS index - address not found')
    }
  }

  /**
   * Creates a new master wallet
   */
  static createMasterWallet(passphrase: string = '', existingMnemonic?: string): MasterWallet {
    const mnemonic = existingMnemonic || Mnemonic.generate()
    const masterSeed = Mnemonic.toSeed(mnemonic, passphrase)

    const masterSeedArray = masterSeed instanceof Uint8Array
      ? masterSeed
      : new Uint8Array(Object.values(masterSeed))

    return {
      mnemonic,
      masterSeed: masterSeedArray,
      accounts: {},
    }
  }

  /**
   * Recovers a master wallet from mnemonic
   */
  static recoverWallet(mnemonic: string, passphrase: string = ''): MasterWallet {
    if (!Mnemonic.validate(mnemonic)) {
      throw new Error('Invalid mnemonic')
    }
    return this.createMasterWallet(passphrase, mnemonic)
  }

  /**
   * Creates a new account in the wallet
   */
  static createAccount(wallet: MasterWallet, accountIndex: number): WalletAccount {
    if (wallet.accounts[accountIndex]) {
      throw new Error(`Account ${accountIndex} already exists`)
    }

    // Generate account base seed
    const accountSeedData = new Uint8Array([
      ...wallet.masterSeed,
      ...new Uint8Array([accountIndex])
    ])
    const baseSeed = CryptoJS.SHA256(
      Buffer.from(accountSeedData).toString('hex')
    ).toString()

    // Generate tag
    const tag = this.generateTag(baseSeed)

    const account: WalletAccount = {
      index: accountIndex,
      tag,
      wotsIndex: 0,
      isActivated: false,
      name: 'Account ' + (accountIndex + 1)
    }

    wallet.accounts[accountIndex] = account
    return account
  }

  /**
   * Signs a message with a private key
   */
  static sign(message: string, privateKey: string): string {
    try {
      // Convert message to Uint8Array
      const messageBytes = Buffer.from(message)

      // Sign using WOTS core
      const signature = this.wots.generateSignatureFrom(
        privateKey,
        messageBytes
      )

      // Convert signature to hex string
      return Buffer.from(signature).toString('hex')
    } catch (error) {
      console.error('Signing error:', error)
      throw new Error('Failed to sign message')
    }
  }

  /**
   * Signs a transaction with the current WOTS key
   */
  static signTransaction(
    wallet: MasterWallet,
    accountIndex: number,
    transaction: string
  ): { signature: string; address: string } {
    const account = wallet.accounts[accountIndex]
    if (!account) {
      throw new Error(`Account ${accountIndex} not found`)
    }

    // Compute current WOTS address
    const currentWOTSSeed = CryptoJS.SHA256(
      this.deriveAccountSeed(wallet.masterSeed, account.index) +
      account.wotsIndex.toString(16).padStart(8, '0')
    ).toString()

    // Get current address
    const currentAddress = Buffer.from(
      this.wots.generatePKFrom(currentWOTSSeed, account.tag)
    ).toString('hex')

    // Sign the transaction
    const signature = this.wots.generateSignatureFrom(currentWOTSSeed, Buffer.from(transaction))

    // Note: wotsIndex will be incremented when transaction is confirmed
    // and new WOTS address is detected on network

    return {
      signature: Buffer.from(signature).toString('hex'),
      address: currentAddress
    }
  }

  /**
   * Generates a deterministic tag for an account
   */
  private static generateTag(baseSeed: string): string {
    let counter = 0

    while (true) {
      const tagSeed = Buffer.from(baseSeed + counter.toString(16).padStart(16, '0')).toString('hex')
      const hash = CryptoJS.SHA256(tagSeed).toString()
      const candidate = hash.slice(0, TAG_LENGTH).toUpperCase()

      if (!candidate.startsWith('00') && !candidate.startsWith('42')) {
        return candidate
      }

      counter++
    }
  }

  /**
   * Gets account info including tag and balance
   */
  static getAccountInfo(account: WalletAccount): {
    index: number
    tag: string
    isActivated: boolean | undefined
  } {
    return {
      index: account.index,
      tag: account.tag,
      isActivated: account.isActivated
    }
  }

  /**
   * Verifies a signature
   */
  static verify(message: string, signature: string, publicKey: string): boolean {
    try {
      // Convert hex strings to Uint8Arrays
      const signatureBytes = Buffer.from(signature, 'hex')
      const messageBytes = Buffer.from(message)
      const publicKeyBytes = Buffer.from(publicKey, 'hex')

      // Extract components from public key
      // Format: [WOTS public key (2144 bytes) | pub_seed (32 bytes) | addr_seed (20 bytes) | tag (12 bytes)]
      const wotsKey = publicKeyBytes.slice(0, 2144)
      const pubSeed = publicKeyBytes.slice(2144, 2144 + 32)
      const addrSeed = publicKeyBytes.slice(2144 + 32, 2144 + 32 + 20)

      // Use WOTS core to verify
      const reconstructedKey = this.wots.verifySignature(
        signatureBytes,
        messageBytes,
        pubSeed,
        addrSeed
      )

      // Compare only the WOTS public key part
      return Buffer.from(reconstructedKey).toString('hex') ===
        Buffer.from(wotsKey).toString('hex')
    } catch (error) {
      console.error('Verification error:', error)
      return false
    }
  }

  /**
   * Validates an address
   */
  static isValidAddress(address: string): boolean {
    try {
      // Check length
      if (!address || address.length !== 2144 + 32 + 20 + 12) {
        return false
      }

      // Check if it's valid hex
      if (!/^[0-9a-fA-F]+$/.test(address)) {
        return false
      }

      // Extract components
      const publicKeyBytes = Buffer.from(address, 'hex')
      const tag = publicKeyBytes.slice(-12)

      // Validate tag format
      const tagHex = Buffer.from(tag).toString('hex').toUpperCase()
      if (tagHex.startsWith('00') || tagHex.startsWith('42')) {
        return false
      }

      return true
    } catch (error) {
      console.error('Address validation error:', error)
      return false
    }
  }

  /**
   * Validates a tag format
   */
  static isValidTag(tag: string): boolean {
    if (!tag || tag.length !== 24) {
      return false
    }

    // Must be hex and uppercase
    const validHex = /^[0-9A-F]{24}$/
    if (!validHex.test(tag)) {
      return false
    }

    // Must not start with 00 or 42
    if (tag.startsWith('00') || tag.startsWith('42')) {
      return false
    }

    return true
  }

  /**
   * Checks account activation status
   */
  static async checkActivationStatus(account: WalletAccount): Promise<boolean> {
    try {
      const response = await MochimoService.resolveTag(account.tag)

      // Account is activated if addressConsensus is not empty
      const isActivated = Boolean(response.success &&
        response.addressConsensus &&
        response.addressConsensus.length > 0)

      if (isActivated) {
        console.log('Account activation details:', {
          address: response.addressConsensus,
          balance: response.balanceConsensus,
          nodes: response.quorum.map(q => q.node.host)
        })

        account.isActivated = true
      } else {
        console.log('Account not activated:', {
          tag: account.tag,
          success: response.success,
          unanimous: response.unanimous
        })
        account.isActivated = false
      }

      return isActivated
    } catch (error) {
      console.error('Error checking activation status:', error)
      account.isActivated = false
      return false
    }
  }

  /**
   * Activates an account using fountains
   */
  static async activateAccount(wallet: MasterWallet, accountIndex: number): Promise<boolean> {
    try {
      const account = wallet.accounts[accountIndex]
      if (!account) {
        throw new Error('Account not found')
      }

      // Compute current WOTS address using master wallet seed
      const currentWOTSSeed = CryptoJS.SHA256(
        this.deriveAccountSeed(wallet.masterSeed, account.index) +
        account.wotsIndex.toString(16).padStart(8, '0')
      ).toString()

      const currentAddress = Buffer.from(
        this.wots.generatePKFrom(currentWOTSSeed, account.tag)
      ).toString('hex')

      console.log('Attempting to activate account:', {
        tag: account.tag,
        address: currentAddress.slice(0, 64) + '...'
      })

      const response = await MochimoService.activateTag(currentAddress)

      if (response.success) {
        console.log('Account activation successful:', {
          tag: account.tag,
          txid: response.data?.txid,
          message: response.data?.message
        })
        return true
      } else {
        console.log('Account activation failed:', {
          tag: account.tag,
          error: response.error
        })
        return false
      }
    } catch (error) {
      console.error('Error activating account:', error)
      return false
    }
  }

  /**
   * Computes a transaction with the given parameters
   */
  static computeTransaction({
    sourceWOTS,
    sourceSecret,
    changeWOTS,
    destinationWOTS,
    sentAmount,
    remainingAmount,
    fee
  }: TransactionParams): Uint8Array {
    // Validate WOTS lengths
    if (sourceWOTS.length !== 2208 || changeWOTS.length !== 2208 || destinationWOTS.length !== 2208) {
      throw new Error('Invalid WOTS length')
    }

    // Helper to generate zeros
    const generateZeros = (count: number): number[] => new Array(count).fill(0)

    // Create message array
    let message: number[] = []

    // Network header (2 bytes of zeros)
    message.push(...generateZeros(2))

    // Protocol version
    message.push(57, 5)

    // Network stuff (4 bytes of zeros)
    message.push(...generateZeros(4))

    // Transaction type (3 as 2 bytes)
    message.push(0, 3)

    // Block fields (16 bytes of zeros)
    message.push(...generateZeros(16))

    // Block hashes and weight (32*3 bytes of zeros)
    message.push(...generateZeros(32 * 3))

    // Length fields (2 bytes of zeros)
    message.push(...generateZeros(2))

    // WOTS addresses
    message.push(...Array.from(sourceWOTS))
    message.push(...Array.from(destinationWOTS))
    message.push(...Array.from(changeWOTS))

    // Amounts
    message.push(...Array.from(this.bigintToBytes(sentAmount)))
    message.push(...Array.from(this.bigintToBytes(remainingAmount)))
    message.push(...Array.from(this.bigintToBytes(fee)))

    // Get message to sign (exact same slice as original)
    const messageToSign = message.slice(
      10 + 16 + 32 * 3 + 2,
      10 + 16 + 32 * 3 + 2 + 2208 * 3 + 3 * 8
    )

    // Hash message
    const hashMessage = this.wots.sha256(new Uint8Array(messageToSign))

    // Get public seed and address from source WOTS
    const pubSeed = sourceWOTS.slice(2144, 2144 + 32)
    const pubAddr = sourceWOTS.slice(2144 + 32, 2144 + 64)

    // Generate signature
    const signature = this.wots.generateSignatureFrom(sourceSecret, hashMessage)
    message.push(...Array.from(signature))

    // Add trailer
    message.push(...generateZeros(2))
    message.push(205, 171)

    return new Uint8Array(message)
  }

  // Helper to convert bigint to 8-byte array
  private static bigintToBytes(value: bigint): Uint8Array {
    if (value < 0n) {
      throw new Error('Value must be non-negative')
    }
    
    // Check if value fits in 8 bytes
    if (value > BigInt('0xFFFFFFFFFFFFFFFF')) {
      throw new Error('Value too large for 8 bytes')
    }

    const buffer = new Uint8Array(8)
    for (let i = 0; i < 8; i++) {
      buffer[7 - i] = Number((value >> BigInt(i * 8)) & 0xffn)
    }
    return buffer
  }

  /**
   * Creates and signs a transaction
   */
  static async createTransaction(
    wallet: MasterWallet,
    accountIndex: number,
    destinationTag: string,
    amount: bigint,
    fee: bigint = 0n
  ): Promise<Uint8Array> {
    // Validate inputs
    if (amount <= 0n) {
      throw new Error('Amount must be positive')
    }
    if (fee < 0n) {
      throw new Error('Fee cannot be negative')
    }
    if (!destinationTag || !this.isValidTag(destinationTag)) {
      throw new Error('Invalid destination tag')
    }

    const account = wallet.accounts[accountIndex]
    if (!account) throw new Error('Account not found')

    // Get current WOTS key pair
    const currentWOTSSeed = CryptoJS.SHA256(
      this.deriveAccountSeed(wallet.masterSeed, account.index) +
      account.wotsIndex.toString(16).padStart(8, '0')
    ).toString()

    // Generate next WOTS key pair for change
    const nextWOTSSeed = CryptoJS.SHA256(
      this.deriveAccountSeed(wallet.masterSeed, account.index) +
      (account.wotsIndex + 1).toString(16).padStart(8, '0')
    ).toString()

    // Get destination address from tag
    const tagResponse = await MochimoService.resolveTag(destinationTag)
    if (!tagResponse.success) {
      throw new Error(`Failed to resolve tag:  || 'Unknown error'}`)
    }
    if (!tagResponse.addressConsensus) {
      throw new Error('No consensus on destination address')
    }
    if (!tagResponse.balanceConsensus) {
      throw new Error('No consensus on source balance')
    }

    const currentBalance = BigInt(tagResponse.balanceConsensus)
    if (currentBalance < (amount + fee)) {
      throw new Error(`Insufficient balance: have ${currentBalance}, need ${amount + fee}`)
    }

    const remainingAmount = currentBalance - amount - fee

    // Compute transaction
    return this.computeTransaction({
      sourceWOTS: Buffer.from(this.wots.generatePKFrom(currentWOTSSeed, account.tag)),
      sourceSecret: currentWOTSSeed,
      changeWOTS: Buffer.from(this.wots.generatePKFrom(nextWOTSSeed, account.tag)),
      destinationWOTS: Buffer.from(tagResponse.addressConsensus, 'hex'),
      sentAmount: amount,
      remainingAmount,
      fee
    })
  }
} 
