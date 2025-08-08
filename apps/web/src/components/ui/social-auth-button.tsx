import React from 'react'
import { Button, ButtonProps } from './button'
import { LoadingSpinner } from './loading-spinner'
import { cn } from '@/lib/utils'

// Social provider icons (simple SVG components)
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
)

const GitHubIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
)

const DiscordIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0190 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9460 2.4189-2.1568 2.4189Z" />
  </svg>
)

const FacebookIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.017 0C8.396 0 8.025.044 8.025.044c0 0-.396 8.024 4.514 8.024 4.911 0 4.514-8.024 4.514-8.024S16.638 0 12.017 0zM5.09 18.862c-.824-1.565-1.834-3.362-1.558-5.434.274-2.069 1.784-3.724 3.014-4.728.615-.502 1.330-.895 2.246-.895.273 0 .572.025.898.074 1.156.171 2.138.463 3.112.723.438.117.863.229 1.273.308.41.08.803.127 1.158.127.355 0 .748-.047 1.158-.127.41-.079.835-.191 1.273-.308.974-.26 1.956-.552 3.112-.723.326-.049.625-.074.898-.074.916 0 1.631.393 2.246.895 1.230 1.004 2.740 2.659 3.014 4.728.276 2.072-.734 3.869-1.558 5.434C20.435 21.092 17.608 24 14.297 24c-1.658 0-2.573-.811-4.280-.811s-2.622.811-4.280.811C2.426 24-.401 21.092 5.09 18.862z" />
  </svg>
)

export interface SocialProvider {
  id: 'google' | 'github' | 'discord' | 'facebook' | 'apple'
  name: string
  icon: React.ComponentType
  bgColor?: string
  textColor?: string
  borderColor?: string
}

export const socialProviders: Record<string, SocialProvider> = {
  google: {
    id: 'google',
    name: 'Google',
    icon: GoogleIcon,
    bgColor: 'bg-white hover:bg-gray-50',
    textColor: 'text-gray-900',
    borderColor: 'border-gray-300'
  },
  github: {
    id: 'github',
    name: 'GitHub',
    icon: GitHubIcon,
    bgColor: 'bg-gray-900 hover:bg-gray-800',
    textColor: 'text-white',
    borderColor: 'border-gray-900'
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    icon: DiscordIcon,
    bgColor: 'bg-indigo-600 hover:bg-indigo-700',
    textColor: 'text-white',
    borderColor: 'border-indigo-600'
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: FacebookIcon,
    bgColor: 'bg-blue-600 hover:bg-blue-700',
    textColor: 'text-white',
    borderColor: 'border-blue-600'
  },
  apple: {
    id: 'apple',
    name: 'Apple',
    icon: AppleIcon,
    bgColor: 'bg-black hover:bg-gray-900',
    textColor: 'text-white',
    borderColor: 'border-black'
  }
}

interface SocialAuthButtonProps extends Omit<ButtonProps, 'children' | 'onClick'> {
  provider: keyof typeof socialProviders
  isLoading?: boolean
  loadingText?: string
  onClick: (provider: string) => void | Promise<void>
  fullWidth?: boolean
  showIcon?: boolean
}

export function SocialAuthButton({
  provider,
  isLoading = false,
  loadingText,
  onClick,
  fullWidth = true,
  showIcon = true,
  className,
  disabled,
  ...props
}: SocialAuthButtonProps) {
  const providerConfig = socialProviders[provider]
  const IconComponent = providerConfig.icon

  if (!providerConfig) {
    console.warn(`Unknown social provider: ${provider}`)
    return null
  }

  const handleClick = async () => {
    if (!disabled && !isLoading) {
      await onClick(provider)
    }
  }

  const displayText = isLoading 
    ? (loadingText || `Signing in with ${providerConfig.name}...`)
    : `Continue with ${providerConfig.name}`

  return (
    <Button
      variant="outline"
      className={cn(
        'relative transition-all duration-200',
        fullWidth && 'w-full',
        // Override default button styles with provider-specific colors
        providerConfig.bgColor,
        providerConfig.textColor,
        providerConfig.borderColor,
        // Focus and disabled states
        'focus-visible:ring-2 focus-visible:ring-offset-2',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      <div className="flex items-center justify-center space-x-2">
        {isLoading ? (
          <LoadingSpinner className="w-5 h-5" />
        ) : (
          showIcon && <IconComponent />
        )}
        <span>{displayText}</span>
      </div>
    </Button>
  )
}

interface SocialAuthGroupProps {
  providers: (keyof typeof socialProviders)[]
  onProviderClick: (provider: string) => void | Promise<void>
  isLoading?: boolean
  loadingProvider?: string
  disabled?: boolean
  className?: string
}

export function SocialAuthGroup({
  providers,
  onProviderClick,
  isLoading = false,
  loadingProvider,
  disabled = false,
  className
}: SocialAuthGroupProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {providers.map((provider) => (
        <SocialAuthButton
          key={provider}
          provider={provider}
          onClick={onProviderClick}
          isLoading={isLoading && loadingProvider === provider}
          disabled={disabled || (isLoading && loadingProvider !== provider)}
        />
      ))}
    </div>
  )
}

export default SocialAuthButton