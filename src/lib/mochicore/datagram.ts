/**
 * Operation types for Mochimo network messages
 */
export enum Operation {
    Null = 0,
    Normal = 1,
    Neogenesis = 2,
    Tx = 3,
    ValidateRequest = 4,
    ValidateResponse = 5,
    GetIP = 6,
    Balance = 7,
    Resolve = 8,
    GetBlock = 9,
    GetTxLocation = 10,
    TxFinal = 11,
    GetHeaders = 12,
    GetLEBlock = 13,
    GetLEEntry = 14,
    GetTfile = 15,
    PushTx = 16,
    GetNeoAddr = 17,
    GetPeerList = 18,
    GetTxList = 19,
    GetTxByNum = 20,
    GetTxByHash = 21,
    GetTxByAddr = 22,
    GetTxByTag = 23,
    GetTxByWots = 24,
    GetTxByDst = 25,
    GetTxBySrc = 26,
    GetTxByChg = 27,
    GetTxByPkg = 28,
    GetTxByAll = 29,
    GetTxByTxid = 30,
    GetTxByMTx = 31,
    GetTxByMDst = 32,
    GetTxByMSrc = 33,
    GetTxByMChg = 34,
    GetTxByMPkg = 35,
    GetTxByMAll = 36,
    GetTxByMTxid = 37,
    GetTxByMTag = 38,
    GetTxByMWots = 39,
    GetTxByMDstTag = 40,
    GetTxByMSrcTag = 41,
    GetTxByMChgTag = 42,
    GetTxByMPkgTag = 43,
    GetTxByMAllTag = 44,
    GetTxByMTxidTag = 45,
    GetTxByMTagTag = 46,
    GetTxByMWotsTag = 47
}

/**
 * Node capabilities for Mochimo network
 */
export enum Capability {
    Push = 7,
    Wallet = 6,
    Sanctuary = 5,
    MFee = 4,
    Logging = 3
}

/**
 * Represents a Mochimo network message datagram.
 * Handles serialization and deserialization of network messages.
 */
export class Datagram {
    /** Total length of a datagram in bytes */
    public static readonly LENGTH: number = 8920;
    /** Offset of transaction buffer length field */
    public static readonly TRANSACTION_BUFFER_LENGTH_OFFSET: number = 122;
    /** Offset of transaction buffer */
    public static readonly TRANSACTION_BUFFER_OFFSET: number = 124;
    /** Length of transaction buffer */
    public static readonly TRANSACTION_BUFFER_LENGTH: number = 8792;
    /** Value indicating peer should be added to peer list */
    public static readonly ADD_TO_PEER_LIST_TRANSACTION_BUFFER_LENGTH: number = 0;
    /** Value indicating peer should not be added to peer list */
    public static readonly DO_NOT_ADD_TO_PEER_LIST_TRANSACTION_BUFFER_LENGTH: number = 1;

    private version: number = 4;
    private flags: boolean[] = new Array(8).fill(false);
    private network: number = 1337;
    private id1: number = 0;
    private id2: number = 0;
    private operation: Operation | null = null;
    private cblock: bigint = BigInt(0);
    private blocknum: bigint = BigInt(0);
    private cblockhash: Uint8Array = new Uint8Array(32);
    private pblockhash: Uint8Array = new Uint8Array(32);
    private weight: Uint8Array = new Uint8Array(32);
    private transactionBufferLength: number = Datagram.DO_NOT_ADD_TO_PEER_LIST_TRANSACTION_BUFFER_LENGTH;

    private sourceAddress: Uint8Array = new Uint8Array(2208);
    private destinationAddress: Uint8Array = new Uint8Array(2208);
    private changeAddress: Uint8Array = new Uint8Array(2208);

    private totalSend: Uint8Array = new Uint8Array(8);
    private totalChange: Uint8Array = new Uint8Array(8);
    private fee: Uint8Array = new Uint8Array(8);
    private signature: Uint8Array = new Uint8Array(2144);

    private crc: number = 0;
    private trailer: number = 43981;

    /**
     * Writes a BigInt value to a buffer in little-endian format
     * @param buffer - Target buffer
     * @param offset - Starting position in buffer
     * @param value - BigInt value to write
     * @param length - Number of bytes to write
     * @private
     */
    private writeBigIntToBuffer(buffer: Uint8Array, offset: number, value: bigint, length: number): void {
        for (let i = 0; i < length; i++) {
            buffer[offset + i] = Number(value & BigInt(0xFF));
            value = value >> BigInt(8);
        }
    }

    /**
     * Calculates CRC16 checksum of data
     * @param data - Data to calculate checksum for
     * @returns CRC16 checksum value
     * @private
     */
    private calculateCRC16(data: Uint8Array): number {
        const CRC16_POLYNOMIAL = 0x1021;
        let crc = 0;
        
        for (let i = 0; i < data.length; i++) {
            crc ^= (data[i] & 0xFF) << 8;
            for (let j = 0; j < 8; j++) {
                if ((crc & 0x8000) !== 0) {
                    crc = ((crc << 1) ^ CRC16_POLYNOMIAL) & 0xFFFF;
                } else {
                    crc = (crc << 1) & 0xFFFF;
                }
            }
        }
        
        return crc;
    }

    /**
     * Sets the source address for the transaction
     * @param address - Source address (2208 bytes)
     * @returns this for method chaining
     */
    public setSourceAddress(address: Uint8Array): Datagram {
        if (address.length !== 2208) throw new Error("Invalid address length");
        this.sourceAddress = address;
        return this;
    }

    /**
     * Sets the destination address for the transaction
     * @param address - Destination address (2208 bytes)
     * @returns this for method chaining
     */
    public setDestinationAddress(address: Uint8Array): Datagram {
        if (address.length !== 2208) throw new Error("Invalid address length");
        this.destinationAddress = address;
        return this;
    }

    /**
     * Sets the change address for the transaction
     * @param address - Change address (2208 bytes)
     * @returns this for method chaining
     */
    public setChangeAddress(address: Uint8Array): Datagram {
        if (address.length !== 2208) throw new Error("Invalid address length");
        this.changeAddress = address;
        return this;
    }

    /**
     * Sets the operation type for the datagram
     * @param op - Operation type
     * @returns this for method chaining
     */
    public setOperation(op: Operation): Datagram {
        this.operation = op;
        return this;
    }

    /**
     * Sets the amount to send
     * @param amount - Amount in Mochimo units
     * @returns this for method chaining
     */
    public setAmount(amount: bigint): Datagram {
        this.writeBigIntToBuffer(this.totalSend, 0, amount, 8);
        return this;
    }

    /**
     * Sets the transaction fee
     * @param fee - Fee in Mochimo units
     * @returns this for method chaining
     */
    public setFee(fee: bigint): Datagram {
        this.writeBigIntToBuffer(this.fee, 0, fee, 8);
        return this;
    }

    /**
     * Sets the transaction signature
     * @param signature - WOTS signature (2144 bytes)
     * @returns this for method chaining
     */
    public setSignature(signature: Uint8Array): Datagram {
        if (signature.length !== 2144) throw new Error("Invalid signature length");
        this.signature = signature;
        return this;
    }

    /**
     * Sets a capability flag
     * @param capability - Capability to set
     * @param value - Flag value
     * @returns this for method chaining
     */
    public setCapability(capability: Capability, value: boolean): Datagram {
        this.flags[capability] = value;
        return this;
    }

    /**
     * Checks if a capability is supported
     * @param capability - Capability to check
     * @returns true if capability is supported
     */
    public isCapabilitySupported(capability: Capability): boolean {
        return this.flags[capability];
    }

    /**
     * Checks if peer should be added to peer list
     * @returns true if peer should be added
     */
    public isAddToPeerList(): boolean {
        return this.transactionBufferLength !== Datagram.DO_NOT_ADD_TO_PEER_LIST_TRANSACTION_BUFFER_LENGTH;
    }

    /**
     * Sets whether peer should be added to peer list
     * @param value - true to add peer to list
     * @returns this for method chaining
     */
    public setAddToPeerList(value: boolean): Datagram {
        this.transactionBufferLength = value ? 
            Datagram.ADD_TO_PEER_LIST_TRANSACTION_BUFFER_LENGTH : 
            Datagram.DO_NOT_ADD_TO_PEER_LIST_TRANSACTION_BUFFER_LENGTH;
        return this;
    }
    
    /**
     * Sets the change amount
     * @param amount - Change amount in Mochimo units
     * @returns this for method chaining
     */
    public setTotalChange(amount: bigint): Datagram {
        this.writeBigIntToBuffer(this.totalChange, 0, amount, 8);
        return this;
    }

    /**
     * Serializes the datagram to a byte array
     * @returns Serialized datagram
     * @throws Error if operation is not set
     */
    public serialize(): Uint8Array {
        if (!this.operation) {
            throw new Error("Operation not set");
        }

        const buffer = new Uint8Array(Datagram.LENGTH);
        let offset = 0;

        // Write version
        buffer[offset++] = this.version;

        // Write flags
        const flagByte = parseInt(this.flags.map(b => b ? '1' : '0').join(''), 2);
        buffer[offset++] = flagByte;

        // Write network (2 bytes, little-endian)
        buffer[offset++] = this.network & 0xFF;
        buffer[offset++] = (this.network >> 8) & 0xFF;

        // Write id1 (2 bytes, little-endian)
        buffer[offset++] = this.id1 & 0xFF;
        buffer[offset++] = (this.id1 >> 8) & 0xFF;

        // Write id2 (2 bytes, little-endian)
        buffer[offset++] = this.id2 & 0xFF;
        buffer[offset++] = (this.id2 >> 8) & 0xFF;

        // Write operation (2 bytes, little-endian)
        buffer[offset++] = this.operation & 0xFF;
        buffer[offset++] = (this.operation >> 8) & 0xFF;

        // Write cblock (8 bytes, little-endian)
        this.writeBigIntToBuffer(buffer, offset, this.cblock, 8);
        offset += 8;

        // Write blocknum (8 bytes, little-endian)
        this.writeBigIntToBuffer(buffer, offset, this.blocknum, 8);
        offset += 8;

        // Write hashes and weight
        buffer.set(this.cblockhash, offset);
        offset += 32;
        buffer.set(this.pblockhash, offset);
        offset += 32;
        buffer.set(this.weight, offset);
        offset += 32;

        // Write transaction buffer length (2 bytes, little-endian)
        buffer[offset++] = this.transactionBufferLength & 0xFF;
        buffer[offset++] = (this.transactionBufferLength >> 8) & 0xFF;

        // Write addresses
        buffer.set(this.sourceAddress, offset);
        offset += 2208;
        buffer.set(this.destinationAddress, offset);
        offset += 2208;
        buffer.set(this.changeAddress, offset);
        offset += 2208;

        // Write amounts
        buffer.set(this.totalSend, offset);
        offset += 8;
        buffer.set(this.totalChange, offset);
        offset += 8;
        buffer.set(this.fee, offset);
        offset += 8;

        // Write signature
        buffer.set(this.signature, offset);
        offset += 2144;

        // Calculate and write CRC
        this.crc = this.calculateCRC16(buffer.slice(0, offset));
        buffer[offset++] = this.crc & 0xFF;
        buffer[offset++] = (this.crc >> 8) & 0xFF;

        // Write trailer
        buffer[offset++] = this.trailer & 0xFF;
        buffer[offset++] = (this.trailer >> 8) & 0xFF;

        return buffer;
    }
} 