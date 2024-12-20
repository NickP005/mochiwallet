import { Transaction } from '../Transaction'
import { Buffer } from 'buffer'
import { WOTS } from '../WOTS'
import { Mochimo } from '../Mochimo'
import { Utils } from '../Utils'

describe('Transaction', () => {
  describe('Constants', () => {
    it('should have correct offsets and lengths', () => {
      expect(Transaction.LENGTH).toBe(8824)
      expect(Transaction.SRC_ADDR_OFFSET).toBe(2208)
      expect(Transaction.DST_ADDR_OFFSET).toBe(4416)
      expect(Transaction.CHG_ADDR_OFFSET).toBe(6624)
      expect(Transaction.TXID_OFFSET).toBe(8792)
    })
  })

  describe('sign', () => {
    // Test data setup
    const balance = 2000000000n
    const payment = 1000000000n
    const fee = 1000n
    const changeAmount = balance - payment - fee

    // Create proper WOTS components
    const sourceSecret = new Uint8Array(32).fill(4)
    const pubSeed = new Uint8Array(32).fill(5)
    const rnd2 = new Uint8Array(32).fill(6)

    // Create initial public key properly
    const pk = new Uint8Array(WOTS.TXSIGLEN)
    const initialMsg = new Uint8Array(32).fill(0) // Use zero message for initial PK
    WOTS.sign(pk, initialMsg, sourceSecret, pubSeed, 0, rnd2)

    // Construct proper source address
    const source = new Uint8Array(Mochimo.TXADDRLEN)
    source.set(pk, 0)  // Set public key
    source.set(pubSeed, Mochimo.TXSIGLEN)  // Set public seed
    source.set(rnd2, Mochimo.TXSIGLEN + 32)  // Set rnd2

    const destination = new Uint8Array(Mochimo.TXADDRLEN).fill(2)
    const change = new Uint8Array(Mochimo.TXADDRLEN).fill(3)

    // Add debug logging for verification
    beforeEach(() => {
      console.log('Test Setup:')
      console.log('Source Secret:', Buffer.from(sourceSecret).toString('hex'))
      console.log('Public Seed:', Buffer.from(pubSeed).toString('hex'))
      console.log('RND2:', Buffer.from(rnd2).toString('hex'))
      console.log('Initial PK:', Buffer.from(pk).toString('hex'))
    })

    it('should create valid transaction', () => {
      const tx = Transaction.sign(
        balance,
        payment,
        fee,
        changeAmount,
        source,
        sourceSecret,
        destination,
        change
      )

      expect(tx).toBeInstanceOf(Uint8Array)
      expect(tx.length).toBe(Transaction.LENGTH)

      // Verify transaction structure
      const srcAddr = tx.slice(Transaction.SRC_ADDR_OFFSET, Transaction.SRC_ADDR_OFFSET + Mochimo.TXADDRLEN)
      const dstAddr = tx.slice(Transaction.DST_ADDR_OFFSET, Transaction.DST_ADDR_OFFSET + Mochimo.TXADDRLEN)
      const chgAddr = tx.slice(Transaction.CHG_ADDR_OFFSET, Transaction.CHG_ADDR_OFFSET + Mochimo.TXADDRLEN)

      expect(Buffer.from(srcAddr).toString('hex')).toBe(Buffer.from(source).toString('hex'))
      expect(Buffer.from(dstAddr).toString('hex')).toBe(Buffer.from(destination).toString('hex'))
      expect(Buffer.from(chgAddr).toString('hex')).toBe(Buffer.from(change).toString('hex'))
    })

    describe('Input Validation', () => {
      it('should validate source address length', () => {
        const invalidSource = new Uint8Array(Mochimo.TXADDRLEN - 1)
        
        expect(() => {
          Transaction.sign(
            balance, payment, fee, changeAmount,
            invalidSource, sourceSecret, destination, change
          )
        }).toThrow('Invalid source address length')
      })

      it('should validate destination address length', () => {
        const invalidDest = new Uint8Array(Mochimo.TXADDRLEN - 1)
        
        expect(() => {
          Transaction.sign(
            balance, payment, fee, changeAmount,
            source, sourceSecret, invalidDest, change
          )
        }).toThrow('Invalid destination address length')
      })

      it('should validate change address length', () => {
        const invalidChange = new Uint8Array(Mochimo.TXADDRLEN - 1)
        
        expect(() => {
          Transaction.sign(
            balance, payment, fee, changeAmount,
            source, sourceSecret, destination, invalidChange
          )
        }).toThrow('Invalid change address length')
      })

      it('should validate balance is positive', () => {
        expect(() => {
          Transaction.sign(
            0n, payment, fee, changeAmount,
            source, sourceSecret, destination, change
          )
        }).toThrow('Balance must be positive')
      })

      it('should validate payment is not negative', () => {
        expect(() => {
          Transaction.sign(
            balance, -1n, fee, changeAmount,
            source, sourceSecret, destination, change
          )
        }).toThrow('Payment cannot be negative')
      })

      it('should validate fee is not negative', () => {
        expect(() => {
          Transaction.sign(
            balance, payment, -1n, changeAmount,
            source, sourceSecret, destination, change
          )
        }).toThrow('Fee cannot be negative')
      })

      it('should validate minimum fee', () => {
        expect(() => {
          Transaction.sign(
            balance, payment, 100n, changeAmount,
            source, sourceSecret, destination, change
          )
        }).toThrow('Fee below minimum')
      })

      it('should validate sufficient funds for fee', () => {
        const highFee = balance + 1n
        
        expect(() => {
          Transaction.sign(
            balance, 0n, highFee, 0n,
            source, sourceSecret, destination, change
          )
        }).toThrow('Not enough fund for fee')
      })

      it('should validate sufficient funds for payment and fee', () => {
        const highPayment = balance - fee + 1n
        
        expect(() => {
          Transaction.sign(
            balance, highPayment, fee, 0n,
            source, sourceSecret, destination, change
          )
        }).toThrow('Not enough fund for fee and payment')
      })

      it('should validate change amount matches calculation', () => {
        const wrongChange = changeAmount - 1n // This leaves funds unspent
        
        expect(() => {
          Transaction.sign(
            balance, payment, fee, wrongChange,
            source, sourceSecret, destination, change
          )
        }).toThrow('Source address not fully spent')
      })
    })

    describe('Signature Verification', () => {
      it('should generate valid signature that verifies', () => {
        const tx = Transaction.sign(
          balance, payment, fee, changeAmount,
          source, sourceSecret, destination, change
        )

        // Extract signature and message components
        const signature = tx.slice(Transaction.SRC_ADDR_OFFSET, Transaction.SRC_ADDR_OFFSET + Mochimo.TXSIGLEN)
        const message = tx.slice(0, Mochimo.SIG_HASH_COUNT)
        
        // Extract public seed and rnd2 from source address
        const pubSeed = source.slice(Mochimo.TXSIGLEN, Mochimo.TXSIGLEN + 32)
        const rnd2 = source.slice(Mochimo.TXSIGLEN + 32, Mochimo.TXSIGLEN + 64)

        // Verify signature
        const recoveredPK = WOTS.pkFromSignature(signature, message, pubSeed, rnd2)
        const originalPK = source.slice(0, Mochimo.TXSIGLEN)

        expect(Buffer.from(recoveredPK).toString('hex'))
          .toBe(Buffer.from(originalPK).toString('hex'))
      })
    })
  })
}) 