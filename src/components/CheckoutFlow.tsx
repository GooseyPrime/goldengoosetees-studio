import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Design, Product, User } from '@/lib/types'
import { api } from '@/lib/api'
import { stripeService } from '@/lib/stripe'
import {
  CreditCard,
  Package,
  CheckCircle,
  Warning,
  Truck,
  ArrowSquareOut
} from '@phosphor-icons/react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

// Environment variables
const STRIPE_TEST_MODE = import.meta.env.VITE_STRIPE_TEST_MODE === 'true'
const APP_URL = import.meta.env.VITE_APP_URL || window.location.origin

interface CheckoutFlowProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  design: Design
  product: Product
  user: User
  onComplete: (orderId: string) => void
}

type CheckoutStep = 'shipping' | 'payment' | 'processing' | 'complete'

export function CheckoutFlow({
  open,
  onOpenChange,
  design,
  product,
  user,
  onComplete
}: CheckoutFlowProps) {
  const [step, setStep] = useState<CheckoutStep>('shipping')
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderId, setOrderId] = useState<string>()
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>()
  const [isTestMode] = useState(STRIPE_TEST_MODE)
  const [useStripeCheckout, setUseStripeCheckout] = useState(true) // Default to Stripe Checkout

  const [shippingData, setShippingData] = useState({
    name: user.name,
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US'
  })

  const [cardData, setCardData] = useState({
    number: '',
    expiry: '',
    cvc: ''
  })

  const [cardErrors, setCardErrors] = useState({
    number: '',
    expiry: '',
    cvc: ''
  })

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const groups = cleaned.match(/.{1,4}/g) || []
    return groups.join(' ').substring(0, 19)
  }

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`
    }
    return cleaned
  }

  const validateCardNumber = (number: string): boolean => {
    const cleaned = number.replace(/\s/g, '')
    if (cleaned.length < 13 || cleaned.length > 19) {
      setCardErrors(prev => ({ ...prev, number: 'Invalid card number length' }))
      return false
    }
    setCardErrors(prev => ({ ...prev, number: '' }))
    return true
  }

  const validateExpiry = (expiry: string): boolean => {
    const [month, year] = expiry.split('/').map(s => s.trim())
    if (!month || !year) {
      setCardErrors(prev => ({ ...prev, expiry: 'Invalid expiry format' }))
      return false
    }
    const monthNum = parseInt(month)
    if (monthNum < 1 || monthNum > 12) {
      setCardErrors(prev => ({ ...prev, expiry: 'Invalid month' }))
      return false
    }
    const currentYear = new Date().getFullYear() % 100
    const currentMonth = new Date().getMonth() + 1
    const yearNum = parseInt(year)
    if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
      setCardErrors(prev => ({ ...prev, expiry: 'Card has expired' }))
      return false
    }
    setCardErrors(prev => ({ ...prev, expiry: '' }))
    return true
  }

  const validateCVC = (cvc: string): boolean => {
    if (cvc.length < 3 || cvc.length > 4) {
      setCardErrors(prev => ({ ...prev, cvc: 'Invalid CVC' }))
      return false
    }
    setCardErrors(prev => ({ ...prev, cvc: '' }))
    return true
  }

  const handleCardNumberChange = (value: string) => {
    const formatted = formatCardNumber(value)
    setCardData({ ...cardData, number: formatted })
  }

  const handleExpiryChange = (value: string) => {
    const formatted = formatExpiry(value)
    setCardData({ ...cardData, expiry: formatted })
  }

  const handleCVCChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').substring(0, 4)
    setCardData({ ...cardData, cvc: cleaned })
  }

  // Stripe Checkout redirect handler
  const handleStripeCheckout = async () => {
    setStep('processing')
    setIsProcessing(true)

    try {
      const totalWithShipping = product.basePrice + 5.99

      // Create order first
      const order = await api.orders.create({
        userId: user.id,
        designId: design.id,
        productId: product.id,
        size: design.size,
        color: design.color,
        totalAmount: totalWithShipping,
        shippingAddress: shippingData
      })

      // Create Stripe Checkout Session
      const session = await stripeService.createCheckoutSession({
        orderId: order.id,
        productName: `${product.name} - ${design.title}`,
        productDescription: `Size: ${design.size}, Color: ${design.color}`,
        productImage: product.imageUrl,
        amount: totalWithShipping,
        customerEmail: user.email,
        successUrl: `${APP_URL}?checkout=success&order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${APP_URL}?checkout=canceled&order_id=${order.id}`,
        metadata: {
          design_id: design.id,
          product_id: product.id,
          user_id: user.id
        }
      })

      // Redirect to Stripe Checkout
      stripeService.redirectToCheckout(session.url)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create checkout session.'
      toast.error(errorMessage)
      setStep('shipping')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (useStripeCheckout) {
      // Go directly to Stripe Checkout
      handleStripeCheckout()
    } else {
      // Continue to inline card payment
      setStep('payment')
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateCardNumber(cardData.number)) return
    if (!validateExpiry(cardData.expiry)) return
    if (!validateCVC(cardData.cvc)) return

    setStep('processing')
    setIsProcessing(true)

    try {
      const totalWithShipping = product.basePrice + 5.99

      const order = await api.orders.create({
        userId: user.id,
        designId: design.id,
        productId: product.id,
        size: design.size,
        color: design.color,
        totalAmount: totalWithShipping,
        shippingAddress: shippingData
      })

      const [expMonth, expYear] = cardData.expiry.split('/').map(s => s.trim())
      const fullYear = expYear.length === 2 ? `20${expYear}` : expYear

      const paymentId = await api.orders.processPayment(
        order.id,
        {
          number: cardData.number,
          exp_month: parseInt(expMonth),
          exp_year: parseInt(fullYear),
          cvc: cardData.cvc
        },
        {
          name: shippingData.name,
          email: user.email,
          address: {
            line1: shippingData.line1,
            line2: shippingData.line2,
            city: shippingData.city,
            state: shippingData.state,
            postal_code: shippingData.postal_code,
            country: shippingData.country
          }
        }
      )
      
      const { printfulOrderId, estimatedDelivery, trackingUrl } = await api.orders.submitToPrintful(
        order.id,
        design,
        product
      )
      
      setOrderId(order.id)
      setEstimatedDelivery(estimatedDelivery)
      setStep('complete')
      
      toast.success('Order placed successfully!')
      
      setTimeout(() => {
        onComplete(order.id)
        onOpenChange(false)
      }, 5000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment failed. Please try again.'
      toast.error(errorMessage)
      setStep('payment')
    } finally {
      setIsProcessing(false)
    }
  }

  const getStepProgress = () => {
    switch (step) {
      case 'shipping': return 25
      case 'payment': return 50
      case 'processing': return 75
      case 'complete': return 100
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Complete Your Order</DialogTitle>
          <DialogDescription>
            Review your design and complete payment
          </DialogDescription>
        </DialogHeader>

        <Progress value={getStepProgress()} className="my-4" />

        <AnimatePresence mode="wait">
          {step === 'shipping' && (
            <motion.div
              key="shipping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Alert className="mb-4 border-accent bg-accent/10">
                <Warning size={20} className="text-accent" />
                <AlertDescription>
                  <strong>No refunds or cancellations</strong> after order completion. Please review carefully.
                </AlertDescription>
              </Alert>

              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-semibold">{product.name}</h4>
                    <p className="text-sm text-muted-foreground">{design.title}</p>
                    {design.size && design.color && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Size: <span className="font-medium">{design.size}</span> • Color: <span className="font-medium">{design.color}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xl font-semibold">${product.basePrice}</p>
                    <p className="text-xs text-muted-foreground">+ shipping</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleShippingSubmit} className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Package size={20} />
                  Shipping Address
                </h3>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={shippingData.name}
                      onChange={(e) => setShippingData({ ...shippingData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="line1">Address Line 1</Label>
                    <Input
                      id="line1"
                      value={shippingData.line1}
                      onChange={(e) => setShippingData({ ...shippingData, line1: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="line2">Address Line 2 (Optional)</Label>
                    <Input
                      id="line2"
                      value={shippingData.line2}
                      onChange={(e) => setShippingData({ ...shippingData, line2: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={shippingData.city}
                        onChange={(e) => setShippingData({ ...shippingData, city: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={shippingData.state}
                        onChange={(e) => setShippingData({ ...shippingData, state: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="postal_code">ZIP Code</Label>
                    <Input
                      id="postal_code"
                      value={shippingData.postal_code}
                      onChange={(e) => setShippingData({ ...shippingData, postal_code: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Payment Method Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Payment Method</Label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() => setUseStripeCheckout(true)}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                        useStripeCheckout
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <ArrowSquareOut size={24} className="text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">Stripe Checkout</p>
                        <p className="text-xs text-muted-foreground">Secure payment page with multiple options</p>
                      </div>
                      {useStripeCheckout && <CheckCircle size={20} className="text-primary" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseStripeCheckout(false)}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                        !useStripeCheckout
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <CreditCard size={24} className="text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">Pay with Card</p>
                        <p className="text-xs text-muted-foreground">Enter card details directly</p>
                      </div>
                      {!useStripeCheckout && <CheckCircle size={20} className="text-primary" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg">
                  {useStripeCheckout ? (
                    <>
                      <ArrowSquareOut size={20} className="mr-2" />
                      Continue to Stripe Checkout
                    </>
                  ) : (
                    'Continue to Payment'
                  )}
                </Button>
              </form>
            </motion.div>
          )}

          {step === 'payment' && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CreditCard size={20} />
                  Payment Information
                </h3>

                {isTestMode && (
                  <Alert className="border-accent bg-accent/10">
                    <Warning size={20} className="text-accent" />
                    <AlertDescription>
                      <strong>Test Mode:</strong> Use card 4242 4242 4242 4242 with any future date and CVC.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input
                      id="card-number"
                      placeholder="1234 5678 9012 3456"
                      value={cardData.number}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      className={cardErrors.number ? 'border-destructive' : ''}
                      required
                    />
                    {cardErrors.number && (
                      <p className="text-xs text-destructive mt-1">{cardErrors.number}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={cardData.expiry}
                        onChange={(e) => handleExpiryChange(e.target.value)}
                        className={cardErrors.expiry ? 'border-destructive' : ''}
                        maxLength={5}
                        required
                      />
                      {cardErrors.expiry && (
                        <p className="text-xs text-destructive mt-1">{cardErrors.expiry}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="cvc">CVC</Label>
                      <Input
                        id="cvc"
                        placeholder="123"
                        value={cardData.cvc}
                        onChange={(e) => handleCVCChange(e.target.value)}
                        className={cardErrors.cvc ? 'border-destructive' : ''}
                        maxLength={4}
                        required
                      />
                      {cardErrors.cvc && (
                        <p className="text-xs text-destructive mt-1">{cardErrors.cvc}</p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-mono">${product.basePrice}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span className="font-mono">$5.99</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="font-mono">${(product.basePrice + 5.99).toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('shipping')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" size="lg">
                    Place Order
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center space-y-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto"
              >
                <Package size={64} weight="duotone" className="text-primary" />
              </motion.div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Processing Your Order</h3>
                <p className="text-muted-foreground">
                  Please wait while we process your payment and submit your order to Printful...
                </p>
              </div>
            </motion.div>
          )}

          {step === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <CheckCircle size={80} weight="duotone" className="text-green-500 mx-auto" />
              </motion.div>
              
              <div>
                <h3 className="text-2xl font-bold mb-2">Order Confirmed!</h3>
                <p className="text-muted-foreground">
                  Your custom T-shirt is being prepared for production
                </p>
              </div>

              <div className="p-6 bg-muted/50 rounded-lg space-y-3 text-left">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Order Number</span>
                  <span className="font-mono font-semibold">{orderId?.slice(-8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Estimated Delivery</span>
                  <span className="flex items-center gap-1 font-semibold">
                    <Truck size={16} />
                    {estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString() : '7-10 days'}
                  </span>
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  A confirmation email has been sent to <strong>{user.email}</strong> with tracking information.
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
