import { Suspense } from 'react'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { AuthDemo } from '@/components/landing/auth-demo'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <Suspense fallback={<LoadingSpinner />}>
          <Hero />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <Features />
        </Suspense>
        
        <Suspense fallback={<LoadingSpinner />}>
          <AuthDemo />
        </Suspense>
      </main>
      <Footer />
    </>
  )
}