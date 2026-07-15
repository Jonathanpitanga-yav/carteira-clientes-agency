import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"

type LogoProps = {
  variant?: "sidebar" | "login" | "inline"
  className?: string
}

export function Logo({ variant = "sidebar", className }: LogoProps) {
  const sizes = {
    sidebar: { width: 140, height: 60 },
    login: { width: 200, height: 85 },
    inline: { width: 120, height: 50 },
  }
  const { width, height } = sizes[variant]

  return (
    <Link href="/" className={cn("flex items-center", className)}>
      <Image
        src="/yav-logo.svg"
        alt="YAV Digital"
        width={width}
        height={height}
        className="h-auto w-auto object-contain"
        priority
      />
    </Link>
  )
}
