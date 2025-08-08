'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  Home, 
  User, 
  Users, 
  Shield, 
  Key, 
  Activity, 
  Settings, 
  Building, 
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search
} from 'lucide-react'
import { useAuth } from '@cf-auth/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    name: 'Profile',
    href: '/dashboard/profile',
    icon: User,
  },
  {
    name: 'Organizations',
    href: '/dashboard/organizations',
    icon: Building,
  },
  {
    name: 'Teams',
    href: '/dashboard/teams',
    icon: Users,
  },
  {
    name: 'API Keys',
    href: '/dashboard/api-keys',
    icon: Key,
  },
  {
    name: 'Security',
    href: '/dashboard/security',
    icon: Shield,
  },
  {
    name: 'Audit Logs',
    href: '/dashboard/audit',
    icon: Activity,
  },
  {
    name: 'System Status',
    href: '/dashboard/system',
    icon: Activity,
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div
      className={cn(
        'flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              CF
            </div>
            <span className="font-semibold">Better Auth</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="w-full rounded-md border border-sidebar-border bg-sidebar-accent/50 pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-sidebar"
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'sidebar-item group',
                    isActive ? 'sidebar-item-active' : 'sidebar-item-inactive',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                  {!collapsed && isActive && (
                    <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-4">
        <div className={cn(
          'flex items-center gap-3',
          collapsed && 'justify-center'
        )}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user?.name ? getInitials(user.name) : 'U'}
            </AvatarFallback>
          </Avatar>
          
          {!collapsed && (
            <div className="flex flex-1 items-center justify-between min-w-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {user?.name || 'User'}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {user?.email || 'No email'}
                </p>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-7 w-7 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          
          {collapsed && (
            <div className="absolute left-20 z-50 hidden group-hover:block">
              <div className="rounded-md bg-popover p-2 shadow-lg border">
                <p className="text-sm font-medium whitespace-nowrap">{user?.name || 'User'}</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">{user?.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}