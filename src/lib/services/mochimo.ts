
import type { NetworkNode, BlockchainInfo, Balance, ApiResponse } from '../../../server/types'

const API_URL = 'http://localhost:9000/api'

export class MochimoService {
  // Network endpoints
  static async getNetworkBalance(address: string): Promise<Balance> {
    try {
      const response = await fetch(`${API_URL}/net/balance/${address}`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching network balance:', error)
      throw error
    }
  }

  static async getNetworkResolve(tag: string): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/net/resolve/${tag}`)
      return await response.json()
    } catch (error) {
      console.error('Error resolving network tag:', error)
      throw error
    }
  }

  static async getNetworkNodes(): Promise<NetworkNode[]> {
    try {
      const response = await fetch(`${API_URL}/net/nodes`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching network nodes:', error)
      throw error
    }
  }

  static async getNetworkChains(): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/net/chains`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching network chains:', error)
      throw error
    }
  }

  static async getChain(): Promise<BlockchainInfo> {
    try {
      const response = await fetch(`${API_URL}/net/chain`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching main chain:', error)
      throw error
    }
  }

  // Blockchain endpoints
  static async getBlockchainBalance(address: string): Promise<Balance> {
    try {
      const response = await fetch(`${API_URL}/bc/balance/${address}`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching blockchain balance:', error)
      throw error
    }
  }

  static async getBlockchainResolve(tag: string): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/bc/resolve/${tag}`)
      return await response.json()
    } catch (error) {
      console.error('Error resolving blockchain tag:', error)
      throw error
    }
  }

  static async getBlock(blockNumber: number): Promise<BlockchainInfo> {
    try {
      const response = await fetch(`${API_URL}/bc/block/${blockNumber}`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching block:', error)
      throw error
    }
  }

  static async getRawBlock(blockNumber: number): Promise<ArrayBuffer> {
    try {
      const response = await fetch(`${API_URL}/bc/raw/${blockNumber}`)
      return await response.arrayBuffer()
    } catch (error) {
      console.error('Error fetching raw block:', error)
      throw error
    }
  }

  // Combined endpoints
  static async getBalance(address: string): Promise<Balance> {
    try {
      const response = await fetch(`${API_URL}/balance/${address}`)
      return await response.json()
    } catch (error) {
      console.error('Error fetching balance:', error)
      throw error
    }
  }

  static async resolveTag(tag: string): Promise<string> {
    try {
      const response = await fetch(`${API_URL}/resolve/${tag}`)
      return await response.json()
    } catch (error) {
      console.error('Error resolving tag:', error)
      throw error
    }
  }

  // Transaction endpoint
  static async pushTransaction(transaction: string, recipients?: number): Promise<ApiResponse<any>> {
    try {
      const response = await fetch(`${API_URL}/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transaction, recipients })
      })
      return await response.json()
    } catch (error) {
      console.error('Error pushing transaction:', error)
      throw error
    }
  }

  // Utility methods
  static async getHealth(): Promise<ApiResponse<{ timestamp: string }>> {
    try {
      const response = await fetch(`${API_URL}/health`)
      return await response.json()
    } catch (error) {
      console.error('Error checking health:', error)
      throw error
    }
  }
} 