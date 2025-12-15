import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  MagnifyingGlass,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Eye
} from '@phosphor-icons/react'
import { Order, Product, OrderStatus } from '@/lib/types'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface OrderManagerProps {
  orders: Order[]
  onOrdersChange: (updater: (prev: Order[]) => Order[]) => void
  products: Product[]
}

export function OrderManager({ orders, onOrdersChange, products }: OrderManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null)

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shippingAddress.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.shippingAddress.city.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleUpdateStatus = (orderId: string, newStatus: OrderStatus) => {
    onOrdersChange((prev) =>
      prev.map(o => o.id === orderId 
        ? { ...o, status: newStatus, updatedAt: new Date().toISOString() }
        : o
      )
    )
    toast.success(`Order ${orderId} updated to ${newStatus}`)
  }

  const handleAddTrackingNumber = (orderId: string, trackingNumber: string) => {
    onOrdersChange((prev) =>
      prev.map(o => o.id === orderId 
        ? { ...o, trackingNumber, updatedAt: new Date().toISOString() }
        : o
      )
    )
    toast.success('Tracking number added')
  }

  const getProduct = (productId: string) => {
    return products.find(p => p.id === productId)
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500'
      case 'processing': return 'bg-blue-500'
      case 'fulfilled': return 'bg-purple-500'
      case 'shipped': return 'bg-green-500'
      case 'delivered': return 'bg-emerald-600'
      case 'failed': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Order Management</h2>
          <p className="text-muted-foreground">Track and manage customer orders</p>
        </div>
        <Badge variant="secondary" className="text-base px-4 py-2">
          {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input
            placeholder="Search by order ID, customer name, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          className="h-10 px-4 rounded-md border bg-background"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => {
                  const product = getProduct(order.productId)
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.shippingAddress.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.shippingAddress.city}, {order.shippingAddress.state}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {product && (
                            <>
                              <img 
                                src={product.imageUrl} 
                                alt={product.name}
                                className="w-8 h-8 rounded object-cover"
                              />
                              <span className="text-sm">{product.name}</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">${order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary"
                          className="gap-2"
                        >
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`} />
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(order.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingOrder(order)}
                        >
                          <Eye size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!viewingOrder} onOpenChange={(open) => !open && setViewingOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>View and manage order information</DialogDescription>
          </DialogHeader>

          {viewingOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Order ID</Label>
                  <p className="font-mono mt-1">{viewingOrder.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Badge variant="secondary" className="gap-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(viewingOrder.status)}`} />
                      {viewingOrder.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Order Date</Label>
                  <p className="mt-1">{format(new Date(viewingOrder.createdAt), 'PPpp')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total Amount</Label>
                  <p className="font-bold text-lg mt-1">${viewingOrder.totalAmount.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">Shipping Address</Label>
                <div className="p-3 border rounded-lg">
                  <p className="font-medium">{viewingOrder.shippingAddress.name}</p>
                  <p className="text-sm">{viewingOrder.shippingAddress.line1}</p>
                  {viewingOrder.shippingAddress.line2 && (
                    <p className="text-sm">{viewingOrder.shippingAddress.line2}</p>
                  )}
                  <p className="text-sm">
                    {viewingOrder.shippingAddress.city}, {viewingOrder.shippingAddress.state} {viewingOrder.shippingAddress.postal_code}
                  </p>
                  <p className="text-sm">{viewingOrder.shippingAddress.country}</p>
                </div>
              </div>

              {viewingOrder.trackingNumber && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Tracking Number</Label>
                  <p className="font-mono">{viewingOrder.trackingNumber}</p>
                </div>
              )}

              {viewingOrder.estimatedDelivery && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Estimated Delivery</Label>
                  <p>{format(new Date(viewingOrder.estimatedDelivery), 'PPP')}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Update Status</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant={viewingOrder.status === 'processing' ? 'default' : 'outline'}
                    onClick={() => handleUpdateStatus(viewingOrder.id, 'processing')}
                  >
                    <Package size={16} className="mr-2" />
                    Processing
                  </Button>
                  <Button
                    size="sm"
                    variant={viewingOrder.status === 'fulfilled' ? 'default' : 'outline'}
                    onClick={() => handleUpdateStatus(viewingOrder.id, 'fulfilled')}
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Fulfilled
                  </Button>
                  <Button
                    size="sm"
                    variant={viewingOrder.status === 'shipped' ? 'default' : 'outline'}
                    onClick={() => handleUpdateStatus(viewingOrder.id, 'shipped')}
                  >
                    <Truck size={16} className="mr-2" />
                    Shipped
                  </Button>
                  <Button
                    size="sm"
                    variant={viewingOrder.status === 'delivered' ? 'default' : 'outline'}
                    onClick={() => handleUpdateStatus(viewingOrder.id, 'delivered')}
                  >
                    <CheckCircle size={16} weight="fill" className="mr-2" />
                    Delivered
                  </Button>
                  <Button
                    size="sm"
                    variant={viewingOrder.status === 'failed' ? 'destructive' : 'outline'}
                    onClick={() => handleUpdateStatus(viewingOrder.id, 'failed')}
                  >
                    <XCircle size={16} className="mr-2" />
                    Failed
                  </Button>
                </div>
              </div>

              {!viewingOrder.trackingNumber && viewingOrder.status === 'shipped' && (
                <div className="space-y-2">
                  <Label htmlFor="tracking">Add Tracking Number</Label>
                  <div className="flex gap-2">
                    <Input
                      id="tracking"
                      placeholder="Enter tracking number..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value) {
                          handleAddTrackingNumber(viewingOrder.id, e.currentTarget.value)
                          e.currentTarget.value = ''
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
