import Link from "next/link"
import { Button } from "@/components/ui/button"

export function AuthDemo() {
  return (
    <section className="py-20">
      <div className="container">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            See it in action
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Experience our authentication system with a live demo featuring all the key features.
          </p>

          <div className="bg-muted/20 rounded-lg p-8 border">
            <div className="aspect-video bg-background rounded border mb-6 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <div className="h-8 w-8 rounded-full bg-primary" />
                </div>
                <p className="text-muted-foreground">Interactive Demo</p>
                <Button asChild>
                  <Link href="/demo">Try Demo</Link>
                </Button>
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>OAuth Providers</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Magic Links</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Two-Factor Auth</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}