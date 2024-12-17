import CryptoJS from 'crypto-js'
import { Buffer } from 'buffer'
import { Mnemonic } from './mnemonic'
import { WOTS } from './wots_core'
import { MochimoService } from '../services/mochimo'

const TAG_LENGTH = 24 // 12 bytes = 24 hex chars

export interface WOTSKeyPair {
  privateKey: string
  publicKey: string
}

export interface WalletAccount {
  index: number
  baseSeed: string
  currentWOTS: WOTSKeyPair
  nextWOTS: WOTSKeyPair
  usedAddresses: string[]
  tag: string
  isActivated?: boolean
}

export interface MasterWallet {
  mnemonic: string
  masterSeed: Uint8Array
  accounts: { [index: number]: WalletAccount }
  password?: string
}

export class WalletCore {
  private static wots = new WOTS()

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
      password: passphrase
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

    // Generate initial WOTS pairs using base seed and count
    const currentKeyPair = this.generateWOTSPair(
      CryptoJS.SHA256(baseSeed + '00000000').toString(),
      tag
    )
    const nextKeyPair = this.generateWOTSPair(
      CryptoJS.SHA256(baseSeed + '00000001').toString(),
      tag
    )

    const account: WalletAccount = {
      index: accountIndex,
      baseSeed,
      currentWOTS: currentKeyPair,
      nextWOTS: nextKeyPair,
      usedAddresses: [],
      tag
    }

    wallet.accounts[accountIndex] = account
    return account
  }

  /**
   * Generates a WOTS key pair
   */
  private static generateWOTSPair(seed: string, tag?: string): WOTSKeyPair {
    console.log('Generating key pair:', { seed, tag })
    const result = this.wots.generateKeyPairFrom(seed, tag)
    const keyPair = {
      privateKey: seed,
      publicKey: Buffer.from(result).toString('hex')
    }
    console.log('Generated key pair:', {
      privateKey: keyPair.privateKey,
      publicKey: keyPair.publicKey.slice(0, 64) + '...'
    })
    return keyPair
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

    // Get the current address before signing
    const currentAddress = account.currentWOTS.publicKey

    // Sign the message using the sign method
    const signature = this.sign(transaction, account.currentWOTS.privateKey)
    
    // After signing, rotate the keys
    this.rotateAccountKeys(wallet, accountIndex)

    return {
      signature,
      address: currentAddress
    }
  }

  /**
   * Rotates account's WOTS keys after use
   */
  static rotateAccountKeys(wallet: MasterWallet, accountIndex: number): WalletAccount {
    const account = wallet.accounts[accountIndex]
    if (!account) {
      throw new Error(`Account ${accountIndex} not found`)
    }

    console.log('Before rotation:', {
      currentPrivateKey: account.currentWOTS.privateKey,
      currentPublicKey: account.currentWOTS.publicKey,
      nextPrivateKey: account.nextWOTS.privateKey,
      nextPublicKey: account.nextWOTS.publicKey,
      tag: account.tag
    })

    // Store the used address
    account.usedAddresses.push(account.currentWOTS.publicKey)

    // Generate next seed using account base seed and current count
    const nextCount = account.usedAddresses.length + 1 // +1 because we just added one
    const nextSeed = CryptoJS.SHA256(
      account.baseSeed + nextCount.toString(16).padStart(8, '0')
    ).toString()

    // Generate new next key pair
    const newNextWOTS = this.generateWOTSPair(nextSeed, account.tag)

    console.log('After generating new next:', {
      nextCount,
      nextSeed,
      newNextPrivateKey: newNextWOTS.privateKey,
      newNextPublicKey: newNextWOTS.publicKey
    })

    // Rotate keys
    const updatedAccount: WalletAccount = {
      ...account,
      currentWOTS: account.nextWOTS,
      nextWOTS: newNextWOTS
    }

    console.log('After rotation:', {
      currentPrivateKey: updatedAccount.currentWOTS.privateKey,
      currentPublicKey: updatedAccount.currentWOTS.publicKey,
      nextPrivateKey: updatedAccount.nextWOTS.privateKey,
      nextPublicKey: updatedAccount.nextWOTS.publicKey
    })

    wallet.accounts[accountIndex] = updatedAccount
    return updatedAccount
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
   * Gets account info including tag
   */
  static getAccountInfo(account: WalletAccount): {
    index: number
    tag: string
    currentAddress: string
    nextAddress: string
    usedAddresses: string[]
    isActivated: boolean | undefined
  } {
    return {
      index: account.index,
      tag: account.tag,
      currentAddress: account.currentWOTS.publicKey,
      nextAddress: account.nextWOTS.publicKey,
      usedAddresses: account.usedAddresses,
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
   * Gets all addresses for an account (current, next, and used)
   */
  static getAccountAddresses(account: WalletAccount): {
    current: string
    next: string
    used: string[]
  } {
    return {
      current: account.currentWOTS.publicKey,
      next: account.nextWOTS.publicKey,
      used: account.usedAddresses
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
      const isActivated = response.success && 
                         response.addressConsensus && 
                         response.addressConsensus.length > 0

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
} 
