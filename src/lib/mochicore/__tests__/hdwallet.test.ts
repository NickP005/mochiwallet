import { HDWallet } from '../hdwallet';
import { TextEncoder } from 'util';

describe('HDWallet', () => {
    const masterSeed = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    let wallet: HDWallet;

    beforeEach(() => {
        wallet = new HDWallet(masterSeed);
    });

    it('should create accounts with unique tags', () => {
        const account1 = wallet.createAccount(0);
        const account2 = wallet.createAccount(1);

        expect(account1.getTag()).not.toEqual(account2.getTag());
    });

    it('should generate deterministic keys', () => {
        const account = wallet.createAccount(0);
        const keyPair1 = account.generateNextKeyPair();
        
        // Create new wallet instance with same seed
        const newWallet = new HDWallet(masterSeed);
        const newAccount = newWallet.createAccount(0);
        const keyPair2 = newAccount.generateNextKeyPair();

        expect(keyPair1.publicKey).toEqual(keyPair2.publicKey);
    });

    it('should sign messages correctly', () => {
        const account = wallet.createAccount(0);
        const keyPair = account.generateNextKeyPair();
        
        const message = new TextEncoder().encode("Test message");
        const signature = account.signMessage(keyPair.seed, message);
        
        expect(signature).toBeDefined();
        expect(signature.length).toBe(2144);
    });

    it('should not allow duplicate account indices', () => {
        wallet.createAccount(0);
        expect(() => {
            wallet.createAccount(0);
        }).toThrow('Account 0 already exists');
    });
}); 