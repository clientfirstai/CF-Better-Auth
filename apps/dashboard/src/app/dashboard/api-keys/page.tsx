'use client'

import { useState } from 'react'
import { useApiKeys } from '@cf-auth/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Key, 
  Plus, 
  Search, 
  Copy,
  MoreHorizontal,
  Eye,
  EyeOff,
  Calendar,
  Shield
} from 'lucide-react'
import { formatDate, formatApiKeyDisplay, copyToClipboard } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export default function ApiKeysPage() {
  const { apiKeys, loading, error, createApiKey, revokeApiKey } = useApiKeys()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)

  const handleCreateApiKey = async () => {
    setCreating(true)
    try {
      await createApiKey({
        name: `API Key ${new Date().toLocaleDateString()}`,
        scopes: ['read', 'write'],
        expiresIn: 365 * 24 * 60 * 60 * 1000 // 1 year
      })
      toast({
        title: 'API Key Created',
        description: 'Your new API key has been generated successfully.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create API key. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setCreating(false)
    }
  }

  const handleCopyKey = (key: string) => {
    copyToClipboard(key)
    toast({
      title: 'Copied!',
      description: 'API key copied to clipboard.'
    })
  }

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev)
      if (newSet.has(keyId)) {
        newSet.delete(keyId)
      } else {
        newSet.add(keyId)
      }
      return newSet
    })
  }

  const filteredKeys = apiKeys?.filter(key => 
    key.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    key.key.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for application integration.
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
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="text-muted-foreground">
            Manage your API keys for application integration.
          </p>
        </div>
        
        <Button onClick={handleCreateApiKey} disabled={creating}>
          {creating ? (
            <LoadingSpinner size="sm" className="mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Create API Key
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search API keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Error Loading API Keys</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {error.message || 'Failed to load API keys'}
            </p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : filteredKeys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No API Keys Found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {searchQuery 
                ? `No API keys match "${searchQuery}"`
                : 'You haven\'t created any API keys yet.'
              }
            </p>
            <Button onClick={handleCreateApiKey} disabled={creating}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredKeys.map((apiKey) => {
            const isVisible = visibleKeys.has(apiKey.id)
            const displayKey = isVisible ? apiKey.key : formatApiKeyDisplay(apiKey.key)
            const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()
            
            return (
              <Card key={apiKey.id} className="card-interactive">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10 text-primary">
                        <Key className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{apiKey.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={isExpired ? 'destructive' : 'default'}>
                            {isExpired ? 'Expired' : 'Active'}
                          </Badge>
                          {apiKey.scopes && (
                            <Badge variant="secondary">
                              {apiKey.scopes.join(', ')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* API Key Display */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">API Key</label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 bg-muted rounded font-mono text-sm">
                        {displayKey}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                      >
                        {isVisible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyKey(apiKey.key)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      {apiKey.createdAt && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Created {formatDate(apiKey.createdAt)}
                        </div>
                      )}
                      {apiKey.lastUsed && (
                        <div className="flex items-center gap-1">
                          <Shield className="h-3 w-3" />
                          Last used {formatDate(apiKey.lastUsed)}
                        </div>
                      )}
                    </div>
                    
                    {apiKey.expiresAt && (
                      <div className={`text-xs ${
                        isExpired ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {isExpired ? 'Expired' : 'Expires'} {formatDate(apiKey.expiresAt)}
                      </div>
                    )}
                  </div>
                  
                  {/* Usage Stats */}
                  {apiKey.usageCount !== undefined && (
                    <div className="text-sm text-muted-foreground">
                      Used {apiKey.usageCount} times
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}