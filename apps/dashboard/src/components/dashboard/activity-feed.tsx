'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatRelativeTime, getActivityIcon } from '@/lib/utils'
import { Activity, ExternalLink } from 'lucide-react'
import { useAuditLogs } from '@cf-auth/client'
import Link from 'next/link'

interface ActivityItem {
  id: string
  type: string
  description: string
  timestamp: string
  user?: {
    name: string
    email: string
  }
  metadata?: Record<string, any>
}

export function ActivityFeed() {
  const { auditLogs, loading, error } = useAuditLogs({ 
    limit: 10,
    orderBy: 'createdAt',
    order: 'desc'
  })

  // Mock data for demonstration
  const mockActivities: ActivityItem[] = [
    {
      id: '1',
      type: 'signin',
      description: 'User signed in successfully',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      user: { name: 'John Doe', email: 'john@example.com' }
    },
    {
      id: '2',
      type: 'api',
      description: 'API key "Production API" was created',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      user: { name: 'Jane Smith', email: 'jane@example.com' }
    },
    {
      id: '3',
      type: 'invite',
      description: 'Team invitation sent to alice@example.com',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      user: { name: 'Bob Wilson', email: 'bob@example.com' }
    },
    {
      id: '4',
      type: 'security',
      description: 'Two-factor authentication enabled',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      user: { name: 'Alice Brown', email: 'alice@example.com' }
    },
    {
      id: '5',
      type: 'update',
      description: 'Profile information updated',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      user: { name: 'John Doe', email: 'john@example.com' }
    },
  ]

  const activities = auditLogs?.length ? auditLogs : mockActivities

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </div>
          <Link 
            href="/dashboard/audit" 
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all
            <ExternalLink className="h-3 w-3" />
          </Link>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Failed to load activity feed</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon bg-primary/10 text-primary">
                  <span className="text-sm">{getActivityIcon(activity.type)}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {activity.user && (
                      <span>{activity.user.name}</span>
                    )}
                    <span>•</span>
                    <span>{formatRelativeTime(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}