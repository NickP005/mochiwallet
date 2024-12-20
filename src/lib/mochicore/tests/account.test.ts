import { Account } from '../account';
import { TextEncoder } from 'util';

describe('Account', () => {
    const testBaseSeed = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    let account: Account;

    beforeEach(() => {
        account = new Account(testBaseSeed);
    });

    describe('Tag Generation', () => {
        it('should generate consistent tags for the same seed', () => {
            const account2 = new Account(testBaseSeed);
            expect(account.getTag()).toEqual(account2.getTag());
        });

        it('should generate different tags for different seeds', () => {
            const account2 = new Account(testBaseSeed + '1');
            expect(account.getTag()).not.toEqual(account2.getTag());
        });

        it('should generate tag of correct length', () => {
            expect(account.getTag().length).toBe(24); // 12 bytes = 24 hex chars
        });
    });

    describe('Key Pair Generation', () => {
        it('should generate different key pairs for consecutive calls', () => {
            const keyPair1 = account.generateNextKeyPair();
            const keyPair2 = account.generateNextKeyPair();

            expect(keyPair1.seed).not.toEqual(keyPair2.seed);
            expect(Buffer.from(keyPair1.publicKey)).not.toEqual(Buffer.from(keyPair2.publicKey));
        });

        it('should increment index after generating key pair', () => {
            expect(account.getCurrentIndex()).toBe(0);
            account.generateNextKeyPair();
            expect(account.getCurrentIndex()).toBe(1);
        });

        it('should generate deterministic key pairs', () => {
            const account2 = new Account(testBaseSeed);
            
            const keyPair1 = account.generateNextKeyPair();
            const keyPair2 = account2.generateNextKeyPair();

            expect(keyPair1.seed).toEqual(keyPair2.seed);
            expect(Buffer.from(keyPair1.publicKey)).toEqual(Buffer.from(keyPair2.publicKey));
        });

        it('should include tag in public key', () => {
            const keyPair = account.generateNextKeyPair();
            const tag = account.getTag();
            
            // Convert tag to Uint8Array for comparison
            const tagBytes = Buffer.from(tag, 'hex');
            
            // The tag should be present in the public key (near the end)
            const hasTag = Buffer.from(keyPair.publicKey.slice(-32)).includes(tagBytes);
            expect(hasTag).toBe(true);
        });
    });

    describe('Message Signing', () => {
        it('should generate valid signatures', () => {
            const keyPair = account.generateNextKeyPair();
            const message = new TextEncoder().encode("Test message");
            
            const signature = account.signMessage(keyPair.seed, message);
            
            expect(signature).toBeDefined();
            expect(signature.length).toBe(2144);
        });

        it('should generate different signatures for different messages', () => {
            const keyPair = account.generateNextKeyPair();
            const message1 = new TextEncoder().encode("Test message 1");
            const message2 = new TextEncoder().encode("Test message 2");
            
            const signature1 = account.signMessage(keyPair.seed, message1);
            const signature2 = account.signMessage(keyPair.seed, message2);
            
            expect(Buffer.from(signature1)).not.toEqual(Buffer.from(signature2));
        });

        it('should generate different signatures for different seeds', () => {
            const keyPair1 = account.generateNextKeyPair();
            const keyPair2 = account.generateNextKeyPair();
            const message = new TextEncoder().encode("Test message");
            
            const signature1 = account.signMessage(keyPair1.seed, message);
            const signature2 = account.signMessage(keyPair2.seed, message);
            
            expect(Buffer.from(signature1)).not.toEqual(Buffer.from(signature2));
        });

        it('should generate consistent signatures for same inputs', () => {
            const keyPair = account.generateNextKeyPair();
            const message = new TextEncoder().encode("Test message");
            
            const signature1 = account.signMessage(keyPair.seed, message);
            const signature2 = account.signMessage(keyPair.seed, message);
            
            expect(Buffer.from(signature1)).toEqual(Buffer.from(signature2));
        });
    });
}); 