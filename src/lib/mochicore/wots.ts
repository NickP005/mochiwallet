import { sha256FromString, sha256FromBytes } from './utils/hash';

interface WotsAddress {
    [key: string]: Uint8Array;
}

export class WOTS {
    private readonly PARAMSN: number = 32;
    private readonly WOTSW: number = 16;
    private readonly WOTSLOGW: number = 4;
    private readonly WOTSLEN1: number;
    private readonly WOTSLEN2: number = 3;
    private readonly WOTSLEN: number;
    private readonly WOTSSIGBYTES: number;
    
    private readonly TXSIGLEN: number = 2144;
    private readonly TXADDRLEN: number = 2208;
    
    private readonly XMSS_HASH_PADDING_F: number = 0;
    private readonly XMSS_HASH_PADDING_PRF: number = 3;

    private readonly PUBLIC_KEY_SIZE: number = 2144;
    private readonly SIGNATURE_SIZE: number = 2144;

    constructor() {
        this.WOTSLEN1 = Math.floor((8 * this.PARAMSN) / this.WOTSLOGW);
        this.WOTSLEN = this.WOTSLEN1 + this.WOTSLEN2;
        this.WOTSSIGBYTES = this.WOTSLEN * this.PARAMSN;
    }

    public generateKeyPairFrom(wotsSeed: string, tag?: string): Uint8Array {
        if (!wotsSeed) {
            throw new Error('WOTS seed cannot be empty');
        }
        
        if (tag) {
            console.log('Received tag:', tag);
            console.log('Tag length:', tag.length);
            console.log('Tag matches regex:', /^[0-9A-Fa-f]{24}$/.test(tag));
            
            // Check if it's a valid hex string
            if (!/^[0-9A-Fa-f]{24}$/.test(tag)) {
                throw new Error('Tag must be 12 bytes (24 hex characters)');
            }
        }
        
        const privateSeed = sha256FromString(wotsSeed + "seed");
        const publicSeed = sha256FromString(wotsSeed + "publ");
        const addrSeed = sha256FromString(wotsSeed + "addr");
        
        let wotsPublic = this.publicKeyGen(privateSeed, publicSeed, addrSeed);
        
        // Append additional data
        wotsPublic = this.concatUint8Arrays([
            wotsPublic,
            publicSeed,
            addrSeed.slice(0, 20),
            tag ? this.hexStringToUint8Array(tag) : new Uint8Array([66, 0, 0, 0, 14, 0, 0, 0, 1, 0, 0, 0])
        ]);

        return wotsPublic;
    }

    private concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
        // Pre-calculate total length
        const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
        const result = new Uint8Array(totalLength);
        
        // Single pass through arrays
        let offset = 0;
        for (const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        
        return result;
    }

    private hexStringToUint8Array(hex: string): Uint8Array {
        if (hex.length % 2 !== 0) {
            throw new Error('Hex string must have an even number of characters');
        }
        
        const bytes = new Uint8Array(hex.length / 2);
        
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
        }
        
        return bytes;
    }

    private publicKeyGen(seed: Uint8Array, pubSeed: Uint8Array, addrBytes: Uint8Array): Uint8Array {
        const privateKey = this.expandSeed(seed);
        const publicKey = new Uint8Array(2144); // Pre-allocate for better performance
        let addr = this.bytesToAddr(addrBytes);
        let offset = 0;

        for (let i = 0; i < this.WOTSLEN; i++) {
            this.setChainAddr(i, addr);
            const privateKeyPortion = privateKey.slice(i * this.PARAMSN, (i + 1) * this.PARAMSN);
            const chainResult = this.genChain(privateKeyPortion, 0, this.WOTSW - 1, pubSeed, addr);
            publicKey.set(chainResult, offset);
            offset += this.PARAMSN;
        }

        return publicKey;
    }

    private expandSeed(seed: Uint8Array): Uint8Array {
        const outSeeds = new Uint8Array(this.WOTSLEN * this.PARAMSN);
        
        for (let i = 0; i < this.WOTSLEN; i++) {
            const ctr = this.ullToBytes(this.PARAMSN, [i]);
            const seedPortion = this.prf(ctr, seed);
            outSeeds.set(seedPortion, i * this.PARAMSN);
        }

        return outSeeds;
    }

    private prf(input: Uint8Array, key: Uint8Array): Uint8Array {
        const buf = new Uint8Array(32 * 3);
        let offset = 0;

        // Add padding
        buf.set(this.ullToBytes(this.PARAMSN, [this.XMSS_HASH_PADDING_PRF]), offset);
        offset += this.PARAMSN;

        // Add key
        buf.set(this.byteCopy(key, this.PARAMSN), offset);
        offset += this.PARAMSN;

        // Add input
        buf.set(this.byteCopy(input, 32), offset);

        return sha256FromBytes(buf);
    }

    private ullToBytes(outlen: number, input: number[]): Uint8Array {
        const outArray = new Uint8Array(outlen);
        const value = input[0] || 0;
        
        // Handle multi-byte integers properly
        for (let i = outlen - 1; i >= 0; i--) {
            outArray[i] = value & 0xFF;
        }
        return outArray;
    }

    private byteCopy(source: Uint8Array, numBytes: number): Uint8Array {
        const output = new Uint8Array(numBytes);
        output.set(source.slice(0, numBytes));
        return output;
    }

    private bytesToAddr(addrBytes: Uint8Array): WotsAddress {
        const outAddr: WotsAddress = {};
        for (let i = 0; i < 8; i++) {
            outAddr[i.toString()] = this.ullToBytes(4, 
                Array.from(addrBytes.slice(i * 4, (i + 1) * 4)));
        }
        return outAddr;
    }

    private setChainAddr(chainAddress: number, addr: WotsAddress): void {
        addr["5"] = new Uint8Array([0, 0, 0, chainAddress]);
    }

    private genChain(
        input: Uint8Array, 
        start: number, 
        steps: number, 
        pubSeed: Uint8Array, 
        addr: WotsAddress
    ): Uint8Array {
        let out = this.byteCopy(input, this.PARAMSN);
        
        for (let i = start; i < start + steps && i < this.WOTSW; i++) {
            this.setHashAddr(i, addr);
            out = this.tHash(out, pubSeed, addr);
        }
        
        return out;
    }

    private tHash(input: Uint8Array, pubSeed: Uint8Array, addr: WotsAddress): Uint8Array {
        const buf = new Uint8Array(32 * 3);
        let offset = 0;

        // Add padding
        buf.set(this.ullToBytes(this.PARAMSN, [this.XMSS_HASH_PADDING_F]), offset);
        offset += this.PARAMSN;

        this.setKeyAndMask(0, addr);
        const addrBytes = this.addrToBytes(addr);
        const key = this.prf(addrBytes, pubSeed);
        buf.set(key, offset);
        offset += this.PARAMSN;

        this.setKeyAndMask(1, addr);
        const addrBytes2 = this.addrToBytes(addr);
        const bitmask = this.prf(addrBytes2, pubSeed);
        
        const xorBitmaskInput = new Uint8Array(this.PARAMSN);
        for (let i = 0; i < this.PARAMSN; i++) {
            xorBitmaskInput[i] = input[i] ^ bitmask[i];
        }
        buf.set(xorBitmaskInput, offset);

        return sha256FromBytes(buf);
    }

    private setHashAddr(hash: number, addr: WotsAddress): void {
        addr["6"] = new Uint8Array([0, 0, 0, hash]);
    }

    private setKeyAndMask(keyAndMask: number, addr: WotsAddress): void {
        addr["7"] = new Uint8Array([0, 0, 0, keyAndMask]);
    }

    private addrToBytes(addr: WotsAddress): Uint8Array {
        const outBytes = new Uint8Array(32);
        for (let i = 0; i < 8; i++) {
            outBytes.set(addr[i.toString()] || new Uint8Array(4), i * 4);
        }
        return outBytes;
    }

    public generateSignatureFrom(wotsSeed: string, payload: Uint8Array): Uint8Array {
        const privateSeed = sha256FromString(wotsSeed + "seed");
        const publicSeed = sha256FromString(wotsSeed + "publ");
        const addrSeed = sha256FromString(wotsSeed + "addr");
        const toSign = sha256FromBytes(payload);
        
        console.log('Signing message hash:', toSign);
        return this.wotsSign(toSign, privateSeed, publicSeed, addrSeed);
    }

    private wotsSign(
        msg: Uint8Array, 
        seed: Uint8Array, 
        pubSeed: Uint8Array, 
        addrBytes: Uint8Array
    ): Uint8Array {
        const privateKey = this.expandSeed(seed);
        const signature = new Uint8Array(2144);
        const lengths = this.chainLengths(msg);
        const addr = this.bytesToAddr(addrBytes);
        let offset = 0;

        for (let i = 0; i < this.WOTSLEN; i++) {
            this.setChainAddr(i, addr);
            const privateKeyPortion = privateKey.slice(i * this.PARAMSN, (i + 1) * this.PARAMSN);
            const chainResult = this.genChain(privateKeyPortion, 0, lengths[i], pubSeed, addr);
            signature.set(chainResult, offset);
            offset += this.PARAMSN;
        }

        return signature;
    }

    private chainLengths(msg: Uint8Array): number[] {
        const lengths = new Array(67);
        const baseW = this.baseW(this.WOTSLEN1, msg);
        const checksum = this.wotsChecksum(baseW);
        return [...baseW, ...checksum];
    }

    private baseW(outlen: number, input: Uint8Array): number[] {
        const output = new Array(outlen);
        let in_ = 0;
        let total = 0;
        let bits = 0;

        for (let i = 0; i < outlen; i++) {
            if (bits === 0) {
                total = input[in_] || 0;
                in_++;
                bits += 8;
            }
            bits -= this.WOTSLOGW;
            output[i] = (total >> bits) & (this.WOTSW - 1);
        }

        return output;
    }

    private wotsChecksum(msgBaseW: number[]): number[] {
        let csum = 0;
        for (let i = 0; i < this.WOTSLEN1; i++) {
            csum += this.WOTSW - 1 - msgBaseW[i];
        }

        csum = csum << (8 - ((this.WOTSLEN2 * this.WOTSLOGW) % 8));
        const csumBytes = this.ullToBytes(
            Math.floor((this.WOTSLEN2 * this.WOTSLOGW + 7) / 8), 
            [csum]
        );
        return this.baseW(this.WOTSLEN2, csumBytes);
    }

    public wotsPublicKeyFromSig(
        sig: Uint8Array,
        msg: Uint8Array,
        pubSeed: Uint8Array,
        addrBytes: Uint8Array
    ): Uint8Array {
        const addr = this.bytesToAddr(addrBytes);
        const lengths = this.chainLengths(msg);
        const publicKey = new Uint8Array(2144);
        let offset = 0;

        for (let i = 0; i < this.WOTSLEN; i++) {
            this.setChainAddr(i, addr);
            const signaturePortion = sig.slice(i * this.PARAMSN, (i + 1) * this.PARAMSN);
            const chainResult = this.genChain(
                signaturePortion,
                lengths[i],
                this.WOTSW - 1 - lengths[i],
                pubSeed,
                addr
            );
            publicKey.set(chainResult, offset);
            offset += this.PARAMSN;
        }

        return publicKey;
    }
} 