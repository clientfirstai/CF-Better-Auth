import { Suspense } from 'react'
import { Metadata } from 'next'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create a new account'
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Get started</h1>
          <p className="text-muted-foreground mt-2">
            Create your account to get started
          </p>
        </div>

        <Suspense fallback={<LoadingSpinner />}>
          <div className="space-y-6">
            {/* Signup form would go here */}
            <div className="p-8 border rounded-lg bg-card">
              <p className="text-center text-muted-foreground">
                Signup form implementation pending
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </Suspense>
      </div>
    </div>
  )
}