import * as bip39 from 'bip39'
import CryptoJS from 'crypto-js'

export class Mnemonic {
  static readonly ENTROPY_BYTES = 32 // 256 bits for 24 words

  /**
   * Generates a new mnemonic phrase
   */
  static generate(): string {
    // Generate 256 bits of entropy for 24 words
    const entropy = crypto.getRandomValues(new Uint8Array(this.ENTROPY_BYTES))
    return bip39.entropyToMnemonic(Buffer.from(entropy).toString('hex'))
  }

  /**
   * Validates a mnemonic phrase
   */
  static validate(mnemonic: string): boolean {
    return bip39.validateMnemonic(mnemonic)
  }

  /**
   * Converts mnemonic to seed
   * Note: We're using a custom salt prefix for Mochimo instead of "mnemonic"
   */
  static toSeed(mnemonic: string, passphrase: string = ''): Uint8Array {
    const salt = 'mochimo' + passphrase
    const key = CryptoJS.PBKDF2(mnemonic, salt, {
      keySize: 256/32, // Changed to 256 bits (32 bytes)
      iterations: 2048,
      hasher: CryptoJS.algo.SHA512
    })
    const seedHex = key.toString()
    
    // Ensure we have exactly 32 bytes
    if (seedHex.length !== 64) {
      throw new Error('Generated seed is not 32 bytes')
    }
    
    return new Uint8Array(Buffer.from(seedHex, 'hex'))
  }

  /**
   * Converts entropy to mnemonic
   */
  static fromEntropy(entropy: Uint8Array): string {
    return bip39.entropyToMnemonic(Buffer.from(entropy).toString('hex'))
  }

  /**
   * Converts mnemonic to entropy
   */
  static toEntropy(mnemonic: string): Uint8Array {
    return new Uint8Array(Buffer.from(bip39.mnemonicToEntropy(mnemonic), 'hex'))
  }
} 