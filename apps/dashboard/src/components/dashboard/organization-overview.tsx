'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Building, 
  Users, 
  Crown, 
  Settings, 
  MoreHorizontal,
  Calendar,
  MapPin
} from 'lucide-react'
import { useActiveOrganization, useOrganizations } from '@cf-auth/client'
import { getInitials, formatDate } from '@/lib/utils'
import Link from 'next/link'

export function OrganizationOverview() {
  const { activeOrganization } = useActiveOrganization()
  const { organizations } = useOrganizations()

  if (!activeOrganization) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Building className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Organization Selected</h3>
          <p className="text-sm text-muted-foreground text-center mb-4">
            Select an organization to view its overview and manage settings.
          </p>
          <Button asChild>
            <Link href="/dashboard/organizations">
              View Organizations
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Organization Overview
          </div>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Organization Info */}
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage 
              src={activeOrganization.logo || undefined} 
              alt={activeOrganization.name} 
            />
            <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
              {getInitials(activeOrganization.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold truncate">
                {activeOrganization.name}
              </h3>
              <Badge variant="secondary" className="shrink-0">
                {activeOrganization.role || 'Member'}
              </Badge>
              {activeOrganization.role === 'owner' && (
                <Crown className="h-4 w-4 text-yellow-500" />
              )}
            </div>
            
            {activeOrganization.description && (
              <p className="text-sm text-muted-foreground mb-3">
                {activeOrganization.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {activeOrganization.createdAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Created {formatDate(activeOrganization.createdAt)}
                </div>
              )}
              {activeOrganization.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {activeOrganization.location}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">
              {activeOrganization.memberCount || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Members
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">
              {activeOrganization.teamCount || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Teams
            </div>
          </div>
          
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold text-primary">
              {activeOrganization.projectCount || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Projects
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/dashboard/organizations/${activeOrganization.id}`}>
              <Users className="h-3 w-3 mr-2" />
              Manage Members
            </Link>
          </Button>
          
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/dashboard/organizations/${activeOrganization.id}/settings`}>
              <Settings className="h-3 w-3 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}