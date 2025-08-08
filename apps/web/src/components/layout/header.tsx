import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Header() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "CF-Better-Auth"
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-primary" />
            <span className="text-xl font-bold">{appName}</span>
          </Link>
        </div>

        <nav className="flex items-center space-x-4">
          <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-primary">
            Features
          </Link>
          <Link href="/docs" className="text-sm font-medium text-muted-foreground hover:text-primary">
            Documentation
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}