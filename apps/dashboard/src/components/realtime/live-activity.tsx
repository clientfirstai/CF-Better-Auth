'use client'

import { useEffect, useState } from 'react'
import { useWebSocket } from '@cf-auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime, getActivityIcon } from '@/lib/utils'
import { Activity, Zap } from 'lucide-react'

interface LiveActivityItem {
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

interface LiveActivityProps {
  maxItems?: number
  className?: string
}

export function LiveActivity({ maxItems = 5, className }: LiveActivityProps) {
  const { state, subscribe, unsubscribe } = useWebSocket()
  const [activities, setActivities] = useState<LiveActivityItem[]>([])
  const [newActivityCount, setNewActivityCount] = useState(0)

  useEffect(() => {
    // Subscribe to real-time activity events
    const handleActivityEvent = (event: any) => {
      if (event.type === 'activity') {
        const newActivity: LiveActivityItem = {
          id: event.data.id || Date.now().toString(),
          type: event.data.type,
          description: event.data.description,
          timestamp: event.data.timestamp || new Date().toISOString(),
          user: event.data.user,
          metadata: event.data.metadata
        }
        
        setActivities(prev => {
          const updated = [newActivity, ...prev].slice(0, maxItems)
          return updated
        })
        
        setNewActivityCount(prev => prev + 1)
        
        // Clear the new activity indicator after 3 seconds
        setTimeout(() => {
          setNewActivityCount(prev => Math.max(0, prev - 1))
        }, 3000)
      }
    }

    if (state.status === 'connected') {
      subscribe('activity', handleActivityEvent)
    }

    return () => {
      unsubscribe('activity', handleActivityEvent)
    }
  }, [state.status, subscribe, unsubscribe, maxItems])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Live Activity
            {state.status === 'connected' && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs text-green-600">Live</span>
              </div>
            )}
          </div>
          
          {newActivityCount > 0 && (
            <Badge variant="destructive" className="animate-bounce">
              {newActivityCount} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {state.status !== 'connected' ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Connect to see live activity</p>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div 
                key={activity.id} 
                className={`activity-item ${
                  index === 0 && newActivityCount > 0 
                    ? 'bg-primary/5 border border-primary/20 animate-fade-in' 
                    : ''
                }`}
              >
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