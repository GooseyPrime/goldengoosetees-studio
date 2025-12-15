import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Plus, 
  Pencil, 
  Trash,
  Check,
  X
} from '@phosphor-icons/react'
import { Product, PrintArea, ProductConstraints } from '@/lib/types'
import { toast } from 'sonner'

interface ProductManagerProps {
  products: Product[]
  onProductsChange: (updater: (prev: Product[]) => Product[]) => void
}

export function ProductManager({ products, onProductsChange }: ProductManagerProps) {
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleAddProduct = () => {
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: 'New Product',
      description: 'Product description',
      printfulSKU: '',
      basePrice: 0,
      imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
      category: 'T-Shirts',
      available: true,
      printAreas: []
    }
    setEditingProduct(newProduct)
    setIsDialogOpen(true)
  }

  const handleEditProduct = (product: Product) => {
    setEditingProduct({ ...product })
    setIsDialogOpen(true)
  }

  const handleSaveProduct = () => {
    if (!editingProduct) return

    onProductsChange((prev) => {
      const existing = prev.find(p => p.id === editingProduct.id)
      if (existing) {
        return prev.map(p => p.id === editingProduct.id ? editingProduct : p)
      } else {
        return [...prev, editingProduct]
      }
    })

    toast.success('Product saved successfully')
    setIsDialogOpen(false)
    setEditingProduct(null)
  }

  const handleDeleteProduct = (productId: string) => {
    onProductsChange((prev) => prev.filter(p => p.id !== productId))
    toast.success('Product deleted')
  }

  const handleToggleAvailability = (productId: string) => {
    onProductsChange((prev) =>
      prev.map(p => p.id === productId ? { ...p, available: !p.available } : p)
    )
  }

  const handleAddPrintArea = () => {
    if (!editingProduct) return

    const newArea: PrintArea = {
      id: `area-${Date.now()}`,
      name: 'New Print Area',
      position: 'front',
      widthInches: 12,
      heightInches: 16,
      constraints: {
        minDPI: 150,
        maxDPI: 300,
        formats: ['PNG', 'SVG'],
        maxFileSizeMB: 50,
        colorMode: 'RGB'
      }
    }

    setEditingProduct({
      ...editingProduct,
      printAreas: [...editingProduct.printAreas, newArea]
    })
  }

  const handleRemovePrintArea = (areaId: string) => {
    if (!editingProduct) return

    setEditingProduct({
      ...editingProduct,
      printAreas: editingProduct.printAreas.filter(a => a.id !== areaId)
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Management</h2>
          <p className="text-muted-foreground">Manage product catalog and print specifications</p>
        </div>
        <Button onClick={handleAddProduct}>
          <Plus size={20} className="mr-2" />
          Add Product
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Print Areas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img 
                        src={product.imageUrl} 
                        alt={product.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.category}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{product.printfulSKU}</TableCell>
                  <TableCell className="font-medium">${product.basePrice}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {product.printAreas.length} area{product.printAreas.length !== 1 ? 's' : ''}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.available}
                      onCheckedChange={() => handleToggleAvailability(product.id)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteProduct(product.id)}
                      >
                        <Trash size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct?.printfulSKU ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              Configure product details and print area specifications
            </DialogDescription>
          </DialogHeader>

          {editingProduct && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">Printful SKU</Label>
                  <Input
                    id="sku"
                    value={editingProduct.printfulSKU}
                    onChange={(e) => setEditingProduct({ ...editingProduct, printfulSKU: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Base Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={editingProduct.basePrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, basePrice: parseFloat(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={editingProduct.imageUrl}
                  onChange={(e) => setEditingProduct({ ...editingProduct, imageUrl: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Print Areas</Label>
                  <Button size="sm" variant="outline" onClick={handleAddPrintArea}>
                    <Plus size={16} className="mr-2" />
                    Add Print Area
                  </Button>
                </div>

                {editingProduct.printAreas.map((area, index) => (
                  <Card key={area.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{area.name}</CardTitle>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemovePrintArea(area.id)}
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Position</Label>
                          <select
                            className="w-full h-9 px-3 rounded-md border bg-background"
                            value={area.position}
                            onChange={(e) => {
                              const updatedAreas = [...editingProduct.printAreas]
                              updatedAreas[index] = { ...area, position: e.target.value as any }
                              setEditingProduct({ ...editingProduct, printAreas: updatedAreas })
                            }}
                          >
                            <option value="front">Front</option>
                            <option value="back">Back</option>
                            <option value="left_sleeve">Left Sleeve</option>
                            <option value="right_sleeve">Right Sleeve</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Width (inches)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={area.widthInches}
                            onChange={(e) => {
                              const updatedAreas = [...editingProduct.printAreas]
                              updatedAreas[index] = { ...area, widthInches: parseFloat(e.target.value) }
                              setEditingProduct({ ...editingProduct, printAreas: updatedAreas })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Height (inches)</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={area.heightInches}
                            onChange={(e) => {
                              const updatedAreas = [...editingProduct.printAreas]
                              updatedAreas[index] = { ...area, heightInches: parseFloat(e.target.value) }
                              setEditingProduct({ ...editingProduct, printAreas: updatedAreas })
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Min DPI</Label>
                          <Input
                            type="number"
                            value={area.constraints.minDPI}
                            onChange={(e) => {
                              const updatedAreas = [...editingProduct.printAreas]
                              updatedAreas[index] = {
                                ...area,
                                constraints: { ...area.constraints, minDPI: parseInt(e.target.value) }
                              }
                              setEditingProduct({ ...editingProduct, printAreas: updatedAreas })
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Max DPI</Label>
                          <Input
                            type="number"
                            value={area.constraints.maxDPI}
                            onChange={(e) => {
                              const updatedAreas = [...editingProduct.printAreas]
                              updatedAreas[index] = {
                                ...area,
                                constraints: { ...area.constraints, maxDPI: parseInt(e.target.value) }
                              }
                              setEditingProduct({ ...editingProduct, printAreas: updatedAreas })
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProduct}>
                  <Check size={20} className="mr-2" />
                  Save Product
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
