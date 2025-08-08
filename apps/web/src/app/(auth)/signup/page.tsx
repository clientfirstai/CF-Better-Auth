import { Suspense } from 'react'
import { Metadata } from 'next'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata: Metadata = {
  title: 'Sign Up - CF Better Auth',
  description: 'Create a new account to get started with CF Better Auth'
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Get started</h1>
          <p className="text-muted-foreground mt-2">
            Create your account to get started
          </p>
        </div>

        <Suspense fallback={<LoadingSpinner />}>
          <div className="mt-8">
            <SignupForm 
              redirectTo="/dashboard"
              enableSocialAuth={true}
              socialProviders={['google', 'github', 'discord']}
              showUsernameField={true}
              showPhoneField={true}
            />
          </div>
        </Suspense>
      </div>
    </div>
  )
}