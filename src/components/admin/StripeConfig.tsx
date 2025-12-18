import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { stripeService } from '@/lib/stripe'
import { CreditCard, CheckCircle, Warning, Info, XCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'

// Environment check
const STRIPE_CONFIGURED = !!(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
const IS_TEST_MODE = import.meta.env.VITE_STRIPE_TEST_MODE === 'true'

export function StripeConfig() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setConnectionStatus('checking')
    try {
      stripeService.initialize()
      if (stripeService.isConfigured()) {
        setConnectionStatus('connected')
      } else {
        setConnectionStatus('error')
      }
    } catch (error) {
      setConnectionStatus('error')
    }
  }

  const handleTestConnection = async () => {
    toast.info('Testing Stripe connection...')
    try {
      stripeService.initialize()
      if (stripeService.isConfigured()) {
        toast.success('Stripe connection successful!')
        setConnectionStatus('connected')
      } else {
        toast.error('Stripe not properly configured. Check environment variables.')
        setConnectionStatus('error')
      }
    } catch (error) {
      toast.error('Failed to connect to Stripe.')
      setConnectionStatus('error')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard size={24} className="text-primary" />
            </div>
            <div>
              <CardTitle>Stripe Configuration</CardTitle>
              <CardDescription>Payment processing via environment variables</CardDescription>
            </div>
          </div>
          {connectionStatus === 'connected' ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle size={16} weight="fill" />
              Connected
            </Badge>
          ) : connectionStatus === 'error' ? (
            <Badge variant="destructive" className="gap-1">
              <XCircle size={16} weight="fill" />
              Not Configured
            </Badge>
          ) : (
            <Badge variant="secondary">Checking...</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <Info size={20} />
          <AlertDescription>
            Stripe is now configured via environment variables in Vercel. Set{' '}
            <code className="px-1 bg-muted rounded">VITE_STRIPE_PUBLISHABLE_KEY</code> and{' '}
            <code className="px-1 bg-muted rounded">STRIPE_SECRET_KEY</code> in your Vercel project settings.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <span className="font-medium">Test Mode</span>
              <p className="text-sm text-muted-foreground">
                {IS_TEST_MODE ? 'Enabled - No real charges' : 'Disabled - Live payments'}
              </p>
            </div>
            <Badge variant={IS_TEST_MODE ? 'secondary' : 'destructive'}>
              {IS_TEST_MODE ? 'Test' : 'Live'}
            </Badge>
          </div>

          {IS_TEST_MODE && (
            <Alert className="border-accent bg-accent/10">
              <Warning size={20} className="text-accent" />
              <AlertDescription>
                <strong>Test Mode Active:</strong> Use test cards like 4242 4242 4242 4242. No real
                payments will be processed.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-3">
            <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">VITE_STRIPE_PUBLISHABLE_KEY</span>
              <Badge variant={STRIPE_CONFIGURED ? 'outline' : 'destructive'}>
                {STRIPE_CONFIGURED ? 'Set' : 'Missing'}
              </Badge>
            </div>
            <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">STRIPE_SECRET_KEY</span>
              <Badge variant="outline">Server-side only</Badge>
            </div>
            <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">STRIPE_WEBHOOK_SECRET</span>
              <Badge variant="outline">Server-side only</Badge>
            </div>
          </div>

          <Button onClick={handleTestConnection} className="w-full">
            Test Connection
          </Button>
        </div>

        <div className="pt-4 border-t space-y-3">
          <h4 className="font-semibold text-sm">Test Card Numbers</h4>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Success</span>
              <code className="font-mono">4242 4242 4242 4242</code>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Declined</span>
              <code className="font-mono">4000 0000 0000 0002</code>
            </div>
            <div className="flex justify-between p-2 bg-muted/50 rounded">
              <span className="text-muted-foreground">Insufficient Funds</span>
              <code className="font-mono">4000 0000 0000 9995</code>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Use any future expiry date and any 3-digit CVC for test cards.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
