import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { BlockchainState } from '../types'
import type { BlockchainInfo } from '../../../../server/types'

const initialState: BlockchainState = {
  info: null,
  loading: false,
  error: null
}

const blockchainSlice = createSlice({
  name: 'blockchain',
  initialState,
  reducers: {
    fetchChainInfo: (state) => {
      state.loading = true
      state.error = null
    },
    fetchChainInfoSuccess: (state, action: PayloadAction<BlockchainInfo>) => {
      state.loading = false
      state.info = action.payload
    },
    fetchChainInfoFailure: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.error = action.payload
    }
  }
})

export const { fetchChainInfo, fetchChainInfoSuccess, fetchChainInfoFailure } = blockchainSlice.actions
export default blockchainSlice.reducer 