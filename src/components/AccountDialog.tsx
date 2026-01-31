import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { User, Order } from '@/lib/types'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { Package, SignOut, UserCircle } from '@phosphor-icons/react'

interface AccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  onRequestSignIn: () => void
  onSignOut: () => void
}

export function AccountDialog({
  open,
  onOpenChange,
  user,
  onRequestSignIn,
  onSignOut
}: AccountDialogProps) {
  const [orderLookupId, setOrderLookupId] = useState('')
  const [orderResult, setOrderResult] = useState<Order | null>(null)
  const [isLoadingOrder, setIsLoadingOrder] = useState(false)

  const handleLookupOrder = async () => {
    if (!orderLookupId.trim()) {
      toast.error('Enter your order ID to look it up.')
      return
    }

    setIsLoadingOrder(true)
    try {
      const order = await api.orders.getById(orderLookupId.trim())
      if (!order) {
        toast.error('Order not found. Check the ID from your confirmation email.')
        setOrderResult(null)
        return
      }
      setOrderResult(order)
    } catch (error) {
      toast.error('Unable to find that order right now.')
    } finally {
      setIsLoadingOrder(false)
    }
  }

  const handleSignOut = () => {
    onSignOut()
    onOpenChange(false)
  }

  const getOrderVariantSummary = (order: Order) => {
    if (order.variantSelections && Object.keys(order.variantSelections).length > 0) {
      return Object.entries(order.variantSelections)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' / ')
    }
    const fallbackParts = [
      order.size ? `Size: ${order.size}` : null,
      order.color ? `Color: ${order.color}` : null
    ].filter(Boolean)
    return fallbackParts.join(' / ')
  }

  const orderVariantSummary = orderResult ? getOrderVariantSummary(orderResult) : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Account & Orders</DialogTitle>
          <DialogDescription>
            Manage your profile and look up your latest order details.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="orders">Order Lookup</TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="pt-4 space-y-4">
            {user ? (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCircle size={28} className="text-primary" weight="duotone" />
                  </div>
                  <div>
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{user.role.toUpperCase()}</Badge>
                  {user.ageVerified ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      ✓ Over 18
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                      Age verification needed
                    </Badge>
                  )}
                </div>
                <Button variant="outline" onClick={handleSignOut} className="gap-2">
                  <SignOut size={16} />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in to save designs, access your profile, and resume orders.
                </p>
                <Button onClick={onRequestSignIn} className="gap-2">
                  <UserCircle size={18} weight="fill" />
                  Sign In / Create Account
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="pt-4 space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="order-id">
                  Order ID
                </label>
                <Input
                  id="order-id"
                  placeholder="order-1234567890"
                  value={orderLookupId}
                  onChange={(event) => setOrderLookupId(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use the ID from your confirmation email or receipt.
                </p>
              </div>
              <Button onClick={handleLookupOrder} disabled={isLoadingOrder} className="gap-2">
                <Package size={16} />
                {isLoadingOrder ? 'Searching...' : 'Look Up Order'}
              </Button>
            </div>

            {orderResult && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Order {orderResult.id}</p>
                  <Badge variant="secondary">{orderResult.status.toUpperCase()}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Product: {orderResult.productId}
                  {orderVariantSummary ? ` / ${orderVariantSummary}` : ''}
                </p>
                <p className="text-sm text-muted-foreground">
                  Total: ${orderResult.totalAmount.toFixed(2)}
                </p>
                {orderResult.trackingUrl && (
                  <a
                    href={orderResult.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline"
                  >
                    Track shipment
                  </a>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
