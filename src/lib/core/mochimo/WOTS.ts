import { WOTSHash } from "./WOTSHash";

export class WOTS {
    // Constants from Java
    public static readonly WOTSW: number = 16;
    public static readonly WOTSLOGW: number = 4;
    public static readonly PARAMSN: number = 32;
    public static readonly WOTSLEN1: number = 64;
    public static readonly WOTSLEN2: number = 3;
    public static readonly WOTSLEN: number = 67;
    public static readonly WOTSSIGBYTES: number = 2144;
    public static readonly TXSIGLEN: number = 2144;

    public static sign(
        sig: Uint8Array,
        msg: Uint8Array,
        seed: Uint8Array,
        pubSeed: Uint8Array,
        offset: number,
        addr: Uint8Array
    ): void {
        const pubSeedOffseted = new Uint8Array(pubSeed.length - offset);
        pubSeedOffseted.set(pubSeed.slice(offset));

        const lengths = new Int32Array(WOTS.WOTSLEN);
        WOTS.chainLengths(msg, lengths);

        WOTS.expandSeed(sig, seed);

        const bbaddr = new DataView(addr.buffer);
        
        for (let i = 0; i < WOTS.WOTSLEN; i++) {
            WOTSHash.setChainAddr(bbaddr, i);
            WOTS.genChain(
                sig, i * WOTS.PARAMSN,
                sig, i * WOTS.PARAMSN,
                0, lengths[i],
                pubSeedOffseted,
                bbaddr
            );
        }
    }

    public static pkFromSignature(
        signature: Uint8Array,
        msg: Uint8Array,
        pubSeed: Uint8Array,
        addr: Uint8Array
    ): Uint8Array {
        if(signature.length !== WOTS.TXSIGLEN) {
            throw new Error("Signature length is not correct")
        }
        const pk = new Uint8Array(WOTS.WOTSSIGBYTES);
        const lengths = new Int32Array(WOTS.WOTSLEN);
        const bbaddr = new DataView(addr.buffer);

        WOTS.chainLengths(msg, lengths);

        for (let i = 0; i < WOTS.WOTSLEN; i++) {
            WOTSHash.setChainAddr(bbaddr, i);
            WOTS.genChain(
                pk, i * WOTS.PARAMSN,
                signature, i * WOTS.PARAMSN,
                lengths[i],
                WOTS.WOTSW - 1 - lengths[i],
                pubSeed,
                bbaddr
            );
        }

        return pk;
    }

    private static chainLengths(msg: Uint8Array, destination: Int32Array): Int32Array {
        WOTS.baseW(msg, destination, 0, WOTS.WOTSLEN1);
        return WOTS.wotsChecksum(destination, WOTS.WOTSLEN1);
    }

    private static baseW(
        msg: Uint8Array,
        destination: Int32Array,
        offset: number,
        length: number
    ): Int32Array {
        let inIdx = 0;
        let outIdx = 0;
        let total = 0;
        let bits = 0;

        for (let consumed = 0; consumed < length; consumed++) {
            if (bits === 0) {
                total = msg[inIdx];
                inIdx++;
                bits += 8;
            }
            bits -= WOTS.WOTSLOGW;
            destination[outIdx + offset] = (total >> bits) & (WOTS.WOTSW - 1);
            outIdx++;
        }

        return destination;
    }

    private static wotsChecksum(msgBaseW: Int32Array, sumOffset: number): Int32Array {
        let csum = 0;

        for (let i = 0; i < WOTS.WOTSLEN1; i++) {
            csum += WOTS.WOTSW - 1 - msgBaseW[i];
        }

        csum = csum << WOTS.WOTSLOGW;
        const csumBytes = new Uint8Array(2);
        csumBytes[0] = (csum >> 8) & 0xFF;
        csumBytes[1] = csum & 0xFF;

        return WOTS.baseW(csumBytes, msgBaseW, sumOffset, msgBaseW.length - sumOffset);
    }

    private static expandSeed(outseeds: Uint8Array, inseed: Uint8Array): void {
        for (let i = 0; i < WOTS.WOTSLEN; i++) {
            const ctr = new Uint8Array(WOTS.PARAMSN);
            const view = new DataView(ctr.buffer);
            view.setInt32(0, i, true); // little-endian
            WOTSHash.prf(outseeds, i * WOTS.PARAMSN, ctr, inseed);
        }
    }

    private static genChain(
        out: Uint8Array,
        outOffset: number,
        input: Uint8Array,
        inOffset: number,
        start: number,
        steps: number,
        pubSeed: Uint8Array,
        addr: DataView
    ): void {
        out.set(input.slice(inOffset, inOffset + WOTS.PARAMSN), outOffset);

        for (let i = start; i < start + steps && i < WOTS.WOTSW; i++) {
            WOTSHash.setHashAddr(addr, i);
            WOTSHash.thashF(out, outOffset, out, outOffset, pubSeed, addr);
        }
    }
}
