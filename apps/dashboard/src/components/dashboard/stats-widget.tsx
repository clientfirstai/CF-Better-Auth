'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { formatNumber } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'
import { ReactNode } from 'react'

interface StatsWidgetProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  loading?: boolean
  color?: 'default' | 'primary' | 'success' | 'warning' | 'destructive'
  children?: ReactNode
}

const colorClasses = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  destructive: 'text-red-600',
}

const iconBgClasses = {
  default: 'bg-muted',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-green-100 text-green-600',
  warning: 'bg-yellow-100 text-yellow-600',
  destructive: 'bg-red-100 text-red-600',
}

export function StatsWidget({
  title,
  value,
  description,
  icon: Icon,
  trend,
  loading = false,
  color = 'default',
  children
}: StatsWidgetProps) {
  const displayValue = typeof value === 'number' ? formatNumber(value) : value

  return (
    <Card className="stat-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div className={`p-2 rounded-md ${iconBgClasses[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2">
            <LoadingSpinner size="sm" />
            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          </div>
        ) : (
          <>
            <div className={`text-2xl font-bold ${colorClasses[color]}`}>
              {displayValue}
            </div>
            
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
            
            {trend && (
              <div className="flex items-center mt-2 text-xs">
                <span className={`font-medium ${
                  trend.isPositive 
                    ? 'text-green-600' 
                    : trend.isPositive === false 
                    ? 'text-red-600' 
                    : 'text-muted-foreground'
                }`}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
                <span className="text-muted-foreground ml-1">
                  {trend.label}
                </span>
              </div>
            )}
            
            {children}
          </>
        )}
      </CardContent>
    </Card>
  )
}