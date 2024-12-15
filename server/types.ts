export interface NetworkNode {
  ip: string
  port: number
  status: string
  version: string
}

export interface BlockchainInfo {
  block: number
  bnum: number
  bhash: string
  timestamp: number
  difficulty: number
  transactions: number
}

export interface Balance {
  address: string
  balance: string
  tag?: string
}

export interface Transaction {
  transaction: string
  recipients?: number
}

export interface ApiResponse<T> {
  status: 'success' | 'error'
  data?: T
  error?: string
} 