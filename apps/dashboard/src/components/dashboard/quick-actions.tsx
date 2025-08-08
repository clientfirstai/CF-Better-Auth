'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Key, 
  UserPlus, 
  Building, 
  Users, 
  Shield, 
  Download,
  Settings,
  Plus
} from 'lucide-react'
import Link from 'next/link'

const quickActions = [
  {
    title: 'Create API Key',
    description: 'Generate a new API key for your application',
    icon: Key,
    href: '/dashboard/api-keys/new',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  {
    title: 'Invite User',
    description: 'Send an invitation to a new team member',
    icon: UserPlus,
    href: '/dashboard/teams/invite',
    color: 'bg-green-50 text-green-600 border-green-200',
  },
  {
    title: 'Create Organization',
    description: 'Set up a new organization for your team',
    icon: Building,
    href: '/dashboard/organizations/new',
    color: 'bg-purple-50 text-purple-600 border-purple-200',
  },
  {
    title: 'Manage Team',
    description: 'View and manage your team members',
    icon: Users,
    href: '/dashboard/teams',
    color: 'bg-orange-50 text-orange-600 border-orange-200',
  },
  {
    title: 'Security Settings',
    description: 'Configure 2FA and security preferences',
    icon: Shield,
    href: '/dashboard/security',
    color: 'bg-red-50 text-red-600 border-red-200',
  },
  {
    title: 'Export Data',
    description: 'Download your account and usage data',
    icon: Download,
    href: '/dashboard/settings/export',
    color: 'bg-gray-50 text-gray-600 border-gray-200',
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}>
                <div className="group p-4 rounded-lg border border-dashed hover:border-solid transition-all duration-200 hover:shadow-md cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-md ${action.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm group-hover:text-primary transition-colors">
                        {action.title}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {action.description}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}