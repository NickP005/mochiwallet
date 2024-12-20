import { Datagram, Operation } from '../Datagram'
import { Buffer } from 'buffer'

describe('Datagram', () => {
  let datagram: Datagram

  beforeEach(() => {
    datagram = new Datagram()
  })

  describe('Constants', () => {
    it('should have correct length constants', () => {
      expect(Datagram.LENGTH).toBe(8920)
      expect(Datagram.TRANSACTION_BUFFER_LENGTH).toBe(8792)
      expect(Datagram.TRANSACTION_BUFFER_LENGTH_OFFSET).toBe(122)
      expect(Datagram.TRANSACTION_BUFFER_OFFSET).toBe(124)
    })

    it('should have correct peer list constants', () => {
      expect(Datagram.ADD_TO_PEER_LIST_TRANSACTION_BUFFER_LENGTH).toBe(0)
      expect(Datagram.DO_NOT_ADD_TO_PEER_LIST_TRANSACTION_BUFFER_LENGTH).toBe(1)
    })
  })

  describe('Serialization', () => {
    it('should throw error when operation not set', () => {
      expect(() => {
        datagram.serialize()
      }).toThrow('Operation not set')
    })

    it('should serialize basic datagram correctly', () => {
      const serialized = datagram
        .setOperation(Operation.Normal)
        .serialize()

      expect(serialized).toBeInstanceOf(Uint8Array)
      expect(serialized.length).toBe(Datagram.LENGTH)
      
      // Check version (byte 0)
      expect(serialized[0]).toBe(4)
      
      // Check operation (bytes 8-9, little-endian)
      expect(serialized[8]).toBe(Operation.Normal)
      expect(serialized[9]).toBe(0)
    })

    it('should serialize transaction datagram correctly', () => {
      const sourceAddr = new Uint8Array(2208).fill(1)
      const destAddr = new Uint8Array(2208).fill(2)
      const changeAddr = new Uint8Array(2208).fill(3)
      const signature = new Uint8Array(2144).fill(4)

      const serialized = datagram
        .setOperation(Operation.Tx)
        .setSourceAddress(sourceAddr)
        .setDestinationAddress(destAddr)
        .setChangeAddress(changeAddr)
        .setAmount(1000n)
        .setTotalChange(500n)
        .setFee(1n)
        .setSignature(signature)
        .serialize()

      // Check operation
      expect(serialized[8]).toBe(Operation.Tx)
      
      // Verify addresses are set correctly
      const sourceOffset = Datagram.TRANSACTION_BUFFER_OFFSET
      const destOffset = sourceOffset + 2208
      const changeOffset = destOffset + 2208

      expect(serialized[sourceOffset]).toBe(1)
      expect(serialized[destOffset]).toBe(2)
      expect(serialized[changeOffset]).toBe(3)

      // Verify amounts (8 bytes each, little-endian)
      const amountOffset = changeOffset + 2208
      expect(serialized[amountOffset]).toBe(232) // 1000n in little-endian
      expect(serialized[amountOffset + 1]).toBe(3)
      
      // Verify signature
      const sigOffset = amountOffset + 24 // After amounts
      expect(serialized[sigOffset]).toBe(4)
    })
  })

  describe('Field Setters', () => {
    it('should set and maintain source address', () => {
      const addr = new Uint8Array(2208).fill(1)
      datagram.setSourceAddress(addr)
      
      const serialized = datagram
        .setOperation(Operation.Normal)
        .serialize()

      const sourceAddr = serialized.slice(
        Datagram.TRANSACTION_BUFFER_OFFSET,
        Datagram.TRANSACTION_BUFFER_OFFSET + 2208
      )
      expect(Buffer.from(sourceAddr).toString('hex'))
        .toBe(Buffer.from(addr).toString('hex'))
    })

    it('should validate address lengths', () => {
      const invalidAddr = new Uint8Array(2207) // Wrong length

      expect(() => {
        datagram.setSourceAddress(invalidAddr)
      }).toThrow()

      expect(() => {
        datagram.setDestinationAddress(invalidAddr)
      }).toThrow()

      expect(() => {
        datagram.setChangeAddress(invalidAddr)
      }).toThrow()
    })

    it('should handle amounts correctly', () => {
      const amount = 1000000000n
      datagram.setAmount(amount)
      datagram.setTotalChange(500000000n)
      datagram.setFee(1000n)

      const serialized = datagram
        .setOperation(Operation.Tx)
        .serialize()

      // Verify amounts in serialized data (reading as little-endian)
      const amountOffset = Datagram.TRANSACTION_BUFFER_OFFSET + 6624
      const amountBytes = [...serialized.slice(amountOffset, amountOffset + 8)].reverse()
      const amountValue = BigInt('0x' + Buffer.from(amountBytes).toString('hex'))
      
      expect(amountValue).toBe(amount)
    })

    it('should validate signature length', () => {
      const invalidSig = new Uint8Array(2143) // Wrong length

      expect(() => {
        datagram.setSignature(invalidSig)
      }).toThrow()
    })
  })

  describe('Operation Handling', () => {
    it('should handle all operation types', () => {
      // Test a few key operations
      const operations = [
        Operation.Normal,
        Operation.Tx,
        Operation.Balance,
        Operation.Resolve
      ]

      operations.forEach(op => {
        const serialized = datagram
          .setOperation(op)
          .serialize()

        expect(serialized[8]).toBe(op)
      })
    })

    it('should maintain operation through multiple serializations', () => {
      datagram.setOperation(Operation.Tx)

      const serialized1 = datagram.serialize()
      const serialized2 = datagram.serialize()

      expect(serialized1[8]).toBe(serialized2[8])
      expect(serialized1[8]).toBe(Operation.Tx)
    })
  })
}) 