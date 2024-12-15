import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { WalletState } from '../types'

const initialState: WalletState = {
  address: null,
  balance: null,
  isInitialized: false
}

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    initializeWallet: (state) => {
      state.isInitialized = false
    },
    initializeWalletSuccess: (state, action: PayloadAction<{ address: string }>) => {
      state.isInitialized = true
      state.address = action.payload.address
    },
    updateBalance: (state, action: PayloadAction<string>) => {
      state.balance = action.payload
    }
  }
})

export const { initializeWallet, initializeWalletSuccess, updateBalance } = walletSlice.actions
export default walletSlice.reducer 