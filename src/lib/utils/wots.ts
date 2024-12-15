import CryptoJS from 'crypto-js'
import { Buffer } from 'buffer'
import { hexToByteArray } from './wallet'

export class WOTS {
  static readonly WOTS_LEN = 64 // WOTS signature length
  static readonly HASH_SIZE = 32 // Size of hash in bytes

  /**
   * Generates a WOTS private key from seed
   */
  static generatePrivateKey(seed: Uint8Array): Uint8Array {
    const privateKey = new Uint8Array(this.WOTS_LEN * this.HASH_SIZE)
    
    for (let i = 0; i < this.WOTS_LEN; i++) {
      const element = new Uint8Array(this.HASH_SIZE)
      const elementSeed = new Uint8Array([...seed, ...new Uint8Array([i >> 24, i >> 16, i >> 8, i])])
      const hash = CryptoJS.SHA256(Buffer.from(elementSeed).toString('hex'))
      const hashBytes = Buffer.from(hash.toString(), 'hex')
      element.set(hashBytes)
      privateKey.set(element, i * this.HASH_SIZE)
    }

    return privateKey
  }

  /**
   * Generates WOTS public key from private key
   */
  static generatePublicKey(privateKey: Uint8Array): Uint8Array {
    const publicKey = new Uint8Array(this.WOTS_LEN * this.HASH_SIZE)
    
    for (let i = 0; i < this.WOTS_LEN; i++) {
      const element = privateKey.slice(i * this.HASH_SIZE, (i + 1) * this.HASH_SIZE)
      let chain = element
      
      // Apply hash chain
      for (let j = 0; j < 16; j++) {
        const hash = CryptoJS.SHA256(Buffer.from(chain).toString('hex'))
        chain = new Uint8Array(Buffer.from(hash.toString(), 'hex'))
      }
      
      publicKey.set(chain, i * this.HASH_SIZE)
    }

    return publicKey
  }

  /**
   * Signs a message using WOTS
   */
  static sign(message: string, privateKey: Uint8Array): Uint8Array {
    const messageHash = CryptoJS.SHA256(message).toString()
    const signature = new Uint8Array(this.WOTS_LEN * this.HASH_SIZE)
    
    // Convert message hash to byte array
    const messageBytes = hexToByteArray(messageHash)
    
    // Generate signature
    for (let i = 0; i < this.WOTS_LEN; i++) {
      const element = privateKey.slice(i * this.HASH_SIZE, (i + 1) * this.HASH_SIZE)
      let chain = element
      
      // Apply hash chain based on message byte
      const iterations = messageBytes[i % messageBytes.length]
      for (let j = 0; j < iterations; j++) {
        const hash = CryptoJS.SHA256(Buffer.from(chain).toString('hex'))
        chain = new Uint8Array(Buffer.from(hash.toString(), 'hex'))
      }
      
      signature.set(chain, i * this.HASH_SIZE)
    }

    return signature
  }

  /**
   * Verifies a WOTS signature
   */
  static verify(message: string, signature: Uint8Array, publicKey: Uint8Array): boolean {
    const messageHash = CryptoJS.SHA256(message).toString()
    const messageBytes = hexToByteArray(messageHash)
    
    // Complete the chains and compare with public key
    for (let i = 0; i < this.WOTS_LEN; i++) {
      const element = signature.slice(i * this.HASH_SIZE, (i + 1) * this.HASH_SIZE)
      let chain = element
      
      // Complete hash chain
      const remaining = 16 - messageBytes[i % messageBytes.length]
      for (let j = 0; j < remaining; j++) {
        const hash = CryptoJS.SHA256(Buffer.from(chain).toString('hex'))
        chain = new Uint8Array(Buffer.from(hash.toString(), 'hex'))
      }
      
      // Compare with public key
      const pubElement = publicKey.slice(i * this.HASH_SIZE, (i + 1) * this.HASH_SIZE)
      if (!chain.every((byte, index) => byte === pubElement[index])) {
        return false
      }
    }

    return true
  }
}
