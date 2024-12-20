import { WOTSHash } from '../WOTSHash'
import { Buffer } from 'buffer'

describe('WOTSHash', () => {
  describe('Address Operations', () => {
    it('should set and get chain address correctly', () => {
      const addr = new DataView(new ArrayBuffer(32))
      WOTSHash.setChainAddr(addr, 123)
      expect(addr.getInt32(20, true)).toBe(123)
    })

    it('should set and get hash address correctly', () => {
      const addr = new DataView(new ArrayBuffer(32))
      WOTSHash.setHashAddr(addr, 456)
      expect(addr.getInt32(24, true)).toBe(456)
    })
  })

  describe('PRF Operations', () => {
    it('should generate consistent PRF outputs', () => {
      const out1 = new Uint8Array(32)
      const out2 = new Uint8Array(32)
      const input = new Uint8Array([1, 2, 3])
      const key = new Uint8Array([4, 5, 6])

      WOTSHash.prf(out1, 0, input, key)
      WOTSHash.prf(out2, 0, input, key)

      expect(Buffer.from(out1).toString('hex'))
        .toBe(Buffer.from(out2).toString('hex'))
    })

    it('should generate different outputs for different inputs', () => {
      const out1 = new Uint8Array(32)
      const out2 = new Uint8Array(32)
      const input1 = new Uint8Array([1, 2, 3])
      const input2 = new Uint8Array([4, 5, 6])
      const key = new Uint8Array([7, 8, 9])

      WOTSHash.prf(out1, 0, input1, key)
      WOTSHash.prf(out2, 0, input2, key)

      expect(Buffer.from(out1).toString('hex'))
        .not.toBe(Buffer.from(out2).toString('hex'))
    })
  })

  describe('Hash Function F', () => {
    it('should generate consistent hash outputs', () => {
      const out1 = new Uint8Array(32)
      const out2 = new Uint8Array(32)
      const input = new Uint8Array(32).fill(1)
      const pubSeed = new Uint8Array(32).fill(2)
      const addr = new DataView(new ArrayBuffer(32))

      WOTSHash.thashF(out1, 0, input, 0, pubSeed, addr)
      WOTSHash.thashF(out2, 0, input, 0, pubSeed, addr)

      expect(Buffer.from(out1).toString('hex'))
        .toBe(Buffer.from(out2).toString('hex'))
    })

    it('should generate different outputs for different inputs', () => {
      const out1 = new Uint8Array(32)
      const out2 = new Uint8Array(32)
      const input1 = new Uint8Array(32).fill(1)
      const input2 = new Uint8Array(32).fill(2)
      const pubSeed = new Uint8Array(32).fill(3)
      const addr = new DataView(new ArrayBuffer(32))

      WOTSHash.thashF(out1, 0, input1, 0, pubSeed, addr)
      WOTSHash.thashF(out2, 0, input2, 0, pubSeed, addr)

      expect(Buffer.from(out1).toString('hex'))
        .not.toBe(Buffer.from(out2).toString('hex'))
    })
  })
}) 