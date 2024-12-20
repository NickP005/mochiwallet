import { sha256FromString } from './utils/hash';
import { Account } from './account';

export class HDWallet {
    private readonly masterSeed: string;
    private readonly accounts: Map<number, Account>;

    constructor(masterSeed: string) {
        if (!masterSeed || masterSeed.length !== 64) { // 32 bytes = 64 hex chars
            throw new Error('Master seed must be 32 bytes (64 hex characters)');
        }
        this.masterSeed = masterSeed;
        this.accounts = new Map();
    }

    public createAccount(accountIndex: number): Account {
        if (this.accounts.has(accountIndex)) {
            throw new Error(`Account ${accountIndex} already exists`);
        }

        const baseSeed = this.generateBaseSeed(accountIndex);
        const account = new Account(baseSeed);
        this.accounts.set(accountIndex, account);
        
        return account;
    }

    public getAccount(accountIndex: number): Account {
        const account = this.accounts.get(accountIndex);
        if (!account) {
            throw new Error(`Account ${accountIndex} does not exist`);
        }
        return account;
    }

    private generateBaseSeed(accountIndex: number): string {
        return Buffer.from(sha256FromString(this.masterSeed + accountIndex.toString())).toString('hex');
    }

    public getAccountCount(): number {
        return this.accounts.size;
    }

    public listAccounts(): { index: number, wotsIndex: number, tag: string }[] {
        const accounts: { index: number, wotsIndex: number, tag: string }[] = [];
        this.accounts.forEach((account, index) => {
            accounts.push({
                index,
                wotsIndex: account.getCurrentIndex(),
                tag: account.getTag()
            });
        });
        return accounts;
    }
} 