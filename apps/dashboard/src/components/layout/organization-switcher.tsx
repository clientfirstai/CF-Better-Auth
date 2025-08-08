'use client'

import { useState } from 'react'
import { Check, ChevronDown, Plus, Building } from 'lucide-react'
import { useOrganizations, useActiveOrganization } from '@cf-auth/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import * as Popover from '@radix-ui/react-popover'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

export function OrganizationSwitcher() {
  const [open, setOpen] = useState(false)
  const { organizations, loading: orgsLoading } = useOrganizations()
  const { activeOrganization, switchOrganization } = useActiveOrganization()

  const handleSwitchOrganization = async (orgId: string) => {
    try {
      await switchOrganization(orgId)
      setOpen(false)
    } catch (error) {
      console.error('Failed to switch organization:', error)
    }
  }

  if (orgsLoading) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted animate-pulse">
        <div className="h-5 w-5 rounded-full bg-muted-foreground/20" />
        <div className="h-4 w-20 bg-muted-foreground/20 rounded" />
      </div>
    )
  }

  if (!organizations?.length) {
    return (
      <Button variant="outline" size="sm">
        <Plus className="h-3 w-3 mr-1" />
        Create Organization
      </Button>
    )
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-[200px] justify-between"
          aria-expanded={open}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Avatar className="h-5 w-5">
              <AvatarImage 
                src={activeOrganization?.logo || undefined} 
                alt={activeOrganization?.name || 'Organization'} 
              />
              <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                {activeOrganization?.name 
                  ? getInitials(activeOrganization.name) 
                  : <Building className="h-2.5 w-2.5" />
                }
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm font-medium">
              {activeOrganization?.name || 'Select Organization'}
            </span>
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </Popover.Trigger>
      
      <Popover.Content 
        className="w-[200px] p-1 bg-popover border border-border rounded-md shadow-lg"
        align="start"
        sideOffset={4}
      >
        <div className="space-y-1">
          {organizations.map((org) => (
            <button
              key={org.id}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                activeOrganization?.id === org.id && "bg-accent"
              )}
              onClick={() => handleSwitchOrganization(org.id)}
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={org.logo || undefined} alt={org.name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
                  {getInitials(org.name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0 text-left">
                <div className="truncate font-medium">{org.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {org.role || 'Member'}
                </div>
              </div>
              
              {activeOrganization?.id === org.id && (
                <Check className="h-3 w-3" />
              )}
            </button>
          ))}
        </div>
        
        <div className="mt-2 pt-2 border-t">
          <button className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors">
            <Plus className="h-3 w-3" />
            Create Organization
          </button>
        </div>
      </Popover.Content>
    </Popover.Root>
  )
}