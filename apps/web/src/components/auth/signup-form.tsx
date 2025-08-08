'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  EyeIcon, 
  EyeOffIcon, 
  MailIcon, 
  UserIcon, 
  PhoneIcon,
  CheckCircleIcon,
  AlertCircleIcon
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PasswordStrengthIndicator } from '@/components/ui/password-strength'
import { SocialAuthGroup } from '@/components/ui/social-auth-button'
import { signUp, signIn } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

// Form validation schema
const signupSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .optional(),
  
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])/, 'Password must contain at least one lowercase letter')
    .regex(/^(?=.*[A-Z])/, 'Password must contain at least one uppercase letter')
    .regex(/^(?=.*\d)/, 'Password must contain at least one number')
    .regex(/^(?=.*[^a-zA-Z0-9])/, 'Password must contain at least one special character'),
  
  confirmPassword: z.string(),
  
  acceptTerms: z
    .boolean()
    .refine(val => val === true, 'You must accept the terms and conditions')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

type SignupFormData = z.infer<typeof signupSchema>

interface SignupFormProps {
  className?: string
  redirectTo?: string
  enableSocialAuth?: boolean
  socialProviders?: string[]
  showUsernameField?: boolean
  showPhoneField?: boolean
}

export function SignupForm({
  className,
  redirectTo = '/dashboard',
  enableSocialAuth = true,
  socialProviders = ['google', 'github', 'discord'],
  showUsernameField = true,
  showPhoneField = true
}: SignupFormProps) {
  const router = useRouter()
  
  // Form state
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)
  
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      username: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false
    },
    mode: 'onChange'
  })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid, touchedFields }
  } = form

  const password = watch('password')
  const email = watch('email')

  // Email/password signup
  const onSubmit = async (data: SignupFormData) => {
    try {
      setIsLoading(true)
      
      const signupData = {
        name: data.name,
        email: data.email,
        password: data.password,
        ...(showUsernameField && data.username && { username: data.username }),
        ...(showPhoneField && data.phoneNumber && { phoneNumber: data.phoneNumber })
      }

      const result = await signUp.email(signupData, {
        onRequest: () => {
          toast.loading('Creating your account...', { id: 'signup' })
        },
        onSuccess: () => {
          toast.success('Account created! Please check your email for verification.', { id: 'signup' })
          setEmailVerificationSent(true)
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to create account', { id: 'signup' })
        }
      })

      if (result.data) {
        // If email verification is not required, redirect immediately
        if (!emailVerificationSent) {
          router.push(redirectTo)
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error)
      toast.error(error.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Social authentication
  const handleSocialSignup = async (provider: string) => {
    try {
      setSocialLoading(provider)
      
      await signIn.social(provider, {
        onRequest: () => {
          toast.loading(`Signing up with ${provider}...`, { id: 'social-signup' })
        },
        onSuccess: () => {
          toast.success('Account created successfully!', { id: 'social-signup' })
          router.push(redirectTo)
        },
        onError: (error) => {
          toast.error(error.message || `Failed to sign up with ${provider}`, { id: 'social-signup' })
          setSocialLoading(null)
        }
      })
    } catch (error: any) {
      console.error('Social signup error:', error)
      toast.error(error.message || 'An unexpected error occurred')
      setSocialLoading(null)
    }
  }

  // Email verification success state
  if (emailVerificationSent) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Check your email</h2>
            <p className="text-muted-foreground mt-2">
              We've sent a verification link to <strong>{email}</strong>
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
                <li>2. Click the verification link in the email</li>
                <li>3. You'll be redirected to complete your signup</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email?{' '}
            <button 
              className="text-primary hover:underline font-medium"
              onClick={() => setEmailVerificationSent(false)}
            >
              Try again
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Social Authentication */}
      {enableSocialAuth && socialProviders.length > 0 && (
        <div className="space-y-4">
          <SocialAuthGroup
            providers={socialProviders as any}
            onProviderClick={handleSocialSignup}
            isLoading={!!socialLoading}
            loadingProvider={socialLoading || undefined}
            disabled={isLoading}
          />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>
        </div>
      )}

      {/* Email Signup Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name Field */}
        <Input
          {...register('name')}
          label="Full Name"
          placeholder="Enter your full name"
          error={errors.name?.message}
          startIcon={<UserIcon className="w-4 h-4" />}
          required
          disabled={isLoading}
          aria-describedby="name-error"
        />

        {/* Email Field */}
        <Input
          {...register('email')}
          type="email"
          label="Email Address"
          placeholder="Enter your email address"
          error={errors.email?.message}
          startIcon={<MailIcon className="w-4 h-4" />}
          required
          disabled={isLoading}
          aria-describedby="email-error"
          autoComplete="email"
        />

        {/* Username Field (Optional) */}
        {showUsernameField && (
          <Input
            {...register('username')}
            label="Username (Optional)"
            placeholder="Choose a username"
            error={errors.username?.message}
            startIcon={<UserIcon className="w-4 h-4" />}
            disabled={isLoading}
            aria-describedby="username-error"
            helperText="Must be 3-20 characters, letters, numbers, and underscores only"
          />
        )}

        {/* Phone Field (Optional) */}
        {showPhoneField && (
          <Input
            {...register('phoneNumber')}
            type="tel"
            label="Phone Number (Optional)"
            placeholder="+1 (555) 123-4567"
            error={errors.phoneNumber?.message}
            startIcon={<PhoneIcon className="w-4 h-4" />}
            disabled={isLoading}
            aria-describedby="phone-error"
            helperText="Include country code for international numbers"
          />
        )}

        {/* Password Field */}
        <div className="space-y-2">
          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="Create a secure password"
            error={errors.password?.message}
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
            aria-describedby="password-error"
            autoComplete="new-password"
          />
          
          {/* Password Strength Indicator */}
          {password && (
            <PasswordStrengthIndicator
              password={password}
              showRequirements={touchedFields.password}
            />
          )}
        </div>

        {/* Confirm Password Field */}
        <Input
          {...register('confirmPassword')}
          type={showConfirmPassword ? 'text' : 'password'}
          label="Confirm Password"
          placeholder="Confirm your password"
          error={errors.confirmPassword?.message}
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
          aria-describedby="confirm-password-error"
          autoComplete="new-password"
        />

        {/* Terms and Conditions */}
        <div className="space-y-2">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="acceptTerms"
              {...register('acceptTerms')}
              disabled={isLoading}
              aria-describedby="terms-error"
              className="mt-0.5"
            />
            <label htmlFor="acceptTerms" className="text-sm leading-5 cursor-pointer">
              I agree to the{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>
          {errors.acceptTerms && (
            <p id="terms-error" className="text-sm text-destructive" role="alert">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !isValid || !!socialLoading}
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <LoadingSpinner className="w-4 h-4" />
              <span>Creating Account...</span>
            </div>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>

      {/* Sign In Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            Sign in instead
          </Link>
        </p>
      </div>
    </div>
  )
}

export default SignupForm