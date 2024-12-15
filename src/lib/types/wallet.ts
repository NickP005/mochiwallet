export interface Transaction {
  from: string
  to: string
  amount: string
  fee?: string
  timestamp: number
  signature?: string
}

export interface WalletInfo {
  address: string
  balance: string
  transactions: Transaction[]
  lastUpdated: number
}

export interface WalletStorage {
  encryptedPrivateKey: string
  publicKey: string
  address: string
}

export interface EncryptedWallet {
  data: string
  iv: string
  salt: string
} 