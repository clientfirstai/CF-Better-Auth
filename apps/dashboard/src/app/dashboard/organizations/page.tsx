'use client'

import { useState } from 'react'
import { useOrganizations, useActiveOrganization } from '@cf-auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Building, 
  Plus, 
  Search, 
  Users, 
  Crown,
  MoreHorizontal,
  Settings,
  Calendar,
  MapPin
} from 'lucide-react'
import { getInitials, formatDate } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

export default function OrganizationsPage() {
  const { organizations, loading, error } = useOrganizations()
  const { activeOrganization, switchOrganization } = useActiveOrganization()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [switching, setSwitching] = useState<string | null>(null)

  const handleSwitchOrganization = async (orgId: string) => {
    if (orgId === activeOrganization?.id) return
    
    setSwitching(orgId)
    try {
      await switchOrganization(orgId)
      toast({
        title: 'Organization switched',
        description: 'You have successfully switched organizations.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to switch organization. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSwitching(null)
    }
  }

  const filteredOrganizations = organizations?.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your organizations and memberships.
          </p>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your organizations and memberships.
          </p>
        </div>
        
        <Button asChild>
          <Link href="/dashboard/organizations/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Error Loading Organizations</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {error.message || 'Failed to load organizations'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredOrganizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Organizations Found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {searchQuery 
                ? `No organizations match "${searchQuery}"`
                : 'You are not a member of any organizations yet.'
              }
            </p>
            <Button asChild>
              <Link href="/dashboard/organizations/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Organization
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrganizations.map((org) => {
            const isActive = activeOrganization?.id === org.id
            const isSwitching = switching === org.id
            
            return (
              <Card key={org.id} className={`card-interactive ${isActive ? 'border-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={org.logo || undefined} alt={org.name} />
                        <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
                          {getInitials(org.name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{org.name}</h3>
                          {org.role === 'owner' && (
                            <Crown className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={isActive ? 'default' : 'secondary'}>
                            {isActive ? 'Active' : org.role || 'Member'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {org.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {org.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {org.memberCount || 0} members
                    </div>
                    {org.createdAt && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(org.createdAt, { month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  
                  {org.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {org.location}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    {!isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSwitchOrganization(org.id)}
                        disabled={isSwitching}
                        className="flex-1"
                      >
                        {isSwitching ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : null}
                        {isSwitching ? 'Switching...' : 'Switch To'}
                      </Button>
                    ) : (
                      <Button variant="default" size="sm" disabled className="flex-1">
                        Current Organization
                      </Button>
                    )}
                    
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/organizations/${org.id}`}>
                        <Settings className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}