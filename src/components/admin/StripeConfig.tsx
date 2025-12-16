import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { stripeService } from '@/lib/stripe'
import { CreditCard, CheckCircle, Warning, Info } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function StripeConfig() {
  const [publishableKey, setPublishableKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [isTestMode, setIsTestMode] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    const config = await window.spark.kv.get<{
      publishableKey: string
      secretKey: string
      isTestMode: boolean
    }>('stripe-config')

    if (config) {
      setPublishableKey(config.publishableKey)
      setSecretKey('sk_' + '*'.repeat(20))
      setIsTestMode(config.isTestMode)
      setIsConfigured(true)
    }
  }

  const handleSave = async () => {
    if (!publishableKey || !secretKey) {
      toast.error('Please fill in all fields')
      return
    }

    if (!publishableKey.startsWith('pk_')) {
      toast.error('Invalid publishable key format')
      return
    }

    if (!secretKey.startsWith('sk_')) {
      toast.error('Invalid secret key format')
      return
    }

    const testModeMatch = publishableKey.includes('_test_') && secretKey.includes('_test_')
    const liveModeMatch = publishableKey.includes('_live_') && secretKey.includes('_live_')

    if (isTestMode && !testModeMatch) {
      toast.error('Test mode is enabled but keys appear to be live keys')
      return
    }

    if (!isTestMode && !liveModeMatch) {
      toast.error('Test mode is disabled but keys appear to be test keys')
      return
    }

    setIsSaving(true)

    try {
      await stripeService.saveConfig(publishableKey, secretKey, isTestMode)
      setIsConfigured(true)
      toast.success('Stripe configuration saved successfully!')
    } catch (error) {
      toast.error('Failed to save Stripe configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!isConfigured) {
      toast.error('Please save configuration first')
      return
    }

    try {
      await stripeService.initialize()
      toast.success('Stripe connection successful!')
    } catch (error) {
      toast.error('Failed to connect to Stripe. Please check your keys.')
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
              <CardDescription>Configure Stripe for payment processing</CardDescription>
            </div>
          </div>
          {isConfigured && (
            <Badge variant="default" className="gap-1">
              <CheckCircle size={16} weight="fill" />
              Configured
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Alert>
          <Info size={20} />
          <AlertDescription>
            Get your Stripe API keys from the{' '}
            <a
              href="https://dashboard.stripe.com/apikeys"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              Stripe Dashboard
            </a>
            . Use test keys for development and live keys for production.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <Label className="text-base">Test Mode</Label>
              <p className="text-sm text-muted-foreground">
                Use test keys (no real charges will be made)
              </p>
            </div>
            <Switch checked={isTestMode} onCheckedChange={setIsTestMode} />
          </div>

          {isTestMode && (
            <Alert className="border-accent bg-accent/10">
              <Warning size={20} className="text-accent" />
              <AlertDescription>
                <strong>Test Mode Active:</strong> Use test cards like 4242 4242 4242 4242. No real
                payments will be processed.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="publishable-key">Publishable Key</Label>
            <Input
              id="publishable-key"
              type="text"
              placeholder={isTestMode ? 'pk_test_...' : 'pk_live_...'}
              value={publishableKey}
              onChange={(e) => setPublishableKey(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Starts with pk_{isTestMode ? 'test' : 'live'}_
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secret-key">Secret Key</Label>
            <Input
              id="secret-key"
              type="password"
              placeholder={isTestMode ? 'sk_test_...' : 'sk_live_...'}
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Starts with sk_{isTestMode ? 'test' : 'live'}_
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={!isConfigured}
            >
              Test Connection
            </Button>
          </div>
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

        <Alert>
          <Info size={20} />
          <AlertDescription className="text-xs">
            <strong>Security Note:</strong> Secret keys are stored securely in the Spark KV store.
            Never share your secret keys publicly or commit them to version control.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}
