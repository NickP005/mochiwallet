import { Operation } from './datagram';
import { Datagram } from './datagram';
import { sha256FromString } from './utils/hash';
import { WOTS } from './wots';

interface TransactionInput {
    balance: bigint;
    payment: bigint;
    fee: bigint;
    changeAmount: bigint;
    source: Uint8Array;
    wotsSeed: string;
    destination: Uint8Array;
    change: Uint8Array;
}

export class Transaction {
    public static readonly LENGTH: number = 8824;
    public static readonly SRC_ADDR_OFFSET: number = 2208;
    public static readonly DST_ADDR_OFFSET: number = 4416;
    public static readonly CHG_ADDR_OFFSET: number = 6624;
    public static readonly TXID_OFFSET: number = 8792;

    private static readonly MINIMUM_TRANSACTION_FEE = BigInt(500); // Example minimum fee

    /**
     * Creates and sends a transaction
     * @param from Source address (2208 bytes)
     * @param to Destination address (2208 bytes)
     * @param change Change address (2208 bytes)
     * @param balance Total balance available
     * @param sendAmount Amount to send
     * @param wotsSeed WOTS seed for signing
     * @returns Transaction payload
     */
    public static createTransaction(
        from: Uint8Array,
        to: Uint8Array,
        change: Uint8Array,
        balance: bigint,
        sendAmount: bigint,
        wotsSeed: string
    ): Uint8Array {
        const fee = BigInt(500); // Fixed fee 
        const changeAmount = balance - (sendAmount + fee);

        // Validate amounts
        if (changeAmount < BigInt(0)) {
            throw new Error("Not enough balance for transaction");
        }

        // Create input for signing
        const input: TransactionInput = {
            balance,
            payment: sendAmount,
            fee,
            changeAmount,
            source: from,
            wotsSeed,
            destination: to,
            change
        };

        // Sign and create transaction
        return this.sign(input);
    }

    /**
     * Creates and signs a new transaction
     */
    public static sign(input: TransactionInput): Uint8Array {
        this.validateInput(input);
        this.validateAmounts(input);
        // Create datagram with verified signature
        //dgram 
        const { signature, payload } = this.createTransactionPayload(input.source, input.destination, input.change, input.balance, input.payment, input.wotsSeed);


        const datagram = new Datagram()
            .setSourceAddress(input.source)
            .setDestinationAddress(input.destination)
            .setChangeAddress(input.change)
            .setAmount(input.payment)
            .setTotalChange(input.changeAmount)
            .setFee(input.fee)
            .setSignature(signature)
            .setOperation(Operation.Tx);

        const ser = datagram.serialize()
        const d2 = Datagram.of(ser, 0, ser.length)
        console.log("COMPARE", datagram.equals(d2))
        console.log(
            "SIGNATURE COMPARE",
            signature,
            d2.signature,
            datagram.signature,
            signature===d2.signature,
            signature===datagram.signature,
            signature.length,
            d2.signature.length,
            datagram.signature.length
        )
        return ser
    }

    private static validateInput(input: TransactionInput): void {
        if (input.source.length !== 2208) {
            throw new Error("Invalid source address length");
        }
        if (input.destination.length !== 2208) {
            throw new Error("Invalid destination address length");
        }
        if (input.change.length !== 2208) {
            throw new Error("Invalid change address length");
        }
        if (!input.wotsSeed) {
            throw new Error("WOTS seed is required");
        }
    }

    private static validateAmounts(input: TransactionInput): void {
        if (input.balance <= BigInt(0)) {
            throw new Error("Balance must be positive");
        }
        if (input.payment < BigInt(0)) {
            throw new Error("Payment cannot be negative");
        }
        if (input.fee < BigInt(0)) {
            throw new Error("Fee cannot be negative");
        }
        if (input.fee < this.MINIMUM_TRANSACTION_FEE) {
            console.log({ fee: input.fee, minimum: this.MINIMUM_TRANSACTION_FEE });
            throw new Error("Fee below minimum");
        }
        if (input.changeAmount < BigInt(0)) {
            throw new Error("Change cannot be negative");
        }

        // Calculate and validate available amounts
        const availableAfterFee = input.balance - input.fee;
        const availableAfterFeePayment = availableAfterFee - input.payment;
        const availableAfterFeePaymentChange = availableAfterFeePayment - input.changeAmount;

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
    }



    private static areEqual(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        return a.every((value, index) => value === b[index]);
    }

    /**
     * Creates a transaction payload matching the Swift implementation
     * @param from Source address (2208 bytes)
     * @param to Destination address (2208 bytes)
     * @param change Change address (2208 bytes)
     * @param amount Total amount available
     * @param send Amount to send
     * @param seed WOTS seed for signing
     * @returns Transaction payload
     */
    public static createTransactionPayload(
        from: Uint8Array,
        to: Uint8Array,
        change: Uint8Array,
        amount: bigint,
        send: bigint,
        seed: string,
    ): { payload: Uint8Array, signature: Uint8Array } {
        // Create payload with correct size
        let payload = new Uint8Array(8792);
        let offset = 0;

        // Append addresses
        payload.set(from, offset);
        offset += from.length;  // 2208
        payload.set(to, offset);
        offset += to.length;    // 4416
        payload.set(change, offset);
        offset += change.length; // 6624
        console.log("offset should be 6624", offset, offset===6624)

        // Append amounts in little-endian
        const sendBytes = this.toLittleEndianBytes(send, 8);
        const changeBytes = this.toLittleEndianBytes(amount - (send + BigInt(500)), 8);
        const feeBytes = this.toLittleEndianBytes(BigInt(500), 8);

        payload.set(sendBytes, offset);
        offset += 8;    // 6632
        payload.set(changeBytes, offset);
        offset += 8;    // 6640
        payload.set(feeBytes, offset);
        offset += 8;    // 6648
        console.log("offset should be 6648", offset, offset===6648)
        // Generate and append signature
        const messageToSign = payload.slice(0, offset);
        const wots = new WOTS();


        // Extract components from source address
        const pk = from.slice(0, 2144);  // First 2144 bytes are the PK
        const pubSeed = from.slice(2144, 2144 + 32);  // Next 32 bytes are pubSeed
        const rnd2 = from.slice(2144 + 32, 2144 + 64);  // Next 32 bytes are rnd2
        const signature = wots.generateSignatureFrom(seed, messageToSign);

        // Verify signature
        const expectedPK = wots.wotsPublicKeyFromSig(signature, messageToSign, pubSeed, rnd2);

        // Compare only the PK portion
        if (!this.areEqual(pk, expectedPK)) {
            console.log("Original PK:", pk);
            console.log("Expected PK:", expectedPK);
            throw new Error("Signature verification failed");
        }

        payload.set(signature, offset); // 6648 + 2144 = 8792
        console.log("offset should be 8792", offset, offset===8792)
        return { payload, signature };
    }

    private static toLittleEndianBytes(value: bigint, length: number): Uint8Array {
        const bytes = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            bytes[i] = Number(value >> BigInt(i * 8) & BigInt(255));
        }
        return bytes;
    }
} 