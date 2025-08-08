'use client'

import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  EyeIcon, 
  EyeOffIcon, 
  MailIcon, 
  KeyRoundIcon,
  SmartphoneIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ArrowLeftIcon
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { SocialAuthGroup } from '@/components/ui/social-auth-button'
import { signIn } from '@/lib/auth-client'
import { cn } from '@/lib/utils'

// Form validation schemas
const emailPasswordSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
  
  password: z
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password must be less than 128 characters'),
    
  rememberMe: z.boolean().optional()
})

const magicLinkSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(100, 'Email must be less than 100 characters'),
})

const otpSchema = z.object({
  phoneNumber: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
    .min(1, 'Phone number is required'),
})

type EmailPasswordData = z.infer<typeof emailPasswordSchema>
type MagicLinkData = z.infer<typeof magicLinkSchema>
type OTPData = z.infer<typeof otpSchema>

// Authentication methods
type AuthMethod = 'email-password' | 'magic-link' | 'otp'

interface LoginFormProps {
  className?: string
  redirectTo?: string
  enableSocialAuth?: boolean
  socialProviders?: string[]
  enableMagicLink?: boolean
  enableOTP?: boolean
  defaultMethod?: AuthMethod
}

export function LoginForm({
  className,
  redirectTo = '/dashboard',
  enableSocialAuth = true,
  socialProviders = ['google', 'github', 'discord'],
  enableMagicLink = true,
  enableOTP = true,
  defaultMethod = 'email-password'
}: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Form state
  const [authMethod, setAuthMethod] = useState<AuthMethod>(defaultMethod)
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [otpSent, setOTPSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [tempPhoneNumber, setTempPhoneNumber] = useState('')
  
  // Get redirect URL from search params or use default
  const callbackUrl = searchParams?.get('callbackUrl') || redirectTo
  const error = searchParams?.get('error')
  
  // Form configurations for different auth methods
  const emailPasswordForm = useForm<EmailPasswordData>({
    resolver: zodResolver(emailPasswordSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    },
    mode: 'onChange'
  })

  const magicLinkForm = useForm<MagicLinkData>({
    resolver: zodResolver(magicLinkSchema),
    defaultValues: {
      email: ''
    },
    mode: 'onChange'
  })

  const otpForm = useForm<OTPData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      phoneNumber: ''
    },
    mode: 'onChange'
  })

  // Email/password login
  const onEmailPasswordSubmit = async (data: EmailPasswordData) => {
    try {
      setIsLoading(true)
      
      const result = await signIn.email({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe
      }, {
        onRequest: () => {
          toast.loading('Signing in...', { id: 'login' })
        },
        onSuccess: () => {
          toast.success('Welcome back!', { id: 'login' })
          router.push(callbackUrl)
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to sign in', { id: 'login' })
        }
      })
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Magic link authentication
  const onMagicLinkSubmit = async (data: MagicLinkData) => {
    try {
      setIsLoading(true)
      
      const result = await signIn.magicLink({
        email: data.email,
        callbackURL: callbackUrl
      }, {
        onRequest: () => {
          toast.loading('Sending magic link...', { id: 'magic-link' })
        },
        onSuccess: () => {
          toast.success('Magic link sent! Check your email.', { id: 'magic-link' })
          setMagicLinkSent(true)
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to send magic link', { id: 'magic-link' })
        }
      })
    } catch (error: any) {
      console.error('Magic link error:', error)
      toast.error(error.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // OTP authentication
  const onOTPSubmit = async (data: OTPData) => {
    try {
      setIsLoading(true)
      
      const result = await signIn.phoneNumber({
        phoneNumber: data.phoneNumber
      }, {
        onRequest: () => {
          toast.loading('Sending OTP...', { id: 'otp' })
        },
        onSuccess: () => {
          toast.success('OTP sent! Check your messages.', { id: 'otp' })
          setTempPhoneNumber(data.phoneNumber)
          setOTPSent(true)
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to send OTP', { id: 'otp' })
        }
      })
    } catch (error: any) {
      console.error('OTP error:', error)
      toast.error(error.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Verify OTP
  const onOTPVerify = async () => {
    if (!otpCode || otpCode.length < 6) {
      toast.error('Please enter a valid OTP code')
      return
    }

    try {
      setIsLoading(true)
      
      const result = await signIn.phoneNumber.verify({
        phoneNumber: tempPhoneNumber,
        otp: otpCode
      }, {
        onRequest: () => {
          toast.loading('Verifying OTP...', { id: 'verify-otp' })
        },
        onSuccess: () => {
          toast.success('OTP verified! Welcome back!', { id: 'verify-otp' })
          router.push(callbackUrl)
        },
        onError: (error) => {
          toast.error(error.message || 'Invalid OTP code', { id: 'verify-otp' })
        }
      })
    } catch (error: any) {
      console.error('OTP verification error:', error)
      toast.error(error.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Social authentication
  const handleSocialLogin = async (provider: string) => {
    try {
      setSocialLoading(provider)
      
      await signIn.social(provider, {
        redirectTo: callbackUrl,
        onRequest: () => {
          toast.loading(`Signing in with ${provider}...`, { id: 'social-login' })
        },
        onSuccess: () => {
          toast.success('Welcome back!', { id: 'social-login' })
          router.push(callbackUrl)
        },
        onError: (error) => {
          toast.error(error.message || `Failed to sign in with ${provider}`, { id: 'social-login' })
          setSocialLoading(null)
        }
      })
    } catch (error: any) {
      console.error('Social login error:', error)
      toast.error(error.message || 'An unexpected error occurred')
      setSocialLoading(null)
    }
  }

  // Reset forms when switching methods
  const switchAuthMethod = (method: AuthMethod) => {
    setAuthMethod(method)
    setMagicLinkSent(false)
    setOTPSent(false)
    setOtpCode('')
    setTempPhoneNumber('')
    emailPasswordForm.reset()
    magicLinkForm.reset()
    otpForm.reset()
  }

  // Show error message if there's one from URL params
  React.useEffect(() => {
    if (error) {
      let errorMessage = 'Authentication failed'
      switch (error) {
        case 'CredentialsSignin':
          errorMessage = 'Invalid email or password'
          break
        case 'EmailSignin':
          errorMessage = 'Failed to send magic link'
          break
        case 'Callback':
          errorMessage = 'Authentication callback error'
          break
        case 'OAuthSignin':
        case 'OAuthCallback':
        case 'OAuthCreateAccount':
          errorMessage = 'Social authentication failed'
          break
        default:
          errorMessage = error
      }
      toast.error(errorMessage)
    }
  }, [error])

  // Magic link success state
  if (magicLinkSent && authMethod === 'magic-link') {
    const email = magicLinkForm.getValues('email')
    
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <CheckCircleIcon className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Check your email</h2>
            <p className="text-muted-foreground mt-2">
              We've sent a magic link to <strong>{email}</strong>
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
                <li>2. Click the magic link in the email</li>
                <li>3. You'll be signed in automatically</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email?{' '}
            <button 
              className="text-primary hover:underline font-medium"
              onClick={() => setMagicLinkSent(false)}
            >
              Try again
            </button>
          </p>
          <button 
            className="text-sm text-muted-foreground hover:underline flex items-center justify-center space-x-1"
            onClick={() => switchAuthMethod('email-password')}
          >
            <ArrowLeftIcon className="w-3 h-3" />
            <span>Back to login</span>
          </button>
        </div>
      </div>
    )
  }

  // OTP verification state
  if (otpSent && authMethod === 'otp') {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <SmartphoneIcon className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Enter verification code</h2>
            <p className="text-muted-foreground mt-2">
              We've sent a 6-digit code to <strong>{tempPhoneNumber}</strong>
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <Input
            label="Verification Code"
            placeholder="Enter 6-digit code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="text-center text-lg tracking-widest"
            disabled={isLoading}
            autoComplete="one-time-code"
          />
          
          <Button
            onClick={onOTPVerify}
            className="w-full"
            disabled={isLoading || otpCode.length < 6}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner className="w-4 h-4" />
                <span>Verifying...</span>
              </div>
            ) : (
              'Verify & Sign In'
            )}
          </Button>
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code?{' '}
            <button 
              className="text-primary hover:underline font-medium"
              onClick={() => setOTPSent(false)}
            >
              Resend code
            </button>
          </p>
          <button 
            className="text-sm text-muted-foreground hover:underline flex items-center justify-center space-x-1"
            onClick={() => switchAuthMethod('email-password')}
          >
            <ArrowLeftIcon className="w-3 h-3" />
            <span>Back to login</span>
          </button>
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
            onProviderClick={handleSocialLogin}
            isLoading={!!socialLoading}
            loadingProvider={socialLoading || undefined}
            disabled={isLoading}
          />
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Method Tabs */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          type="button"
          onClick={() => switchAuthMethod('email-password')}
          className={cn(
            'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors',
            authMethod === 'email-password'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Password
        </button>
        {enableMagicLink && (
          <button
            type="button"
            onClick={() => switchAuthMethod('magic-link')}
            className={cn(
              'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors',
              authMethod === 'magic-link'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Magic Link
          </button>
        )}
        {enableOTP && (
          <button
            type="button"
            onClick={() => switchAuthMethod('otp')}
            className={cn(
              'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors',
              authMethod === 'otp'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            SMS Code
          </button>
        )}
      </div>

      {/* Email/Password Form */}
      {authMethod === 'email-password' && (
        <form onSubmit={emailPasswordForm.handleSubmit(onEmailPasswordSubmit)} className="space-y-4">
          <Input
            {...emailPasswordForm.register('email')}
            type="email"
            label="Email Address"
            placeholder="Enter your email address"
            error={emailPasswordForm.formState.errors.email?.message}
            startIcon={<MailIcon className="w-4 h-4" />}
            required
            disabled={isLoading}
            autoComplete="email"
          />

          <Input
            {...emailPasswordForm.register('password')}
            type={showPassword ? 'text' : 'password'}
            label="Password"
            placeholder="Enter your password"
            error={emailPasswordForm.formState.errors.password?.message}
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
            autoComplete="current-password"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                {...emailPasswordForm.register('rememberMe')}
                disabled={isLoading}
              />
              <label htmlFor="rememberMe" className="text-sm cursor-pointer">
                Remember me
              </label>
            </div>
            
            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !emailPasswordForm.formState.isValid || !!socialLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner className="w-4 h-4" />
                <span>Signing In...</span>
              </div>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      )}

      {/* Magic Link Form */}
      {authMethod === 'magic-link' && (
        <form onSubmit={magicLinkForm.handleSubmit(onMagicLinkSubmit)} className="space-y-4">
          <Input
            {...magicLinkForm.register('email')}
            type="email"
            label="Email Address"
            placeholder="Enter your email address"
            error={magicLinkForm.formState.errors.email?.message}
            startIcon={<MailIcon className="w-4 h-4" />}
            required
            disabled={isLoading}
            autoComplete="email"
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !magicLinkForm.formState.isValid || !!socialLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner className="w-4 h-4" />
                <span>Sending Magic Link...</span>
              </div>
            ) : (
              'Send Magic Link'
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            We'll email you a secure link to sign in instantly
          </p>
        </form>
      )}

      {/* OTP Form */}
      {authMethod === 'otp' && (
        <form onSubmit={otpForm.handleSubmit(onOTPSubmit)} className="space-y-4">
          <Input
            {...otpForm.register('phoneNumber')}
            type="tel"
            label="Phone Number"
            placeholder="+1 (555) 123-4567"
            error={otpForm.formState.errors.phoneNumber?.message}
            startIcon={<SmartphoneIcon className="w-4 h-4" />}
            required
            disabled={isLoading}
            autoComplete="tel"
            helperText="Include country code for international numbers"
          />

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !otpForm.formState.isValid || !!socialLoading}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner className="w-4 h-4" />
                <span>Sending Code...</span>
              </div>
            ) : (
              'Send Verification Code'
            )}
          </Button>
          
          <p className="text-sm text-muted-foreground text-center">
            We'll text you a secure code to sign in
          </p>
        </form>
      )}

      {/* Sign Up Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link
            href="/signup"
            className="text-primary hover:underline font-medium"
          >
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  )
}

export default LoginForm