import { Inter } from 'next/font/google'
import { Metadata } from 'next'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AuthProvider } from '@/components/providers/auth-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: {
    default: process.env.NEXT_PUBLIC_APP_NAME || 'CF-Better-Auth',
    template: `%s | ${process.env.NEXT_PUBLIC_APP_NAME || 'CF-Better-Auth'}`
  },
  description: 'Enterprise authentication platform built on better-auth',
  keywords: ['authentication', 'better-auth', 'security', 'enterprise'],
  authors: [
    {
      name: 'CF-Better-Auth Team',
      url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  ],
  creator: 'CF-Better-Auth Team',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    title: process.env.NEXT_PUBLIC_APP_NAME || 'CF-Better-Auth',
    description: 'Enterprise authentication platform built on better-auth',
    siteName: process.env.NEXT_PUBLIC_APP_NAME || 'CF-Better-Auth',
    images: [
      {
        url: process.env.NEXT_PUBLIC_APP_LOGO_URL || '/og-image.png',
        width: 1200,
        height: 630,
        alt: process.env.NEXT_PUBLIC_APP_NAME || 'CF-Better-Auth',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: process.env.NEXT_PUBLIC_APP_NAME || 'CF-Better-Auth',
    description: 'Enterprise authentication platform built on better-auth',
    images: [process.env.NEXT_PUBLIC_APP_LOGO_URL || '/og-image.png'],
  },
  icons: {
    icon: process.env.NEXT_PUBLIC_APP_FAVICON || '/favicon.ico',
    shortcut: process.env.NEXT_PUBLIC_APP_FAVICON || '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <div vaul-drawer-wrapper="">
                <div className="relative flex min-h-screen flex-col bg-background">
                  {children}
                </div>
              </div>
              <Toaster />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}