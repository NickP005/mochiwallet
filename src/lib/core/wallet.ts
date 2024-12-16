import CryptoJS from 'crypto-js'
import { Buffer } from 'buffer'
import { hexToByteArray } from '../utils/wallet'
import * as WOTS from './wots'
import { Mnemonic } from './mnemonic'

const TAG_LENGTH = 24 // 12 bytes = 24 hex chars

export interface WalletAccount {
  index: number
  baseSeed: string
  currentWOTS: WOTSKeyPair
  nextWOTS: WOTSKeyPair
  usedAddresses: string[]  // Track used addresses
  tag: string  // Add tag field
  isActivated?: boolean  // Add activation status
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
   * Generates a deterministic tag for an account
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
    
    // Generate tag for the account
    const tag = this.generateTag(baseSeed)

    // Generate initial WOTS pairs
    const currentWOTS = this.generateWOTSPair(baseSeed, Buffer.from(tag).toString("hex"))
    const nextWOTS = this.generateWOTSPair(currentWOTS.privateKey)


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

    console.log('Rotating keys:')
    console.log('Current private key:', account.currentWOTS.privateKey)
    console.log('Next private key:', account.nextWOTS.privateKey)

    // Store the used address
    account.usedAddresses.push(account.currentWOTS.publicKey)

    // Generate new next key pair using current next private key as seed
    const newNextWOTS = this.generateWOTSPair(account.nextWOTS.privateKey)
    
    console.log('New next private key:', newNextWOTS.privateKey)

    // Rotate keys
    const updatedAccount: WalletAccount = {
      ...account,
      currentWOTS: account.nextWOTS,
      nextWOTS: newNextWOTS
    }

    console.log('After rotation:')
    console.log('New current private key:', updatedAccount.currentWOTS.privateKey)
    console.log('New next private key:', updatedAccount.nextWOTS.privateKey)

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

    // Get the current address before signing
    const currentAddress = account.currentWOTS.publicKey

    // Sign the transaction
    const signature = this.sign(transaction, account.currentWOTS.privateKey)
    
    // After signing, rotate the keys
    this.rotateAccountKeys(wallet, accountIndex)

    return {
      signature,
      address: currentAddress
    }
  }

  /**
   * Generates WOTS keys and seeds
   * @author NickP55
   */
  public static generateWots(seed: string, tag?: string): [number[], string, string, string] {
    const privateSeed = CryptoJS.SHA256(seed + "seed").toString()
    const publicSeed = CryptoJS.SHA256(seed + "publ").toString()
    const addressSeed = CryptoJS.SHA256(seed + "addr").toString()
    
    const publicKey = WOTS.wots_public_key_gen(
      hexToByteArray(privateSeed),
      hexToByteArray(publicSeed),
      hexToByteArray(addressSeed)
    )
    
    const wots = [...publicKey]
    wots.pushArray(hexToByteArray(publicSeed))
    wots.pushArray(hexToByteArray(addressSeed).slice(0, 20))
    
    if (!tag || tag.length !== 24) {
      // Default tag
      wots.pushArray([66, 0, 0, 0, 14, 0, 0, 0, 1, 0, 0, 0])
    } else {
      wots.pushArray(hexToByteArray(tag))
    }
    
    return [wots, privateSeed, publicSeed, addressSeed]
  }

  /**
   * Generates a WOTS key pair from seed
   */
  private static generateWOTSPair(seed: string, tag?: string): WOTSKeyPair {
    const [wots, privateSeed, publicSeed, addressSeed] = WalletCore.generateWots(seed)
    
    // Concatenate all parts with a delimiter
    const publicKeyParts = [
      Buffer.from(wots).toString('hex'),
      publicSeed,
      addressSeed
    ]
    
    return {
      privateKey: privateSeed,
      publicKey: publicKeyParts.join('|')  // Use | as delimiter
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
    // Generate seeds deterministically
    const publicSeed = CryptoJS.SHA256(privateKey + "publ").toString()
    const addressSeed = CryptoJS.SHA256(privateKey + "addr").toString()
    
    const messageBytes = Buffer.from(message).toJSON().data
    const signature = WOTS.wots_sign(
      messageBytes,
      hexToByteArray(privateKey),
      hexToByteArray(publicSeed),
      hexToByteArray(addressSeed)
    )

    // Concatenate signature and seeds with delimiter
    const signatureParts = [
      Buffer.from(signature).toString('hex'),
      publicSeed,
      addressSeed
    ]

    return signatureParts.join('|')  // Use | as delimiter
  }

  /**
   * Verifies a signature
   */
  static verify(message: string, signatureStr: string, publicKeyStr: string): boolean {
    try {
      // Split signature and public key parts
      const [signatureHex, sigPublicSeed, sigAddressSeed] = signatureStr.split('|')
      const [wotsHex, pubPublicSeed, pubAddressSeed] = publicKeyStr.split('|')

      const signatureBytes = hexToByteArray(signatureHex)
      const messageBytes = Buffer.from(message).toJSON().data
      const wotsBytes = hexToByteArray(wotsHex)

      // Verify using the signature's seeds
      const reconstructedKey = WOTS.wots_publickey_from_sig(
        signatureBytes,
        messageBytes,
        hexToByteArray(sigPublicSeed),
        hexToByteArray(sigAddressSeed)
      )

      // Compare only the WOTS part
      const reconstructedHex = Buffer.from(reconstructedKey).toString('hex')
      const originalHex = Buffer.from(wotsBytes).toString('hex')

      console.log('Verification details:', {
        reconstructedHex: reconstructedHex.slice(0, 64) + '...',
        originalHex: originalHex.slice(0, 64) + '...',
        match: reconstructedHex === originalHex
      })

      return reconstructedHex === originalHex
    } catch (error) {
      console.error('Verification error:', error)
      return false
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
