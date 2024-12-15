import { configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import blockchainReducer from './slices/blockchainSlice'
import walletReducer from './slices/walletSlice'
import rootSaga from './sagas/rootSaga'

const sagaMiddleware = createSagaMiddleware()

export const store = configureStore({
  reducer: {
    blockchain: blockchainReducer,
    wallet: walletReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware)
})

sagaMiddleware.run(rootSaga)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch 