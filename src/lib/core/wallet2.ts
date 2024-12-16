import { Mnemonic } from "./mnemonic"
import { sha256 } from "./wots"
import { wots_public_key_gen } from "./wots"
export interface WOTSKeyPair {
    privateKey: string
    publicKey: string
}

export interface WalletAccount {
    index: number
    baseSeed: string
    currentWOTS: WOTSKeyPair
    nextWOTS: WOTSKeyPair
    usedAddresses: string[]  // Track used addresses
    tag: string  // Add tag field
    isActivated?: boolean  // Add activation status
}

export interface MasterWallet {
    mnemonic: string
    masterSeed: Uint8Array
    accounts: { [index: number]: WalletAccount }
    password?: string  // Add password to the interface
}

export class WalletCore2 {
    static createMasterWallet(passphrase: string = '', existingMnemonic?: string): MasterWallet {
        const mnemonic = existingMnemonic || Mnemonic.generate()
        const masterSeed = Mnemonic.toSeed(mnemonic, passphrase)

        // Ensure masterSeed is Uint8Array
        const masterSeedArray = masterSeed instanceof Uint8Array
            ? masterSeed
            : new Uint8Array(Object.values(masterSeed))

        return {
            mnemonic,
            masterSeed: masterSeedArray,
            accounts: {},
            password: passphrase  // Store password in wallet
        }
    }
    public static  generateWots(seed: string, tag = undefined) {
        const private_seed = CryptoJS.SHA256(seed + "seed")
        const public_seed = CryptoJS.SHA256(seed + "publ")
        const addresse_seed = CryptoJS.SHA256(seed + "addr")
        const public_key = wots_public_key_gen(private_seed, public_seed, addresse_seed)
        const wots = [...public_key]
        wots.pushArray(public_seed);
        wots.pushArray(addresse_seed.slice(0, 20));
        if (tag === undefined || tag.length !== 24) {
            //default tag, cause it is always equal is a waste of resources making a return with it
            wots.pushArray([66, 0, 0, 0, 14, 0, 0, 0, 1, 0, 0, 0]);
        } else {
            wots.pushArray(tag.hexToByteArray());
        }
        return [wots, private_seed, public_seed, addresse_seed];
    }
}