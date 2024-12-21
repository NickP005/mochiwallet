import { sha256FromString } from './utils/hash';
import { WOTS } from './wots';

export class Account {
    private readonly seed: string;
    private currentIndex: number;
    public readonly tag: string;

    constructor(seed: string) {
        if (!seed || seed.length !== 64) {
            throw new Error('Account seed must be 32 bytes (64 hex characters)');
        }
        this.seed = seed;
        this.currentIndex = 0;
        this.tag = this.generateTag();
    }

    private generateTag(): string {
        return Buffer.from(sha256FromString(this.seed + 'tag')).toString('hex').slice(0, 24);
    }

    public getTag(): string {
        return this.tag;
    }

    public getCurrentIndex(): number {
        return this.currentIndex;
    }

    public incrementIndex(): void {
        this.currentIndex++;
    }

    /**
     * Gets WOTS seed for given index
     */
    public getWotsSeed(index: number): Uint8Array {
        return sha256FromString(this.seed + index.toString());
    }

    /**
     * Gets WOTS address for given index
     */
    public getWotsAddress(index: number): string {
        const wots = new WOTS();
        return Buffer.from(wots.generateKeyPairFrom(Buffer.from(this.getWotsSeed(index)).toString('hex'), this.tag)).toString('hex');
    }
} 