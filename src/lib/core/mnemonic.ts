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
      keySize: 512/32, // 512 bits
      iterations: 2048,
      hasher: CryptoJS.algo.SHA512
    })
    return new Uint8Array(Buffer.from(key.toString(), 'hex'))
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