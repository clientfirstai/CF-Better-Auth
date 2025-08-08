import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'muted'
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
}

const colorClasses = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  muted: 'text-muted-foreground'
}

export function LoadingSpinner({ 
  className, 
  size = 'md', 
  color = 'primary' 
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        'loading-spinner',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
    />
  )
}

export function LoadingSpinnerWithText({ 
  text = 'Loading...', 
  className,
  size = 'md'
}: LoadingSpinnerProps & { text?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <LoadingSpinner size={size} />
      <span className="text-sm text-muted-foreground">{text}</span>
    </div>
  )
}