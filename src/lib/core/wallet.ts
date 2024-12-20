import { Buffer } from 'buffer'
import { Mnemonic } from './mnemonic'
import { HDWallet } from '../mochicore/hdwallet'
import { MochimoService } from '../services/mochimo'
import { Transaction } from '../mochicore/transaction'



export interface WalletAccount {
  index: number          // Account index
  tag: string           // Account tag
  wotsIndex: number     // Current WOTS index
  isActivated?: boolean // Activation status
  name: string
}

export interface MasterWallet {
  mnemonic: string
  masterSeed: Uint8Array
  accounts: { [index: number]: WalletAccount }
}

export class WalletCore {
  /**
   * Creates a new master wallet
   */
  static createMasterWallet(password: string, mnemonic?: string): MasterWallet {
    if (!mnemonic) {
      mnemonic = Mnemonic.generate()
    }
    const masterSeed = Mnemonic.toSeed(mnemonic, password)

    return {
      mnemonic,
      masterSeed,
      accounts: {}
    }
  }

  /**
   * Creates a new account in the wallet
   */
  static createAccount(wallet: MasterWallet, accountIndex: number): WalletAccount {
    if (wallet.accounts[accountIndex]) {
      throw new Error(`Account ${accountIndex} already exists`)
    }

    // Create HDWallet instance
    const hdwallet = new HDWallet(Buffer.from(wallet.masterSeed).toString('hex'))
    
    // Create account using HDWallet
    const account = hdwallet.createAccount(accountIndex)
    
    // Convert to our WalletAccount format
    const walletAccount: WalletAccount = {
      index: accountIndex,
      tag: account.getTag(),
      wotsIndex: account.getCurrentIndex(),
      isActivated: false,
      name: 'Account ' + (accountIndex + 1)
    }

    wallet.accounts[accountIndex] = walletAccount
    return walletAccount
  }

  /**
   * Creates and signs a transaction
   */
  static async createTransaction(
    wallet: MasterWallet,
    accountIndex: number,
    destinationTag: string,
    amount: bigint,
    fee: bigint = 1000n
  ): Promise<Uint8Array> {
    // Validate inputs
    if (amount <= 0n) throw new Error('Amount must be positive')
    if (fee < 0n) throw new Error('Fee cannot be negative')

    const account = wallet.accounts[accountIndex]
    if (!account) throw new Error('Account not found')

    // Create HDWallet instance
    const hdwallet = new HDWallet(Buffer.from(wallet.masterSeed).toString('hex'))
    const hdAccount = hdwallet.getAccount(accountIndex)

    // Get source address info
    const sourceTagResponse = await MochimoService.resolveTag(account.tag)
    if (!sourceTagResponse.success || !sourceTagResponse.addressConsensus) {
      throw new Error('Failed to resolve source tag')
    }

    // Get destination address info
    const destTagResponse = await MochimoService.resolveTag(destinationTag)
    if (!destTagResponse.success || !destTagResponse.addressConsensus) {
      throw new Error('Failed to resolve destination tag')
    }

    const currentBalance = BigInt(sourceTagResponse.balanceConsensus || '0')
    if (currentBalance < (amount + fee)) {
      throw new Error(`Insufficient balance: have ${currentBalance}, need ${amount + fee}`)
    }

    const changeAmount = currentBalance - amount - fee

    // Get addresses and secret
    const sourceWOTS = hdAccount.getWotsAddress(account.wotsIndex)
    const changeWOTS = hdAccount.getWotsAddress(account.wotsIndex + 1)
    const destinationWOTS = Buffer.from(destTagResponse.addressConsensus, 'hex')
    return Transaction.sign({
      balance: currentBalance,
      payment: amount,
      fee: fee,
      changeAmount: changeAmount,
      source: sourceWOTS,
      wotsSeed: hdAccount.generateWotsSeed(account.wotsIndex),
      destination: destinationWOTS,
      change: changeWOTS
    })
  }

  /**
   * Checks account activation status
   */
  static async checkActivationStatus(account: WalletAccount): Promise<boolean> {
    try {
      const response = await MochimoService.resolveTag(account.tag)
      account.isActivated = Boolean(response.success && response.addressConsensus)
      return account.isActivated
    } catch (error) {
      console.error('Error checking activation status:', error)
      account.isActivated = false
      return false
    }
  }
  static async activateAccount(wallet: MasterWallet, accountIndex: number): Promise<boolean> {
    try {
      const account = wallet.accounts[accountIndex]
      if (!account) {
        throw new Error('Account not found')
      }
      const hdwallet = new HDWallet(Buffer.from(wallet.masterSeed).toString('hex'))
      const hdAccount = hdwallet.getAccount(accountIndex)

      const currentAddress = hdAccount.getWotsAddress(account.wotsIndex)

      console.log('Attempting to activate account:', {
        tag: account.tag,
        address: currentAddress.slice(0, 64) + '...'
      })

      const response = await MochimoService.activateTag(Buffer.from(currentAddress).toString('hex'))

      if (response.success) {
        console.log('Account activation successful:', {
          tag: account.tag,
          txid: response.data?.txid,
          message: response.data?.message
        })
        return true
      } else {
        console.log('Account activation failed:', {
          tag: account.tag,
          error: response.error
        })
        return false
      }
    } catch (error) {
      console.error('Error activating account:', error)
      return false
    }
  }
  static computeWOTSAddress(masterSeed: Uint8Array, account: WalletAccount, wotsIndex: number): string {
    const hdwallet = new HDWallet(Buffer.from(masterSeed).toString('hex'))
    const hdAccount = hdwallet.getAccount(account.index)
    return Buffer.from(hdAccount.getWotsAddress(wotsIndex)).toString('hex')
  }
} 