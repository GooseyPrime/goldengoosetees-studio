import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { supabaseService } from '@/lib/supabase'
import { Key, CheckCircle, XCircle, Spinner, Link as LinkIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'

export function PrintfulConfig() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null)
  const [storeId, setStoreId] = useState<string | undefined>(undefined)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    setIsLoading(true)
    try {
      const session = await supabaseService.getSession()
      if (!session?.access_token) {
        setIsConfigured(false)
        return
      }

      const response = await fetch('/api/printful/status', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setIsConfigured(data.configured === true)
        setStoreId(data.storeId)
      } else {
        setIsConfigured(false)
      }
    } catch (error) {
      console.error('Failed to check Printful status:', error)
      setIsConfigured(false)
    } finally {
      setIsLoading(false)
    }
  }

  const testConnection = async () => {
    setIsTestingConnection(true)
    try {
      const session = await supabaseService.getSession()
      if (!session?.access_token) {
        toast.error('Please sign in to test connection')
        return
      }

      const response = await fetch('/api/printful/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      const data = await response.json()

      if (data.ok) {
        toast.success('Successfully connected to Printful!')
        await checkStatus() // Refresh status
      } else {
        toast.error(data.error || 'Failed to connect to Printful')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to test connection')
      console.error('Printful connection test error:', error)
    } finally {
      setIsTestingConnection(false)
    }
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
              <p className="font-semibold">Server-Side Configuration Required</p>
              <p className="text-muted-foreground">
                Printful API keys are now configured server-side for security. To configure Printful:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground mt-2">
                <li>Go to your Vercel project dashboard</li>
                <li>Navigate to Settings → Environment Variables</li>
                <li>Add <code className="bg-muted px-1 rounded">PRINTFUL_API_KEY</code> with your Printful API key</li>
                <li>Optionally add <code className="bg-muted px-1 rounded">PRINTFUL_STORE_ID</code> if you have multiple stores</li>
                <li>Redeploy your application</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Configured on Server</p>
              <p className="text-sm text-muted-foreground">
                {isLoading ? 'Checking...' : isConfigured ? 'Yes' : 'No'}
                {storeId && ` • Store ID: ${storeId}`}
              </p>
            </div>
            {isLoading ? (
              <Spinner size={20} className="animate-spin" />
            ) : isConfigured ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle size={14} className="mr-1" />
                Configured
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle size={14} className="mr-1" />
                Not Configured
              </Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={checkStatus}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner size={16} className="mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Refresh Status'
              )}
            </Button>

            <Button
              onClick={testConnection}
              disabled={!isConfigured || isTestingConnection}
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
          </div>
        </div>

        {isConfigured && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle size={20} className="text-green-600" />
            <AlertDescription className="text-green-800">
              Printful is configured on the server and ready to process orders. Orders will be
              automatically submitted to Printful after successful payment.
            </AlertDescription>
          </Alert>
        )}

        {!isConfigured && !isLoading && (
          <Alert variant="destructive">
            <XCircle size={20} />
            <AlertDescription>
              Printful is not configured. Please set the PRINTFUL_API_KEY environment variable in Vercel
              and redeploy your application.
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
