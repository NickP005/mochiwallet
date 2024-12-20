/**
 * Utility functions for byte array manipulation and conversion.
 */
export class Utils {
    /**
     * Converts a byte array to little-endian format
     * @param value - Source byte array
     * @returns New byte array with bytes in reverse order
     */
    public static toLittleEndian(value: Uint8Array): Uint8Array {
        const result = new Uint8Array(value.length);
        for (let i = 0; i < value.length; i++) {
            result[i] = value[value.length - 1 - i];
        }
        return result;
    }

    /**
     * Converts a BigInt value to a fixed-length byte array in little-endian format
     * Used primarily for transaction amounts and fees
     * @param value - BigInt value to convert
     * @param length - Desired length of resulting byte array
     * @returns Byte array of specified length containing the value
     */
    public static fitToLength(value: bigint, length: number): Uint8Array {
        const buffer = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            buffer[i] = Number(value & BigInt(0xFF));
            value = value >> BigInt(8);
        }
        return buffer;
    }

    /**
     * Compares two byte arrays for equality
     * @param a - First byte array
     * @param b - Second byte array
     * @returns true if arrays have same length and all bytes match
     */
    public static areEqual(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) return false;
        }
        return true;
    }

    /**
     * Converts a BigInt value to a fixed-length byte array in big-endian format
     * Used primarily for WOTS operations and padding
     * @param value - BigInt value to convert
     * @param length - Desired length of resulting byte array
     * @returns Byte array of specified length containing the value
     */
    public static toBytes(value: bigint, length: number): Uint8Array {
        const result = new Uint8Array(length);
        for (let i = 0; i < length; i++) {
            result[length - 1 - i] = Number((value >> BigInt(8 * i)) & BigInt(0xFF));
        }
        return result;
    }
} 