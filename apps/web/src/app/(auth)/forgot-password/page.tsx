'use client'

import { Suspense, useState } from 'react'
import { Metadata } from 'next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { 
  MailIcon, 
  ArrowLeftIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { signIn, authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

// Form validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
})

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>

function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  const form = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    },
    mode: 'onChange'
  })

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isValid }
  } = form

  const onSubmit = async (data: ForgotPasswordData) => {
    try {
      setIsLoading(true)
      
      // Use the forgetPassword method from better-auth
      const result = await authClient.forgetPassword({
        email: data.email,
        redirectTo: `${window.location.origin}/reset-password`
      }, {
        onRequest: () => {
          toast.loading('Sending password reset email...', { id: 'forgot-password' })
        },
        onSuccess: () => {
          toast.success('Password reset email sent!', { id: 'forgot-password' })
          setEmailSent(true)
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to send password reset email', { id: 'forgot-password' })
        }
      })
    } catch (error: any) {
      console.error('Forgot password error:', error)
      toast.error(error.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Success state
  if (emailSent) {
    const email = getValues('email')
    
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Check your email</h2>
            <p className="text-muted-foreground mt-2">
              We've sent password reset instructions to <strong>{email}</strong>
            </p>
          </div>
        </div>
        
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <AlertCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900">Next steps:</p>
              <ol className="mt-2 text-blue-700 space-y-1">
                <li>1. Check your inbox (and spam folder)</li>
                <li>2. Click the password reset link in the email</li>
                <li>3. Create a new secure password</li>
                <li>4. Sign in with your new password</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email?{' '}
            <button 
              className="text-primary hover:underline font-medium"
              onClick={() => setEmailSent(false)}
            >
              Try again
            </button>
          </p>
          <Link 
            href="/login"
            className="text-sm text-muted-foreground hover:underline flex items-center justify-center space-x-1"
          >
            <ArrowLeftIcon className="w-3 h-3" />
            <span>Back to sign in</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <Input
          {...register('email')}
          type="email"
          label="Email Address"
          placeholder="Enter your email address"
          error={errors.email?.message}
          startIcon={<MailIcon className="w-4 h-4" />}
          required
          disabled={isLoading}
          autoComplete="email"
          autoFocus
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !isValid}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <LoadingSpinner className="w-4 h-4" />
              <span>Sending Reset Email...</span>
            </div>
          ) : (
            'Send Reset Email'
          )}
        </Button>
      </div>

      <div className="text-center">
        <Link 
          href="/login"
          className="text-sm text-muted-foreground hover:underline flex items-center justify-center space-x-1"
        >
          <ArrowLeftIcon className="w-3 h-3" />
          <span>Back to sign in</span>
        </Link>
      </div>
    </form>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
          <p className="text-muted-foreground mt-2">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <Suspense fallback={<LoadingSpinner />}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}