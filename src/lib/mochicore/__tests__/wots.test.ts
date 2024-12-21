import { sha256FromBytes, sha256FromString } from '../utils/hash';
import { WOTS } from '../wots';

describe('WOTS', () => {
    let wots: WOTS;
    
    beforeEach(() => {
        wots = new WOTS();
    });

    it('should generate consistent key pairs from the same seed', () => {
        const seed = "test_seed_123";
        const keyPair1 = wots.generateKeyPairFrom(seed);
        const keyPair2 = wots.generateKeyPairFrom(seed);
        
        expect(keyPair1).toEqual(keyPair2);
    });

    it('should generate different key pairs from different seeds', () => {
        const seed1 = "test_seed_123";
        const seed2 = "test_seed_456";
        const keyPair1 = wots.generateKeyPairFrom(seed1);
        const keyPair2 = wots.generateKeyPairFrom(seed2);
        
        expect(keyPair1).not.toEqual(keyPair2);
    });

    it('should generate valid signatures that can be verified', () => {
        // Generate a key pair
        const seed = "test_seed_123";
        const originalPublicKey = wots.generateKeyPairFrom(seed);
        const publicSeed = sha256FromString(seed + "publ");
        const addrSeed = sha256FromString(seed + "addr");
        
        // Create a test message and hash it
        const message = new TextEncoder().encode("Hello, WOTS!");
        
        // Generate signature
        const signature = wots.generateSignatureFrom(seed, message);
        
        // Get message hash - use sha256FromBytes like in generateSignatureFrom
        const messageHash = sha256FromBytes(message);
        
        // Log intermediate values for debugging
        console.log('Original Public Key Length:', originalPublicKey.length);
        console.log('Original Public Key (first part):', originalPublicKey.slice(0, 2144));
        console.log('Signature Length:', signature.length);
        console.log('Message Hash:', messageHash);
        
        // Recover public key from signature
        const recoveredPublicKey = wots.wotsPublicKeyFromSig(
            signature,
            messageHash,
            publicSeed,
            addrSeed
        );
        
        console.log('Recovered Public Key Length:', recoveredPublicKey.length);
        console.log('Recovered Public Key:', recoveredPublicKey);
        
        // Compare only the actual public key portion (first 2144 bytes)
        const originalPublicKeyPortion = originalPublicKey.slice(0, 2144);
        expect(Buffer.from(recoveredPublicKey)).toEqual(Buffer.from(originalPublicKeyPortion));
    });

    it('should reject empty seeds', () => {
        expect(() => {
            wots.generateKeyPairFrom("");
        }).toThrow('WOTS seed cannot be empty');
    });

    it('should reject invalid tag lengths', () => {
        expect(() => {
            wots.generateKeyPairFrom("test_seed", "123"); // Too short
        }).toThrow('Tag must be 12 bytes (24 hex characters)');
    });

    it.only('should accept valid tag lengths', () => {
        // Try a simpler tag first
        const validTag = "000000000000000000000000";    
        expect(() => {
            wots.generateKeyPairFrom("test_seed", validTag);
        }).not.toThrow();
    });
}); 