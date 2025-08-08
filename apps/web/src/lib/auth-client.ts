import { createAuthClient } from 'better-auth/react'

// Validate required environment variables
if (!process.env.NEXT_PUBLIC_AUTH_SERVER_URL) {
  throw new Error('NEXT_PUBLIC_AUTH_SERVER_URL is required')
}

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_SERVER_URL,
  
  // Session configuration
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5 // 5 minutes
    }
  },

  // Fetch configuration for API calls
  fetchOptions: {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    }
  },

  // Custom error handling
  onError: (error, request) => {
    console.error('Auth client error:', error)
    
    // Handle specific error cases
    if (error.status === 401) {
      // Redirect to login for unauthorized requests
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    } else if (error.status === 429) {
      // Rate limit exceeded
      console.warn('Rate limit exceeded. Please try again later.')
    } else if (error.status >= 500) {
      // Server error
      console.error('Server error. Please try again later.')
    }
  },

  // Success callback
  onSuccess: (data, request) => {
    console.log('Auth success:', { data, request })
  },

  // Request interceptor
  beforeRequest: (url, options) => {
    // Add custom headers or modify request
    return { url, options }
  },
})

// Export the auth client hooks and methods
export const {
  useSession,
  signIn,
  signOut,
  signUp,
  useActiveOrganization,
  useListOrganizations,
  useTwoFactor,
  usePasskeys,
  getSession,
  $Infer
} = authClient

// Custom hooks for better UX
export function useAuth() {
  const { data: session, isPending, error } = useSession()
  
  return {
    user: session?.user ?? null,
    session: session ?? null,
    isLoading: isPending,
    isAuthenticated: !!session?.user,
    error
  }
}

// Organization management hook
export function useOrganization() {
  const { data: activeOrg } = useActiveOrganization()
  const { data: organizations, isPending: isLoadingOrgs } = useListOrganizations()
  
  return {
    activeOrganization: activeOrg,
    organizations: organizations ?? [],
    isLoading: isLoadingOrgs,
    hasOrganizations: (organizations?.length ?? 0) > 0
  }
}

// Two-factor authentication hook
export function use2FA() {
  const {
    enable: enableTwoFactor,
    disable: disableTwoFactor,
    verify: verifyTwoFactor,
    generateBackupCodes,
    data: twoFactorData,
    isPending: is2FAPending
  } = useTwoFactor()
  
  return {
    enable: enableTwoFactor,
    disable: disableTwoFactor,
    verify: verifyTwoFactor,
    generateBackupCodes,
    isEnabled: twoFactorData?.enabled ?? false,
    isLoading: is2FAPending,
    backupCodes: twoFactorData?.backupCodes ?? []
  }
}

// Passkeys management hook
export function usePasskey() {
  const {
    addPasskey,
    deletePasskey,
    listPasskeys,
    data: passkeysData,
    isPending: isPasskeysPending
  } = usePasskeys()
  
  return {
    add: addPasskey,
    delete: deletePasskey,
    list: listPasskeys,
    passkeys: passkeysData ?? [],
    isLoading: isPasskeysPending,
    hasPasskeys: (passkeysData?.length ?? 0) > 0
  }
}

// Type exports for better TypeScript support
export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>
export type User = Session['user']
export type AuthError = Parameters<NonNullable<Parameters<typeof createAuthClient>[0]['onError']>>[0]