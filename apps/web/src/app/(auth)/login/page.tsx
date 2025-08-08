import { Suspense } from 'react'
import { Metadata } from 'next'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign In | CF Better Auth',
  description: 'Sign in to your account with email, magic link, SMS, or social authentication'
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground mt-2">
            Sign in to your account to continue
          </p>
        </div>

        <Suspense fallback={<LoadingSpinner />}>
          <LoginForm
            className="bg-card border rounded-lg p-6 shadow-sm"
            enableSocialAuth={true}
            socialProviders={['google', 'github', 'discord']}
            enableMagicLink={true}
            enableOTP={true}
            defaultMethod="email-password"
          />
        </Suspense>
      </div>
    </div>
  )
}