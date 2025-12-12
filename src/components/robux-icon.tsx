
import Image from "next/image"
import { cn } from "@/lib/utils"

interface RobuxIconProps {
  className?: string
}

export function RobuxIcon({ className }: RobuxIconProps) {
  return (
    <Image 
      src="/robux.svg" 
      alt="Robux" 
      width={16} 
      height={16} 
      className={cn("inline-block w-4 h-4 ml-1 align-text-bottom", className)} 
    />
  )
}
