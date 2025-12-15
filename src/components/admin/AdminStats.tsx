import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  TrendUp, 
  Package, 
  ShoppingCart, 
  Users,
  CheckCircle,
  Clock,
  CurrencyDollar
} from '@phosphor-icons/react'
import { Product, Order, Design } from '@/lib/types'

interface AdminStatsProps {
  products: Product[]
  orders: Order[]
  pendingDesigns: Design[]
}

export function AdminStats({ products, orders, pendingDesigns }: AdminStatsProps) {
  const activeProducts = products?.filter(p => p.available).length || 0
  const totalProducts = products?.length || 0
  
  const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0
  const processingOrders = orders?.filter(o => o.status === 'processing').length || 0
  const shippedOrders = orders?.filter(o => o.status === 'shipped').length || 0
  const totalOrders = orders?.length || 0
  
  const totalRevenue = orders?.reduce((sum, order) => sum + order.totalAmount, 0) || 0
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  
  const pendingApprovals = pendingDesigns?.filter(d => d.isPublic && !d.catalogSection).length || 0
  const totalDesigns = pendingDesigns?.length || 0

  const stats = [
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toFixed(2)}`,
      description: `${totalOrders} orders`,
      icon: CurrencyDollar,
      trend: '+12.5%',
      color: 'text-green-600'
    },
    {
      title: 'Active Products',
      value: activeProducts.toString(),
      description: `${totalProducts} total`,
      icon: Package,
      color: 'text-primary'
    },
    {
      title: 'Pending Orders',
      value: pendingOrders.toString(),
      description: `${processingOrders} processing`,
      icon: Clock,
      color: 'text-accent'
    },
    {
      title: 'Pending Approvals',
      value: pendingApprovals.toString(),
      description: `${totalDesigns} total designs`,
      icon: CheckCircle,
      color: 'text-destructive'
    }
  ]

  const recentOrders = orders?.slice(-5).reverse() || []

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={stat.color} size={20} weight="duotone" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                {stat.trend && (
                  <Badge variant="secondary" className="text-xs">
                    {stat.trend}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Order Status Distribution</CardTitle>
            <CardDescription>Current order pipeline</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm">Pending</span>
              </div>
              <Badge variant="secondary">{pendingOrders}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm">Processing</span>
              </div>
              <Badge variant="secondary">{processingOrders}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">Shipped</span>
              </div>
              <Badge variant="secondary">{shippedOrders}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
            <CardDescription>Performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avg Order Value</span>
              <span className="font-medium">${avgOrderValue.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
              <span className="font-medium">24.5%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Designs Approved</span>
              <span className="font-medium">{totalDesigns - pendingApprovals}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {recentOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest order activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium font-mono">{order.id}</p>
                    <p className="text-xs text-muted-foreground">{order.shippingAddress.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      order.status === 'delivered' ? 'default' :
                      order.status === 'shipped' ? 'secondary' :
                      order.status === 'failed' ? 'destructive' : 'outline'
                    }>
                      {order.status}
                    </Badge>
                    <span className="font-medium text-sm">${order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
