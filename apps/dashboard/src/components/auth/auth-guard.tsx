'use client'

import { useAuth } from '@cf-auth/client'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  requireVerification?: boolean
  roles?: string[]
  permissions?: string[]
}

export function AuthGuard({
  children,
  fallback,
  requireVerification = false,
  roles,
  permissions,
}: AuthGuardProps) {
  const { user, session, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      redirect('/auth/login?redirect=' + encodeURIComponent(window.location.pathname))
    }
  }, [loading, user])

  // Show loading state
  if (loading) {
    return (
      fallback || (
        <div className="flex h-screen w-full items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-muted-foreground">Authenticating...</p>
          </div>
        </div>
      )
    )
  }

  // Redirect if not authenticated
  if (!user || !session) {
    redirect('/auth/login')
    return null
  }

  // Check email verification if required
  if (requireVerification && !user.emailVerified) {
    redirect('/auth/verify-email')
    return null
  }

  // Check roles if specified
  if (roles && roles.length > 0) {
    const userRoles = user.roles || []
    const hasRole = roles.some(role => userRoles.includes(role))
    if (!hasRole) {
      redirect('/auth/unauthorized')
      return null
    }
  }

  // Check permissions if specified
  if (permissions && permissions.length > 0) {
    const userPermissions = user.permissions || []
    const hasPermission = permissions.every(permission => 
      userPermissions.includes(permission)
    )
    if (!hasPermission) {
      redirect('/auth/unauthorized')
      return null
    }
  }

  return <>{children}</>
}

// Convenience component for unauthenticated content
export function UnauthenticatedGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      redirect('/dashboard')
    }
  }, [loading, user])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (user) {
    redirect('/dashboard')
    return null
  }

  return <>{children}</>
}