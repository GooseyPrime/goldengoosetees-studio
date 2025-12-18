import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Database, CheckCircle, Warning, XCircle, Link as LinkIcon, Info } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { supabaseService } from '@/lib/supabase'

// Environment check
const SUPABASE_URL_SET = !!(import.meta.env.VITE_SUPABASE_URL)
const SUPABASE_KEY_SET = !!(import.meta.env.VITE_SUPABASE_ANON_KEY)
const SUPABASE_CONFIGURED = SUPABASE_URL_SET && SUPABASE_KEY_SET

export function SupabaseConfig() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'needs_setup' | 'error'>('checking')
  const [isTesting, setIsTesting] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setConnectionStatus('checking')
    try {
      supabaseService.initialize()
      if (supabaseService.isConfigured()) {
        const result = await supabaseService.testConnection()
        if (result.success) {
          setConnectionStatus(result.needsSetup ? 'needs_setup' : 'connected')
        } else {
          setConnectionStatus('error')
        }
      } else {
        setConnectionStatus('error')
      }
    } catch (error) {
      setConnectionStatus('error')
    }
  }

  const handleTestConnection = async () => {
    setIsTesting(true)
    toast.info('Testing Supabase connection...')

    try {
      supabaseService.initialize()

      if (!supabaseService.isConfigured()) {
        toast.error('Supabase not configured. Check environment variables.')
        setConnectionStatus('error')
        return
      }

      const result = await supabaseService.testConnection()
      if (result.success) {
        if (result.needsSetup) {
          toast.warning('Connection successful, but database tables need to be set up')
          setConnectionStatus('needs_setup')
        } else {
          toast.success('Connection successful!')
          setConnectionStatus('connected')
        }
      } else {
        toast.error('Connection failed')
        setConnectionStatus('error')
      }
    } catch (error: any) {
      toast.error('Connection failed: ' + error.message)
      setConnectionStatus('error')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Database size={24} className="text-primary" weight="duotone" />
            </div>
            <div>
              <CardTitle>Supabase Configuration</CardTitle>
              <CardDescription>Database and authentication via environment variables</CardDescription>
            </div>
          </div>
          {connectionStatus === 'connected' ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle size={16} weight="fill" />
              Connected
            </Badge>
          ) : connectionStatus === 'needs_setup' ? (
            <Badge variant="secondary" className="gap-1">
              <Warning size={16} weight="fill" />
              Needs Setup
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
            Supabase is now configured via environment variables in Vercel. Set{' '}
            <code className="px-1 bg-muted rounded">VITE_SUPABASE_URL</code> and{' '}
            <code className="px-1 bg-muted rounded">VITE_SUPABASE_ANON_KEY</code> in your Vercel project settings.
          </AlertDescription>
        </Alert>

        {connectionStatus === 'needs_setup' && (
          <Alert className="border-accent bg-accent/10">
            <Warning size={20} className="text-accent" />
            <AlertDescription>
              <strong>Database Setup Required:</strong> Run the SQL schema setup from SUPABASE_SETUP.md to create the required tables.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="grid gap-3">
            <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">VITE_SUPABASE_URL</span>
              <Badge variant={SUPABASE_URL_SET ? 'outline' : 'destructive'}>
                {SUPABASE_URL_SET ? 'Set' : 'Missing'}
              </Badge>
            </div>
            <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">VITE_SUPABASE_ANON_KEY</span>
              <Badge variant={SUPABASE_KEY_SET ? 'outline' : 'destructive'}>
                {SUPABASE_KEY_SET ? 'Set' : 'Missing'}
              </Badge>
            </div>
            <div className="flex justify-between p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">SUPABASE_SERVICE_ROLE_KEY</span>
              <Badge variant="outline">Server-side only</Badge>
            </div>
          </div>

          <Button onClick={handleTestConnection} disabled={isTesting} className="w-full">
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>

        <div className="pt-4 border-t space-y-3">
          <h4 className="font-semibold text-sm">Quick Links</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
              className="gap-2"
            >
              <LinkIcon size={16} />
              Supabase Dashboard
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://console.cloud.google.com', '_blank')}
              className="gap-2"
            >
              <LinkIcon size={16} />
              Google Cloud Console
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-semibold text-sm mb-2">Setup Checklist</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              {SUPABASE_CONFIGURED ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
              Set environment variables in Vercel
            </li>
            <li className="flex items-center gap-2">
              {connectionStatus === 'connected' ? <CheckCircle size={16} className="text-green-500" /> : <XCircle size={16} className="text-muted-foreground" />}
              Run SQL schema setup for database tables
            </li>
            <li>• Configure Google OAuth in Google Cloud Console</li>
            <li>• Enable Google provider in Supabase Authentication</li>
            <li>• Create Storage bucket for design files</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            See <strong>SUPABASE_SETUP.md</strong> for detailed instructions on each step.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
