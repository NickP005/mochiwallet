import { Button } from "@/components/ui/button"
import { WalletLayout } from "@/components/layout/wallet-layout"
import { PlusCircle, Import } from "lucide-react"

function App() {
  return (
    <WalletLayout>
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <h2 className="text-2xl font-bold text-center mb-8">Welcome to Mochimo</h2>
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
