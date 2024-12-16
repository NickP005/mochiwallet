import { cn } from '@/lib/utils'
import mochimoLogo from '@/assets/logo.svg'

interface LogoProps {
    className?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    animated?: boolean
}

const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
}

export function Logo({ className, size = 'md', animated = false }: LogoProps) {
    return (
        <div className={cn('relative', className)}>
            <img
                src={mochimoLogo}
                alt="Mochimo Logo"
                className={cn(
                    sizes[size],
                   
                    'object-contain'
                )}
            />
            {animated && (
                <div className="absolute inset-0 animate-pulse-ring">
                    <div className="absolute inset-0 rounded-full border-2 border-primary opacity-75" />
                    <div className="absolute inset-0 rounded-full border-2 border-primary opacity-50 animate-delay-100" />
                </div>
            )}
        </div>
    )
} 