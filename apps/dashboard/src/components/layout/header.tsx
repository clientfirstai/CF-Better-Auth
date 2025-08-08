'use client'

import { Bell, Menu, Moon, Sun, Search, Plus } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useAuth } from '@cf-auth/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getInitials, getDashboardGreeting } from '@/lib/utils'
import { OrganizationSwitcher } from './organization-switcher'

interface HeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
}

export function Header({ onMenuClick, showMenuButton = true }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          {showMenuButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          
          <div className="hidden md:block">
            <h1 className="text-lg font-semibold">
              {getDashboardGreeting()}, {user?.name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome to your CF-Better-Auth dashboard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search - Mobile hidden, desktop visible */}
          <div className="hidden lg:block relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search dashboard..."
              className="w-80 rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            />
          </div>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Organization switcher */}
          <OrganizationSwitcher />

          {/* Quick actions */}
          <Button variant="ghost" size="icon" title="Create new">
            <Plus className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" title="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              3
            </span>
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* User avatar */}
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.image || undefined} alt={user?.name || 'User'} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user?.name ? getInitials(user.name) : 'U'}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}