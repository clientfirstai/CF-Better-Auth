import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata = {
  title: {
    default: 'CF-Better-Auth Dashboard',
    template: '%s | CF-Better-Auth Dashboard',
  },
  description: 'Modern authentication dashboard for CF-Better-Auth',
  keywords: [
    'authentication',
    'dashboard',
    'CF-Better-Auth',
    'Next.js',
    'React',
    'TypeScript',
  ],
  authors: [
    {
      name: 'CF-Better-Auth Team',
    },
  ],
  creator: 'CF-Better-Auth Team',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: 'CF-Better-Auth Dashboard',
    description: 'Modern authentication dashboard for CF-Better-Auth',
    siteName: 'CF-Better-Auth Dashboard',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CF-Better-Auth Dashboard',
    description: 'Modern authentication dashboard for CF-Better-Auth',
  },
  robots: {
    index: false, // Dashboard should not be indexed
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html 
      lang="en" 
      suppressHydrationWarning
      className={cn(
        inter.variable,
        jetbrainsMono.variable,
        'font-sans'
      )}
    >
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}