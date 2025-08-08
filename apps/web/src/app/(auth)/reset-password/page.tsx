'use client'

import { Suspense, useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  KeyRoundIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PasswordStrengthIndicator } from '@/components/ui/password-strength'
import { authClient } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

// Form validation schema
const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/^(?=.*\d)/, 'Password must contain at least one number')
    .regex(/^(?=.*[^a-zA-Z0-9])/, 'Password must contain at least one special character'),
  
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type ResetPasswordData = z.infer<typeof resetPasswordSchema>

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  
  const form = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: ''
    },
    mode: 'onChange'
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, touchedFields }
  } = form

  const newPassword = watch('newPassword')

  // Extract token from URL parameters
  useEffect(() => {
    const urlToken = searchParams?.get('token')
    if (urlToken) {
      setToken(urlToken)
    } else {
      toast.error('Invalid or missing reset token')
      router.push('/forgot-password')
    }
  }, [searchParams, router])

  const onSubmit = async (data: ResetPasswordData) => {
    if (!token) {
      toast.error('Reset token is missing')
      return
    }

    try {
      setIsLoading(true)
      
      const result = await authClient.resetPassword({
        newPassword: data.newPassword,
        token: token
      }, {
        onRequest: () => {
          toast.loading('Resetting your password...', { id: 'reset-password' })
        },
        onSuccess: () => {
          toast.success('Password reset successfully!', { id: 'reset-password' })
          setResetSuccess(true)
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to reset password', { id: 'reset-password' })
        }
      })
    } catch (error: any) {
      console.error('Reset password error:', error)
      toast.error(error.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Password reset successful!</h2>
            <p className="text-muted-foreground mt-2">
              Your password has been updated successfully. You can now sign in with your new password.
            </p>
          </div>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-start space-x-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-green-900">What's next?</p>
              <p className="mt-1 text-green-700">
                Your password has been securely updated. For your security, all existing sessions have been terminated.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Button asChild className="w-full">
            <Link href="/login">
              Sign in with new password
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Loading state while checking token
  if (!token) {
    return (
      <div className="flex justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* New Password Field */}
        <div className="space-y-2">
          <Input
            {...register('newPassword')}
            type={showPassword ? 'text' : 'password'}
            label="New Password"
            placeholder="Enter your new password"
            error={errors.newPassword?.message}
            startIcon={<KeyRoundIcon className="w-4 h-4" />}
            endIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOffIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            }
            required
            disabled={isLoading}
            autoComplete="new-password"
            autoFocus
          />
          
          {/* Password Strength Indicator */}
          {newPassword && (
            <PasswordStrengthIndicator
              password={newPassword}
              showRequirements={touchedFields.newPassword}
            />
          )}
        </div>

        {/* Confirm Password Field */}
        <Input
          {...register('confirmPassword')}
          type={showConfirmPassword ? 'text' : 'password'}
          label="Confirm New Password"
          placeholder="Confirm your new password"
          error={errors.confirmPassword?.message}
          startIcon={<KeyRoundIcon className="w-4 h-4" />}
          endIcon={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="focus:outline-none"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? (
                <EyeOffIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          }
          required
          disabled={isLoading}
          autoComplete="new-password"
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !isValid}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <LoadingSpinner className="w-4 h-4" />
              <span>Updating Password...</span>
            </div>
          ) : (
            'Update Password'
          )}
        </Button>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            Sign in instead
          </Link>
        </p>
      </div>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create new password</h1>
          <p className="text-muted-foreground mt-2">
            Please enter a new secure password for your account
          </p>
        </div>

        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <Suspense fallback={<LoadingSpinner />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}