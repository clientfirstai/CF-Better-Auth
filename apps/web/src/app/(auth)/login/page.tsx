import { Suspense } from 'react'
import { Metadata } from 'next'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your account'
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to your account to continue
          </p>
        </div>

        <Suspense fallback={<LoadingSpinner />}>
          <div className="space-y-6">
            {/* Login form would go here */}
            <div className="p-8 border rounded-lg bg-card">
              <p className="text-center text-muted-foreground">
                Login form implementation pending
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link href="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  )
}