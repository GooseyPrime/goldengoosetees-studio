import { useState, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { printfulService } from '@/lib/printful'
import { Key, CheckCircle, XCircle, Spinner, Link as LinkIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function PrintfulConfig() {
  const [apiKey, setApiKey] = useKV<string>('printful-api-key', '')
  const [storeId, setStoreId] = useKV<string>('printful-store-id', '')
  const [localApiKey, setLocalApiKey] = useState('')
  const [localStoreId, setLocalStoreId] = useState('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLocalApiKey(apiKey || '')
    setLocalStoreId(storeId || '')
    if (apiKey) {
      setConnectionStatus('success')
    }
  }, [apiKey, storeId])

  const testConnection = async () => {
    if (!localApiKey) {
      toast.error('Please enter an API key')
      return
    }

    setIsTestingConnection(true)
    setConnectionStatus('idle')

    try {
      await window.spark.kv.set('printful-api-key', localApiKey)
      if (localStoreId) {
        await window.spark.kv.set('printful-store-id', localStoreId)
      }

      await printfulService.getProducts()
      
      setConnectionStatus('success')
      toast.success('Successfully connected to Printful!')
    } catch (error) {
      setConnectionStatus('error')
      toast.error('Failed to connect to Printful. Please check your API key.')
      console.error('Printful connection error:', error)
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleSave = async () => {
    if (!localApiKey) {
      toast.error('API key is required')
      return
    }

    setIsSaving(true)
    try {
      setApiKey(localApiKey)
      if (localStoreId) {
        setStoreId(localStoreId)
      }
      toast.success('Printful configuration saved!')
    } catch (error) {
      toast.error('Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const clearConfiguration = async () => {
    setApiKey('')
    setStoreId('')
    setLocalApiKey('')
    setLocalStoreId('')
    setConnectionStatus('idle')
    toast.success('Configuration cleared')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key size={24} weight="duotone" />
          Printful API Configuration
        </CardTitle>
        <CardDescription>
          Connect your Printful account to enable automated order fulfillment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertDescription className="text-sm">
            <div className="space-y-2">
              <p className="font-semibold">How to get your Printful API key:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Log in to your Printful account</li>
                <li>Go to Settings → Stores</li>
                <li>Select your store or create a new one</li>
                <li>Click "Add API Access" in the API section</li>
                <li>Copy the generated API key and paste it below</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key *</Label>
            <Input
              id="api-key"
              type="password"
              placeholder="sk_live_..."
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="store-id">Store ID (Optional)</Label>
            <Input
              id="store-id"
              type="text"
              placeholder="Enter your Printful Store ID"
              value={localStoreId}
              onChange={(e) => setLocalStoreId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Only needed if you have multiple stores
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Connection Status:</span>
            {connectionStatus === 'idle' && (
              <Badge variant="secondary">Not Tested</Badge>
            )}
            {connectionStatus === 'success' && (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle size={14} className="mr-1" />
                Connected
              </Badge>
            )}
            {connectionStatus === 'error' && (
              <Badge variant="destructive">
                <XCircle size={14} className="mr-1" />
                Failed
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={testConnection}
              disabled={!localApiKey || isTestingConnection}
              variant="outline"
              className="flex-1"
            >
              {isTestingConnection ? (
                <>
                  <Spinner size={16} className="mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <LinkIcon size={16} className="mr-2" />
                  Test Connection
                </>
              )}
            </Button>

            <Button
              onClick={handleSave}
              disabled={!localApiKey || isSaving || connectionStatus === 'error'}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Spinner size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>

          {apiKey && (
            <Button
              onClick={clearConfiguration}
              variant="outline"
              className="w-full"
            >
              Clear Configuration
            </Button>
          )}
        </div>

        {connectionStatus === 'success' && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle size={20} className="text-green-600" />
            <AlertDescription className="text-green-800">
              Your Printful API is configured and ready to process orders. Orders will be
              automatically submitted to Printful after successful payment.
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Quick Links</h4>
          <div className="space-y-1">
            <a
              href="https://www.printful.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <LinkIcon size={14} />
              Printful Dashboard
            </a>
            <a
              href="https://developers.printful.com/docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <LinkIcon size={14} />
              API Documentation
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
