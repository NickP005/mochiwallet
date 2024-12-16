import { 
  sha256,
  wots_public_key_gen,
  wots_sign,
  wots_publickey_from_sig,
  ull_to_bytes,
  byte_copy,
  from_int_to_byte_array
} from '../wots'

describe('WOTS Implementation', () => {
  describe('sha256', () => {
    it('should generate correct hash for string input', () => {
      const input = 'test'
      const hash = sha256(input)
      expect(hash).toHaveLength(32) // SHA-256 produces 32 bytes
      // Known SHA-256 hash for 'test'
      const expectedHex = '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
      const expected = expectedHex.match(/.{2}/g)?.map(byte => parseInt(byte, 16))
      expect(hash).toEqual(expected)
    })

    it('should generate correct hash for number array input', () => {
      const input = [116, 101, 115, 116] // ASCII values for 'test'
      const hash = sha256(input)
      expect(hash).toHaveLength(32)
    })
  })

  describe('WOTS Key Generation and Signing', () => {
    const seed = new Array(32).fill(0) // Test seed
    const pub_seed = new Array(32).fill(1) // Test public seed
    const addr = new Array(32).fill(2) // Test address
    const message = new Array(32).fill(3) // Test message

    it('should generate public key from seed', () => {
      const publicKey = wots_public_key_gen(seed, pub_seed, addr)
      expect(publicKey).toBeDefined()
      expect(Array.isArray(publicKey)).toBe(true)
      expect(publicKey.length).toBeGreaterThan(0)
    })

    it('should sign message and verify with public key', () => {
      // Generate public key
      const publicKey = wots_public_key_gen(seed, pub_seed, addr)
      
      // Sign message
      const signature = wots_sign(message, seed, pub_seed, addr)
      expect(signature).toBeDefined()
      expect(Array.isArray(signature)).toBe(true)
      
      // Verify signature by reconstructing public key
      const reconstructedKey = wots_publickey_from_sig(signature, message, pub_seed, addr)
      expect(reconstructedKey).toEqual(publicKey)
    })

    it('should fail verification with wrong message', () => {
      const publicKey = wots_public_key_gen(seed, pub_seed, addr)
      const signature = wots_sign(message, seed, pub_seed, addr)
      
      // Modify message
      const wrongMessage = [...message]
      wrongMessage[0] = wrongMessage[0] ^ 1
      
      const reconstructedKey = wots_publickey_from_sig(signature, wrongMessage, pub_seed, addr)
      expect(reconstructedKey).not.toEqual(publicKey)
    })
  })

  describe('Utility Functions', () => {
    describe('ull_to_bytes', () => {
      it('should convert number array to bytes with correct length', () => {
        const input = [1, 2, 3]
        const outlen = 4
        const result = ull_to_bytes(outlen, input)
        expect(result).toHaveLength(outlen)
      })

      it('should pad with zeros when input is shorter than outlen', () => {
        const input = [1]
        const outlen = 4
        const result = ull_to_bytes(outlen, input)
        expect(result).toEqual([0, 0, 0, 1])
      })
    })

    describe('byte_copy', () => {
      it('should copy bytes with correct length', () => {
        const source = [1, 2, 3, 4]
        const result = byte_copy(source, 3)
        expect(result).toEqual([1, 2, 3])
      })

      it('should pad with zeros when source is shorter', () => {
        const source = [1, 2]
        const result = byte_copy(source, 4)
        expect(result).toEqual([1, 2, 0, 0])
      })
    })

    describe('from_int_to_byte_array', () => {
      it('should convert integer to 8-byte array', () => {
        const input = 258 // 0x102
        const result = from_int_to_byte_array(input)
        expect(result).toHaveLength(8)
        expect(result[0]).toBe(2) // Least significant byte
        expect(result[1]).toBe(1)
        expect(result.slice(2)).toEqual([0, 0, 0, 0, 0, 0]) // Rest should be zeros
      })

      it('should handle zero', () => {
        const result = from_int_to_byte_array(0)
        expect(result).toEqual([0, 0, 0, 0, 0, 0, 0, 0])
      })

      it('should handle large numbers', () => {
        const input = Math.pow(2, 32) - 1 // Maximum 32-bit unsigned integer
        const result = from_int_to_byte_array(input)
        expect(result[0]).toBe(255)
        expect(result[1]).toBe(255)
        expect(result[2]).toBe(255)
        expect(result[3]).toBe(255)
        expect(result.slice(4)).toEqual([0, 0, 0, 0])
      })
    })
  })

  describe('Error Cases', () => {
    it('should handle empty input gracefully', () => {
      const emptyArray: number[] = []
      const result = sha256(emptyArray)
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle invalid UTF-8 characters', () => {
      const input = [0xFF, 0xFF] // Invalid UTF-8
      const result = sha256(input)
      expect(Array.isArray(result)).toBe(true)
    })
  })
}) 