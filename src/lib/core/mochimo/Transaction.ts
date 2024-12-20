import { Datagram, Operation } from './Datagram';
import { Utils } from './Utils';
import { WOTS } from './WOTS';
import { Mochimo } from './Mochimo';

/**
 * Handles transaction creation and signing in the Mochimo protocol.
 * Implements the core transaction functionality including WOTS signatures.
 */
export class Transaction {
    /** Total length of a transaction in bytes */
    public static readonly LENGTH: number = 8824;
    /** Offset of source address in transaction */
    public static readonly SRC_ADDR_OFFSET: number = 2208;
    /** Offset of destination address in transaction */
    public static readonly DST_ADDR_OFFSET: number = 4416;
    /** Offset of change address in transaction */
    public static readonly CHG_ADDR_OFFSET: number = 6624;
    /** Offset of transaction ID in transaction */
    public static readonly TXID_OFFSET: number = 8792;

    /**
     * Creates and signs a new transaction
     * @param balance - Current balance of source address
     * @param payment - Amount to send to destination
     * @param fee - Transaction fee
     * @param changeAmount - Amount to send to change address
     * @param source - Source address (2208 bytes)
     * @param sourceSecret - Source address secret key
     * @param destination - Destination address (2208 bytes)
     * @param change - Change address (2208 bytes)
     * @returns Serialized transaction datagram
     * @throws Error if validation fails or signature creation fails
     */
    public static sign(
        balance: bigint,
        payment: bigint,
        fee: bigint,
        changeAmount: bigint,
        source: Uint8Array,
        sourceSecret: Uint8Array,
        destination: Uint8Array,
        change: Uint8Array
    ): Uint8Array {
        // Input validation
        if (source.length !== Mochimo.TXADDRLEN) {
            throw new Error("Invalid source address length");
        }
        if (destination.length !== Mochimo.TXADDRLEN) {
            throw new Error("Invalid destination address length");
        }
        if (change.length !== Mochimo.TXADDRLEN) {
            throw new Error("Invalid change address length");
        }
        if (balance <= BigInt(0)) {
            throw new Error("Balance must be positive");
        }
        if (payment < BigInt(0)) {
            throw new Error("Payment cannot be negative");
        }
        if (fee < BigInt(0)) {
            throw new Error("Fee cannot be negative");
        }
        if (fee < Mochimo.MINIMUM_TRANSACTION_FEE) {
            throw new Error("Fee below minimum");
        }
        if (changeAmount < BigInt(0)) {
            throw new Error("Change cannot be negative");
        }

        // Calculate available amounts
        const availableAfterFee = balance - fee;
        const availableAfterFeePayment = availableAfterFee - payment;
        const availableAfterFeePaymentChange = availableAfterFeePayment - changeAmount;

        // Validate amounts
        if (availableAfterFee < BigInt(0)) {
            throw new Error("Not enough fund for fee");
        }
        if (availableAfterFeePayment < BigInt(0)) {
            throw new Error("Not enough fund for fee and payment");
        }
        if (availableAfterFeePaymentChange < BigInt(0)) {
            throw new Error("Not enough fund for fee, payment and change");
        }
        if (availableAfterFeePaymentChange > BigInt(0)) {
            throw new Error("Source address not fully spent");
        }

        // Create message buffer
        const buffer = new Uint8Array(Mochimo.SIG_HASH_COUNT);
        let offset = 0;

        // Copy addresses
        buffer.set(source, offset);
        offset += source.length;
        buffer.set(destination, offset);
        offset += destination.length;
        buffer.set(change, offset);
        offset += change.length;

        // Add amounts in little-endian
        const paymentBytes = Utils.toLittleEndian(Utils.fitToLength(payment, 8));
        const changeBytes = Utils.toLittleEndian(Utils.fitToLength(changeAmount, 8));
        const feeBytes = Utils.toLittleEndian(Utils.fitToLength(fee, 8));

        buffer.set(paymentBytes, offset);
        offset += 8;
        buffer.set(changeBytes, offset);
        offset += 8;
        buffer.set(feeBytes, offset);

        // Hash the message
        const message = Mochimo.hash(buffer);

        // Extract components from source address
        const pk = source.slice(0, Mochimo.TXSIGLEN);
        const pubSeed = source.slice(Mochimo.TXSIGLEN, Mochimo.TXSIGLEN + 32);
        const rnd2 = source.slice(Mochimo.TXSIGLEN + 32, Mochimo.TXSIGLEN + 64);

        // Generate signature
        const signature = new Uint8Array(Mochimo.TXSIGLEN);
        WOTS.sign(signature, message, sourceSecret, pubSeed, 0, rnd2);

        // Verify signature
        const expectedPK = WOTS.pkFromSignature(signature, message, pubSeed, rnd2);
       
        if (!Utils.areEqual(pk, expectedPK)) {
            console.log("Signature check failed")
            console.log("Expected PK:", Buffer.from(expectedPK).toString('hex'))
            console.log("Actual PK:", Buffer.from(pk).toString('hex'))
            throw new Error("Signature check failed");
        }

        // Create datagram
        const datagram = new Datagram()
            .setSourceAddress(source)
            .setDestinationAddress(destination)
            .setChangeAddress(change)
            .setAmount(payment)
            .setTotalChange(changeAmount)
            .setFee(fee)
            .setSignature(signature)
            .setOperation(Operation.Tx);

        return datagram.serialize();
    }
} 