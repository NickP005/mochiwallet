import { WOTS } from '../wots_core'
import { Buffer } from 'buffer'

describe('WOTS Signing Operations', () => {
  let wots: WOTS

  beforeEach(() => {
    wots = new WOTS()
  })

  describe('sha256', () => {
    it('should hash string input consistently', () => {
      const input = 'test'
      const hash1 = wots.sha256(input)
      const hash2 = wots.sha256(input)
      
      expect(Buffer.from(hash1).toString('hex'))
        .toBe(Buffer.from(hash2).toString('hex'))
    })

    it('should hash Uint8Array input consistently', () => {
      const input = new Uint8Array([1, 2, 3, 4])
      const hash1 = wots.sha256(input)
      const hash2 = wots.sha256(input)
      
      expect(Buffer.from(hash1).toString('hex'))
        .toBe(Buffer.from(hash2).toString('hex'))
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = wots.sha256('test1')
      const hash2 = wots.sha256('test2')
      
      expect(Buffer.from(hash1).toString('hex'))
        .not.toBe(Buffer.from(hash2).toString('hex'))
    })
  })

  describe('generatePKFrom', () => {
    it('should generate consistent public keys', () => {
      const seed = 'test_seed'
      const tag = 'ABCDEF1234567890ABCDEF12'
      
      const pk1 = wots.generatePKFrom(seed, tag)
      const pk2 = wots.generatePKFrom(seed, tag)
      
      expect(Buffer.from(pk1).toString('hex'))
        .toBe(Buffer.from(pk2).toString('hex'))
    })

    it('should include tag in output', () => {
      const seed = 'test_seed'
      const tag = 'ABCDEF1234567890ABCDEF12'
      
      const pk = wots.generatePKFrom(seed, tag)
      const embeddedTag = Buffer.from(pk.slice(-12)).toString('hex')
      
      expect(embeddedTag.toUpperCase()).toBe(tag)
    })

    it('should validate tag format', () => {
      const seed = 'test_seed'
      
      expect(() => {
        wots.generatePKFrom(seed, 'invalid_tag')
      }).toThrow('Invalid tag format')
    })
  })

  describe('generateSignatureFrom', () => {
    it('should generate valid signatures', () => {
      const seed = 'test_seed'
      const message = new Uint8Array([1, 2, 3, 4])
      
      const sig = wots.generateSignatureFrom(seed, message)
      expect(sig.length).toBe(2144) // WOTSSIGBYTES
    })

    it('should generate consistent signatures', () => {
      const seed = 'test_seed'
      const message = new Uint8Array([1, 2, 3, 4])
      
      const sig1 = wots.generateSignatureFrom(seed, message)
      const sig2 = wots.generateSignatureFrom(seed, message)
      
      expect(Buffer.from(sig1).toString('hex'))
        .toBe(Buffer.from(sig2).toString('hex'))
    })

    it('should generate different signatures for different messages', () => {
      const seed = 'test_seed'
      const msg1 = new Uint8Array([1, 2, 3, 4])
      const msg2 = new Uint8Array([5, 6, 7, 8])
      
      const sig1 = wots.generateSignatureFrom(seed, msg1)
      const sig2 = wots.generateSignatureFrom(seed, msg2)
      
      expect(Buffer.from(sig1).toString('hex'))
        .not.toBe(Buffer.from(sig2).toString('hex'))
    })
  })
}) 