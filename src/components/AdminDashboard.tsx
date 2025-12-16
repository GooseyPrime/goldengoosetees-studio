import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
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
import { 
  ChartBar, 
  Package, 
  ShoppingCart, 
  CheckCircle,
  XCircle,
  Gear
} from '@phosphor-icons/react'
import { Product, Order, Design } from '@/lib/types'

interface AdminDashboardProps {
  onClose: () => void
}

export function AdminDashboard({ onClose }: AdminDashboardProps) {
  const [products, setProducts] = useKV<Product[]>('admin-products', [])
  const [orders, setOrders] = useKV<Order[]>('admin-orders', [])
  const [pendingDesigns, setPendingDesigns] = useKV<Design[]>('pending-designs', [])
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
          <TabsList className="grid w-full grid-cols-5 mb-8">
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

          <TabsContent value="products">
            <ProductManager 
              products={products || []}
              onProductsChange={setProducts}
            />
          </TabsContent>

          <TabsContent value="orders">
            <OrderManager 
              orders={orders || []}
              onOrdersChange={setOrders}
              products={products || []}
            />
          </TabsContent>

          <TabsContent value="approvals">
            <DesignApprovals 
              designs={pendingDesigns || []}
              onDesignsChange={setPendingDesigns}
              products={products || []}
            />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SupabaseConfig />
            <StripeConfig />
            <PrintfulConfig />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
