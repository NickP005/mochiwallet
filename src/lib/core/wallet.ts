import CryptoJS from 'crypto-js'
import { Buffer } from 'buffer'
import { hexToByteArray } from '../utils/wallet'
import { WOTS } from '../utils/wots'
import { Mnemonic } from './mnemonic'

const TAG_LENGTH = 24 // 12 bytes = 24 hex chars

export interface WalletAccount {
  index: number
  baseSeed: string
  currentWOTS: WOTSKeyPair
  nextWOTS: WOTSKeyPair
  usedAddresses: string[]  // Track used addresses
  tag: string  // Add tag field
}

export interface WOTSKeyPair {
  privateKey: string
  publicKey: string
}

export interface MasterWallet {
  mnemonic: string
  masterSeed: Uint8Array
  accounts: { [index: number]: WalletAccount }
  password?: string  // Add password to the interface
}

export class WalletCore {
  /**
   * Creates a new master wallet
   */
  static createMasterWallet(passphrase: string = '', existingMnemonic?: string): MasterWallet {
    const mnemonic = existingMnemonic || Mnemonic.generate()
    const masterSeed = Mnemonic.toSeed(mnemonic, passphrase)

    // Ensure masterSeed is Uint8Array
    const masterSeedArray = masterSeed instanceof Uint8Array 
      ? masterSeed 
      : new Uint8Array(Object.values(masterSeed))

    return {
      mnemonic,
      masterSeed: masterSeedArray,
      accounts: {},
      password: passphrase  // Store password in wallet
    }
  }

  /**
   * Recovers a master wallet from mnemonic
   */
  static recoverWallet(mnemonic: string, passphrase: string = ''): MasterWallet {
    if (!Mnemonic.validate(mnemonic)) {
      throw new Error('Invalid mnemonic')
    }

    const masterSeed = Mnemonic.toSeed(mnemonic, passphrase)
    
    // Ensure masterSeed is Uint8Array
    const masterSeedArray = masterSeed instanceof Uint8Array 
      ? masterSeed 
      : new Uint8Array(Object.values(masterSeed))

    return {
      mnemonic,
      masterSeed: masterSeedArray,
      accounts: {},
      password: passphrase  // Store password in wallet
    }
  }

  /**
   * Generates a deterministictag for an account
   * Format: 12 bytes (24 hex chars) that doesn't start with 0x00 or 0x42
   */
  private static generateTag(baseSeed: string): string {
    //generate until we get a valid tag that doesn't start with 00 or 42
    let counter = 0
    
    while (true) {
      // Use baseSeed and counter to generate deterministic tag
      const tagSeed = Buffer.from(baseSeed + counter.toString(16).padStart(16, '0')).toString('hex')
      const hash = CryptoJS.SHA256(tagSeed).toString()
      const candidate = hash.slice(0, TAG_LENGTH).toUpperCase()
      
      // Check if tag starts with invalid prefixes (00 or 42)
      if (!candidate.startsWith('00') && !candidate.startsWith('42')) {
        return candidate
      }
      
      counter++
    }
  }

  /**
   * Creates a new account in the wallet
   */
  static createAccount(wallet: MasterWallet, accountIndex: number): WalletAccount {
    if (wallet.accounts[accountIndex]) {
      throw new Error(`Account ${accountIndex} already exists`)
    }

    // Ensure masterSeed is Uint8Array
    const masterSeedArray = wallet.masterSeed instanceof Uint8Array 
      ? wallet.masterSeed 
      : new Uint8Array(Object.values(wallet.masterSeed));

    // Generate account base seed: SHA256(masterSeed || accountIndex)
    const accountSeedData = new Uint8Array([
      ...masterSeedArray,
      ...new Uint8Array([accountIndex])
    ])
    const baseSeed = CryptoJS.SHA256(
      Buffer.from(accountSeedData).toString('hex')
    ).toString()

    // Generate initial WOTS pairs
    const currentWOTS = this.generateWOTSPair(baseSeed)
    const nextWOTS = this.generateWOTSPair(currentWOTS.privateKey)

    // Generate tag for the account
    const tag = this.generateTag(baseSeed)

    const account: WalletAccount = {
      index: accountIndex,
      baseSeed,
      currentWOTS,
      nextWOTS,
      usedAddresses: [],
      tag
    }

    wallet.accounts[accountIndex] = account
    return account
  }

  /**
   * Rotates account's WOTS keys after use
   */
  static rotateAccountKeys(wallet: MasterWallet, accountIndex: number): WalletAccount {
    const account = wallet.accounts[accountIndex]
    if (!account) {
      throw new Error(`Account ${accountIndex} not found`)
    }

    // Store the used address
    account.usedAddresses.push(account.currentWOTS.publicKey)

    // Rotate keys
    const updatedAccount: WalletAccount = {
      ...account,
      currentWOTS: account.nextWOTS,
      nextWOTS: this.generateWOTSPair(account.nextWOTS.privateKey)
    }

    wallet.accounts[accountIndex] = updatedAccount
    return updatedAccount
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

    const signature = this.sign(transaction, account.currentWOTS.privateKey)
    
    // After signing, rotate the keys
    this.rotateAccountKeys(wallet, accountIndex)

    return {
      signature,
      address: account.currentWOTS.publicKey
    }
  }

  /**
   * Generates a WOTS key pair from seed
   */
  private static generateWOTSPair(seed: string): WOTSKeyPair {
    const seedBytes = hexToByteArray(seed)
    const privateKey = WOTS.generatePrivateKey(new Uint8Array(seedBytes))
    const publicKey = WOTS.generatePublicKey(privateKey)

    return {
      privateKey: Buffer.from(privateKey).toString('hex'),
      publicKey: Buffer.from(publicKey).toString('hex'),
    }
  }



  /**
   * Validates an address
   */
  static isValidAddress(address: string): boolean {
    if (address.length !== 72) return false // 32 bytes address + 4 bytes checksum = 72 hex chars
    
    const addressHash = address.slice(0, 64)
    const checksum = address.slice(64)
    
    const calculatedChecksum = CryptoJS.SHA256(addressHash).toString().slice(0, 8)
    
    return checksum === calculatedChecksum
  }

  /**
   * Signs a message
   */
  static sign(message: string, privateKey: string): string {
    const privateKeyBytes = hexToByteArray(privateKey)
    const signature = WOTS.sign(message, new Uint8Array(privateKeyBytes))
    return Buffer.from(signature).toString('hex')
  }

  /**
   * Verifies a signature
   */
  static verify(message: string, signature: string, publicKey: string): boolean {
    const signatureBytes = hexToByteArray(signature)
    const publicKeyBytes = hexToByteArray(publicKey)
    return WOTS.verify(
      message, 
      new Uint8Array(signatureBytes), 
      new Uint8Array(publicKeyBytes)
    )
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
  } {
    return {
      index: account.index,
      tag: account.tag,
      currentAddress: account.currentWOTS.publicKey,
      nextAddress: account.nextWOTS.publicKey,
      usedAddresses: account.usedAddresses
    }
  }
} 