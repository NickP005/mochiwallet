import type { BlockchainInfo, Balance } from '../../../server/types'

export interface WalletState {
  address: string | null
  balance: string | null
  isInitialized: boolean
}

export interface BlockchainState {
  info: BlockchainInfo | null
  loading: boolean
  error: string | null
}

export interface RootState {
  wallet: WalletState
  blockchain: BlockchainState
} 