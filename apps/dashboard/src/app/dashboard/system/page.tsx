'use client'

import { useEffect, useState } from 'react'
import { useAuth, useWebSocket } from '@cf-auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { WebSocketStatus } from '@/components/realtime/websocket-status'
import { 
  Activity, 
  Server,
  Database,
  Globe,
  Shield,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { formatBytes, formatRelativeTime } from '@/lib/utils'

interface SystemHealth {
  api: 'healthy' | 'degraded' | 'down'
  database: 'healthy' | 'degraded' | 'down'
  redis: 'healthy' | 'degraded' | 'down'
  websocket: 'healthy' | 'degraded' | 'down'
  uptime: number
  responseTime: number
  memoryUsage: number
  activeConnections: number
}

export default function SystemStatusPage() {
  const { user } = useAuth()
  const { state: wsState } = useWebSocket()
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date>(new Date())

  useEffect(() => {
    const fetchSystemHealth = async () => {
      try {
        // Mock system health data - replace with actual API call
        const mockHealth: SystemHealth = {
          api: 'healthy',
          database: 'healthy',
          redis: 'healthy',
          websocket: wsState.status === 'connected' ? 'healthy' : 'degraded',
          uptime: 99.98,
          responseTime: 45,
          memoryUsage: 1024 * 1024 * 512, // 512MB
          activeConnections: 1247
        }
        
        setSystemHealth(mockHealth)
        setLastChecked(new Date())
      } catch (error) {
        console.error('Failed to fetch system health:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSystemHealth()
    const interval = setInterval(fetchSystemHealth, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [wsState.status])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'down':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'default'
      case 'degraded':
        return 'secondary'
      case 'down':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Status</h1>
          <p className="text-muted-foreground">
            Monitor the health and performance of your authentication system.
          </p>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  const overallStatus = systemHealth && [
    systemHealth.api,
    systemHealth.database,
    systemHealth.redis,
    systemHealth.websocket
  ].every(status => status === 'healthy') ? 'healthy' : 'degraded'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Status</h1>
          <p className="text-muted-foreground">
            Monitor the health and performance of your authentication system.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last checked: {formatRelativeTime(lastChecked)}
          </div>
          <Badge variant={getStatusColor(overallStatus) as any}>
            {getStatusIcon(overallStatus)}
            <span className="ml-2 capitalize">{overallStatus}</span>
          </Badge>
        </div>
      </div>

      {/* Overall System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {systemHealth?.uptime.toFixed(2)}%
              </div>
              <div className="text-sm text-muted-foreground mt-1">Uptime</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {systemHealth?.responseTime}ms
              </div>
              <div className="text-sm text-muted-foreground mt-1">Response Time</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {systemHealth ? formatBytes(systemHealth.memoryUsage) : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Memory Usage</div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {systemHealth?.activeConnections.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mt-1">Active Users</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Core Services
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span className="font-medium">API Server</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(systemHealth?.api || 'unknown')}
                <Badge variant={getStatusColor(systemHealth?.api || 'unknown') as any}>
                  {systemHealth?.api || 'Unknown'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="font-medium">Database</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(systemHealth?.database || 'unknown')}
                <Badge variant={getStatusColor(systemHealth?.database || 'unknown') as any}>
                  {systemHealth?.database || 'Unknown'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span className="font-medium">Redis Cache</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(systemHealth?.redis || 'unknown')}
                <Badge variant={getStatusColor(systemHealth?.redis || 'unknown') as any}>
                  {systemHealth?.redis || 'Unknown'}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="font-medium">WebSocket</span>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(systemHealth?.websocket || 'unknown')}
                <Badge variant={getStatusColor(systemHealth?.websocket || 'unknown') as any}>
                  {systemHealth?.websocket || 'Unknown'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Real-time Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">WebSocket Connection</span>
                  <WebSocketStatus showLabel={false} />
                </div>
                <WebSocketStatus />
              </div>
              
              <div className="pt-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Connection established: {wsState.connectedAt 
                    ? formatRelativeTime(wsState.connectedAt) 
                    : 'Never'
                  }
                </div>
                {wsState.lastMessage && (
                  <div className="text-sm text-muted-foreground">
                    Last activity: {formatRelativeTime(wsState.lastMessage)}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Recent Incidents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
            <p>No recent incidents</p>
            <p className="text-sm">All systems are operating normally</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}