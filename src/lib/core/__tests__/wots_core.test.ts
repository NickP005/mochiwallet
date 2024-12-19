import { WOTS } from '../wots_core'

describe('WOTS Core Implementation', () => {
  let wots: WOTS

  beforeEach(() => {
    wots = new WOTS()
  })

  describe('Initialization', () => {
    it('should initialize with correct parameters', () => {
      expect(() => new WOTS()).not.toThrow()
    })

    it('should validate parameters on init', () => {
      const instance = new WOTS()
      expect(() => instance.init()).not.toThrow()
    })
  })

  describe('Key Generation', () => {
    it('should generate key pair from seed', () => {
      const seed = 'test_seed_123'
      const result = wots.generatePKFrom(seed)

      expect(result).toBeInstanceOf(Uint8Array)
      expect(result.length).toBe(2144 + 32 + 20 + 12) // public key + pub_seed + addr_seed + tag
    })

    it('should generate different keys for different seeds', () => {
      const key1 = wots.generatePKFrom('seed1')
      const key2 = wots.generatePKFrom('seed2')

      expect(Buffer.from(key1).toString('hex'))
        .not.toBe(Buffer.from(key2).toString('hex'))
    })

    it('should generate consistent keys for same seed', () => {
      const key1 = wots.generatePKFrom('same_seed')
      const key2 = wots.generatePKFrom('same_seed')

      expect(Buffer.from(key1).toString('hex'))
        .toBe(Buffer.from(key2).toString('hex'))
    })

    it('should handle custom tags', () => {
      const seed = 'test_seed'
      const tag = '123456789012345678901234' // 24 chars
      const result = wots.generatePKFrom(seed, tag)

      // Extract tag from result (last 12 bytes)
      const resultTag = Buffer.from(result.slice(-12)).toString('hex')
      expect(resultTag).toBe(tag.toLowerCase())
    })
  })

  describe('Signature Generation and Verification', () => {
    it('should generate and verify signature', () => {
      const seed = 'test_signature_seed'
      const message = new TextEncoder().encode('test message')

      // Generate key pair
      const keyPair = wots.generatePKFrom(seed)

      // Generate signature
      const signature = wots.generateSignatureFrom(seed, message)

      // Extract public key components
      const pubKey = keyPair.slice(0, 2144)
      const pubSeed = keyPair.slice(2144, 2144 + 32)
      const addrSeed = keyPair.slice(2144 + 32, 2144 + 32 + 20)

      // Verify signature (using private method)
      const reconstructedKey = (wots as any).wots_publickey_from_sig(
        signature,
        (wots as any).sha256(message),
        pubSeed,
        addrSeed
      )

      expect(Buffer.from(reconstructedKey).toString('hex'))
        .toBe(Buffer.from(pubKey).toString('hex'))
    })

    it('should fail verification with wrong message', () => {
      const seed = 'test_signature_seed'
      const message = new TextEncoder().encode('original message')
      const wrongMessage = new TextEncoder().encode('wrong message')

      // Generate key pair
      const keyPair = wots.generatePKFrom(seed)

      // Generate signature
      const signature = wots.generateSignatureFrom(seed, message)

      // Extract public key components
      const pubKey = keyPair.slice(0, 2144)
      const pubSeed = keyPair.slice(2144, 2144 + 32)
      const addrSeed = keyPair.slice(2144 + 32, 2144 + 32 + 20)

      // Verify with wrong message
      const reconstructedKey = (wots as any).wots_publickey_from_sig(
        signature,
        (wots as any).sha256(wrongMessage),
        pubSeed,
        addrSeed
      )

      expect(Buffer.from(reconstructedKey).toString('hex'))
        .not.toBe(Buffer.from(pubKey).toString('hex'))
    })
  })

  describe('Chain Generation', () => {
    it('should generate correct chain lengths', () => {
      const message = new Uint8Array([1, 2, 3, 4])
      const lengths = (wots as any).chain_lengths(message)

      expect(lengths).toBeInstanceOf(Uint8Array)
      expect(lengths.length).toBe((wots as any).WOTSLEN)
    })

    it('should generate different chains for different messages', () => {
      const msg1 = new Uint8Array([1, 2, 3, 4])
      const msg2 = new Uint8Array([5, 6, 7, 8])

      const lengths1 = (wots as any).chain_lengths(msg1)
      const lengths2 = (wots as any).chain_lengths(msg2)

      expect(Buffer.from(lengths1).toString('hex'))
        .not.toBe(Buffer.from(lengths2).toString('hex'))
    })
  })

  describe('Utility Functions', () => {
    describe('base_w conversion', () => {
      it('should convert bytes to base w representation', () => {
        const input = new Uint8Array([255, 255]) // max values
        const outlen = 4
        const result = (wots as any).base_w(outlen, input)

        expect(result).toBeInstanceOf(Uint8Array)
        expect(result.length).toBe(outlen)
        expect(Math.max(...result)).toBeLessThan((wots as any).WOTSW)
      })
    })

    describe('checksum calculation', () => {
      it('should calculate valid checksum', () => {
        const msg = new Uint8Array(Array(67).fill(1)) // test message
        const checksum = (wots as any).wots_checksum(msg)

        expect(checksum).toBeInstanceOf(Uint8Array)
        expect(checksum.length).toBe((wots as any).WOTSLEN2)
      })
    })

    describe('byte manipulation', () => {
      it('should correctly convert between integers and bytes', () => {
        const testValue = 12345
        const bytes = (wots as any).int_to_bytes(testValue)
        expect(bytes).toBeInstanceOf(Uint8Array)
        expect(bytes.length).toBe(8)
      })

      it('should concatenate Uint8Arrays correctly', () => {
        const arr1 = new Uint8Array([1, 2, 3])
        const arr2 = new Uint8Array([4, 5, 6])
        const result = (wots as any).concatUint8Arrays(arr1, arr2)

        expect(result).toBeInstanceOf(Uint8Array)
        expect(result.length).toBe(arr1.length + arr2.length)
        expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6])
      })
    })
  })

  describe('Edge Cases', () => {
    describe('Key Generation Edge Cases', () => {
      it('should handle empty seed', () => {
        const seed = ''
        expect(() => wots.generatePKFrom(seed)).not.toThrow()
      })

      it('should handle very long seeds', () => {
        const seed = 'x'.repeat(10000)
        expect(() => wots.generatePKFrom(seed)).not.toThrow()
      })

      it('should handle special characters in seed', () => {
        const seed = '!@#$%^&*()_+{}[]|":;<>?'
        expect(() => wots.generatePKFrom(seed)).not.toThrow()
      })

      it('should handle unicode characters in seed', () => {
        const seed = '🔑🗝️👨‍💻'
        expect(() => wots.generatePKFrom(seed)).not.toThrow()
      })
    })

    describe('Tag Edge Cases', () => {
      it('should reject tag with special characters', () => {
        const tag = '123456789!@#456789!@#123'
        expect(() => wots.generatePKFrom('seed', tag)).toThrow('Invalid tag format')
      })

      it('should reject tag with non-hex characters', () => {
        const tag = '123456789GHI456789JKL123'
        expect(() => wots.generatePKFrom('seed', tag)).toThrow('Invalid tag format')
      })

      it('should accept valid hex tag', () => {
        const tag = '123456789ABC456789DEF123'
        const result = wots.generatePKFrom('seed', tag)
        const resultTag = Buffer.from(result.slice(-12)).toString('hex')
        expect(resultTag).toBe(tag.toLowerCase())
      })

      it('should handle tag with exactly 23 characters (invalid length)', () => {
        const tag = '12345678901234567890123' // 23 chars
        expect(() => wots.generatePKFrom('seed', tag)).toThrow('Invalid tag format')
      })

      it('should handle tag with exactly 25 characters (invalid length)', () => {
        const tag = '1234567890123456789012345' // 25 chars
        expect(() => wots.generatePKFrom('seed', tag)).toThrow('Invalid tag format')
      })
    })

    describe('Signature Edge Cases', () => {
      it('should handle empty message', () => {
        const seed = 'test_seed'
        const message = new Uint8Array(0)
        expect(() => wots.generateSignatureFrom(seed, message)).not.toThrow()
      })

      it('should handle large messages', () => {
        const seed = 'test_seed'
        const message = new Uint8Array(1000000) // 1MB of zeros
        expect(() => wots.generateSignatureFrom(seed, message)).not.toThrow()
      })

      it('should handle messages with all max values', () => {
        const seed = 'test_seed'
        const message = new Uint8Array(32).fill(255)
        expect(() => wots.generateSignatureFrom(seed, message)).not.toThrow()
      })

      it('should handle messages with all zeros', () => {
        const seed = 'test_seed'
        const message = new Uint8Array(32).fill(0)
        expect(() => wots.generateSignatureFrom(seed, message)).not.toThrow()
      })
    })
  })



  describe('Performance Tests', () => {
    it('should generate key pair within reasonable time', () => {
      const start = performance.now()
      wots.generatePKFrom('test_seed')
      const end = performance.now()
      expect(end - start).toBeLessThan(1000) // Should take less than 1 second
    })

    it('should generate signature within reasonable time', () => {
      const start = performance.now()
      const message = new Uint8Array(32).fill(1)
      wots.generateSignatureFrom('test_seed', message)
      const end = performance.now()
      expect(end - start).toBeLessThan(1000) // Should take less than 1 second
    })
  })

  describe('Memory Usage', () => {
    it('should handle multiple key generations without memory issues', () => {
      const iterations = 100
      for (let i = 0; i < iterations; i++) {
        wots.generatePKFrom(`seed_${i}`)
      }
      // If we reach here without out-of-memory error, test passes
    })

    it('should handle multiple signature generations without memory issues', () => {
      const iterations = 100
      const message = new Uint8Array(32).fill(1)
      for (let i = 0; i < iterations; i++) {
        wots.generateSignatureFrom(`seed_${i}`, message)
      }
      // If we reach here without out-of-memory error, test passes
    })
  })
}) 