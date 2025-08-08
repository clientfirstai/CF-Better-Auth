import React from 'react'
import { cn } from '@/lib/utils'
import { CheckIcon, XIcon } from 'lucide-react'

export interface PasswordStrength {
  score: number // 0-4 (Very Weak to Very Strong)
  feedback: string
  requirements: {
    length: boolean
    uppercase: boolean
    lowercase: boolean
    number: boolean
    special: boolean
  }
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  }

  const metRequirements = Object.values(requirements).filter(Boolean).length
  let score = 0
  let feedback = ''

  // Calculate score based on requirements met and password length
  if (password.length === 0) {
    score = 0
    feedback = 'Enter a password'
  } else if (password.length < 4) {
    score = 0
    feedback = 'Too short'
  } else if (password.length < 8) {
    score = 1
    feedback = 'Weak - Too short'
  } else if (metRequirements < 2) {
    score = 1
    feedback = 'Weak'
  } else if (metRequirements < 3) {
    score = 2
    feedback = 'Fair'
  } else if (metRequirements < 4) {
    score = 3
    feedback = 'Good'
  } else {
    score = 4
    feedback = 'Strong'
  }

  // Additional checks for very strong passwords
  if (score === 4 && password.length >= 12) {
    feedback = 'Very Strong'
  }

  return {
    score,
    feedback,
    requirements
  }
}

interface PasswordStrengthIndicatorProps {
  password: string
  showRequirements?: boolean
  className?: string
}

export function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  className
}: PasswordStrengthIndicatorProps) {
  const strength = calculatePasswordStrength(password)

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0:
        return 'bg-gray-200'
      case 1:
        return 'bg-red-500'
      case 2:
        return 'bg-orange-500'
      case 3:
        return 'bg-yellow-500'
      case 4:
        return 'bg-green-500'
      default:
        return 'bg-gray-200'
    }
  }

  const getStrengthTextColor = (score: number) => {
    switch (score) {
      case 0:
        return 'text-gray-500'
      case 1:
        return 'text-red-600'
      case 2:
        return 'text-orange-600'
      case 3:
        return 'text-yellow-600'
      case 4:
        return 'text-green-600'
      default:
        return 'text-gray-500'
    }
  }

  const requirements = [
    { key: 'length', label: 'At least 8 characters', met: strength.requirements.length },
    { key: 'uppercase', label: 'One uppercase letter', met: strength.requirements.uppercase },
    { key: 'lowercase', label: 'One lowercase letter', met: strength.requirements.lowercase },
    { key: 'number', label: 'One number', met: strength.requirements.number },
    { key: 'special', label: 'One special character', met: strength.requirements.special }
  ]

  return (
    <div className={cn('space-y-2', className)}>
      {/* Strength bar and text */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Password strength</span>
          <span className={cn('text-sm font-medium', getStrengthTextColor(strength.score))}>
            {strength.feedback}
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="flex space-x-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors duration-200',
                strength.score >= level 
                  ? getStrengthColor(strength.score)
                  : 'bg-gray-200'
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && password.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">Requirements:</p>
          <div className="grid grid-cols-1 gap-1">
            {requirements.map((req) => (
              <div
                key={req.key}
                className="flex items-center space-x-2 text-sm"
              >
                <div className={cn(
                  'w-4 h-4 rounded-full flex items-center justify-center',
                  req.met 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 text-gray-400'
                )}>
                  {req.met ? (
                    <CheckIcon className="w-3 h-3" />
                  ) : (
                    <XIcon className="w-3 h-3" />
                  )}
                </div>
                <span className={cn(
                  req.met ? 'text-green-600' : 'text-muted-foreground'
                )}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default PasswordStrengthIndicator