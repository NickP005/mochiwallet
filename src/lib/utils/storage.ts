import browser from 'webextension-polyfill'

interface EncryptedData {
  data: string        // Base64 encoded encrypted data
  salt: string        // Base64 encoded salt
  iv: string         // Base64 encoded initialization vector
  version: number
  timestamp: number
  attempts: number
}


export class SecureStorage {
  private static readonly VERSION = 1
  private static readonly MAX_ATTEMPTS = 3
  private static readonly LOCKOUT_TIME = 5 * 60 * 1000 // 5 minutes
  private static readonly ITERATIONS = 100000

  /**
   * Converts string to ArrayBuffer
   */
  private static str2ab(str: string): ArrayBuffer {
    return new TextEncoder().encode(str)
  }

  /**
   * Converts ArrayBuffer to string
   */
  private static ab2str(buf: ArrayBuffer): string {
    return new TextDecoder().decode(new Uint8Array(buf))
  }

  /**
   * Converts ArrayBuffer to Base64
   */
  private static ab2base64(buf: ArrayBuffer): string {
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
  }

  /**
   * Converts Base64 to ArrayBuffer
   */
  private static base642ab(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  /**
   * Derives encryption key from password
   */
  private static async deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
    const encoder = new TextEncoder()
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    )
  }

  /**
   * Serializes data for storage, handling Uint8Array
   */
  private static serializeData(data: any): any {
    if (data instanceof Uint8Array) {
      return {
        type: 'Uint8Array',
        data: Array.from(data)
      }
    }

    if (Array.isArray(data)) {
      return data.map(item => this.serializeData(item))
    }

    if (typeof data === 'object' && data !== null) {
      const serialized: Record<string, any> = {}
      for (const [key, value] of Object.entries(data)) {
        serialized[key] = this.serializeData(value)
      }
      return serialized
    }

    return data
  }

  /**
   * Deserializes data from storage, handling Uint8Array
   */
  private static deserializeData(data: any): any {
    if (data && typeof data === 'object' && data.type === 'Uint8Array') {
      return new Uint8Array(data.data)
    }

    if (Array.isArray(data)) {
      return data.map(item => this.deserializeData(item))
    }

    if (typeof data === 'object' && data !== null) {
      const deserialized: Record<string, any> = {}
      for (const [key, value] of Object.entries(data)) {
        deserialized[key] = this.deserializeData(value)
      }
      return deserialized
    }

    return data
  }

  /**
   * Encrypts data with password
   */
  static async encrypt(data: any, password: string): Promise<EncryptedData> {
    try {
      console.log('Encrypting data:', { ...data, _type: 'sanitized' })

      // Generate salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const iv = crypto.getRandomValues(new Uint8Array(12))

      // Derive key
      const key = await this.deriveKey(password, salt)

      // Serialize and encrypt data
      const serializedData = this.serializeData(this.sanitizeData(data))
      const encodedData = this.str2ab(JSON.stringify(serializedData))
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        encodedData
      )

      console.log('Encryption successful')

      return {
        data: this.ab2base64(encryptedData),
        salt: this.ab2base64(salt),
        iv: this.ab2base64(iv),
        version: this.VERSION,
        timestamp: Date.now(),
        attempts: 0
      }
    } catch (error) {
      console.error('Encryption failed:', error)
      throw error
    }
  }

  /**
   * Decrypts data with password
   */
  static async decrypt(encrypted: EncryptedData, password: string): Promise<any> {
    try {
      // Check version
      if (encrypted.version !== this.VERSION) {
        throw new Error('Incompatible wallet version')
      }

      // Check attempts
      if (encrypted.attempts >= this.MAX_ATTEMPTS) {
        const lockoutEnd = encrypted.timestamp + this.LOCKOUT_TIME
        if (Date.now() < lockoutEnd) {
          throw new Error('Wallet is locked. Try again later.')
        }
        encrypted.attempts = 0
      }

      // Convert Base64 to ArrayBuffer
      const salt = this.base642ab(encrypted.salt)
      const iv = this.base642ab(encrypted.iv)
      const data = this.base642ab(encrypted.data)

      // Derive key
      const key = await this.deriveKey(password, salt)

      try {
        // Decrypt
        const decryptedData = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv
          },
          key,
          data
        )

        // Parse and deserialize result
        const parsedData = JSON.parse(this.ab2str(decryptedData))
        const result = this.deserializeData(parsedData)

        // Reset attempts
        encrypted.attempts = 0
        await this.updateEncryptedWallet(encrypted)

        return result
      } catch (error) {
        // Increment attempts
        encrypted.attempts++
        encrypted.timestamp = Date.now()
        await this.updateEncryptedWallet(encrypted)
        throw new Error('Invalid password')
      }
    } catch (error) {
      console.error('Decryption failed:', error)
      throw error
    }
  }

  /**
   * Removes sensitive data before storage
   */
  private static sanitizeData(data: any): any {
    const cleaned = { ...data }
    delete cleaned.privateKeys
    delete cleaned.tempKeys
    return cleaned
  }

  /**
   * Updates stored encrypted wallet
   */
  private static async updateEncryptedWallet(encrypted: EncryptedData): Promise<void> {
    await browser.storage.local.set({ encryptedWallet: encrypted })
  }

  /**
   * Saves encrypted wallet data
   */
  static async saveWallet(wallet: any, password: string): Promise<void> {
    try {
      // Store password with wallet for future decryption
      const walletWithPassword = {
        ...wallet,
        password // Include password in the encrypted data
      }

      console.log('Saving wallet with data:', {
        hasMnemonic: !!walletWithPassword.mnemonic,
        hasMasterSeed: !!walletWithPassword.masterSeed,
        accountCount: Object.keys(walletWithPassword.accounts || {}).length
      })

      const encrypted = await this.encrypt(walletWithPassword, password)
      await browser.storage.local.set({ encryptedWallet: encrypted })

      console.log('Wallet saved successfully')
    } catch (error) {
      console.error('Error saving wallet:', error)
      throw error
    }
  }

  /**
   * Loads encrypted wallet data
   */
  static async loadWallet(password: string): Promise<any> {
    try {
      console.log('Loading wallet...')
      const { encryptedWallet } = await browser.storage.local.get('encryptedWallet') as { encryptedWallet: EncryptedData }

      if (!encryptedWallet) {
        console.log('No wallet found in storage')
        throw new Error('No wallet found')
      }

      console.log('Decrypting wallet data...')
      const decrypted = await this.decrypt(encryptedWallet, password)

      console.log('Wallet loaded:', {
        hasMnemonic: !!decrypted.mnemonic,
        hasMasterSeed: !!decrypted.masterSeed,
        accountCount: Object.keys(decrypted.accounts || {}).length,
        storedPassword: !!decrypted.password
      })

      // Verify the stored password matches
      if (decrypted.password !== password) {
        console.error('Password mismatch')
        throw new Error('Invalid password')
      }

      // Remove password before returning
      const { password: _, ...walletData } = decrypted
      return walletData

    } catch (error) {
      console.error('Error loading wallet:', error)
      throw error
    }
  }

  /**
   * Checks if a wallet exists
   */
  static async hasWallet(): Promise<boolean> {
    const { encryptedWallet } = await browser.storage.local.get('encryptedWallet')
    return !!encryptedWallet
  }

  /**
   * Removes the wallet
   */
  static async removeWallet(): Promise<void> {
    await browser.storage.local.remove('encryptedWallet')
  }
} 