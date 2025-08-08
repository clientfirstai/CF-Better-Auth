'use client'

import { useAuth, useOrganizations, useApiKeys } from '@cf-auth/client'
import { StatsWidget } from '@/components/dashboard/stats-widget'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { OrganizationOverview } from '@/components/dashboard/organization-overview'
import { 
  Users, 
  Key, 
  Shield, 
  Activity, 
  Building,
  TrendingUp
} from 'lucide-react'
import { getDashboardGreeting } from '@/lib/utils'

export default function DashboardPage() {
  const { user } = useAuth()
  const { organizations } = useOrganizations()
  const { apiKeys } = useApiKeys()

  // Mock data for demonstration
  const stats = {
    totalUsers: 1247,
    activeApiKeys: apiKeys?.length || 0,
    securityEvents: 23,
    organizations: organizations?.length || 0,
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="">
        <h1 className="text-2xl font-bold tracking-tight">
          {getDashboardGreeting()}, {user?.name?.split(' ')[0] || 'there'}!
        </h1>
        <p className="text-muted-foreground">
          Here's what's happening with your authentication system today.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsWidget
          title="Total Users"
          value={stats.totalUsers}
          description="Active users in your system"
          icon={Users}
          color="primary"
          trend={{
            value: 12,
            label: 'from last month',
            isPositive: true
          }}
        />
        
        <StatsWidget
          title="API Keys"
          value={stats.activeApiKeys}
          description="Active API keys"
          icon={Key}
          color="success"
          trend={{
            value: 2,
            label: 'new this week',
            isPositive: true
          }}
        />
        
        <StatsWidget
          title="Security Events"
          value={stats.securityEvents}
          description="Events in the last 24h"
          icon={Shield}
          color="warning"
          trend={{
            value: -5,
            label: 'from yesterday',
            isPositive: false
          }}
        />
        
        <StatsWidget
          title="Organizations"
          value={stats.organizations}
          description="Active organizations"
          icon={Building}
          color="default"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <QuickActions />
          <ActivityFeed />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          <OrganizationOverview />
          
          {/* Additional widgets can go here */}
          <StatsWidget
            title="System Health"
            value="99.9%"
            description="Uptime this month"
            icon={TrendingUp}
            color="success"
          />
        </div>
      </div>
    </div>
  )
}