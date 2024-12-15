import { call, put, takeLatest } from 'redux-saga/effects'
import { MochimoService } from '../../services/mochimo'
import { 
  fetchChainInfo, 
  fetchChainInfoSuccess, 
  fetchChainInfoFailure 
} from '../slices/blockchainSlice'
import type { BlockchainInfo } from '../../../../server/types'

function* fetchChainInfoSaga() {
  try {
    const chainInfo: BlockchainInfo = yield call(MochimoService.getChain)
    yield put(fetchChainInfoSuccess(chainInfo))
  } catch (error) {
    yield put(fetchChainInfoFailure(error instanceof Error ? error.message : 'Failed to fetch chain info'))
  }
}

export function* blockchainSaga() {
  yield takeLatest(fetchChainInfo.type, fetchChainInfoSaga)
} 