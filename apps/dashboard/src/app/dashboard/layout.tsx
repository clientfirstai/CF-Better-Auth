import { AuthGuard } from '@/components/auth/auth-guard'
import { ErrorBoundary } from '@/components/error/error-boundary'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AuthGuard requireVerification={true}>
      <ErrorBoundary>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            
            {/* Page content */}
            <main className="flex-1 overflow-y-auto">
              <div className="container py-6">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </div>
            </main>
          </div>
        </div>
      </ErrorBoundary>
    </AuthGuard>
  )
}