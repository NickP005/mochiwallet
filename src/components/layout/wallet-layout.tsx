import { ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'
import { ThemeToggle } from '@/components/theme-toggle'

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
    <div className="flex flex-col h-[600px] bg-background">
      {/* Fixed Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          {showMenu ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" />
            </Button>
          ) : (
            <div className="w-8" />
          )}
          <div className="flex items-center">
            <Logo size="sm" />
            <h1 className="text-lg font-semibold">Mochimo Wallet</h1>
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0">
          {children}
        </div>
      </div>
    </div>
  )
} 