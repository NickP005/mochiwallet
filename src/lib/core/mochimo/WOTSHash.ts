import { Mochimo } from "./Mochimo";
import { Utils } from "./Utils";

/**
 * Winternitz One-Time Signature (WOTS) Hash implementation.
 * Provides cryptographic operations for the WOTS signature scheme.
 */
export class WOTSHash {
    /** Padding constant for XMSS hash function F */
    public static readonly XMSS_HASH_PADDING_F: number = 0;
    
    /** Padding constant for XMSS pseudo-random function */
    public static readonly XMSS_HASH_PADDING_PRF: number = 3;

    /**
     * Sets the chain address in the WOTS hash address structure
     * @param addr - DataView containing the address structure
     * @param chain - Chain index to set
     */
    public static setChainAddr(addr: DataView, chain: number): void {
        addr.setInt32(20, chain, true); // true for little-endian
    }

    /**
     * Sets the hash address in the WOTS hash address structure
     * @param addr - DataView containing the address structure
     * @param hash - Hash index to set
     */
    public static setHashAddr(addr: DataView, hash: number): void {
        addr.setInt32(24, hash, true);
    }

    /**
     * Sets the key and mask address in the WOTS hash address structure
     * @param addr - DataView containing the address structure
     * @param keyAndMask - Key and mask value to set
     * @private
     */
    private static setKeyAndMask(addr: DataView, keyAndMask: number): void {
        addr.setInt32(28, keyAndMask, true);
    }

    /**
     * Converts the address structure to a byte array in little-endian format
     * @param addr - DataView containing the address structure
     * @returns Uint8Array containing the address bytes in little-endian format
     * @private
     */
    private static addrToBytes(addr: DataView): Uint8Array {
        const littleEndians = new Uint8Array(addr.byteLength);

        for (let i = 0; i < littleEndians.length; i += 4) {
            const b0 = addr.getUint8(i);
            const b1 = addr.getUint8(i + 1);
            const b2 = addr.getUint8(i + 2);
            const b3 = addr.getUint8(i + 3);
            littleEndians[i] = b3;
            littleEndians[i + 1] = b2;
            littleEndians[i + 2] = b1;
            littleEndians[i + 3] = b0;
        }

        return littleEndians;
    }

    /**
     * Pseudo-random function (PRF) for WOTS operations
     * @param out - Output buffer for the PRF result
     * @param offset - Offset in the output buffer to write the result
     * @param input - Input data for the PRF
     * @param key - Key data for the PRF
     * @returns The output buffer containing the PRF result
     */
    public static prf(
        out: Uint8Array,
        offset: number,
        input: Uint8Array,
        key: Uint8Array
    ): Uint8Array {
        const buff = new Uint8Array(96);
        
        // Convert 3 to 32-byte array in little-endian
        const paddingBytes = Utils.toBytes(BigInt(WOTSHash.XMSS_HASH_PADDING_PRF), 32);
        buff.set(paddingBytes, 0);

        // Copy key and input
        buff.set(key, 32);
        buff.set(input, 64);

        // Hash and copy to output
        const hash = Mochimo.hash(buff);
        out.set(hash, offset);

        return out;
    }

    /**
     * WOTS hash function F for chain operations
     * @param out - Output buffer for the hash result
     * @param outOffset - Offset in the output buffer to write the result
     * @param input - Input data to hash
     * @param inOffset - Offset in the input buffer to read from
     * @param pubSeed - Public seed for the hash operation
     * @param addr - Address structure for the hash operation
     */
    public static thashF(
        out: Uint8Array,
        outOffset: number,
        input: Uint8Array,
        inOffset: number,
        pubSeed: Uint8Array,
        addr: DataView
    ): void {
        const buf = new Uint8Array(96);
        
        // Convert 0 to 32-byte array in little-endian
        const paddingBytes = Utils.toBytes(BigInt(WOTSHash.XMSS_HASH_PADDING_F), 32);
        buf.set(paddingBytes, 0);

        // First PRF
        WOTSHash.setKeyAndMask(addr, 0);
        let addrAsBytes = WOTSHash.addrToBytes(addr);
        WOTSHash.prf(buf, 32, addrAsBytes, pubSeed);

        // Second PRF for bitmask
        WOTSHash.setKeyAndMask(addr, 1);
        addrAsBytes = WOTSHash.addrToBytes(addr);
        const bitmask = new Uint8Array(32);
        WOTSHash.prf(bitmask, 0, addrAsBytes, pubSeed);

        // XOR operation
        for (let i = 0; i < 32; i++) {
            buf[64 + i] = input[i + inOffset] ^ bitmask[i];
        }

        // Final hash and copy to output
        const hash = Mochimo.hash(buf);
        out.set(hash, outOffset);
    }
} 