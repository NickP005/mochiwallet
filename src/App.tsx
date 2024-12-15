import { Button } from "@/components/ui/button"
import { WalletLayout } from "@/components/layout/wallet-layout"
import { PlusCircle, Import } from "lucide-react"
import { useEffect } from "react"
import { useDispatch, useSelector } from 'react-redux'
import { fetchChainInfo } from './lib/store/slices/blockchainSlice'
import type { RootState } from './lib/store'

function App() {
  const dispatch = useDispatch()
  const { info: chainInfo, loading, error } = useSelector((state: RootState) => state.blockchain)

  useEffect(() => {
    dispatch(fetchChainInfo())
  }, [dispatch])

  return (
    <WalletLayout>
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h2 className="text-2xl font-bold text-center mb-8">Welcome to Mochimo</h2>
        
        {error && (
          <div className="text-red-500 mb-4">{error}</div>
        )}

        {loading && (
          <div className="mb-4">Loading blockchain info...</div>
        )}

        {chainInfo && (
          <div className="mb-8 text-center">
            <h3 className="font-semibold mb-2">Blockchain Info</h3>
            <div className="text-sm">
              <p>Block: {chainInfo.block.height}</p>
            </div>
          </div>
        )}

        <div className="flex flex-col w-full max-w-xs gap-4">
          <Button className="w-full" size="lg">
            <PlusCircle />
            Create New Wallet
          </Button>
          <Button className="w-full" variant="outline" size="lg">
            <Import />
            Import Existing Wallet
          </Button>
        </div>
      </div>
    </WalletLayout>
  )
}

export default App
