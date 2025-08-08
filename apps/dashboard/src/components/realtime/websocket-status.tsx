'use client'

import { useWebSocket } from '@cf-auth/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Wifi, 
  WifiOff, 
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

interface WebSocketStatusProps {
  showLabel?: boolean
  className?: string
}

export function WebSocketStatus({ showLabel = true, className }: WebSocketStatusProps) {
  const { state, reconnect, disconnect } = useWebSocket()

  const getStatusInfo = () => {
    switch (state.status) {
      case 'connected':
        return {
          icon: Wifi,
          label: 'Connected',
          variant: 'default' as const,
          color: 'text-green-600'
        }
      case 'connecting':
        return {
          icon: Loader2,
          label: 'Connecting',
          variant: 'secondary' as const,
          color: 'text-blue-600',
          animate: true
        }
      case 'disconnected':
        return {
          icon: WifiOff,
          label: 'Disconnected',
          variant: 'destructive' as const,
          color: 'text-red-600'
        }
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Error',
          variant: 'destructive' as const,
          color: 'text-red-600'
        }
      default:
        return {
          icon: WifiOff,
          label: 'Unknown',
          variant: 'secondary' as const,
          color: 'text-gray-600'
        }
    }
  }

  const statusInfo = getStatusInfo()
  const Icon = statusInfo.icon

  if (!showLabel) {
    return (
      <div className={`flex items-center ${className || ''}`}>
        <Icon 
          className={`h-4 w-4 ${statusInfo.color} ${statusInfo.animate ? 'animate-spin' : ''}`} 
        />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <Badge variant={statusInfo.variant} className="flex items-center gap-1.5">
        <Icon 
          className={`h-3 w-3 ${statusInfo.animate ? 'animate-spin' : ''}`} 
        />
        {statusInfo.label}
      </Badge>
      
      {state.status === 'disconnected' || state.status === 'error' ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={reconnect}
          className="h-6 px-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Reconnect
        </Button>
      ) : null}
      
      {state.lastMessage && (
        <span className="text-xs text-muted-foreground">
          Last activity: {new Date(state.lastMessage).toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}