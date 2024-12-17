import CryptoJS from 'crypto-js'

export interface WOTSKeyPair {
    privateKey: string
    publicKey: string
}

export interface WalletAccount {
    index: number
    baseSeed: string
    currentWOTS: WOTSKeyPair
    nextWOTS: WOTSKeyPair
    usedAddresses: string[]  // Track used addresses
    tag: string  // Add tag field
    isActivated?: boolean  // Add activation status
}

export interface MasterWallet {
    mnemonic: string
    masterSeed: Uint8Array
    accounts: { [index: number]: WalletAccount }
    password?: string  // Add password to the interface
}



export class WOTS {
  private readonly PARAMSN = 32
  private readonly WOTSW = 16
  private readonly WOTSLOGW = 4
  private readonly WOTSLEN1: number
  private readonly WOTSLEN2 = 3
  private readonly WOTSLEN: number
  private readonly WOTSSIGBYTES: number
  private readonly TXSIGLEN = 2144
  private readonly TXADDRLEN = 2208
  private readonly XMSS_HASH_PADDING_F = 0
  private readonly XMSS_HASH_PADDING_PRF = 3

  constructor() {
    this.WOTSLEN1 = (8 * this.PARAMSN / this.WOTSLOGW)
    this.WOTSLEN = this.WOTSLEN1 + this.WOTSLEN2
    this.WOTSSIGBYTES = this.WOTSLEN * this.PARAMSN
    this.validate_params()
  }

  public generateKeyPairFrom(wots_seed: string, tag?: string): Uint8Array {
    // if (!wots_seed) {
    //   throw new Error('Seed is required')
    // }

    // Add tag validation
    if (tag !== undefined) {
      if (tag.length !== 24) {
        // Use default tag for invalid length
        tag = undefined
      } else {
        // Check if tag contains only valid hex characters (0-9, A-F)
        const validHex = /^[0-9A-F]{24}$/i
        if (!validHex.test(tag)) {
          throw new Error('Invalid tag format')
        }
      }
    }

    const private_seed = this.sha256(wots_seed + "seed")
    const public_seed = this.sha256(wots_seed + "publ")
    const addr_seed = this.sha256(wots_seed + "addr")
    
    let wots_public = this.public_key_gen(private_seed, public_seed, addr_seed)
    
    // Create a single array with all components
    const totalLength = wots_public.length + public_seed.length + 20 + 12
    const result = new Uint8Array(totalLength)
    
    let offset = 0
    result.set(wots_public, offset)
    offset += wots_public.length
    
    result.set(public_seed, offset)
    offset += public_seed.length
    
    result.set(addr_seed.slice(0, 20), offset)
    offset += 20
    
    // Add tag
    const tagBytes = !tag || tag.length !== 24 
      ? new Uint8Array([66, 0, 0, 0, 14, 0, 0, 0, 1, 0, 0, 0])
      : this.hexToBytes(tag)
    result.set(tagBytes, offset)
    
    return result
  }

  public generateSignatureFrom(wots_seed: string, payload: Uint8Array): Uint8Array {
    const private_seed = this.sha256(wots_seed + "seed")
    const public_seed = this.sha256(wots_seed + "publ")
    const addr_seed = this.sha256(wots_seed + "addr")
    const to_sign = this.sha256(payload)
    
    return this.wots_sign(to_sign, private_seed, public_seed, addr_seed)
  }

  private sha256(input: string | Uint8Array): Uint8Array {
    if (typeof input === 'string') {
      const hash = CryptoJS.SHA256(input)
      return new Uint8Array(this.hexToBytes(hash.toString()))
    } else {
      const hash = CryptoJS.SHA256(this.bytesToHex(input))
      return new Uint8Array(this.hexToBytes(hash.toString()))
    }
  }

  private hexToBytes(hex: string): number[] {
    const bytes: number[] = []
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16))
    }
    return bytes
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Generates WOTS public key from private key
   */
  private public_key_gen(seed: Uint8Array, pub_seed: Uint8Array, addr_bytes: Uint8Array): Uint8Array {
    const private_key = this.expand_seed(seed)
    const public_key = new Uint8Array(this.WOTSSIGBYTES)
    let addr = this.bytes_to_addr(addr_bytes)

    for (let i = 0; i < this.WOTSLEN; i++) {
      this.set_chain_addr(i, addr)
      const private_key_portion = private_key.slice(i * this.PARAMSN, (i + 1) * this.PARAMSN)
      const chain = this.gen_chain(
        private_key_portion,
        0,
        this.WOTSW - 1,
        pub_seed,
        addr
      )
      public_key.set(chain, i * this.PARAMSN)
    }

    return public_key
  }

  /**
   * Signs a message using WOTS
   */
  private wots_sign(msg: Uint8Array, seed: Uint8Array, pub_seed: Uint8Array, addr_bytes: Uint8Array): Uint8Array {
    const private_key = this.expand_seed(seed)
    const signature = new Uint8Array(this.WOTSSIGBYTES)
    const lengths = this.chain_lengths(msg)
    let addr = this.bytes_to_addr(addr_bytes)

    for (let i = 0; i < this.WOTSLEN; i++) {
      this.set_chain_addr(i, addr)
      const private_key_portion = private_key.slice(i * this.PARAMSN, (i + 1) * this.PARAMSN)
      const chain = this.gen_chain(
        private_key_portion,
        0,
        lengths[i],
        pub_seed,
        addr
      )
      signature.set(chain, i * this.PARAMSN)
    }

    return signature
  }

  /**
   * Verifies a WOTS signature
   */
  private wots_publickey_from_sig(
    sig: Uint8Array,
    msg: Uint8Array,
    pub_seed: Uint8Array,
    addr_bytes: Uint8Array
  ): Uint8Array {
    let addr = this.bytes_to_addr(addr_bytes)
    const lengths = this.chain_lengths(msg)
    const public_key = new Uint8Array(this.WOTSSIGBYTES)

    for (let i = 0; i < this.WOTSLEN; i++) {
      this.set_chain_addr(i, addr)
      const sig_portion = sig.slice(i * this.PARAMSN, (i + 1) * this.PARAMSN)
      const chain = this.gen_chain(
        sig_portion,
        lengths[i],
        this.WOTSW - 1 - lengths[i],
        pub_seed,
        addr
      )
      public_key.set(chain, i * this.PARAMSN)
    }

    return public_key
  }

  /**
   * Expands seed into private key
   */
  private expand_seed(seed: Uint8Array): Uint8Array {
    const private_key = new Uint8Array(this.WOTSSIGBYTES)

    for (let i = 0; i < this.WOTSLEN; i++) {
      const ctr = this.ull_to_bytes(this.PARAMSN, [i])
      const portion = this.prf(ctr, seed)
      private_key.set(portion, i * this.PARAMSN)
    }

    return private_key
  }

  /**
   * Generates hash chain
   */
  private gen_chain(
    input: Uint8Array,
    start: number,
    steps: number,
    pub_seed: Uint8Array,
    addr: Record<string, Uint8Array>
  ): Uint8Array {
    let out = new Uint8Array(input)
    
    for (let i = start; i < start + steps && i < this.WOTSW; i++) {
      this.set_hash_addr(i, addr)
      out = this.t_hash(out, pub_seed, addr)
    }

    return out
  }

  /**
   * Computes PRF using SHA-256
   */
  private prf(input: Uint8Array, key: Uint8Array): Uint8Array {
    const buf = new Uint8Array(32 * 3)
    
    // Add padding
    buf.set(this.ull_to_bytes(this.PARAMSN, [this.XMSS_HASH_PADDING_PRF]))
    
    // Add key and input
    const byte_copied_key = this.byte_copy(key, this.PARAMSN)
    buf.set(byte_copied_key, this.PARAMSN)
    
    const byte_copied_input = this.byte_copy(input, 32)
    buf.set(byte_copied_input, this.PARAMSN * 2)
    
    return this.sha256(buf)
  }

  /**
   * Computes t_hash for WOTS chain
   */
  private t_hash(input: Uint8Array, pub_seed: Uint8Array, addr: Record<string, Uint8Array>): Uint8Array {
    const buf = new Uint8Array(32 * 3)
    let addr_bytes: Uint8Array
    
    // Add padding
    buf.set(this.ull_to_bytes(this.PARAMSN, [this.XMSS_HASH_PADDING_F]))
    
    // Get key mask
    this.set_key_and_mask(0, addr)
    addr_bytes = this.addr_to_bytes(addr)
    buf.set(this.prf(addr_bytes, pub_seed), this.PARAMSN)
    
    // Get bitmask
    this.set_key_and_mask(1, addr)
    addr_bytes = this.addr_to_bytes(addr)
    const bitmask = this.prf(addr_bytes, pub_seed)
    
    // XOR input with bitmask
    const XOR_bitmask_input = new Uint8Array(input.length)
    for (let i = 0; i < this.PARAMSN; i++) {
      XOR_bitmask_input[i] = input[i] ^ bitmask[i]
    }
    buf.set(XOR_bitmask_input, this.PARAMSN * 2)
    
    return this.sha256(buf)
  }

  /**
   * Converts number array to bytes with specified length
   */
  private ull_to_bytes(outlen: number, input: number[]): Uint8Array {
    const out = new Uint8Array(outlen)
    for (let i = outlen - 1; i >= 0; i--) {
      out[i] = input[i] || 0
    }
    return out
  }

  /**
   * Copies bytes with specified length
   */
  private byte_copy(source: Uint8Array, num_bytes: number): Uint8Array {
    const output = new Uint8Array(num_bytes)
    for (let i = 0; i < num_bytes; i++) {
      output[i] = source[i] || 0
    }
    return output
  }

  /**
   * Converts address to bytes
   */
  private addr_to_bytes(addr: Record<string, Uint8Array>): Uint8Array {
    const out_bytes = new Uint8Array(32)
    for (let i = 0; i < 8; i++) {
      const chunk = addr[i.toString()] || new Uint8Array(4)
      out_bytes.set(chunk, i * 4)
    }
    return out_bytes
  }

  /**
   * Converts bytes to address
   */
  private bytes_to_addr(addr_bytes: Uint8Array): Record<string, Uint8Array> {
    const out_addr: Record<string, Uint8Array> = {}
    for (let i = 0; i < 8; i++) {
      out_addr[i.toString()] = this.ull_to_bytes(4, Array.from(addr_bytes.slice(i * 4, (i + 1) * 4)))
    }
    return out_addr
  }

  /**
   * Sets chain address
   */
  private set_chain_addr(chain_address: number, addr: Record<string, Uint8Array>): void {
    addr['5'] = new Uint8Array([0, 0, 0, chain_address])
  }

  /**
   * Sets hash address
   */
  private set_hash_addr(hash: number, addr: Record<string, Uint8Array>): void {
    addr['6'] = new Uint8Array([0, 0, 0, hash])
  }

  /**
   * Sets key and mask
   */
  private set_key_and_mask(key_and_mask: number, addr: Record<string, Uint8Array>): void {
    addr['7'] = new Uint8Array([0, 0, 0, key_and_mask])
  }

  /**
   * Calculates chain lengths from message
   */
  private chain_lengths(msg: Uint8Array): Uint8Array {
    const msg_base_w = this.base_w(this.WOTSLEN1, msg)
    const csum_base_w = this.wots_checksum(msg_base_w)
    
    // Combine message and checksum base-w values
    const lengths = new Uint8Array(this.WOTSLEN)
    lengths.set(msg_base_w)
    lengths.set(csum_base_w, this.WOTSLEN1)
    
    return lengths
  }

  /**
   * Converts bytes to base-w representation
   */
  private base_w(outlen: number, input: Uint8Array): Uint8Array {
    const output = new Uint8Array(outlen)
    let in_ = 0
    let total = 0
    let bits = 0

    for (let i = 0; i < outlen; i++) {
      if (bits === 0) {
        total = input[in_]
        in_++
        bits += 8
      }
      bits -= this.WOTSLOGW
      output[i] = (total >> bits) & (this.WOTSW - 1)
    }

    return output
  }

  /**
   * Computes WOTS checksum
   */
  private wots_checksum(msg_base_w: Uint8Array): Uint8Array {
    let csum = 0
    
    // Calculate checksum
    for (let i = 0; i < this.WOTSLEN1; i++) {
      csum += this.WOTSW - 1 - msg_base_w[i]
    }

    // Convert checksum to base_w
    csum = csum << (8 - ((this.WOTSLEN2 * this.WOTSLOGW) % 8))
    
    const csum_bytes = this.int_to_bytes(csum)
    const csum_base_w = this.base_w(
      this.WOTSLEN2, 
      this.byte_copy(csum_bytes, Math.floor((this.WOTSLEN2 * this.WOTSLOGW + 7) / 8))
    )
    
    return csum_base_w
  }

  /**
   * Converts integer to bytes
   */
  private int_to_bytes(value: number): Uint8Array {
    const bytes = new Uint8Array(8)
    for (let i = 7; i >= 0; i--) {
      bytes[i] = value & 0xff
      value = value >> 8
    }
    return bytes
  }


  /**
   * Validates input parameters
   */
  private validate_params(): void {
    if (this.PARAMSN !== 32) {
      throw new Error('PARAMSN must be 32')
    }
    if (this.WOTSW !== 16) {
      throw new Error('WOTSW must be 16')
    }
    if (this.WOTSLOGW !== 4) {
      throw new Error('WOTSLOGW must be 4')
    }
  }

  /**
   * Initializes WOTS instance
   */
  public init(): void {
    this.validate_params()
  }

  // Add array extension functionality
  private concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0
    
    for (const arr of arrays) {
      result.set(arr, offset)
      offset += arr.length
    }
    
    return result
  }

  /**
   * Verifies a signature
   */
  public verifySignature(
    signature: Uint8Array,
    message: Uint8Array,
    pubSeed: Uint8Array,
    addrSeed: Uint8Array
  ): Uint8Array {
    const messageHash = this.sha256(message)
    return this.wots_publickey_from_sig(
      signature,
      messageHash,
      pubSeed,
      addrSeed
    )
  }
}