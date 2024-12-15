import { all } from 'redux-saga/effects'
import { blockchainSaga } from './blockchainSaga'

export default function* rootSaga() {
  yield all([
    blockchainSaga()
  ])
} 