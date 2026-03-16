import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle,
  XCircle,
  Eye,
  Warning
} from '@phosphor-icons/react'
import { Design, Product } from '@/lib/types'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

interface DesignApprovalsProps {
  designs: Design[]
  onRefresh: () => void
  products: Product[]
  loading?: boolean
}

export function DesignApprovals({ designs, onRefresh, products, loading = false }: DesignApprovalsProps) {
  const [viewingDesign, setViewingDesign] = useState<Design | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actioning, setActioning] = useState(false)

  const pendingDesigns = designs.filter(d => d.isPublic && !d.catalogSection)

  const getProduct = (productId: string) => {
    return products.find(p => p.id === productId)
  }

  const handleApprove = async (design: Design) => {
    const section = design.isNSFW ? 'nsfw-graphics' : 'sfw-graphics'
    setActioning(true)
    try {
      await api.designs.updateForAdmin(design.id, { catalogSection: section })
      toast.success('Design approved and added to catalog')
      setViewingDesign(null)
      onRefresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to approve design')
    } finally {
      setActioning(false)
    }
  }

  const handleReject = async (design: Design) => {
    setActioning(true)
    try {
      await api.designs.updateForAdmin(design.id, { catalogSection: 'rejected' })
      toast.error(`Design rejected: ${rejectionReason || 'No reason provided'}`)
      setViewingDesign(null)
      setRejectionReason('')
      onRefresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to reject design')
    } finally {
      setActioning(false)
    }
  }

  const handleFlagNSFW = async (design: Design) => {
    setActioning(true)
    try {
      await api.designs.updateForAdmin(design.id, { isNSFW: !design.isNSFW })
      toast.info(`Design ${design.isNSFW ? 'unmarked' : 'marked'} as NSFW`)
      setViewingDesign(prev => prev?.id === design.id ? { ...prev, isNSFW: !design.isNSFW } : prev)
      onRefresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to update design')
    } finally {
      setActioning(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Design Approvals</h2>
          <p className="text-muted-foreground">Review designs submitted for public catalog</p>
        </div>
        <Badge variant="secondary" className="text-base px-4 py-2">
          {pendingDesigns.length} pending
        </Badge>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 space-y-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
            <div className="grid gap-4 grid-cols-3 mt-6">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : pendingDesigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle size={48} className="mx-auto text-muted-foreground mb-3" weight="duotone" />
            <p className="text-lg font-medium">All caught up!</p>
            <p className="text-muted-foreground">No designs pending approval</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pendingDesigns.map((design) => {
            const product = getProduct(design.productId)
            const primaryDesign = design.files[0]

            return (
              <Card key={design.id} className="overflow-hidden">
                <div className="aspect-square bg-muted relative">
                  {primaryDesign && (
                    <img
                      src={primaryDesign.dataUrl}
                      alt={design.title}
                      className="w-full h-full object-contain"
                    />
                  )}
                  {design.isNSFW && (
                    <Badge variant="destructive" className="absolute top-2 right-2">
                      NSFW
                    </Badge>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold truncate">{design.title}</h3>
                    {product && (
                      <p className="text-sm text-muted-foreground">{product.name}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{design.id}</span>
                    <span>•</span>
                    <span>{format(new Date(design.createdAt), 'MMM d, yyyy')}</span>
                  </div>

                  {design.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {design.description}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setViewingDesign(design)}
                    >
                      <Eye size={16} className="mr-2" />
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={!!viewingDesign} onOpenChange={(open) => !open && setViewingDesign(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Design</DialogTitle>
            <DialogDescription>
              Approve or reject this design for public catalog
            </DialogDescription>
          </DialogHeader>

          {viewingDesign && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Design Title</Label>
                    <p className="font-semibold text-lg mt-1">{viewingDesign.title}</p>
                  </div>

                  {viewingDesign.description && (
                    <div>
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="mt-1">{viewingDesign.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Design ID</Label>
                      <p className="font-mono text-sm mt-1">{viewingDesign.id}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Created</Label>
                      <p className="text-sm mt-1">
                        {format(new Date(viewingDesign.createdAt), 'PPp')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Product</Label>
                    <p className="mt-1">{getProduct(viewingDesign.productId)?.name || 'Unknown'}</p>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Print Areas</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {viewingDesign.files.map((file) => (
                        <Badge key={file.id} variant="secondary">
                          {file.printAreaId}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label className="text-muted-foreground">Content Rating</Label>
                    <Button
                      size="sm"
                      variant={viewingDesign.isNSFW ? 'destructive' : 'outline'}
                      onClick={() => handleFlagNSFW(viewingDesign)}
                    >
                      <Warning size={16} className="mr-2" />
                      {viewingDesign.isNSFW ? 'NSFW' : 'Mark NSFW'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Design Preview{viewingDesign.files.length > 1 ? 's' : ''}</Label>
                  <div className="space-y-3">
                    {viewingDesign.files.map((file) => (
                      <Card key={file.id}>
                        <CardContent className="p-0">
                          <div className="aspect-square bg-muted relative">
                            <img
                              src={file.dataUrl}
                              alt={`Design for ${file.printAreaId}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="p-3">
                            <p className="text-sm font-medium">{file.printAreaId}</p>
                            <p className="text-xs text-muted-foreground">
                              {file.widthPx} × {file.heightPx}px @ {file.dpi} DPI
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label htmlFor="rejection-reason">Rejection Reason (Optional)</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Provide a reason if rejecting this design..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleReject(viewingDesign)}
                  disabled={actioning}
                >
                  <XCircle size={20} className="mr-2" />
                  Reject Design
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleApprove(viewingDesign)}
                  disabled={actioning}
                >
                  <CheckCircle size={20} className="mr-2" />
                  Approve & Publish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
