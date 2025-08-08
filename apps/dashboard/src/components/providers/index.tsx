'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query/devtools'
import { ThemeProvider } from 'next-themes'
import { CFAuthProvider } from '@cf-auth/client'
import { useState } from 'react'
import { Toaster } from '@/components/ui/toaster'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
            retry: (failureCount, error: any) => {
              // Don't retry on 4xx errors
              if (error?.response?.status >= 400 && error?.response?.status < 500) {
                return false
              }
              return failureCount < 3
            },
          },
          mutations: {
            retry: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <CFAuthProvider
          options={{
            baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
            apiPath: '/api/auth',
            autoRefresh: true,
            refreshThreshold: 5, // minutes
            timeout: 30000, // 30 seconds
            storage: {
              type: 'localStorage',
              keyPrefix: 'cf-auth-dashboard-',
            },
            websocket: {
              enabled: true,
              url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws',
              reconnectInterval: 3000,
              maxReconnectAttempts: 5,
            },
            cache: {
              enabled: true,
              defaultTTL: 5 * 60 * 1000, // 5 minutes
              maxSize: 100,
              invalidateOn: ['signIn', 'signOut', 'sessionUpdate'],
            },
            debug: process.env.NODE_ENV === 'development',
          }}
        >
          {children}
        </CFAuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}