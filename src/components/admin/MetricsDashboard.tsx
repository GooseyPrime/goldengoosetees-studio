import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabaseService } from '@/lib/supabase'
import { 
  ShoppingCart,
  DollarSign,
  Package,
  Truck,
  XCircle,
  TrendingUp
} from '@phosphor-icons/react'

interface Metrics {
  orders: {
    today: number
    last7Days: number
  }
  revenue: {
    today: number
    last7Days: number
  }
  statusCounts: Record<string, number>
  printful: {
    missingTracking: number
  }
  failures: {
    last24h: number
  }
}

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
  }, [])

  const loadMetrics = async () => {
    setIsLoading(true)
    try {
      const session = await supabaseService.getSession()
      if (!session?.access_token) {
        return
      }

      const response = await fetch('/api/admin/metrics', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to load metrics')
      }

      const data = await response.json()
      setMetrics(data)
    } catch (error: any) {
      console.error('Failed to load metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading metrics...
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Failed to load metrics
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Metrics & Analytics</h2>
        <p className="text-muted-foreground">Overview of orders, revenue, and system health</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders Today</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.orders.today}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.orders.last7Days} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.revenue.today.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${metrics.revenue.last7Days.toFixed(2)} in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missing Tracking</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.printful.missingTracking}</div>
            <p className="text-xs text-muted-foreground">
              Printful orders without tracking
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failures (24h)</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.failures.last24h}</div>
            <p className="text-xs text-muted-foreground">
              Failed orders in last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders by Status</CardTitle>
          <CardDescription>Current distribution of order statuses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.entries(metrics.statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Package size={20} className="text-muted-foreground" />
                  <span className="font-medium capitalize">{status}</span>
                </div>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {count}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
