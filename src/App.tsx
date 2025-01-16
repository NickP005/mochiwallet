import { Button } from "@/components/ui/button"
import { WalletLayout } from "@/components/layout/wallet-layout"
import { PlusCircle, Import } from "lucide-react"
import { useEffect, useState } from "react"

import { CreateWallet } from "@/components/wallet/CreateWallet"
import { UnlockWallet } from "@/components/wallet/UnlockWallet"
import { ImportWallet } from "@/components/wallet/ImportWallet"
import { WalletDashboard } from "@/components/wallet/WalletDashboard"
import { NetworkProvider, ProxyNetworkService, StorageProvider, MeshNetworkService, useWallet } from "mochimo-wallet"

import { motion } from "framer-motion"
import { Logo } from "./components/ui/logo"

const apiUrl = 'http://46.250.241.212:8081'
const apiUrl2 = 'http://46.250.241.212:8081'
type WalletView = 'welcome' | 'create' | 'unlock' | 'dashboard' | 'import'
const network = new MeshNetworkService(apiUrl2)
NetworkProvider.setNetwork(network)
export function App() {
  const [view, setView] = useState<WalletView>('welcome')
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<any>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const w = useWallet()

  // Check for existing wallet on load
  useEffect(() => {

    const checkWallet = async () => {
      try {

        const hasWallet = await w.checkWallet()

        setView(hasWallet ? 'unlock' : 'welcome')
      } catch (error) {
        console.error('Error checking wallet:', error)
      } finally {
        setLoading(false)
      }
    }

    checkWallet()
  }, [])


  // Handle successful wallet creation
  const handleWalletCreated = async (newWallet: any) => {
    try {
      console.log('App: Handling wallet creation...')
      setWallet(newWallet)
      setView('dashboard')
      console.log('App: Transition complete')
    } catch (error) {
      console.error('App: Error handling wallet creation:', error)
    }
  }

  // Handle successful wallet unlock
  const handleWalletUnlocked = (password: string) => {
    setView('dashboard')
  }

  // Add handler for successful import
  const handleWalletImported = async (wallet: any) => {
    try {
      setWallet(wallet)
      setView('dashboard')
    } catch (error) {
      console.error('Error handling wallet import:', error)
    }
  }

  if (loading) {
    return (
      <WalletLayout>
        <div className="flex items-center justify-center h-full">
          <p>Loading...</p>
        </div>
      </WalletLayout>
    )
  }

  switch (view) {
    case 'welcome':
      return (
        <WalletLayout>
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
              className="mb-8"
            >
              <Logo size="xl" animated className="text-primary" />
            </motion.div>
            <h2 className="text-2xl font-bold text-center mb-8">Welcome to Mochimo</h2>
            <div className="flex flex-col w-full max-w-xs gap-4">
              <Button
                className="w-full"
                size="lg"
                onClick={() => setView('create')}
              >
                <PlusCircle className="mr-2" />
                Create New Wallet
              </Button>
              <Button
                className="w-full"
                variant="outline"
                size="lg"
                onClick={() => setView('import')}
              >
                <Import className="mr-2" />
                Import Existing Wallet
              </Button>
            </div>
          </div>
        </WalletLayout>
      )

    case 'create':
      return (
        <WalletLayout>
          <CreateWallet onWalletCreated={handleWalletCreated} />
        </WalletLayout>
      )

    case 'unlock':
      return (
        <WalletLayout>
          <UnlockWallet onUnlock={handleWalletUnlocked} />
        </WalletLayout>
      )

    case 'dashboard':
      return (
        <WalletLayout
          showMenu
          onMenuClick={() => setSidebarOpen(true)}
        >
          <WalletDashboard
            wallet={wallet}
            sidebarOpen={sidebarOpen}
            onSidebarOpenChange={setSidebarOpen}
          />
        </WalletLayout>
      )

    case 'import':
      return (
        <WalletLayout>
          <ImportWallet
            onWalletImported={handleWalletImported}
            onBack={() => setView('welcome')}
          />
        </WalletLayout>
      )
  }
}
