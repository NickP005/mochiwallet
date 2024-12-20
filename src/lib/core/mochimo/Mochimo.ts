import CryptoJS from 'crypto-js'

import { Utils } from './Utils';
const SHA256 = CryptoJS.SHA256;
const lib = CryptoJS.lib;
const enc = CryptoJS.enc;
/**
 * Core Mochimo protocol implementation.
 * Provides cryptographic operations, constants, and utility functions for the Mochimo blockchain.
 */
export class Mochimo {
    // Version and network constants
    /** Protocol version number */
    public static readonly VERSION: number = 4;
    /** Network identifier */
    public static readonly NETWORK: number = 1337;
    /** Trailer magic number */
    public static readonly TRAILER: number = 43981;

    // Transaction constants
    /** Length of a transaction address in bytes */
    public static readonly TXADDRLEN: number = 2208;
    /** Length of transaction amount field in bytes */
    public static readonly TXAMOUNT: number = 8;
    /** Length of transaction signature in bytes */
    public static readonly TXSIGLEN: number = 2144;
    /** Length of hash values in bytes */
    public static readonly HASHLEN: number = 32;
    /** Total length of a transaction in bytes */
    public static readonly TRANLEN: number = 8792;
    /** Length of data to be hashed for signatures */
    public static readonly SIG_HASH_COUNT: number = 6648;

    // Block constants
    /** Length of block header in bytes */
    public static readonly BLOCK_HEADER_LENGTH: number = 2220;
    /** Length of block trailer in bytes */
    public static readonly BLOCK_TRAILER_LENGTH: number = 160;
    /** Maximum number of transactions per block */
    public static readonly MAX_TRANSACTION_PER_BLOCK: number = 32768;

    // Other constants
    /** Bridge protocol identifier */
    public static readonly BRIDGE: number = 949;
    /** Length of balance field in bytes */
    public static readonly BALANCE_LENGTH: number = 8;
    /** Number of trailers in proof of work */
    public static readonly POPOW_TRAILER_COUNT: number = 54;
    /** Default network port */
    public static readonly DEFAULT_PORT: number = 2095;
    /** Length of public key in bytes */
    public static readonly PK_LENGTH: number = 2144;
    /** Length of public seed in bytes */
    public static readonly PUB_SEED_LENGTH: number = 32;
    /** Length of RND2 field in bytes */
    public static readonly RND2_LENGTH: number = 32;
    /** Length of tag field in bytes */
    public static readonly TAG_LENGTH: number = 12;
    /** Offset of tag field in address */
    public static readonly TAG_OFFSET: number = 2196;
    /** Length of secret key in bytes */
    public static readonly SECRET_LENGTH: number = 32;

    // BigInt constants
    /** Minimum transaction fee in Mochimo units */
    public static readonly MINIMUM_TRANSACTION_FEE: bigint = BigInt(500);
    /** Number of blocks between neo-genesis blocks */
    public static readonly NEO_GENESIS_CYCLE: bigint = BigInt(256);
    /** Maximum value for 8-byte unsigned integer */
    public static readonly EIGHT_BYTE_MAX_UNSIGNED: bigint = BigInt("18446744073709551615");
    /** Block height for v2 protocol activation */
    public static readonly V2_TRIGGER_HEIGHT: bigint = BigInt(17185);
    /** Block height for v2 protocol fix activation */
    public static readonly V2_FIX_TRIGGER_HEIGHT: bigint = BigInt(17697);
    /** Block height for v2.3 protocol activation */
    public static readonly V23_TRIGGER_HEIGHT: bigint = BigInt(54321);
    /** Block height for v2.4 protocol activation */
    public static readonly V24_TRIGGER_HEIGHT: bigint = BigInt(75857);

    /**
     * Computes SHA-256 hash of data
     * @param data - Data to hash
     * @returns 32-byte hash result
     */
    public static hash(data: Uint8Array): Uint8Array {
        return this.hash_offset(data, 0, data.length);
    }

    /**
     * Computes SHA-256 hash of data with offset and length
     * @param data - Data buffer containing bytes to hash
     * @param offset - Starting position in data buffer
     * @param length - Number of bytes to hash
     * @returns 32-byte hash result
     */
    public static hash_offset(data: Uint8Array, offset: number, length: number): Uint8Array {
        try {
            // Convert Uint8Array portion to WordArray
            const words: number[] = [];
            for (let i = offset; i < offset + length; i += 4) {
                words.push(
                    (data[i] << 24) |
                    ((i + 1 < data.length ? data[i + 1] : 0) << 16) |
                    ((i + 2 < data.length ? data[i + 2] : 0) << 8) |
                    (i + 3 < data.length ? data[i + 3] : 0)
                );
            }
            
            const wordArray = lib.WordArray.create(words, length);
            
            // Compute hash
            const hash = SHA256(wordArray);
            
            // Convert WordArray back to Uint8Array
            const hashHex = hash.toString();
            const result = new Uint8Array(32); // 32 bytes for SHA-256
            
            for (let i = 0; i < 32; i++) {
                result[i] = parseInt(hashHex.substr(i * 2, 2), 16);
            }
            
            return result;
        } catch (e: any) {
            throw new Error(`Hashing failed: ${e.message}`);
        }
    }

    /**
     * Compares two addresses for equality, optionally ignoring the tag portion
     * @param address1 - First address to compare
     * @param address2 - Second address to compare
     * @param ignoreTag - If true, only compares up to the tag offset
     * @returns true if addresses match according to comparison rules
     */
    public static areEquals(address1: Uint8Array, address2: Uint8Array, ignoreTag: boolean): boolean {
        if (ignoreTag) {
            const end = this.TAG_OFFSET;
            for (let i = 0; i < end; i++) {
                if (address1[i] !== address2[i]) return false;
            }
            return true;
        }
        return Utils.areEqual(address1, address2);
    }

    /**
     * Gets current Unix timestamp in seconds
     * @returns Current time in seconds since Unix epoch
     */
    public static timestamp(): number {
        return Math.floor(Date.now() / 1000);
    }
} 