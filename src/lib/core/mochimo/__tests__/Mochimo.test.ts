import { Mochimo } from '../Mochimo'
import { Buffer } from 'buffer'

describe('Mochimo', () => {
  describe('Constants', () => {
    it('should have correct protocol constants', () => {
      expect(Mochimo.VERSION).toBe(4)
      expect(Mochimo.NETWORK).toBe(1337)
      expect(Mochimo.TRAILER).toBe(43981)
    })

    it('should have correct transaction constants', () => {
      expect(Mochimo.TXADDRLEN).toBe(2208)
      expect(Mochimo.TXAMOUNT).toBe(8)
      expect(Mochimo.TXSIGLEN).toBe(2144)
      expect(Mochimo.HASHLEN).toBe(32)
      expect(Mochimo.TRANLEN).toBe(8792)
      expect(Mochimo.SIG_HASH_COUNT).toBe(6648)
    })

    it('should have correct block constants', () => {
      expect(Mochimo.BLOCK_HEADER_LENGTH).toBe(2220)
      expect(Mochimo.BLOCK_TRAILER_LENGTH).toBe(160)
      expect(Mochimo.MAX_TRANSACTION_PER_BLOCK).toBe(32768)
    })

    it('should have correct address constants', () => {
      expect(Mochimo.PK_LENGTH).toBe(2144)
      expect(Mochimo.PUB_SEED_LENGTH).toBe(32)
      expect(Mochimo.RND2_LENGTH).toBe(32)
      expect(Mochimo.TAG_LENGTH).toBe(12)
      expect(Mochimo.TAG_OFFSET).toBe(2196)
      expect(Mochimo.SECRET_LENGTH).toBe(32)
    })
  })

  describe('hash_offset', () => {
    it('should generate consistent hashes', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5])
      const hash1 = Mochimo.hash_offset(data, 0, data.length)
      const hash2 = Mochimo.hash_offset(data, 0, data.length)

      expect(Buffer.from(hash1).toString('hex'))
        .toBe(Buffer.from(hash2).toString('hex'))
    })

    it('should handle offset correctly', () => {
      const data = new Uint8Array([1, 2, 3, 4, 5])
      const fullHash = Mochimo.hash_offset(data, 0, data.length)
      const partialHash = Mochimo.hash_offset(data, 2, 3)

      expect(Buffer.from(fullHash).toString('hex'))
        .not.toBe(Buffer.from(partialHash).toString('hex'))
    })

    it('should generate different hashes for different data', () => {
      const data1 = new Uint8Array([1, 2, 3])
      const data2 = new Uint8Array([4, 5, 6])

      const hash1 = Mochimo.hash_offset(data1, 0, data1.length)
      const hash2 = Mochimo.hash_offset(data2, 0, data2.length)

      expect(Buffer.from(hash1).toString('hex'))
        .not.toBe(Buffer.from(hash2).toString('hex'))
    })

    it('should handle empty data', () => {
      const data = new Uint8Array(0)
      const hash = Mochimo.hash_offset(data, 0, 0)

      expect(hash).toBeInstanceOf(Uint8Array)
      expect(hash.length).toBe(32)
    })
  })

  describe('areEquals', () => {
    it('should compare addresses correctly with tag', () => {
      const addr1 = new Uint8Array(Mochimo.TXADDRLEN).fill(1)
      const addr2 = new Uint8Array(Mochimo.TXADDRLEN).fill(1)
      const addr3 = new Uint8Array(Mochimo.TXADDRLEN).fill(2)

      expect(Mochimo.areEquals(addr1, addr2, false)).toBe(true)
      expect(Mochimo.areEquals(addr1, addr3, false)).toBe(false)
    })

    it('should compare addresses correctly ignoring tag', () => {
      const addr1 = new Uint8Array(Mochimo.TXADDRLEN).fill(1)
      const addr2 = new Uint8Array(Mochimo.TXADDRLEN).fill(1)
      
      // Modify tags (after TAG_OFFSET)
      addr2[Mochimo.TAG_OFFSET] = 99
      addr2[Mochimo.TAG_OFFSET + 1] = 99

      expect(Mochimo.areEquals(addr1, addr2, true)).toBe(true)
      expect(Mochimo.areEquals(addr1, addr2, false)).toBe(false)
    })

    it('should handle addresses of different lengths', () => {
      const addr1 = new Uint8Array(Mochimo.TXADDRLEN).fill(1)
      const addr2 = new Uint8Array(Mochimo.TXADDRLEN - 1).fill(1)

      expect(Mochimo.areEquals(addr1, addr2, false)).toBe(false)
      expect(Mochimo.areEquals(addr1, addr2, true)).toBe(true)//since we are ignoring the tag, they might be equal 
    })
  })

  describe('timestamp', () => {
    it('should return current unix timestamp', () => {
      const now = Math.floor(Date.now() / 1000)
      const timestamp = Mochimo.timestamp()

      // Should be within 1 second
      expect(Math.abs(timestamp - now)).toBeLessThanOrEqual(1)
    })

    it('should return integer value', () => {
      const timestamp = Mochimo.timestamp()
      expect(Number.isInteger(timestamp)).toBe(true)
    })
  })
}) 