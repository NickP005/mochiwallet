import { ReactNode, useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

interface WalletLayoutProps {
  children: ReactNode
  showMenu?: boolean
  onMenuClick?: () => void
}

export function WalletLayout({ 
  children, 
  showMenu = false,
  onMenuClick 
}: WalletLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center h-16 border-b px-4">
        {/* Left section with menu */}
        {showMenu ? (
          <Button
            id="hamburger-menu"
            variant="ghost"
            size="icon"
            className="h-8 w-8 -ml-2"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        ) : (
          <div className="w-8" /> 
        )}

        {/* Center section with logo and title */}
        <div className="flex-1 flex items-center justify-center gap-2 whitespace-nowrap">
          <Logo size="sm" />
          <h1 className="text-lg font-semibold">Mochimo Wallet</h1>
        </div>

        {/* Right section (empty for now, but maintains symmetry) */}
        <div className="w-8" />
      </div>

      {/* Content */}
      <div className="flex-1 relative">
        {children}
      </div>
    </div>
  )
} 