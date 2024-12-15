import * as React from "react"

interface WalletLayoutProps {
  children: React.ReactNode
}

export function WalletLayout({ children }: WalletLayoutProps) {
  return (
    <div className="flex flex-col h-[600px] w-[360px] bg-background">
      <header className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Mochimo Wallet</h1>
      </header>
      <main className="flex-1 overflow-auto p-4">
        {children}
      </main>
    </div>
  )
} 