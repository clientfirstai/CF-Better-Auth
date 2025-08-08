import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Hero() {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "CF-Better-Auth"
  
  return (
    <section className="py-20 md:py-32">
      <div className="container text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Enterprise Authentication
            <span className="gradient-text"> Made Simple</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {appName} provides a complete authentication solution built on better-auth, 
            with enterprise-grade security, customizable branding, and developer-friendly APIs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/demo">Live Demo</Link>
            </Button>
          </div>

          <div className="pt-8">
            <p className="text-sm text-muted-foreground mb-4">
              Trusted by developers at leading companies
            </p>
            <div className="flex items-center justify-center space-x-8 opacity-60">
              {/* Placeholder for company logos */}
              <div className="h-8 w-24 bg-muted rounded" />
              <div className="h-8 w-24 bg-muted rounded" />
              <div className="h-8 w-24 bg-muted rounded" />
              <div className="h-8 w-24 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}