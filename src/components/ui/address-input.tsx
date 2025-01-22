import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AtSign as At, X } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { AccountAvatar } from "../ui/account-avatar"
import { cn } from "@/lib/utils"
import { TagUtils } from "mochimo-wots"

interface AddressOption {
  value: string
  label: string
  tag: string
  emoji?: string
  description?: string
}

interface AddressInputProps {
  value: string
  onValueChange: (value: string) => void
  options: AddressOption[]
  placeholder?: string
  className?: string
  error?: boolean
  onValidate?: (error: string | null) => void
}

export function AddressInput({
  value,
  onValueChange,
  options,
  placeholder = "Enter address",
  className,
  error,
  onValidate
}: AddressInputProps) {
  const [open, setOpen] = React.useState(false)
  const selectedOption = options.find(opt => opt.value === value)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const validateAddress = (value: string) => {
    const trimmedValue = value.trim()
    
    if (!trimmedValue) return null
    
    if (trimmedValue.length !== 30) {
      return 'Tag must be exactly 30 characters'
    }

    if (!TagUtils.validateBase58Tag(trimmedValue)) {
      return 'Invalid tag format'
    }

    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onValueChange(newValue)
    onValidate?.(null)
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const trimmedValue = e.target.value.trim()
    
    if (trimmedValue !== e.target.value) {
      onValueChange(trimmedValue)
    }

    const error = validateAddress(trimmedValue)
    onValidate?.(error)
  }

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div className="relative flex items-center">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="ghost"
              size="sm"
              className="absolute left-0 h-full px-3 hover:bg-transparent"
            >
              <At className="h-4 w-4 text-primary" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="p-0 mt-1" 
            align="start"
            style={{ width: containerRef.current?.offsetWidth || 'auto' }}
          >
            <div className="max-h-[300px] overflow-y-auto py-1">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent text-left"
                >
                  <AccountAvatar
                    name={option.label}
                    tag={option.tag}
                    emoji={option.emoji}
                    className="h-6 w-6"
                    textClassName="text-xs"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-sm">
                      {option.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {option.value}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        {selectedOption ? (
          <div className="flex items-center w-full pl-10 pr-3 h-10 border rounded-md bg-muted/50">
            <AccountAvatar
              name={selectedOption.label}
              tag={selectedOption.tag}
              emoji={selectedOption.emoji}
              className="h-6 w-6 mr-2"
              textClassName="text-xs"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-medium text-sm">
                {selectedOption.label}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {selectedOption.value.slice(0, 8)}...{selectedOption.value.slice(-8)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-background/80"
              onClick={(e) => {
                e.stopPropagation();
                onValueChange('');
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Input
            value={value}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className={cn(
              "pl-10",
              error && "border-destructive focus-visible:ring-destructive"
            )}
          />
        )}
      </div>
    </div>
  )
} 