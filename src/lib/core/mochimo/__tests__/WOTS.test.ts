import { WOTS } from '../WOTS'
import { Buffer } from 'buffer'

describe('WOTS (Winternitz One-Time Signature)', () => {
  let wots: WOTS

  beforeEach(() => {
    wots = new WOTS()
  })

  describe('Constants', () => {
    it('should have correct constant values', () => {
      expect(WOTS.WOTSW).toBe(16)
      expect(WOTS.WOTSLOGW).toBe(4)
      expect(WOTS.PARAMSN).toBe(32)
      expect(WOTS.WOTSLEN1).toBe(64)
      expect(WOTS.WOTSLEN2).toBe(3)
      expect(WOTS.WOTSLEN).toBe(67)
      expect(WOTS.WOTSSIGBYTES).toBe(2144)
      expect(WOTS.TXSIGLEN).toBe(2144)
    })
  })

  describe('sign', () => {
    it('should generate valid signature', () => {
      const sig = new Uint8Array(WOTS.TXSIGLEN)
      const msg = new Uint8Array([1, 2, 3, 4, 5])
      const seed = new Uint8Array(32).fill(1)
      const pubSeed = new Uint8Array(32).fill(2)
      const addr = new Uint8Array(32).fill(3)

      WOTS.sign(sig, msg, seed, pubSeed, 0, addr)

      // Verify signature is not empty
      expect(sig.some(byte => byte !== 0)).toBe(true)
      expect(sig.length).toBe(WOTS.TXSIGLEN)
    })

    it('should generate different signatures for different messages', () => {
      const sig1 = new Uint8Array(WOTS.TXSIGLEN)
      const sig2 = new Uint8Array(WOTS.TXSIGLEN)
      const msg1 = new Uint8Array([1, 2, 3])
      const msg2 = new Uint8Array([4, 5, 6])
      const seed = new Uint8Array(32).fill(1)
      const pubSeed = new Uint8Array(32).fill(2)
      const addr = new Uint8Array(32).fill(3)

      WOTS.sign(sig1, msg1, seed, pubSeed, 0, addr)
      WOTS.sign(sig2, msg2, seed, pubSeed, 0, addr)

      expect(Buffer.from(sig1).toString('hex')).not.toBe(Buffer.from(sig2).toString('hex'))
    })
  })

  describe('pkFromSignature', () => {
    it('should recover public key from signature', () => {
      const msg = new Uint8Array([1, 2, 3, 4, 5])
      const seed = new Uint8Array(32).fill(1)
      const pubSeed = new Uint8Array(32).fill(2)
      const addr = new Uint8Array(32).fill(3)
      
      // Generate signature
      const sig = new Uint8Array(WOTS.TXSIGLEN)
      WOTS.sign(sig, msg, seed, pubSeed, 0, addr)

      // Recover public key
      const pk = WOTS.pkFromSignature(sig, msg, pubSeed, addr)

      expect(pk).toBeInstanceOf(Uint8Array)
      expect(pk.length).toBe(WOTS.WOTSSIGBYTES)
    })

    it('should generate consistent public keys', () => {
      const msg = new Uint8Array([1, 2, 3])
      const seed = new Uint8Array(32).fill(1)
      const pubSeed = new Uint8Array(32).fill(2)
      const addr = new Uint8Array(32).fill(3)
      
      const sig = new Uint8Array(WOTS.TXSIGLEN)
      WOTS.sign(sig, msg, seed, pubSeed, 0, addr)

      const pk1 = WOTS.pkFromSignature(sig, msg, pubSeed, addr)
      const pk2 = WOTS.pkFromSignature(sig, msg, pubSeed, addr)

      expect(Buffer.from(pk1).toString('hex')).toBe(Buffer.from(pk2).toString('hex'))
    })
  })

  describe('Chain Operations', () => {
    it('should generate correct chains', () => {
      const msg = new Uint8Array([1, 2, 3])
      const seed = new Uint8Array(32).fill(1)
      const pubSeed = new Uint8Array(32).fill(2)
      const addr = new Uint8Array(32).fill(3)
      
      // Generate two signatures with same inputs
      const sig1 = new Uint8Array(WOTS.TXSIGLEN)
      const sig2 = new Uint8Array(WOTS.TXSIGLEN)
      
      WOTS.sign(sig1, msg, seed, pubSeed, 0, addr)
      WOTS.sign(sig2, msg, seed, pubSeed, 0, addr)

      // Signatures should be identical when using same chain
      expect(Buffer.from(sig1).toString('hex'))
        .toBe(Buffer.from(sig2).toString('hex'))

      // Generate signature with different offset
      const sig3 = new Uint8Array(WOTS.TXSIGLEN)
      WOTS.sign(sig3, msg, seed, pubSeed, 1, addr)

      // Should be different when using different offset
      expect(Buffer.from(sig1).toString('hex'))
        .not.toBe(Buffer.from(sig3).toString('hex'))
    })

    it('should verify chain consistency', () => {
      const msg = new Uint8Array([1, 2, 3])
      const seed = new Uint8Array(32).fill(1)
      const pubSeed = new Uint8Array(32).fill(2)
      const addr = new Uint8Array(32).fill(3)
      
      // Generate signature
      const sig = new Uint8Array(WOTS.TXSIGLEN)
      WOTS.sign(sig, msg, seed, pubSeed, 0, addr)

      // Get public key from signature
      const pk = WOTS.pkFromSignature(sig, msg, pubSeed, addr)

      // Verify same message with same signature produces same public key
      const pk2 = WOTS.pkFromSignature(sig, msg, pubSeed, addr)
      expect(Buffer.from(pk).toString('hex'))
        .toBe(Buffer.from(pk2).toString('hex'))

      // Different message should produce different public key
      const diffMsg = new Uint8Array([4, 5, 6])
      const pk3 = WOTS.pkFromSignature(sig, diffMsg, pubSeed, addr)
      expect(Buffer.from(pk).toString('hex'))
        .not.toBe(Buffer.from(pk3).toString('hex'))
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid input lengths', () => {
      const invalidSig = new Uint8Array(WOTS.TXSIGLEN - 1) // Wrong length
      const msg = new Uint8Array([1, 2, 3])
      const pubSeed = new Uint8Array(32)
      const addr = new Uint8Array(32)

      expect(() => {
        WOTS.pkFromSignature(invalidSig, msg, pubSeed, addr)
      }).toThrow("Signature length is not correct")
    })
  })
}) 