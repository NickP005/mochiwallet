import { Buffer } from 'buffer'
import { Mnemonic } from './mnemonic'
import { HDWallet } from '../mochicore/hdwallet'
import { MochimoService } from '../services/mochimo'
import { Transaction } from '../mochicore/transaction'

export interface WalletAccount {
  index: number          // Account index
  isActivated?: boolean // Activation status
  name: string
}

export interface MasterWallet {
  mnemonic: string
  masterSeed: string    // 32-byte hex string
  hdWallet: HDWallet    // HDWallet instance
}

export class WalletCore {
  /**
   * Creates a new master wallet
   */
  static createMasterWallet(password: string, mnemonic?: string): MasterWallet {
    if (!mnemonic) {
      mnemonic = Mnemonic.generate()
    }
    const masterSeed = Buffer.from(Mnemonic.toSeed(mnemonic, password)).toString('hex')
    const hdWallet = new HDWallet(masterSeed)

    return {
      mnemonic,
      masterSeed,
      hdWallet
    }
  }

  /**
   * Initializes wallet from storage data
   */
  static initializeFromStorage(walletData: any): MasterWallet {
    // Create new HDWallet instance
    const hdWallet = new HDWallet(walletData.masterSeed)
    
    // Re-create all stored accounts
    if (Array.isArray(walletData.accounts)) {
      walletData.accounts.forEach((index: number) => {
        hdWallet.createAccount(index)
      })
    }

    return {
      mnemonic: walletData.mnemonic,
      masterSeed: walletData.masterSeed,
      hdWallet
    }
  }

  /**
   * Creates a new account in the wallet
   */
  static createAccount(wallet: MasterWallet, accountIndex: number, name?: string): WalletAccount {
    const hdAccount = wallet.hdWallet.createAccount(accountIndex)
    
    return {
      index: accountIndex,
      isActivated: false,
      name: name || 'Account ' + (accountIndex + 1)
    }
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

    const hdAccount = wallet.hdWallet.getAccount(accountIndex)
    if (!hdAccount) throw new Error('Account not found')

    // Get source address info
    const sourceTagResponse = await MochimoService.resolveTag(hdAccount.tag)
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
    const currentIndex = hdAccount.getCurrentIndex()

    // Get addresses and secret
    const sourceWOTS = Buffer.from(hdAccount.getWotsAddress(currentIndex))
    const changeWOTS = Buffer.from(hdAccount.getWotsAddress(currentIndex + 1))
    const destinationWOTS = Buffer.from(destTagResponse.addressConsensus)

    return Transaction.sign({
      balance: currentBalance,
      payment: amount,
      fee: fee,
      changeAmount: changeAmount,
      source: sourceWOTS,
      wotsSeed: Buffer.from(hdAccount.getWotsSeed(currentIndex)).toString('hex'),
      destination: destinationWOTS,
      change: changeWOTS
    })
  }

  /**
   * Activates an account
   */
  static async activateAccount(wallet: MasterWallet, accountIndex: number): Promise<boolean> {
    try {
      const hdAccount = wallet.hdWallet.getAccount(accountIndex)
      if (!hdAccount) {
        throw new Error('Account not found')
      }

      const currentAddress = hdAccount.getWotsAddress(hdAccount.getCurrentIndex())

      console.log('Attempting to activate account:', {
        tag: hdAccount.tag,
        address: currentAddress.slice(0, 64) + '...'
      })

      const response = await MochimoService.activateTag(currentAddress)

      if (response.success) {
        console.log('Account activation successful:', {
          tag: hdAccount.tag,
          txid: response.data?.txid,
          message: response.data?.message
        })
        return true
      } else {
        console.log('Account activation failed:', {
          tag: hdAccount.tag,
          error: response.error
        })
        return false
      }
    } catch (error) {
      console.error('Error activating account:', error)
      return false
    }
  }

  /**
   * Checks account activation status
   */
  static async checkActivationStatus(wallet: MasterWallet, accountIndex: number): Promise<boolean> {
    try {
      const hdAccount = wallet.hdWallet.getAccount(accountIndex)
      if (!hdAccount) return false

      const response = await MochimoService.resolveTag(hdAccount.tag)
      return Boolean(response.success && response.addressConsensus)
    } catch (error) {
      console.error('Error checking activation status:', error)
      return false
    }
  }
} 