import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabaseService } from '@/lib/supabase'
import { 
  CheckCircle,
  XCircle,
  Brain,
  Sparkle
} from '@phosphor-icons/react'

interface ProviderStatus {
  configured: boolean
  name: string
}

interface AIStatus {
  providers: {
    openRouter: ProviderStatus
    openai: ProviderStatus
    gemini: ProviderStatus
  }
  errors: {
    tracked: boolean
    message: string
  }
  rateLimiting: {
    enabled: boolean
    message: string
  }
}

export function LLMStatus() {
  const [status, setStatus] = useState<AIStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    setIsLoading(true)
    try {
      const session = await supabaseService.getSession()
      if (!session?.access_token) {
        return
      }

      const response = await fetch('/api/admin/ai/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to load AI status')
      }

      const data = await response.json()
      setStatus(data)
    } catch (error: any) {
      console.error('Failed to load AI status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading AI status...
      </div>
    )
  }

  if (!status) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load AI status
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Provider Status</h2>
        <p className="text-muted-foreground">Configuration and status of AI services</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(status.providers).map(([key, provider]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain size={20} />
                {provider.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {provider.configured ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle size={14} className="mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle size={14} className="mr-1" />
                    Not Configured
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Additional Features</CardTitle>
          <CardDescription>Error tracking and rate limiting status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Error Tracking</p>
              <p className="text-sm text-muted-foreground">{status.errors.message}</p>
            </div>
            {status.errors.tracked ? (
              <Badge variant="default" className="bg-green-500">
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">Not Enabled</Badge>
            )}
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Rate Limiting</p>
              <p className="text-sm text-muted-foreground">{status.rateLimiting.message}</p>
            </div>
            {status.rateLimiting.enabled ? (
              <Badge variant="default" className="bg-green-500">
                Enabled
              </Badge>
            ) : (
              <Badge variant="secondary">Not Enabled</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
