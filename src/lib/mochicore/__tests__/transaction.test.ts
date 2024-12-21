import { Transaction } from '../transaction';
import { HDWallet } from '../hdwallet';
import { Account } from '../account';

describe('Transaction', () => {
    const masterSeed = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    let wallet: HDWallet;
    let sourceAccount: Account;
    let destAccount: Account;
    let changeAccount: Account;

    beforeEach(() => {
        wallet = new HDWallet(masterSeed);
        sourceAccount = wallet.createAccount(0);
        destAccount = wallet.createAccount(1);
        changeAccount = wallet.createAccount(2);
    });

    describe('createTransactionPayload', () => {
        it('should create payload with correct structure and size', () => {
            const sourceKeyPair = sourceAccount.generateNextKeyPair();
            const destKeyPair = destAccount.generateNextKeyPair();
            const changeKeyPair = changeAccount.generateNextKeyPair();

            const amount = BigInt(2000);
            const send = BigInt(1000);

            const payload = Transaction.createTransactionPayload(
                sourceKeyPair.publicKey,
                destKeyPair.publicKey,
                changeKeyPair.publicKey,
                amount,
                send,
                sourceKeyPair.seed
            );

            // Check total size
            expect(payload.length).toBe(8792);

            // Check address positions
            expect(payload.slice(0, 2208)).toEqual(sourceKeyPair.publicKey);
            expect(payload.slice(2208, 4416)).toEqual(destKeyPair.publicKey);
            expect(payload.slice(4416, 6624)).toEqual(changeKeyPair.publicKey);
        });

        it('should correctly encode amounts in little-endian', () => {
            const sourceKeyPair = sourceAccount.generateNextKeyPair();
            const destKeyPair = destAccount.generateNextKeyPair();
            const changeKeyPair = changeAccount.generateNextKeyPair();

            const amount = BigInt(2000);
            const send = BigInt(1000);
            const expectedChange = amount - (send + BigInt(500)); // 500 is fixed fee

            const payload = Transaction.createTransactionPayload(
                sourceKeyPair.publicKey,
                destKeyPair.publicKey,
                changeKeyPair.publicKey,
                amount,
                send,
                sourceKeyPair.seed
            );

            // Extract and verify amounts
            const sendAmount = extractAmount(payload, 6624);
            const changeAmount = extractAmount(payload, 6632);
            const feeAmount = extractAmount(payload, 6640);

            expect(sendAmount).toBe(send);
            expect(changeAmount).toBe(expectedChange);
            expect(feeAmount).toBe(BigInt(500));
        });

        it('should generate valid signature', () => {
            const sourceKeyPair = sourceAccount.generateNextKeyPair();
            const destKeyPair = destAccount.generateNextKeyPair();
            const changeKeyPair = changeAccount.generateNextKeyPair();

            const payload = Transaction.createTransactionPayload(
                sourceKeyPair.publicKey,
                destKeyPair.publicKey,
                changeKeyPair.publicKey,
                BigInt(2000),
                BigInt(1000),
                sourceKeyPair.seed
            );

            // Extract signature
            const signature = payload.slice(6648, 6648 + 2144);
            expect(signature.length).toBe(2144);
            expect(signature).not.toEqual(new Uint8Array(2144)); // Should not be all zeros
        });
    });

    describe('createTransaction', () => {
        it('should create valid transaction with correct fee', () => {
            const sourceKeyPair = sourceAccount.generateNextKeyPair();
            const destKeyPair = destAccount.generateNextKeyPair();
            const changeKeyPair = changeAccount.generateNextKeyPair();

            const transaction = Transaction.createTransaction(
                sourceKeyPair.publicKey,
                destKeyPair.publicKey,
                changeKeyPair.publicKey,
                BigInt(2000),
                BigInt(1000),
                sourceKeyPair.seed
            );

            // Extract and verify amounts
            const sendAmount = extractAmount(transaction, 6624);
            const changeAmount = extractAmount(transaction, 6632);
            const feeAmount = extractAmount(transaction, 6640);

            expect(sendAmount).toBe(BigInt(1000));
            expect(feeAmount).toBe(BigInt(500));
            expect(changeAmount).toBe(BigInt(500)); // 2000 - 1000 - 500
        });

        it('should reject transaction if balance insufficient', () => {
            const sourceKeyPair = sourceAccount.generateNextKeyPair();
            const destKeyPair = destAccount.generateNextKeyPair();
            const changeKeyPair = changeAccount.generateNextKeyPair();

            expect(() => {
                Transaction.createTransaction(
                    sourceKeyPair.publicKey,
                    destKeyPair.publicKey,
                    changeKeyPair.publicKey,
                    BigInt(1000),  // Balance
                    BigInt(800),   // Send amount (800 + 500 fee > 1000)
                    sourceKeyPair.seed
                );
            }).toThrow('Not enough balance for transaction');
        });
    });
});

// Helper function to extract amount from payload
function extractAmount(payload: Uint8Array, offset: number): bigint {
    let amount = BigInt(0);
    for (let i = 0; i < 8; i++) {
        amount |= BigInt(payload[offset + i]) << BigInt(i * 8);
    }
    return amount;
} 