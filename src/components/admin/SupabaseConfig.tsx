import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, CheckCircle, Warning, Link as LinkIcon } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { supabaseService, type SupabaseConfig as SupabaseConfigType } from '@/lib/supabase'

export function SupabaseConfig() {
  const [config, setConfig] = useState<SupabaseConfigType>({ url: '', anonKey: '' })
  const [isConfigured, setIsConfigured] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; needsSetup?: boolean; error?: string } | null>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    const saved = await window.spark.kv.get<SupabaseConfigType>('supabase-config')
    if (saved) {
      setConfig(saved)
      setIsConfigured(!!saved.url && !!saved.anonKey)
    }
  }

  const handleSave = async () => {
    if (!config.url || !config.anonKey) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      await window.spark.kv.set('supabase-config', config)
      setIsConfigured(true)
      toast.success('Supabase configuration saved! Refresh the page to apply changes.')
    } catch (error) {
      toast.error('Failed to save configuration')
    }
  }

  const handleTest = async () => {
    if (!config.url || !config.anonKey) {
      toast.error('Please save configuration first')
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      await window.spark.kv.set('supabase-config', config)
      await supabaseService.initialize()
      
      const result = await supabaseService.testConnection()
      setTestResult(result)
      
      if (result.success) {
        if (result.needsSetup) {
          toast.warning('Connection successful, but database tables need to be set up')
        } else {
          toast.success('Connection successful!')
        }
      }
    } catch (error: any) {
      setTestResult({ success: false, error: error.message })
      toast.error('Connection failed: ' + error.message)
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
              <CardDescription>Configure database storage and Google OAuth</CardDescription>
            </div>
          </div>
          {isConfigured && (
            <Badge variant="outline" className="gap-2">
              <CheckCircle size={16} weight="fill" className="text-green-500" />
              Configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Warning size={20} weight="duotone" />
          <AlertDescription>
            Supabase is required for user authentication, design storage, and order management. 
            See <strong>SUPABASE_SETUP.md</strong> for detailed setup instructions.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supabase-url">Supabase Project URL</Label>
            <Input
              id="supabase-url"
              placeholder="https://xxxxx.supabase.co"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Found in Settings → API in your Supabase dashboard
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supabase-key">Supabase Anon/Public Key</Label>
            <Input
              id="supabase-key"
              type="password"
              placeholder="eyJ..."
              value={config.anonKey}
              onChange={(e) => setConfig({ ...config, anonKey: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Found in Settings → API in your Supabase dashboard
            </p>
          </div>
        </div>

        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            {testResult.success ? (
              <>
                <CheckCircle size={20} weight="fill" />
                <AlertDescription>
                  {testResult.needsSetup 
                    ? 'Connection successful! Please run the SQL schema setup from SUPABASE_SETUP.md'
                    : 'Connection successful and database is ready!'}
                </AlertDescription>
              </>
            ) : (
              <>
                <Warning size={20} weight="fill" />
                <AlertDescription>
                  Connection failed: {testResult.error}
                </AlertDescription>
              </>
            )}
          </Alert>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSave} className="flex-1">
            Save Configuration
          </Button>
          <Button onClick={handleTest} variant="outline" disabled={isTesting}>
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
            <li>• Create Supabase project and get credentials</li>
            <li>• Run SQL schema setup for database tables</li>
            <li>• Configure Google OAuth in Google Cloud Console</li>
            <li>• Enable Google provider in Supabase Authentication</li>
            <li>• Test connection to verify everything works</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            See <strong>SUPABASE_SETUP.md</strong> for detailed instructions on each step.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
