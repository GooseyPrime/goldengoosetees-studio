import { useState } from 'react'
import { useAppKV } from '@/hooks/useAppKV'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProductManager } from '@/components/admin/ProductManager'
import { OrderManager } from '@/components/admin/OrderManager'
import { DesignApprovals } from '@/components/admin/DesignApprovals'
import { AdminStats } from '@/components/admin/AdminStats'
import { PrintfulConfig } from '@/components/admin/PrintfulConfig'
import { StripeConfig } from '@/components/admin/StripeConfig'
import { SupabaseConfig } from '@/components/admin/SupabaseConfig'
import { GoogleOAuthConfig } from '@/components/admin/GoogleOAuthConfig'
import { UserManager } from '@/components/admin/UserManager'
import { MetricsDashboard } from '@/components/admin/MetricsDashboard'
import { LLMStatus } from '@/components/admin/LLMStatus'
import { SystemStatus } from '@/components/admin/SystemStatus'
import { 
  ChartBar, 
  Package, 
  ShoppingCart, 
  CheckCircle,
  XCircle,
  Gear,
  Users,
  TrendUp,
  Brain,
  Cpu
} from '@phosphor-icons/react'
import { Product, Order, Design } from '@/lib/types'

interface AdminDashboardProps {
  onClose: () => void
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [products, setProducts] = useAppKV<Product[]>('admin-products', [])
  const [orders, setOrders] = useAppKV<Order[]>('admin-orders', [])
  const [pendingDesigns, setPendingDesigns] = useAppKV<Design[]>('pending-designs', [])
  const [activeTab, setActiveTab] = useState('stats')

  const pendingOrdersCount = (orders || []).filter(o => o.status === 'pending').length
  const pendingDesignsCount = (pendingDesigns || []).filter(d => d.isPublic && !d.catalogSection).length

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage products, orders, and design approvals</p>
            </div>
            <Button variant="outline" onClick={onClose}>
              <XCircle size={20} className="mr-2" />
              Exit Admin
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-9 mb-8">
            <TabsTrigger value="stats" className="gap-2">
              <ChartBar size={20} />
              Overview
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package size={20} />
              Products
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 relative">
              <ShoppingCart size={20} />
              Orders
              {pendingOrdersCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1">
                  {pendingOrdersCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approvals" className="gap-2 relative">
              <CheckCircle size={20} />
              Design Approvals
              {pendingDesignsCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center text-xs px-1">
                  {pendingDesignsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2">
              <TrendUp size={20} />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users size={20} />
              Users
            </TabsTrigger>
            <TabsTrigger value="llm-status" className="gap-2">
              <Brain size={20} />
              LLM Status
            </TabsTrigger>
            <TabsTrigger value="system-status" className="gap-2">
              <Cpu size={20} />
              System
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Gear size={20} />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6">
            <AdminStats 
              products={products || []}
              orders={orders || []}
              pendingDesigns={pendingDesigns || []}
            />
          </TabsContent>

          <TabsContent value="metrics" className="space-y-6">
            <MetricsDashboard />
          </TabsContent>

          <TabsContent value="products">
            <ProductManager 
              products={products || []}
              onProductsChange={setProducts}
            />
          </TabsContent>

          <TabsContent value="orders">
            <OrderManager 
              products={products || []}
            />
          </TabsContent>

          <TabsContent value="users">
            <UserManager />
          </TabsContent>

          <TabsContent value="approvals">
            <DesignApprovals 
              designs={pendingDesigns || []}
              onDesignsChange={setPendingDesigns}
              products={products || []}
            />
          </TabsContent>

          <TabsContent value="llm-status" className="space-y-6">
            <LLMStatus />
          </TabsContent>

          <TabsContent value="system-status" className="space-y-6">
            <SystemStatus />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SupabaseConfig />
            <GoogleOAuthConfig />
            <StripeConfig />
            <PrintfulConfig />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
