import { Mnemonic } from '../mnemonic'

describe('Mnemonic', () => {
  describe('generate', () => {
    it('should generate valid 24-word mnemonic', () => {
      const mnemonic = Mnemonic.generate()
      const words = mnemonic.split(' ')
      
      expect(words).toHaveLength(24)
      expect(Mnemonic.validate(mnemonic)).toBe(true)
    })
  })

  describe('validate', () => {
    it('should validate correct mnemonic', () => {
      const mnemonic = Mnemonic.generate()
      console.log(mnemonic)
      expect(Mnemonic.validate(mnemonic)).toBe(true)
    })

    it('should reject invalid mnemonic', () => {
      expect(Mnemonic.validate('invalid words here')).toBe(false)
    })
  })

  describe('seed generation', () => {
    it('should generate consistent seeds from same mnemonic', () => {
      const mnemonic = Mnemonic.generate()
      const seed1 = Mnemonic.toSeed(mnemonic)
      const seed2 = Mnemonic.toSeed(mnemonic)
      
      expect(seed1).toEqual(seed2)
    })

    it('should generate different seeds with different passphrases', () => {
      const mnemonic = Mnemonic.generate()
      const seed1 = Mnemonic.toSeed(mnemonic, 'pass1')
      const seed2 = Mnemonic.toSeed(mnemonic, 'pass2')
      
      expect(seed1).not.toEqual(seed2)
    })
  })

  describe('entropy conversion', () => {
    it('should roundtrip entropy to mnemonic', () => {
      const entropy = crypto.getRandomValues(new Uint8Array(32))
      const mnemonic = Mnemonic.fromEntropy(entropy)
      const recoveredEntropy = Mnemonic.toEntropy(mnemonic)
      
      expect(Buffer.from(recoveredEntropy)).toEqual(Buffer.from(entropy))
    })
  })
}) 