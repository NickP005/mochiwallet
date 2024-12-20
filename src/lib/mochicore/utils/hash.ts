import { SHA256 } from 'crypto-js';
import { lib } from 'crypto-js';

export function sha256FromString(ascii: string): Uint8Array {
    const wordArray = SHA256(ascii);
    return wordArrayToUint8Array(wordArray);
}

export function sha256FromBytes(bytes: Uint8Array): Uint8Array {
    const wordArray = lib.WordArray.create(Array.from(bytes));
    const hash = SHA256(wordArray);
    return wordArrayToUint8Array(hash);
}

// Helper function to convert CryptoJS WordArray to Uint8Array
function wordArrayToUint8Array(wordArray: any): Uint8Array {
    const words = wordArray.words;
    const sigBytes = wordArray.sigBytes;
    const u8 = new Uint8Array(sigBytes);
    
    for (let i = 0; i < sigBytes; i++) {
        const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        u8[i] = byte;
    }
    
    return u8;
} 