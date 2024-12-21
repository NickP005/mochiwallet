import CryptoJS from 'crypto-js'
import { useState, useEffect } from 'react'
import { Storage } from '../storage'
import { WalletCore } from '../core/wallet'


interface TagResponse {
  address: string
  tag: string
  [key: string]: any
}

interface FountainResponse {
  error?: string
  [key: string]: any
}

/**
 * Fetches fountain information for a given address
 */
export const fountainWots = async (
  address: string, 
  fountain: string = "https://wallet.mochimo.com/fund/"
): Promise<FountainResponse> => {
  try {
    const response = await fetch(fountain + address, {
      method: "GET",
      headers: {
        'Content-Type': 'application/json'
      }
    })
    return await response.json()
  } catch (e) {
    return {}
  }
}

/**
 * Resolves a tag to its address
 */
export const resolveTag = async (tag: string): Promise<TagResponse> => {
  const response = await fetch(`https://api.mochimap.com/ledger/tag/${tag}`)
  return response.json()
}

/**
 * Converts a byte array to string
 */
export const byteArrayToString = (byteArray: number[]): string => {
  return byteArray.map(byte => String.fromCharCode(byte)).join('')
}

/**
 * Converts a hex string to byte array
 */
export const hexToByteArray = (hexString: string): number[] => {
  const result: number[] = []
  for (let i = 0; i < hexString.length; i += 2) {
    result.push(parseInt(hexString.substr(i, 2), 16))
  }
  return result
}

/**
 * Creates a hash of the input
 */
export const hash = (input: string | number): string => {
  return CryptoJS.SHA256(input.toString()).toString()
}

/**
 * XORs two byte arrays
 */
export const xorArray = (seedBytes: number[], passwordBytes: number[]): number[] => {
  const encryptedSeed: number[] = []
  for (let iter = 0; iter < 32; iter++) {
    encryptedSeed.push(seedBytes[iter] ^ passwordBytes[iter])
  }
  return encryptedSeed
}

/**
 * Gets balance for a given address
 */
export const getBalance = async (address: string): Promise<number> => {
  const response = await fetch(`https://api.mochimap.com/ledger/address/${address}`)
  const data = await response.json()
  return data.balance
}

/**
 * Gets current block height
 */
export const getCurrentBlock = async (): Promise<number> => {
  try {
    const response = await fetch("https://api.mochimap.com/chain", {
      method: "GET",
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    return data.bnum
  } catch (e) {
    console.error(e)
    return 0
  }
}

/**
 * Generates a random string of specified length
 */
export const generateString = (length: number = 24): string => {
  const result = ['0', '2']
  const hexRef = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f']

  for (let n = 0; n < length - 2; n++) {
    result.push(hexRef[Math.floor(Math.random() * 16)])
  }

  return result.join('').toUpperCase()
}

export function useWallet() {
  const [wallet, setWallet] = useState<MasterWallet | null>(null)

  useEffect(() => {
    const loadWallet = async () => {
      try {
        const stored = await Storage.getWallet()
        if (stored) {
          console.log('Loading stored wallet:', stored)
          setWallet(stored)
        }
      } catch (error) {
        console.error('Error loading wallet:', error)
      }
    }
    loadWallet()
  }, [])

  const saveWallet = async (wallet: MasterWallet) => {
    await Storage.setWallet(wallet)
    setWallet(wallet)
  }

  return {
    wallet,
    setWallet: saveWallet
  }
} 