import { WOTS } from './wots';
import { sha256FromString } from './utils/hash';

export class Account {
    private readonly wots: WOTS;
    private readonly baseSeed: string;
    private currentWotsIndex: number;
    private readonly tag: string;

    constructor(baseSeed: string) {
        this.wots = new WOTS();
        this.baseSeed = baseSeed;
        this.currentWotsIndex = 0;
        this.tag = this.generateTag();
    }

    private generateTag(): string {
        // Generate a deterministic 12-byte tag from baseSeed
        const tagHash = sha256FromString(this.baseSeed + "tag");
        // Take first 12 bytes and convert to hex
        return Buffer.from(tagHash.slice(0, 12)).toString('hex');
    }

    public generateNextKeyPair(): { publicKey: Uint8Array, seed: string } {
        const wotsSeed = this.generateWotsSeed(this.currentWotsIndex);
        const publicKey = this.wots.generateKeyPairFrom(wotsSeed, this.tag);
        
        const result = {
            publicKey,
            seed: wotsSeed
        };
        
        this.currentWotsIndex++;
        return result;
    }

    public getWotsAddress(index: number): Uint8Array {
        const wotsSeed = this.generateWotsSeed(index);
        const publicKey = this.wots.generateKeyPairFrom(wotsSeed, this.tag);
        return publicKey;
    }

    public generateWotsSeed(index: number): string {
        return Buffer.from(sha256FromString(this.baseSeed + index.toString())).toString('hex');
    }

    public getCurrentIndex(): number {
        return this.currentWotsIndex;
    }

    public getTag(): string {
        return this.tag;
    }

    public signMessage(wotsSeed: string, message: Uint8Array): Uint8Array {
        return this.wots.generateSignatureFrom(wotsSeed, message);
    }
} 