import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabaseService } from '@/lib/supabase'
import { 
  CheckCircle,
  XCircle,
  Database,
  CreditCard,
  Package,
  ArrowsClockwise
} from '@phosphor-icons/react'

interface ServiceStatus {
  status: 'ok' | 'error'
  message: string
}

interface SystemStatus {
  services: {
    supabase: ServiceStatus
    stripe: ServiceStatus
    printful: ServiceStatus
  }
  timestamp: string
}

export function SystemStatus() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
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

      const response = await fetch('/api/admin/system/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to load system status')
      }

      const data = await response.json()
      setStatus(data)
    } catch (error: any) {
      console.error('Failed to load system status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'supabase':
        return <Database size={24} />
      case 'stripe':
        return <CreditCard size={24} />
      case 'printful':
        return <Package size={24} />
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading system status...
      </div>
    )
  }

  if (!status) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load system status
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Status</h2>
          <p className="text-muted-foreground">Health checks for all integrated services</p>
        </div>
        <Button variant="outline" onClick={loadStatus} disabled={isLoading}>
          <ArrowsClockwise size={16} className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(status.services).map(([key, service]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getServiceIcon(key)}
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {service.status === 'ok' ? (
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle size={14} className="mr-1" />
                      OK
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle size={14} className="mr-1" />
                      Error
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{service.message}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {status.timestamp && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Last checked: {new Date(status.timestamp).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
